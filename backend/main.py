"""Lambda-native backend entrypoint (no FastAPI)."""

from __future__ import annotations

import asyncio
import base64
import json
import re
import uuid
from typing import Any, Dict, Optional, Tuple

import jwt

from . import storage
from .config import (
    CHAIRMAN_MODEL,
    COUNCIL_MODELS,
    EXCLUDED_MODEL_FAMILIES,
    EXCLUDED_MODEL_PATTERNS,
    EXCLUDED_MODELS,
    OPENROUTER_API_KEY,
)
# Force redeploy for dependency fix
from .council import (
    calculate_aggregate_rankings,
    generate_conversation_title,
    run_debate_sequence,
    run_full_council,
    stage1_collect_responses,
    stage2_collect_rankings,
    stage3_synthesize_final,
    run_single_debate_turn,
)
from .openrouter import list_models as list_openrouter_models


# Note: CORS is handled by Lambda Function URL and API Gateway cors_preflight
# Do NOT add CORS headers here - it causes conflicts with infrastructure-level CORS
DEFAULT_HEADERS = {
    "Content-Type": "application/json",
}


def _response(status_code: int, body: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Build an API Gateway compatible response."""
    response = {
        "statusCode": status_code,
        "headers": DEFAULT_HEADERS,
    }
    # HTTP 204 No Content must not include a body
    if status_code != 204 and body is not None:
        response["body"] = json.dumps(body)
    return response


def _parse_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse JSON request body, handling optional base64 encoding."""
    raw = event.get("body")
    if raw is None:
        return {}
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode()
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        return {}


import os
import httpx
from jwt.algorithms import RSAAlgorithm

# Global cache for JWKS (persists across Lambda invocations in warm containers)
_JWKS_CACHE: Dict[str, Any] | None = None


def _get_cognito_jwks(user_pool_id: str, region: str) -> Dict[str, Any]:
    """Fetch and cache Cognito JWKS (JSON Web Key Set)."""
    global _JWKS_CACHE
    if _JWKS_CACHE is not None:
        return _JWKS_CACHE

    url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    try:
        resp = httpx.get(url, timeout=5.0)
        resp.raise_for_status()
        _JWKS_CACHE = resp.json()
        return _JWKS_CACHE
    except Exception as e:
        print(f"Failed to fetch JWKS from {url}: {e}")
        return {"keys": []}


def _extract_user_id(event: Dict[str, Any]) -> Optional[str]:
    """
    Extract user ID from JWT token in Authorization header.
    
    If COGNITO_USER_POOL_ID is set, performs full signature verification.
    Otherwise, trusts API Gateway's prior verification (unverified decode).
    """
    headers = event.get("headers", {})
    auth_header = headers.get("Authorization") or headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]  # Remove "Bearer " prefix

    # Check if we should verify signatures (Function URL mode)
    user_pool_id = os.environ.get("COGNITO_USER_POOL_ID")
    aws_region = os.environ.get("AWS_REGION", "us-west-2")

    if user_pool_id:
        # Full verification mode (for Function URL access)
        try:
            # Get key ID from token header
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")

            # Fetch JWKS and find matching key
            jwks = _get_cognito_jwks(user_pool_id, aws_region)
            public_key = None
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    public_key = RSAAlgorithm.from_jwk(json.dumps(key))
                    break

            if not public_key:
                print(f"No matching key found for kid: {kid}")
                return None

            # Verify signature and decode
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                options={"verify_aud": False}  # Cognito uses client_id claim, not aud
            )
            return payload.get("sub")

        except jwt.ExpiredSignatureError:
            print("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            print(f"Invalid token: {e}")
            return None
        except Exception as e:
            print(f"Token verification error: {e}")
            return None
    else:
        # Trust API Gateway's verification (unverified decode)
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload.get("sub")
        except jwt.InvalidTokenError:
            return None


async def _list_models() -> Dict[str, Any]:
    """List available council models and defaults, honoring exclusions."""
    print(f"OpenRouter key present: {bool(OPENROUTER_API_KEY)}")
    available = await list_openrouter_models()
    source = "openrouter" if available else "config"
    if not available:
        available = COUNCIL_MODELS

    def matches_pattern(model: str) -> bool:
        for pattern in EXCLUDED_MODEL_PATTERNS:
            try:
                if re.fullmatch(pattern, model):
                    return True
            except re.error:
                continue
        return False

    def is_allowed(model: str) -> bool:
        provider = model.split("/")[0] if "/" in model else model
        if provider in EXCLUDED_MODEL_FAMILIES:
            return False
        if model in EXCLUDED_MODELS:
            return False
        if matches_pattern(model):
            return False
        return True

    filtered_available = sorted([m for m in available if is_allowed(m)])
    filtered_defaults = sorted([m for m in COUNCIL_MODELS if is_allowed(m)])
    default_chair = (
        CHAIRMAN_MODEL
        if is_allowed(CHAIRMAN_MODEL)
        else (filtered_available[0] if filtered_available else "")
    )

    return {
        "available_models": filtered_available,
        "default_council_models": filtered_defaults,
        "default_chairman_model": default_chair,
        "source": source,
    }


async def _send_message(conversation_id: str, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Handle message send flow and return council results."""
    conversation = storage.get_conversation_for_user(conversation_id, user_id)
    if conversation is None:
        return _response(404, {"error": "Conversation not found"})

    is_first_message = len(conversation.get("messages", [])) == 0
    content = payload.get("content", "")
    models = payload.get("models")
    chairman_model = payload.get("chairman_model") or payload.get("chairmanModel")

    if not content:
        return _response(400, {"error": "Message content is required"})

    storage.add_user_message(conversation_id, content)

    if is_first_message:
        title = await generate_conversation_title(content)
        storage.update_conversation_title(conversation_id, title)

    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        content,
        council_models=models,
        chairman_model=chairman_model,
    )

    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result,
    )

    return _response(
        200,
        {
            "stage1": stage1_results,
            "stage2": stage2_results,
            "stage3": stage3_result,
            "metadata": metadata,
        },
    )


async def _send_message_stream(conversation_id: str, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Placeholder for streaming; returns staged responses sequentially.
    This keeps the contract but does not use SSE so it fits HTTP APIs.
    """
    conversation = storage.get_conversation_for_user(conversation_id, user_id)
    if conversation is None:
        return _response(404, {"error": "Conversation not found"})

    is_first_message = len(conversation.get("messages", [])) == 0
    content = payload.get("content", "")
    models = payload.get("models")
    chairman_model = payload.get("chairman_model") or payload.get("chairmanModel")

    if not content:
        return _response(400, {"error": "Message content is required"})

    storage.add_user_message(conversation_id, content)

    if is_first_message:
        title = await generate_conversation_title(content)
        storage.update_conversation_title(conversation_id, title)

    stage1_results = await stage1_collect_responses(content, models=models)
    stage2_results, label_to_model = await stage2_collect_rankings(
        content,
        stage1_results,
        models=models,
    )
    aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
    stage3_result = await stage3_synthesize_final(
        content,
        stage1_results,
        stage2_results,
        chairman_model=chairman_model,
    )

    metadata = {
        "label_to_model": label_to_model,
        "aggregate_rankings": aggregate_rankings,
    }

    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result,
    )

    return _response(
        200,
        {
            "stage1": stage1_results,
            "stage2": stage2_results,
            "stage3": stage3_result,
            "metadata": metadata,
        },
    )


async def _route(event: Dict[str, Any]) -> Dict[str, Any]:
    """Route incoming API Gateway events."""
    http = event.get("requestContext", {}).get("http", {})
    method = http.get("method", "").upper()
    path = event.get("rawPath") or http.get("path") or ""
    query_params = event.get("queryStringParameters") or {}

    print(f"DEBUG: Routing request - method: {method}, path: {path}")

    if method == "OPTIONS":
        return _response(200, {"status": "ok"})

    if path == "/" and method == "GET":
        return _response(200, {"status": "ok", "service": "LLM Council API"})

    if path == "/api/models" and method == "GET":
        models = await _list_models()
        return _response(200, models)

    if path == "/api/conversations" and method == "GET":
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})
        return _response(200, storage.list_conversations(user_id))

    if path == "/api/conversations" and method == "POST":
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})
        conversation_id = str(uuid.uuid4())
        conversation = storage.create_conversation(conversation_id, user_id)
        return _response(201, conversation)

    if path == "/api/debate" and method == "POST":
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})

        body = _parse_body(event)
        topic = (body.get("topic") or "").strip()
        if not topic:
            return _response(400, {"error": "Debate topic is required"})

        # Get user's stored debate panel models
        panel_models = storage.get_user_debate_panel(user_id)
        valid_models = [m for m in panel_models if m]  # Filter out empty strings

        if len(valid_models) < 1:
            return _response(400, {"error": "No debate panel models configured. Please set up your debate panel first."})

        turns = await run_debate_sequence(topic, valid_models)
        return _response(200, {"topic": topic, "turns": turns})

    if path == "/api/debate/turn" and method == "POST":
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})

        body = _parse_body(event)
        topic = body.get("topic")
        target_model = body.get("target_model")
        history = body.get("history", [])
        system_prompt = body.get("system_prompt")

        if not topic or not target_model:
            return _response(400, {"error": "Topic and target_model are required"})

        result = await run_single_debate_turn(
            topic=topic,
            history=history,
            target_model=target_model,
            system_prompt=system_prompt
        )
        return _response(200, result)

    if path == "/api/debate/panel" and method == "GET":
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})

        panel_models = storage.get_user_debate_panel(user_id)
        return _response(200, {"panel_models": panel_models})

    if path == "/api/debate/panel" and method == "POST":
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})

        body = _parse_body(event)
        panel_models = body.get("panel_models", [])
        if not isinstance(panel_models, list) or len(panel_models) != 3:
            return _response(400, {"error": "panel_models must be an array of exactly 3 strings"})

        storage.save_user_debate_panel(user_id, panel_models)
        return _response(200, {"status": "saved", "panel_models": panel_models})

    if path == "/api/settings/models" and method == "GET":
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})
        models = storage.get_user_council_models(user_id)
        return _response(200, {"models": models})

    if path == "/api/settings/models" and method == "POST":
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})
        body = _parse_body(event)
        models = body.get("models", [])
        if not isinstance(models, list):
            return _response(400, {"error": "models must be a list"})
        storage.save_user_council_models(user_id, models)
        return _response(200, {"status": "saved", "models": models})

    match_message_stream = re.match(r"^/api/conversations/([^/]+)/message/stream$", path)
    match_message = re.match(r"^/api/conversations/([^/]+)/message$", path)
    match_conversation = re.match(r"^/api/conversations/([^/]+)$", path)

    if match_message_stream and method == "POST":
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})
        body = _parse_body(event)
        conversation_id = match_message_stream.group(1)
        return await _send_message_stream(conversation_id, user_id, body)

    if match_message and method == "POST":
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})
        body = _parse_body(event)
        conversation_id = match_message.group(1)
        if query_params.get("stream") == "true":
            return await _send_message_stream(conversation_id, user_id, body)
        return await _send_message(conversation_id, user_id, body)

    if match_conversation:
        user_id = _extract_user_id(event)
        if not user_id:
            return _response(401, {"error": "Authentication required"})
        conversation_id = match_conversation.group(1)
        if method == "GET":
            conversation = storage.get_conversation_for_user(conversation_id, user_id)
            if conversation is None:
                return _response(404, {"error": "Conversation not found"})
            return _response(200, conversation)
        if method == "DELETE":
            try:
                deleted = storage.delete_conversation(conversation_id, user_id)
                if not deleted:
                    return _response(404, {"error": "Conversation not found"})
                return _response(204)
            except Exception as exc:  # noqa: BLE001
                return _response(500, {"error": f"Failed to delete: {exc}"})

    return _response(404, {"error": "Not Found"})


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """AWS Lambda entrypoint."""
    try:
        return asyncio.run(_route(event))
    except Exception as exc:  # noqa: BLE001
        return _response(500, {"error": f"Internal server error: {exc}"})

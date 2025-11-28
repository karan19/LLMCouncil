"""DynamoDB-backed storage for conversations."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

from .config import CONVERSATIONS_TABLE


_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(CONVERSATIONS_TABLE)


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _handle_client_error(error: ClientError) -> None:
    raise RuntimeError(f"DynamoDB error: {error}") from error


def create_conversation(conversation_id: str, user_id: str) -> Dict[str, Any]:
    """Create a new conversation record owned by user_id."""
    conversation = {
        "id": conversation_id,
        "user_id": user_id,
        "created_at": _now_iso(),
        "title": "New Conversation",
        "messages": [],
    }
    try:
        _table.put_item(Item=conversation)
    except ClientError as error:  # noqa: BLE001
        _handle_client_error(error)
    return conversation


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a conversation by id."""
    try:
        response = _table.get_item(Key={"id": conversation_id})
    except ClientError as error:  # noqa: BLE001
        _handle_client_error(error)
    return response.get("Item")


def get_conversation_for_user(conversation_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a conversation by id, only if owned by user_id."""
    conversation = get_conversation(conversation_id)
    if conversation is None:
        return None
    if conversation.get("user_id") != user_id:
        return None
    return conversation


def save_conversation(conversation: Dict[str, Any]) -> None:
    """Persist a conversation."""
    try:
        _table.put_item(Item=conversation)
    except ClientError as error:  # noqa: BLE001
        _handle_client_error(error)


def list_conversations(user_id: str) -> List[Dict[str, Any]]:
    """Return conversation metadata for a specific user, sorted newest first."""
    try:
        # Scan with filter for user_id (consider adding a GSI for better performance)
        response = _table.scan(
            FilterExpression="user_id = :uid",
            ExpressionAttributeValues={":uid": user_id},
            ProjectionExpression="id, created_at, title, messages, user_id",
        )
    except ClientError as error:  # noqa: BLE001
        _handle_client_error(error)
    items = response.get("Items", [])
    conversations = []
    for item in items:
        conversations.append(
            {
                "id": item["id"],
                "created_at": item.get("created_at", ""),
                "title": item.get("title", "New Conversation"),
                "message_count": len(item.get("messages", [])),
            }
        )
    conversations.sort(key=lambda x: x["created_at"], reverse=True)
    return conversations


def add_user_message(conversation_id: str, content: str) -> None:
    """Append a user message to a conversation."""
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation.setdefault("messages", []).append(
        {
            "role": "user",
            "content": content,
        }
    )
    save_conversation(conversation)


def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
) -> None:
    """Append an assistant message with all three stages."""
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation.setdefault("messages", []).append(
        {
            "role": "assistant",
            "stage1": stage1,
            "stage2": stage2,
            "stage3": stage3,
        }
    )
    save_conversation(conversation)


def update_conversation_title(conversation_id: str, title: str) -> None:
    """Update a conversation title."""
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["title"] = title
    save_conversation(conversation)


def delete_conversation(conversation_id: str, user_id: str) -> bool:
    """Delete a conversation by id if owned by user_id. Returns True if deleted."""
    conversation = get_conversation(conversation_id)
    if conversation is None:
        return False
    if conversation.get("user_id") != user_id:
        return False
    try:
        _table.delete_item(Key={"id": conversation_id})
    except ClientError as error:  # noqa: BLE001
        _handle_client_error(error)
    return True


def get_user_debate_panel(user_id: str) -> List[str]:
    """Get user's debate panel models."""
    try:
        response = _table.get_item(Key={"id": f"user_panel_{user_id}"})
    except ClientError as error:  # noqa: BLE001
        _handle_client_error(error)
    item = response.get("Item")
    if item:
        return item.get("panel_models", ["", "", ""])
    return ["", "", ""]


def save_user_debate_panel(user_id: str, panel_models: List[str]) -> None:
    """Save user's debate panel models."""
    item = {
        "id": f"user_panel_{user_id}",
        "panel_models": panel_models,
        "updated_at": _now_iso(),
    }
    try:
        _table.put_item(Item=item)
    except ClientError as error:  # noqa: BLE001
        _handle_client_error(error)

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


def create_conversation(conversation_id: str) -> Dict[str, Any]:
    """Create a new conversation record."""
    conversation = {
        "id": conversation_id,
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


def save_conversation(conversation: Dict[str, Any]) -> None:
    """Persist a conversation."""
    try:
        _table.put_item(Item=conversation)
    except ClientError as error:  # noqa: BLE001
        _handle_client_error(error)


def list_conversations() -> List[Dict[str, Any]]:
    """Return all conversation metadata sorted newest first."""
    try:
        response = _table.scan(ProjectionExpression="id, created_at, title, messages")
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


def delete_conversation(conversation_id: str) -> None:
    """Delete a conversation by id."""
    try:
        _table.delete_item(Key={"id": conversation_id})
    except ClientError as error:  # noqa: BLE001
        _handle_client_error(error)

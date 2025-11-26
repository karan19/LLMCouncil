"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

import boto3
from functools import lru_cache

# OpenRouter API key: prefer direct env, else fetch from SSM using OPENROUTER_PARAM_NAME
@lru_cache(maxsize=1)
def _load_openrouter_api_key() -> str | None:
    direct = os.getenv("OPENROUTER_API_KEY")
    if direct:
        return direct
    param_name = os.getenv("OPENROUTER_PARAM_NAME")
    if not param_name:
        return None
    try:
        ssm = boto3.client("ssm")
        resp = ssm.get_parameter(Name=param_name, WithDecryption=True)
        return resp["Parameter"]["Value"]
    except Exception as exc:  # noqa: BLE001
        print(f"Error loading OPENROUTER_API_KEY from SSM ({param_name}): {exc}")
        return None


OPENROUTER_API_KEY = _load_openrouter_api_key()

# Council members - list of OpenRouter model identifiers
COUNCIL_MODELS = [
    "openai/gpt-5.1",
    "google/gemini-3-pro-preview",
    "anthropic/claude-sonnet-4.5",
    "x-ai/grok-4",
]

# Chairman model - synthesizes final response
CHAIRMAN_MODEL = "google/gemini-3-pro-preview"

# Models/families to hide from UI/model picker
# Examples:
# EXCLUDED_MODEL_FAMILIES = ["huggingface", "replicate"]
# EXCLUDED_MODELS = ["openai/gpt-3.5-turbo"]
# Add exact model IDs to EXCLUDED_MODELS (e.g., "mistralai/voxtral-small-24b-2507").
# Add provider prefixes to EXCLUDED_MODEL_FAMILIES (e.g., "mistralai") to hide all their models.
# Use EXCLUDED_MODEL_PATTERNS for regex (e.g., r"openai/gpt-.*" to hide all openai gpt-* models).
EXCLUDED_MODEL_FAMILIES = ["alibaba"]
EXCLUDED_MODELS = ["mistralai/voxtral-small-24b-2507"]
# Regex/wildcard patterns to hide models (e.g., r"openai/gpt-.*")
EXCLUDED_MODEL_PATTERNS = []

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# DynamoDB table for conversation storage
CONVERSATIONS_TABLE = os.getenv("CONVERSATIONS_TABLE", "llm-council-conversations")

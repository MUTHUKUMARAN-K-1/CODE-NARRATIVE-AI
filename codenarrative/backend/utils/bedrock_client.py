import json
import os
import time
from typing import Any, Dict, List

import boto3
from botocore.exceptions import BotoCoreError, ClientError


def _extract_text_from_converse_output(response: Dict[str, Any]) -> str:
  """
  Get response text from Converse API: output.message.content[*].text concatenated.
  """
  try:
    content: List[Dict[str, Any]] = response["output"]["message"]["content"]
  except (KeyError, TypeError):
    raise ValueError("Converse response missing output.message.content")
  if not content:
    raise ValueError("Converse response has empty content")
  texts: List[str] = []
  for block in content:
    if isinstance(block, dict) and block.get("text") is not None:
      texts.append(block.get("text") or "")
  if not texts:
    raise ValueError("Converse content has no 'text' blocks")
  return " ".join(t.strip() for t in texts).strip()


def _strip_markdown_fences(text: str) -> str:
  """
  Strip common markdown code fences that models sometimes wrap JSON in.
  Handles: ```json ... ```, ``` ... ```, and leading/trailing whitespace.
  """
  stripped = text.strip()
  # Remove leading fence with optional language tag (```json, ```JSON, ```, etc.)
  if stripped.startswith("```"):
    # Find the closing fence
    parts = stripped.split("```")
    if len(parts) >= 3:
      # parts[1] is the content between first and second ```
      # But first ``` may have a language tag on same line
      inner = parts[1]
      # Remove optional language tag on first line (e.g. "json\n{...}")
      nl = inner.find("\n")
      if nl != -1:
        first_line = inner[:nl].strip()
        if first_line and not first_line.startswith("{") and not first_line.startswith("["):
          inner = inner[nl + 1:]
      return inner.strip()
  return stripped


def call_bedrock(prompt: str) -> Dict[str, Any]:
  """
  Low-level Bedrock call using the Converse API.

  Uses whatever text model / inference profile is in BEDROCK_MODEL_ID
  (e.g. us.deepseek.r1-v1:0, apac.anthropic.claude-sonnet-4-20250514-v1:0, etc.).
  Expects the model to return a single JSON object as text.
  Retries once on ThrottlingException with 2 s delay.
  """
  region = os.getenv("BEDROCK_REGION", "us-east-1")
  model_id = os.getenv("BEDROCK_MODEL_ID", "us.deepseek.r1-v1:0")
  client = boto3.client("bedrock-runtime", region_name=region)

  messages = [
    {
      "role": "user",
      "content": [
        {
          "text": prompt,
        }
      ],
    }
  ]

  print(f"Bedrock converse: model_id={model_id} region={region}")

  def _invoke() -> Dict[str, Any]:
    return client.converse(
      modelId=model_id,
      messages=messages,
      inferenceConfig={"maxTokens": 4096, "temperature": 0.2},
    )

  # Retry once on throttling
  try:
    response = _invoke()
  except ClientError as e:
    code = e.response.get("Error", {}).get("Code", "")
    if code in ("ThrottlingException", "ServiceUnavailableException"):
      print(f"Bedrock throttled ({code}), retrying in 2 s…")
      time.sleep(2)
      response = _invoke()
    else:
      raise

  text = _extract_text_from_converse_output(response)
  text = _strip_markdown_fences(text)
  return json.loads(text)


def safe_bedrock(prompt: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
  """
  Wrapper that returns deterministic fallback data when Bedrock
  is disabled or credentials are not configured.
  """
  if os.getenv("USE_BEDROCK_MOCKS", "false").lower() == "true":
    return fallback

  try:
    return call_bedrock(prompt)
  except (BotoCoreError, ClientError, json.JSONDecodeError, ValueError) as e:
    # Log details so failures are visible in CloudWatch / terminal.
    if isinstance(e, ClientError) and getattr(e, "response", None):
      err = e.response.get("Error", {})
      code = err.get("Code")
      message = err.get("Message", str(e))
      print(f"Bedrock ClientError ({code}): {message}")
    else:
      print(f"Bedrock call failed: {type(e).__name__}: {e}")
    return fallback

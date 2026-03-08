"""POST /api/key-takeaways - 5-bullet summary for new joiners (knowledge/summarization)."""
import json
from typing import Any, Dict

from utils import bedrock_client, dynamodb_client


def _response(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
  return {
    "statusCode": status,
    "headers": {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
      "Content-Type": "application/json",
    },
    "body": json.dumps(body),
  }


def lambda_handler(event, _context):
  try:
    return _handle(event)
  except Exception as exc:
    print(f"Key takeaways handler error: {exc}")
    return _response(500, {"error": "Key takeaways failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  if not repo_id:
    return _response(400, {"error": "repo_id is required"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  summary = repo.get("summary") or ""

  prompt = (
    "Summarize this repository in exactly 5 bullet points for a new joiner. "
    "Each bullet should be one sentence: what this repo is, how it's structured, where to start, key tech, and one gotcha or tip.\n"
    f"Summary: {summary}\n"
    f"Analysis: {json.dumps(analysis)[:2500]}\n\n"
    "Return JSON with: bullets (array of exactly 5 strings)"
  )

  fallback = {
    "bullets": [
      "This repository contains the main application and services.",
      "Structure follows a layered architecture with clear entry points.",
      "Start with the README and the main entry file.",
      "Key technologies are used for frontend and backend.",
      "Check environment setup and tests before making changes.",
    ],
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

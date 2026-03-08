"""POST /api/critical-path - Critical path from app start to a feature (simplify)."""
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
    print(f"Critical path handler error: {exc}")
    return _response(500, {"error": "Critical path failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  feature = (body.get("feature") or body.get("feature_description") or "main user flow").strip()[:500]

  if not repo_id:
    return _response(400, {"error": "repo_id is required"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  file_tree = dynamodb_client._decimal_to_serializable(repo.get("file_tree") or [])

  prompt = (
    "For this codebase, describe the critical path from application start to the following feature.\n"
    f"Feature: {feature}\n"
    f"Analysis: {json.dumps(analysis)[:3000]}\n"
    f"File tree: {json.dumps([n.get('path') for n in file_tree[:80] if n.get('path')])}\n\n"
    "Return JSON with:\n"
    "- steps: array of objects {order: number, file_or_component: string, one_line: string}\n"
    "- summary: 2-3 sentence overview of the path"
  )

  fallback = {
    "steps": [
      {"order": 1, "file_or_component": "Entry point", "one_line": "Application bootstrap"},
      {"order": 2, "file_or_component": "Router/Handler", "one_line": "Request or event routing"},
      {"order": 3, "file_or_component": "Feature module", "one_line": "Core logic for the feature"},
    ],
    "summary": "Path from entry point through routing to the feature module.",
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

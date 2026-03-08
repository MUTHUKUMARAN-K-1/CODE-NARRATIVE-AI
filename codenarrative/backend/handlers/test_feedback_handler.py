"""POST /api/test-feedback - Why might this test fail? (developer productivity / debugging)."""
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
    print(f"Test feedback handler error: {exc}")
    return _response(500, {"error": "Test feedback failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  test_code = body.get("test_code") or ""
  function_name = body.get("function_name") or ""

  if not repo_id:
    return _response(400, {"error": "repo_id is required"})
  if len(test_code) > 8000:
    return _response(400, {"error": "test_code too long", "message": "Max 8000 characters"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  summary = (repo.get("summary") or "")[:1500]

  prompt = (
    "A developer has this generated test. List reasons why it might fail when run.\n"
    f"Target function: {function_name}\n"
    f"Test code:\n{test_code}\n"
    f"Repo context: {summary}\n\n"
    "Return JSON with:\n"
    "- reasons: array of 2-5 short strings (each one bullet: e.g. mocks not set up, async not awaited, env missing)"
  )

  fallback = {
    "reasons": [
      "Mocks or stubs may not be configured for dependencies.",
      "Async code might need proper awaiting or fake timers.",
      "Environment variables or config might be missing in test.",
    ],
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

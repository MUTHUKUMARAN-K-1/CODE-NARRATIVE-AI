"""GET /api/knowledge-map - Who knows what / what does who own (knowledge organization)."""
import json
from typing import Any, Dict, List

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
    print(f"Knowledge map handler error: {exc}")
    return _response(500, {"error": "Knowledge map failed", "message": str(exc)})


def _handle(event):
  query = event.get("queryStringParameters") or {}
  repo_id = query.get("repo_id")
  if not repo_id:
    return _response(400, {"error": "repo_id query param is required"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  components = (analysis.get("components") or [])[:20]
  if not components:
    components = [{"name": "Core", "description": "Main codebase", "files": []}]

  prompt = (
    "This repo has these components/modules. For a 'team knowledge map', suggest which type of developer might own each "
    "(e.g. 'Backend dev', 'Frontend dev', 'Full-stack'). No real names - use roles.\n"
    f"Components: {json.dumps(components)}\n\n"
    "Return JSON with: map (array of {component: string, suggested_owner_role: string, one_line_reason: string})"
  )
  fallback = {
    "map": [
      {"component": c.get("name", "Module"), "suggested_owner_role": "Full-stack", "one_line_reason": "General ownership."}
      for c in components[:10]
    ],
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

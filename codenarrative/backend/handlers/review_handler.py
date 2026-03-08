"""GET /api/review - Spaced repetition: concepts to review (learning / skill-building)."""
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
    print(f"Review handler error: {exc}")
    return _response(500, {"error": "Review failed", "message": str(exc)})


def _handle(event):
  query = event.get("queryStringParameters") or {}
  user_id = query.get("user_id")
  repo_id = query.get("repo_id")
  if not user_id or not repo_id:
    return _response(400, {"error": "user_id and repo_id query params are required"})

  progress = dynamodb_client.get_user_progress(user_id, repo_id)
  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  path = (progress or {}).get("learning_path") or []
  concepts_seen = []
  for day in path[:14]:
    if isinstance(day, dict):
      concepts_seen.extend(day.get("concepts") or [])
  concepts_seen = list(dict.fromkeys(concepts_seen))[:20]

  if not concepts_seen:
    return _response(200, {
      "suggestions": [],
      "message": "Complete some learning path days to get review suggestions.",
    })

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  prompt = (
    "Given these concepts from a developer's learning path, pick 1-3 that are best to review now "
    "(e.g. foundational or easy to forget). Return a short recap for each.\n"
    f"Concepts: {json.dumps(concepts_seen)}\n"
    f"Repo context: {json.dumps(analysis)[:1500]}\n\n"
    "Return JSON with: suggestions (array of {concept: string, recap: string})"
  )
  fallback = {"suggestions": [{"concept": concepts_seen[0], "recap": "Quick recap of this concept."}] if concepts_seen else []}

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

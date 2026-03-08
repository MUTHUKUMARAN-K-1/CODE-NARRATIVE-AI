"""GET /api/digest - Weekly-style digest for user (knowledge / summarization)."""
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
    print(f"Digest handler error: {exc}")
    return _response(500, {"error": "Digest failed", "message": str(exc)})


def _handle(event):
  query = event.get("queryStringParameters") or {}
  user_id = query.get("user_id")
  if not user_id:
    return _response(400, {"error": "user_id query param is required"})

  # Get all progress records for this user (repos they're learning)
  table = dynamodb_client._table("USERS_TABLE_NAME")
  resp = table.query(KeyConditionExpression="user_id = :uid", ExpressionAttributeValues={":uid": user_id})
  items = resp.get("Items") or []
  repos = []
  for item in items:
    rid = item.get("repo_id")
    if rid:
      repo = dynamodb_client.get_repo(rid)
      if repo:
        path = item.get("learning_path") or []
        days_done = len([p for p in item.get("learning_path_progress") or [] if p])
        repos.append({
          "repo_id": rid,
          "name": repo.get("repo_name") or rid,
          "days_completed": days_done,
          "path_length": len(path),
        })

  if not repos:
    return _response(200, {
      "summary": "No active learning yet. Analyze a repo and start your learning path to get a digest.",
      "repos": [],
      "suggested_next": None,
    })

  prompt = (
    "Based on this learning progress, write a 2-4 sentence digest for the developer: what they've done, what to do next.\n"
    f"Repos: {json.dumps(repos)}\n\n"
    "Return JSON with: summary (string), suggested_next (string, one concrete next step)"
  )
  fallback = {
    "summary": f"You have {len(repos)} repo(s) in progress. Keep going with your learning path.",
    "suggested_next": "Complete the next day on your current learning path.",
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  out["repos"] = repos
  return _response(200, out)

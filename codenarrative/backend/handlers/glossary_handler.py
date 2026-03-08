"""POST /api/glossary - Get level-based definition for a term (learning assistant)."""
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
    print(f"Glossary handler error: {exc}")
    return _response(500, {"error": "Glossary failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  term = (body.get("term") or "").strip()
  level = (body.get("level") or "beginner").lower()
  if level not in ("beginner", "intermediate", "expert"):
    level = "beginner"

  if not repo_id or not term:
    return _response(400, {"error": "repo_id and term are required"})
  if len(term) > 200:
    return _response(400, {"error": "term too long", "message": "Max 200 characters"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  summary = (repo.get("summary") or "")[:1500]

  prompt = (
    f"Define the technical term \"{term}\" at level: {level}.\n"
    f"Repository context (for 'in_this_repo'): {summary}\n\n"
    "Return JSON with:\n"
    "- definition: 2-4 sentences appropriate for the level\n"
    "- in_this_repo: one sentence on how this concept appears or matters in this codebase\n"
    "- example: one short code or conceptual example if relevant"
  )

  fallback = {
    "definition": f"{term} is a concept used in software development. Look it up in the project docs for details.",
    "in_this_repo": "This concept is used in this codebase.",
    "example": "",
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

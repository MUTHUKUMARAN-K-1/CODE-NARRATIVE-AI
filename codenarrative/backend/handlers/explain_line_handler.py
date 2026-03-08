"""POST /api/explain-line - Ask about a specific line of code (learning assistant)."""
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
    print(f"Explain line handler error: {exc}")
    return _response(500, {"error": "Explain line failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  file_path = body.get("file_path")
  line_number = body.get("line_number")
  line_content = body.get("line_content")
  surrounding = body.get("surrounding_context") or ""

  if not all([repo_id, file_path, line_content]):
    return _response(400, {"error": "repo_id, file_path, line_content are required"})
  if len(line_content) > 2000 or len(str(surrounding)) > 8000:
    return _response(400, {"error": "Content too long", "message": "Max 2000 for line, 8000 for context"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  summary = (repo.get("summary") or "")[:2000]
  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})

  prompt = (
    "You are a code tutor. The user is asking about a specific line of code.\n"
    f"Repository summary: {summary}\n"
    f"File: {file_path}\n"
    f"Line number: {line_number or 'unknown'}\n"
    f"Line content: {line_content}\n"
    f"Surrounding context (optional):\n{surrounding[:8000]}\n\n"
    "Answer in 2-4 sentences: What does this line do and why is it here? "
    "Return JSON with: explanation (string), in_this_repo (one sentence on how it fits this codebase)."
  )

  fallback = {
    "explanation": "This line contributes to the logic of the surrounding block. In context, it helps achieve the function's purpose.",
    "in_this_repo": "It fits the overall architecture of this repository.",
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

"""GET /api/repos/{repo_id}/files - return file content for Explanations (real repo content)."""
import json
from typing import Any, Dict

from utils import dynamodb_client, github_client


def _is_safe_path(path: str) -> bool:
  """Reject path traversal and absolute paths (GitHub paths use /)."""
  if not path or path != path.strip():
    return False
  if path.startswith("/") or path.startswith(".."):
    return False
  parts = path.replace("\\", "/").split("/")
  if any(p == ".." for p in parts):
    return False
  return True


def _response(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
  return {
    "statusCode": status,
    "headers": {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET",
      "Content-Type": "application/json",
    },
    "body": json.dumps(body),
  }


def lambda_handler(event, _context):
  try:
    return _handle(event)
  except Exception as exc:
    print(f"File content handler error: {exc}")
    return _response(500, {"error": "Failed to fetch file", "message": str(exc)})


def _handle(event):
  path_params = event.get("pathParameters") or {}
  repo_id = path_params.get("repo_id")
  query = event.get("queryStringParameters") or {}
  file_path = query.get("path") or (query.get("file_path"))

  if not repo_id:
    return _response(400, {"error": "repo_id is required"})
  if not file_path or not file_path.strip():
    return _response(400, {"error": "path (or file_path) query parameter is required"})

  file_path = file_path.strip()
  if not _is_safe_path(file_path):
    return _response(400, {"error": "Invalid path"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository not found", "repo_id": repo_id})

  owner = repo.get("owner")
  repo_name = repo.get("repo_name")
  if not owner or not repo_name:
    return _response(400, {"error": "Repository has no owner/repo_name (analyze first)"})

  try:
    content = github_client.fetch_file_content(owner, repo_name, file_path)
  except RuntimeError as e:
    msg = str(e)
    if "404" in msg:
      return _response(404, {"error": "File not found", "path": file_path})
    return _response(502, {"error": "GitHub error", "message": msg})

  return _response(200, {"content": content})

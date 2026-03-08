"""POST /api/where-used - Where is this symbol/file used? (developer productivity)."""
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
    print(f"Where-used handler error: {exc}")
    return _response(500, {"error": "Where-used failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  symbol_or_path = (body.get("symbol_or_path") or body.get("symbol") or "").strip()
  if not repo_id or not symbol_or_path:
    return _response(400, {"error": "repo_id and symbol_or_path are required"})
  if len(symbol_or_path) > 500:
    return _response(400, {"error": "symbol_or_path too long", "message": "Max 500 characters"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  file_tree = dynamodb_client._decimal_to_serializable(repo.get("file_tree") or [])
  paths = [n.get("path") for n in file_tree if n.get("path")][:200]

  prompt = (
    "Based on this repository structure and analysis, where is the following symbol or file used?\n"
    f"Symbol or path: {symbol_or_path}\n"
    f"File list: {json.dumps(paths)}\n"
    f"Analysis: {json.dumps(analysis)[:2500]}\n\n"
    "Return JSON with:\n"
    "- answer: 2-5 sentence explanation of where/how it is used\n"
    "- likely_files: array of file paths that likely reference or depend on this (max 15)"
  )

  fallback = {
    "answer": f"'{symbol_or_path}' may be referenced in several files. Check imports and the file tree for usages.",
    "likely_files": paths[:10] if paths else [],
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

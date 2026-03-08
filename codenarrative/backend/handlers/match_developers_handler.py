"""POST /api/match-developers - suggest developer-to-module assignments from repo analysis."""
import json
from decimal import Decimal
from typing import Any, Dict, List

from utils import bedrock_client, dynamodb_client


def _decimal_to_number(obj: Any) -> Any:
  if isinstance(obj, Decimal):
    return int(obj) if obj % 1 == 0 else float(obj)
  if isinstance(obj, dict):
    return {k: _decimal_to_number(v) for k, v in obj.items()}
  if isinstance(obj, list):
    return [_decimal_to_number(v) for v in obj]
  return obj


def _response(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
  return {
    "statusCode": status,
    "headers": {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST",
      "Content-Type": "application/json",
    },
    "body": json.dumps(body, default=str),
  }


def lambda_handler(event, _context):
  try:
    return _handle(event)
  except Exception as exc:
    print(f"Match developers handler error: {exc}")
    return _response(500, {"error": "Match developers failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except (TypeError, json.JSONDecodeError):
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  team_profiles = body.get("team_profiles") or []
  if not repo_id or not isinstance(team_profiles, list) or not team_profiles:
    return _response(400, {"error": "repo_id and non-empty team_profiles array are required"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository not found", "repo_id": repo_id})

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  summary = repo.get("summary") or analysis.get("summary") or ""
  critical = analysis.get("critical_files") or []
  entry_points = analysis.get("entry_points") or []
  tech_stack = analysis.get("tech_stack") or []

  prompt = (
    "You are a tech lead assigning developers to parts of a codebase.\n\n"
    f"Repository analysis summary: {summary}\n"
    f"Tech stack: {tech_stack}\n"
    f"Entry points: {entry_points}\n"
    f"Critical files (with roles): {json.dumps(critical, default=str)[:1500]}\n\n"
    f"Team profiles:\n{json.dumps(team_profiles, default=str)}\n\n"
    "Return a single JSON object with:\n"
    "- assignments: array of { developer_name, module_or_area, suggested_files_or_paths, reasoning }\n"
    "- mentoring_pairs: array of { mentor, mentee, reason } (optional)\n"
    "- notes: string with overall recommendations (optional)\n"
    "No markdown, no code fences."
  )

  fallback = {
    "assignments": [
      {"developer_name": p.get("name", "Developer"), "module_or_area": "General", "suggested_files_or_paths": ["README.md"], "reasoning": "Default assignment."}
      for p in team_profiles[:10]
    ],
    "mentoring_pairs": [],
    "notes": "Run with full repo analysis for better suggestions.",
  }

  try:
    raw = bedrock_client.safe_bedrock(prompt, fallback)
  except Exception as e:
    print(f"Match developers Bedrock failed: {e}")
    raw = fallback

  if not isinstance(raw, dict):
    raw = fallback
  out = {
    "repo_id": repo_id,
    "assignments": raw.get("assignments") or fallback["assignments"],
    "mentoring_pairs": raw.get("mentoring_pairs") or [],
    "notes": raw.get("notes") or "",
  }
  return _response(200, _decimal_to_number(out))


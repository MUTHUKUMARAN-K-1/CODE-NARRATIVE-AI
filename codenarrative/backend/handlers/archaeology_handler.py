"""Code Archaeology: AI detective investigating code mysteries."""
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
    print(f"Archaeology handler error: {exc}")
    return _response(500, {"error": "Archaeology failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  if not repo_id:
    return _response(400, {"error": "repo_id is required"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  file_tree = dynamodb_client._decimal_to_serializable(repo.get("file_tree") or [])
  summary = str(repo.get("summary") or "")

  # Keep prompt short so DeepSeek R1 responds within API Gateway's 29 s hard limit.
  file_sample = [n.get("path") for n in file_tree[:20] if n.get("type") == "blob"]
  analysis_brief = {
    "tech_stack": analysis.get("tech_stack", [])[:8],
    "architecture_type": analysis.get("architecture_type", "unknown"),
    "complexity_score": analysis.get("complexity_score"),
    "critical_files": [f.get("file") for f in (analysis.get("critical_files") or [])[:5]],
    "dependencies": (analysis.get("dependencies") or [])[:8],
  }

  prompt = (
    "You are Sherlock Holmes investigating a code mystery. Be concise.\n\n"
    f"Summary: {str(summary)[:800]}\n"
    f"Analysis: {json.dumps(analysis_brief)}\n"
    f"Key files: {json.dumps(file_sample)}\n\n"
    "Return ONLY valid JSON (no markdown) with these keys:\n"
    '"timeline": [{event, when, clue}] (3 items max)\n'
    '"suspects": [{name, role, motive, evidence}] (3 items max)\n'
    '"evidence_board": [{title, description, importance}] (3 items max)\n'
    '"revelation": string\n'
    '"story": string (2-3 sentences)\n'
    "Keep each string under 120 characters."
  )

  fallback = {
    "timeline": [
      {"event": "Initial commit", "when": "Unknown", "clue": "Repository structure suggests incremental growth."},
    ],
    "suspects": [
      {"name": "The Original Author", "role": "Developer", "motive": "Deadline pressure", "evidence": "Mixed patterns."},
    ],
    "evidence_board": [
      {"title": "File structure", "description": "Directory layout reveals architectural decisions.", "importance": "High"},
    ],
    "revelation": "The codebase evolved under changing requirements; the real culprit is technical debt.",
    "story": "The case of the mysterious codebase. Run a full repo analysis for a richer investigation.",
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  return _response(200, result)

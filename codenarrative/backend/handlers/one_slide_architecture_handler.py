"""POST /api/one-slide-architecture - Summarize architecture to one slide (simplify)."""
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
    print(f"One-slide architecture handler error: {exc}")
    return _response(500, {"error": "One-slide architecture failed", "message": str(exc)})


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
  file_tree = dynamodb_client._decimal_to_serializable(repo.get("file_tree") or [])[:100]

  prompt = (
    "Summarize this repository's architecture into ONE slide for a stakeholder.\n"
    f"Analysis: {json.dumps(analysis)}\n"
    f"File tree sample: {json.dumps([n.get('path') for n in file_tree if n.get('path')])}\n\n"
    "Return JSON with:\n"
    "- title: slide title (e.g. 'Repo X - Architecture at a glance')\n"
    "- bullets: array of 3-5 short bullet points\n"
    "- one_diagram_mermaid: one simple Mermaid flowchart (minimal, key components only)"
  )

  fallback = {
    "title": "Architecture at a glance",
    "bullets": [
      "Core components and their responsibilities",
      "Main data flow and entry points",
      "Key technologies and patterns",
    ],
    "one_diagram_mermaid": "flowchart LR\n  A[Client] --> B[API]\n  B --> C[Services]\n  C --> D[Data]",
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

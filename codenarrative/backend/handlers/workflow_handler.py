"""POST /api/workflow - Workflow minimap: step-by-step for a flow (simplify)."""
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
    print(f"Workflow handler error: {exc}")
    return _response(500, {"error": "Workflow failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  flow_name = (body.get("flow_name") or body.get("flow") or "user login").strip()[:200]

  if not repo_id:
    return _response(400, {"error": "repo_id is required"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})

  prompt = (
    "For this codebase, outline the workflow for: " + flow_name + ".\n"
    f"Analysis: {json.dumps(analysis)[:3000]}\n\n"
    "Return JSON with:\n"
    "- flow_name: the flow name\n"
    "- steps: array of {step: number, name: string, file_or_location: string, description: string}\n"
    "- mermaid_sequence: optional Mermaid sequenceDiagram string (compact)"
  )

  fallback = {
    "flow_name": flow_name,
    "steps": [
      {"step": 1, "name": "Trigger", "file_or_location": "Entry", "description": "Flow is triggered"},
      {"step": 2, "name": "Validation", "file_or_location": "Handler", "description": "Input validated"},
      {"step": 3, "name": "Process", "file_or_location": "Service", "description": "Business logic"},
    ],
    "mermaid_sequence": "sequenceDiagram\n  User->>App: trigger\n  App->>Service: process",
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

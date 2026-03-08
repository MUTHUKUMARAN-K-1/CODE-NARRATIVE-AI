"""POST /api/repos/{repo_id}/simulate-impact - Codebase MRI Impact Simulation."""
import json
from typing import Any, Dict

from utils import bedrock_client, dynamodb_client


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
    print(f"Simulate impact handler error: {exc}")
    return _response(500, {"error": "Simulate impact failed", "message": str(exc)})


def _handle(event):
  repo_id = (event.get("pathParameters") or {}).get("repo_id")
  if not repo_id:
    return _response(400, {"error": "repo_id is required"})

  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  scenario = (body.get("scenario") or "").strip()
  if not scenario:
    return _response(400, {"error": "scenario is required", "message": "Provide a scenario, e.g. 'Remove Redis layer' or 'Delete auth/session.py'"})
  if len(scenario) > 500:
    return _response(400, {"error": "scenario too long", "message": "Max 500 characters"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository not found", "repo_id": repo_id})

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  mri_critical = dynamodb_client._decimal_to_serializable(repo.get("mri_critical_files") or [])
  file_tree = repo.get("file_tree") or []
  summary = repo.get("summary") or ""

  prompt = (
    "You are simulating the architectural impact of a proposed change to a codebase. "
    "Do NOT actually make changes; only describe the predicted impact.\n\n"
    f"Repository summary: {summary}\n\n"
    f"Proposed scenario: {scenario}\n\n"
    "Context - high-impact files (if you change these, many modules are affected):\n"
    f"{json.dumps(mri_critical[:15], default=str)}\n\n"
    "Return a single JSON object with these keys:\n"
    "- summary: 2-3 sentence overview of the simulated impact (what would break, what would need to change)\n"
    "- affected_modules: list of module/area names that would be affected\n"
    "- suggested_order: list of steps or order in which to make the change safely (e.g. '1. Update callers of X, 2. Remove X')\n"
    "- risks: list of short risk descriptions (e.g. 'Breaking change for 5 downstream services')\n"
  )

  fallback = {
    "summary": f"Simulated impact of '{scenario}': this would likely affect multiple areas. Run a full analysis and refactor in small steps.",
    "affected_modules": [],
    "suggested_order": ["Identify all usages", "Update callers", "Remove or replace the target"],
    "risks": ["Breaking change for dependent code"],
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  result = dynamodb_client._decimal_to_serializable(result)

  return _response(200, {
    "scenario": scenario,
    "summary": result.get("summary", fallback["summary"]),
    "affected_modules": result.get("affected_modules") or fallback["affected_modules"],
    "suggested_order": result.get("suggested_order") or fallback["suggested_order"],
    "risks": result.get("risks") or fallback["risks"],
  })

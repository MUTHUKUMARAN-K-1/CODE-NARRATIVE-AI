"""Code Therapy: AI therapist for conflicting modules."""
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
    print(f"Therapy handler error: {exc}")
    return _response(500, {"error": "Therapy failed", "message": str(exc)})


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
  module_names = body.get("module_names")
  if not module_names and analysis.get("critical_files"):
    module_names = [f.get("file") for f in (analysis.get("critical_files") or [])[:8] if f.get("file")]
  if not module_names and file_tree:
    module_names = [n.get("path") for n in file_tree[:15] if n.get("type") == "blob" and n.get("path")]

  modules_str = json.dumps(module_names or ["(no modules identified)"], default=str)
  analysis_str = json.dumps(
    {
      "tech_stack": analysis.get("tech_stack"),
      "architecture_type": analysis.get("architecture_type"),
      "dependencies": analysis.get("dependencies"),
      "summary": repo.get("summary"),
    },
    default=str,
  )

  prompt = (
    "You are Dr. Freud conducting group therapy for software modules.\n\n"
    f"Patients (modules/files): {modules_str}\n\n"
    f"Codebase context: {analysis_str}\n\n"
    "Conduct a group therapy session and return ONLY valid JSON with these exact keys:\n"
    '- "transcript": string - the therapy session transcript (each module expresses frustrations, 4-6 exchanges)\n'
    '- "diagnosis": array of { "condition": string, "severity": string, "affected": string } - e.g. "Dependency Anxiety", "Circular Reference Depression", "Legacy Code PTSD"\n'
    '- "treatment_plan": array of { "step": string, "action": string } - prescribed architectural or refactor steps\n'
    "Use humor but keep it technically relevant. Output only the JSON object, no markdown."
  )

  fallback = {
    "transcript": "Therapist: Welcome, modules. Who would like to share today?\nModule A: I feel tightly coupled.\nTherapist: And how does that make you feel?\nModule A: Anxious. Every time they change the API I break.\nTherapist: Let us work on setting boundaries (interfaces).",
    "diagnosis": [
      {"condition": "Dependency Anxiety Disorder", "severity": "Moderate", "affected": "Multiple modules"},
    ],
    "treatment_plan": [
      {"step": "1", "action": "Introduce clear interfaces between modules"},
      {"step": "2", "action": "Schedule refactoring sessions"},
    ],
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  return _response(200, result)


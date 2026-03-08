"""POST /api/runbook - Generate runbook: run locally, tests, deploy (developer productivity)."""
import json
from typing import Any, Dict

from utils import bedrock_client, dynamodb_client, github_client


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
    print(f"Runbook handler error: {exc}")
    return _response(500, {"error": "Runbook failed", "message": str(exc)})


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
  summary = repo.get("summary") or ""
  readme = ""
  try:
    owner, name = repo.get("owner"), repo.get("repo_name")
    if owner and name:
      readme = github_client.fetch_file_content(owner, name, "README.md")[:4000]
  except Exception:
    pass

  prompt = (
    "Generate a short runbook for a new developer based on this repo.\n"
    f"Summary: {summary}\n"
    f"Analysis (stack, entry points): {json.dumps(analysis)[:3000]}\n"
    f"README (if any): {readme}\n\n"
    "Return JSON with:\n"
    "- run_locally: steps to run the project locally (numbered list as array of strings)\n"
    "- run_tests: steps to run tests\n"
    "- env_vars: list of likely env vars or config needed (name, description)\n"
    "- deploy: steps or notes for deployment if inferrable, else empty array"
  )

  fallback = {
    "run_locally": ["Clone the repo", "Install dependencies (see README)", "Start the dev server"],
    "run_tests": ["Run the test command from README or package.json"],
    "env_vars": [],
    "deploy": [],
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

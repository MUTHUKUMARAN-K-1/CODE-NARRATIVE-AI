"""Reality TV: Survivor-style episode featuring codebase modules."""
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
    print(f"Reality handler error: {exc}")
    return _response(500, {"error": "Reality failed", "message": str(exc)})


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
  critical = analysis.get("critical_files") or []
  contestants = [f.get("file") for f in critical[:10] if f.get("file")]
  if not contestants and file_tree:
    contestants = [n.get("path") for n in file_tree[:12] if n.get("type") == "blob" and n.get("path")]
  if not contestants:
    contestants = ["module_a", "module_b"]

  ctx = {
    "tech_stack": analysis.get("tech_stack"),
    "architecture_type": analysis.get("architecture_type"),
    "summary": repo.get("summary"),
  }
  prompt = (
    "Create a reality TV episode: Survivor Codebase Island. Contestants: "
    + json.dumps(contestants)
    + ". Context: "
    + json.dumps(ctx, default=str)
    + ". Return ONLY valid JSON: episode_script (string), contestants (array of {name, role, confessional}), challenges (array of {name, winner, description}), eliminated (string). No markdown."
  )

  fallback = {
    "episode_script": "Tonight on Survivor: Codebase Island, the modules face the Refactor Challenge.",
    "contestants": [{"name": "App.jsx", "role": "Entry", "confessional": "I carry this app."}],
    "challenges": [{"name": "Performance", "winner": "API", "description": "Fastest response wins."}],
    "eliminated": "Legacy util",
  }
  result = bedrock_client.safe_bedrock(prompt, fallback)
  return _response(200, result)


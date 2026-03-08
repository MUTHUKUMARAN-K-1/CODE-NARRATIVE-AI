"""Code Pokémon: Transform modules into collectible creatures with stats."""
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
    print(f"Pokemon handler error: {exc}")
    return _response(500, {"error": "Pokemon failed", "message": str(exc)})


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
  modules = []
  for f in critical[:8]:
    name = f.get("file")
    if name:
      modules.append({"name": name, "description": f.get("description") or f.get("reason") or ""})
  if not modules and file_tree:
    for n in file_tree[:10]:
      if n.get("type") == "blob" and n.get("path"):
        modules.append({"name": n.get("path"), "description": ""})

  if not modules:
    modules = [{"name": "main", "description": "Primary module"}]

  modules_json = json.dumps(modules, default=str)
  prompt = (
    "Transform these code modules into Pokémon. For each module return one Pokémon.\n\n"
    "Modules: " + modules_json + "\n\n"
    "Return ONLY valid JSON with a single key 'modules' (array). Each element:\n"
    '"name": original module path/name\n'
    '"pokemon_name": creative Pokémon-style name\n'
    '"type": e.g. Fire, Water, Electric (based on function)\n'
    '"stats": { "hp": number 1-100, "attack": 1-100, "defense": 1-100 }\n'
    '"abilities": array of 2-3 strings (special features)\n'
    '"evolution": string describing evolution/upgrade path\n'
    '"weakness": string (vulnerability)\n'
    "Be fun but technically accurate. Output only the JSON object, no markdown."
  )

  fallback = {
    "modules": [
      {
        "name": "src/App.jsx",
        "pokemon_name": "Appachu",
        "type": "Electric",
        "stats": {"hp": 80, "attack": 70, "defense": 60},
        "abilities": ["Hot Reload", "Route Guard"],
        "evolution": "Appachu -> Appeon (with state management)",
        "weakness": "Bundle size",
      },
    ],
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  return _response(200, result)


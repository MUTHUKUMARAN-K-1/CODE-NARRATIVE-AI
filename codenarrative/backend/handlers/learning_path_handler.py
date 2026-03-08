import json
import traceback
from decimal import Decimal
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
    "body": json.dumps(body, default=_json_serial),
  }


def _json_serial(obj: Any) -> Any:
  """Convert non-JSON-serializable types (e.g. Decimal) for response body."""
  if isinstance(obj, Decimal):
    return int(obj) if obj % 1 == 0 else float(obj)
  raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def _to_json_safe(obj: Any) -> Any:
  """Recursively convert DynamoDB/raw types to JSON-serializable (for prompt and path)."""
  if obj is None:
    return None
  if isinstance(obj, Decimal):
    return int(obj) if obj % 1 == 0 else float(obj)
  if isinstance(obj, (str, int, float, bool)):
    return obj
  if isinstance(obj, dict):
    return {str(k): _to_json_safe(v) for k, v in obj.items()}
  if isinstance(obj, list):
    return [_to_json_safe(v) for v in obj]
  return str(obj)


def lambda_handler(event, context):
  try:
    return _handle(event)
  except Exception as e:
    print(f"Learning path unhandled error: {e}\n{traceback.format_exc()}")
    return _response(500, {"error": "Internal server error", "message": str(e)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except (TypeError, json.JSONDecodeError) as e:
    print(f"Learning path invalid body: {e}")
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  experience = body.get("experience_level")
  background = body.get("background")
  user_id = body.get("user_id")
  duration_days = body.get("duration_days")
  if duration_days is not None and not isinstance(duration_days, int):
    try:
      duration_days = int(duration_days)
    except (TypeError, ValueError):
      duration_days = 14
  if duration_days is None or duration_days not in (14, 30):
    duration_days = 14
  if not all([repo_id, experience, background, user_id]):
    return _response(400, {"error": "repo_id, experience_level, background, user_id are required"})
  if background and len(str(background)) > 2000:
    return _response(400, {"error": "background too long", "message": "Max 2000 characters"})

  try:
    repo = dynamodb_client.get_repo(repo_id)
  except Exception as e:
    print(f"Learning path get_repo failed: {e}\n{traceback.format_exc()}")
    return _response(500, {"error": "Failed to load repository", "message": str(e)})

  if not repo:
    return _response(
      404,
      {
        "error": "Repository analysis not found",
        "hint": "Run Repo Analysis first (paste the GitHub URL and click Analyze), then generate the learning path.",
      },
    )

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  try:
    analysis_safe = _to_json_safe(analysis)
    if duration_days == 30:
      prompt = (
        "Given this codebase analysis: "
        f"{json.dumps(analysis_safe)}\n"
        f"Developer profile: {experience}, background: {background}\n"
        "Create a personalized 30-day onboarding plan with day-by-day schedule, exercises, mentorship checkpoints, and success metrics.\n"
        "Return a JSON object with two keys: path (the array below) and skill_tags (array of 5-10 skill/topic tags).\n"
        "path: ONLY a JSON array of exactly 30 objects, each with:\n"
        "- day: number (1 to 30)\n"
        "- title: string\n"
        "- goal: string\n"
        "- files_to_read: [list of specific files from the repo]\n"
        "- task: string (concrete coding task or exercise)\n"
        "- concepts: [list of concepts]\n"
        "- estimated_minutes: number\n"
        "- resources: [list of topic keywords]\n"
        "No markdown, no code fences, no extra keys."
      )
    else:
      prompt = (
        "Given this codebase analysis: "
        f"{json.dumps(analysis_safe)}\n"
        f"Developer profile: {experience}, background: {background}\n"
        "Create a 14-day structured onboarding learning path.\n"
        "Return a JSON object with two keys: path (the array below) and skill_tags (array of 5-10 skill/topic tags, e.g. React, API design, testing).\n"
        "path: ONLY a JSON array of exactly 14 objects, each with:\n"
        "- day: number (1 to 14)\n"
        "- title: string\n"
        "- goal: string\n"
        "- files_to_read: [list of specific files from the repo]\n"
        "- task: string\n"
        "- concepts: [list of concepts]\n"
        "- estimated_minutes: number\n"
        "- resources: [list of topic keywords]\n"
        "No markdown, no code fences, no extra keys in each day object."
      )
  except (TypeError, ValueError) as e:
    print(f"Learning path prompt build failed: {e}\n{traceback.format_exc()}")
    return _response(500, {"error": "Failed to build request", "message": str(e)})

  num_days = duration_days
  fallback_path: List[Dict[str, Any]] = []
  for i in range(1, num_days + 1):
    fallback_path.append(
      {
        "day": i,
        "title": f"Day {i} - Repository exploration",
        "goal": "Understand a new slice of the system.",
        "files_to_read": ["README.md"],
        "task": "Review the listed files and take notes.",
        "concepts": ["architecture"],
        "estimated_minutes": 45,
        "resources": ["documentation"],
      }
    )

  try:
    raw = bedrock_client.safe_bedrock(prompt, fallback={"path": fallback_path})
  except Exception as e:
    print(f"Learning path Bedrock failed: {e}\n{traceback.format_exc()}")
    raw = {"path": fallback_path}

  skill_tags = []
  if isinstance(raw, list):
    path = raw
  elif isinstance(raw, dict):
    path = raw.get("path") or raw.get("learning_path") or fallback_path
    skill_tags = _to_json_safe(raw.get("skill_tags") or [])
    if not isinstance(skill_tags, list):
      skill_tags = []
  else:
    path = fallback_path
  if not isinstance(path, list):
    path = fallback_path

  # Normalize to exactly num_days items, each a JSON-serializable dict
  keys = ("day", "title", "goal", "files_to_read", "task", "concepts", "estimated_minutes", "resources")
  normalized = []
  for i in range(num_days):
    d = path[i] if i < len(path) and isinstance(path[i], dict) else fallback_path[i]
    item = {k: _to_json_safe(d.get(k, fallback_path[i].get(k))) for k in keys}
    item["day"] = i + 1
    normalized.append(item)
  path = normalized

  try:
    dynamodb_client.save_learning_path(user_id, repo_id, path)
  except Exception as e:
    print(f"Learning path save_learning_path failed: {e}\n{traceback.format_exc()}")
    return _response(500, {"error": "Failed to save learning path", "message": str(e)})

  out = {"repo_id": repo_id, "user_id": user_id, "learning_path": path, "duration_days": num_days, "skill_tags": skill_tags}
  return _response(200, out)



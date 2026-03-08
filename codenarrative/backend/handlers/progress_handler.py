import json
from decimal import Decimal
from typing import Any, Dict

from utils import dynamodb_client


def _decimal_to_number(obj: Any) -> Any:
  """DynamoDB returns Decimal; convert so json.dumps works."""
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
      "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
      "Content-Type": "application/json",
    },
    "body": json.dumps(body, default=lambda x: int(x) if isinstance(x, Decimal) and x % 1 == 0 else float(x) if isinstance(x, Decimal) else str(x)),
  }


def get_progress(event, _context):
  try:
    return _get_progress_handle(event)
  except Exception as exc:
    print(f"Get progress error: {exc}")
    return _response(500, {"error": "Get progress failed", "message": str(exc)})


def _get_progress_handle(event):
  path = event.get("pathParameters") or {}
  user_id = path.get("uid")
  repo_id = path.get("rid")
  if not user_id or not repo_id:
    return _response(400, {"error": "uid and rid path parameters are required"})
  item = dynamodb_client.get_user_progress(user_id, repo_id)
  if not item:
    return _response(
      200,
      {
        "user_id": user_id,
        "repo_id": repo_id,
        "learning_path_progress": [],
        "quiz_scores": [],
        "files_visited": [],
        "concepts_mastered": [],
        "streak_days": 0,
        "last_active": None,
        "achievements": [],
        "derived": {"quiz_average": 0.0, "completed_days": 0, "time_to_mastery": 14},
      },
    )

  scores = item.get("quiz_scores") or []
  avg = sum(s.get("score", 0) for s in scores) / len(scores) if scores else 0.0
  completed_days = len(item.get("learning_path_progress") or [])
  remaining_days = max(14 - completed_days, 0)
  time_to_mastery = remaining_days * (1 + (1 - avg))

  item["derived"] = {
    "quiz_average": avg,
    "completed_days": completed_days,
    "time_to_mastery": round(time_to_mastery),
  }
  item.setdefault("achievements", [])
  return _response(200, _decimal_to_number(item))


def update_progress(event, _context):
  try:
    return _update_progress_handle(event)
  except Exception as exc:
    print(f"Update progress error: {exc}")
    return _response(500, {"error": "Update progress failed", "message": str(exc)})


def _update_progress_handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})
  required = {"user_id", "repo_id"}
  if not required.issubset(body.keys()):
    return _response(400, {"error": "user_id and repo_id are required"})
  dynamodb_client.update_user_progress(body)
  return _response(200, {"ok": True})


def record_quiz_score(event, _context):
  try:
    return _record_quiz_score_handle(event)
  except Exception as exc:
    print(f"Record quiz score error: {exc}")
    return _response(500, {"error": "Record quiz score failed", "message": str(exc)})


def _record_quiz_score_handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})
  user_id = body.get("user_id")
  repo_id = body.get("repo_id")
  score = body.get("score")
  day = body.get("day") or 0
  if user_id is None or repo_id is None or score is None:
    return _response(400, {"error": "user_id, repo_id, score are required"})
  dynamodb_client.append_quiz_score(user_id, repo_id, float(score), int(day))
  return _response(200, {"ok": True})


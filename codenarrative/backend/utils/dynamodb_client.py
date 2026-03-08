import json
import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

import boto3
from boto3.dynamodb.conditions import Key


_dynamodb = boto3.resource("dynamodb")


def _float_to_decimal(obj: Any) -> Any:
  """DynamoDB does not support float; convert to Decimal recursively."""
  if isinstance(obj, float):
    return Decimal(str(obj))
  if isinstance(obj, dict):
    return {k: _float_to_decimal(v) for k, v in obj.items()}
  if isinstance(obj, list):
    return [_float_to_decimal(v) for v in obj]
  return obj


def _decimal_to_serializable(obj: Any) -> Any:
  """Convert DynamoDB types (Decimal) to JSON-serializable so json.dumps works."""
  if isinstance(obj, Decimal):
    return int(obj) if obj % 1 == 0 else float(obj)
  if isinstance(obj, dict):
    return {k: _decimal_to_serializable(v) for k, v in obj.items()}
  if isinstance(obj, list):
    return [_decimal_to_serializable(v) for v in obj]
  return obj


def _table(name_env: str) -> Any:
  name = os.getenv(name_env)
  if not name:
    raise RuntimeError(f"{name_env} environment variable is not set")
  return _dynamodb.Table(name)


def now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def save_repo(repo_item: Dict[str, Any]) -> None:
  table = _table("REPOS_TABLE_NAME")
  repo_item.setdefault("created_at", now_iso())
  repo_item["updated_at"] = now_iso()
  item = json.loads(json.dumps(_decimal_to_serializable(repo_item)))
  table.put_item(Item=_float_to_decimal(item))


def get_repo(repo_id: str) -> Optional[Dict[str, Any]]:
  table = _table("REPOS_TABLE_NAME")
  resp = table.get_item(Key={"repo_id": repo_id})
  return resp.get("Item")


def save_learning_path(user_id: str, repo_id: str, path: Any) -> None:
  table = _table("USERS_TABLE_NAME")
  item = {
    "user_id": user_id,
    "repo_id": repo_id,
    "learning_path": path,
    "learning_path_progress": [],
    "quiz_scores": [],
    "files_visited": [],
    "concepts_mastered": [],
    "streak_days": 0,
    "last_active": now_iso(),
  }
  table.put_item(Item=_float_to_decimal(item))


def get_user_progress(user_id: str, repo_id: str) -> Optional[Dict[str, Any]]:
  table = _table("USERS_TABLE_NAME")
  resp = table.get_item(Key={"user_id": user_id, "repo_id": repo_id})
  return resp.get("Item")


def update_user_progress(payload: Dict[str, Any]) -> None:
  table = _table("USERS_TABLE_NAME")
  user_id = payload["user_id"]
  repo_id = payload["repo_id"]
  existing = get_user_progress(user_id, repo_id) or {
    "user_id": user_id,
    "repo_id": repo_id,
    "learning_path": [],
    "learning_path_progress": [],
    "quiz_scores": [],
    "files_visited": [],
    "concepts_mastered": [],
    "streak_days": 0,
  }
  day_completed = payload.get("day_completed")
  if day_completed and day_completed not in [d["day"] for d in existing["learning_path_progress"]]:
    existing["learning_path_progress"].append(
      {"day": day_completed, "completed_at": now_iso()}
    )
  existing["files_visited"] = list(
    {*(existing.get("files_visited") or []), *payload.get("files_visited_increment", [])}
  )
  existing["concepts_mastered"] = list(
    {
      *(existing.get("concepts_mastered") or []),
      *payload.get("concepts_mastered_increment", []),
    }
  )
  existing["streak_days"] = max(existing.get("streak_days", 0), len(existing["learning_path_progress"]))
  existing["last_active"] = now_iso()
  item = json.loads(json.dumps(_decimal_to_serializable(existing)))
  table.put_item(Item=_float_to_decimal(item))


def append_quiz_score(user_id: str, repo_id: str, score: float, day: int) -> None:
  table = _table("USERS_TABLE_NAME")
  item = get_user_progress(user_id, repo_id) or {
    "user_id": user_id,
    "repo_id": repo_id,
    "learning_path": [],
    "learning_path_progress": [],
    "quiz_scores": [],
    "files_visited": [],
    "concepts_mastered": [],
    "streak_days": 0,
  }
  item.setdefault("quiz_scores", []).append(
    {"day": day, "score": score, "created_at": now_iso()}
  )
  table.put_item(Item=_float_to_decimal(json.loads(json.dumps(_decimal_to_serializable(item)))))


def save_tests(repo_id: str, test_items: Any) -> None:
  table = _table("TESTS_TABLE_NAME")
  for t in test_items:
    t["repo_id"] = repo_id
    t.setdefault("created_at", now_iso())
    table.put_item(Item=_float_to_decimal(json.loads(json.dumps(t))))


def list_tests(repo_id: str) -> Any:
  table = _table("TESTS_TABLE_NAME")
  resp = table.query(KeyConditionExpression=Key("repo_id").eq(repo_id))
  return resp.get("Items", [])


def save_video_job(job_id: str, invocation_arn: str, repo_id: str, video_type: str, s3_prefix: str) -> None:
  table = _table("VIDEO_JOBS_TABLE_NAME")
  item = {
    "job_id": job_id,
    "invocation_arn": invocation_arn,
    "status": "PENDING",
    "repo_id": repo_id,
    "video_type": video_type,
    "s3_prefix": s3_prefix,
    "created_at": now_iso(),
    "updated_at": now_iso(),
  }
  table.put_item(Item=_float_to_decimal(json.loads(json.dumps(item))))


def get_video_job(job_id: str) -> Optional[Dict[str, Any]]:
  table = _table("VIDEO_JOBS_TABLE_NAME")
  resp = table.get_item(Key={"job_id": job_id})
  return resp.get("Item")


def update_video_job_status(
  job_id: str,
  status: str,
  s3_uri: Optional[str] = None,
  failure_message: Optional[str] = None,
) -> None:
  table = _table("VIDEO_JOBS_TABLE_NAME")
  now = now_iso()
  update_expr = "SET #status = :s, updated_at = :u"
  expr_names = {"#status": "status"}
  expr_values = {":s": status, ":u": now}
  if s3_uri is not None:
    update_expr += ", s3_uri = :uri"
    expr_values[":uri"] = s3_uri
  if failure_message is not None:
    update_expr += ", failure_message = :msg"
    expr_values[":msg"] = failure_message
  table.update_item(
    Key={"job_id": job_id},
    UpdateExpression=update_expr,
    ExpressionAttributeNames=expr_names,
    ExpressionAttributeValues=expr_values,
  )


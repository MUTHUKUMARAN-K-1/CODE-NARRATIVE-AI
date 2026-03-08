"""GET /api/repos/{repo_id} - return repo by id for polling after async analyze."""
import json
from decimal import Decimal
from typing import Any, Dict

from utils import dynamodb_client


def _decimal_to_number(obj: Any) -> Any:
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
      "Access-Control-Allow-Methods": "OPTIONS,GET",
      "Content-Type": "application/json",
    },
    "body": json.dumps(body),
  }


def lambda_handler(event, _context):
  try:
    return _handle(event)
  except Exception as exc:
    print(f"Get repo handler error: {exc}")
    return _response(500, {"error": "Get repo failed", "message": str(exc)})


def _handle(event):
  repo_id = (event.get("pathParameters") or {}).get("repo_id")
  if not repo_id:
    return _response(400, {"error": "repo_id is required"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository not found", "repo_id": repo_id})

  # Shape expected by frontend (same as analyze response body)
  status = repo.get("status", "completed")
  if status == "failed":
    return _response(200, {
      "repo_id": repo_id,
      "status": "failed",
      "error": repo.get("error"),
    })

  body = {
    "repo_id": repo["repo_id"],
    "status": status,
    "analysis": repo.get("analysis"),
    "file_tree": repo.get("file_tree", []),
    "language_breakdown": repo.get("language_stats", []),
    "summary": repo.get("summary"),
    "stats": repo.get("stats", {}),
    "mri_critical_files": repo.get("mri_critical_files", []),
    "architectural_dna_traits": repo.get("architectural_dna_traits", []),
    "hidden_coupling": repo.get("hidden_coupling", []),
    "performance_risks": repo.get("performance_risks", []),
  }
  return _response(200, _decimal_to_number(body))

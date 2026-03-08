"""GET /api/repos/{repo_id}/dashboard - repo health, risks, improvements from analysis."""
import json
from decimal import Decimal
from typing import Any, Dict, List

from utils import bedrock_client, dynamodb_client


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
    "body": json.dumps(body, default=str),
  }


def _default_dashboard() -> Dict[str, Any]:
  return {
    "health_score": 50,
    "risk_assessment": {"overall": "unknown", "items": []},
    "improvement_priority_list": [],
    "technical_debt_summary": "",
    "security_posture": "",
    "performance_notes": "",
    "maintenance_predictions": "",
  }


def _normalize_dashboard(raw: Dict[str, Any]) -> Dict[str, Any]:
  default = _default_dashboard()
  out = {**default, **raw}
  if not isinstance(out.get("risk_assessment"), dict):
    out["risk_assessment"] = default["risk_assessment"]
  else:
    out["risk_assessment"] = {
      "overall": out["risk_assessment"].get("overall", "unknown"),
      "items": out["risk_assessment"].get("items") or [],
    }
  if not isinstance(out.get("improvement_priority_list"), list):
    out["improvement_priority_list"] = []
  return out


def lambda_handler(event, _context):
  try:
    return _handle(event)
  except Exception as exc:
    print(f"Dashboard handler error: {exc}")
    return _response(500, {"error": "Dashboard failed", "message": str(exc)})


def _handle(event):
  repo_id = (event.get("pathParameters") or {}).get("repo_id")
  if not repo_id:
    return _response(400, {"error": "repo_id is required"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository not found", "repo_id": repo_id})

  status = repo.get("status", "completed")
  if status == "failed":
    return _response(200, {"repo_id": repo_id, "status": "failed", "dashboard": _default_dashboard()})

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  summary = repo.get("summary") or (analysis.get("summary") or "")

  prompt = (
    "You are a senior engineer evaluating a repository. Based on the following analysis and summary, "
    "produce a repo health dashboard.\n\n"
    "Analysis (JSON):\n"
    f"{json.dumps(analysis, default=str)}\n\n"
    f"Summary: {summary}\n\n"
    "Return a single JSON object with exactly these keys (no markdown, no code fences):\n"
    "- health_score: number 0-100 (overall repo health)\n"
    "- risk_assessment: object with 'overall' (string: low/medium/high/unknown) and 'items' (array of { risk: string, severity: string, mitigation: string })\n"
    "- improvement_priority_list: array of { priority: number, title: string, description: string }\n"
    "- technical_debt_summary: string\n"
    "- security_posture: string\n"
    "- performance_notes: string\n"
    "- maintenance_predictions: string\n"
  )

  try:
    result = bedrock_client.safe_bedrock(prompt, _default_dashboard())
    dashboard = _normalize_dashboard(result)
  except Exception as e:
    print(f"Dashboard Bedrock failed: {e}")
    dashboard = _default_dashboard()

  body = {
    "repo_id": repo_id,
    "dashboard": _decimal_to_number(dashboard),
  }
  return _response(200, body)


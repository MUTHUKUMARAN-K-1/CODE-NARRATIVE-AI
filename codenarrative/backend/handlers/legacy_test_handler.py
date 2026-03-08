import json
import uuid
from decimal import Decimal
from typing import Any, Dict, List

from utils import bedrock_client, dynamodb_client, github_client


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
      "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
      "Content-Type": "application/json",
    },
    "body": json.dumps(body),
  }


def generate_tests(event, _context):
  try:
    return _generate_tests_handle(event)
  except Exception as exc:
    print(f"Generate tests error: {exc}")
    return _response(500, {"error": "Generate tests failed", "message": str(exc)})


def _generate_tests_handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  file_path = body.get("file_path")
  function_names = body.get("function_names") or []
  if not repo_id or not file_path or not function_names:
    return _response(400, {"error": "repo_id, file_path, function_names are required"})
  if len(str(file_path)) > 500:
    return _response(400, {"error": "file_path too long", "message": "Max 500 characters"})
  if len(function_names) > 20:
    return _response(400, {"error": "too many functions", "message": "Max 20 functions per request"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  # For simplicity, we fetch directly from GitHub using the saved github_url.
  github_url = repo.get("github_url")
  if not github_url:
    return _response(400, {"error": "Repository github_url is missing from metadata"})
  owner, name = github_client.parse_github_url(github_url)
  file_code = github_client.fetch_file_content(owner, name, file_path)

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  repo_summary = repo.get("summary") or analysis.get("summary") or ""
  tests: List[Dict[str, Any]] = []
  for fn in function_names:
    prompt = (
      "Generate comprehensive tests for this function in the context of the repository.\n\n"
      f"File code:\n{file_code}\n\n"
      f"Target function: {fn}\n"
      f"Repository context/summary: {json.dumps(repo_summary, default=str)}\n"
      f"Repo analysis (for context): {json.dumps(analysis, default=str)[:2000]}\n\n"
      "Provide:\n"
      "1. Unit tests for the selected function(s).\n"
      "2. Suggested integration tests for related API/modules this function interacts with.\n"
      "3. Edge-case and error-handling tests (invalid inputs, exceptions, boundaries).\n"
      "4. Optional: security test ideas (e.g. injection, auth) and performance test ideas if relevant.\n\n"
      "Return a single JSON object with these keys:\n"
      "- test_code: string, complete test file content (unit + edge/error tests as the main body)\n"
      "- documentation: object with purpose, inputs (array of {param, type, description}), "
      "outputs ({type, description}), business_logic, edge_cases (array), dependencies (array)\n"
      "- integration_tests: (optional) string or array of strings describing suggested integration tests for related APIs/modules\n"
      "- edge_cases: (optional) array of strings for edge/error cases covered or to cover\n"
      "- security_test_ideas: (optional) array of strings\n"
      "- performance_test_ideas: (optional) array of strings\n"
    )
    fallback = {
      "test_code": f"# Auto-generated tests for {fn}\n",
      "documentation": {
        "purpose": f"Exercise the behavior of {fn}.",
        "inputs": [],
        "outputs": {"type": "Any", "description": "Return value of the function."},
        "business_logic": "See source for details.",
        "edge_cases": [],
        "dependencies": [],
      },
    }
    result = bedrock_client.safe_bedrock(prompt, fallback)
    doc = result.get("documentation") or fallback["documentation"]
    if isinstance(doc, dict) and "edge_cases" not in doc and isinstance(result.get("edge_cases"), list):
      doc = {**doc, "edge_cases": result["edge_cases"]}
    item: Dict[str, Any] = {
      "test_id": str(uuid.uuid4()),
      "file_path": file_path,
      "function_name": fn,
      "language": "python" if file_path.endswith(".py") else "javascript",
      "test_code": result.get("test_code") or fallback["test_code"],
      "documentation": doc,
    }
    if result.get("integration_tests") is not None:
      item["integration_tests"] = result["integration_tests"]
    if result.get("edge_cases") is not None:
      item["edge_cases"] = result["edge_cases"]
    if result.get("security_test_ideas") is not None:
      item["security_test_ideas"] = result["security_test_ideas"]
    if result.get("performance_test_ideas") is not None:
      item["performance_test_ideas"] = result["performance_test_ideas"]
    tests.append(item)

  dynamodb_client.save_tests(repo_id, tests)

  return _response(
    200,
    {
      "repo_id": repo_id,
      "file_path": file_path,
      "tests": tests,
    },
  )


def list_tests(event, _context):
  try:
    return _list_tests_handle(event)
  except Exception as exc:
    print(f"List tests error: {exc}")
    return _response(500, {"error": "List tests failed", "message": str(exc)})


def _list_tests_handle(event):
  path = event.get("pathParameters") or {}
  repo_id = path.get("repo_id")
  if not repo_id:
    return _response(400, {"error": "repo_id path parameter is required"})
  items = dynamodb_client.list_tests(repo_id)
  return _response(200, {"repo_id": repo_id, "tests": _decimal_to_number(items)})



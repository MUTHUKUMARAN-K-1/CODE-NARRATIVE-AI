"""POST /api/compare-repos - Compare this repo with another (simplify)."""
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
    print(f"Compare repos handler error: {exc}")
    return _response(500, {"error": "Compare repos failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  other_github_url = (body.get("other_github_url") or "").strip()
  if not other_github_url.startswith("https://github.com/"):
    return _response(400, {"error": "other_github_url must be a GitHub URL"})

  if not repo_id:
    return _response(400, {"error": "repo_id is required"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  current_analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  current_summary = repo.get("summary") or ""
  current_tree = [n.get("path") for n in (repo.get("file_tree") or []) if n.get("path")][:80]

  other_tree = []
  other_summary = ""
  try:
    owner, name = github_client.parse_github_url(other_github_url)
    tree = github_client.fetch_file_tree(owner, name, "main")
    other_tree = [n.get("path") for n in (tree or []) if n.get("path")][:80]
    try:
      other_summary = github_client.fetch_file_content(owner, name, "README.md")[:2000]
    except Exception:
      pass
  except Exception as e:
    print(f"Fetch other repo failed: {e}")
    other_summary = "Could not fetch other repo details."

  prompt = (
    "Compare these two repositories. First is the 'current' repo (already analyzed); second is 'other'.\n"
    f"Current repo summary: {current_summary}\n"
    f"Current file tree sample: {json.dumps(current_tree)}\n"
    f"Current analysis (stack/structure): {json.dumps(current_analysis)[:2000]}\n\n"
    f"Other repo (GitHub URL): {other_github_url}\n"
    f"Other repo file tree sample: {json.dumps(other_tree)}\n"
    f"Other repo README excerpt: {other_summary}\n\n"
    "Return JSON with:\n"
    "- similarity: 2-3 sentences on how they are alike\n"
    "- differences: array of 3-5 short bullet strings\n"
    "- recommendation: one sentence on when to use which or what to learn from the other"
  )

  fallback = {
    "similarity": "Both are codebases with similar scale and structure.",
    "differences": ["Different tech stacks", "Different entry points", "Different organization"],
    "recommendation": "Use the comparison to identify patterns and alternatives.",
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)

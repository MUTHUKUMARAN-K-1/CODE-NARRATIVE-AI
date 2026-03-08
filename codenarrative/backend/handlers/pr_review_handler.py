"""POST /api/pr-review — AI-powered GitHub PR diff review using DeepSeek R1."""
import json
import re
from typing import Any, Dict, List
from urllib import error, request as urllib_request

from utils import bedrock_client, dynamodb_client

# Re-use the same token helper already in github_client
import os
_GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")


def _gh(path: str) -> Any:
  headers = {"Accept": "application/vnd.github+json"}
  if _GITHUB_TOKEN:
    headers["Authorization"] = f"token {_GITHUB_TOKEN}"
  req = urllib_request.Request(f"https://api.github.com{path}", headers=headers)
  with urllib_request.urlopen(req, timeout=15) as resp:
    return json.loads(resp.read().decode("utf-8"))


def _parse_pr_url(url: str):
  """Extract owner, repo, pr_number from a GitHub PR URL."""
  m = re.match(
    r"https?://github\.com/([^/]+)/([^/]+)/pull/(\d+)", url.strip()
  )
  if not m:
    raise ValueError("Invalid GitHub PR URL. Expected: https://github.com/owner/repo/pull/123")
  return m.group(1), m.group(2), int(m.group(3))


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
    print(f"PR review handler error: {exc}")
    return _response(500, {"error": "PR review failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  pr_url = body.get("pr_url", "").strip()
  repo_id = body.get("repo_id")  # optional — enriches review context

  if not pr_url:
    return _response(400, {"error": "pr_url is required"})

  # Parse URL
  try:
    owner, repo, pr_number = _parse_pr_url(pr_url)
  except ValueError as e:
    return _response(400, {"error": str(e)})

  # Fetch PR metadata
  try:
    pr_meta = _gh(f"/repos/{owner}/{repo}/pulls/{pr_number}")
    pr_files = _gh(f"/repos/{owner}/{repo}/pulls/{pr_number}/files")
  except error.HTTPError as e:
    return _response(400, {"error": f"GitHub API error {e.code}: {e.reason}. Check that the PR URL is public."})

  # Build file diff summary (cap each patch to prevent token overflow)
  files_summary: List[Dict[str, Any]] = []
  for f in pr_files[:12]:  # max 12 files
    patch = (f.get("patch") or "")[:600]  # cap patch size
    files_summary.append({
      "filename": f.get("filename"),
      "status": f.get("status"),  # added/modified/removed
      "additions": f.get("additions", 0),
      "deletions": f.get("deletions", 0),
      "patch": patch,
    })

  # Optionally load repo context from DynamoDB
  repo_context = {}
  if repo_id:
    try:
      repo_data = dynamodb_client.get_repo(repo_id)
      if repo_data:
        analysis = dynamodb_client._decimal_to_serializable(repo_data.get("analysis") or {})
        repo_context = {
          "tech_stack": (analysis.get("tech_stack") or [])[:5],
          "architecture_type": analysis.get("architecture_type"),
          "complexity_score": analysis.get("complexity_score"),
        }
    except Exception:
      pass  # Context is optional, don't fail

  total_additions = sum(f.get("additions", 0) for f in pr_files)
  total_deletions = sum(f.get("deletions", 0) for f in pr_files)

  prompt = (
    "You are a senior code reviewer. Review this GitHub PR and return ONLY valid JSON (no markdown).\n\n"
    f"PR Title: {pr_meta.get('title', 'Untitled')}\n"
    f"PR Body: {str(pr_meta.get('body') or '')[:400]}\n"
    f"Author: {pr_meta.get('user', {}).get('login', 'unknown')}\n"
    f"Changed files: {len(pr_files)} (+{total_additions}/-{total_deletions} lines)\n"
    f"Repo context: {json.dumps(repo_context) if repo_context else 'Not available'}\n\n"
    f"File diffs:\n{json.dumps(files_summary)}\n\n"
    "Return JSON with these EXACT keys:\n"
    '"overall_score": number 0-100 (code quality)\n'
    '"risk_level": "low"|"medium"|"high"|"critical"\n'
    '"summary": string (2-3 sentences, what this PR does and overall assessment)\n'
    '"approval_recommendation": "Approve"|"Request Changes"|"Block"\n'
    '"files": array of { "filename": string, "assessment": string, "issues": [{"line_hint": string, "severity": "critical"|"warning"|"suggestion", "message": string}] }\n'
    '"security_flags": array of strings (empty if none)\n'
    '"suggested_tests": array of strings (3-5 test suggestions)\n'
    '"positive_highlights": array of strings (what was done well)\n'
    "Keep each string under 150 chars. Output only the JSON object."
  )

  fallback = {
    "overall_score": 72,
    "risk_level": "medium",
    "summary": f"This PR modifies {len(pr_files)} files with {total_additions} additions and {total_deletions} deletions. Manual review recommended.",
    "approval_recommendation": "Request Changes",
    "files": [
      {
        "filename": f.get("filename", "unknown"),
        "assessment": "Review required",
        "issues": [],
      }
      for f in files_summary[:3]
    ],
    "security_flags": [],
    "suggested_tests": [
      "Test happy path for changes made",
      "Test edge cases and error handling",
      "Run existing test suite",
    ],
    "positive_highlights": ["PR submitted for review"],
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)

  # Attach metadata
  result["pr_meta"] = {
    "title": pr_meta.get("title"),
    "author": pr_meta.get("user", {}).get("login"),
    "url": pr_url,
    "total_files": len(pr_files),
    "additions": total_additions,
    "deletions": total_deletions,
    "base_branch": pr_meta.get("base", {}).get("ref"),
    "head_branch": pr_meta.get("head", {}).get("ref"),
  }

  return _response(200, result)

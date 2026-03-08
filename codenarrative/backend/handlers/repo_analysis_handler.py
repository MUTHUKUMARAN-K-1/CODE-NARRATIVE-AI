import json
import os
import uuid
from typing import Any, Dict, List

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


def _language_breakdown(tree: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  totals: Dict[str, int] = {}
  for node in tree:
    if node.get("type") != "blob":
      continue
    path = node.get("path", "")
    if "." not in path:
      continue
    ext = path.rsplit(".", 1)[-1].lower()
    totals[ext] = totals.get(ext, 0) + (node.get("size") or 0)
  total_size = sum(totals.values()) or 1
  return [
    {"language": ext, "percentage": round(size * 100 / total_size, 1)}
    for ext, size in totals.items()
  ]


def lambda_handler(event, _context):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  github_url = body.get("github_url")
  if not github_url:
    return _response(400, {"error": "github_url is required"})

  try:
    owner, repo = github_client.parse_github_url(github_url)
  except ValueError as exc:
    return _response(400, {"error": str(exc)})

  use_mocks = os.getenv("USE_BACKEND_MOCKS", "false").lower() == "true"

  if use_mocks:
    # Minimal deterministic mock compatible with frontend expectations.
    repo_id = str(uuid.uuid4())
    mock = {
      "repo_id": repo_id,
      "analysis": {
        "tech_stack": ["React", "Node.js"],
        "architecture_type": "monolith",
        "critical_files": [
          {
            "file": "src/App.jsx",
            "reason": "Main entrypoint",
            "description": "Bootstraps React app and routing.",
          }
        ],
        "entry_points": ["src/main.jsx"],
        "dependencies": ["react", "react-router-dom"],
        "complexity_score": 5,
        "summary": "Mock analysis used when backend mocks are enabled.",
      },
      "file_tree": [
        {"path": "src", "type": "dir"},
        {"path": "src/App.jsx", "type": "file", "size": 1500},
        {"path": "src/main.jsx", "type": "file", "size": 800},
      ],
      "language_breakdown": [
        {"language": "jsx", "percentage": 80.0},
        {"language": "json", "percentage": 20.0},
      ],
      "summary": "Mock repository for demo.",
      "stats": {"total_files": 3, "total_lines": 200, "dependencies_count": 5},
    }
    mock_item = {**mock, "owner": owner, "repo_name": repo, "github_url": github_url}
    dynamodb_client.save_repo(mock_item)
    return _response(200, mock)

  # Live path: fetch from GitHub and analyze via Bedrock.
  metadata = github_client.fetch_repo_metadata(owner, repo)
  default_branch = metadata.get("default_branch") or "main"
  tree = github_client.fetch_file_tree(owner, repo, default_branch)
  important = github_client.pick_important_files(tree, limit=20)

  summary_parts = []
  for f in important:
    path = f.get("path")
    try:
      content = github_client.fetch_file_content(owner, repo, path)
    except RuntimeError:
      content = ""
    snippet = content[:2000]
    summary_parts.append(
      {
        "path": path,
        "size": f.get("size"),
        "snippet": snippet,
      }
    )

  code_summary = json.dumps(
    {
      "owner": owner,
      "repo": repo,
      "default_branch": default_branch,
      "files": summary_parts,
    }
  )

  prompt = (
    "Analyze this codebase structure and file contents: "
    f"{code_summary}\n"
    "Return JSON with:\n"
    "- tech_stack: list of detected technologies\n"
    "- architecture_type: (MVC/microservices/monolith/etc)\n"
    "- critical_files: [{file, reason, description}] top 10 files\n"
    "- entry_points: list of main entry point files\n"
    "- dependencies: list of key dependencies\n"
    "- complexity_score: 1-10\n"
    "- summary: 3-sentence overview of what this codebase does"
  )

  fallback_ai = {
    "tech_stack": [],
    "architecture_type": "unknown",
    "critical_files": [],
    "entry_points": [],
    "dependencies": [],
    "complexity_score": 5,
    "summary": "Automatic analysis is unavailable; showing structural metadata only.",
  }
  analysis = bedrock_client.safe_bedrock(prompt, fallback_ai)

  repo_id = str(uuid.uuid4())
  lang_stats = _language_breakdown(tree)
  stats = {
    "total_files": len([n for n in tree if n.get("type") == "blob"]),
    "total_lines": metadata.get("size", 0) * 10,
    "dependencies_count": len(analysis.get("dependencies") or []),
  }

  item = {
    "repo_id": repo_id,
    "owner": owner,
    "repo_name": repo,
    "github_url": github_url,
    "analysis": analysis,
    "file_tree": [
      {"path": n.get("path"), "type": n.get("type"), "size": n.get("size")}
      for n in tree
    ],
    "language_stats": lang_stats,
    "summary": analysis.get("summary"),
    "stats": stats,
  }
  dynamodb_client.save_repo(item)

  body = {
    "repo_id": repo_id,
    "analysis": analysis,
    "file_tree": item["file_tree"],
    "language_breakdown": lang_stats,
    "summary": item["summary"],
    "stats": stats,
  }
  return _response(200, body)


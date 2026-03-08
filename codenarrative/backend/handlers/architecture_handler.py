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
    print(f"Architecture handler error: {exc}")
    return _response(500, {"error": "Architecture failed", "message": str(exc)})


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

  prompt = (
    "Analyze this repository structure: "
    f"{json.dumps({'analysis': analysis, 'file_tree': file_tree})}\n\n"
    "Return JSON with:\n"
    "- system_diagram_mermaid: valid Mermaid flowchart syntax\n"
    "- data_flow_mermaid: valid Mermaid sequenceDiagram syntax\n"
    "- dependency_mermaid: valid Mermaid graph syntax for top 15 file dependencies\n"
    "- components: [{name, type, description, files}]\n"
    "- key_patterns: [list of architectural patterns detected]"
  )

  fallback = {
    "system_diagram_mermaid": "flowchart TD\n  UI[React UI] --> API[API Gateway]\n  API --> Lambdas[Lambdas]\n  Lambdas --> DB[DynamoDB]\n  Lambdas --> S3[S3 Buckets]\n  Lambdas --> Bedrock[Bedrock Claude]",
    "data_flow_mermaid": "sequenceDiagram\n  participant Dev as Developer\n  participant UI as CodeNarrative UI\n  participant API as API Gateway\n  participant L as Repo Analysis Lambda\n  participant GH as GitHub\n\n  Dev->>UI: Paste repo URL\n  UI->>API: POST /api/analyze\n  API->>L: Invoke\n  L->>GH: Fetch repo tree\n  L-->>API: Analysis\n  API-->>UI: Summary + repo_id",
    "dependency_mermaid": "graph LR\n  App[src/App.jsx] --> Dashboard[src/components/Dashboard.jsx]\n  App --> Repo[src/components/RepoAnalysis.jsx]\n  App --> LP[src/components/LearningPath.jsx]\n  Repo --> Api[src/api/client.js]\n  LP --> Api",
    "components": [
      {
        "name": "Frontend",
        "type": "React SPA",
        "description": "Developer-facing onboarding UI.",
        "files": ["frontend/src/App.jsx"],
      }
    ],
    "key_patterns": ["Serverless", "CQRS-style read APIs"],
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)


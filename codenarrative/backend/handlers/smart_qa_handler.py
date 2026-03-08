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
    print(f"Smart QA handler error: {exc}")
    return _response(500, {"error": "QA failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  question = body.get("question")
  if not repo_id or not question:
    return _response(400, {"error": "repo_id and question are required"})
  if len(question) > 2000:
    return _response(400, {"error": "question too long", "message": "Max 2000 characters"})

  repo = dynamodb_client.get_repo(repo_id)
  if not repo:
    return _response(404, {"error": "Repository analysis not found"})

  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  file_tree = dynamodb_client._decimal_to_serializable(repo.get("file_tree") or [])

  # Simple keyword-based context selection from file paths.
  keywords = [k.lower() for k in question.split() if len(k) > 3]
  relevant: List[Dict[str, Any]] = []
  for node in file_tree:
    path = (node.get("path") or "").lower()
    if any(k in path for k in keywords):
      relevant.append({"file_path": node.get("path"), "snippet": "", "relevant_lines": ""})
    if len(relevant) >= 10:
      break

  prompt = (
    "You are an expert code guide for this repository.\n"
    f"Repository context: {json.dumps(analysis)}\n"
    f"Relevant code snippets: {json.dumps(relevant)}\n\n"
    f"Answer this question: {question}\n\n"
    "Return JSON with:\n"
    "- answer: detailed explanation (markdown formatted)\n"
    "- referenced_files: [{file_path, relevant_lines, snippet}]\n"
    "- follow_up_questions: [3 suggested follow-up questions]\n"
    "- quiz: {question, options:[A,B,C,D], correct_answer, explanation}"
  )

  fallback = {
    "answer": f"Unable to consult live code right now, but here is how you might approach: {question}",
    "referenced_files": relevant,
    "follow_up_questions": [
      "Which modules are most critical to this flow?",
      "How is error handling implemented around this logic?",
      "Where are the data models defined?",
    ],
    "quiz": {
      "question": "What is the first step when exploring an unfamiliar codebase?",
      "options": [
        "Start changing production code immediately",
        "Skim the README and architecture overview",
        "Ignore tests and logs",
        "Delete unused files aggressively",
      ],
      "correct_answer": "B",
      "explanation": "Beginning with documentation and high-level architecture gives you a safe mental model before editing code.",
    },
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  out = dynamodb_client._decimal_to_serializable(result) if isinstance(result, dict) else result
  return _response(200, out)


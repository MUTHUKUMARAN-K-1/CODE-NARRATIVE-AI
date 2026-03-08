import json
from typing import Any, Dict

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
    print(f"Explanation handler error: {exc}")
    return _response(500, {"error": "Explanation failed", "message": str(exc)})


def _handle(event):
  try:
    body = json.loads(event.get("body") or "{}")
  except json.JSONDecodeError:
    return _response(400, {"error": "Invalid JSON body"})

  repo_id = body.get("repo_id")
  file_path = body.get("file_path")
  code_snippet = body.get("code_snippet")
  if not all([repo_id, file_path, code_snippet]):
    return _response(400, {"error": "repo_id, file_path, code_snippet are required"})
  if len(str(file_path)) > 500:
    return _response(400, {"error": "file_path too long", "message": "Max 500 characters"})
  if len(code_snippet) > 50000:
    return _response(400, {"error": "code_snippet too long", "message": "Max 50000 characters"})

  persona = (body.get("persona") or "").strip().lower() or None
  personas = {
    "designer": "Explain for a designer: focus on UX, layout, and user flow implications. Avoid deep code jargon.",
    "pm": "Explain for a product manager: focus on what the code does for the user and product, not implementation details.",
    "new grad": "Explain for a new grad: assume minimal experience, use analogies, define terms.",
    "staff": "Explain for a staff engineer: focus on trade-offs, scale, and design decisions; assume strong background.",
  }
  persona_instruction = personas.get(persona) if persona else ""

  repo = dynamodb_client.get_repo(repo_id)
  repo_summary = (repo or {}).get("summary") or ""

  prompt = (
    "Explain this code at 3 levels"
    + (f". Audience: {persona_instruction}" if persona_instruction else "")
    + ".\n"
    f"Code: {code_snippet}\n"
    f"Repository context: {repo_summary}\n\n"
    "Return JSON with:\n"
    "- beginner: {explanation, analogy, key_takeaway}\n"
    "- intermediate: {explanation, patterns_used, system_role, key_takeaway}\n"
    "- expert: {explanation, design_decisions, tradeoffs, potential_issues, optimization_tips}"
  )

  fallback = {
    "beginner": {
      "explanation": "This function performs a focused task using its inputs and returns a result.",
      "analogy": "Think of it as a small machine: you put something in, it works on it, and you get something back.",
      "key_takeaway": "You can call this function whenever you need this behavior without repeating yourself.",
    },
    "intermediate": {
      "explanation": "The code is structured as a pure function, which improves testability and reuse.",
      "patterns_used": ["pure function"],
      "system_role": "It is invoked by higher-level components when this calculation is required.",
      "key_takeaway": "The function encapsulates a small piece of domain logic.",
    },
    "expert": {
      "explanation": "The implementation makes straightforward trade-offs between clarity and performance.",
      "design_decisions": "Logic is kept local to keep coupling low and cohesion high.",
      "tradeoffs": "Indirection introduces call overhead but clarifies intent.",
      "potential_issues": "Edge cases may need additional validation if inputs can be invalid.",
      "optimization_tips": "If profiling shows this is hot, consider inlining or caching results.",
    },
  }

  result = bedrock_client.safe_bedrock(prompt, fallback)
  return _response(200, result)


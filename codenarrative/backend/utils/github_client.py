import base64
import json
import os
import re
from typing import Any, Dict, List, Set, Tuple
from urllib.parse import quote

from urllib import request, error


GITHUB_API_BASE = os.getenv("GITHUB_API_BASE", "https://api.github.com")
_GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")


def parse_github_url(url: str) -> Tuple[str, str]:
  if "github.com/" not in url:
    raise ValueError("Not a valid GitHub URL")
  path = url.split("github.com/")[1].strip("/")
  owner, repo = path.split("/", 1)
  return owner, repo


def _github_get(path: str) -> Any:
  headers = {"Accept": "application/vnd.github+json"}
  if _GITHUB_TOKEN:
    headers["Authorization"] = f"token {_GITHUB_TOKEN}"
  req = request.Request(f"{GITHUB_API_BASE}{path}", headers=headers)
  try:
    with request.urlopen(req, timeout=10) as resp:
      return json.loads(resp.read().decode("utf-8"))
  except error.HTTPError as exc:
    raise RuntimeError(f"GitHub API error {exc.code}: {exc.reason}") from exc


def fetch_repo_metadata(owner: str, repo: str) -> Dict[str, Any]:
  return _github_get(f"/repos/{owner}/{repo}")


def fetch_file_tree(owner: str, repo: str, branch: str) -> List[Dict[str, Any]]:
  tree = _github_get(f"/repos/{owner}/{repo}/git/trees/{branch}?recursive=1")
  return tree.get("tree", [])


def fetch_file_content(owner: str, repo: str, path: str) -> str:
  obj = _github_get(f"/repos/{owner}/{repo}/contents/{path}")
  content = obj.get("content", "")
  if obj.get("encoding") == "base64":
    return base64.b64decode(content).decode("utf-8", errors="ignore")
  return content


IMPORTANT_FILE_NAMES = {
  "readme.md",
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "setup.py",
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "cargo.toml",
  "go.mod",
  "go.sum",
  "makefile",
  "gemfile",
  "build.gradle",
  "pom.xml",
  ".env.example",
  "tsconfig.json",
}
CONFIG_NAME_PREFIXES = ("vite.config", "webpack.config", "jest.config", "babel.config")

IMPORTANT_PATH_PATTERNS = (
  ".github/workflows",
  "tests/",
  "test/",
  "src/",
  "lib/",
  "docs/",
  "app/",
  ".config",
  "config/",
  "settings/",
)


def is_important_file(path: str) -> bool:
  """True if the path matches known important file names or directory patterns for analysis."""
  if not path or path.strip() == "":
    return False
  path_lower = path.lower().replace("\\", "/")
  name = path_lower.split("/")[-1]
  if name in IMPORTANT_FILE_NAMES:
    return True
  if any(name.startswith(p) for p in CONFIG_NAME_PREFIXES):
    return True
  if any(name.startswith(p) for p in ("main.", "index.", "app.")):
    return True
  if "config" in path_lower or "settings" in path_lower:
    return True
  return any(p in path_lower for p in IMPORTANT_PATH_PATTERNS)


def pick_important_files(tree: List[Dict[str, Any]], limit: int = 28) -> List[Dict[str, Any]]:
  files = [t for t in tree if t.get("type") == "blob"]
  scored: List[Tuple[int, Dict[str, Any]]] = []
  for f in files:
    path = f.get("path", "")
    name = path.split("/")[-1].lower()
    score = 0
    if name in IMPORTANT_FILE_NAMES:
      score += 100
    if any(name.startswith(p) for p in CONFIG_NAME_PREFIXES):
      score += 80
    if is_important_file(path):
      score += 50
    if "main" in name or "index" in name or "app" in name:
      score += 40
    if "config" in path or "settings" in path:
      score += 25
    for pat in IMPORTANT_PATH_PATTERNS:
      if pat.rstrip("/") in path or path.startswith(pat):
        score += 30
        break
    size = f.get("size") or 0
    score += min(size // 500, 20)
    scored.append((score, f))
  scored.sort(key=lambda x: x[0], reverse=True)
  return [f for _, f in scored[:limit]]


IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".webp")
IMAGE_PATH_PREFIXES = ("docs/", "diagrams/", "doc/", "assets/", "images/", ".github/")


def list_image_paths(tree: List[Dict[str, Any]], max_count: int = 5) -> List[Dict[str, Any]]:
  """Return up to max_count image file entries from tree (docs, diagrams, root). Prefer docs/diagrams."""
  blobs = [t for t in tree if t.get("type") == "blob"]
  candidates = []
  for b in blobs:
    path = (b.get("path") or "").replace("\\", "/")
    lower = path.lower()
    if not any(lower.endswith(ext) for ext in IMAGE_EXTENSIONS):
      continue
    size = b.get("size") or 0
    if size > 800 * 1024:
      continue
    prio = 0
    for pref in IMAGE_PATH_PREFIXES:
      if path.startswith(pref) or path.split("/")[0] + "/" == pref:
        prio += 10
        break
    if "diagram" in lower or "arch" in lower or "flow" in lower:
      prio += 5
    candidates.append((prio, size, b))
  candidates.sort(key=lambda x: (-x[0], x[1]))
  return [c[2] for c in candidates[:max_count]]


def fetch_file_content_raw(owner: str, repo: str, path: str) -> bytes:
  """Fetch file content as raw bytes (for images)."""
  encoded_path = quote(path, safe="/")
  obj = _github_get(f"/repos/{owner}/{repo}/contents/{encoded_path}")
  content = obj.get("content", "")
  if obj.get("encoding") == "base64":
    return base64.b64decode(content)
  return content.encode("utf-8", errors="replace")


def _extract_imports_python(snippet: str) -> List[str]:
  """Extract import targets from Python snippet (module or path-like)."""
  out: List[str] = []
  # import foo, bar
  for m in re.finditer(r"\bimport\s+([a-zA-Z0-9_.]+)", snippet):
    out.append(m.group(1).split(".")[0])
  # from foo import ... / from foo.bar import ...
  for m in re.finditer(r"\bfrom\s+([a-zA-Z0-9_.]+)\s+import", snippet):
    out.append(m.group(1).replace(".", "/"))
  return out


def _extract_imports_js(snippet: str) -> List[str]:
  """Extract require/import paths from JS/TS snippet."""
  out: List[str] = []
  # require('path') or require("path")
  for m in re.finditer(r"require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)", snippet):
    out.append(m.group(1))
  # import x from 'path' / import 'path'
  for m in re.finditer(r"import\s+.*\s+from\s+['\"]([^'\"]+)['\"]", snippet):
    out.append(m.group(1))
  for m in re.finditer(r"import\s+['\"]([^'\"]+)['\"]", snippet):
    out.append(m.group(1))
  return out


def extract_imports_from_snippet(file_path: str, snippet: str) -> List[str]:
  """Return list of imported module/path strings (may be relative or package names)."""
  if not snippet:
    return []
  path_lower = file_path.lower()
  if path_lower.endswith(".py"):
    return _extract_imports_python(snippet)
  if any(path_lower.endswith(ext) for ext in (".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs")):
    return _extract_imports_js(snippet)
  return []


def _resolve_import_to_paths(imp: str, importer_path: str, all_paths: Set[str]) -> List[str]:
  """Map an import string to possible repo file paths. Returns list of matching paths from all_paths."""
  imp = imp.replace("\\", "/").strip().strip("./")
  if not imp:
    return []
  # Relative: foo in same dir
  if not imp.startswith(".") and "/" not in imp and importer_path:
    base = "/".join(importer_path.split("/")[:-1])
    if base:
      candidate = base + "/" + imp
      matches = [p for p in all_paths if p == candidate or p.startswith(candidate + "/")]
      if matches:
        return matches[:3]
  # Top-level or path: utils -> utils/..., src/foo -> src/foo...
  if "/" not in imp:
    matches = [p for p in all_paths if p == imp or p.startswith(imp + "/")]
    return matches[:5]
  matches = [p for p in all_paths if p == imp or p.startswith(imp + "/")]
  return matches[:3] if matches else []


def build_dependency_graph(
  file_snippets: List[Dict[str, Any]],
  all_paths: Set[str],
) -> Dict[str, int]:
  """
  Build used_by count per path: how many files import (depend on) this path.
  file_snippets: [ { path, snippet } ], all_paths: set of blob paths from tree.
  Returns: { path: affected_count } (number of files that reference this path).
  """
  used_by: Dict[str, List[str]] = {}
  for entry in file_snippets:
    path = entry.get("path") or ""
    snippet = entry.get("snippet") or ""
    imports = extract_imports_from_snippet(path, snippet)
    for imp in imports:
      resolved = _resolve_import_to_paths(imp, path, all_paths)
      for target in resolved:
        if target not in used_by:
          used_by[target] = []
        if path not in used_by[target]:
          used_by[target].append(path)
  return {p: len(importers) for p, importers in used_by.items()}

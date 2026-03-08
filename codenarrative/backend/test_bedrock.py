"""Quick terminal test: call Claude via Bedrock using current settings."""
import os
import sys

# Load .env from project root (parent of backend)
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.isfile(ENV_PATH):
  with open(ENV_PATH, encoding="utf-8") as f:
    for line in f:
      line = line.strip()
      if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ[k.strip()] = v.strip()
  print(f"Loaded env from {ENV_PATH}")
else:
  print("No .env found, using existing env")

print(f"BEDROCK_REGION={os.getenv('BEDROCK_REGION')}")
print(f"BEDROCK_MODEL_ID={os.getenv('BEDROCK_MODEL_ID')}")
print()

from utils import bedrock_client

prompt = 'Respond with only this JSON (no markdown): {"answer": "Hello from Claude", "model": "ok"}'
fallback = {"answer": "fallback", "model": "none"}

print("Calling safe_bedrock with current settings...")
result = bedrock_client.safe_bedrock(prompt, fallback)
print("Result:", result)
if result.get("answer") == "fallback":
  print("Used fallback – Bedrock call failed or mocks are enabled.")
  sys.exit(1)

print("Claude call succeeded.")

"""Quick terminal test: call DeepSeek R1 via Bedrock in us-east-1."""
import json
import os
import sys

import boto3


def main() -> int:
  region = os.getenv("BEDROCK_REGION", "us-east-1")
  model_id = os.getenv("BEDROCK_MODEL_ID", "us.deepseek.r1-v1:0")
  print(f"Region : {region}")
  print(f"Model  : {model_id}")

  client = boto3.client("bedrock-runtime", region_name=region)

  messages = [
    {
      "role": "user",
      "content": [
        {
          "text": (
            'Respond with ONLY this JSON (no markdown, no explanation): '
            '{"answer": "Hello from DeepSeek R1", "model": "us.deepseek.r1-v1:0", "status": "ok"}'
          )
        }
      ],
    }
  ]

  print("\nCalling Bedrock Converse API with DeepSeek R1…")
  try:
    resp = client.converse(
      modelId=model_id,
      messages=messages,
      inferenceConfig={"maxTokens": 256, "temperature": 0.0},
    )
  except Exception as e:
    print(f"\n❌  Error: {e}")
    return 1

  try:
    content = resp["output"]["message"]["content"]
    texts = [b.get("text", "") for b in content if isinstance(b, dict)]
    raw = " ".join(texts).strip()
    print(f"\nRaw output:\n{raw}\n")

    # Strip markdown fences if present
    if raw.startswith("```"):
      parts = raw.split("```")
      if len(parts) >= 3:
        inner = parts[1]
        nl = inner.find("\n")
        if nl != -1:
          first_line = inner[:nl].strip()
          if first_line and not first_line.startswith("{"):
            inner = inner[nl + 1:]
        raw = inner.strip()

    parsed = json.loads(raw)
    print("✅  Parsed JSON:")
    print(json.dumps(parsed, indent=2))
    return 0
  except Exception as e:
    print(f"\n⚠️  Could not parse JSON: {e}")
    print("Full response:")
    print(json.dumps(resp, indent=2, default=str))
    return 1


if __name__ == "__main__":
  raise SystemExit(main())

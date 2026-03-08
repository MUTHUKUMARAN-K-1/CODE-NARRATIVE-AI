"""Quick terminal test: call Claude Sonnet 4 via Bedrock in ap-south-1."""
import json
import os
import sys

import boto3


def main() -> int:
  # Use Hyderabad region
  region = os.getenv("BEDROCK_REGION", "ap-south-1")
  print(f"Using region: {region}")

  client = boto3.client("bedrock-runtime", region_name=region)

  # Claude Sonnet 4.6 uses inference profiles; use the apac profile ID as modelId
  model_id = "apac.anthropic.claude-sonnet-4-6"
  print(f"Model ID: {model_id}")

  messages = [
    {
      "role": "user",
      "content": [
        {
          "text": "Respond with only this JSON (no markdown): "
                  '{"answer": "Hello from Claude Sonnet 4", "model": "claude-sonnet-4-6"}'
        }
      ],
    }
  ]

  print("Calling Bedrock converse with Claude Sonnet 4...")
  try:
    resp = client.converse(
      modelId=model_id,
      messages=messages,
      inferenceConfig={"maxTokens": 256, "temperature": 0.2},
    )
  except Exception as e:
    print(f"Error calling Claude Sonnet 4: {e}")
    return 1

  try:
    content = resp["output"]["message"]["content"]
    text_blocks = [b.get("text", "") for b in content if isinstance(b, dict)]
    text = " ".join(text_blocks).strip()
    print("Raw text output:")
    print(text)
    print()
    print("Parsed JSON:")
    print(json.loads(text))
  except Exception as e:
    print("Failed to parse JSON from Claude response:", e)
    print("Full response object:")
    print(json.dumps(resp, indent=2, default=str))
    return 1

  return 0


if __name__ == "__main__":
  raise SystemExit(main())


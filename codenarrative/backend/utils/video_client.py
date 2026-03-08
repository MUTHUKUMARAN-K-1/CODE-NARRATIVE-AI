"""Bedrock async invoke helpers for Nova Reel text-to-video."""

import os
from typing import Any, Dict

import boto3


NOVA_REEL_MODEL_ID = "amazon.nova-reel-v1:1"


def _client():
  region = os.getenv("BEDROCK_REGION", "us-east-1")
  return boto3.client("bedrock-runtime", region_name=region)


def start_async_invoke(
  text: str,
  s3_uri: str,
  *,
  duration_seconds: int = 6,
  fps: int = 24,
  dimension: str = "1280x720",
) -> str:
  """
  Start async Nova Reel text-to-video job. text must be 1-512 characters.
  Returns invocation_arn for polling.
  """
  client = _client()
  model_input = {
    "taskType": "TEXT_VIDEO",
    "textToVideoParams": {"text": text[:512]},
    "videoGenerationConfig": {
      "durationSeconds": duration_seconds,
      "fps": fps,
      "dimension": dimension,
    },
  }
  resp = client.start_async_invoke(
    modelId=NOVA_REEL_MODEL_ID,
    modelInput=model_input,
    outputDataConfig={
      "s3OutputDataConfig": {"s3Uri": s3_uri.rstrip("/") + "/"},
    },
  )
  return resp["invocationArn"]


def get_async_invoke(invocation_arn: str) -> Dict[str, Any]:
  """Poll async job status. Returns dict with status, failureMessage, s3Uri (when completed)."""
  client = _client()
  resp = client.get_async_invoke(invocationArn=invocation_arn)
  out = {
    "status": resp.get("status"),
    "failureMessage": resp.get("failureMessage") or resp.get("failure_message"),
  }
  out_config = resp.get("outputDataConfig")
  if out_config and isinstance(out_config, dict):
    s3_config = (
      out_config.get("s3OutputDataConfig")
      or out_config.get("SDK_UNKNOWN_MEMBER")
    )
    if isinstance(s3_config, dict):
      out["s3Uri"] = s3_config.get("s3Uri") or s3_config.get("s3uri")
    elif isinstance(out_config.get("s3Uri"), str):
      out["s3Uri"] = out_config["s3Uri"]
  return out

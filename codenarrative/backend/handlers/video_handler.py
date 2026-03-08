"""Nova Reel async video: start job and poll status."""

import json
import os
import re
import uuid
from typing import Any, Dict, Optional

import boto3

from utils import dynamodb_client, video_client


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


def _build_prompt(repo: Dict[str, Any], video_type: str) -> str:
  """Build short text prompt for Nova Reel (1-512 chars)."""
  analysis = dynamodb_client._decimal_to_serializable(repo.get("analysis") or {})
  summary = (analysis.get("summary") or "")[:200]
  name = (repo.get("repo_name") or "this codebase")[:80]
  if video_type == "documentary":
    return (
      f"Documentary scene: archaeologists discover an ancient codebase named {name}. "
      f"Digging through layers of commits. {summary}"
    )[:512]
  if video_type == "therapy":
    return (
      f"Therapy session: code modules sit in a circle in a calm room. "
      f"One module speaks about technical debt. {name}."
    )[:512]
  return (
    f"Short clip about a software project: {name}. {summary}"
  )[:512]


def _presigned_url(s3_uri: str, expires_in: int = 25200) -> Optional[str]:
  """Generate presigned URL for S3 object (default 7h expiry). s3_uri can be s3://bucket/key or prefix/."""
  if not s3_uri or not s3_uri.startswith("s3://"):
    return None
  match = re.match(r"s3://([^/]+)/(.*)", s3_uri)
  if not match:
    return None
  bucket, key = match.group(1), match.group(2)
  if not key or key.endswith("/"):
    s3 = boto3.client("s3")
    try:
      paginator = s3.get_paginator("list_objects_v2")
      for page in paginator.paginate(Bucket=bucket, Prefix=key):
        for obj in page.get("Contents") or []:
          k = obj.get("Key")
          if k and not k.endswith("/"):
            return s3.generate_presigned_url(
              "get_object", Params={"Bucket": bucket, "Key": k}, ExpiresIn=expires_in
            )
    except Exception:
      return None
    return None
  s3 = boto3.client("s3")
  return s3.generate_presigned_url(
    "get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=expires_in
  )


def video_start_handler(event, _context):
  """POST /api/video/start – body: repo_id, video_type, prompts?."""
  try:
    return _video_start_handle(event)
  except Exception as exc:
    print(f"Video start handler error: {exc}")
    return _response(500, {"error": "Video start failed", "message": str(exc)})


def _video_start_handle(event):
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

  video_type = body.get("video_type") or "documentary"
  bucket = os.getenv("VIDEO_OUTPUT_BUCKET")
  if not bucket:
    return _response(500, {"error": "Video output bucket not configured"})

  job_id = str(uuid.uuid4())
  s3_prefix = f"s3://{bucket}/videos/{job_id}"

  prompts = body.get("prompts")
  if isinstance(prompts, list) and prompts and isinstance(prompts[0], str):
    text = " ".join(prompts)[:512]
  else:
    text = _build_prompt(repo, video_type)

  if os.getenv("USE_BEDROCK_MOCKS", "false").lower() == "true":
    dynamodb_client.save_video_job(
      job_id=job_id,
      invocation_arn="mock-arn",
      repo_id=repo_id,
      video_type=video_type,
      s3_prefix=s3_prefix,
    )
    return _response(200, {"job_id": job_id, "status": "PENDING"})

  try:
    invocation_arn = video_client.start_async_invoke(text=text, s3_uri=s3_prefix)
  except Exception as e:
    print(f"start_async_invoke failed: {e}")
    return _response(502, {"error": "Failed to start video job", "detail": str(e)})

  dynamodb_client.save_video_job(
    job_id=job_id,
    invocation_arn=invocation_arn,
    repo_id=repo_id,
    video_type=video_type,
    s3_prefix=s3_prefix,
  )
  return _response(200, {"job_id": job_id, "status": "PENDING"})


def video_status_handler(event, _context):
  """GET /api/video/status/:job_id – returns status, video_url when completed."""
  try:
    return _video_status_handle(event)
  except Exception as exc:
    print(f"Video status handler error: {exc}")
    return _response(500, {"error": "Video status failed", "message": str(exc)})


def _video_status_handle(event):
  params = event.get("pathParameters") or {}
  job_id = params.get("job_id")
  if not job_id:
    return _response(400, {"error": "job_id is required"})

  job = dynamodb_client.get_video_job(job_id)
  if not job:
    return _response(404, {"error": "Job not found"})

  status = job.get("status") or "PENDING"
  if isinstance(status, str):
    status = status.strip().upper().replace("INPROGRESS", "IN_PROGRESS")
  else:
    status = "PENDING"

  s3_uri_for_url = None
  failure_message = None

  if status not in ("COMPLETED", "FAILED"):
    invocation_arn = job.get("invocation_arn")
    if invocation_arn and os.getenv("USE_BEDROCK_MOCKS", "false").lower() != "true":
      try:
        result = video_client.get_async_invoke(invocation_arn)
        api_status = (result.get("status") or "").strip()
        api_status_norm = api_status.upper() if api_status else ""
        if api_status_norm == "COMPLETED":
          status = "COMPLETED"
          s3_uri_for_url = result.get("s3Uri") or job.get("s3_prefix") or ""
          dynamodb_client.update_video_job_status(job_id, status, s3_uri=s3_uri_for_url)
        elif api_status_norm == "FAILED":
          status = "FAILED"
          failure_message = result.get("failureMessage") or result.get("failure_message") or "Video generation failed"
          dynamodb_client.update_video_job_status(job_id, status, failure_message=failure_message)
        else:
          status = "IN_PROGRESS"
          dynamodb_client.update_video_job_status(job_id, status)
      except Exception as e:
        print(f"get_async_invoke failed: {e}")

  payload = {"status": status}
  if status == "COMPLETED":
    s3_uri = s3_uri_for_url or job.get("s3_uri") or job.get("s3_prefix")
    if not s3_uri:
      job = dynamodb_client.get_video_job(job_id)
      if job:
        s3_uri = job.get("s3_uri") or job.get("s3_prefix")
    if s3_uri:
      last_segment = (s3_uri.rstrip("/").split("/")[-1] or "")
      if not s3_uri.endswith("/") and "." not in last_segment:
        s3_uri = s3_uri + "/"
      url = _presigned_url(s3_uri)
      if url:
        payload["video_url"] = url
  elif status == "FAILED":
    payload["message"] = failure_message or job.get("failure_message") or "Video generation failed"

  return _response(200, payload)


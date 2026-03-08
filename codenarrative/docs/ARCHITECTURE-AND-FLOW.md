# Architecture & request flow (for understanding)

## 1. Security model

- **Website** calls **API Gateway** (HTTPS). No Bedrock or AWS credentials in the browser.
- **Lambda** calls **Bedrock**, **DynamoDB**, and **S3** using its **IAM role**. No API keys are exposed to the browser.

---

## 2. Backend = Lambdas + one endpoint each

Each backend “endpoint” is one Lambda (one Python handler):

| Route | Method | Lambda handler |
|-------|--------|----------------|
| `/api/analyze` | POST | `repo_analysis_handler.lambda_handler` |
| `/api/learning-path` | POST | `learning_path_handler.lambda_handler` |
| `/api/qa` | POST | `smart_qa_handler.lambda_handler` |
| `/api/explain` | POST | `explanation_handler.lambda_handler` |
| `/api/architecture` | POST | `architecture_handler.lambda_handler` |
| `/api/progress/{uid}/{rid}` | GET | `progress_handler.get_progress` |
| `/api/progress/update` | POST | `progress_handler.update_progress` |
| `/api/progress/quiz-score` | POST | `progress_handler.record_quiz_score` |
| `/api/tests/generate` | POST | `legacy_test_handler.generate_tests` |
| `/api/tests/{repo_id}` | GET | `legacy_test_handler.list_tests` |

“Connecting backend” = making sure these routes in API Gateway trigger the right Lambda (SAM does this for you; see below).

---

## 3. End-to-end request flow (example: Repo Analysis)

1. User enters GitHub URL in the website.
2. Website calls:  
   `POST https://<api-id>.execute-api.<region>.amazonaws.com/Prod/api/analyze`  
   with body `{ "github_url": "https://github.com/user/repo" }`.
3. **API Gateway** receives the request and invokes the Lambda mapped to `POST /api/analyze`.
4. **Lambda** runs `repo_analysis_handler.lambda_handler`:
   - Fetches repo metadata and file tree from GitHub (public API).
   - Fetches important file contents.
   - Calls **Bedrock** (Claude) with a prompt to analyze the codebase.
   - Stores analysis in **DynamoDB** (repos table).
   - Optionally stores exports in **S3**.
   - Returns a JSON response (e.g. `repo_id`, `analysis`, `file_tree`, `stats`).
5. **API Gateway** returns that JSON to the frontend.
6. Frontend shows file tree, language breakdown, critical files, etc.

Same idea for other features: frontend → API Gateway → Lambda → Bedrock/DynamoDB/S3/GitHub → response back.

---

## 4. How Lambda talks to AWS services (no API keys)

Lambda uses its **execution role**. That role must have permissions for:

- **Bedrock:** `bedrock:InvokeModel` (Claude 4 Sonnet for complex analysis/learning path/architecture/explain/tests; Claude 4.5 Haiku for Smart Q&A)
- **DynamoDB:** `GetItem`, `PutItem`, `UpdateItem`, `Query`, etc. on the repos/users/tests tables
- **S3:** `PutObject`, `GetObject` (if you use S3 for tests or exports)
- **CloudWatch Logs:** `CreateLogStream`, `PutLogEvents` (for Lambda logs)

AWS signs all requests automatically using the role. Lambda code uses `boto3.client("bedrock-runtime")`, `boto3.resource("dynamodb")`, etc.—no API keys in code.

---

## 5. How Lambda talks to GitHub

GitHub’s public REST API is plain HTTPS. The handlers use `urllib.request` (or similar) from Lambda to call:

- `GET /repos/{owner}/{repo}`
- `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`
- `GET /repos/{owner}/{repo}/contents/{path}`

No auth required for public repos. You should still respect rate limits (headers / backoff).

---

## 6. Two ways to “connect” API Gateway → Lambda

### Option A: SAM (recommended — what this repo uses)

Running `sam build` and `sam deploy --guided` from the `backend/` folder:

- Creates every Lambda function from the template.
- Creates the REST API in API Gateway with all routes above.
- Connects each route to the correct Lambda.
- Creates DynamoDB tables and sets env vars (table names, region, model ID).
- Attaches the right IAM policies to each Lambda.

You do **not** create the API or link routes by hand. See [AWS-SETUP.md](AWS-SETUP.md).

### Option B: Manual (Console)

If you were to do it by hand:

1. **Lambda:** Create a function (e.g. Python 3.11), paste handler code, deploy. Note the function name.
2. **API Gateway:** Create REST API → create resource `/api` → under it create `/analyze` → add method **POST** → integration type **Lambda**, select that function. Repeat for every route in the table above.
3. **CORS:** On each resource/method, enable CORS (e.g. allow POST, OPTIONS and your frontend origin).
4. **Deploy API:** Create a stage (e.g. `prod`). Invoke URL is  
   `https://<api-id>.execute-api.<region>.amazonaws.com/prod`
5. **IAM:** Ensure each Lambda’s execution role has the Bedrock, DynamoDB, and (if used) S3 permissions above.

SAM does all of this from `template.yaml` in one deploy.

---

## 7. Frontend → backend URL

Frontend must call the **base URL** of your API including the stage and `/api`:

- **With SAM deploy:**  
  `https://<api-id>.execute-api.<region>.amazonaws.com/Prod/api`

Set in the frontend (e.g. `.env.local`):

```env
VITE_API_BASE=https://<api-id>.execute-api.<region>.amazonaws.com/Prod/api
VITE_USE_MOCKS=false
```

The client then sends requests to `VITE_API_BASE + "/analyze"`, `VITE_API_BASE + "/learning-path"`, etc., which match the routes in the table above.

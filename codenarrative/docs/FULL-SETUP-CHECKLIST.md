# What You Need for a Fully Working CodeNarrative

Use this checklist to go from “code on disk” to a working app (frontend + real backend + Bedrock).

---

## Do this next (minimal path)

1. **Install & configure** – Install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html). Run `aws configure` with an access key from AWS Console → your user → Security credentials → Create access key (region e.g. `us-east-1`).
2. **Deploy the backend** – `cd codenarrative/backend` → `sam build` → `sam deploy --guided`. Copy the **ApiUrl** from the stack outputs (e.g. `https://xxxx.execute-api.us-east-1.amazonaws.com/Prod/`).
3. **Point frontend at API** – In `codenarrative/frontend`, create `.env.local` with:
   - `VITE_API_BASE=<your ApiUrl>api` (e.g. `https://xxxx.execute-api.us-east-1.amazonaws.com/Prod/api`)
   - `VITE_USE_MOCKS=false`
4. **Run the app** – `cd codenarrative/frontend` → `npm install` → `npm run dev`. Open the URL (e.g. `http://localhost:5173`) and try **Repo Analysis** with a public GitHub repo URL.
5. **Bedrock (first time)** – Default models are **Amazon Nova** (Pro and Lite), which are **credits-compatible** and do not require a payment card. If you prefer Claude, set `BEDROCK_MODEL_ID` and `BEDROCK_MODEL_ID_HAIKU` in the template and ensure a valid payment method for AWS Marketplace.

Once 1–4 are done (and 5 if required), the app is fully functional.

---

## 1. AWS account and Bedrock access

- [ ] **Bedrock model access**  
  Default models are **Amazon Nova Pro** and **Nova Lite** (profiles `us.amazon.nova-pro-v1:0`, `us.amazon.nova-lite-v1:0`). They are **credits-compatible** and do not require a Marketplace payment method. Use region **us-east-1**. To use Claude, set `BEDROCK_MODEL_ID` / `BEDROCK_MODEL_ID_HAIKU` in `template.yaml` and ensure a valid payment method for Marketplace.

- [ ] **Model strategy (quality vs cost)**  
  The app uses **Nova Pro** for complex work (repo analysis, learning path, architecture, explanations, test generation) and **Nova Lite** for Smart Q&A. Optional: set `USE_WEB_GROUNDING_REPO_ANALYSIS=true` for repo analysis with Nova Premier and web grounding (real-time search, citations). Override with `BEDROCK_MODEL_ID` / `BEDROCK_MODEL_ID_HAIKU` to switch to Claude when a payment method is configured.

- [ ] **Credentials for deploy**  
  The backend runs on Lambda and uses an **IAM role** (no API keys in code). To *deploy*, you need AWS CLI credentials: Console → your user → **Security credentials** → **Create access key**. Then run:

  ```bash
  aws configure
  ```
  Enter the Access Key ID, Secret Access Key, and region (e.g. `us-east-1`).

---

## 2. Install CLI tools

- [ ] **AWS CLI** – [install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [ ] **SAM CLI** – [install guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

---

## 3. Deploy the backend

- [ ] From the project root:

  ```bash
  cd codenarrative/backend
  sam build
  sam deploy --guided
  ```

  Use a stack name (e.g. `codenarrative`), region `us-east-1`, and allow SAM to create IAM roles. When it finishes, note the **ApiUrl** in the Outputs (e.g. `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod/`).

---

## 4. Point the frontend at your API

- [ ] In **frontend**, create **`.env.local`** (see `frontend/env.example` for a template):

  ```env
  VITE_API_BASE=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod/api
  VITE_USE_MOCKS=false
  ```

  Replace the URL with your **ApiUrl** from step 3, and keep `/api` at the end.

- [ ] Install and run the frontend:

  ```bash
  cd codenarrative/frontend
  npm install
  npm run dev
  ```

  Open the URL (e.g. `http://localhost:5173`) and try **Repo Analysis** with a public GitHub URL (e.g. `https://github.com/facebook/react`).

---

## 5. Optional: run backend locally (no deploy)

If you want to test the backend on your machine without deploying:

- [ ] From **backend**, run:

  ```bash
  sam local start-api
  ```

  By default this serves the API at `http://127.0.0.1:3000`. Lambda runs in Docker and uses the **Lambda execution role** by default; it does **not** load the project root `.env` file. For local Bedrock access you would need to configure AWS credentials (e.g. `aws configure` or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in the environment). The root `.env` (e.g. `BEDROCK_API_KEY`) is for your own reference or for a custom local server that reads it; the current SAM/Lambda code uses standard AWS credential chain only.

---

## 6. Optional: use mocks until Bedrock is ready

- **Frontend-only mocks** (no backend): in frontend set `VITE_USE_MOCKS=true` (or leave `VITE_API_BASE` unset and use mocks). The UI works with fake data.
- **Backend mocks** (deployed API returns fake data): in AWS Lambda → each function → **Configuration** → **Environment variables** → add `USE_BEDROCK_MOCKS=true` and, for repo analysis, `USE_BACKEND_MOCKS=true` if you want to skip GitHub as well.

---

## Quick reference

| Item | Where / What |
|------|----------------|
| Backend env (Lambda) | Set by `template.yaml` (tables, region, Sonnet + Haiku model IDs). Override in Lambda console if needed. |
| Model strategy | Claude 4 Sonnet for complex tasks (analysis, learning path, architecture, explain, tests); Claude 4.5 Haiku for Q&A and lightweight AI. |
| Bedrock credentials | IAM role attached to Lambda (no keys in code). For local: `aws configure` or env vars. |
| Root `.env` | Used for your own local scripts or reference (e.g. `BEDROCK_API_KEY`). Not used by SAM or Lambda. |
| Frontend API URL | `frontend/.env.local`: `VITE_API_BASE=<ApiUrl>api`, `VITE_USE_MOCKS=false` for real API. |
| Troubleshooting | CloudWatch → Log groups → filter by your stack/Lambda names. |

Once steps 1–4 are done and Bedrock model access is enabled, the app is fully functional with real analysis, learning paths, Q&A, and progress stored in DynamoDB.

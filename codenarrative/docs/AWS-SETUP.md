# CodeNarrative – AWS Console to Running App

Follow these steps now that you have AWS Console access.

---

## Step 1: Bedrock (Claude) – no manual “model access” needed

Serverless foundation models are **automatically enabled** when first invoked in your account; the old “Model access” page has been retired.

- In AWS Console, open **Amazon Bedrock** and use **Model catalog** to find **Claude Sonnet 4** (e.g. `anthropic.claude-sonnet-4-20250514-v1:0`). Use region **us-east-1** (N. Virginia) to match the template.
- For **Anthropic models**, first-time users may need to **submit use case details** in the console before the model works (e.g. open the model in the playground and complete any one-time prompt).
- You can deploy first and invoke the model from your app; if you see access errors, complete the use-case step in the Bedrock console, or use mock mode until then.

---

## Step 2: Install AWS CLI and SAM CLI on your machine

- **AWS CLI**: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html  
- **SAM CLI**: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html  

Then configure your account:

```bash
aws configure
```

Enter your **Access Key ID**, **Secret Access Key**, and default region (e.g. `us-east-1`). Get keys from Console → your username (top right) → **Security credentials** → **Access keys** → **Create access key**.

---

## Step 3: Deploy the backend from your project

In a terminal:

```bash
cd codenarrative/backend
sam build
sam deploy --guided
```

- **Stack name**: e.g. `codenarrative`
- **AWS Region**: e.g. `us-east-1`
- **Confirm changes before deploy**: Y
- **Allow SAM CLI IAM role creation**: Y
- **Disable rollback**: N
- **Save arguments to config**: Y (so next time you can run `sam deploy` without `--guided`)

When it finishes, the **Outputs** section will show something like:

```text
ApiUrl = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod/
```

Copy that URL (with the trailing `/`). Your API base for the frontend is that URL plus `api`, for example:

```text
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod/api
```

---

## Step 4: Point the frontend at your deployed API

In the **frontend** folder, create a file named `.env.local` (or set these in your shell):

```env
VITE_API_BASE=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod/api
VITE_USE_MOCKS=false
```

Replace `https://xxxxxxxxxx...` with the **ApiUrl** from Step 3, and keep `/api` at the end.

---

## Step 5: Run the frontend and test

```bash
cd codenarrative/frontend
npm install
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`). Use **Repo Analysis** with a real GitHub URL (e.g. `https://github.com/facebook/react`). If Bedrock is enabled, you’ll get a real analysis; if not, you’ll see an error or fallback depending on your Lambda env.

---

## Optional: Use mocks until Bedrock is ready

If you deploy before enabling Bedrock, you can still test the stack by making Lambdas return mock data:

1. In **AWS Console** → **Lambda** → open each CodeNarrative function (e.g. `RepoAnalysisFunction`).
2. **Configuration** → **Environment variables** → **Edit**.
3. Add:
   - `USE_BEDROCK_MOCKS` = `true`
   - (For repo analysis only) `USE_BACKEND_MOCKS` = `true` if you want to skip GitHub too and use only mock analysis.

Save. Then the frontend (with `VITE_USE_MOCKS=false` and correct `VITE_API_BASE`) will call your real API and get deterministic mock responses until you enable Bedrock and remove those variables.

---

## Quick checklist

| Step | What to do |
|------|------------|
| 1 | Bedrock: models auto-enable on first invoke; for Claude Sonnet 4, complete any first-time use-case in Console → Model catalog if prompted; region us-east-1 |
| 2 | Install AWS CLI + SAM CLI, run `aws configure` with your keys |
| 3 | From `codenarrative/backend`: `sam build` then `sam deploy --guided`, note **ApiUrl** |
| 4 | In frontend `.env.local`: `VITE_API_BASE=<ApiUrl>api`, `VITE_USE_MOCKS=false` |
| 5 | From `codenarrative/frontend`: `npm install` and `npm run dev`, test in browser |

If something fails, check **CloudWatch** → **Log groups** for the Lambda names (e.g. `RepoAnalysisFunction`) to see errors.

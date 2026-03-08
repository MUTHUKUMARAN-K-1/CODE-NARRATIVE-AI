# How to start and test CodeNarrative

## 1. Backend (already deployed?)

If you **just fixed the backend** (imports) or made any code changes, rebuild and deploy:

```bash
cd d:\Projects\Code Narrative Ai\codenarrative\backend
sam build
sam deploy
```

If you haven’t deployed yet, use `sam deploy --guided` once and follow the prompts. Note the **ApiUrl** from the output.

---

## 2. Frontend env

Ensure `codenarrative/frontend/.env.local` exists and points at your API:

```env
VITE_API_BASE=https://j1splyrox9.execute-api.us-east-1.amazonaws.com/Prod/api
VITE_USE_MOCKS=false
```

Replace the URL with **your** ApiUrl if it’s different (e.g. after a new deploy). The path must end with `/api`.

---

## 3. Start the frontend

```bash
cd d:\Projects\Code Narrative Ai\codenarrative\frontend
npm install
npm run dev
```

Open the URL shown (usually **http://localhost:5173**) in your browser.

---

## 4. Test the app

1. **Dashboard** – You should see the hero and onboarding wizard. Use the **theme toggle** (sun/moon) in the header to switch light/dark.
2. **Repo Analysis**
   - Go to **Repo Analysis** (or complete step 1 of the onboarding with a GitHub URL).
   - Enter a **public** repo URL, e.g. `https://github.com/facebook/react`.
   - Click **Analyze**. You should get an overview, language breakdown, critical files, and file tree.  
   - If you see a Bedrock/access error, complete the one-time use-case in **AWS Console → Bedrock → Model catalog** for Claude Sonnet 4.
3. **Learning Path** – After a repo is analyzed, go to **Learning Path**, set experience/background, click **Generate learning path**. You should see a 14-day plan.
4. **Q&A** – With a repo selected, go to **Q&A**, type a question (e.g. “Where is the main entry point?”), click **Send**.
5. **Progress** – Go to **Progress** to see learning path completion and quiz scores (after you’ve done some steps).

---

## 5. Test the API directly (optional)

From PowerShell:

```powershell
# Replace with your ApiUrl + /api
$base = "https://j1splyrox9.execute-api.us-east-1.amazonaws.com/Prod/api"

# Health-style check: analyze endpoint (POST with body)
Invoke-RestMethod -Uri "$base/analyze" -Method POST -ContentType "application/json" -Body '{"github_url":"https://github.com/facebook/react"}' | ConvertTo-Json -Depth 5
```

If the backend is working, you get a JSON response with `repo_id`, `analysis`, `file_tree`, etc. If you get an error, check **CloudWatch** → **Log groups** → your stack name → the Lambda that handles that route (e.g. `RepoAnalysisFunction`).

---

## Quick checklist

| Step | Command / action |
|------|-------------------|
| Backend (after code change) | `cd codenarrative\backend` → `sam build` → `sam deploy` |
| Frontend env | `frontend\.env.local` has `VITE_API_BASE=<ApiUrl>api`, `VITE_USE_MOCKS=false` |
| Start frontend | `cd codenarrative\frontend` → `npm run dev` |
| Open app | http://localhost:5173 |
| Test | Repo Analysis with `https://github.com/facebook/react` |

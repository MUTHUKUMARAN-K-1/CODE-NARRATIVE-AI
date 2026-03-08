# Judge / Demo Guide — CodeNarrative

Use this as a quick reference when evaluating CodeNarrative. For full setup and API details, see the [main README](../README.md).

---

## Intended flow (checklist)

1. **Open the app** (frontend running with `VITE_USE_MOCKS=false` and `VITE_API_BASE` pointing at the deployed API).
2. **Paste a GitHub repo URL** or click **Run 60s demo** on the Dashboard (uses a preset repo).
3. **Wait for analysis** to complete (progress shown in the onboarding card or Repo Analysis page).
4. **Learning Path** → Click **Generate path** (choose experience level and background if prompted). Review the 14-day plan and optionally mark days complete.
5. **Q&A** → Ask one question (e.g. “Where is the main entry point?”). Review answer, referenced files, and follow-up suggestions.
6. **Explanations** → Select a file from the tree, click **Explain**, then switch between Beginner / Intermediate / Expert tabs. Optionally click **Generate quiz** and reveal the answer.
7. **Tools (60-second demo)** → Open **Tools**, click **Generate report**, wait ~30s for the report to run (key takeaways, one-slide architecture, runbook, critical path, knowledge map). Then **Copy as markdown** or **Export .md** for a shareable artifact. Optionally use **Run all (recommended)** to run the same tools from the cards.

Optional: **Architecture** (Mermaid diagrams), **Tests** (generate legacy tests for a function), **Progress** (dashboard and quiz history), **Dashboard** (repo health and developer matching).

---

## Frontend routes (path → screen)

| Path | Screen |
|------|--------|
| `/` | Landing |
| `/dashboard` | Dashboard (onboarding wizard, stats, recent activity, Run 60s demo) |
| `/analysis` | Repo Analysis (DNA map, hidden coupling, performance risks, “if you change this file N modules break”, impact simulation) |
| `/learning-path` | Learning Path (generate, 14-day cards, progress) |
| `/qa` | Smart Q&A (chat, suggested questions, quiz) |
| `/explanations` | Explanations (file browser, explain, Generate quiz) |
| `/architecture` | Architecture Map (Mermaid diagrams, export SVG) |
| `/tools` | Developer tools (runbook, where-used, key takeaways, one-slide, critical path, workflow, compare, review, digest, knowledge map; Run all, Generate report, export .md) |
| `/tests` | Legacy Tests (file/function picker, generate tests) |
| `/progress` | Progress (completion ring, time to mastery, quiz history) |
| `/archaeology`, `/therapy`, `/reality`, `/pokemon` | Creative modules |
| `/videos` | Video generation (start job, poll status) |

---

## API base URL (for your deploy)

After you run `sam deploy`, copy **ApiUrl** from the stack Outputs and set in `frontend/.env.local`:

```bash
VITE_USE_MOCKS=false
VITE_API_BASE=<ApiUrl>/api
```

Restart the frontend dev server. For local dev with a **remote** API, you can also set `VITE_PROXY_TARGET=<ApiUrl>` (without `/api`) so the Vite proxy forwards `/api` to your backend.

---

## Submission narrative

For **Why AI**, **How AWS**, and **What value** the AI layer adds, see [SUBMISSION-NARRATIVE.md](SUBMISSION-NARRATIVE.md).

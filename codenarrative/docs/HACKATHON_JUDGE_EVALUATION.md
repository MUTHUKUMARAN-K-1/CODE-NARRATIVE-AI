# CodeNarrative — International Hackathon Judge Evaluation

*Perspective: 1000x international hackathon judge. The codebase has been read end-to-end (frontend, backend, API client, docs).*

---

## International Judge — Full Codebase Review

### Rating (out of 10)

| Criterion | Score | Notes |
|-----------|-------|--------|
| **Using Generative AI on AWS** | 9/10 | Bedrock (Nova Pro/Lite, optional Premier + web grounding) used consistently; Converse API, clear separation of heavy vs light models. Minor: no explicit “Why AI / How AWS / Value” callout in-app. |
| **Building on AWS Infrastructure** | 9/10 | Lambda, API Gateway, DynamoDB, S3, IAM; serverless, no hardcoded secrets. Template is clean; optional worker for async analysis. |
| **AI for Learning & Developer Productivity** | 9/10 | Covers all four “What you may build” areas: learning (path, explanations, quiz, review, digest), productivity (runbook, where-used, tests, dashboard), simplify (one-slide, critical path, workflow, compare), knowledge (key-takeaways, knowledge map). Tools page is category-based with Run all and report. |
| **Clarity & Usefulness** | 8/10 | One-URL onboarding is clear; JUDGE-DEMO and README give a repeatable flow. Recent activity is data-driven; empty/loading/error states present. |
| **Meaningful AI improvement** | 9/10 | AI is central (analysis, paths, Q&A, explanations, diagrams, tests); not decorative. |
| **Code quality & security** | 8/10 | Path validation in file_content_handler; request limits (question, code_snippet, file_path, etc.) in handlers; friendly 5xx messages and retry in client. |
| **Demo readiness** | 8/10 | Run 60s demo, Generate report, routes table, judge checklist. Could add in-app “Judge flow” hint. |

**Overall: 8.5/10** — Strong submission. Fix remaining polish items and add one or two high-impact features below to maximize score.

---

### What was analyzed

- **Backend:** `template.yaml`, all handlers (analyze, learning-path, qa, explain, explain-line, glossary, runbook, where-used, test-feedback, one-slide, critical-path, workflow, compare-repos, key-takeaways, review, digest, knowledge-map, architecture, progress, tests, dashboard, file content, video, match-developers, creative), `bedrock_client.py`, `github_client.py`, `dynamodb_client.py`, `file_content_handler.py` (path safety).
- **Frontend:** `App.jsx`, `client.js`, `AppContext.jsx`, `Dashboard.jsx`, `Tools.jsx`, `toolRegistry.js`, `ToolCard.jsx`, `useToolRun.js`, `Explanations.jsx`, `LearningPath.jsx`, `LegacyTests.jsx`, `ArchitectureMap.jsx`, `MermaidView.jsx`, Layout/routes.
- **Docs:** README, SUBMISSION-NARRATIVE.md, JUDGE-DEMO.md, AWS-SETUP.md, this file.

---

### Status of previous recommendations

| # | Item | Status |
|---|------|--------|
| 1 | API URL single source of truth | **Done** — README and JUDGE-DEMO document `VITE_API_BASE` and proxy; client uses `/api` in dev, env in prod. |
| 2 | Recent activity not fake | **Done** — Dashboard derives activity from `currentRepo`, `stats` (daysCompleted, testsGenerated, questionsAsked); fallback copy: “No recent activity. Analyze a repo…” |
| 3 | Friendly 5xx/network errors | **Done** — `client.js` uses `FRIENDLY_SERVER_ERROR` and throws user-facing message; no raw CORS in UI. |
| 4 | One-click judge demo | **Done** — “Run 60s demo” in onboarding wizard; preset repo flow and hint. |
| 5 | File path validation | **Done** — `file_content_handler.py` has `_is_safe_path` (no `..`, no leading `/`). |
| 6 | Generate quiz wired | **Done** — Explanations calls `api.askQuestion` with quiz prompt; renders question, options, reveal answer. |
| 7 | Real Recent activity | **Done** — Same as #2. |
| 9 | Request size limits | **Done** — Handlers enforce limits (e.g. question 2000, code_snippet 50000, file_path 500, github_url 500); README mentions limits. |
| 10 | README routes & judge checklist | **Done** — Routes table and Judge / demo checklist in README; JUDGE-DEMO.md has full flow and Tools 60s step. |
| 11 | Accessibility | **Done** — Toast container has `aria-live="polite"`, `aria-label="Notifications"`; toasts `role="alert"`, `aria-live="assertive"` for errors. |
| 12 | Retry on 5xx | **Done** — `client.js` retries once after 2s for 502/503/504. |

**Still open (optional):** #8 LegacyTests function detection UX, #13 Mermaid sanitization, #14 API key / demo mode, #15 User id picker, #16 Automated tests.

---

### Suggestions (prioritized)

1. **In-app “Judge flow” hint** — After “Run 60s demo” completes, show a small banner or toast: “Next: Learning Path → Generate, then Q&A, then Tools → Generate report,” so judges don’t miss the Tools report step.
2. **Tools: add Test feedback card** — The plan’s Productivity category includes test-feedback; the API exists and is used in LegacyTests. Add a **Test feedback** tool to `toolRegistry.js` (repo_id + test_code + function_name) so it appears in Tools with Run all / report.
3. **Learning path: surface skill_tags in UI** — API already returns `skill_tags`; show them on day cards or in a small “Skills covered” section to strengthen “skill-building” narrative.
4. **README: one-line “Why AI / How AWS / Value”** — Add a single sentence above the routes table: “CodeNarrative uses Amazon Bedrock (Nova) for all AI; Lambda + API Gateway + DynamoDB on AWS; one URL → analysis, learning path, Q&A, and tools.”
5. **Optional: user id picker** — Dashboard or Layout: “Viewing as: demo-user | Alice | Bob” for multi-developer storytelling (progress/learning path per user).
6. **Optional: automated tests** — A few Vitest + RTL tests for Dashboard/LearningPath/Tools and one pytest for a handler to signal maintainability.

---

### Feature additions (aligned to “What you may build”)

Concrete additions that map to the track’s four categories and strengthen the narrative:

| Category | Suggestion | Implementation idea |
|----------|------------|---------------------|
| **Learning assistants, tutors, explainers** | **“Explain this line” in Tools** | Add an **Explain line** tool card (repo_id, file_path, line_content) calling existing `POST /api/explain-line` so judges see it alongside other tools and in the report. |
| | **Glossary in Tools** | Add **Glossary** tool (repo_id, term, level) calling `POST /api/glossary`; supports “explainers for technical topics.” |
| **Developer productivity (docs, workflow, debugging)** | **Test feedback in Tools** | Add **Test feedback** to tool registry (repo_id, test_code, function_name) → “Why might this test fail?”; already in LegacyTests, expose in Tools + report. |
| | **“Where is this used?”** | Already in Tools; ensure it’s in “Run recommended” or report if high value for productivity story. |
| **Simplify concepts, codebases, workflows** | **Compare repos in report** | Consider adding **compare-repos** to `REPORT_TOOL_IDS` (or a “Extended report” option) so the report shows side-by-side comparison. |
| | **One-slide + Mermaid in report** | Already done (MermaidView in ToolCard and report). |
| **Knowledge organization, summarization, skill-building** | **Skill tags on Learning Path** | Show `skill_tags` from API on the learning path page (e.g. “Skills: React, API design, testing”). |
| | **Key takeaways + Knowledge map in report** | Already in report; optional: add a one-line “Skills covered” derived from key_takeaways or knowledge_map in the report header. |

Implementing **Test feedback** and **Explain line** (and optionally **Glossary**) as Tools page cards, plus **skill_tags** on Learning Path and the **Judge flow hint**, would round out the submission for maximum impact.

---

## Executive summary

**Strengths:** Broad feature set (repo analysis with optional web grounding/multimodal, learning path, Q&A, explanations, architecture, progress, tests, developer matching, creative modules, video). Clear docs, dual mock/live mode, consistent CORS and error shapes, loading/empty states. Strong differentiator: “75% faster onboarding” with a single GitHub URL.

**To win:** Fix the items that make the demo look broken (wrong API URL, fake data in key places, security/validation gaps). Then add a few high-impact polish items and one “wow” narrative (e.g. 60-second demo script, single “judge flow”).

---

## Critical — Must-have (do these or judges will notice)

*Most items in this section are already done; see “Status of previous recommendations” above.*

### 1. Correct API URL everywhere

- **Issue:** Frontend can still call the old API (`1dd0lbvz1c...`) if `.env.local` or proxy is wrong; CORS/502 then look like “app broken.”
- **Fix:** Ensure a single source of truth: in dev, use Vite proxy with target from env (e.g. `VITE_PROXY_TARGET`) or document “after deploy, set `VITE_API_BASE` and restart.” In [frontend/src/api/client.js](codenarrative/frontend/src/api/client.js) dev already uses `/api` (proxy); prod must use `VITE_API_BASE` ending in `/api`. Add a one-line README: “After `sam deploy`, copy ApiUrl from Outputs, set `VITE_API_BASE=<ApiUrl>/api` in `frontend/.env.local`, restart dev server.”

### 2. Replace hardcoded “Recent activity” on Dashboard

- **Issue:** [Dashboard.jsx](codenarrative/frontend/src/components/Dashboard.jsx) lines 507–511 use a static array (“Generated path for github.com/acme/legacy-crm”, “2 min ago”, etc.). Judges will spot fake data.
- **Fix:** Either drive it from real data (e.g. last learning path generated, last test file, last Q&A — from progress/tests/context or a small “activity” API) or clearly label it: “Sample activity (connect backend for real data).”

### 3. User-visible 5xx and network errors

- **Issue:** On 502/CORS, users see “Failed to fetch” or CORS message. Judges may think the app is unfinished.
- **Fix:** In [client.js](codenarrative/frontend/src/api/client.js), when `!res.ok` or fetch throws, show a short, friendly message in the toast (e.g. “Server error. Check your connection and API URL, or try again.”) and optionally log the raw error. Keeps UX clean while still allowing debugging.

### 4. One-click “judge demo” path

- **Issue:** Judges have limited time. If they must find a repo, paste URL, wait, then click through many screens, they may not see the full value.
- **Fix:** Add a **“60-second demo”** or **“Judge flow”**: one button that (1) uses a **preset small public repo** (e.g. from README or env like `VITE_DEMO_REPO_URL`), (2) triggers analyze, (3) after completion auto-navigates or shows a short “Next: open Learning Path / Q&A” hint. Document in README: “For judges: click ‘Run demo’ (or paste `https://github.com/owner/small-repo`) and follow the prompts.”

### 5. File path validation (security)

- **Issue:** [file_content_handler.py](codenarrative/backend/handlers/file_content_handler.py) passes `path` from query to GitHub. Malicious `path` (e.g. `../etc/passwd` or encoded) could be a bad look in a security-minded review.
- **Fix:** Reject `path` containing `..` or absolute path segments (or normalize and reject if it escapes repo root). Simple check before calling `fetch_file_content`.

---

## Mid-priority — Strong impact for judges

### 6. Wire “Generate quiz” in Explanations

- **Issue:** [Explanations.jsx](codenarrative/frontend/src/components/Explanations.jsx) “Generate quiz” shows a toast: “Quiz generated… wired to Smart Q&A in a full build.” Judges will treat it as unfinished.
- **Fix:** Call Smart Q&A with a prompt derived from the current explanation (e.g. “Generate one multiple-choice quiz question about: [key_takeaway]”) or add a small `POST /api/explain-quiz` that returns `{ question, options, correct_answer }` and render it in the same tab.

### 7. Real “Recent activity” (or explicit “Demo data”)

- **Issue:** Same as #2; if you don’t have backend activity yet, at least show “Recent activity (demo)” or pull from `currentRepo` + last action (e.g. “Learning path generated for &lt;repo&gt;” when path exists).
- **Fix:** Derive 3–5 items from: last repo analyzed, learning path generated (from context or GET progress), last test generated (if you store it), last Q&A question. Or add a minimal `GET /api/activity` that returns last N events for `user_id`/`repo_id`.

### 8. LegacyTests: clarify or improve function detection

- **Issue:** [LegacyTests.jsx](codenarrative/frontend/src/components/LegacyTests.jsx) uses a heuristic (e.g. regex) to list functions; fallback can be generic. Judges may try a random file and see “No functions detected” or odd names.
- **Fix:** Either (a) document in UI: “We detect functions by simple rules; for best results use files with clear function definitions,” or (b) add a backend endpoint that returns a list of symbols (e.g. from tree-sitter or a strict regex) for a given file so the list is consistent and believable.

### 9. Request size / length limits

- **Issue:** Very long `question`, `code_snippet`, or body could cause timeouts or cost; judges sometimes test edge cases.
- **Fix:** In handlers, reject with 400 when `len(question) > 2000` or `len(code_snippet) > 50000` (with a clear message). Optional: document in API section of README.

### 10. README “Routes” and “Judge checklist”

- **Fix:** Add a short **Routes** table (path → component) and a **Judge / demo checklist**: “1. Open app, 2. Paste repo X or click Demo, 3. Wait for analysis, 4. Open Learning Path → generate, 5. Open Q&A → ask one question, 6. Open Explanations → select file → Explain.” Makes it easy for judges to replicate the intended flow.

---

## Optional — Nice-to-have and polish

### 11. Accessibility

- **Fix:** Add `aria-live="polite"` (or `assertive` for errors) for toast container so screen readers announce messages. Ensure modal/dropdown focus trap and Escape to close where applicable.

### 12. Retry on 5xx

- **Fix:** In [client.js](codenarrative/frontend/src/api/client.js), on 502/503/504, retry once after 2s (with user still seeing loading). Reduces “one bad request and the demo fails” impression.

### 13. Mermaid sanitization / safety

- **Issue:** [ArchitectureMap.jsx](codenarrative/frontend/src/components/ArchitectureMap.jsx) renders Mermaid (and possibly SVG export) from AI output. Malicious or malformed content could be a concern.
- **Fix:** If you export or render raw HTML, ensure Mermaid is the only thing rendered (e.g. strip script tags) or render in a sandboxed iframe. Optional for hackathon if the backend is trusted.

### 14. Optional API key or “demo mode” for production

- **Fix:** Even a single shared API key (e.g. header `X-API-Key`) for a “production” deployment shows you thought about access control. Document as “optional; for hackathon demo we use open endpoints.” Not required to win but can be a plus in security criteria.

### 15. User id picker

- **Issue:** [AppContext.jsx](codenarrative/frontend/src/context/AppContext.jsx) uses `userId: "demo-user"`. For “multi-developer” storytelling, judges might want to see different users.
- **Fix:** Add a small dropdown or input in Dashboard or Layout: “Viewing as: demo-user | Alice | Bob” and store in context. Progress/learning path then show per user. Low effort, good for narrative.

### 16. Automated tests (if criteria include “testing”)

- **Fix:** A few frontend tests (e.g. Vitest + React Testing Library): “Dashboard renders,” “RepoAnalysis shows skeleton when loading,” “LearningPath shows 14 cards after generate.” Backend: pytest for one handler (e.g. get_repo returns 404 when repo missing). Helps in “code quality” or “maintainability” criteria.

---

## What already stands out (leverage this)

- **Single URL → full analysis:** Paste GitHub URL, get structure, stack, critical files, health. Strong hook.
- **Learning path + progress:** 14 (or 30) days with checkboxes and quiz scores; “time to mastery” formula. Very tangible.
- **Multilevel explanations:** Beginner / intermediate / expert in one click. Easy to demo and remember.
- **Creative features:** Archaeology, Therapy, Reality TV, Pokémon. Use one (e.g. Archaeology) in the main demo as the “fun” beat.
- **Developer matching:** Team profiles → assignments. Good for “team onboarding” storytelling.
- **Docs:** README, AWS-SETUP, smoke test steps. Judges can run the app; add the judge checklist (#10) to make the path obvious.

---

## Suggested “winning” demo script (2 minutes)

1. **Landing:** “CodeNarrative cuts onboarding time by 75%. You paste one GitHub URL.”
2. **Analyze:** Paste a small, well-known repo (e.g. a popular CLI or small API). Show file tree, language pie, critical files, health score.
3. **Learning path:** Generate 14-day path; show 2–3 day cards; mark one complete; show progress bar.
4. **Q&A:** Ask “Where is the main entry point?” Show answer + referenced files.
5. **Explanations:** Open one file from the tree, click Explain, show beginner tab.
6. **One fun beat:** Open Archaeology (or Pokémon), show one AI-generated card.
7. **Close:** “All of this from one URL. No config. Works with any public repo.”

Ensure steps 2–6 work with the same repo and same session (no 502, no fake “Recent activity” in view during the demo). Fix Critical #1–5 first, then add #6 and #10 for a packed, judge-ready experience.

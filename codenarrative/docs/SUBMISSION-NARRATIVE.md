# CodeNarrative — Hackathon Submission Narrative

**Track:** AI for Learning & Developer Productivity  
**Tagline:** 75% faster onboarding onto unfamiliar codebases — one GitHub URL, full AI-powered guidance.

---

## What we built (mapping to “What you may build”)

CodeNarrative aligns with all four suggested build types for this track:

| What you may build | How CodeNarrative delivers it |
|--------------------|--------------------------------|
| **Learning assistants, tutors, or explainers** (technical/non-technical) | 14-day adaptive learning path; beginner / intermediate / expert explanations per file; Smart Q&A as tutor; progress tracking and quiz scores. |
| **Developer productivity tools** (documentation, workflow, debugging) | Repo analysis and health dashboard; architecture diagrams (Mermaid); legacy test generation; developer–module matching; file content and “Explain” as documentation helper. |
| **AI tools that simplify complex concepts, codebases, or workflows** | One GitHub URL → full analysis; critical files, stack, and health; learning path orders topics; multilevel explanations simplify code; architecture map simplifies structure. |
| **Knowledge organization, summarization, or skill-building systems** | Analysis summary and language breakdown; learning path as skill-building roadmap; progress and days completed; quiz scores; optional video “documentary” of the repo. |

---

## Why AI is required

Understanding and onboarding onto unfamiliar or legacy codebases is inherently complex. Developers must infer architecture, locate entry points, trace dependencies, and build a mental model before they can contribute safely. Doing this manually is slow, error-prone, and scales poorly across teams.

**Only AI can:**

- **Synthesize structure at scale** — Analyze hundreds of files and surface tech stack, critical files, entry points, and dependencies in seconds.
- **Suggest learning order** — Generate personalized, day-by-day onboarding paths based on repo content and developer experience level.
- **Answer contextual questions** — Provide codebase Q&A, multilevel (beginner/intermediate/expert) explanations, and architecture diagrams from natural language.
- **Reduce time to first contribution** — Turn “where do I start?” into a concrete plan with files to read, tasks to complete, and quizzes to validate understanding.

CodeNarrative uses **generative AI on AWS** to deliver this in one flow: paste a GitHub URL, get analysis, learning path, Q&A, explanations, and test generation — with no client-side API keys and no manual setup.

---

## How AWS is used

All AI and business logic run **server-side on AWS**. The frontend is a static React SPA that calls a REST API; no credentials or model access are exposed to the browser.

| AWS service | Usage |
|-------------|--------|
| **Amazon Bedrock** | Single AI integration for all features. **Nova Pro** for repo analysis, learning paths, architecture, tests, dashboard, developer matching; **Nova Lite** for Smart Q&A and lightweight tasks. Optional **Nova Premier with web grounding** for repo analysis (research similar projects, citations). Converse API via [bedrock_client.py](codenarrative/backend/utils/bedrock_client.py). |
| **AWS Lambda** | All API behavior: analyze, learning-path, qa, explain, architecture, progress, tests, video, match-developers, dashboard, file content, and creative modules (Archaeology, Therapy, Reality, Pokémon). Python 3.11. |
| **Amazon API Gateway** | REST API (`CodeNarrativeApi` in SAM). All routes under `/api`. CORS enabled for browser clients. |
| **Amazon DynamoDB** | **Repos** (analysis, file tree, metadata), **Users** (progress, learning path state, quiz scores), **Tests** (generated test metadata), **VideoJobs** (async video status). |
| **Amazon S3** | Video output bucket; presigned URLs for generated video assets. |

**AWS-native patterns:**

- **IAM roles for Lambda** — No API keys in code; Lambda execution roles grant Bedrock, DynamoDB, and S3 access. Frontend never sees credentials.
- **Serverless scaling** — Lambda and API Gateway scale with demand; no EC2 or containers to manage.
- **Managed data** — DynamoDB and S3 are fully managed; no database servers.

---

## What value the AI layer adds

| Value | How CodeNarrative delivers it |
|-------|-------------------------------|
| **Single-URL onboarding** | One GitHub URL → full analysis, file tree, tech stack, critical files, health dashboard. |
| **Personalized learning paths** | 14- or 30-day day-by-day plan (files to read, tasks, concepts, estimated time) based on repo + experience level and background. |
| **Level-based explanations** | Any code snippet explained at beginner (plain English, analogies), intermediate (patterns, system role), and expert (trade-offs, optimizations). |
| **Codebase Q&A** | Natural language questions with answers, referenced files, follow-up suggestions, and optional quiz generation. |
| **Health dashboard** | AI-generated health score, risk assessment, improvement priorities, and technical debt summary per repo. |
| **Legacy test generation** | Select functions → AI generates unit/integration/edge-case tests and living documentation. |
| **Developer–module matching** | Team profiles → AI-suggested assignments (who should own which modules) with reasoning. |
| **Creative / engagement** | Archaeology, Therapy, Reality TV, Pokémon-style “code as character” modules for memorable demos. |

Together, this reduces **time to productivity** and **cognitive load** for new developers joining any repo.

---

## Technical evaluation (for judges)

CodeNarrative is a production-style serverless app on AWS. Generative AI (Amazon Bedrock, Nova Pro/Lite/Premier with optional web grounding) powers repo analysis, learning paths, Q&A, explanations, architecture diagrams, test generation, and dashboard insights. All AI runs in Lambda; the frontend is a mock-capable React SPA that calls the REST API. Data is stored in DynamoDB and S3. The project demonstrates **generative AI on AWS** and **AWS-native infrastructure** in the **AI for Learning & Developer Productivity** track: one GitHub URL drives analysis, personalized onboarding, and codebase Q&A with no client-side keys.

---

## Quick links for judges

- **Run the app:** [README — Frontend & Production](../README.md#frontend)
- **Judge / demo checklist:** [Judge / demo checklist](../README.md#judge--demo-checklist) or [JUDGE-DEMO.md](JUDGE-DEMO.md)
- **API endpoints:** [README — API surface](../README.md#the-api-surface-matches-the-design)
- **AWS setup (first-time):** [AWS-SETUP.md](AWS-SETUP.md)

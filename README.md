<p align="center">
  <img src="codenarrative/docs/logo.png" alt="CodeNarrative Logo" width="200" />
</p>

<h1 align="center">🧠 CodeNarrative</h1>

<p align="center">
  <strong>AI-powered developer co-pilot that helps engineers onboard onto unfamiliar or legacy codebases 10× faster.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="codenarrative/backend/"><img src="https://img.shields.io/badge/Backend-AWS%20SAM-orange" alt="AWS SAM" /></a>
  <a href="codenarrative/frontend/"><img src="https://img.shields.io/badge/Frontend-React%20%2B%20Tailwind-61DAFB" alt="React" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=prabhu2006.code-narrative-ai"><img src="https://img.shields.io/badge/VS%20Code-Marketplace-007ACC?logo=visual-studio-code" alt="VS Code Marketplace" /></a>
  <a href="https://main.d1d3c3oqy6cy3x.amplifyapp.com/"><img src="https://img.shields.io/badge/🌐_Live-Demo-brightgreen" alt="Live Demo" /></a>
</p>

<p align="center">
  Combines <strong>repository analysis</strong> · <strong>adaptive learning paths</strong> · <strong>smart Q&A</strong> · <strong>architecture diagrams</strong> · <strong>progress tracking</strong> · <strong>legacy test generation</strong> into one platform — turning days of onboarding into hours.
</p>

---

<p align="center">
  <a href="https://main.d1d3c3oqy6cy3x.amplifyapp.com/"><strong>🌐 View Live Demo</strong></a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://marketplace.visualstudio.com/items?itemName=prabhu2006.code-narrative-ai"><strong>🔌 Install VS Code Extension</strong></a>
</p>

---

## ✨ Features

| Category | Highlights |
|----------|-----------|
| 🔍 **Repo Analysis** | Architectural DNA, hidden coupling, performance risks, impact simulation, MRI critical files |
| 🗺️ **Learning Paths** | AI-generated adaptive learning paths tailored to the repo |
| 💬 **Smart Q&A** | Ask questions about any codebase — context-aware, multi-level answers |
| 📖 **Explanations** | Beginner / Intermediate / Expert explanations for any file, with quiz generation |
| 🏗️ **Architecture** | Auto-generated architecture diagrams (Mermaid) |
| 📊 **Progress Tracking** | Spaced repetition, quiz scores, learning digest |
| 🧪 **Legacy Tests** | AI-generated tests for untested legacy code |
| 🛠️ **Developer Tools** | Runbooks, where-used, critical path, workflow minimap, repo compare, knowledge map |
| 🎭 **Fun Features** | Code Archaeology, Code Therapy, Reality Check, Code Pokémon |

---

## 🏗️ Tech Stack

```
Frontend       React 18 · Tailwind CSS · React Router · Recharts · Mermaid · Vite
Backend        AWS SAM · Python 3.11 · AWS Lambda · API Gateway · DynamoDB
AI Engine      Amazon Bedrock (Nova Pro / Nova Lite / Claude / DeepSeek)
Extension      VS Code Extension API · TypeScript · Webview UI Toolkit
Infrastructure AWS CloudFormation · SAM CLI
```

---

## 📁 Project Layout

```
codenarrative/
├── frontend/          React + Tailwind SPA (dashboard, analysis, learning, Q&A)
├── backend/           AWS SAM (Lambda handlers + DynamoDB + Bedrock)
└── docs/              Architecture docs, setup guides, demo checklists

vscode-extension/      VS Code extension for in-editor experience
pixel-office-webview/  Pixel-art office webview (gamified onboarding UI)
pixel-agents-src/      Pixel agent sprite source assets
```

---

## 🚀 Quick Start

### Frontend

```bash
cd codenarrative/frontend
npm install
npm run dev
```

**Mock mode (no backend needed):**

```bash
VITE_USE_MOCKS=true npm run dev
```

> Explore Repo Analysis — Architectural DNA, hidden coupling, performance risks, impact simulation — without deploying the backend.

**Live API mode:**

```bash
# In frontend/.env.local
VITE_API_BASE=<your-deployed-api-url>/api
VITE_USE_MOCKS=false
```

### Backend (AWS SAM)

**Prerequisites:** AWS SAM CLI · AWS credentials (Lambda / DynamoDB / API Gateway permissions)

```bash
cd codenarrative/backend
sam build
sam deploy --guided
```

> 📖 **First time with AWS?** See **[docs/AWS-SETUP.md](codenarrative/docs/AWS-SETUP.md)** for step-by-step instructions.

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BEDROCK_REGION` | `us-east-1` | AWS region for Bedrock |
| `BEDROCK_MODEL_ID` | `us.amazon.nova-pro-v1:0` | Model for complex tasks (analysis, paths) |
| `BEDROCK_MODEL_ID_HAIKU` | `us.amazon.nova-lite-v1:0` | Model for lightweight tasks (Q&A) |
| `USE_WEB_GROUNDING_REPO_ANALYSIS` | `false` | Enable Nova Premier + web grounding |
| `USE_BEDROCK_MOCKS` | `false` | Return mock data instead of calling Bedrock |

---

## 🧪 Local Development

Run the backend locally with SAM:

```bash
cd codenarrative/backend
sam local start-api
```

Then point the frontend at `http://127.0.0.1:3000/api`:

```bash
# frontend/.env.local
VITE_API_BASE=http://127.0.0.1:3000/api
VITE_USE_MOCKS=false
```

---

## 🗺️ API Reference

<details>
<summary><strong>Click to expand all 30+ endpoints</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Repo analysis (MRI, architectural DNA, coupling, risks) |
| `GET` | `/api/repos/{id}` | Get analyzed repo |
| `POST` | `/api/repos/{id}/simulate-impact` | Impact simulation |
| `GET` | `/api/repos/{id}/files?path=` | File content for explanations |
| `GET` | `/api/repos/{id}/dashboard` | Repo health dashboard |
| `POST` | `/api/learning-path` | Generate learning path |
| `POST` | `/api/qa` | Smart Q&A |
| `POST` | `/api/explain` | Multi-level explanations (persona: designer / pm / new grad / staff) |
| `POST` | `/api/explain-line` | Line-level explanations |
| `POST` | `/api/glossary` | Level-based term definitions |
| `POST` | `/api/runbook` | Generate runbook (run, test, deploy) |
| `POST` | `/api/where-used` | Symbol/file usage lookup |
| `POST` | `/api/test-feedback` | Test failure analysis |
| `POST` | `/api/one-slide-architecture` | One-slide architecture summary |
| `POST` | `/api/critical-path` | Critical path for a feature |
| `POST` | `/api/workflow` | Workflow minimap |
| `POST` | `/api/compare-repos` | Compare two repos |
| `POST` | `/api/key-takeaways` | 5-bullet summary for new joiners |
| `GET` | `/api/review` | Spaced repetition / review |
| `GET` | `/api/digest` | Learning digest |
| `GET` | `/api/knowledge-map` | Component → role mapping |
| `POST` | `/api/architecture` | Architecture diagrams |
| `GET` | `/api/progress/{uid}/{rid}` | Progress metrics |
| `POST` | `/api/progress/update` | Update progress |
| `POST` | `/api/progress/quiz-score` | Record quiz score |
| `POST` | `/api/tests/generate` | Generate legacy tests |
| `GET` | `/api/tests/{repo_id}` | List generated tests |
| `POST` | `/api/archaeology` | Code Archaeology |
| `POST` | `/api/therapy` | Code Therapy |
| `POST` | `/api/reality` | Reality Check |
| `POST` | `/api/pokemon` | Code Pokémon |
| `POST` | `/api/video/start` | Start video generation |
| `GET` | `/api/video/status/{job_id}` | Video job status |
| `POST` | `/api/match-developers` | Developer–module matching |

</details>

---

## 🖥️ Frontend Routes

| Path | Feature |
|------|---------|
| `/` | Landing page |
| `/dashboard` | Dashboard & repo health |
| `/analysis` | Repo Analysis (MRI, DNA, coupling) |
| `/learning-path` | Adaptive Learning Path |
| `/qa` | Smart Q&A |
| `/explanations` | File Explanations + Quizzes |
| `/architecture` | Architecture Map |
| `/tools` | Developer Tools (runbook, where-used, critical path, compare, etc.) |
| `/tests` | Legacy Test Generator |
| `/progress` | Progress Tracking |
| `/videos` | Video Generation |
| `/archaeology` | Code Archaeology 🏺 |
| `/therapy` | Code Therapy 🛋️ |
| `/reality` | Reality Check ✅ |
| `/pokemon` | Code Pokémon ⚡ |

---

## 📄 Documentation

| Guide | Description |
|-------|-------------|
| [Architecture & Flow](codenarrative/docs/ARCHITECTURE-AND-FLOW.md) | System architecture and data flow |
| [AWS Setup](codenarrative/docs/AWS-SETUP.md) | Step-by-step AWS/Bedrock setup |
| [Full Setup Checklist](codenarrative/docs/FULL-SETUP-CHECKLIST.md) | Complete deployment checklist |
| [Start & Test](codenarrative/docs/START-AND-TEST.md) | How to run and test locally |
| [Technical Documentation](codenarrative/docs/technical-documentation.md) | In-depth technical reference |
| [Judge Demo Checklist](codenarrative/docs/JUDGE-DEMO.md) | Quick demo walkthrough |

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** your feature branch — `git checkout -b feature/amazing-feature`
3. **Commit** your changes — `git commit -m 'feat: add amazing feature'`
4. **Push** to the branch — `git push origin feature/amazing-feature`
5. **Open** a Pull Request

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <img src="codenarrative/docs/logo.png" alt="CodeNarrative" width="60" />
  <br />
  Built with ❤️ using <strong>Amazon Bedrock</strong> · <strong>AWS SAM</strong> · <strong>React</strong>
</p>

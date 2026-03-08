# Code Narrative AI

> **Turn your code into stories.** AI-powered narrative explanations, code reviews, changelogs, PR descriptions, inline annotations, and a gamified Pixel Office -- all inside VS Code.

![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-blue?logo=visualstudiocode)
![Version](https://img.shields.io/badge/version-0.1.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## Why Code Narrative AI?

Most AI coding tools give you raw completions. Code Narrative AI gives you **understanding**. Instead of terse one-liners, you get rich, narrative-style explanations that read like documentation written by a senior engineer -- complete with analogies, design rationale, tradeoffs, and key takeaways.

And when you're not reading explanations, your AI sessions come alive as pixel-art characters in a virtual office. Because developer tools should be _fun_.

---

## Features at a Glance

| Feature                     | What it does                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Explain Selection**       | Select any code and get a structured narrative explanation with analogies and tradeoffs                          |
| **Summarize File**          | Generate a high-level narrative overview of the entire active file                                               |
| **Code Review**             | AI-powered quality review with actionable feedback                                                               |
| **Generate Changelog**      | Turn your last 30 git commits into a human-readable, grouped changelog                                           |
| **Generate PR Description** | Auto-generate a professional PR description from your staged diff                                                |
| **Annotate File**           | Add inline AI summaries to top-level functions and classes as editor decorations                                 |
| **Chat Panel**              | Persistent sidebar chat with slash commands, history export, and workspace memory                                |
| **Architect Dashboard**     | Three-column layout with session list, chat, and live code preview                                               |
| **Pixel Office**            | A gamified pixel-art office where your AI sessions are animated agents with XP, levels, achievements, and themes |

---

## Core AI Features

### Explain Selection

Select any block of code, right-click, and choose **Explain Selection** (or use the Command Palette). You'll receive a structured response with:

- **Clear explanation** of what the code does and why
- **Analogy** to make the concept intuitive
- **System role** describing the code's place in the architecture
- **Key takeaways**, **patterns used**, **tradeoffs**, and **potential issues**
- Three depth tabs: _Beginner_, _Intermediate_, _Expert_

### Summarize File

Run **Summarize File** on any open file to get a narrative overview of its purpose, structure, and key responsibilities -- perfect for onboarding to unfamiliar codebases.

### Code Review

Run **Review Code** from the editor context menu or Command Palette. The AI analyzes your code for quality, readability, correctness, and maintainability, then returns structured feedback.

### Generate Changelog

Run **Generate Changelog** and the extension reads your last 30 git commits, groups them by type (features, fixes, refactors, chores), and produces a clean, human-readable changelog.

### Generate PR Description

Run **Generate PR Description** to read your staged diff (or `HEAD~1`) and output a complete PR description with title, summary, list of changes, and testing notes. Copy-paste ready.

### Annotate File

Run **Annotate File** to add inline AI-generated summaries as editor decorations for up to 8 top-level symbols (functions, classes, methods) in the current file. Understand any file at a glance.

---

## Chat & Dashboard

### Chat Side Panel

Open the **Code Narrative AI** view in the Activity Bar to access a persistent chat panel:

- Ask freeform questions about your code
- Use **slash commands**: `/explain`, `/summarize`, `/review`, `/changelog`, `/pr`
- Chat history is saved per workspace (last 50 entries) and survives restarts
- **Export to Markdown** with one click
- Collapsible response cards for structured output

### Architect Dashboard

Open the **Dashboard** view for a three-column IDE-within-IDE experience:

| Left Column          | Center Column                      | Right Column                          |
| -------------------- | ---------------------------------- | ------------------------------------- |
| Active sessions list | Chat interface with slash commands | Live code preview with syntax context |
| File context panel   | Full response cards                | Current file snippet                  |

---

## Pixel Office

_Inspired by [Pixel Agents](https://github.com/pablodelucca/pixel-agents)_

![Pixel Office Screenshot](media/pixel-office/Screenshot.jpg)

The Pixel Office transforms your AI sessions into a living, breathing pixel-art environment. Every time you run an AI command, a character spawns in a virtual office, walks to a desk, and shows speech bubbles with live progress.

### Office Environment

- **21x21 tile-based office** with walls, floors, desks, and furniture
- **Built-in layout editor** to customize the office (move/place tiles, furniture, colors)
- **Six character sprites** with smooth walking animations

### Gamification System

Every AI command earns experience points:

| Command                    | XP    |
| -------------------------- | ----- |
| Code Review                | 25 XP |
| Changelog / PR Description | 20 XP |
| Explain Selection          | 15 XP |
| Summarize File             | 10 XP |
| Chat Message               | 5 XP  |

**Leveling**: 10 levels (each level requires `100 * level` XP)

**Achievements**:

- First Session, 10 Sessions, 50 Sessions
- Level 5 Reached, Level 10 Master
- 3-Day Streak, Week-Long Streak

**Unlockable Character Skins**:

- Default (Level 0), Hacker (Level 3), Wizard (Level 5), Robot (Level 7)

### Theatre Mode

When an AI session runs, the office enters **Theatre Mode**:

- Full-screen overlay with spotlight effect
- Live ticker showing AI progress text
- Confetti animation on completion

### Themes

| Theme     | Description                 |
| --------- | --------------------------- |
| `night`   | Dark orange tones (default) |
| `sunrise` | Warm amber and cream        |
| `neon`    | Cyberpunk purple and cyan   |
| `forest`  | Green and earthy tones      |

### Sound Effects

Audio feedback powered by the Web Audio API:

- Session start, completion, achievement unlock, and error tones
- Toggle on/off via settings

### Session Timeline

A visual timeline strip at the bottom of the Pixel Office shows session history with color-coded dots (blue = started, orange = completed, rose = error).

---

## Commands

All commands are available from the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`) and marked commands also appear in the **editor right-click context menu**.

| Command                 | ID                               | Context Menu             |
| ----------------------- | -------------------------------- | ------------------------ |
| Explain Selection       | `codeNarrative.explainSelection` | Yes (when text selected) |
| Summarize File          | `codeNarrative.summarizeFile`    | Yes                      |
| Review Code             | `codeNarrative.reviewCode`       | Yes                      |
| Annotate File           | `codeNarrative.annotateFile`     | Yes                      |
| Generate Changelog      | `codeNarrative.changelog`        | --                       |
| Generate PR Description | `codeNarrative.prDescription`    | --                       |
| Open Chat               | `codeNarrative.openChat`         | --                       |
| Open Dashboard          | `codeNarrative.openDashboard`    | --                       |

---

## Configuration

Open VS Code Settings and search for **Code Narrative AI**, or add these to your `settings.json`:

### General

| Setting                        | Type                      | Default                                | Description                                              |
| ------------------------------ | ------------------------- | -------------------------------------- | -------------------------------------------------------- |
| `codeNarrative.backendType`    | `"local"` \| `"remote"`   | `"remote"`                             | Where AI requests are routed                             |
| `codeNarrative.baseUrl`        | `string`                  | `"https://api.your-code-narrative.ai"` | Base URL for the Code Narrative AI HTTP API              |
| `codeNarrative.apiKey`         | `string`                  | `""`                                   | API key (also stored securely via VS Code SecretStorage) |
| `codeNarrative.narrativeLevel` | `"short"` \| `"detailed"` | `"detailed"`                           | Default depth of generated narratives                    |

### Pixel Office

| Setting                                | Type                                               | Default   | Description                                |
| -------------------------------------- | -------------------------------------------------- | --------- | ------------------------------------------ |
| `codeNarrative.office.enabled`         | `boolean`                                          | `true`    | Enable/disable the Pixel Office panel      |
| `codeNarrative.office.theme`           | `"night"` \| `"sunrise"` \| `"neon"` \| `"forest"` | `"night"` | Visual theme for the office                |
| `codeNarrative.office.soundEnabled`    | `boolean`                                          | `true`    | Play audio feedback for AI events          |
| `codeNarrative.office.autoSpawnAgents` | `boolean`                                          | `true`    | Auto-create characters for new AI sessions |
| `codeNarrative.office.maxAgents`       | `number` (1-100)                                   | `20`      | Max simultaneous agents in the office      |

---

## Getting Started

### 1. Install

Install from the VS Code Marketplace, or manually:

```bash
# Build and install from source
npm install
npm run package
code --install-extension code-narrative-ai-0.1.0.vsix
```

### 2. Configure

1. Open the **Code Narrative AI** Activity Bar view (look for the icon in the sidebar).
2. Set your backend URL and API key in Settings, or the extension will prompt you on first use.
3. Your API key is stored securely using VS Code's built-in SecretStorage.

### 3. Use

- **Select code** and right-click for **Explain Selection**, **Summarize File**, **Review Code**, or **Annotate File**.
- Open the **Chat** panel to ask questions with slash commands.
- Open the **Dashboard** for the full architect layout.
- Open the **Pixel Office** panel to watch your sessions come alive.

---

## Architecture

```
src/
├── extension.ts                    # Entry point & command registration
├── client/
│   └── CodeNarrativeClient.ts      # AI backend HTTP client
├── config/
│   └── ApiKeyManager.ts            # Secure API key management (SecretStorage)
├── views/
│   ├── SidePanelProvider.ts        # Chat webview provider
│   ├── DashboardViewProvider.ts    # Dashboard webview provider
│   └── dashboardMessages.ts       # Shared message type definitions
└── pixelOffice/
    ├── OfficeViewProvider.ts       # Pixel Office webview provider
    ├── SessionEvents.ts            # Session tracking, XP, achievements
    ├── LayoutStore.ts              # Office layout persistence
    └── messages.ts                 # Webview message types

media/
├── icon.png                        # Extension icon
└── pixel-office/
    ├── index.html                  # Pixel Office webview entry
    ├── characters.png              # Character sprite sheet
    └── assets/                     # Tile atlases, fonts, layout data
```

---

## Language Support

Code Narrative AI is **language-agnostic**. It works with any file type VS Code recognizes -- TypeScript, Python, Rust, Go, Java, C++, and everything else. The extension passes language context to the AI backend so responses are always language-aware.

---

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run tests
npm test

# Package as .vsix
npm run package
```

### Requirements

- Node.js 18+
- VS Code ^1.85.0
- TypeScript ^5.4.0

---

## Security

- API keys are stored using VS Code's native **SecretStorage** API, not in plaintext settings.
- All backend communication uses Bearer token authentication over HTTPS.
- No telemetry or data collection -- your code stays between you and your configured backend.

---

## Credits

- **Pixel Office** concept inspired by [Pixel Agents](https://github.com/pablodelucca/pixel-agents) by Pablo de Lucca.
- Pixel font: **FS Pixel Sans Unicode** (bundled).

---

## License

MIT License -- see [LICENSE](LICENSE) for details.

export default function analyzeMock() {
  // Simulated response from POST /api/analyze
  return Promise.resolve({
    repo_id: "demo-repo",
    status: "completed",
    analysis: {
      tech_stack: ["React", "Node.js", "Express", "PostgreSQL"],
      architecture_type: "monolith",
      critical_files: [
        {
          file: "src/App.jsx",
          reason: "Main React app shell",
          description: "Entry point that wires routing and global providers."
        },
        {
          file: "src/server/index.js",
          reason: "HTTP API server",
          description: "Bootstraps Express server and routes."
        }
      ],
      entry_points: ["src/main.jsx", "src/server/index.js"],
      dependencies: ["react", "react-router-dom", "express", "pg"],
      complexity_score: 6,
      summary:
        "A full-stack React and Express application with a REST API and PostgreSQL database. The frontend uses React Router for navigation and the backend exposes versioned API routes. Configuration is driven by environment variables and shared utilities."
    },
    language_breakdown: [
      { language: "jsx", percentage: 70 },
      { language: "ts", percentage: 10 },
      { language: "json", percentage: 10 },
      { language: "md", percentage: 10 }
    ],
    critical_files: [
      {
        file: "src/App.jsx",
        description: "Main React app shell with routing."
      },
      {
        file: "src/server/index.js",
        description: "Bootstraps the Express HTTP API server."
      }
    ],
    file_tree: [
      { path: "src", type: "dir" },
      { path: "src/App.jsx", type: "file", size: 1800 },
      { path: "src/main.jsx", type: "file", size: 900 },
      { path: "src/components/Button.jsx", type: "file", size: 600 },
      { path: "src/server", type: "dir" },
      { path: "src/server/index.js", type: "file", size: 2200 },
      { path: "README.md", type: "file", size: 1600 },
      { path: "package.json", type: "file", size: 1200 }
    ],
    summary: "Mock repository used to demonstrate CodeNarrative features.",
    stats: {
      total_files: 24,
      total_lines: 1600,
      dependencies_count: 18
    },
    mri_critical_files: [
      { file: "src/App.jsx", affected_count: 6, reason: "Root component; many screens import it." },
      { file: "src/server/index.js", affected_count: 4, reason: "API entry; routes and middleware depend on it." },
      { file: "src/components/Button.jsx", affected_count: 3, reason: "Shared UI used across modules." }
    ],
    architectural_dna_traits: [
      "Layered API (REST + React)",
      "Shared DB layer",
      "Component-based frontend",
      "Env-driven config"
    ],
    hidden_coupling: [
      { file_a: "src/App.jsx", file_b: "src/server/index.js", reason: "Auth state and API base URL are coupled via env." },
      { file_a: "src/server/index.js", file_b: "src/components/Button.jsx", reason: "Server exports shared constants used by UI." }
    ],
    performance_risks: [
      { file: "src/server/index.js", risk: "Synchronous file reads in request path.", severity: "medium" },
      { file: "src/App.jsx", risk: "Large bundle; no code-splitting on routes.", severity: "low" }
    ]
  });
}


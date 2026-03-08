/**
 * Fallback mock when a specific mock file is missing (e.g. archaeology, therapy, video).
 * Returns safe, minimal data so pages render without crashing.
 */
export default function fallbackMock(path, _body) {
  const pathKey = path.replace(/^\//, "").replace(/\//g, "_");
  if (pathKey.startsWith("archaeology")) {
    return Promise.resolve({
      story: "This codebase holds many secrets. Run with a connected backend to get a full AI investigation.",
      revelation: "Connect the backend and analyze a repo to unlock the full archaeology experience.",
      timeline: [
        { event: "Repository analyzed", when: "Step 1", clue: "Run Repo Analysis first." },
        { event: "Investigation started", when: "Step 2", clue: "Use a deployed backend with Archaeology endpoint." }
      ],
      suspects: [],
      evidence_board: [{ title: "Backend required", description: "Deploy the API and set VITE_USE_MOCKS=false to use this feature.", importance: "high" }]
    });
  }
  if (pathKey.startsWith("therapy")) {
    return Promise.resolve({
      transcript: "Connect the backend and analyze a repository to get a full module therapy session.",
      diagnosis: [
        { condition: "Backend not connected", severity: "info", affected: "This feature" }
      ],
      treatment_plan: [
        { step: 1, action: "Deploy the API and set VITE_USE_MOCKS=false to use Code Therapy." }
      ]
    });
  }
  if (pathKey.startsWith("reality")) {
    return Promise.resolve({
      episode_script: "Connect the backend to generate a reality-style codebase episode.",
      contestants: [],
      challenges: []
    });
  }
  if (pathKey.startsWith("pokemon")) {
    return Promise.resolve({
      modules: [],
      message: "Connect the backend and analyze a repo to catch code Pokémon."
    });
  }
  if (pathKey.startsWith("video_start")) {
    return Promise.resolve({
      job_id: "mock-job-" + Date.now(),
      status: "PENDING",
      message: "Video job started. Poll status to see completion (mock returns COMPLETED with sample video)."
    });
  }
  if (pathKey.startsWith("video_status")) {
    const sampleVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    return Promise.resolve({
      job_id: pathKey.split("_").pop(),
      status: "COMPLETED",
      message: "Mock: sample video shown. Deploy backend for real Nova Reel generation.",
      video_url: sampleVideoUrl
    });
  }
  if (pathKey.includes("simulate_impact") || (typeof path === "string" && path.includes("simulate-impact"))) {
    const scenario = (_body && _body.scenario) ? _body.scenario : "Remove Redis layer";
    return Promise.resolve({
      summary: `Mock impact for: "${scenario}". In production, the API simulates affected modules and risks.`,
      affected_modules: ["api/gateway", "cache/service", "workers/queue"],
      suggested_order: ["1. Update cache interface", "2. Migrate callers", "3. Remove Redis client"],
      risks: ["Temporary cache miss spike", "Rollback requires code deploy"]
    });
  }
  if (pathKey === "explain_line") {
    return Promise.resolve({ explanation: "This line contributes to the logic. Connect backend for full explanation.", in_this_repo: "Fits this codebase." });
  }
  if (pathKey === "glossary") {
    return Promise.resolve({ definition: "Term definition. Connect backend for repo-aware glossary.", in_this_repo: "Used in this repo.", example: "" });
  }
  if (pathKey === "runbook") {
    return Promise.resolve({ run_locally: ["1. Clone repo", "2. Install deps", "3. Start dev server"], run_tests: ["Run test script"], env_vars: [], deploy: [] });
  }
  if (pathKey === "where_used") {
    return Promise.resolve({ answer: "Connect backend to find usages.", likely_files: [] });
  }
  if (pathKey === "test_feedback") {
    return Promise.resolve({ reasons: ["Mocks may be missing.", "Check async/await.", "Env vars in test."] });
  }
  if (pathKey === "one_slide_architecture") {
    return Promise.resolve({ title: "Architecture at a glance", bullets: ["Key components", "Data flow", "Tech stack"], one_diagram_mermaid: "flowchart LR\n  A[Client] --> B[API]\n  B --> C[Services]" });
  }
  if (pathKey === "critical_path") {
    return Promise.resolve({ steps: [{ order: 1, file_or_component: "Entry", one_line: "Bootstrap" }], summary: "Connect backend for critical path." });
  }
  if (pathKey === "workflow") {
    return Promise.resolve({ flow_name: "flow", steps: [{ step: 1, name: "Step", file_or_location: "-", description: "Connect backend." }], mermaid_sequence: "" });
  }
  if (pathKey === "compare_repos") {
    return Promise.resolve({ similarity: "Connect backend to compare.", differences: [], recommendation: "Use backend for comparison." });
  }
  if (pathKey === "key_takeaways") {
    return Promise.resolve({ bullets: ["Summary 1", "Summary 2", "Summary 3", "Summary 4", "Summary 5"] });
  }
  if (pathKey === "review") {
    return Promise.resolve({ suggestions: [], message: "Complete learning path days to get review suggestions." });
  }
  if (pathKey === "digest") {
    return Promise.resolve({ summary: "No active learning yet.", repos: [], suggested_next: null });
  }
  if (pathKey === "knowledge_map") {
    return Promise.resolve({ map: [{ component: "Core", suggested_owner_role: "Full-stack", one_line_reason: "Connect backend." }] });
  }
  return Promise.resolve({ ok: true, message: "Feature requires a connected backend or a dedicated mock." });
}

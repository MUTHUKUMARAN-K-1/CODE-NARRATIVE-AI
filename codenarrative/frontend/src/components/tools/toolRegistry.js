/**
 * Tool registry: id, category, title, description, inputs, defaultInputs, apiCall.
 * apiCall(api, { repoId, userId, inputs }) => Promise<result>
 */
export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "Learning", label: "Learning" },
  { id: "Productivity", label: "Productivity" },
  { id: "Simplify", label: "Simplify" },
  { id: "Knowledge", label: "Knowledge" },
];

export const TOOLS = [
  {
    id: "runbook",
    category: "Productivity",
    title: "Runbook",
    description: "Generate steps to run locally, run tests, env vars, and deploy.",
    inputs: [],
    defaultInputs: {},
    apiCall: (api, { repoId }) => api.getRunbook(repoId),
  },
  {
    id: "where-used",
    category: "Productivity",
    title: "Where is this used?",
    description: "Find where a symbol or file path is referenced in the codebase.",
    inputs: [{ key: "symbol_or_path", label: "Symbol or file path", placeholder: "e.g. fetchData or src/utils.js" }],
    defaultInputs: { symbol_or_path: "" },
    apiCall: (api, { repoId, inputs }) => api.whereUsed(repoId, (inputs.symbol_or_path || "").trim()),
  },
  {
    id: "key-takeaways",
    category: "Knowledge",
    title: "Key takeaways",
    description: "5-bullet summary for new joiners.",
    inputs: [],
    defaultInputs: {},
    apiCall: (api, { repoId }) => api.getKeyTakeaways(repoId),
  },
  {
    id: "one-slide",
    category: "Simplify",
    title: "One-slide architecture",
    description: "Summarize architecture to one slide with bullets and diagram.",
    inputs: [],
    defaultInputs: {},
    apiCall: (api, { repoId }) => api.getOneSlideArchitecture(repoId),
  },
  {
    id: "critical-path",
    category: "Simplify",
    title: "Critical path",
    description: "Steps from app start to a feature.",
    inputs: [{ key: "feature", label: "Feature description", placeholder: "e.g. main user flow" }],
    defaultInputs: { feature: "main user flow" },
    apiCall: (api, { repoId, inputs }) => api.getCriticalPath(repoId, inputs.feature || "main user flow"),
  },
  {
    id: "workflow",
    category: "Simplify",
    title: "Workflow minimap",
    description: "Step-by-step flow (e.g. user login).",
    inputs: [{ key: "flow_name", label: "Flow name", placeholder: "e.g. user login" }],
    defaultInputs: { flow_name: "user login" },
    apiCall: (api, { repoId, inputs }) => api.getWorkflow(repoId, inputs.flow_name || "user login"),
  },
  {
    id: "compare-repos",
    category: "Simplify",
    title: "Compare with another repo",
    description: "Compare current repo with a GitHub URL.",
    inputs: [{ key: "other_github_url", label: "Other repo URL", placeholder: "https://github.com/owner/repo" }],
    defaultInputs: { other_github_url: "" },
    apiCall: (api, { repoId, inputs }) => api.compareRepos(repoId, (inputs.other_github_url || "").trim()),
  },
  {
    id: "review",
    category: "Learning",
    title: "Review (spaced repetition)",
    description: "Concepts to review from your learning path.",
    inputs: [],
    defaultInputs: {},
    apiCall: (api, { userId, repoId }) => api.getReview(userId, repoId),
  },
  {
    id: "digest",
    category: "Learning",
    title: "Digest",
    description: "Your learning summary and suggested next step.",
    inputs: [],
    defaultInputs: {},
    apiCall: (api, { userId }) => api.getDigest(userId),
  },
  {
    id: "knowledge-map",
    category: "Knowledge",
    title: "Knowledge map",
    description: "Who owns what (component to suggested role).",
    inputs: [],
    defaultInputs: {},
    apiCall: (api, { repoId }) => api.getKnowledgeMap(repoId),
  },
];

/** Tool IDs included in "Run all" / "Generate report" (repo-scoped, high value). */
export const REPORT_TOOL_IDS = [
  "key-takeaways",
  "one-slide",
  "runbook",
  "critical-path",
  "knowledge-map",
];

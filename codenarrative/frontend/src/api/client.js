// In dev use relative /api so Vite proxy forwards to API Gateway (no CORS, single source of URL in vite.config).
// In production use VITE_API_BASE so requests go to the deployed API. If not set, use default.
let API_BASE = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_BASE || "https://e14945kjl2.execute-api.us-east-1.amazonaws.com/Prod");
if (API_BASE.startsWith("http") && !/\/api\/?$/.test(API_BASE)) {
  API_BASE = API_BASE.replace(/\/?$/, "") + "/api";
}
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

async function loadMock(path, options) {
  const key = path.replace(/^\//, "").replace(/\//g, "_");
  const body = options.body ? (() => { try { return JSON.parse(options.body); } catch { return undefined; } })() : undefined;
  if (path.includes("simulate-impact")) {
    const fallback = await import("../mocks/fallback.mock.js");
    return fallback.default(path, body);
  }
  if (path.startsWith("/video/")) {
    const fallback = await import("../mocks/fallback.mock.js");
    return fallback.default(path, body);
  }
  if (path.startsWith("/repos/")) {
    try {
      const m = await import("../mocks/analyze.mock.js");
      return m.default();
    } catch {
      const fallback = await import("../mocks/fallback.mock.js");
      return fallback.default(path, body);
    }
  }
  try {
    const mockModule = await import(`../mocks/${key}.mock.js`);
    return mockModule.default(body);
  } catch {
    const fallback = await import("../mocks/fallback.mock.js");
    return fallback.default(path, body);
  }
}

const FRIENDLY_SERVER_ERROR = "Server error. Check your connection and API URL, or try again.";
const RETRYABLE_STATUSES = [502, 503, 504];

async function request(path, options = {}) {
  if (USE_MOCKS) {
    return loadMock(path, options);
  }

  const attempt = async (isRetry = false) => {
    let res;
    try {
      res = await fetch(API_BASE + path, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers
        },
        ...(options.body && { body: options.body })
      });
    } catch (err) {
      throw new Error(FRIENDLY_SERVER_ERROR);
    }

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      const is5xx = res.status >= 500;
      const retryable = !isRetry && RETRYABLE_STATUSES.includes(res.status);
      if (retryable) {
        await new Promise((r) => setTimeout(r, 2000));
        return attempt(true);
      }
      let message = is5xx ? FRIENDLY_SERVER_ERROR : (text || `Request failed with ${res.status}`);
      if (!is5xx) {
        if (data.error) message = data.error;
        if (data.message && data.message !== data.error) message = message ? `${message}: ${data.message}` : data.message;
        if (data.hint) message = message ? `${message} ${data.hint}` : data.hint;
      }
      throw new Error(message);
    }

    return data;
  };

  return attempt(false);
}

export const api = {
  analyzeRepo: (githubUrl) =>
    request("/analyze", {
      method: "POST",
      body: JSON.stringify({ github_url: githubUrl })
    }),
  getRepo: (repoId) => request(`/repos/${repoId}`),
  getFileContent: (repoId, filePath) =>
    request(`/repos/${repoId}/files?path=${encodeURIComponent(filePath)}`),
  getRepoDashboard: (repoId) => request(`/repos/${repoId}/dashboard`),
  simulateImpact: (repoId, scenario) =>
    request(`/repos/${repoId}/simulate-impact`, {
      method: "POST",
      body: JSON.stringify({ scenario })
    }),
  matchDevelopers: (repoId, teamProfiles) =>
    request("/match-developers", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, team_profiles: teamProfiles })
    }),
  archaeology: (repoId) =>
    request("/archaeology", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId })
    }),
  therapy: (repoId, moduleNames) =>
    request("/therapy", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, module_names: moduleNames || undefined })
    }),
  reality: (repoId, showType) =>
    request("/reality", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, show_type: showType || undefined })
    }),
  pokemon: (repoId) =>
    request("/pokemon", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId })
    }),
  videoStart: (repoId, videoType = "documentary", prompts) =>
    request("/video/start", {
      method: "POST",
      body: JSON.stringify({
        repo_id: repoId,
        video_type: videoType,
        prompts: prompts || undefined
      })
    }),
  videoStatus: (jobId) => request(`/video/status/${jobId}`),
  generateLearningPath: ({ repoId, experienceLevel, background, userId, durationDays }) =>
    request("/learning-path", {
      method: "POST",
      body: JSON.stringify({
        repo_id: repoId,
        experience_level: experienceLevel,
        background,
        user_id: userId,
        duration_days: durationDays ?? 14
      })
    }),
  askQuestion: ({ repoId, question }) =>
    request("/qa", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, question })
    }),
  explainCode: (payload) =>
    request("/explain", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  explainLine: (payload) =>
    request("/explain-line", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  glossary: (payload) =>
    request("/glossary", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getRunbook: (repoId) =>
    request("/runbook", { method: "POST", body: JSON.stringify({ repo_id: repoId }) }),
  whereUsed: (repoId, symbolOrPath) =>
    request("/where-used", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, symbol_or_path: symbolOrPath })
    }),
  testFeedback: (repoId, payload) =>
    request("/test-feedback", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, ...payload })
    }),
  getOneSlideArchitecture: (repoId) =>
    request("/one-slide-architecture", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId })
    }),
  getCriticalPath: (repoId, feature) =>
    request("/critical-path", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, feature: feature || "main user flow" })
    }),
  getWorkflow: (repoId, flowName) =>
    request("/workflow", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, flow_name: flowName || "user login" })
    }),
  compareRepos: (repoId, otherGithubUrl) =>
    request("/compare-repos", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, other_github_url: otherGithubUrl })
    }),
  getKeyTakeaways: (repoId) =>
    request("/key-takeaways", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId })
    }),
  getReview: (userId, repoId) =>
    request(`/review?user_id=${encodeURIComponent(userId)}&repo_id=${encodeURIComponent(repoId)}`),
  getDigest: (userId) =>
    request(`/digest?user_id=${encodeURIComponent(userId)}`),
  getKnowledgeMap: (repoId) =>
    request(`/knowledge-map?repo_id=${encodeURIComponent(repoId)}`),
  getArchitecture: (repoId) =>
    request("/architecture", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId })
    }),
  getProgress: (userId, repoId) => request(`/progress/${userId}/${repoId}`),
  updateProgress: (payload) =>
    request("/progress/update", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  saveQuizScore: (payload) =>
    request("/progress/quiz-score", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  generateTests: (payload) =>
    request("/tests/generate", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  listTests: (repoId) => request(`/tests/${repoId}`),
  reviewPR: ({ prUrl, repoId }) =>
    request("/pr-review", {
      method: "POST",
      body: JSON.stringify({ pr_url: prUrl, repo_id: repoId || undefined }),
    }),
};

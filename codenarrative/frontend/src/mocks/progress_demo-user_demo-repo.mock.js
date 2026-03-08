export default function progressMock() {
  const completedDays = 3;
  const quizAverage = 0.8;
  const remainingDays = 14 - completedDays;
  const timeToMastery = Math.round(remainingDays * (1 + (1 - quizAverage)));

  return Promise.resolve({
    user_id: "demo-user",
    repo_id: "demo-repo",
    learning_path_progress: [
      { day: 1, completed_at: "2026-02-20T10:00:00Z" },
      { day: 2, completed_at: "2026-02-21T10:00:00Z" },
      { day: 3, completed_at: "2026-02-22T10:00:00Z" }
    ],
    quiz_scores: [
      { day: 1, score: 0.7, created_at: "2026-02-20T11:00:00Z" },
      { day: 2, score: 0.8, created_at: "2026-02-21T11:00:00Z" },
      { day: 3, score: 0.9, created_at: "2026-02-22T11:00:00Z" }
    ],
    files_visited: [
      "src/App.jsx",
      "src/main.jsx",
      "src/server/index.js",
      "src/server/auth.js"
    ],
    concepts_mastered: [
      "Routing",
      "Component composition",
      "API integration",
      "Authentication"
    ],
    streak_days: 3,
    last_active: "2026-02-22T11:00:00Z",
    achievements: [
      "First Question Asked",
      "First Test Generated",
      "Week 1 Completed"
    ],
    derived: {
      quiz_average: quizAverage,
      completed_days: completedDays,
      time_to_mastery: timeToMastery
    }
  });
}


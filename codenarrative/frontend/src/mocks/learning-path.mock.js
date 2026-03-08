export default function learningPathMock(body) {
  const days = [];
  for (let i = 1; i <= 14; i += 1) {
    days.push({
      day: i,
      title: i <= 7 ? `Foundation Day ${i}` : `Deep Dive Day ${i - 7}`,
      goal:
        i <= 7
          ? "Understand core structure and main flows."
          : "Dive into advanced features and edge cases.",
      files_to_read: i <= 7 ? ["src/App.jsx", "src/main.jsx"] : ["src/server/index.js"],
      task:
        i === 1
          ? "Run the app locally and trace the main request flow."
          : "Implement or refactor a small feature related to today's focus.",
      concepts: i <= 7 ? ["routing", "components"] : ["testing", "error handling"],
      estimated_minutes: 45,
      resources: ["React docs", "Express guides"]
    });
  }

  return Promise.resolve({
    repo_id: body?.repo_id || "demo-repo",
    user_id: body?.user_id || "demo-user",
    learning_path: days
  });
}


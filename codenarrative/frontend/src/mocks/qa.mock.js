export default function qaMock(body) {
  const question = body?.question || "Where is the authentication logic?";
  return Promise.resolve({
    answer: `You asked: **${question}**.\n\nIn this mock repo, authentication is handled in \`src/server/auth.js\`, where JWT tokens are verified and user sessions are loaded.`,
    referenced_files: [
      {
        file_path: "src/server/auth.js",
        relevant_lines: "10-80",
        snippet: "export function requireAuth(req, res, next) { /* ... */ }"
      }
    ],
    follow_up_questions: [
      "How are permissions and roles enforced?",
      "Where are user credentials stored?",
      "How can I add a new authentication provider?"
    ],
    quiz: {
      question: "Which file is responsible for verifying JWT tokens?",
      options: ["src/App.jsx", "src/server/auth.js", "src/main.jsx", "README.md"],
      correct_answer: "B",
      explanation: "Authentication concerns live in the backend under src/server."
    }
  });
}


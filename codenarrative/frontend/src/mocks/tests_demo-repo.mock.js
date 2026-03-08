export default function testsListMock() {
  return Promise.resolve({
    repo_id: "demo-repo",
    tests: [
      {
        test_id: "t1",
        file_path: "src/server/index.js",
        function_name: "handler",
        language: "javascript",
        created_at: "2026-02-22T11:00:00Z"
      }
    ]
  });
}


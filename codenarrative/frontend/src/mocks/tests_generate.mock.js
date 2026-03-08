export default function testsGenerateMock(body) {
  const filePath = body?.file_path || "src/server/index.js";
  const functionNames = body?.function_names || ["handler"];

  return Promise.resolve({
    repo_id: body?.repo_id || "demo-repo",
    file_path: filePath,
    tests: functionNames.map((name, idx) => ({
      function_name: name,
      language: filePath.endsWith(".py") ? "python" : "javascript",
      test_code:
        filePath.endsWith(".py")
          ? `import pytest\n\nfrom app import ${name}\n\n\ndef test_${name}_happy_path():\n    assert ${name}(1, 2) == 3\n`
          : `import { ${name} } from "../${filePath}";\n\ntest("${name} happy path", () => {\n  expect(${name}(1, 2)).toBe(3);\n});\n`,
      documentation: {
        purpose: `Auto-generated tests for ${name}.`,
        inputs: [{ param: "a", type: "number", description: "First operand." }],
        outputs: {
          type: "number",
          description: "The computed result."
        },
        business_logic:
          "Ensures the core arithmetic logic behaves correctly for valid and edge case inputs.",
        edge_cases: ["zero values", "negative numbers", "large numbers"],
        dependencies: ["standard library only"]
      }
    }))
  });
}


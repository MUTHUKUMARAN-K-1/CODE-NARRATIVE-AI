export default function architectureMock() {
  return Promise.resolve({
    system_diagram_mermaid: `flowchart TD
  browser[Browser] --> frontend[React SPA]
  frontend --> apiGateway[API Gateway]
  apiGateway --> repoLambda[Repo Analysis Lambda]
  apiGateway --> lpLambda[Learning Path Lambda]
  apiGateway --> qaLambda[Smart Q&A Lambda]
  apiGateway --> archLambda[Architecture Lambda]
  repoLambda --> reposTable[DynamoDB Repos]
  lpLambda --> usersTable[DynamoDB Users]
  qaLambda --> reposTable
  archLambda --> reposTable
  repoLambda --> github[GitHub API]
  allLambdas[All Lambdas] --> bedrock[Bedrock Claude Sonnet]`,
    data_flow_mermaid: `sequenceDiagram
  participant Dev as Developer
  participant UI as CodeNarrative UI
  participant API as API Gateway
  participant Repo as RepoAnalysis Lambda
  participant GH as GitHub
  participant BR as Bedrock

  Dev->>UI: Click "Analyze"
  UI->>API: POST /api/analyze
  API->>Repo: Invoke Lambda
  Repo->>GH: Fetch repo metadata and tree
  Repo->>BR: Analyze structure and key files
  BR-->>Repo: JSON summary
  Repo-->>API: repo_id + analysis
  API-->>UI: Analysis payload`,
    dependency_mermaid: `graph LR
  App["src/App.jsx"] --> Dashboard["src/components/Dashboard.jsx"]
  App --> RepoAnalysis["src/components/RepoAnalysis.jsx"]
  App --> LearningPath["src/components/LearningPath.jsx"]
  RepoAnalysis --> ApiClient["src/api/client.js"]
  LearningPath --> ApiClient
  SmartQA["src/components/SmartQA.jsx"] --> ApiClient
  Architecture["src/components/ArchitectureMap.jsx"] --> ApiClient`,
    components: [
      {
        name: "Frontend",
        type: "React SPA",
        description: "User-facing onboarding experience and dashboards.",
        files: ["src/App.jsx", "src/components/Dashboard.jsx"]
      },
      {
        name: "Repo Analysis Lambda",
        type: "AWS Lambda",
        description: "Fetches GitHub metadata and summarizes the codebase.",
        files: ["backend/handlers/repo_analysis_handler.py"]
      }
    ],
    key_patterns: ["Serverless microservices", "Event-driven Lambdas", "CQRS for reads"]
  });
}


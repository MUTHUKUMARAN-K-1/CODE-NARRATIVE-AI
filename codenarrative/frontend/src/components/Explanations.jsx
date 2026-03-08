import React from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("python", python);

function Explanations() {
  const { repoAnalysis, currentRepo, addToast } = useAppContext();
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [code, setCode] = React.useState("// Select a file to view its code.");
  const [tab, setTab] = React.useState("beginner");
  const [expl, setExpl] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingFile, setLoadingFile] = React.useState(false);
  const [quiz, setQuiz] = React.useState(null);
  const [quizLoading, setQuizLoading] = React.useState(false);
  const [quizReveal, setQuizReveal] = React.useState(false);
  const [persona, setPersona] = React.useState("");
  const [lineQuestion, setLineQuestion] = React.useState(null);
  const [lineQuestionLoading, setLineQuestionLoading] = React.useState(false);
  const [glossaryTerm, setGlossaryTerm] = React.useState("");
  const [glossaryLevel, setGlossaryLevel] = React.useState("beginner");
  const [glossaryResult, setGlossaryResult] = React.useState(null);
  const [glossaryLoading, setGlossaryLoading] = React.useState(false);

  const files = React.useMemo(() => {
    const tree = repoAnalysis?.file_tree ?? [];
    const list = Array.isArray(tree)
      ? tree.filter((f) => (f?.type === "file" || f?.type === "blob") && (f?.path || f?.file_path)).map((f) => f.path || f.file_path)
      : [];
    return list.length ? list : ["src/App.jsx", "src/main.jsx", "src/server/index.js"];
  }, [repoAnalysis]);

  const loadFile = async (filePath) => {
    setSelectedFile(filePath);
    setExpl(null);
    const repoId = repoAnalysis?.repo_id;
    if (!repoId) {
      setCode("// Select a repository (analyze one first) to load real file content.");
      return;
    }
    setLoadingFile(true);
    try {
      const res = await api.getFileContent(repoId, filePath);
      setCode(res.content ?? "");
    } catch {
      if (filePath.endsWith(".py")) {
        setCode(
          "def add(a, b):\n    return a + b\n\nif __name__ == '__main__':\n    print(add(1, 2))\n"
        );
      } else {
        setCode(
          "export function add(a, b) {\n  return a + b;\n}\n\nconsole.log(add(1, 2));\n"
        );
      }
      addToast({ message: "Could not load file from repo; showing placeholder." });
    } finally {
      setLoadingFile(false);
    }
  };

  const explain = async () => {
    if (!selectedFile) {
      addToast({ message: "Select a file first." });
      return;
    }
    setQuiz(null);
    setQuizReveal(false);
    setLineQuestion(null);
    try {
      setLoading(true);
      const payload = {
        repo_id: currentRepo?.id || repoAnalysis?.repo_id || "demo-repo",
        file_path: selectedFile,
        code_snippet: code
      };
      if (persona) payload.persona = persona;
      const res = await api.explainCode(payload);
      setExpl(res);
    } catch (err) {
      addToast({ message: `Failed to explain code: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const askAboutLine = async () => {
    const repoId = currentRepo?.id || repoAnalysis?.repo_id;
    if (!repoId || repoId === "demo-repo" || !selectedFile) {
      addToast({ message: "Select a repo and file first." });
      return;
    }
    const lines = code.split("\n");
    const lineNum = Math.min(Math.max(1, parseInt(lines.length / 2, 10) || 1), lines.length);
    const lineContent = lines[lineNum - 1] || "";
    const surrounding = lines.slice(Math.max(0, lineNum - 4), lineNum + 3).join("\n");
    setLineQuestion(null);
    setLineQuestionLoading(true);
    try {
      const res = await api.explainLine({
        repo_id: repoId,
        file_path: selectedFile,
        line_number: lineNum,
        line_content: lineContent,
        surrounding_context: surrounding
      });
      setLineQuestion(res);
    } catch (err) {
      addToast({ type: "error", message: err.message });
    } finally {
      setLineQuestionLoading(false);
    }
  };

  const lookupGlossary = async () => {
    const repoId = currentRepo?.id || repoAnalysis?.repo_id;
    if (!repoId || repoId === "demo-repo" || !glossaryTerm.trim()) {
      addToast({ message: "Enter a term and ensure a repo is selected." });
      return;
    }
    setGlossaryResult(null);
    setGlossaryLoading(true);
    try {
      const res = await api.glossary({
        repo_id: repoId,
        term: glossaryTerm.trim(),
        level: glossaryLevel
      });
      setGlossaryResult(res);
    } catch (err) {
      addToast({ type: "error", message: err.message });
    } finally {
      setGlossaryLoading(false);
    }
  };

  const level = expl?.[tab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cn-accent/10">
          <span className="material-symbols-outlined text-cn-accent" style={{ fontSize: 22 }}>auto_stories</span>
        </div>
        <div>
          <h1 className="page-title">Multilevel Explanations</h1>
          <p className="page-desc">Browse files and get beginner, intermediate, and expert explanations with quizzes.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.1fr,1.6fr] gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
          </CardHeader>
          {!repoAnalysis && (
            <p className="px-5 text-xs text-cn-muted font-medium">
              Run repo analysis to load this repo&apos;s files here.
            </p>
          )}
          <CardBody className="max-h-[28rem] overflow-y-auto space-y-0.5 p-0">
            {files.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => loadFile(f)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-mono transition-colors ${
                  f === selectedFile
                    ? "bg-cn-accent/10 text-cn-accent border-r-2 border-cn-accent"
                    : "text-cn-muted hover:bg-cn-surface-elevated hover:text-cn-text"
                }`}
              >
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 13 }}>description</span>
                <span className="truncate">{f}</span>
              </button>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-4 min-w-0 overflow-hidden">
          <Card>
            <CardHeader className="items-center justify-between flex-wrap gap-2">
              <CardTitle>{selectedFile ? (loadingFile ? "Loading…" : selectedFile) : "Code"}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded border border-cn-border bg-cn-surface px-2 py-1.5 text-xs text-cn-text"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  aria-label="Explain as"
                >
                  <option value="">Explain as: default</option>
                  <option value="new grad">New grad</option>
                  <option value="designer">Designer</option>
                  <option value="pm">PM</option>
                  <option value="staff">Staff engineer</option>
                </select>
                <Button
                  variant="primary"
                  className="text-xs"
                  onClick={explain}
                  disabled={loading}
                >
                  {loading ? "Explaining…" : "Explain"}
                </Button>
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={askAboutLine}
                  disabled={loading || lineQuestionLoading || !code.trim()}
                >
                  {lineQuestionLoading ? "Asking…" : "Ask about this line"}
                </Button>
              </div>
            </CardHeader>
            <CardBody className="max-h-64 overflow-auto text-xs">
              <SyntaxHighlighter
                language={selectedFile?.endsWith(".py") ? "python" : "javascript"}
                style={atomOneDark}
                customStyle={{ background: "transparent", fontSize: "11px" }}
              >
                {code}
              </SyntaxHighlighter>
            </CardBody>
            {lineQuestion && (
              <CardBody className="pt-0 border-t border-cn-border text-xs space-y-1">
                <p className="font-semibold text-cn-accent">Line explanation</p>
                <p>{lineQuestion.explanation}</p>
                {lineQuestion.in_this_repo && <p className="text-cn-muted">{lineQuestion.in_this_repo}</p>}
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Glossary</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Term (e.g. middleware)"
                  className="rounded border border-cn-border bg-cn-surface px-2 py-1.5 text-xs w-40"
                  value={glossaryTerm}
                  onChange={(e) => setGlossaryTerm(e.target.value)}
                />
                <select
                  className="rounded border border-cn-border bg-cn-surface px-2 py-1.5 text-xs"
                  value={glossaryLevel}
                  onChange={(e) => setGlossaryLevel(e.target.value)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
                <Button variant="outline" className="text-xs" onClick={lookupGlossary} disabled={glossaryLoading}>
                  {glossaryLoading ? "Looking up…" : "Look up"}
                </Button>
              </div>
              {glossaryResult && (
                <div className="text-xs space-y-1 pt-2 border-t border-cn-border">
                  <p>{glossaryResult.definition}</p>
                  {glossaryResult.in_this_repo && <p className="text-cn-muted">{glossaryResult.in_this_repo}</p>}
                  {glossaryResult.example && <p className="font-mono text-[11px]">{glossaryResult.example}</p>}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="items-center justify-between">
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTab("beginner")}
                  className={`px-3 py-1 rounded-full border ${
                    tab === "beginner"
                      ? "border-cn-success bg-cn-success-bg"
                      : "border-cn-border"
                  }`}
                >
                  🟢 Beginner
                </button>
                <button
                  type="button"
                  onClick={() => setTab("intermediate")}
                  className={`px-3 py-1 rounded-full border ${
                    tab === "intermediate"
                      ? "border-cn-warn bg-amber-500/10 dark:bg-amber-950/30"
                      : "border-cn-border"
                  }`}
                >
                  🟡 Intermediate
                </button>
                <button
                  type="button"
                  onClick={() => setTab("expert")}
                  className={`px-3 py-1 rounded-full border ${
                    tab === "expert"
                      ? "border-cn-danger bg-red-500/10 dark:bg-red-950/30"
                      : "border-cn-border"
                  }`}
                >
                  🔴 Expert
                </button>
              </div>
              <Button
                variant="outline"
                className="text-xs"
                onClick={async () => {
                  if (!level) {
                    addToast({ message: "Generate an explanation first to quiz on it." });
                    return;
                  }
                  const repoId = currentRepo?.id || repoAnalysis?.repo_id;
                  if (!repoId || repoId === "demo-repo") {
                    addToast({ message: "Select a real repo (analyze one first) to generate quiz." });
                    return;
                  }
                  setQuiz(null);
                  setQuizReveal(false);
                  setQuizLoading(true);
                  try {
                    const context = (level.key_takeaway || level.explanation || "").slice(0, 1500);
                    const res = await api.askQuestion({
                      repoId,
                      question: `Generate exactly one multiple-choice quiz question (4 options A–D) based on this explanation. Return your usual JSON with a "quiz" object: { question, options: [A, B, C, D], correct_answer, explanation }. Context to quiz on: ${context}`,
                    });
                    const q = res?.quiz;
                    if (q?.question && Array.isArray(q?.options)) {
                      setQuiz({
                        question: q.question,
                        options: q.options,
                        correct_answer: q.correct_answer,
                        explanation: q.explanation,
                      });
                    } else {
                      addToast({ message: "Quiz could not be generated; try again." });
                    }
                  } catch (err) {
                    addToast({ type: "error", message: err.message || "Failed to generate quiz." });
                  } finally {
                    setQuizLoading(false);
                  }
                }}
                disabled={quizLoading}
              >
                {quizLoading ? "Generating…" : "Generate quiz"}
              </Button>
            </CardHeader>
            <CardBody className="text-xs space-y-2 max-h-64 overflow-auto">
              {!expl && !loading && (
                <p className="text-cn-muted">
                  Click &quot;Explain&quot; to generate multilevel explanations for the
                  selected code snippet.
                </p>
              )}
              {loading && <Skeleton className="h-24 w-full" />}
              {level && (
                <>
                  <p className="font-semibold">{level.key_takeaway || "Key points"}</p>
                  <p className="text-cn-muted">{level.explanation}</p>
                  {level.analogy && (
                    <p className="italic text-cn-muted">Analogy: {level.analogy}</p>
                  )}
                  {level.patterns_used && (
                    <div>
                      <p className="font-semibold mt-2 text-[11px]">Patterns used</p>
                      <ul className="list-disc pl-4">
                        {level.patterns_used.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {level.potential_issues && (
                    <p className="text-cn-muted mt-2">
                      Potential issues: {level.potential_issues}
                    </p>
                  )}
                  {level.optimization_tips && (
                    <p className="text-cn-muted mt-1">
                      Optimization tips: {level.optimization_tips}
                    </p>
                  )}
                  {quiz && (
                    <div className="mt-4 pt-4 border-t border-cn-border space-y-2">
                      <p className="font-semibold text-cn-accent">Quiz</p>
                      <p className="text-cn-text">{quiz.question}</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {quiz.options.map((opt, i) => (
                          <li key={i} className="text-cn-muted">{opt}</li>
                        ))}
                      </ul>
                      {quizReveal ? (
                        <div className="text-cn-success text-xs space-y-1">
                          <p><strong>Correct:</strong> {quiz.correct_answer}</p>
                          {quiz.explanation && <p>{quiz.explanation}</p>}
                        </div>
                      ) : (
                        <Button variant="outline" className="text-xs mt-2" onClick={() => setQuizReveal(true)}>
                          Reveal answer
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Explanations;


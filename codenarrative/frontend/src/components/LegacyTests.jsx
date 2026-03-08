import React, { useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

function detectFunctions(filePath) {
  if (filePath?.endsWith(".py")) return ["process_order", "calculate_total"];
  return ["handler", "add"];
}

function LegacyTests() {
  const { repoAnalysis, currentRepo, addToast } = useAppContext();
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFunctions, setSelectedFunctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [testFeedback, setTestFeedback] = useState({});
  const [feedbackLoading, setFeedbackLoading] = useState(null);

  const candidateFiles = useMemo(() =>
    (repoAnalysis?.file_tree || [])
      .filter((f) => (f.type === "file" || f.type === "blob") && (f.path || f.file_path || "").match(/\.(py|js|ts|java)$/))
      .map((f) => f.path || f.file_path) || ["src/server/index.js", "src/server/billing.py", "src/utils/math.ts"],
    [repoAnalysis]
  );

  const toggleFunction = (fn) => setSelectedFunctions((prev) => prev.includes(fn) ? prev.filter((f) => f !== fn) : [...prev, fn]);

  const generate = async () => {
    if (!selectedFile || selectedFunctions.length === 0) { addToast({ message: "Select at least one function." }); return; }
    try {
      setLoading(true);
      const res = await api.generateTests({ repo_id: currentRepo?.id || "demo-repo", file_path: selectedFile, function_names: selectedFunctions });
      setGenerated(res);
      addToast({ message: "Tests generated." });
    } catch (err) { addToast({ message: `Failed: ${err.message}` }); }
    finally { setLoading(false); }
  };

  const handleCopy = (code) => navigator.clipboard.writeText(code).then(() => addToast({ message: "Copied!" }));
  const handleDownload = (code, name) => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${name}.test.${selectedFile?.endsWith(".py") ? "py" : "js"}`; a.click();
    URL.revokeObjectURL(url);
  };

  const fetchFeedback = async (fn, testCode) => {
    const repoId = currentRepo?.id;
    if (!repoId || repoId === "demo-repo") return;
    setFeedbackLoading(fn);
    try {
      const res = await api.testFeedback(repoId, { test_code: testCode, function_name: fn });
      setTestFeedback((prev) => ({ ...prev, [fn]: res }));
    } catch (err) { addToast({ type: "error", message: err.message }); }
    finally { setFeedbackLoading(null); }
  };

  const functions = selectedFile ? detectFunctions(selectedFile) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cn-danger/10">
          <span className="material-symbols-outlined text-cn-danger" style={{ fontSize: 22 }}>science</span>
        </div>
        <div>
          <h1 className="page-title">Legacy Test Generator</h1>
          <p className="page-desc">Auto-generate unit tests and living documentation for legacy code functions.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px,1fr] gap-4 items-start">
        {/* File list */}
        <Card>
          <CardHeader><CardTitle>Testable Files</CardTitle></CardHeader>
          <CardBody className="max-h-[28rem] overflow-y-auto space-y-0.5 p-0">
            {candidateFiles.map((f) => (
              <button key={f} type="button"
                onClick={() => { setSelectedFile(f); setSelectedFunctions([]); setGenerated(null); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-mono transition-colors ${
                  f === selectedFile ? "bg-cn-accent/10 text-cn-accent border-r-2 border-cn-accent" : "text-cn-muted hover:bg-cn-surface-elevated hover:text-cn-text"
                }`}>
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 13 }}>
                  {f.endsWith(".py") ? "code" : f.endsWith(".ts") ? "javascript" : "description"}
                </span>
                <span className="truncate">{f}</span>
              </button>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-4">
          {/* Function selector */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{selectedFile ? selectedFile.split("/").pop() : "Select a File"}</CardTitle>
                {selectedFile && <p className="text-xs text-cn-muted mt-0.5">{selectedFunctions.length} function{selectedFunctions.length !== 1 ? "s" : ""} selected</p>}
              </div>
              <Button variant="primary" onClick={generate} disabled={loading || !selectedFile || selectedFunctions.length === 0}>
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span> Generating…</>
                ) : (
                  <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>science</span> Generate Tests</>
                )}
              </Button>
            </CardHeader>
            <CardBody>
              {!selectedFile && (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-cn-muted mb-2" style={{ fontSize: 36 }}>folder_open</span>
                  <p className="text-sm text-cn-muted">Select a file from the list to see detectable functions.</p>
                </div>
              )}
              {selectedFile && (
                <div className="space-y-2">
                  {functions.length === 0
                    ? <p className="text-xs text-cn-muted">No functions detected via heuristics.</p>
                    : functions.map((fn) => (
                        <label key={fn} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-cn-border hover:border-cn-accent/40 hover:bg-cn-accent/5 cursor-pointer transition-all">
                          <input type="checkbox" checked={selectedFunctions.includes(fn)} onChange={() => toggleFunction(fn)}
                            className="h-4 w-4 rounded border-cn-border accent-cn-accent cursor-pointer" />
                          <span className="font-mono text-sm text-cn-text">{fn}</span>
                          <span className="ml-auto text-[10px] text-cn-muted">function</span>
                        </label>
                      ))
                  }
                  {loading && <Skeleton className="h-16 w-full mt-2" />}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Generated tests */}
          {generated && generated.tests?.map((t) => (
            <Card key={t.function_name}>
              <CardHeader>
                <div>
                  <CardTitle>{t.function_name}</CardTitle>
                  <span className="text-[10px] text-cn-success font-semibold uppercase tracking-wide">Generated</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleCopy(t.test_code)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span> Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownload(t.test_code, t.function_name)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
                  </Button>
                  {currentRepo?.id && currentRepo.id !== "demo-repo" && (
                    <Button size="sm" variant="outline" onClick={() => fetchFeedback(t.function_name, t.test_code)} disabled={feedbackLoading === t.function_name}>
                      {feedbackLoading === t.function_name ? "Loading…" : "Why might fail?"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardBody className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-cn-muted uppercase tracking-wide mb-2">Generated Tests</p>
                  <div className="rounded-xl overflow-auto max-h-56 bg-[#1e1e1e] border border-cn-border">
                    <SyntaxHighlighter
                      language={selectedFile?.endsWith(".py") ? "python" : "javascript"}
                      style={atomOneDark}
                      customStyle={{ background: "transparent", fontSize: "11px", margin: 0, padding: "12px" }}
                    >{t.test_code}</SyntaxHighlighter>
                  </div>
                </div>
                <div className="space-y-3 text-xs">
                  <p className="text-xs font-semibold text-cn-muted uppercase tracking-wide">Living Documentation</p>
                  <p className="text-cn-text">{t.documentation?.purpose}</p>
                  {t.documentation?.edge_cases?.length > 0 && (
                    <div>
                      <p className="font-semibold text-cn-muted mb-1">Edge Cases</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-cn-text">{t.documentation.edge_cases.map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                  )}
                  {testFeedback[t.function_name]?.reasons?.length > 0 && (
                    <div className="p-3 rounded-xl bg-cn-warn/10 border border-cn-warn/20">
                      <p className="font-semibold text-cn-warn text-[11px] mb-1">Why This Might Fail</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-cn-warn">{testFeedback[t.function_name].reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LegacyTests;

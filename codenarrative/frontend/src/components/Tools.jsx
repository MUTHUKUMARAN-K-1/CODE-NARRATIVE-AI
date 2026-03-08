import React from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { api } from "../api/client.js";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { ToolCard } from "./tools/ToolCard.jsx";
import { TOOLS, CATEGORIES, REPORT_TOOL_IDS } from "./tools/toolRegistry.js";

const OPEN_STORAGE_KEY = "codenarrative-tools-open";
const PINNED_STORAGE_KEY = "codenarrative-tools-pinned";
const MAX_PINNED = 5;

function loadSet(key, fallback = []) {
  try {
    const s = localStorage.getItem(key);
    if (s) {
      const a = JSON.parse(s);
      return new Set(Array.isArray(a) ? a : []);
    }
  } catch (_) {}
  return new Set(fallback);
}

function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch (_) {}
}

export default function Tools() {
  const { currentRepo, userProfile } = useAppContext();
  const repoId = currentRepo?.id;
  const userId = userProfile?.userId || "demo-user";
  const noRepo = !repoId || repoId === "demo-repo";

  const [openIds, setOpenIds] = React.useState(() => loadSet(OPEN_STORAGE_KEY));
  const [pinnedIds, setPinnedIds] = React.useState(() => loadSet(PINNED_STORAGE_KEY));
  const [category, setCategory] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [runAllTrigger, setRunAllTrigger] = React.useState(0);
  const [runAllProgress, setRunAllProgress] = React.useState(null);
  const [reportView, setReportView] = React.useState(null);

  const handleRunAll = React.useCallback(() => {
    setRunAllProgress({ current: null, completed: 0, total: REPORT_TOOL_IDS.length });
    setRunAllTrigger((r) => r + 1);
  }, []);

  const handleRunAllStart = React.useCallback((toolId) => {
    setRunAllProgress((p) => (p ? { ...p, current: toolId } : null));
  }, []);

  const handleRunAllEnd = React.useCallback(() => {
    setRunAllProgress((p) => {
      if (!p) return null;
      const next = { ...p, completed: p.completed + 1, current: null };
      if (next.completed >= next.total) setTimeout(() => setRunAllProgress(null), 2000);
      return next;
    });
  }, []);

  React.useEffect(() => {
    saveSet(OPEN_STORAGE_KEY, openIds);
  }, [openIds]);
  React.useEffect(() => {
    saveSet(PINNED_STORAGE_KEY, pinnedIds);
  }, [pinnedIds]);

  const toggleOpen = React.useCallback((id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePin = React.useCallback((id) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_PINNED) next.add(id);
      return next;
    });
  }, []);

  const searchLower = search.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    return TOOLS.filter((t) => {
      const matchCategory = category === "all" || t.category === category;
      const matchSearch =
        !searchLower ||
        t.title.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower);
      return matchCategory && matchSearch;
    });
  }, [category, searchLower]);

  const pinnedTools = TOOLS.filter((t) => pinnedIds.has(t.id));
  const otherTools = filtered.filter((t) => !pinnedIds.has(t.id));
  const searchInputRef = React.useRef(null);

  React.useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-cn-accent/30">
        <CardHeader>
          <CardTitle className="text-cn-accent">Developer tools</CardTitle>
          <p className="text-xs text-cn-muted mt-1">
            Runbook, where-used, key takeaways, one-slide architecture, critical path, workflow, compare repos, review, digest, knowledge map.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search tools… (Ctrl+K)"
              className="rounded-lg border border-cn-border bg-cn-surface px-3 py-2 text-sm w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search tools"
            />
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    category === c.id ? "border-cn-accent bg-cn-accent/15 text-cn-accent" : "border-cn-border hover:bg-cn-surface-elevated"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {runAllProgress && (
            <p className="text-xs text-cn-muted">
              Running: {runAllProgress.current ? (TOOLS.find((t) => t.id === runAllProgress.current)?.title || runAllProgress.current) : "…"} ({runAllProgress.completed}/{runAllProgress.total})
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={noRepo || (runAllProgress != null && runAllProgress.completed < runAllProgress.total)}
              onClick={handleRunAll}
            >
              Run all (recommended)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={noRepo}
              onClick={() => setReportView("generating")}
            >
              Generate report
            </Button>
          </div>
        </CardBody>
      </Card>

      {noRepo && (
        <p className="text-sm text-cn-muted">
          Select or analyze a repository from the Dashboard to use these tools.
        </p>
      )}

      {pinnedTools.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-cn-muted uppercase tracking-wide">Pinned</h2>
          <div className="space-y-3">
            {pinnedTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                repoId={repoId}
                userId={userId}
                noRepo={noRepo}
                isOpen={openIds.has(tool.id)}
                onToggleOpen={toggleOpen}
                isPinned={true}
                onTogglePin={togglePin}
                runAllTrigger={REPORT_TOOL_IDS.includes(tool.id) ? runAllTrigger : undefined}
                onRunStart={REPORT_TOOL_IDS.includes(tool.id) ? handleRunAllStart : undefined}
                onRunEnd={REPORT_TOOL_IDS.includes(tool.id) ? handleRunAllEnd : undefined}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {pinnedTools.length > 0 && <h2 className="text-xs font-semibold text-cn-muted uppercase tracking-wide">All tools</h2>}
        <div className="space-y-3">
          {otherTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              repoId={repoId}
              userId={userId}
              noRepo={noRepo}
              isOpen={openIds.has(tool.id)}
              onToggleOpen={toggleOpen}
              isPinned={pinnedIds.has(tool.id)}
              onTogglePin={togglePin}
              runAllTrigger={REPORT_TOOL_IDS.includes(tool.id) ? runAllTrigger : undefined}
              onRunStart={REPORT_TOOL_IDS.includes(tool.id) ? handleRunAllStart : undefined}
              onRunEnd={REPORT_TOOL_IDS.includes(tool.id) ? handleRunAllEnd : undefined}
            />
          ))}
        </div>
      </div>

      {reportView != null && (
        <ReportModal
          onClose={() => setReportView(null)}
          repoId={repoId}
          userId={userId}
          noRepo={noRepo}
          onGenerated={() => setReportView("ready")}
        />
      )}
    </div>
  );
}

function reportToMarkdown(results) {
  let s = "# CodeNarrative Tools Report\n\n";
  REPORT_TOOL_IDS.forEach((id) => {
    const tool = TOOLS.find((t) => t.id === id);
    const r = results[id];
    if (!tool || !r) return;
    s += `## ${tool.title}\n\n`;
    if (r.error) s += `Error: ${r.error}\n\n`;
    else if (r.data) s += sectionToMarkdown(id, r.data) + "\n\n";
  });
  return s;
}

function sectionToMarkdown(toolId, result) {
  switch (toolId) {
    case "runbook":
      let s = "";
      if (result.run_locally?.length) s += "### Run locally\n\n" + result.run_locally.map((x, i) => `${i + 1}. ${x}`).join("\n") + "\n\n";
      if (result.run_tests?.length) s += "### Run tests\n\n" + result.run_tests.map((x, i) => `${i + 1}. ${x}`).join("\n");
      return s;
    case "key-takeaways":
      return (result.bullets || []).map((b) => `- ${b}`).join("\n");
    case "one-slide":
      s = (result.bullets || []).map((b) => `- ${b}`).join("\n");
      if (result.one_diagram_mermaid) s += "\n\n```mermaid\n" + result.one_diagram_mermaid + "\n```";
      return s;
    case "critical-path":
      s = (result.summary || "") + "\n\n";
      if (result.steps?.length) s += result.steps.map((x, i) => `${i + 1}. **${x.file_or_component}** — ${x.one_line}`).join("\n");
      return s;
    case "knowledge-map":
      s = "| Component | Owner | Reason |\n|-----------|-------|--------|\n";
      (result.map || []).forEach((m) => { s += `| ${m.component} | ${m.suggested_owner_role} | ${m.one_line_reason} |\n`; });
      return s;
    default:
      return JSON.stringify(result, null, 2);
  }
}

function ReportModal({ onClose, repoId, userId, noRepo, onGenerated }) {
  const [step, setStep] = React.useState("generating");
  const [results, setResults] = React.useState({});
  const [currentTool, setCurrentTool] = React.useState("");

  React.useEffect(() => {
    if (noRepo || !repoId) return;
    let cancelled = false;
    const tools = TOOLS.filter((t) => REPORT_TOOL_IDS.includes(t.id));
    (async () => {
      const out = {};
      for (const tool of tools) {
        if (cancelled) break;
        setCurrentTool(tool.title);
        try {
          const inputs = tool.defaultInputs || {};
          const data = await tool.apiCall(api, { repoId, userId, inputs });
          out[tool.id] = { data, error: null };
        } catch (e) {
          out[tool.id] = { data: null, error: e.message };
        }
      }
      if (!cancelled) {
        setResults(out);
        setStep("ready");
        onGenerated?.();
      }
    })();
    return () => { cancelled = true; };
  }, [repoId, userId, noRepo, onGenerated]);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(reportToMarkdown(results));
  };

  const handleExport = () => {
    const blob = new Blob([reportToMarkdown(results)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codenarrative-tools-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (noRepo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-cn-surface border border-cn-border rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-cn-border flex items-center justify-between">
          <CardTitle className="text-sm">Tools report</CardTitle>
          <div className="flex items-center gap-2">
            {step === "ready" && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyMarkdown}>Copy as markdown</Button>
                <Button variant="outline" size="sm" onClick={handleExport}>Export .md</Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>Print</Button>
              </>
            )}
            <button type="button" className="text-cn-muted hover:text-cn-text p-1" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="p-4 overflow-auto flex-1">
          {step === "generating" && (
            <p className="text-sm text-cn-muted">Running: {currentTool || "…"}</p>
          )}
          {step === "ready" && (
            <div className="space-y-4">
              {REPORT_TOOL_IDS.map((id) => {
                const tool = TOOLS.find((t) => t.id === id);
                const r = results[id];
                if (!tool || !r) return null;
                return (
                  <div key={id}>
                    <h3 className="text-sm font-semibold mb-2">{tool.title}</h3>
                    {r.error ? <p className="text-xs text-cn-danger">{r.error}</p> : <ToolResult toolId={id} result={r.data} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolResult({ toolId, result }) {
  if (!result) return null;
  switch (toolId) {
    case "runbook":
      return (
        <div className="text-xs space-y-2">
          {result.run_locally?.length > 0 && <div><p className="font-semibold">Run locally</p><ol className="list-decimal pl-4">{result.run_locally.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
          {result.run_tests?.length > 0 && <div><p className="font-semibold">Run tests</p><ol className="list-decimal pl-4">{result.run_tests.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
        </div>
      );
    case "key-takeaways":
      return result.bullets?.length > 0 ? <ul className="list-disc pl-4 text-sm">{result.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul> : null;
    case "one-slide":
      return (
        <div className="text-xs space-y-2">
          <p className="font-semibold">{result.title}</p>
          {result.bullets?.length > 0 && <ul className="list-disc pl-4">{result.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
          {result.one_diagram_mermaid && <pre className="bg-cn-surface-elevated p-2 rounded text-[10px] overflow-auto">{result.one_diagram_mermaid}</pre>}
        </div>
      );
    case "critical-path":
      return result.steps?.length > 0 ? (
        <div className="text-xs"><p className="text-cn-muted mb-1">{result.summary}</p><ol className="list-decimal pl-4">{result.steps.map((s, i) => <li key={i}>{s.file_or_component} — {s.one_line}</li>)}</ol></div>
      ) : null;
    case "knowledge-map":
      return result.map?.length > 0 ? (
        <table className="text-xs w-full"><thead><tr className="border-b border-cn-border"><th className="text-left py-1">Component</th><th className="text-left py-1">Owner</th><th className="text-left py-1">Reason</th></tr></thead><tbody>
          {result.map.map((m, i) => <tr key={i} className="border-b border-cn-border/50"><td className="py-1">{m.component}</td><td className="py-1">{m.suggested_owner_role}</td><td className="py-1 text-cn-muted">{m.one_line_reason}</td></tr>)}
        </tbody></table>
      ) : null;
    default:
      return <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
  }
}

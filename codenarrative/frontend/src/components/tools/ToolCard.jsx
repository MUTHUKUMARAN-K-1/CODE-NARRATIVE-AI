import React from "react";
import { Card, CardHeader, CardTitle, CardBody } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { MermaidView } from "../MermaidView.jsx";
import { useToolRun } from "./useToolRun.js";
import { api } from "../../api/client.js";

function resultToMarkdown(toolId, result) {
  if (!result) return "";
  switch (toolId) {
    case "runbook":
      let s = "## Runbook\n\n";
      if (result.run_locally?.length) s += "### Run locally\n\n" + result.run_locally.map((x, i) => `${i + 1}. ${x}`).join("\n") + "\n\n";
      if (result.run_tests?.length) s += "### Run tests\n\n" + result.run_tests.map((x, i) => `${i + 1}. ${x}`).join("\n") + "\n\n";
      if (result.env_vars?.length) s += "### Env vars\n\n" + result.env_vars.map((v) => typeof v === "string" ? v : `- ${v.name}: ${v.description || ""}`).join("\n");
      return s;
    case "where-used":
      return `## Where is this used?\n\n${result.answer}\n\n${(result.likely_files || []).map((f) => `- ${f}`).join("\n")}`;
    case "key-takeaways":
      return "## Key takeaways\n\n" + (result.bullets || []).map((b) => `- ${b}`).join("\n");
    case "one-slide":
      s = `## ${result.title || "One-slide"}\n\n`;
      if (result.bullets?.length) s += result.bullets.map((b) => `- ${b}`).join("\n") + "\n\n";
      if (result.one_diagram_mermaid) s += "```mermaid\n" + result.one_diagram_mermaid + "\n```";
      return s;
    case "critical-path":
      s = `## Critical path\n\n${result.summary || ""}\n\n`;
      if (result.steps?.length) s += result.steps.map((x, i) => `${i + 1}. **${x.file_or_component}** — ${x.one_line}`).join("\n");
      return s;
    case "workflow":
      return "## Workflow\n\n" + (result.steps || []).map((x, i) => `${i + 1}. ${x.name}: ${x.file_or_location} — ${x.description}`).join("\n");
    case "compare-repos":
      s = "## Compare repos\n\n" + result.similarity + "\n\n### Differences\n\n" + (result.differences || []).map((d) => `- ${d}`).join("\n") + "\n\n**Recommendation:** " + (result.recommendation || "");
      return s;
    case "review":
      return "## Review\n\n" + (result.suggestions || []).map((x) => `- **${x.concept}**: ${x.recap}`).join("\n") + (result.message ? "\n\n" + result.message : "");
    case "digest":
      s = "## Digest\n\n" + result.summary + (result.suggested_next ? "\n\n**Next:** " + result.suggested_next : "");
      if (result.repos?.length) s += "\n\nRepos: " + result.repos.map((r) => `${r.name} (${r.days_completed}/${r.path_length})`).join(", ");
      return s;
    case "knowledge-map":
      s = "## Knowledge map\n\n| Component | Owner | Reason |\n|-----------|-------|--------|\n";
      (result.map || []).forEach((m) => { s += `| ${m.component} | ${m.suggested_owner_role} | ${m.one_line_reason} |\n`; });
      return s;
    default:
      return JSON.stringify(result, null, 2);
  }
}

function DefaultResult({ result, toolId }) {
  return <pre className="text-xs overflow-auto p-2 bg-cn-surface-elevated rounded">{JSON.stringify(result, null, 2)}</pre>;
}

function ToolResult({ toolId, result }) {
  if (!result) return null;
  switch (toolId) {
    case "runbook":
      return (
        <div className="text-xs space-y-2">
          {result.run_locally?.length > 0 && (
            <div>
              <p className="font-semibold">Run locally</p>
              <ol className="list-decimal pl-4">{result.run_locally.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
          )}
          {result.run_tests?.length > 0 && (
            <div>
              <p className="font-semibold">Run tests</p>
              <ol className="list-decimal pl-4">{result.run_tests.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
          )}
          {result.env_vars?.length > 0 && (
            <div>
              <p className="font-semibold">Env vars</p>
              <ul className="list-disc pl-4">{result.env_vars.map((v, i) => <li key={i}>{typeof v === "string" ? v : `${v.name}: ${v.description || ""}`}</li>)}</ul>
            </div>
          )}
        </div>
      );
    case "where-used":
      return (
        <div className="text-xs">
          <p className="text-cn-text">{result.answer}</p>
          {result.likely_files?.length > 0 && (
            <ul className="list-disc pl-4 mt-1 text-cn-muted">{result.likely_files.slice(0, 10).map((f, i) => <li key={i}>{f}</li>)}</ul>
          )}
        </div>
      );
    case "key-takeaways":
      return result.bullets?.length > 0 ? <ul className="list-disc pl-4 text-sm text-cn-text">{result.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul> : <DefaultResult result={result} toolId={toolId} />;
    case "one-slide":
      return (
        <div className="text-xs space-y-2">
          <p className="font-semibold">{result.title}</p>
          {result.bullets?.length > 0 && <ul className="list-disc pl-4">{result.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
          {result.one_diagram_mermaid && <MermaidView code={result.one_diagram_mermaid} />}
        </div>
      );
    case "critical-path":
      return result.steps?.length > 0 ? (
        <div className="text-xs">
          <p className="text-cn-muted mb-1">{result.summary}</p>
          <ol className="list-decimal pl-4 space-y-1">
            {result.steps.map((s, i) => (
              <li key={i}><span className="font-mono">{s.file_or_component}</span> — {s.one_line}</li>
            ))}
          </ol>
        </div>
      ) : <DefaultResult result={result} toolId={toolId} />;
    case "workflow":
      return result.steps?.length > 0 ? (
        <ol className="list-decimal pl-4 text-xs space-y-1">
          {result.steps.map((s, i) => (
            <li key={i}>{s.name}: {s.file_or_location} — {s.description}</li>
          ))}
        </ol>
      ) : <DefaultResult result={result} toolId={toolId} />;
    case "compare-repos":
      return (
        <div className="text-xs space-y-1">
          <p>{result.similarity}</p>
          {result.differences?.length > 0 && <ul className="list-disc pl-4">{result.differences.map((d, i) => <li key={i}>{d}</li>)}</ul>}
          <p className="text-cn-accent">{result.recommendation}</p>
        </div>
      );
    case "review":
      if (result.message && !result.suggestions?.length) return <p className="text-xs text-cn-muted">{result.message}</p>;
      return result.suggestions?.length > 0 ? (
        <ul className="list-disc pl-4 text-xs space-y-1">
          {result.suggestions.map((s, i) => (
            <li key={i}><strong>{s.concept}</strong>: {s.recap}</li>
          ))}
        </ul>
      ) : <DefaultResult result={result} toolId={toolId} />;
    case "digest":
      return (
        <div className="text-xs space-y-1">
          <p>{result.summary}</p>
          {result.suggested_next && <p className="text-cn-accent">Next: {result.suggested_next}</p>}
          {result.repos?.length > 0 && <p className="text-cn-muted">Repos: {result.repos.map((r) => `${r.name} (${r.days_completed}/${r.path_length})`).join(", ")}</p>}
        </div>
      );
    case "knowledge-map":
      return result.map?.length > 0 ? (
        <table className="text-xs w-full">
          <thead>
            <tr className="border-b border-cn-border">
              <th className="text-left py-1">Component</th>
              <th className="text-left py-1">Suggested owner</th>
              <th className="text-left py-1">Reason</th>
            </tr>
          </thead>
          <tbody>
            {result.map.map((m, i) => (
              <tr key={i} className="border-b border-cn-border/50">
                <td className="py-1">{m.component}</td>
                <td className="py-1">{m.suggested_owner_role}</td>
                <td className="py-1 text-cn-muted">{m.one_line_reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <DefaultResult result={result} toolId={toolId} />;
    default:
      return <DefaultResult result={result} toolId={toolId} />;
  }
}

export function ToolCard({
  tool,
  repoId,
  userId,
  noRepo,
  isOpen,
  onToggleOpen,
  isPinned,
  onTogglePin,
  runAllTrigger,
  onRunStart,
  onRunEnd,
}) {
  const [inputs, setInputs] = React.useState(tool.defaultInputs || {});
  const getInputs = React.useCallback(() => inputs, [inputs]);
  const { run, result, loading, error, clearResult } = useToolRun(tool.id, {
    api,
    repoId,
    userId,
    getInputs,
  });

  React.useEffect(() => {
    if (runAllTrigger > 0) {
      onRunStart?.(tool.id);
      run().finally(() => onRunEnd?.(tool.id));
    }
  }, [runAllTrigger, run, tool.id, onRunStart, onRunEnd]);

  const runDisabled =
    noRepo ||
    loading ||
    (tool.id === "where-used" && !(inputs.symbol_or_path || "").trim()) ||
    (tool.id === "compare-repos" && !(inputs.other_github_url || "").trim().startsWith("https://github.com/"));

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none flex items-center justify-between gap-2"
        onClick={() => onToggleOpen(tool.id)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-cn-muted shrink-0">{isOpen ? "▼" : "▶"}</span>
          <div className="min-w-0">
            <CardTitle className="text-sm">{tool.title}</CardTitle>
            <p className="text-[11px] text-cn-muted truncate">{tool.description}</p>
          </div>
        </div>
        {onTogglePin && (
          <button
            type="button"
            className="shrink-0 p-1.5 rounded hover:bg-cn-surface-elevated text-cn-muted hover:text-cn-text"
            onClick={(e) => { e.stopPropagation(); onTogglePin(tool.id); }}
            aria-label={isPinned ? "Unpin" : "Pin"}
          >
            {isPinned ? "📌" : "📍"}
          </button>
        )}
      </CardHeader>
      {isOpen && (
        <CardBody className="pt-0 space-y-3">
          {tool.inputs?.length > 0 && (
            <div className="space-y-2">
              {tool.inputs.map((inp) => (
                <div key={inp.key}>
                  {inp.label && <label className="block text-[11px] text-cn-muted mb-0.5">{inp.label}</label>}
                  <input
                    type="text"
                    placeholder={inp.placeholder}
                    className="w-full rounded-lg border border-cn-border bg-cn-surface px-3 py-2 text-sm"
                    value={inputs[inp.key] ?? ""}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [inp.key]: e.target.value }))}
                    disabled={noRepo}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={run} disabled={runDisabled}>
              {loading ? "Running…" : `Run ${tool.title}`}
            </Button>
            {result && (
              <Button variant="outline" size="sm" onClick={clearResult}>
                Clear
              </Button>
            )}
          </div>
          {loading && <Skeleton className="h-20 w-full" />}
          {error && <p className="text-xs text-cn-danger">Error: {error}. Try again.</p>}
          {result && !loading && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(resultToMarkdown(tool.id, result)).then(() => {})}
                >
                  Copy as markdown
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2)).then(() => {})}
                >
                  Copy JSON
                </Button>
              </div>
              <ToolResult toolId={tool.id} result={result} />
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}

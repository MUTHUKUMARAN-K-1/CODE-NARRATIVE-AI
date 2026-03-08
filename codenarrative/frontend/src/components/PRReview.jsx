import React from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { api } from "../api/client.js";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { AILoader } from "./ui/AILoader.jsx";

const RISK_CONFIG = {
  low:      { color: "text-cn-success", bg: "bg-cn-success-bg", border: "border-cn-success/30", icon: "shield" },
  medium:   { color: "text-cn-warn",    bg: "bg-amber-500/10",   border: "border-cn-warn/30",    icon: "warning" },
  high:     { color: "text-cn-danger",  bg: "bg-cn-danger-bg",   border: "border-cn-danger/30",  icon: "dangerous" },
  critical: { color: "text-cn-danger",  bg: "bg-red-500/20",     border: "border-cn-danger",     icon: "gpp_bad" },
};

const SEVERITY_CONFIG = {
  critical:   { color: "text-cn-danger",  dot: "bg-cn-danger",  label: "Critical" },
  warning:    { color: "text-cn-warn",    dot: "bg-cn-warn",    label: "Warning" },
  suggestion: { color: "text-cn-accent",  dot: "bg-cn-accent",  label: "Suggestion" },
};

const APPROVAL_CONFIG = {
  "Approve":          { color: "text-cn-success", bg: "bg-cn-success-bg", icon: "check_circle", border: "border-cn-success/40" },
  "Request Changes":  { color: "text-cn-warn",    bg: "bg-amber-500/10",  icon: "edit_note",    border: "border-cn-warn/40" },
  "Block":            { color: "text-cn-danger",  bg: "bg-cn-danger-bg",  icon: "block",        border: "border-cn-danger/40" },
};

export default function PRReview() {
  const { currentRepo } = useAppContext();
  const [prUrl, setPrUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [openFile, setOpenFile] = React.useState(null);

  const handleReview = async () => {
    if (!prUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setOpenFile(null);
    try {
      const data = await api.reviewPR({ prUrl: prUrl.trim(), repoId: currentRepo?.id });
      setResult(data);
    } catch (e) {
      setError(e.message || "Failed to review PR.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleReview();
  };

  const risk = result ? (RISK_CONFIG[result.risk_level?.toLowerCase()] || RISK_CONFIG.medium) : null;
  const approval = result ? (APPROVAL_CONFIG[result.approval_recommendation] || APPROVAL_CONFIG["Request Changes"]) : null;
  const score = result?.overall_score ?? 0;
  const scoreColor = score >= 80 ? "text-cn-success" : score >= 60 ? "text-cn-warn" : "text-cn-danger";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cn-accent/10">
          <span className="material-symbols-outlined text-cn-accent" style={{ fontSize: 22 }}>
            rate_review
          </span>
        </div>
        <div>
          <h1 className="page-title">Live PR Diff Review</h1>
          <p className="page-desc">
            Paste a GitHub Pull Request URL — DeepSeek R1 reviews the diff and returns a
            structured code review with risk score, bugs, security flags, and test suggestions.
          </p>
        </div>
      </div>

      {/* URL Input */}
      <Card className="border-cn-accent/20">
        <CardBody className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cn-muted" style={{ fontSize: 18 }}>
              link
            </span>
            <input
              type="url"
              placeholder="https://github.com/owner/repo/pull/123"
              className="w-full rounded-lg border border-cn-border bg-cn-surface pl-9 pr-4 py-2.5 text-sm text-cn-text placeholder:text-cn-muted focus:outline-none focus:ring-2 focus:ring-cn-accent/50 focus:border-cn-accent"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <Button
            variant="primary"
            className="shrink-0 gap-2"
            onClick={handleReview}
            disabled={loading || !prUrl.trim()}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {loading ? "hourglass_top" : "rate_review"}
            </span>
            {loading ? "Reviewing…" : "Review PR"}
          </Button>
        </CardBody>
        <div className="px-5 pb-3">
          <p className="text-[11px] text-cn-muted">
            Works with any public GitHub PR. Optionally{" "}
            {currentRepo ? (
              <span className="text-cn-accent font-medium">using context from {currentRepo.name || currentRepo.id}</span>
            ) : (
              <span>analyse a repo first for richer context</span>
            )}
            .
          </p>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-cn-danger/30 bg-cn-danger-bg px-4 py-3">
          <span className="material-symbols-outlined text-cn-danger shrink-0" style={{ fontSize: 20 }}>
            error
          </span>
          <p className="text-sm text-cn-danger">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardBody>
            <AILoader
              label="Reviewing PR with DeepSeek R1…"
              subLabel="Analyzing diffs, detecting issues, checking security…"
              stage={1}
            />
          </CardBody>
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* PR Meta */}
          {result.pr_meta && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-cn-muted">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>merge</span>
              <span className="font-semibold text-cn-text">{result.pr_meta.title}</span>
              <span>by <strong className="text-cn-accent">@{result.pr_meta.author}</strong></span>
              {result.pr_meta.head_branch && (
                <>
                  <span className="text-cn-border">→</span>
                  <code className="bg-cn-surface-elevated px-1 rounded text-[11px]">
                    {result.pr_meta.base_branch}
                  </code>
                </>
              )}
              <span>·</span>
              <span>{result.pr_meta.total_files} files</span>
              <span className="text-cn-success">+{result.pr_meta.additions}</span>
              <span className="text-cn-danger">-{result.pr_meta.deletions}</span>
            </div>
          )}

          {/* Score + Risk + Approval — top row */}
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Overall Score */}
            <Card className="text-center">
              <CardBody className="flex flex-col items-center gap-2 py-6">
                <span className="text-xs font-semibold text-cn-muted uppercase tracking-wide">Quality Score</span>
                <span className={`text-5xl font-black ${scoreColor}`}>{score}</span>
                <span className="text-xs text-cn-muted">/100</span>
                <div className="w-full h-2 rounded-full bg-cn-surface-elevated mt-1">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${score >= 80 ? "bg-cn-success" : score >= 60 ? "bg-cn-warn" : "bg-cn-danger"}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Risk Level */}
            {risk && (
              <Card className={`border ${risk.border}`}>
                <CardBody className={`flex flex-col items-center gap-2 py-6 ${risk.bg} rounded-xl`}>
                  <span className="text-xs font-semibold text-cn-muted uppercase tracking-wide">Risk Level</span>
                  <span className={`material-symbols-outlined ${risk.color}`} style={{ fontSize: 36 }}>
                    {risk.icon}
                  </span>
                  <span className={`text-lg font-bold capitalize ${risk.color}`}>
                    {result.risk_level}
                  </span>
                </CardBody>
              </Card>
            )}

            {/* Approval */}
            {approval && (
              <Card className={`border ${approval.border}`}>
                <CardBody className={`flex flex-col items-center gap-2 py-6 ${approval.bg} rounded-xl`}>
                  <span className="text-xs font-semibold text-cn-muted uppercase tracking-wide">Recommendation</span>
                  <span className={`material-symbols-outlined ${approval.color}`} style={{ fontSize: 36 }}>
                    {approval.icon}
                  </span>
                  <span className={`text-sm font-bold text-center ${approval.color}`}>
                    {result.approval_recommendation}
                  </span>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Summary */}
          {result.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Review Summary</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-cn-text leading-relaxed">{result.summary}</p>
              </CardBody>
            </Card>
          )}

          {/* Security Flags */}
          {result.security_flags?.length > 0 && (
            <Card className="border-cn-danger/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cn-danger" style={{ fontSize: 18 }}>
                    security
                  </span>
                  <CardTitle>Security Flags</CardTitle>
                  <span className="ml-auto text-xs font-bold text-cn-danger bg-cn-danger-bg border border-cn-danger/30 px-2 py-0.5 rounded-full">
                    {result.security_flags.length}
                  </span>
                </div>
              </CardHeader>
              <CardBody className="space-y-2">
                {result.security_flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="material-symbols-outlined text-cn-danger shrink-0 mt-0.5" style={{ fontSize: 14 }}>
                      gpp_bad
                    </span>
                    <span className="text-cn-danger">{flag}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* File-by-file Review */}
          {result.files?.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cn-accent" style={{ fontSize: 18 }}>folder_open</span>
                  <CardTitle>File Review ({result.files.length})</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-2 p-0">
                {result.files.map((file, i) => {
                  const isOpen = openFile === i;
                  const hasIssues = file.issues?.length > 0;
                  const criticalCount = file.issues?.filter((x) => x.severity === "critical").length ?? 0;
                  return (
                    <div key={i} className="border-b border-cn-border last:border-0">
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-cn-surface-elevated transition-colors text-left"
                        onClick={() => setOpenFile(isOpen ? null : i)}
                      >
                        <span className="material-symbols-outlined text-cn-muted shrink-0" style={{ fontSize: 15 }}>
                          description
                        </span>
                        <span className="flex-1 font-mono text-xs text-cn-text truncate">{file.filename}</span>
                        {criticalCount > 0 && (
                          <span className="text-[10px] font-bold text-cn-danger bg-cn-danger-bg border border-cn-danger/30 px-1.5 py-0.5 rounded-full shrink-0">
                            {criticalCount} critical
                          </span>
                        )}
                        {hasIssues && criticalCount === 0 && (
                          <span className="text-[10px] font-bold text-cn-warn bg-amber-500/10 border border-cn-warn/30 px-1.5 py-0.5 rounded-full shrink-0">
                            {file.issues.length} issues
                          </span>
                        )}
                        {!hasIssues && (
                          <span className="text-[10px] font-bold text-cn-success bg-cn-success-bg border border-cn-success/30 px-1.5 py-0.5 rounded-full shrink-0">
                            Clean
                          </span>
                        )}
                        <span className={`material-symbols-outlined text-cn-muted shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} style={{ fontSize: 16 }}>
                          expand_more
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 space-y-3">
                          {file.assessment && (
                            <p className="text-xs text-cn-muted italic">{file.assessment}</p>
                          )}
                          {file.issues?.length > 0 ? (
                            <div className="space-y-2">
                              {file.issues.map((issue, j) => {
                                const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.suggestion;
                                return (
                                  <div key={j} className="flex items-start gap-2 text-xs">
                                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${sev.dot}`} />
                                    <div>
                                      {issue.line_hint && (
                                        <code className="text-[10px] bg-cn-surface-elevated px-1 rounded mr-2 text-cn-muted">
                                          {issue.line_hint}
                                        </code>
                                      )}
                                      <span className={`font-semibold ${sev.color}`}>[{sev.label}] </span>
                                      <span className="text-cn-text">{issue.message}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-cn-success">✅ No issues found in this file.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          )}

          {/* Bottom row: Positives + Suggested Tests */}
          <div className="grid sm:grid-cols-2 gap-4">
            {result.positive_highlights?.length > 0 && (
              <Card className="border-cn-success/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-cn-success" style={{ fontSize: 18 }}>thumb_up</span>
                    <CardTitle>What's Good</CardTitle>
                  </div>
                </CardHeader>
                <CardBody className="space-y-2">
                  {result.positive_highlights.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-cn-success shrink-0 mt-0.5">✓</span>
                      <span className="text-cn-text">{p}</span>
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}
            {result.suggested_tests?.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-cn-accent" style={{ fontSize: 18 }}>science</span>
                    <CardTitle>Suggested Tests</CardTitle>
                  </div>
                </CardHeader>
                <CardBody className="space-y-2">
                  {result.suggested_tests.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-cn-muted shrink-0 font-mono text-xs mt-0.5">{i + 1}.</span>
                      <span className="text-cn-text">{t}</span>
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && !error && (
        <Card className="border-dashed border-cn-border">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-cn-accent/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-cn-accent" style={{ fontSize: 32 }}>rate_review</span>
            </div>
            <div>
              <p className="font-semibold text-cn-text">Ready to review any PR</p>
              <p className="text-xs text-cn-muted mt-1 max-w-sm">
                Paste any public GitHub Pull Request URL above. DeepSeek R1 will analyze the diff
                and give you an expert review in seconds.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Risk scoring", "Bug detection", "Security audit", "Test suggestions"].map((tag) => (
                <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-cn-accent/10 text-cn-accent border border-cn-accent/20">
                  {tag}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

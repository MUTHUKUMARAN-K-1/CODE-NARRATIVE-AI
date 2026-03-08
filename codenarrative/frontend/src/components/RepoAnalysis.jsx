import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";

const LANG_COLORS = ["#22c55e", "#3b82f6", "#f97316", "#eab308", "#ec4899", "#a78bfa", "#14b8a6"];

function buildTree(fileTree) {
  const root = {};
  (fileTree || []).forEach((item) => {
    const parts = item.path.split("/");
    let node = root;
    parts.forEach((part, idx) => {
      const isFile = idx === parts.length - 1 && item.type === "file";
      if (!node[part]) node[part] = { __meta: { type: isFile ? "file" : "dir", size: item.size } };
      node = node[part];
    });
  });
  return root;
}

function TreeNode({ name, node, depth = 0 }) {
  const isDir = node.__meta.type === "dir";
  const [open, setOpen] = React.useState(depth < 1);
  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-0.5 px-1 rounded cursor-pointer text-xs hover:bg-cn-surface-elevated transition-colors ${isDir ? "font-medium text-cn-text" : "text-cn-muted"}`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        onClick={() => isDir && setOpen((v) => !v)}
      >
        <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14, color: isDir ? "var(--cn-accent)" : "var(--cn-muted)" }}>
          {isDir ? (open ? "folder_open" : "folder") : "description"}
        </span>
        <span className={isDir ? "" : "font-mono text-[11px]"}>{name}</span>
      </div>
      {isDir && open && (
        <div>
          {Object.entries(node).filter(([k]) => k !== "__meta").map(([childName, childNode]) => (
            <TreeNode key={childName} name={childName} node={childNode} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepoAnalysis() {
  const { currentRepo, setCurrentRepo, repoAnalysis, setRepoAnalysis, setLoading, addToast } = useAppContext();
  const [githubUrl, setGithubUrl] = React.useState(currentRepo?.githubUrl || "https://github.com/acme/legacy-crm");
  const [result, setResult] = React.useState(repoAnalysis);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);

  const handleAnalyze = async () => {
    if (!githubUrl.startsWith("https://github.com/")) {
      addToast({ message: "Please enter a valid public GitHub URL." });
      return;
    }
    try {
      setLoading(true);
      setLoadingAnalysis(true);
      const data = await api.analyzeRepo(githubUrl);
      setResult(data);
      setRepoAnalysis(data);
      setCurrentRepo({ id: data.repo_id, name: githubUrl.split("github.com/")[1], githubUrl });
      addToast({ message: "Repository analysed successfully." });
    } catch (err) {
      addToast({ message: `Analysis failed: ${err.message}` });
    } finally {
      setLoading(false);
      setLoadingAnalysis(false);
    }
  };

  const analysis = result?.analysis;
  const languageData = result?.language_breakdown || [];
  const tree = buildTree(result?.file_tree || []);
  const stats = result?.stats;

  return (
    <div className="space-y-6">

      {/* Header + Input */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(20,184,166,0.12)" }}>
          <span className="material-symbols-outlined" style={{ color: "#14b8a6", fontSize: 22 }}>manage_search</span>
        </div>
        <div>
          <h1 className="page-title">Repository Analysis</h1>
          <p className="page-desc">AI-powered codebase mapping — tech stack, architecture, and critical files.</p>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              className="input-base flex-1"
              placeholder="https://github.com/user/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Button
              variant="primary"
              onClick={handleAnalyze}
              disabled={loadingAnalysis}
              className="shrink-0"
              style={{ background: "#14b8a6", boxShadow: "0 4px 12px rgba(20,184,166,0.3)" }}
            >
              {loadingAnalysis ? (
                <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span> Analysing…</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span> Analyse</>
              )}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Loading skeletons */}
      {loadingAnalysis && (
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
      )}

      {/* Results */}
      {analysis && !loadingAnalysis && (
        <>
          {/* Overview + Language chart */}
          <div className="grid lg:grid-cols-[1.4fr,1fr] gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: "rgba(20,184,166,0.1)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.2)" }}>
                  {analysis.architecture_type}
                </span>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="text-sm text-cn-text">{analysis.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.tech_stack?.map((tech) => (
                    <span key={tech} className="px-2.5 py-1 rounded-full bg-cn-surface-elevated border border-cn-border text-xs text-cn-text font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-cn-surface-elevated border border-cn-border">
                    <p className="text-xs text-cn-muted">Complexity Score</p>
                    <p className="text-xl font-bold text-cn-text mt-1">{analysis.complexity_score}<span className="text-cn-muted text-sm">/10</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-cn-surface-elevated border border-cn-border">
                    <p className="text-xs text-cn-muted">Total Files</p>
                    <p className="text-xl font-bold text-cn-text mt-1">{stats?.total_files ?? "—"}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader><CardTitle>Language Breakdown</CardTitle></CardHeader>
              <CardBody className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={languageData} dataKey="percentage" nameKey="language" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {languageData.map((_, i) => (
                        <Cell key={i} fill={LANG_COLORS[i % LANG_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--cn-surface)", border: "1px solid var(--cn-border)", borderRadius: 8, fontSize: 11, color: "var(--cn-text)" }}
                      formatter={(v) => [`${v}%`, "Usage"]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--cn-muted)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>

          {/* Critical files + Deps */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Critical Files</CardTitle></CardHeader>
              <CardBody className="divide-y divide-cn-border">
                {analysis.critical_files?.map((f) => (
                  <div key={f.file} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="font-mono text-xs text-cn-accent">{f.file}</p>
                    <p className="text-xs text-cn-text mt-0.5">{f.description}</p>
                    <p className="text-[10px] text-cn-muted mt-0.5">Reason: {f.reason}</p>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dependencies</CardTitle>
                <span className="text-xs text-cn-muted">{analysis.dependencies?.length ?? stats?.dependencies_count ?? 0} packages</span>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.dependencies?.map((dep) => (
                    <span key={dep} className="px-2 py-0.5 rounded-md bg-cn-surface-elevated border border-cn-border text-[11px] text-cn-text font-mono">
                      {dep}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* File tree */}
          <Card>
            <CardHeader><CardTitle>File Tree</CardTitle></CardHeader>
            <CardBody className="max-h-80 overflow-y-auto">
              {Object.entries(tree).filter(([k]) => k !== "__meta").length === 0
                ? <p className="text-xs text-cn-muted">No file tree available.</p>
                : Object.entries(tree).filter(([k]) => k !== "__meta").map(([name, node]) => (
                    <TreeNode key={name} name={name} node={node} />
                  ))
              }
            </CardBody>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!analysis && !loadingAnalysis && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-cn-muted mb-4" style={{ fontSize: 48 }}>manage_search</span>
          <p className="text-base font-semibold text-cn-text mb-2">No analysis yet</p>
          <p className="text-sm text-cn-muted max-w-xs">Paste a GitHub URL above and click Analyse to generate an AI-powered codebase map.</p>
        </div>
      )}
    </div>
  );
}

export default RepoAnalysis;

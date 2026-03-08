import React, { useState } from "react";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";

function Archaeology() {
  const { currentRepo, addToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const investigate = async () => {
    if (!currentRepo?.id) { addToast({ message: "Analyse a repository first." }); return; }
    try {
      setLoading(true); setData(null);
      const res = await api.archaeology(currentRepo.id);
      setData(res);
    } catch (err) { addToast({ message: `Investigation failed: ${err.message}` }); }
    finally { setLoading(false); }
  };

  const timeline = data?.timeline || [];
  const suspects = data?.suspects || [];
  const evidenceBoard = data?.evidence_board || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(168,85,247,0.12)" }}>
            <span className="material-symbols-outlined" style={{ color: "#a855f7", fontSize: 22 }}>travel_explore</span>
          </div>
          <div>
            <h1 className="page-title">Code Archaeology</h1>
            <p className="page-desc">AI detective investigates your codebase — timeline, suspects, evidence board.</p>
          </div>
        </div>
        <Button variant="primary" onClick={investigate} disabled={loading || !currentRepo}
          style={{ background: "#a855f7" }}>
          {loading ? (
            <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span> Investigating…</>
          ) : (
            <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>search</span> Start Investigation</>
          )}
        </Button>
      </div>

      {!currentRepo && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-cn-muted mb-3" style={{ fontSize: 48 }}>travel_explore</span>
          <p className="font-semibold text-cn-text mb-1">No repository connected</p>
          <p className="text-sm text-cn-muted">Analyse a GitHub repository first, then return to start the investigation.</p>
        </div>
      )}

      {loading && (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-52" /><Skeleton className="h-52" />
        </div>
      )}

      {data && !loading && (
        <>
          {data.story && (
            <Card>
              <CardHeader>
                <CardTitle>The Mystery</CardTitle>
                <span className="text-[10px] font-semibold text-cn-muted uppercase tracking-wide bg-cn-surface-elevated px-2 py-1 rounded-full border border-cn-border">Case #001</span>
              </CardHeader>
              <CardBody>
                <p className="text-cn-text whitespace-pre-wrap leading-relaxed">{data.story}</p>
              </CardBody>
            </Card>
          )}

          {data.revelation && (
            <div className="card p-5 border-l-4 border-cn-success" style={{ borderColor: "var(--cn-success)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-cn-success" style={{ fontSize: 18 }}>lightbulb</span>
                <p className="font-bold text-cn-success text-sm">Revelation!</p>
              </div>
              <p className="text-cn-text">{data.revelation}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
              <CardBody className="space-y-4">
                {timeline.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cn-accent/10 text-cn-accent text-[10px] font-bold">{i + 1}</div>
                      {i < timeline.length - 1 && <div className="w-px flex-1 bg-cn-border mt-1" />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="font-semibold text-sm text-cn-text">{item.event}</p>
                      <p className="text-[10px] text-cn-muted mt-0.5">{item.when}</p>
                      <p className="text-xs text-cn-muted mt-1">{item.clue}</p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><CardTitle>Suspects</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {suspects.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-cn-border bg-cn-surface-elevated">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                      <span className="text-xs font-bold" style={{ color: "#a855f7" }}>{s.name?.[0] ?? "?"}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-cn-text text-sm">{s.name}</p>
                      <p className="text-[11px] text-cn-muted">{s.role} · {s.motive}</p>
                      <p className="text-[11px] text-cn-muted mt-1">Evidence: {s.evidence}</p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          {evidenceBoard.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Evidence Board</CardTitle></CardHeader>
              <CardBody className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {evidenceBoard.map((e, i) => (
                  <div key={i} className="p-3 rounded-xl border border-cn-border bg-cn-surface-elevated">
                    <p className="font-semibold text-cn-text text-sm">{e.title}</p>
                    <p className="text-xs text-cn-muted mt-1">{e.description}</p>
                    <span className="mt-2 inline-block text-[10px] uppercase tracking-wide font-semibold text-cn-accent">{e.importance}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default Archaeology;

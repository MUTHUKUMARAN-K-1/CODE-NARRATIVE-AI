import React, { useState } from "react";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";

function Reality() {
  const { currentRepo, addToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const generate = async () => {
    if (!currentRepo?.id) { addToast({ message: "Analyse a repository first." }); return; }
    try {
      setLoading(true); setData(null);
      const res = await api.reality(currentRepo.id);
      setData(res);
    } catch (err) { addToast({ message: `Episode failed: ${err.message}` }); }
    finally { setLoading(false); }
  };

  const contestants = data?.contestants || [];
  const challenges = data?.challenges || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(251,191,36,0.12)" }}>
            <span className="material-symbols-outlined" style={{ color: "#fbbf24", fontSize: 22 }}>live_tv</span>
          </div>
          <div>
            <h1 className="page-title">Survivor: Codebase Island</h1>
            <p className="page-desc">AI writes a reality TV episode with your modules as contestants competing for survival.</p>
          </div>
        </div>
        <Button variant="primary" onClick={generate} disabled={loading || !currentRepo}
          style={{ background: "#fbbf24", color: "#1a1a1a" }}>
          {loading ? (
            <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span> Producing…</>
          ) : (
            <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>movie</span> Generate Episode</>
          )}
        </Button>
      </div>

      {!currentRepo && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-cn-muted mb-3" style={{ fontSize: 48 }}>live_tv</span>
          <p className="font-semibold text-cn-text mb-1">No repository connected</p>
          <p className="text-sm text-cn-muted">Analyse a repository first to cast your modules as contestants.</p>
        </div>
      )}

      {loading && (
        <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
      )}

      {data && !loading && (
        <>
          {data.episode_script && (
            <Card>
              <CardHeader>
                <CardTitle>Episode Script</CardTitle>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
                  Season 1 · Ep. 1
                </span>
              </CardHeader>
              <CardBody>
                <pre className="text-sm text-cn-text whitespace-pre-wrap font-sans leading-relaxed bg-cn-surface-elevated rounded-xl p-4 border border-cn-border max-h-72 overflow-y-auto">
                  {data.episode_script}
                </pre>
              </CardBody>
            </Card>
          )}

          {data.eliminated && (
            <div className="card p-4 flex items-center gap-3 border-l-4" style={{ borderColor: "var(--cn-danger)" }}>
              <span className="material-symbols-outlined text-cn-danger" style={{ fontSize: 22 }}>gavel</span>
              <div>
                <p className="text-xs font-semibold text-cn-danger uppercase tracking-wide">Voted Off</p>
                <p className="font-bold text-cn-text text-sm">{data.eliminated}</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Contestants</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {contestants.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-cn-border">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs"
                      style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-cn-text text-sm">{c.name}</p>
                      <p className="text-[11px] text-cn-muted">{c.role}</p>
                      {c.confessional && <p className="text-xs text-cn-muted mt-1 italic">"{c.confessional}"</p>}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>Challenges</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {challenges.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl border border-cn-border">
                    <p className="font-semibold text-cn-text text-sm">{c.name}</p>
                    {c.winner && <p className="text-[11px] text-cn-success mt-0.5">Winner: {c.winner}</p>}
                    <p className="text-xs text-cn-muted mt-1">{c.description}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default Reality;

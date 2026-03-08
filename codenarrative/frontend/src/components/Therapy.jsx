import React, { useState } from "react";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";

function Therapy() {
  const { currentRepo, addToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const startSession = async () => {
    if (!currentRepo?.id) { addToast({ message: "Analyse a repository first." }); return; }
    try {
      setLoading(true); setData(null);
      const res = await api.therapy(currentRepo.id);
      setData(res);
    } catch (err) { addToast({ message: `Therapy session failed: ${err.message}` }); }
    finally { setLoading(false); }
  };

  const diagnosis = data?.diagnosis || [];
  const treatmentPlan = data?.treatment_plan || [];

  const severityColor = (s) => {
    if (!s) return "var(--cn-muted)";
    const l = s.toLowerCase();
    if (l.includes("critical") || l.includes("severe")) return "var(--cn-danger)";
    if (l.includes("high"))   return "var(--cn-warn)";
    if (l.includes("medium")) return "#f97316";
    return "var(--cn-success)";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(236,72,153,0.12)" }}>
            <span className="material-symbols-outlined" style={{ color: "#ec4899", fontSize: 22 }}>psychology</span>
          </div>
          <div>
            <h1 className="page-title">Code Therapy</h1>
            <p className="page-desc">AI therapist holds a group therapy session for your modules — transcript, diagnosis, and treatment plan.</p>
          </div>
        </div>
        <Button variant="primary" onClick={startSession} disabled={loading || !currentRepo}
          style={{ background: "#ec4899" }}>
          {loading ? (
            <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span> Session in progress…</>
          ) : (
            <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>healing</span> Start Session</>
          )}
        </Button>
      </div>

      {!currentRepo && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-cn-muted mb-3" style={{ fontSize: 48 }}>psychology</span>
          <p className="font-semibold text-cn-text mb-1">No repository connected</p>
          <p className="text-sm text-cn-muted">Analyse a GitHub repository first to start the therapy session.</p>
        </div>
      )}

      {loading && (
        <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      )}

      {data && !loading && (
        <>
          {data.transcript && (
            <Card>
              <CardHeader><CardTitle>Session Transcript</CardTitle></CardHeader>
              <CardBody>
                <pre className="text-sm text-cn-text whitespace-pre-wrap font-sans leading-relaxed bg-cn-surface-elevated rounded-xl p-4 border border-cn-border max-h-72 overflow-y-auto">
                  {data.transcript}
                </pre>
              </CardBody>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Diagnosis</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {diagnosis.map((d, i) => (
                  <div key={i} className="p-3 rounded-xl border border-cn-border flex gap-3">
                    <div className="mt-0.5 h-2 w-2 rounded-full shrink-0" style={{ background: severityColor(d.severity) }} />
                    <div>
                      <p className="font-semibold text-cn-text text-sm">{d.condition}</p>
                      <p className="text-[11px] mt-0.5 font-medium" style={{ color: severityColor(d.severity) }}>Severity: {d.severity}</p>
                      <p className="text-xs text-cn-muted mt-1">Affected: {d.affected}</p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>Treatment Plan</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {treatmentPlan.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cn-accent/10 text-cn-accent text-[10px] font-bold">{t.step ?? i + 1}</div>
                    <p className="text-sm text-cn-text leading-relaxed">{t.action}</p>
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

export default Therapy;

import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";
import { MermaidView } from "./MermaidView.jsx";

const TABS = [
  { id: "system", label: "System Architecture", icon: "hub" },
  { id: "data",   label: "Data Flow",           icon: "swap_horiz" },
  { id: "deps",   label: "File Dependencies",   icon: "device_hub" },
];

function ArchitectureMap() {
  const { currentRepo, addToast } = useAppContext();
  const [tab, setTab] = useState("system");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [oneSlide, setOneSlide] = useState(null);
  const [oneSlideLoading, setOneSlideLoading] = useState(false);

  const load = async () => {
    if (!currentRepo) { addToast({ message: "Analyse a repository first." }); return; }
    try {
      setLoading(true);
      const res = await api.getArchitecture(currentRepo.id);
      setData(res);
    } catch (err) {
      addToast({ message: `Failed: ${err.message}` });
    } finally { setLoading(false); }
  };

  const loadOneSlide = async () => {
    if (!currentRepo || currentRepo.id === "demo-repo") return;
    setOneSlideLoading(true);
    try { const res = await api.getOneSlideArchitecture(currentRepo.id); setOneSlide(res); }
    catch (err) { addToast({ type: "error", message: err.message }); }
    finally { setOneSlideLoading(false); }
  };

  const handleExport = () => {
    if (!code) return;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "architecture.mmd"; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { if (currentRepo && !data && !loading) load(); }, [currentRepo]);

  const code = tab === "system" ? data?.system_diagram_mermaid : tab === "data" ? data?.data_flow_mermaid : data?.dependency_mermaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cn-success/10">
            <span className="material-symbols-outlined text-cn-success" style={{ fontSize: 22 }}>account_tree</span>
          </div>
          <div>
            <h1 className="page-title">Architecture Maps</h1>
            <p className="page-desc">Mermaid diagrams for system, data flow, and file dependencies.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading || !currentRepo}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button variant="success" size="sm" onClick={handleExport} disabled={!code}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
            Export
          </Button>
          {currentRepo?.id && currentRepo.id !== "demo-repo" && (
            <Button variant="outline" size="sm" onClick={loadOneSlide} disabled={oneSlideLoading}>
              {oneSlideLoading ? "Generating…" : "One Slide"}
            </Button>
          )}
        </div>
      </div>

      {/* One slide */}
      {oneSlide && (
        <Card>
          <CardHeader><CardTitle>{oneSlide.title}</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm">
            {oneSlide.bullets?.length > 0 && (
              <ul className="list-disc pl-4 space-y-1 text-cn-text">{oneSlide.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
            )}
            {oneSlide.one_diagram_mermaid && <MermaidView code={oneSlide.one_diagram_mermaid} />}
          </CardBody>
        </Card>
      )}

      {/* Diagram card */}
      <Card>
        {/* Tab bar */}
        <div className="border-b border-cn-border px-4 flex gap-1 pt-2">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all -mb-px ${
                tab === t.id ? "border-cn-success text-cn-success" : "border-transparent text-cn-muted hover:text-cn-text"
              }`}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <CardBody className="h-[30rem] relative p-0 overflow-hidden">
          {loading && <div className="p-4"><Skeleton className="h-full w-full min-h-[28rem]" /></div>}
          {!loading && !currentRepo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <span className="material-symbols-outlined text-cn-muted mb-3" style={{ fontSize: 48 }}>account_tree</span>
              <p className="text-sm text-cn-muted max-w-xs">Analyse a repository first, then open Architecture to generate diagrams.</p>
            </div>
          )}
          {!loading && currentRepo && !code && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <span className="material-symbols-outlined text-cn-muted mb-3" style={{ fontSize: 48 }}>refresh</span>
              <p className="text-sm text-cn-muted max-w-xs">Click Refresh to generate architecture maps from the latest analysis.</p>
              <Button variant="success" size="sm" className="mt-4" onClick={load}>Generate Diagrams</Button>
            </div>
          )}
          {!loading && code && <div className="p-4 h-full"><MermaidView code={code} /></div>}
        </CardBody>
      </Card>
    </div>
  );
}

export default ArchitectureMap;

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";

const VIDEO_TYPES = [
  { value: "documentary", label: "Documentary", icon: "movie", desc: "Cinematic walkthrough of your codebase" },
  { value: "therapy",     label: "Therapy",     icon: "psychology", desc: "Your modules as therapy patients" },
  { value: "generic",     label: "Generic",     icon: "videocam",   desc: "Standard codebase overview" },
];

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS  = 20 * 60 * 1000;

function Videos() {
  const { currentRepo, addToast } = useAppContext();
  const [starting, setStarting]               = useState(false);
  const [jobId, setJobId]                     = useState(null);
  const [status, setStatus]                   = useState(null);
  const [videoUrl, setVideoUrl]               = useState(null);
  const [message, setMessage]                 = useState(null);
  const [videoType, setVideoType]             = useState("documentary");
  const [videoLoadError, setVideoLoadError]   = useState(false);
  const [videoReady, setVideoReady]           = useState(false);
  const pollRef = React.useRef(null);
  const timeoutRef = React.useRef(null);

  const stopPolling = () => {
    clearInterval(pollRef.current);
    clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  };

  React.useEffect(() => stopPolling, []);

  const pollStatus = async (id) => {
    try {
      const res = await api.videoStatus(id);
      setStatus(res.status);
      if (res.video_url) { setVideoUrl(res.video_url); setVideoLoadError(false); }
      if (res.message) setMessage(res.message);
      if (res.status === "COMPLETED" || res.status === "FAILED") {
        stopPolling();
        if (res.status === "COMPLETED" && res.video_url) addToast({ message: "Video ready!" });
        if (res.status === "FAILED") addToast({ type: "error", message: res.message || "Generation failed." });
      }
    } catch (err) { stopPolling(); addToast({ type: "error", message: err.message }); }
  };

  const startJob = async () => {
    if (!currentRepo?.id) { addToast({ message: "Analyse a repository first." }); return; }
    try {
      setStarting(true); setJobId(null); setStatus(null); setVideoUrl(null);
      setMessage(null); setVideoLoadError(false); setVideoReady(false); stopPolling();
      const res = await api.videoStart(currentRepo.id, videoType);
      const id = res?.job_id ?? "mock-job";
      setJobId(id); setStatus(res?.status ?? "PENDING");
      timeoutRef.current = setTimeout(() => { stopPolling(); addToast({ message: "Taking longer than expected. Check back later." }); }, POLL_TIMEOUT_MS);
      pollStatus(id);
      pollRef.current = setInterval(() => pollStatus(id), POLL_INTERVAL_MS);
    } catch (err) { addToast({ type: "error", message: err.message }); }
    finally { setStarting(false); }
  };

  const isPending = status === "PENDING" || status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cn-accent/10">
          <span className="material-symbols-outlined text-cn-accent" style={{ fontSize: 22 }}>videocam</span>
        </div>
        <div>
          <h1 className="page-title">Nova Reel Videos</h1>
          <p className="page-desc">Generate an AI-narrated video about your codebase using Amazon Nova Reel.</p>
        </div>
      </div>

      {/* Type selector + action */}
      <Card>
        <CardBody className="space-y-4">
          {!currentRepo?.id && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-cn-warn/10 border border-cn-warn/20 text-xs text-cn-warn">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
              Analyse a repository first. <Link to="/analysis" className="underline font-semibold">Go to Repo Analysis →</Link>
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-3">
            {VIDEO_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setVideoType(t.value)}
                className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border transition-all text-left ${
                  videoType === t.value
                    ? "border-cn-accent bg-cn-accent/10 text-cn-accent"
                    : "border-cn-border hover:border-cn-border-strong hover:bg-cn-surface-elevated text-cn-muted"
                }`}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{t.icon}</span>
                <span className="font-semibold text-sm text-cn-text">{t.label}</span>
                <span className="text-xs text-cn-muted">{t.desc}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            {currentRepo?.name && (
              <div className="flex items-center gap-2 text-xs text-cn-muted">
                <div className="h-1.5 w-1.5 rounded-full bg-cn-success" />
                <span className="font-mono">{currentRepo.name}</span>
              </div>
            )}
            <Button variant="primary" onClick={startJob} disabled={starting || isPending || !currentRepo?.id}>
              {starting ? "Starting…" : isPending ? (
                <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span> Generating…</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_arrow</span> Generate Video</>
              )}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Progress */}
      {isPending && jobId && (
        <div className="card p-5 flex items-center gap-4 border border-cn-accent/20 bg-cn-accent/5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cn-accent/10">
            <span className="material-symbols-outlined text-cn-accent animate-spin" style={{ fontSize: 20 }}>progress_activity</span>
          </div>
          <div>
            <p className="font-semibold text-cn-text">Generating your video…</p>
            <p className="text-xs text-cn-muted mt-0.5">Job: <code className="font-mono">{jobId}</code> · Polling every 4s</p>
            <p className="text-xs text-cn-muted">This can take several minutes with a live backend.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "FAILED" && (
        <div className="card p-4 border-l-4 border-cn-danger flex items-center gap-3">
          <span className="material-symbols-outlined text-cn-danger" style={{ fontSize: 22 }}>error</span>
          <div>
            <p className="font-semibold text-cn-danger">Generation failed</p>
            <p className="text-xs text-cn-muted">{message || "Unknown error. Check backend logs."}</p>
          </div>
        </div>
      )}

      {/* Completed */}
      {status === "COMPLETED" && (
        <Card>
          <CardHeader>
            <CardTitle>Your Video</CardTitle>
            <div className="flex items-center gap-2 text-xs text-cn-success">
              <div className="h-1.5 w-1.5 rounded-full bg-cn-success" />
              Ready
            </div>
          </CardHeader>
          <CardBody>
            {videoUrl ? (
              <>
                {videoLoadError && (
                  <div className="mb-4 p-3 rounded-xl bg-cn-danger/10 border border-cn-danger/20 flex items-center justify-between gap-3 text-xs text-cn-danger">
                    <span>Video link expired or unavailable.</span>
                    <Button size="sm" variant="outline" onClick={async () => {
                      setVideoLoadError(false);
                      try { const res = await api.videoStatus(jobId); if (res.video_url) setVideoUrl(res.video_url); }
                      catch (e) { addToast({ type: "error", message: e.message }); }
                    }}>Refresh link</Button>
                  </div>
                )}
                <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
                  <video key={videoUrl} src={videoUrl} controls playsInline preload="metadata"
                    className="w-full h-full object-contain"
                    onCanPlay={() => { setVideoReady(true); setVideoLoadError(false); }}
                    onError={() => setVideoLoadError(true)} />
                </div>
                {message && <p className="text-xs text-cn-muted mt-2">{message}</p>}
              </>
            ) : (
              <p className="text-cn-muted text-sm">Video completed but URL was not returned. Try again or check backend logs.</p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default Videos;

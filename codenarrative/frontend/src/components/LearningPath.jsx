import React from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";

function DayCard({ day, onToggle, completed }) {
  return (
    <div className={`card p-4 transition-all border-l-4 ${completed ? "border-l-cn-success opacity-75" : "border-l-cn-accent"}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(day.day)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
            completed ? "border-cn-success bg-cn-success text-white" : "border-cn-border hover:border-cn-accent"
          }`}
        >
          {completed && <span className="material-symbols-outlined text-white" style={{ fontSize: 12 }}>check</span>}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className={`text-sm font-semibold leading-snug ${completed ? "line-through text-cn-muted" : "text-cn-text"}`}>
              Day {day.day}: {day.title}
            </h3>
            <span className="text-[10px] text-cn-muted shrink-0">{day.estimated_minutes}m</span>
          </div>
          <p className="text-xs text-cn-muted mb-2">{day.goal}</p>
          {day.files_to_read?.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold text-cn-muted uppercase tracking-wide mb-1">Files</p>
              <div className="flex flex-wrap gap-1">
                {day.files_to_read.map((f) => (
                  <span key={f} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cn-surface-elevated border border-cn-border text-cn-text">{f}</span>
                ))}
              </div>
            </div>
          )}
          {day.task && <p className="text-xs text-cn-text bg-cn-surface-elevated rounded-lg px-2.5 py-2 border border-cn-border">{day.task}</p>}
          {day.concepts?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {day.concepts.map((c) => (
                <span key={c} className="px-2 py-0.5 rounded-md bg-cn-accent/10 border border-cn-accent/20 text-[10px] text-cn-accent">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LearningPath() {
  const { currentRepo, userProfile, addToast } = useAppContext();
  const [experience, setExperience] = React.useState(userProfile.experienceLevel || "Intermediate");
  const [background, setBackground] = React.useState(userProfile.background || "Full-stack");
  const [durationDays, setDurationDays] = React.useState(14);
  const [loading, setLoading] = React.useState(false);
  const [path, setPath] = React.useState(null);
  const [skillTags, setSkillTags] = React.useState([]);
  const [completedDays, setCompletedDays] = React.useState([]);

  const generate = async () => {
    if (!currentRepo) {
      addToast({ message: "Run repo analysis first from the Dashboard or Repo Analysis." });
      return;
    }
    try {
      setLoading(true);
      const data = await api.generateLearningPath({ repoId: currentRepo.id, experienceLevel: experience, background, userId: userProfile.userId, durationDays });
      const pathList = data?.learning_path ?? data?.path ?? (Array.isArray(data) ? data : []);
      setPath(pathList);
      setSkillTags(Array.isArray(data?.skill_tags) ? data.skill_tags : []);
      addToast({ message: pathList.length ? "Learning path generated." : "No path returned." });
    } catch (err) {
      addToast({ type: "error", message: err.message || "Failed to generate." });
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = async (dayNumber) => {
    const next = completedDays.includes(dayNumber)
      ? completedDays.filter((d) => d !== dayNumber)
      : [...completedDays, dayNumber];
    setCompletedDays(next);
    try {
      await api.updateProgress({ user_id: userProfile.userId, repo_id: currentRepo?.id || "demo-repo", day_completed: dayNumber, files_visited_increment: [], concepts_mastered_increment: [] });
    } catch { /* optimistic */ }
  };

  const totalDays = path?.length ?? durationDays;
  const completionPct = path && totalDays > 0 ? Math.round((completedDays.length / totalDays) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cn-accent/10">
          <span className="material-symbols-outlined text-cn-accent" style={{ fontSize: 22 }}>map</span>
        </div>
        <div>
          <h1 className="page-title">14-Day Learning Path</h1>
          <p className="page-desc">Personalised onboarding roadmap tailored to your experience and background.</p>
        </div>
      </div>

      {/* Configure */}
      <Card>
        <CardBody>
          {currentRepo?.id === "demo-repo" && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-cn-warn/10 border border-cn-warn/20 text-xs text-cn-warn">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
              Run Repo Analysis first. <Link to="/analysis" className="underline font-semibold">Go to Repo Analysis →</Link>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-cn-muted mb-1.5">Experience Level</label>
              <select className="input-base" value={experience} onChange={(e) => setExperience(e.target.value)}>
                <option>Beginner</option><option>Intermediate</option><option>Senior</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-cn-muted mb-1.5">Background</label>
              <select className="input-base" value={background} onChange={(e) => setBackground(e.target.value)}>
                <option>Frontend</option><option>Backend</option><option>Full-stack</option><option>DevOps</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-cn-muted mb-1.5">Duration</label>
              <select className="input-base" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))}>
                <option value={14}>14 days</option><option value={30}>30 days</option>
              </select>
            </div>
            <Button variant="primary" onClick={generate} disabled={loading || !currentRepo}>
              {loading ? "Generating…" : "Generate Path"}
            </Button>
          </div>

          {/* Progress bar */}
          {path && (
            <div className="mt-5 pt-4 border-t border-cn-border">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-cn-muted">{completedDays.length} of {totalDays} days completed</span>
                <span className="font-semibold text-cn-accent">{completionPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-cn-surface-elevated overflow-hidden">
                <div className="h-full rounded-full bg-cn-accent transition-all duration-500" style={{ width: `${completionPct}%` }} />
              </div>
              {skillTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {skillTags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-cn-accent/10 border border-cn-accent/20 text-[10px] text-cn-accent font-medium">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {loading && (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      )}

      {path && !loading && (
        <div className={`grid gap-6 ${path.length > 14 ? "lg:grid-cols-2" : "lg:grid-cols-2"}`}>
          <div className="space-y-3">
            <p className="text-xs font-bold text-cn-muted uppercase tracking-wider">Week 1 · Foundation</p>
            {path.filter((d) => d.day <= 7).map((day) => (
              <DayCard key={day.day} day={day} completed={completedDays.includes(day.day)} onToggle={toggleDay} />
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-bold text-cn-muted uppercase tracking-wider">Week 2 · Deep Dive</p>
            {path.filter((d) => d.day > 7 && d.day <= 14).map((day) => (
              <DayCard key={day.day} day={day} completed={completedDays.includes(day.day)} onToggle={toggleDay} />
            ))}
            {path.filter((d) => d.day > 14).length > 0 && (
              <>
                <p className="text-xs font-bold text-cn-muted uppercase tracking-wider pt-4">Extended · Mastery</p>
                {path.filter((d) => d.day > 14).map((day) => (
                  <DayCard key={day.day} day={day} completed={completedDays.includes(day.day)} onToggle={toggleDay} />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {!path && !loading && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-cn-muted mb-4" style={{ fontSize: 48 }}>route</span>
          <p className="text-base font-semibold text-cn-text mb-2">No path generated yet</p>
          <p className="text-sm text-cn-muted max-w-xs">Configure your experience level and click Generate to create your personalised 14-day roadmap.</p>
        </div>
      )}
    </div>
  );
}

export default LearningPath;

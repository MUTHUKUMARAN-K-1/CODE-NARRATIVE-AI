import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";

/* ── Stat Card ── */
function StatCard({ label, value, accent, icon, desc }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-cn-muted uppercase tracking-wide">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: accent + "18" }}>
          <span className="material-symbols-outlined text-sm" style={{ color: accent }}>{icon}</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-cn-text tracking-tight">{value}</div>
      {desc && <div className="text-xs text-cn-muted">{desc}</div>}
    </div>
  );
}

/* ── Quick Action ── */
function QuickAction({ icon, label, desc, to, accent }) {
  return (
    <Link
      to={to}
      className="card p-4 flex items-center gap-3 hover:shadow-cn-md hover:border-cn-border-strong group transition-all"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: accent + "18" }}>
        <span className="material-symbols-outlined" style={{ color: accent, fontSize: 20 }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-cn-text group-hover:text-cn-accent transition-colors">{label}</div>
        <div className="text-xs text-cn-muted truncate">{desc}</div>
      </div>
      <span className="material-symbols-outlined text-cn-muted ml-auto shrink-0" style={{ fontSize: 16 }}>chevron_right</span>
    </Link>
  );
}

/* ── Onboarding Wizard ── */
function OnboardingWizard() {
  const { currentRepo, setCurrentRepo, userProfile, setUserProfile, addToast } = useAppContext();
  const navigate = useNavigate();
  const [step, setStep] = React.useState(1);
  const [githubUrl, setGithubUrl] = React.useState("");
  const [experience, setExperience] = React.useState(userProfile.experienceLevel || "Intermediate");
  const [background, setBackground] = React.useState(userProfile.background || "Full-stack");

  const handleNext = () => {
    if (step === 1) {
      if (!githubUrl.startsWith("https://github.com/")) {
        addToast({ message: "Please enter a valid public GitHub URL." });
        return;
      }
      setCurrentRepo({ id: "demo-repo", name: githubUrl.split("github.com/")[1], githubUrl });
      setStep(2);
    } else if (step === 2) {
      setUserProfile((prev) => ({ ...prev, experienceLevel: experience, background }));
      setStep(3);
    } else if (step === 3) {
      navigate("/learning-path");
    }
  };

  const steps = ["Repository", "Profile", "Launch"];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-cn-accent">Quick Start Wizard</CardTitle>
          <p className="text-xs text-cn-muted mt-1">Set up your AI-powered onboarding in 3 steps</p>
        </div>
        <div className="text-xs text-cn-muted font-mono">{step}/3</div>
      </CardHeader>

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-5 px-1">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${i + 1 <= step ? "text-cn-accent" : "text-cn-muted"}`}>
              <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                i + 1 < step ? "bg-cn-accent text-white" : i + 1 === step ? "border-2 border-cn-accent text-cn-accent" : "border border-cn-border text-cn-muted"
              }`}>{i + 1 < step ? "✓" : i + 1}</div>
              <span className="hidden sm:block">{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px transition-colors ${i + 1 < step ? "bg-cn-accent" : "bg-cn-border"}`} />}
          </React.Fragment>
        ))}
      </div>

      <CardBody className="space-y-4">
        {step === 1 && (
          <>
            <label className="block text-xs font-semibold text-cn-muted mb-1">GitHub Repository URL</label>
            <input
              type="text"
              className="input-base"
              placeholder="https://github.com/user/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              autoFocus
            />
            <p className="text-xs text-cn-muted">Paste any public GitHub repository to analyse.</p>
          </>
        )}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-cn-muted mb-1.5">Experience</label>
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
          </div>
        )}
        {step === 3 && (
          <div className="text-center py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cn-success/10 mx-auto mb-3">
              <span className="material-symbols-outlined text-cn-success" style={{ fontSize: 28 }}>rocket_launch</span>
            </div>
            <p className="font-semibold text-cn-text mb-1">Ready to launch!</p>
            <p className="text-xs text-cn-muted">
              {currentRepo?.name ? `Repo: ${currentRepo.name}` : "Repo connected"} · {experience} · {background}
            </p>
          </div>
        )}
        <div className="flex justify-end pt-1">
          <Button variant="primary" onClick={handleNext}>
            {step < 3 ? "Continue" : "Go to Learning Path"}
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/* ── Main Dashboard ── */
function Dashboard() {
  const { currentRepo } = useAppContext();

  const stats = [
    { label: "Files Analysed",  value: currentRepo ? "120+" : "0",    icon: "folder_open",     accent: "#14b8a6", desc: "Across 12 directories" },
    { label: "Days Completed",  value: currentRepo ? "3/14" : "0/14", icon: "event_available", accent: "#3b82f6", desc: "14-day learning path" },
    { label: "Tests Generated", value: currentRepo ? "8"    : "0",    icon: "science",         accent: "#f97316", desc: "Unit & integration" },
    { label: "Questions Asked", value: currentRepo ? "12"   : "0",    icon: "chat",            accent: "#ec4899", desc: "Via Smart Q&A" },
  ];

  const quickActions = [
    { icon: "manage_search",  label: "Analyse Repository", desc: "Map codebase structure & stack", to: "/analysis",      accent: "#14b8a6" },
    { icon: "map",            label: "Learning Path",      desc: "14-day personalised roadmap",   to: "/learning-path", accent: "#3b82f6" },
    { icon: "chat",           label: "Smart Q&A",          desc: "Ask anything about the code",   to: "/qa",            accent: "#2563eb" },
    { icon: "account_tree",   label: "Architecture Maps",  desc: "Mermaid diagrams & exports",    to: "/architecture",  accent: "#22c55e" },
    { icon: "auto_stories",   label: "Explanations",       desc: "Multilevel code breakdowns",    to: "/explanations",  accent: "#a78bfa" },
    { icon: "science",        label: "Test Generator",     desc: "AI-generated unit tests",       to: "/tests",         accent: "#f97316" },
  ];

  const activity = [
    { icon: "check_circle", color: "text-cn-success", text: "Generated onboarding path for github.com/acme/legacy-crm", time: "2 min ago" },
    { icon: "check_circle", color: "text-cn-success", text: "Created unit tests for billing/calc_invoice.py",            time: "25 min ago" },
    { icon: "check_circle", color: "text-cn-success", text: "Visualised architecture data flow for api/v1/orders",        time: "1 h ago" },
    { icon: "info",         color: "text-cn-info",    text: "Smart Q&A session: 4 questions answered",                    time: "3 h ago" },
  ];

  return (
    <div className="space-y-8">

      {/* ─── Hero Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{
          background: "linear-gradient(135deg, var(--cn-accent) 0%, #7c3aed 100%)",
          boxShadow: "0 8px 32px rgba(37,99,235,0.35)",
        }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-blue-100 text-xs font-semibold uppercase tracking-wide">AI-Powered · DeepSeek</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              Understand codebases<br className="hidden sm:block" /> 75% faster.
            </h1>
            <p className="text-blue-100 text-sm mt-2 max-w-xl">
              Analyse any GitHub repo to get a guided learning experience with adaptive paths, architecture maps, and living documentation.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link to="/analysis"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-cn-accent font-semibold text-sm hover:bg-blue-50 transition-colors shadow-sm">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
              Start Analysis
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ─── Main two cols ─── */}
      <div className="grid lg:grid-cols-[1fr,380px] gap-6">

        {/* Quick actions grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cn-text">Quick Actions</h2>
            <span className="text-xs text-cn-muted">All features</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {quickActions.map((a) => <QuickAction key={a.to} {...a} />)}
          </div>
        </div>

        {/* Right column: wizard + activity */}
        <div className="space-y-4">
          <OnboardingWizard />

          {/* Recent Activity */}
          <Card>
            <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              {activity.map((a, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className={`material-symbols-outlined shrink-0 mt-0.5 ${a.color}`} style={{ fontSize: 16 }}>{a.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-cn-text leading-snug">{a.text}</p>
                    <p className="text-[10px] text-cn-muted mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ─── Tech Stack Badges ─── */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-cn-muted uppercase tracking-wide mb-3">Powered By</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "React + Vite",      color: "#61dafb", bg: "rgba(97,218,251,0.1)" },
            { label: "AWS Serverless",    color: "#ff9900", bg: "rgba(255,153,0,0.1)"  },
            { label: "DeepSeek AI",       color: "#2563eb", bg: "rgba(37,99,235,0.1)"  },
            { label: "Tailwind CSS",      color: "#38bdf8", bg: "rgba(56,189,248,0.1)" },
            { label: "Python Lambda",     color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
            { label: "DynamoDB",          color: "#a78bfa", bg: "rgba(167,139,250,0.1)"},
          ].map(({ label, color, bg }) => (
            <span key={label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ color, background: bg, borderColor: color + "30" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

import React, { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";

/* ── Nav structure ─────────────────────────────── */
const primaryNav = [
  { to: "/dashboard",     label: "Dashboard",     icon: "grid_view" },
  { to: "/analysis",      label: "Repo Analysis", icon: "manage_search" },
  { to: "/learning-path", label: "Learning Path", icon: "map" },
  { to: "/qa",            label: "Smart Q&A",     icon: "chat" },
  { to: "/architecture",  label: "Architecture",  icon: "account_tree" },
];

const moreNav = [
  { to: "/pr-review",   label: "PR Review",      icon: "rate_review" },
  { to: "/explanations", label: "Explanations",  icon: "auto_stories" },
  { to: "/progress",     label: "Progress",      icon: "bar_chart" },
  { to: "/tests",        label: "Tests",         icon: "science" },
  { to: "/tools",        label: "Tools",         icon: "build" },
  { to: "/archaeology",  label: "Archaeology",   icon: "travel_explore" },
  { to: "/therapy",      label: "Code Therapy",  icon: "psychology" },
  { to: "/reality",      label: "Reality TV",    icon: "live_tv" },
  { to: "/pokemon",      label: "Pokémon",       icon: "sports_esports" },
  { to: "/videos",       label: "Videos",        icon: "videocam" },
];

function SunIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

export function Layout() {
  const { currentRepo, theme, toggleTheme } = useAppContext();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const isDark = theme === "dark";
  const isMoreActive = moreNav.some((i) => location.pathname === i.to);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreOpen]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const navLinkClass = ({ isActive }) =>
    [
      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap",
      isActive
        ? "bg-cn-accent/10 text-cn-accent"
        : "text-cn-muted hover:text-cn-text hover:bg-cn-surface-elevated",
    ].join(" ");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--cn-bg)" }}>

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-40 border-b border-cn-border"
        style={{ background: "var(--cn-surface)", boxShadow: "var(--cn-shadow)" }}>
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex h-14 items-center gap-4">

            {/* Logo */}
            <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5 mr-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cn-accent text-white text-xs font-bold shadow-sm">
                CN
              </div>
              <div className="hidden sm:block leading-none">
                <div className="text-sm font-bold text-cn-text tracking-tight">
                  Code<span className="text-cn-accent">Narrative</span>
                </div>
                <div className="text-[10px] text-cn-muted">AI Codebase Intelligence</div>
              </div>
            </Link>

            {/* Primary nav — overflow-x-auto only wraps the primary links */}
            <nav className="nav-scroll hidden md:flex items-center gap-1 overflow-x-auto" aria-label="Main navigation">
              {primaryNav.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* More dropdown — sits OUTSIDE the overflow-x-auto nav so it never gets clipped */}
            <div className="relative hidden md:block" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={[
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap",
                  isMoreActive
                    ? "bg-cn-accent/10 text-cn-accent"
                    : "text-cn-muted hover:text-cn-text hover:bg-cn-surface-elevated",
                ].join(" ")}
              >
                More
                <svg className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {moreOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-56 rounded-xl border border-cn-border py-1.5 shadow-cn-lg"
                  style={{ background: "var(--cn-surface)", zIndex: 9999 }}
                >
                  {moreNav.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-cn-accent/10 text-cn-accent"
                            : "text-cn-muted hover:text-cn-text hover:bg-cn-surface-elevated",
                        ].join(" ")
                      }
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{item.icon}</span>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Repo badge */}
              {currentRepo && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cn-border bg-cn-surface-elevated text-xs">
                  <div className="h-1.5 w-1.5 rounded-full bg-cn-success animate-pulse" />
                  <span className="font-mono text-cn-text truncate max-w-[10rem]">
                    {currentRepo.name || "repo connected"}
                  </span>
                </div>
              )}

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-cn-border text-cn-muted hover:text-cn-text hover:bg-cn-surface-elevated transition-all"
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-cn-border text-cn-muted hover:text-cn-text hover:bg-cn-surface-elevated"
                aria-label="Toggle menu"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-cn-border md:hidden" style={{ background: "var(--cn-surface)" }}>
            <div className="px-4 py-3 flex flex-col gap-1">
              {[...primaryNav, ...moreNav].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-cn-accent/10 text-cn-accent"
                        : "text-cn-muted hover:text-cn-text hover:bg-cn-surface-elevated",
                    ].join(" ")
                  }
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 mx-auto w-full max-w-screen-xl px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-cn-border py-5" style={{ background: "var(--cn-surface)" }}>
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cn-muted">
          <span>
            Code<span className="text-cn-accent font-semibold">Narrative</span> AI — Powered by DeepSeek
          </span>
          <span>© {new Date().getFullYear()} · Built for international hackathon</span>
        </div>
      </footer>
    </div>
  );
}

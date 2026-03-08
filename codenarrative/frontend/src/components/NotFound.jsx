import React from "react";
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Big 404 */}
      <div className="relative mb-6">
        <p className="text-[120px] font-black leading-none select-none"
          style={{ background: "linear-gradient(135deg, var(--cn-accent), var(--cn-purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          404
        </p>
        <div className="absolute inset-0 blur-3xl opacity-20 rounded-full"
          style={{ background: "linear-gradient(135deg, var(--cn-accent), var(--cn-purple))" }} />
      </div>

      <h1 className="text-2xl font-bold text-cn-text mb-2">Page not found</h1>
      <p className="text-cn-muted text-sm max-w-sm mb-8">
        The page you're looking for doesn't exist. It may have been moved, deleted, or you may have typed the URL incorrectly.
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cn-accent text-white font-semibold text-sm hover:bg-cn-accent-hover transition-colors shadow-sm">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>
          Go to Dashboard
        </Link>
        <Link to="/analysis"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-cn-border text-cn-text font-semibold text-sm hover:bg-cn-surface-elevated transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>manage_search</span>
          Repo Analysis
        </Link>
      </div>
    </div>
  );
}

export default NotFound;

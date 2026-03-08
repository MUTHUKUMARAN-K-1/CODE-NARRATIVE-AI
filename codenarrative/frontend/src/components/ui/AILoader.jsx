import React from "react";

const STAGES = [
  { icon: "hub", text: "Connecting to DeepSeek R1…" },
  { icon: "psychology", text: "Analyzing with DeepSeek R1…" },
  { icon: "auto_awesome", text: "Generating insights…" },
  { icon: "check_circle", text: "Finalizing results…" },
];

/**
 * Full-page AI loading overlay used on heavy async operations.
 * Usage: <AILoader label="Analyzing PR diff…" stage={0|1|2|3} />
 */
export function AILoader({ label, subLabel, stage = 1 }) {
  const { icon, text } = STAGES[Math.min(stage, STAGES.length - 1)];
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 select-none">
      {/* Pulsing brain ring */}
      <div className="relative flex items-center justify-center">
        <span
          className="absolute inline-flex h-20 w-20 rounded-full bg-cn-accent/20 animate-ping"
          style={{ animationDuration: "1.4s" }}
        />
        <span
          className="absolute inline-flex h-14 w-14 rounded-full bg-cn-accent/30 animate-ping"
          style={{ animationDuration: "1.0s", animationDelay: "0.2s" }}
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-cn-accent/10 border border-cn-accent/30 shadow-lg shadow-cn-accent/20">
          <span className="material-symbols-outlined text-cn-accent" style={{ fontSize: 32 }}>
            {icon}
          </span>
        </div>
      </div>

      {/* DeepSeek R1 badge */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cn-accent/10 border border-cn-accent/20">
        <span className="inline-block h-2 w-2 rounded-full bg-cn-accent animate-pulse" />
        <span className="text-xs font-semibold text-cn-accent tracking-wide">DeepSeek R1 · AWS Bedrock</span>
      </div>

      {/* Label */}
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-cn-text">{label || text}</p>
        {subLabel && <p className="text-xs text-cn-muted">{subLabel}</p>}
      </div>

      {/* Animated dots progress bar */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-cn-accent"
            style={{
              animation: "pulse 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.18}s`,
              opacity: 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Inline spinner for button-level loading states.
 */
export function InlineSpinner({ className = "" }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/**
 * Card-level skeleton shimmer — drop-in for loading states inside cards.
 */
export function CardSkeleton({ lines = 4, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="h-4 skeleton rounded w-3/4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div
          key={i}
          className="h-3 skeleton rounded"
          style={{ width: `${65 + Math.random() * 25}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Step-by-step progress tracker for multi-stage operations (like repo analysis).
 */
export function StepProgress({ steps, currentStep }) {
  return (
    <div className="space-y-2 w-full max-w-sm">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                done
                  ? "bg-cn-success text-white"
                  : active
                  ? "bg-cn-accent text-white animate-pulse"
                  : "bg-cn-surface-elevated border border-cn-border"
              }`}
            >
              {done ? (
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
              ) : active ? (
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              ) : (
                <span className="text-[10px] text-cn-muted font-bold">{i + 1}</span>
              )}
            </div>
            <span
              className={`text-xs transition-colors duration-300 ${
                done ? "text-cn-success line-through" : active ? "text-cn-text font-semibold" : "text-cn-muted"
              }`}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

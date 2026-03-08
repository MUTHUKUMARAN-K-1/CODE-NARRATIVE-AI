import React from "react";
import clsx from "clsx";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold " +
  "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cn-accent/40 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none";

const variants = {
  primary:
    "bg-cn-accent hover:bg-cn-accent-hover text-white shadow-sm hover:shadow-md active:scale-[0.98]",
  success:
    "bg-cn-success hover:opacity-90 text-white shadow-sm active:scale-[0.98]",
  danger:
    "bg-cn-danger hover:opacity-90 text-white shadow-sm active:scale-[0.98]",
  outline:
    "border border-cn-border bg-transparent text-cn-text hover:bg-cn-surface-elevated hover:border-cn-border-strong",
  ghost:
    "bg-transparent text-cn-muted hover:bg-cn-surface-elevated hover:text-cn-text",
  info:
    "bg-cn-info hover:opacity-90 text-white shadow-sm active:scale-[0.98]",
};

export function Button({ variant = "primary", size = "md", className, children, ...props }) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-6 py-3 text-base" : "";
  return (
    <button
      className={clsx(base, variants[variant] || variants.primary, sizeClass, className)}
      {...props}
    >
      {children}
    </button>
  );
}

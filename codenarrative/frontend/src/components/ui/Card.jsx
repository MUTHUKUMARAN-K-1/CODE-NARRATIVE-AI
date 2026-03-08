import React from "react";
import clsx from "clsx";

export function Card({ className, children, glass }) {
  return (
    <div className={clsx(glass ? "card-glass" : "card", "p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return (
    <div className={clsx("flex items-center justify-between gap-4 mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={clsx("text-base font-semibold text-cn-text tracking-tight leading-tight", className)}>
      {children}
    </h3>
  );
}

export function CardBody({ className, children }) {
  return (
    <div className={clsx("text-sm text-cn-muted leading-relaxed", className)}>
      {children}
    </div>
  );
}

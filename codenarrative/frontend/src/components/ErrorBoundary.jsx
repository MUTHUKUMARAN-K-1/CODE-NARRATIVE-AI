import React from "react";
import { useRouteError } from "react-router-dom";

export function ErrorBoundary() {
  const error = useRouteError();
  const message = error?.message ?? String(error ?? "Something went wrong.");
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="rounded-2xl border-2 border-cn-border bg-cn-surface p-8 max-w-md">
        <h2 className="text-lg font-bold text-cn-text mb-2">Something went wrong</h2>
        <p className="text-sm text-cn-muted font-mono break-all mb-6">{message}</p>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-cn-accent text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

export default ErrorBoundary;

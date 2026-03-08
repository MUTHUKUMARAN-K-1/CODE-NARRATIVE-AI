import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

export function MermaidView({ code }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState("");

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const isDark = document.documentElement.classList.contains("dark");
    mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "neutral" });
    mermaid
      .render(`diagram-${Date.now()}`, code)
      .then(({ svg: svgStr }) => {
        if (!cancelled) setSvg(svgStr);
      })
      .catch(() => {
        if (!cancelled) setSvg("<p>Failed to render diagram.</p>");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-auto bg-cn-bg rounded-lg border border-cn-border p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

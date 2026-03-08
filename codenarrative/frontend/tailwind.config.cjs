/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ── cn-* tokens — opacity-composable via rgb channel vars ── */
        "cn-bg":               "var(--cn-bg)",
        "cn-surface":          "var(--cn-surface)",
        "cn-surface-elevated": "var(--cn-surface-elevated)",
        "cn-surface-glass":    "var(--cn-surface-glass)",
        "cn-border":           "var(--cn-border)",
        "cn-border-strong":    "var(--cn-border-strong)",
        "cn-text":             ({ opacityValue }) =>
          opacityValue !== undefined
            ? `rgb(var(--cn-text-rgb) / ${opacityValue})`
            : "var(--cn-text)",
        "cn-muted":            ({ opacityValue }) =>
          opacityValue !== undefined
            ? `rgb(var(--cn-muted-rgb) / ${opacityValue})`
            : "var(--cn-muted)",
        "cn-accent":           ({ opacityValue }) =>
          opacityValue !== undefined
            ? `rgb(var(--cn-accent-rgb) / ${opacityValue})`
            : "var(--cn-accent)",
        "cn-accent-hover":     "var(--cn-accent-hover)",
        "cn-success":          ({ opacityValue }) =>
          opacityValue !== undefined
            ? `rgb(var(--cn-success-rgb) / ${opacityValue})`
            : "var(--cn-success)",
        "cn-success-bg":       "var(--cn-success-bg)",
        "cn-info":             ({ opacityValue }) =>
          opacityValue !== undefined
            ? `rgb(var(--cn-info-rgb) / ${opacityValue})`
            : "var(--cn-info)",
        "cn-info-bg":          "var(--cn-info-bg)",
        "cn-danger":           ({ opacityValue }) =>
          opacityValue !== undefined
            ? `rgb(var(--cn-danger-rgb) / ${opacityValue})`
            : "var(--cn-danger)",
        "cn-danger-bg":        "var(--cn-danger-bg)",
        "cn-warn":             ({ opacityValue }) =>
          opacityValue !== undefined
            ? `rgb(var(--cn-warn-rgb) / ${opacityValue})`
            : "var(--cn-warn)",
        "cn-warn-bg":          "var(--cn-warn-bg)",
        "cn-green":            "var(--cn-green)",
        "cn-purple":           ({ opacityValue }) =>
          opacityValue !== undefined
            ? `rgb(var(--cn-purple-rgb) / ${opacityValue})`
            : "var(--cn-purple)",
        /* ── Feature accent colours (fixed) ── */
        "feature-teal":        "#14b8a6",
        "feature-blue":        "#3b82f6",
        "feature-pink":        "#ec4899",
        "feature-green":       "#22c55e",
        "feature-yellow":      "#eab308",
        "feature-red":         "#ef4444",
        "feature-orange":      "#f97316",
        "feature-arch-green":  "#22c55e",
        /* ── Landing page stitch tokens ── */
        primary:               "#2563eb",
        "primary-dark":        "#1d4ed8",
        "background-light":    "#f8f9fc",
        "surface-light":       "#ffffff",
        "lavender-light":      "#eef2ff",
        "lavender-accent":     "#818cf8",
        "cobalt-deep":         "#1e3a8a",
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        cn: "0.875rem",
      },
      boxShadow: {
        "cn":    "var(--cn-shadow)",
        "cn-md": "var(--cn-shadow-md)",
        "cn-lg": "var(--cn-shadow-lg)",
        soft:    "0 4px 20px -2px rgba(37,99,235,0.1)",
        glass:   "0 8px 32px 0 rgba(31,38,135,0.07)",
        stripe:  "0 30px 60px -12px rgba(50,50,93,0.15), 0 18px 36px -18px rgba(0,0,0,0.15)",
        glow:    "0 0 20px rgba(37,99,235,0.35)",
      },
      animation: {
        "toast-in": "toast-in 0.3s ease",
        shimmer:    "shimmer 1.6s infinite",
      },
      keyframes: {
        "toast-in": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to:   { transform: "translateX(0)",    opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

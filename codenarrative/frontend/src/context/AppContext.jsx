import React, { createContext, useContext, useState, useMemo, useEffect } from "react";

const THEME_KEY = "codenarrative-theme";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentRepo, setCurrentRepo] = useState(null);
  const [repoAnalysis, setRepoAnalysis] = useState(null);
  const [userProfile, setUserProfile] = useState({
    userId: "demo-user",
    experienceLevel: null,
    background: null
  });
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(THEME_KEY) || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const setTheme = (next) => {
    setThemeState(typeof next === "function" ? next(theme) : next);
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const addToast = (toast) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const value = useMemo(
    () => ({
      currentRepo,
      setCurrentRepo,
      repoAnalysis,
      setRepoAnalysis,
      userProfile,
      setUserProfile,
      loading,
      setLoading,
      addToast,
      theme,
      setTheme,
      toggleTheme
    }),
    [currentRepo, repoAnalysis, userProfile, loading, theme]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-6 right-6 space-y-3 z-50 pointer-events-none flex flex-col items-end"
        aria-live="polite"
        aria-label="Notifications"
      >
        <div className="pointer-events-auto space-y-3">
          {toasts.map((toast) => {
            const isError = toast.type === "error";
            return (
              <div
                key={toast.id}
                role="alert"
                aria-live={isError ? "assertive" : "polite"}
                className={`animate-toast-in card-glass px-5 py-3.5 shadow-cn-lg text-sm font-medium text-cn-text border flex items-center gap-3 min-w-[280px] ${
                  isError ? "border-cn-danger/50" : "border-cn-border"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isError ? "bg-cn-danger/15" : "bg-cn-success/15"
                }`}>
                  {isError ? (
                    <svg className="h-4 w-4 text-cn-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-cn-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span>{toast.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}

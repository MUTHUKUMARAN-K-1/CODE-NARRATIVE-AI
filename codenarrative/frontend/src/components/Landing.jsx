import React from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";

/* ── Icon helpers ─────────────────────────────────────────── */
function GithubIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483
           0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466
           -.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832
           .092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688
           -.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115
           2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595
           1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012
           2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022
               5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996
               4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072
               4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108
               0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

/* ── Feature card data ────────────────────────────────────── */
const FEATURES = [
  {
    icon: "folder_open",
    title: "Repo analysis",
    desc: "Paste any GitHub URL. Get an AI-powered map of the codebase, tech stack, critical files, and entry points in seconds.",
  },
  {
    icon: "map",
    title: "14-day learning path",
    desc: "Personalized onboarding roadmap by experience level and background. Day-by-day goals, files to read, and tasks.",
  },
  {
    icon: "chat_bubble",
    title: "Smart Q&A",
    desc: "Ask in plain English. Get answers with referenced files and follow-up suggestions. Quiz yourself on the last topic.",
  },
  {
    icon: "school",
    title: "Multilevel explanations",
    desc: "Select any function or class. See beginner, intermediate, and expert explanations with analogies and trade-offs.",
  },
  {
    icon: "account_tree",
    title: "Architecture maps",
    desc: "System diagrams, data flow, and file dependencies as Mermaid charts. Export to SVG for docs or slides.",
  },
  {
    icon: "science",
    title: "Legacy test generator",
    desc: "Pick functions from the tree. Generate unit tests and living documentation—purpose, I/O, edge cases.",
  },
];

/* ── Main component ───────────────────────────────────────── */
export default function Landing() {
  const { theme, toggleTheme } = useAppContext();
  const isDark = theme === "dark";

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden transition-colors duration-300">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 glass-nav dark:!bg-slate-900/90 dark:!border-slate-800 w-full transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 text-primary flex items-center justify-center bg-blue-50 dark:bg-blue-950 rounded-lg">
              <span className="material-symbols-outlined text-2xl">code_blocks</span>
            </div>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Code Narrative</h2>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {["Product", "Solutions", "Documentation", "Pricing"].map((item) => (
              <a key={item} href="#"
                className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 text-sm font-medium transition-colors">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            <a href="#" className="hidden sm:block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-colors">
              Sign in
            </a>
            <Link
              to="/dashboard"
              className="flex items-center justify-center rounded-full h-9 px-4 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium transition-all hover:shadow-lg"
            >
              Start Building
              <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── Hero ── */}
        <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-40 overflow-hidden">
          <div className="absolute inset-0 bg-white dark:bg-slate-950 z-0">
            <div className="stripe-hero-bg opacity-60 dark:opacity-20" />
            <div className="absolute inset-0 linear-grid opacity-50 dark:opacity-20" />
          </div>

          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
            {/* Left copy */}
            <div className="flex flex-col gap-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 w-fit shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-primary relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                </span>
                <span className="text-primary dark:text-blue-400 text-xs font-semibold uppercase tracking-wide">v3.0 Release</span>
              </div>

              <h1 className="text-slate-900 dark:text-white text-5xl lg:text-[4rem] font-extrabold leading-[1.1] tracking-tight">
                Infrastructure for <br />
                <span className="text-primary dark:text-blue-400">Understanding Code</span>
              </h1>

              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-lg font-normal">
                Instantly decode complex codebases. Our AI generates interactive documentation that evolves with your commits, making onboarding 75% faster.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center rounded-full h-12 px-8 bg-primary hover:bg-primary-dark text-white text-base font-semibold shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5"
                >
                  Start integration
                  <span className="material-symbols-outlined ml-2 text-sm">chevron_right</span>
                </Link>
                <button className="flex items-center justify-center rounded-full h-12 px-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-base font-semibold transition-all">
                  Read documentation
                </button>
              </div>

              <div className="flex items-center gap-6 pt-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                  <span>SOC2 Type II</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                  <span>GDPR Ready</span>
                </div>
              </div>
            </div>

            {/* Right: mock UI card */}
            <div className="relative w-full group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur-2xl opacity-20 group-hover:opacity-30 transition duration-1000" />
              <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-stripe border border-slate-200/60 dark:border-slate-700/60 overflow-hidden transition-transform duration-700 ease-out">
                <div className="h-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center px-4 justify-between">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                    auth-service / main.go
                  </div>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 min-h-[340px] relative">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0,200 Q150,250 300,150 T600,200" fill="none" stroke="#1349ec" strokeWidth="2" />
                    <path d="M0,220 Q150,270 300,170 T600,220" fill="none" stroke="#818cf8" strokeWidth="2" />
                  </svg>

                  <div className="flex gap-6">
                    <div className="flex-1 space-y-3">
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
                      <div className="h-2 bg-blue-100 dark:bg-blue-900/40 rounded w-full mt-4" />
                      <div className="h-2 bg-blue-50 dark:bg-blue-900/20 rounded w-11/12" />
                      <div className="h-2 bg-blue-50 dark:bg-blue-900/20 rounded w-4/5" />
                    </div>
                    <div className="w-48 bg-slate-900 rounded-lg p-4 shadow-xl text-white transform translate-y-8 -translate-x-2 border border-slate-700 shrink-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[10px] font-mono text-slate-400 uppercase">Live Analysis</span>
                      </div>
                      <div className="text-2xl font-bold mb-1">75%</div>
                      <div className="text-xs text-slate-400">Faster comprehension time</div>
                      <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-[75%]" />
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-100 dark:border-blue-900 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary dark:text-blue-400 text-sm mt-0.5">auto_awesome</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">AI Suggestion</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                        This function contains deprecated logic related to OAuth 1.0. View refactoring path.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature grid ── */}
        <section className="bg-white dark:bg-slate-900 py-24 relative overflow-hidden transition-colors duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-slate-900 dark:text-white text-3xl font-bold mb-4 tracking-tight">Designed for engineering velocity</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg">A suite of tools built with the precision of a compiler.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-0 border-t border-l border-slate-200 dark:border-slate-700">
              {FEATURES.map(({ icon, title, desc }) => (
                <div key={title} className="p-10 border-r border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                  <div className="w-10 h-10 mb-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined">{icon}</span>
                  </div>
                  <h3 className="text-slate-900 dark:text-white text-lg font-semibold mb-3">{title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Code demo ── */}
        <section className="py-24 bg-slate-50 dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-12 md:text-center">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Your documentation is now alive</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Watch how Code Narrative transforms a pull request into a learning module.</p>
            </div>
            <div className="code-window max-w-4xl mx-auto">
              <div className="code-header">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                <div className="ml-4 text-xs text-slate-400 font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  src/payment-gateway/processor.ts
                </div>
              </div>
              <div className="grid md:grid-cols-2">
                <div className="bg-[#1e1e1e] p-6 border-r border-[#333]">
                  <pre className="text-sm leading-6">
                    <span className="text-[#569cd6]">async function </span>
                    <span className="text-[#dcdcaa]">processPayment</span>(ctx) {"{"}
                    {"\n"}
                    {"  "}<span className="text-[#6a9955]">// Validate user session</span>{"\n"}
                    {"  "}<span className="text-[#c586c0]">const</span> user = <span className="text-[#c586c0]">await</span> auth.<span className="text-[#dcdcaa]">verify</span>(ctx);{"\n"}
                    {"  "}<span className="text-[#6a9955]">// Legacy check - to be removed in v4</span>{"\n"}
                    {"  "}<span className="text-[#c586c0]">if</span> (user.type === <span className="text-[#ce9178]">'GUEST'</span>) {"{"}{"\n"}
                    {"     "}<span className="text-[#c586c0]">throw new </span><span className="text-[#4ec9b0]">Error</span>(<span className="text-[#ce9178]">'Auth Required'</span>);{"\n"}
                    {"  "}{"}"}{"\n"}
                    {"  "}<span className="text-[#c586c0]">return</span> stripe.<span className="text-[#dcdcaa]">charges</span>.<span className="text-[#dcdcaa]">create</span>({"{"}{"\n"}
                    {"    "}amount: ctx.body.amount,{"\n"}
                    {"    "}currency: <span className="text-[#ce9178]">'usd'</span>{"\n"}
                    {"  "}{"}"});{"\n"}
                    {"}"}
                  </pre>
                </div>
                <div className="bg-[#252526] p-6 relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                  <div className="flex items-center gap-2 mb-4 text-[#cccccc]">
                    <span className="material-symbols-outlined text-purple-400 text-sm">auto_awesome</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Generated Narrative</span>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-[#333] p-3 rounded border-l-2 border-purple-500">
                      <p className="text-xs text-[#999] mb-1">Context</p>
                      <p className="text-sm text-[#ddd]">
                        This function handles the core payment logic. Note the dependency on the{" "}
                        <code className="bg-[#444] px-1 py-0.5 rounded text-xs">Auth Service</code>.
                      </p>
                    </div>
                    <div className="bg-[#333] p-3 rounded border-l-2 border-yellow-500 animate-pulse">
                      <p className="text-xs text-[#999] mb-1">Warning Detected</p>
                      <p className="text-sm text-[#ddd]">
                        The 'GUEST' check is flagged as legacy.{" "}
                        <span className="text-white font-semibold">Consider refactoring</span> to use the middleware pattern established in PR #402.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white">AI</div>
                      <div className="text-xs text-[#888]">Typing explanation<span className="cursor" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="bg-white dark:bg-slate-900 py-20 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12 text-center">
              {[
                { stat: "60%", label: "Faster Onboarding" },
                { stat: "3.5x", label: "Developer Productivity" },
                { stat: "40%", label: "Fewer Bugs Pre-Merge" },
              ].map(({ stat, label }, i) => (
                <div key={label} className={`flex flex-col gap-1 items-center ${i < 2 ? "md:border-r border-slate-100 dark:border-slate-800" : ""}`}>
                  <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 tracking-tight">
                    {stat}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA dark band ── */}
        <section className="bg-slate-900 dark:bg-slate-950 py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">Ready to decode your legacy?</h2>
            <p className="text-slate-400 mb-10 text-lg">
              Join engineering teams at Fortune 500s who have transformed their onboarding process with Code Narrative.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="w-full sm:w-auto flex items-center justify-center rounded-full h-12 px-8 bg-white hover:bg-slate-100 text-slate-900 text-base font-bold shadow-lg transition-all"
              >
                Get Started for Free
              </Link>
              <button className="w-full sm:w-auto flex items-center justify-center rounded-full h-12 px-8 bg-slate-800 border border-slate-700 hover:border-slate-600 text-white text-base font-bold shadow-sm transition-all">
                Contact Sales
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pt-16 pb-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-6">
                <div className="size-6 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">code_blocks</span>
                </div>
                <span className="font-bold text-base tracking-tight">Code Narrative</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
                Empowering developers to understand, document, and master complex codebases with AI-driven insights.
              </p>
            </div>

            {[
              { heading: "Product", links: ["Features", "Integrations", "Enterprise", "Changelog"] },
              { heading: "Resources", links: ["Documentation", "API Reference", "Community", "Blog"] },
              { heading: "Company", links: ["About", "Careers", "Legal", "Contact"] },
            ].map(({ heading, links }) => (
              <div key={heading} className="flex flex-col gap-4">
                <h4 className="text-slate-900 dark:text-white font-semibold text-sm">{heading}</h4>
                {links.map((l) => (
                  <a key={l} href="#" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-colors">{l}</a>
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400 text-sm">
              © {new Date().getFullYear()} Code Narrative AI, Inc.
            </div>
            <div className="flex gap-6">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                <GithubIcon />
              </a>
              <a href="#" className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                <TwitterIcon />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
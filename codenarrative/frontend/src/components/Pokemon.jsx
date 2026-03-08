import React, { useState } from "react";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";

const TYPE_COLORS = {
  Fire:    { bg: "#fef2f2", text: "#ef4444", border: "#fca5a5", dark: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" } },
  Water:   { bg: "#eff6ff", text: "#3b82f6", border: "#93c5fd", dark: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" } },
  Grass:   { bg: "#f0fdf4", text: "#22c55e", border: "#86efac", dark: { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.25)" } },
  Psychic: { bg: "#fdf4ff", text: "#a855f7", border: "#d8b4fe", dark: { bg: "rgba(168,85,247,0.1)", border: "rgba(168,85,247,0.25)" } },
  Rock:    { bg: "#fafaf9", text: "#78716c", border: "#d6d3d1", dark: { bg: "rgba(120,113,108,0.1)",border: "rgba(120,113,108,0.25)" } },
  Electric:{ bg: "#fefce8", text: "#eab308", border: "#fde047", dark: { bg: "rgba(234,179,8,0.1)",  border: "rgba(234,179,8,0.25)" } },
  Ice:     { bg: "#f0f9ff", text: "#22d3ee", border: "#67e8f9", dark: { bg: "rgba(34,211,238,0.1)", border: "rgba(34,211,238,0.25)" } },
  Normal:  { bg: "#f8fafc", text: "#64748b", border: "#cbd5e1", dark: { bg: "rgba(100,116,139,0.1)",border: "rgba(100,116,139,0.25)" } },
};

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.Normal;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ color: c.text, background: c.dark?.bg, border: `1px solid ${c.dark?.border}` }}>
      {type}
    </span>
  );
}

function PokemonCard({ p }) {
  return (
    <div className="card p-4 hover:shadow-cn-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl">
          {p.sprite || "🔮"}
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {p.types?.map((t) => <TypeBadge key={t} type={t} />)}
        </div>
      </div>
      <h3 className="font-bold text-cn-text">{p.name}</h3>
      <p className="text-xs text-cn-muted mt-0.5 mb-2">{p.module}</p>
      <p className="text-xs text-cn-text mb-3">{p.description}</p>
      {p.moves?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-cn-muted uppercase tracking-wide mb-1">Moves</p>
          <div className="flex flex-wrap gap-1">
            {p.moves.map((m) => (
              <span key={m} className="px-2 py-0.5 rounded-md bg-cn-surface-elevated border border-cn-border text-[10px] text-cn-text">{m}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Pokemon() {
  const { currentRepo, addToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const generate = async () => {
    if (!currentRepo?.id) { addToast({ message: "Analyse a repository first." }); return; }
    try {
      setLoading(true); setData(null);
      const res = await api.pokemon(currentRepo.id);
      setData(res);
    } catch (err) { addToast({ message: `Failed: ${err.message}` }); }
    finally { setLoading(false); }
  };

  const pokemon = data?.pokemon || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h1 className="page-title">Pokémon Archetypes</h1>
            <p className="page-desc">Your codebase modules mapped to Pokémon-style archetypes — types, moves, and abilities.</p>
          </div>
        </div>
        <Button variant="primary" onClick={generate} disabled={loading || !currentRepo}
          style={{ background: "#eab308", color: "#1a1a1a" }}>
          {loading ? (
            <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span> Generating…</>
          ) : (
            <><span>⚡</span> Generate</>
          )}
        </Button>
      </div>

      {!currentRepo && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">🎮</div>
          <p className="font-semibold text-cn-text mb-1">No repository connected</p>
          <p className="text-sm text-cn-muted">Analyse a repository first to discover what Pokémon your modules are.</p>
        </div>
      )}

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      )}

      {pokemon.length > 0 && !loading && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pokemon.map((p, i) => <PokemonCard key={i} p={p} />)}
          </div>
          {data?.team_summary && (
            <Card>
              <CardHeader><CardTitle>Team Summary</CardTitle></CardHeader>
              <CardBody><p className="text-cn-text">{data.team_summary}</p></CardBody>
            </Card>
          )}
        </>
      )}

      {data && !loading && pokemon.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-3">🎴</div>
          <p className="text-sm text-cn-muted">No Pokémon discovered. Try again or use a different repository.</p>
        </div>
      )}
    </div>
  );
}

export default Pokemon;

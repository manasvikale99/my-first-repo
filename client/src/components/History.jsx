import { useState, useEffect } from "react";
import { Card, Label } from "./ui.jsx";

export default function History({ onSelect }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then(r => r.json())
      .then(h => { setHistory(h); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function deleteEntry(id, e) {
    e.stopPropagation();
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    setHistory(h => h.filter(x => x.id !== id));
  }

  async function clearAll() {
    if (!confirm("Clear all history?")) return;
    await fetch("/api/history", { method: "DELETE" });
    setHistory([]);
  }

  function scoreColor(s) {
    if (s >= 75) return "#1D9E75";
    if (s >= 50) return "#BA7517";
    return "#E24B4A";
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Scan History</div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>All analyses saved locally to <code style={{ fontSize: 12 }}>data/history.json</code></div>
        </div>
        {history.length > 0 && (
          <button onClick={clearAll} style={{ fontSize: 12, color: "var(--red)", background: "none", border: "0.5px solid var(--red)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>
            Clear all
          </button>
        )}
      </div>

      {loading && <div style={{ color: "var(--text-3)", fontSize: 13 }}>Loading…</div>}

      {!loading && history.length === 0 && (
        <Card>
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-3)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14 }}>No scans yet</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Your analyses will appear here after scoring</div>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {history.map(entry => (
          <div key={entry.id} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            {/* Score circle */}
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${scoreColor(entry.overallScore)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(entry.overallScore) }}>{entry.overallScore}</span>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry.jobTitle}{entry.company ? ` — ${entry.company}` : ""}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
                {entry.atsName} • {entry.atsPassProbability} • {new Date(entry.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* Delete */}
            <button onClick={(e) => deleteEntry(entry.id, e)} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 16, padding: "4px 6px", cursor: "pointer", flexShrink: 0 }}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

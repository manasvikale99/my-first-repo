export default function Sidebar({ view, setView, onNew }) {
  const btn = (v, label, icon) => (
    <button
      onClick={() => setView(v)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "9px 14px", borderRadius: 8, border: "none",
        background: view === v ? "rgba(29,158,117,0.12)" : "transparent",
        color: view === v ? "var(--green)" : "var(--text-2)",
        fontWeight: view === v ? 500 : 400, fontSize: 14,
        textAlign: "left", cursor: "pointer",
        transition: "background 0.15s"
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span> {label}
    </button>
  );

  return (
    <aside style={{
      width: 200, flexShrink: 0, background: "var(--surface)",
      borderRight: "0.5px solid var(--border)", padding: "24px 12px",
      display: "flex", flexDirection: "column", gap: 4,
      minHeight: "100vh", position: "sticky", top: 0, height: "100vh"
    }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", padding: "0 14px 20px" }}>
        ATS Scanner
      </div>

      {btn("scanner", "Scanner", "🎯")}
      {btn("history", "History", "📋")}

      <div style={{ flex: 1 }} />

      <button
        onClick={onNew}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 14px", borderRadius: 8,
          border: "0.5px solid var(--border-md)",
          background: "transparent", color: "var(--text-2)",
          fontSize: 14, cursor: "pointer", width: "100%", textAlign: "left"
        }}
      >
        <span>＋</span> New scan
      </button>
    </aside>
  );
}

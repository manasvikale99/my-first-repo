// ─── Shared UI primitives ─────────────────────────────────────────────────────

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "0.5px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "20px 24px",
      ...style
    }}>
      {children}
    </div>
  );
}

export function Label({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: "var(--text-3)",
      letterSpacing: "0.06em", textTransform: "uppercase",
      marginBottom: 10, ...style
    }}>
      {children}
    </div>
  );
}

export function Pill({ children, bg, text }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 500,
      padding: "3px 10px", borderRadius: 20,
      background: bg, color: text
    }}>
      {children}
    </span>
  );
}

export function ATSBadge({ ats }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600,
      padding: "3px 10px", borderRadius: 20,
      background: ats.badge, color: ats.badgeText
    }}>
      {ats.name}
    </span>
  );
}

export function ScoreRing({ score }) {
  const color = score >= 75 ? "var(--green)" : score >= 50 ? "var(--amber)" : "var(--red)";
  const textColor = score >= 75 ? "var(--green-text)" : score >= 50 ? "var(--amber-text)" : "var(--red-text)";
  const r = 40, cx = 48, cy = 48, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="96" height="96" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 6} textAnchor="middle"
        style={{ fontSize: 20, fontWeight: 700, fill: textColor, fontFamily: "system-ui, sans-serif" }}>
        {score}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle"
        style={{ fontSize: 10, fill: "#9a9a94", fontFamily: "system-ui, sans-serif" }}>
        /100
      </text>
    </svg>
  );
}

export function ScoreBar({ score }) {
  const color = score >= 75 ? "var(--green)" : score >= 50 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{ height: 5, background: "var(--bg)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
    </div>
  );
}

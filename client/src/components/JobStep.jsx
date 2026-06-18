import { useState } from "react";
import { Card, Label, ATSBadge } from "./ui.jsx";

export default function JobStep({ onJobLoaded, onError, onLog, log }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!url.trim()) return;
    setLoading(true);
    onLog("Fetching job posting...");
    onError("");

    try {
      const res = await fetch("/api/fetch-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch job");
      onLog("");
      onJobLoaded(data);
    } catch (e) {
      onLog("");
      onError(e.message);
      setLoading(false);
    }
  }

  return (
    <Card>
      <Label>Job Posting URL</Label>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14, lineHeight: 1.6 }}>
        Paste any job posting URL. The server directly fetches the page — no API middleman — so ATS detection and JD extraction are accurate.
      </p>
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => e.key === "Enter" && !loading && handleSubmit()}
        placeholder="https://boards.greenhouse.io/company/jobs/123"
        disabled={loading}
        style={{
          width: "100%", padding: "11px 14px", borderRadius: "var(--radius)",
          border: "0.5px solid var(--border-md)", background: "var(--bg)",
          color: "var(--text)", fontSize: 14, marginBottom: 14
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={handleSubmit}
          disabled={loading || !url.trim()}
          style={{
            padding: "10px 22px", borderRadius: "var(--radius)",
            border: "none", background: loading ? "var(--border)" : "var(--green)",
            color: "#fff", fontWeight: 500, fontSize: 14
          }}
        >
          {loading ? "Fetching…" : "Detect ATS & Extract JD →"}
        </button>
        {log && <span style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>{log}</span>}
      </div>

      <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--bg)", borderRadius: "var(--radius)", border: "0.5px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 8 }}>DETECTED SYSTEMS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["Greenhouse", "Lever", "Workday", "iCIMS", "Taleo", "SAP SF", "SmartRecruiters", "Ashby", "Workable"].map(n => (
            <span key={n} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--surface)", border: "0.5px solid var(--border-md)", color: "var(--text-2)" }}>{n}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

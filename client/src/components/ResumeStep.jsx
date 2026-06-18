import { useState, useRef } from "react";
import { Card, Label, ATSBadge } from "./ui.jsx";

export default function ResumeStep({ jobData, step, log, onChangeJob, onAnalyzing, onResults, onError, onLog }) {
  const [resumeText, setResumeText] = useState("");
  const [resumeSource, setResumeSource] = useState("paste"); // paste | pdf | txt
  const [fileName, setFileName] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const pdfRef = useRef();
  const txtRef = useRef();

  const isAnalyzing = step === "analyzing";
  const hasResume = resumeSource === "pdf" ? !!fileName : resumeText.trim().length > 50;

  async function handlePDF(e) {
    const file = e.target.files[0];
    if (!file) return;
    onLog("Parsing PDF…");
    onError("");
    const formData = new FormData();
    formData.append("resume", file);
    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResumeText(data.text);
      setResumeSource("pdf");
      setFileName(file.name);
      setWordCount(data.wordCount);
      onLog("");
    } catch (e) {
      onError(e.message);
      onLog("");
    }
    e.target.value = "";
  }

  async function handleTXT(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setResumeText(text);
    setResumeSource("txt");
    setFileName(file.name);
    setWordCount(text.trim().split(/\s+/).length);
    e.target.value = "";
  }

  function handlePaste(e) {
    setResumeText(e.target.value);
    setResumeSource("paste");
    setFileName("");
    setWordCount(e.target.value.trim().split(/\s+/).length);
  }

  async function score() {
    if (!hasResume) return;
    onAnalyzing();
    onLog("Phase 1/2 — scoring keywords & requirements…");
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobData, resumeText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLog("");
      onResults(data);
    } catch (e) {
      onError(e.message);
      onLog("");
    }
  }

  const ats = jobData.ats;

  return (
    <>
      {/* ATS Detection Card */}
      <Card style={{ borderLeft: `3px solid ${ats.color}`, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              {jobData.title}{jobData.company ? ` — ${jobData.company}` : ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <ATSBadge ats={ats} />
              {jobData.rawJD && jobData.rawJD.length > 100 && (
                <span style={{ fontSize: 11, background: "var(--green-bg)", color: "var(--green-text)", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>
                  ✓ JD extracted ({Math.round(jobData.rawJD.split(" ").length)} words)
                </span>
              )}
            </div>
          </div>
          <button onClick={onChangeJob} style={{ fontSize: 12, color: "var(--text-3)", background: "none", border: "0.5px solid var(--border)", borderRadius: 6, padding: "4px 10px" }}>
            Change URL
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 14 }}>{ats.description}</p>

        <Label>How {ats.name} filters candidates</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ats.filterLayers.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: ats.badgeText, background: ats.badge, borderRadius: 4, padding: "2px 7px", flexShrink: 0, marginTop: 1, letterSpacing: "0.02em" }}>
                L{i + 1}
              </span>
              <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{l}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, background: "var(--bg)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
          <Label style={{ marginBottom: 6 }}>Key rules for {ats.name}</Label>
          {ats.keyRules.map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 3, lineHeight: 1.5 }}>• {r}</div>
          ))}
        </div>
      </Card>

      {/* Resume Input Card */}
      <Card>
        <Label>Your Resume</Label>

        {/* File loaded indicator */}
        {fileName && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--green-bg)", border: "0.5px solid var(--green)", borderRadius: "var(--radius)", padding: "8px 12px", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "var(--green-text)" }}>
              {resumeSource === "pdf" ? "📄" : "📝"} {fileName} — {wordCount} words parsed
            </span>
            <button onClick={() => { setResumeText(""); setFileName(""); setResumeSource("paste"); setWordCount(0); }}
              style={{ background: "none", border: "none", color: "var(--red)", fontSize: 14, padding: "0 4px" }}>✕</button>
          </div>
        )}

        {/* Upload buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button onClick={() => pdfRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: "var(--radius)", border: `1.5px solid ${resumeSource === "pdf" ? "var(--green)" : "var(--border-md)"}`, background: resumeSource === "pdf" ? "var(--green-bg)" : "var(--surface)", color: resumeSource === "pdf" ? "var(--green-text)" : "var(--text)", fontSize: 13, fontWeight: 500 }}>
            📄 Upload PDF
          </button>
          <input ref={pdfRef} type="file" accept=".pdf" onChange={handlePDF} style={{ display: "none" }} />

          <button onClick={() => txtRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: "var(--radius)", border: `1.5px solid ${resumeSource === "txt" ? "var(--green)" : "var(--border-md)"}`, background: resumeSource === "txt" ? "var(--green-bg)" : "var(--surface)", color: resumeSource === "txt" ? "var(--green-text)" : "var(--text)", fontSize: 13 }}>
            📝 Upload .txt
          </button>
          <input ref={txtRef} type="file" accept=".txt,.doc,.docx" onChange={handleTXT} style={{ display: "none" }} />

          <span style={{ fontSize: 12, color: "var(--text-3)", alignSelf: "center" }}>or paste below</span>
        </div>

        <textarea
          value={resumeText}
          onChange={handlePaste}
          placeholder="Paste your full resume text here as an alternative to uploading…"
          rows={12}
          style={{ width: "100%", padding: "12px 14px", borderRadius: "var(--radius)", border: "0.5px solid var(--border-md)", background: "var(--bg)", color: "var(--text)", resize: "vertical", lineHeight: 1.6, fontSize: 13, fontFamily: "SF Mono, Fira Code, monospace" }}
        />

        {wordCount > 0 && (
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{wordCount} words detected</div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <button
            onClick={score}
            disabled={isAnalyzing || !hasResume}
            style={{ padding: "11px 26px", borderRadius: "var(--radius)", border: "none", background: isAnalyzing || !hasResume ? "var(--border)" : ats.color, color: "#fff", fontWeight: 600, fontSize: 14 }}
          >
            {isAnalyzing ? "Analysing…" : `Score Against ${ats.name} →`}
          </button>
          {log && <span style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>{log}</span>}
        </div>
      </Card>
    </>
  );
}

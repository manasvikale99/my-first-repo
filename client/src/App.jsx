import { useState, useRef } from "react";
import JobStep from "./components/JobStep.jsx";
import ResumeStep from "./components/ResumeStep.jsx";
import Results from "./components/Results.jsx";
import History from "./components/History.jsx";
import Sidebar from "./components/Sidebar.jsx";

export default function App() {
  const [view, setView] = useState("scanner"); // scanner | history
  const [step, setStep] = useState("url");     // url | job-ready | analyzing | results
  const [jobData, setJobData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [log, setLog] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setStep("url"); setJobData(null); setAnalysis(null); setLog(""); setError("");
  }
  function startOver() {
    setStep("job-ready"); setAnalysis(null); setLog(""); setError("");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar view={view} setView={setView} onNew={reset} />

      <main style={{ flex: 1, padding: "32px 40px", maxWidth: 760, margin: "0 auto", width: "100%" }}>
        {view === "history" ? (
          <History onSelect={(entry) => { setView("scanner"); }} />
        ) : (
          <>
            {/* Progress bar */}
            <ProgressBar step={step} />

            {error && (
              <div style={{ background: "var(--red-bg)", border: "0.5px solid var(--red)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13, color: "var(--red-text)", marginBottom: 16 }}>
                {error}
                <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", color: "var(--red-text)", fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}

            {(step === "url") && (
              <JobStep
                onJobLoaded={(data) => { setJobData(data); setStep("job-ready"); setError(""); }}
                onError={setError}
                onLog={setLog}
                log={log}
              />
            )}

            {(step === "job-ready" || step === "analyzing") && jobData && (
              <ResumeStep
                jobData={jobData}
                step={step}
                log={log}
                onChangeJob={reset}
                onAnalyzing={() => { setStep("analyzing"); setError(""); }}
                onResults={(result) => { setAnalysis(result); setStep("results"); }}
                onError={(e) => { setError(e); setStep("job-ready"); }}
                onLog={setLog}
              />
            )}

            {step === "results" && analysis && jobData && (
              <Results
                analysis={analysis}
                jobData={jobData}
                onStartOver={startOver}
                onReset={reset}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ProgressBar({ step }) {
  const steps = ["Job URL", "ATS Detected", "Resume", "Results"];
  const idx = { url: 0, "job-ready": 1, analyzing: 2, results: 3 };
  const cur = idx[step] ?? 0;
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 0 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: i <= cur ? "var(--green)" : "var(--surface)",
              border: `1.5px solid ${i <= cur ? "var(--green)" : "var(--border-md)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600,
              color: i <= cur ? "#fff" : "var(--text-3)",
              flexShrink: 0
            }}>
              {i < cur ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 11, color: i <= cur ? "var(--text)" : "var(--text-3)", fontWeight: i <= cur ? 500 : 400, whiteSpace: "nowrap" }}>{s}</span>
          </div>
          {i < 3 && (
            <div style={{ flex: 1, height: 1, background: i < cur ? "var(--green)" : "var(--border)", margin: "0 8px", marginBottom: 20 }} />
          )}
        </div>
      ))}
    </div>
  );
}

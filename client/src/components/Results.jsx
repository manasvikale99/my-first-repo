import { Card, Label, ATSBadge, ScoreRing, ScoreBar, Pill } from "./ui.jsx";

export default function Results({ analysis, jobData, onStartOver, onReset }) {
  const ats = jobData.ats;
  const sc = scoreColor(analysis.overallScore);

  return (
    <>
      {/* ── Score header ── */}
      <Card style={{ borderLeft: `3px solid ${sc.bar}`, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <ScoreRing score={analysis.overallScore} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              {analysis.jobTitle || jobData.title}
              {(analysis.company || jobData.company) ? ` — ${analysis.company || jobData.company}` : ""}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              <ATSBadge ats={ats} />
              <Pill bg={sc.bg} text={sc.text}>ATS Pass: {analysis.atsPassProbability}</Pill>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{analysis.scoreExplanation}</p>
          </div>
        </div>
      </Card>

      {/* ── Score breakdown ── */}
      <Card style={{ marginBottom: 14 }}>
        <Label>Score Breakdown</Label>
        {[
          { key: "keywordMatch",        label: "Keyword Match" },
          { key: "formatCompliance",    label: "Format Compliance" },
          { key: "requirementCoverage", label: "Requirement Coverage" },
          { key: "quantification",      label: "Quantification of Achievements" },
          { key: "atsSpecific",         label: `${ats.name}-Specific Compliance` }
        ].map(({ key, label }) => {
          const dim = analysis.scores?.[key];
          if (!dim) return null;
          const c = scoreColor(dim.score || 0);
          return (
            <div key={key} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{dim.score}/100</span>
              </div>
              <ScoreBar score={dim.score} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                {dim.missing?.length > 0 && (
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: "var(--red)", fontWeight: 500 }}>Missing: </span>
                    {dim.missing.slice(0, 7).map(k => (
                      <span key={k} style={{ background: "var(--red-bg)", color: "var(--red-text)", borderRadius: 4, padding: "1px 7px", marginRight: 4, display: "inline-block", marginBottom: 3, fontSize: 11 }}>{k}</span>
                    ))}
                  </div>
                )}
                {dim.found?.length > 0 && (
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: "var(--green)", fontWeight: 500 }}>Found: </span>
                    {dim.found.slice(0, 7).map(k => (
                      <span key={k} style={{ background: "var(--green-bg)", color: "var(--green-text)", borderRadius: 4, padding: "1px 7px", marginRight: 4, display: "inline-block", marginBottom: 3, fontSize: 11 }}>{k}</span>
                    ))}
                  </div>
                )}
                {dim.gaps?.length > 0 && (
                  <div style={{ fontSize: 12, color: "var(--red-text)" }}>
                    <strong>Gaps: </strong>{dim.gaps.slice(0, 4).join(" • ")}
                  </div>
                )}
                {dim.issues?.length > 0 && (
                  <div style={{ fontSize: 12, color: "var(--amber-text)" }}>{dim.issues.slice(0, 2).join(" • ")}</div>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {/* ── Critical killers ── */}
      {analysis.criticalKillers?.length > 0 && (
        <Card style={{ borderLeft: "3px solid var(--red)", background: "var(--red-bg)", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--red-text)", marginBottom: 8 }}>
            ⚠ Auto-Rejection Risks — Fix These First
          </div>
          {analysis.criticalKillers.map((k, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--red-text)", marginBottom: 5, lineHeight: 1.5 }}>• {k}</div>
          ))}
        </Card>
      )}

      {/* ── Priority fixes ── */}
      {analysis.highPriorityFixes?.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <Label>Specific Changes — Priority Order</Label>
          {analysis.highPriorityFixes.map((fix, i) => (
            <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: i < analysis.highPriorityFixes.length - 1 ? "0.5px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: "#EEEDFE", color: "#3C3489", padding: "2px 9px", borderRadius: 20 }}>
                  #{fix.priority || i + 1}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>{fix.section}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 12, lineHeight: 1.6 }}>{fix.issue}</p>
              {fix.before && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Current (from your resume):</div>
                  <div style={{ background: "var(--red-bg)", border: "0.5px solid #F09595", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 12, color: "var(--red-text)", lineHeight: 1.7, fontFamily: "SF Mono, Fira Code, monospace", whiteSpace: "pre-wrap" }}>
                    {fix.before}
                  </div>
                </div>
              )}
              {fix.after && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Rewrite to:</div>
                  <div style={{ background: "var(--green-bg)", border: "0.5px solid #5DCAA5", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 12, color: "var(--green-text)", lineHeight: 1.7, fontFamily: "SF Mono, Fira Code, monospace", whiteSpace: "pre-wrap" }}>
                    {fix.after}
                  </div>
                </div>
              )}
              {fix.reason && (
                <p style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", lineHeight: 1.5 }}>Why: {fix.reason}</p>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* ── Keywords to add ── */}
      {analysis.keywordsToAdd?.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <Label>Keywords to Add</Label>
          {analysis.keywordsToAdd.map((kw, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: i < analysis.keywordsToAdd.length - 1 ? "0.5px solid var(--border)" : "none", alignItems: "flex-start" }}>
              <span style={{ fontSize: 12, fontWeight: 500, background: "var(--amber-bg)", color: "var(--amber-text)", padding: "3px 11px", borderRadius: 20, flexShrink: 0, whiteSpace: "nowrap" }}>
                {kw.keyword}
              </span>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>Add to: {kw.whereToAdd}</div>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, fontStyle: "italic" }}>"{kw.context}"</p>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ── Section analysis ── */}
      {analysis.sectionsAnalysis?.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <Label>Section-by-section Analysis</Label>
          {analysis.sectionsAnalysis.map((sec, i) => {
            const c = scoreColor(sec.score || 0);
            return (
              <div key={i} style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
                <div style={{ textAlign: "center", width: 44, flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: c.text }}>{sec.score}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>/100</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{sec.section}</div>
                  <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{sec.feedback}</p>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* ── ATS-specific tips ── */}
      {analysis.atsSpecificTips?.length > 0 && (
        <Card style={{ background: ats.badge, borderLeft: `3px solid ${ats.color}`, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: ats.badgeText, marginBottom: 8 }}>
            {ats.name} — specific tips for this application
          </div>
          {analysis.atsSpecificTips.map((t, i) => (
            <div key={i} style={{ fontSize: 13, color: ats.badgeText, marginBottom: 5, lineHeight: 1.5, opacity: 0.9 }}>• {t}</div>
          ))}
        </Card>
      )}

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 10, marginTop: 8, paddingBottom: 40 }}>
        <button onClick={onStartOver} style={{ padding: "10px 20px", borderRadius: "var(--radius)", border: "0.5px solid var(--border-md)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}>
          Try Different Resume
        </button>
        <button onClick={onReset} style={{ padding: "10px 20px", borderRadius: "var(--radius)", border: "0.5px solid var(--border)", background: "transparent", color: "var(--text-2)", fontSize: 13 }}>
          Analyse New Job
        </button>
      </div>
    </>
  );
}

function scoreColor(s) {
  if (s >= 75) return { bg: "var(--green-bg)", text: "var(--green-text)", bar: "var(--green)" };
  if (s >= 50) return { bg: "var(--amber-bg)", text: "var(--amber-text)", bar: "var(--amber)" };
  return { bg: "var(--red-bg)", text: "var(--red-text)", bar: "var(--red)" };
}

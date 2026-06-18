require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const pdfParse = require("pdf-parse");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, "../data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, "[]");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── ATS patterns ─────────────────────────────────────────────────────────────
const ATS_PATTERNS = {
  workday: {
    name: "Workday", color: "#0066CC", badge: "#E6F1FB", badgeText: "#0C447C",
    urlPatterns: ["myworkdayjobs.com", "wd1.myworkdayjobs", "wd3.myworkdayjobs", "wd5.myworkdayjobs"],
    htmlPatterns: ["workday", "myworkdayjobs"],
    description: "Fortune 500 & large enterprise ATS. NLP-based ranking + hard knockout screener questions.",
    filterLayers: [
      "OCR parsing (.docx preferred — 23% fewer errors than design-tool PDFs)",
      "Binary knockout screeners — one wrong answer = instant auto-reject before human sees resume",
      "NLP keyword ranking with semantic matching (but exact terms still drive recruiter search)",
      "Form fields often weighted above uploaded resume — fill every optional field",
      "Recency — first 24h applicants get priority queue position"
    ],
    keyRules: [
      "Apply within 24h of posting — first-in-first-out pipeline logic",
      "Use .docx format — 23% fewer parse errors than Canva/Figma PDFs",
      "Single-column layout only — no tables, text boxes, graphics, headers/footers",
      "Use 'Apply with LinkedIn' when available — bypasses OCR entirely",
      "Include both acronym AND full form: 'usability testing (UT)'",
      "Complete every optional form field — data used for recruiter filtering",
      "Standard section headers only: Experience, Education, Skills"
    ]
  },
  greenhouse: {
    name: "Greenhouse", color: "#24A148", badge: "#E1F5EE", badgeText: "#085041",
    urlPatterns: ["greenhouse.io", "boards.greenhouse.io", "job-boards.greenhouse.io"],
    htmlPatterns: ["greenhouse", "powered by greenhouse"],
    description: "Tech & startup ATS. Human scorecard-driven — zero algorithmic auto-rejection. Greenhouse AI summary launched Sept 2025.",
    filterLayers: [
      "Resume parsing into structured profile (2024 engine: cleaner PDF handling)",
      "Greenhouse AI generates 2–4 sentence summary shown to recruiter before they read resume",
      "Per-role scorecard: hiring manager manually rates each criterion independently",
      "Keyword search visibility — recruiter searches candidate DB by exact term",
      "Criteria coverage: resumes addressing 80%+ of JD requirements get 3.2x higher interview rate"
    ],
    keyRules: [
      "PDF preferred — parses cleanly since 2024 engine upgrade",
      "No algorithmic auto-reject — every rejection is a deliberate human decision",
      "Mirror exact JD language — scorecards are literally built from JD text",
      "Every JD requirement needs a direct evidence bullet in your resume",
      "5+ quantified bullets → 34% higher advancement rate in Greenhouse",
      "First 3 bullets become the Greenhouse AI summary — make them count",
      "Address 80%+ of listed requirements for 3.2x higher interview rate"
    ]
  },
  lever: {
    name: "Lever", color: "#6366F1", badge: "#EEEDFE", badgeText: "#3C3489",
    urlPatterns: ["lever.co", "hire.lever.co", "jobs.lever.co"],
    htmlPatterns: ["lever", "powered by lever"],
    description: "Mid-market ATS+CRM. Stem-aware keyword search but NO abbreviation matching. Talent Fit AI ranking (2025).",
    filterLayers: [
      "Parsing extracts keywords from ALL resume sections, not just Skills list",
      "Stem-aware search (collaborating/collaborate match) — but abbreviations DON'T match full terms",
      "Talent Fit AI ranking engine (2025) — surfaces matches against past successful hires",
      "CRM retains past applicants — warm pipeline for recruiter outreach",
      "Source attribution tracked — which job board you applied from is recorded"
    ],
    keyRules: [
      "Always write BOTH full term AND acronym: 'thematic analysis (TA)' not just 'TA'",
      "'UXR' will NOT match a search for 'UX Research' — Lever can't resolve abbreviations",
      "Keywords are indexed from bullet points, not only the Skills section",
      "Past applicants stay in CRM — prior contact makes recruiter outreach warmer",
      "Clean standard PDF or .docx — no design-heavy layouts"
    ]
  },
  icims: {
    name: "iCIMS", color: "#E8520A", badge: "#FAECE7", badgeText: "#712B13",
    urlPatterns: ["icims.com", "jobs.icims.com", "careers.icims.com"],
    htmlPatterns: ["icims", "powered by icims"],
    description: "Large enterprise & regulated industries. Algorithmic Match Score visible to recruiter. Cautious responsible-AI approach.",
    filterLayers: [
      "OCR parsing — visual resume preserved AND structured profile created separately",
      "Auto-skill tagging from FULL resume text context — not just Skills section",
      "Per-question knockout logic — answering 'No' to any required qualifier = hard auto-reject",
      "Match Score ranks candidates in recruiter queue — this score is visible to the recruiter",
      "Keyword search against auto-tagged profile + parsed text"
    ],
    keyRules: [
      "Use standard fonts only: Calibri, Arial, Georgia — unusual fonts break OCR parsing",
      "Complete EVERY profile section even if it duplicates resume content",
      "Knockout question 'No' = permanent hard reject, no human review",
      "Describe skills in bullet context — auto-indexed more accurately than listed skills",
      "Match Score factors profile completeness — incomplete profiles rank lower",
      "Recruiter sees your actual visual resume — formatting quality matters here"
    ]
  },
  taleo: {
    name: "Oracle Taleo", color: "#C74634", badge: "#FCEBEB", badgeText: "#501313",
    urlPatterns: ["taleo.net", "tbe.taleo.net", "oracle.taleo.net"],
    htmlPatterns: ["taleo"],
    description: "Legacy enterprise ATS. Heavy exact keyword matching. Common in large traditional enterprises.",
    filterLayers: [
      "Text extracted from resume paste into form fields",
      "Keyword density ranking — higher count of matching terms = higher rank",
      "Exact keyword matching — significantly less semantic than Workday",
      "Structured profile fields weighted heavily in candidate ranking",
      "Standard section header recognition required"
    ],
    keyRules: [
      "Use exact JD keywords — Taleo relies on exact matching far more than NLP",
      "Paste resume text carefully into the form fields",
      "Standard headers required: Work Experience, Education, Skills",
      "Repeat key skills naturally throughout bullets to improve density ranking",
      "No graphics, tables, or any non-text elements"
    ]
  },
  successfactors: {
    name: "SAP SuccessFactors", color: "#0070F2", badge: "#E6F1FB", badgeText: "#0C447C",
    urlPatterns: ["successfactors.com", "successfactors.eu", "sapsf.com"],
    htmlPatterns: ["successfactors"],
    description: "Enterprise SAP-integrated ATS. Strict keyword matching. Common in consulting, manufacturing, finance.",
    filterLayers: [
      "Resume parsed into SAP data model fields",
      "Strict keyword matching — heavier than Workday, less NLP",
      "Required field completion gates application submission",
      "Ranking based on required competency match percentage",
      "Deep integration with SAP HR suite — data becomes employee record if hired"
    ],
    keyRules: [
      "Fill all required fields before submission is allowed",
      "Use exact JD terminology — minimal NLP interpretation",
      "Standard ATS-safe formatting only",
      "Both full form and acronym for every technical term",
      "Fill all competency and skill fields in the profile"
    ]
  },
  smartrecruiters: {
    name: "SmartRecruiters", color: "#1565C0", badge: "#E6F1FB", badgeText: "#0C447C",
    urlPatterns: ["smartrecruiters.com", "jobs.smartrecruiters.com"],
    htmlPatterns: ["smartrecruiters"],
    description: "Now part of SAP (2025). AI-powered candidate scoring. Mid-to-large enterprise.",
    filterLayers: [
      "AI-powered resume scoring — more aggressive automated filtering than most ATS",
      "Candidate ranking with visible AI match scores shown to recruiter",
      "Keyword matching against structured job requirements",
      "Structured hiring stages with recruiter review"
    ],
    keyRules: [
      "High AI scoring aggressiveness — keyword coverage is critical",
      "Quantified achievements score significantly better with AI matching",
      "Mirror JD language precisely — less forgiving than Greenhouse",
      "Single-column standard formatting"
    ]
  },
  ashby: {
    name: "Ashby", color: "#7C3AED", badge: "#EEEDFE", badgeText: "#3C3489",
    urlPatterns: ["ashbyhq.com", "jobs.ashbyhq.com"],
    htmlPatterns: ["ashby"],
    description: "Modern ATS for tech companies. Scorecard-driven like Greenhouse. Growing fast in mid-market tech.",
    filterLayers: [
      "Resume parsing with modern engine — good PDF handling",
      "Structured interview scorecards — similar philosophy to Greenhouse",
      "AI-powered screening with responsible AI approach",
      "Candidate analytics and pipeline tracking"
    ],
    keyRules: [
      "Mirror JD requirements — scorecard driven like Greenhouse",
      "Quantified achievements preferred over vague descriptions",
      "Clean formatting — good parse accuracy",
      "Each requirement needs clear evidence in resume"
    ]
  },
  workable: {
    name: "Workable", color: "#4A5568", badge: "#F1EFE8", badgeText: "#444441",
    urlPatterns: ["workable.com", "apply.workable.com"],
    htmlPatterns: ["workable"],
    description: "Mid-market ATS with built-in AI scoring. Fast setup. Common in SMB to mid-market.",
    filterLayers: [
      "AI candidate scoring active on all inbound applicants",
      "Keyword filtering before recruiter review queue",
      "Structured interview workflow",
      "Built-in AI sourcing recommendations"
    ],
    keyRules: [
      "AI scoring is active — keyword coverage is critical",
      "Apply early — first-mover advantage in recruiter queue",
      "Standard ATS-safe formatting",
      "JD keywords in top third of resume"
    ]
  }
};

const UNKNOWN_ATS = {
  name: "Unknown ATS", color: "#64748B", badge: "#F1EFE8", badgeText: "#444441",
  urlPatterns: [], htmlPatterns: [],
  description: "ATS could not be detected. Analysis uses general best practices applicable across all systems.",
  filterLayers: [
    "Resume parsing (format varies by system)",
    "Keyword matching against JD requirements",
    "Recruiter manual review of qualified candidates",
    "Possible knockout screening questions"
  ],
  keyRules: [
    "Single-column layout, no graphics or tables",
    "Mirror JD keywords exactly",
    "Both acronym and full form for every term",
    "Quantify all achievements with numbers",
    "Standard section headers: Experience, Education, Skills"
  ]
};

function detectATS(url, htmlContent = "") {
  const u = (url || "").toLowerCase();
  const h = (htmlContent || "").toLowerCase();
  for (const [key, ats] of Object.entries(ATS_PATTERNS)) {
    for (const p of ats.urlPatterns) {
      if (u.includes(p)) return { key, ...ats };
    }
    for (const p of ats.htmlPatterns) {
      if (h.includes(p)) return { key, ...ats };
    }
  }
  return { key: "unknown", ...UNKNOWN_ATS };
}

// ─── History helpers ───────────────────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")); }
  catch { return []; }
}
function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}
function addToHistory(entry) {
  const history = loadHistory();
  history.unshift({ ...entry, id: Date.now(), timestamp: new Date().toISOString() });
  if (history.length > 100) history.splice(100);
  saveHistory(history);
  return history[0];
}

// ─── Claude API helpers ────────────────────────────────────────────────────────
async function callClaude(system, userMsg, maxTokens = 4000) {
  const msg = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMsg }]
  });
  return msg.content.filter(b => b.type === "text").map(b => b.text).join("");
}

function extractJSON(text) {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error("JSON truncated in response");
  return JSON.parse(text.substring(start, end + 1));
}

function extractJSONArray(text) {
  const start = text.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in response");
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error("JSON array truncated in response");
  return JSON.parse(text.substring(start, end + 1));
}

// ─── Route: Fetch & analyse job URL ───────────────────────────────────────────
app.post("/api/fetch-job", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  let rawHtml = "";
  let rawJD = "";
  let title = "Job Posting";
  let company = "";

  // Step 1: Direct HTTP fetch — no middleman, real HTML
  try {
    const response = await axios.get(url, {
      timeout: 12000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      },
      maxRedirects: 5
    });
    rawHtml = response.data || "";

    // Parse HTML with cheerio
    const $ = cheerio.load(rawHtml);

    // Remove noise
    $("script, style, nav, footer, header, .cookie-banner, [class*='cookie'], [class*='banner']").remove();

    // Extract title
    title = $("h1").first().text().trim()
      || $("title").text().replace(/[-|].*$/, "").trim()
      || title;

    // Extract company from common patterns
    company = $("[class*='company']").first().text().trim()
      || $("[class*='employer']").first().text().trim()
      || $("meta[property='og:site_name']").attr("content")
      || new URL(url).hostname.replace("www.", "").replace(/\.(com|io|co|net|org).*/, "")
      || "";

    // Extract main content — look for job description containers
    const jdSelectors = [
      "[class*='job-description']", "[class*='jobDescription']", "[id*='job-description']",
      "[class*='description']", "[class*='content']", "[class*='details']",
      "main", "article", ".posting-description"
    ];
    let jdEl = null;
    for (const sel of jdSelectors) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 200) { jdEl = el; break; }
    }
    rawJD = jdEl ? jdEl.text() : $("body").text();

    // Clean up whitespace
    rawJD = rawJD.replace(/\s+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 6000);

  } catch (fetchErr) {
    // HTTP fetch failed (JS-rendered page, auth wall, etc.)
    // Fall back to Claude web search
    console.log(`Direct fetch failed (${fetchErr.message}), falling back to Claude search`);
    try {
      const searchResult = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `Extract job posting info. Return ONLY valid JSON, no other text:
{"title":"<job title>","company":"<company name>","jd_text":"<full job description with all responsibilities and requirements>","ats_hints":"<any ATS indicator text like powered-by, apply links>"}`,
        messages: [{ role: "user", content: `Fetch and extract all content from this job posting: ${url}` }]
      });
      const textContent = searchResult.content.filter(b => b.type === "text").map(b => b.text).join("\n");
      try {
        const parsed = extractJSON(textContent);
        title = parsed.title || title;
        company = parsed.company || company;
        rawJD = parsed.jd_text || textContent.slice(0, 4000);
        rawHtml = parsed.ats_hints || "";
      } catch {
        rawJD = textContent.slice(0, 4000);
      }
    } catch (searchErr) {
      console.error("Both fetch methods failed:", searchErr.message);
    }
  }

  // Step 2: ATS detection from URL + page content
  let detected = detectATS(url, rawHtml);

  // Also check for redirect URLs in the HTML (e.g. "Apply on Greenhouse" links)
  if (detected.key === "unknown" && rawHtml) {
    const $ = cheerio.load(rawHtml);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const reDetect = detectATS(href);
      if (reDetect.key !== "unknown") { detected = reDetect; return false; }
    });
  }

  // Step 3: If rawJD is thin, use Claude to extract better
  if (rawJD.length < 300 && rawJD.length > 0) {
    try {
      const extracted = await callClaude(
        `Extract the job title, company name, and full job description from this web page text.
Return ONLY valid JSON: {"title":"...","company":"...","jd_text":"..."}`,
        `URL: ${url}\n\nPage content:\n${rawJD}`,
        2000
      );
      const parsed = extractJSON(extracted);
      if (parsed.title) title = parsed.title;
      if (parsed.company) company = parsed.company;
      if (parsed.jd_text && parsed.jd_text.length > rawJD.length) rawJD = parsed.jd_text;
    } catch { /* use what we have */ }
  }

  res.json({ title, company, rawJD, ats: detected, url });
});

// ─── Route: Parse PDF ──────────────────────────────────────────────────────────
app.post("/api/parse-pdf", upload.single("resume"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const data = await pdfParse(req.file.buffer);
    let text = data.text || "";

    // Clean up PDF extraction artifacts
    text = text
      .replace(/\f/g, "\n")                    // form feeds → newlines
      .replace(/([a-z])([A-Z])/g, "$1 $2")     // fix missing spaces from PDF encoding
      .replace(/[ \t]{3,}/g, "  ")             // collapse excessive spaces
      .replace(/\n{4,}/g, "\n\n\n")            // max 3 consecutive newlines
      .trim();

    const wordCount = text.trim().split(/\s+/).length;

    if (wordCount < 30) {
      return res.status(422).json({
        error: "PDF appears to be image-based or encrypted. Try exporting as text-based PDF from your word processor, or paste the text manually.",
        wordCount
      });
    }

    res.json({ text, wordCount, pages: data.numpages });
  } catch (err) {
    res.status(500).json({ error: `PDF parse failed: ${err.message}. Try a text-based PDF or paste manually.` });
  }
});

// ─── Route: Score resume ───────────────────────────────────────────────────────
app.post("/api/score", async (req, res) => {
  const { jobData, resumeText } = req.body;
  if (!jobData || !resumeText) return res.status(400).json({ error: "jobData and resumeText required" });

  const ats = jobData.ats;
  const atsContext = `ATS System: ${ats.name}
Description: ${ats.description}
Filtering layers: ${ats.filterLayers.join("; ")}
Key rules for candidates: ${ats.keyRules.join("; ")}`;

  const jdSection = jobData.rawJD
    ? `JOB DESCRIPTION (full text):\n${jobData.rawJD.slice(0, 4000)}`
    : `Role: ${jobData.title} at ${jobData.company}\nURL: ${jobData.url}\n(JD text unavailable — scoring on title/ATS rules only)`;

  // Phase 1: Scores, keywords, killers
  let phase1 = {};
  try {
    const p1 = await callClaude(
      `You are a senior ATS resume analyst specialising in ${ats.name}.
${atsContext}

Analyse the candidate's resume against the job description with expert precision.
Return ONLY a valid JSON object — no markdown fences, no preamble, no text after the closing brace.

{
  "overallScore": <integer 0-100>,
  "atsPassProbability": "<High (70%+)|Medium (40-70%)|Low (<40%)>",
  "jobTitle": "<exact job title from JD>",
  "company": "<company name from JD>",
  "scoreExplanation": "<2 specific sentences explaining score — reference actual resume content>",
  "scores": {
    "keywordMatch": {
      "score": <0-100>,
      "found": ["<keyword present in resume>"],
      "missing": ["<important JD keyword not in resume>"]
    },
    "formatCompliance": {
      "score": <0-100>,
      "issues": ["<specific format issue for ${ats.name}>"],
      "good": ["<format element that is correct>"]
    },
    "requirementCoverage": {
      "score": <0-100>,
      "covered": ["<JD requirement that resume addresses>"],
      "gaps": ["<JD requirement with no evidence in resume>"]
    },
    "quantification": {
      "score": <0-100>,
      "strong": ["<well-quantified bullet>"],
      "weak": ["<bullet that lacks metrics>"]
    },
    "atsSpecific": {
      "score": <0-100>,
      "issues": ["<issue specific to how ${ats.name} filters>"],
      "good": ["<aspect that works well for ${ats.name}>"]
    }
  },
  "criticalKillers": ["<specific thing in this resume that causes auto-rejection on ${ats.name}>"],
  "keywordsToAdd": [
    {
      "keyword": "<exact term from JD>",
      "whereToAdd": "<section name>",
      "context": "<a complete suggested bullet sentence using this keyword naturally>"
    }
  ],
  "atsSpecificTips": ["<actionable tip specific to ${ats.name} — not generic advice>"],
  "sectionsAnalysis": [
    {"section": "Summary/Objective", "score": <0-100>, "feedback": "<specific feedback quoting resume>"},
    {"section": "Experience", "score": <0-100>, "feedback": "<specific feedback>"},
    {"section": "Skills", "score": <0-100>, "feedback": "<specific feedback>"},
    {"section": "Education", "score": <0-100>, "feedback": "<specific feedback>"}
  ]
}`,
      `${jdSection}\n\n---\nRESUME:\n${resumeText.slice(0, 4500)}`,
      5000
    );
    phase1 = extractJSON(p1);
  } catch (e) {
    return res.status(500).json({ error: `Scoring failed: ${e.message}` });
  }

  // Phase 2: Specific bullet rewrites
  let fixes = [];
  try {
    const missingKws = (phase1.scores?.keywordMatch?.missing || []).join(", ");
    const gaps = (phase1.scores?.requirementCoverage?.gaps || []).join(", ");

    const p2 = await callClaude(
      `You are an ATS resume coach for ${ats.name}.
${atsContext}

Produce 6 specific, high-impact rewrite suggestions for this resume.
Return ONLY a valid JSON array — no object wrapper, no preamble, no text after the closing bracket.
[
  {
    "priority": <1-6>,
    "section": "<Summary|Experience|Skills|Education|Format>",
    "issue": "<specific problem — be direct, reference the actual text>",
    "before": "<EXACT verbatim text from the resume — quote it precisely, 10-50 words>",
    "after": "<fully rewritten version with ATS keywords woven in naturally, 15-60 words>",
    "reason": "<exactly why this matters for ${ats.name} — reference the ATS filtering mechanism>"
  }
]
Prioritise: 1=most damaging to ATS pass rate. Quote real text in 'before'. Make 'after' dramatically better.`,
      `${jdSection}\n\n---\nRESUME:\n${resumeText.slice(0, 4500)}\n\nFocus on these missing keywords: ${missingKws}\nAnd these requirement gaps: ${gaps}`,
      5000
    );
    fixes = extractJSONArray(p2);
  } catch (e) {
    fixes = [{ priority: 1, section: "Note", issue: `Rewrite generation failed: ${e.message}`, before: "", after: "", reason: "" }];
  }

  const result = { ...phase1, highPriorityFixes: fixes };

  // Save to history
  const entry = addToHistory({
    jobTitle: phase1.jobTitle || jobData.title,
    company: phase1.company || jobData.company,
    atsName: ats.name,
    overallScore: phase1.overallScore,
    atsPassProbability: phase1.atsPassProbability,
    jobUrl: jobData.url,
    resumeWordCount: resumeText.split(/\s+/).length
  });

  res.json({ ...result, historyId: entry.id });
});

// ─── Route: History ────────────────────────────────────────────────────────────
app.get("/api/history", (req, res) => {
  res.json(loadHistory());
});

app.delete("/api/history/:id", (req, res) => {
  const history = loadHistory().filter(h => h.id !== parseInt(req.params.id));
  saveHistory(history);
  res.json({ ok: true });
});

app.delete("/api/history", (req, res) => {
  saveHistory([]);
  res.json({ ok: true });
});

// ─── Route: Health check ───────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ ok: true, apiKey: !!process.env.ANTHROPIC_API_KEY });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ATS Scanner server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠️  ANTHROPIC_API_KEY not set — add it to .env file");
  }
});

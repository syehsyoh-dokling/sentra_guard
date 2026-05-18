import { runtimeConfig } from "../config/runtimeConfig.mjs";

function summarizeFindings(findings) {
  const counts = findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, {});

  return `Findings: ${counts.critical || 0} critical, ${counts.high || 0} high, ${counts.medium || 0} medium, ${counts.low || 0} low.`;
}

function localSummary({ findings, sourceCode }) {
  const lines = String(sourceCode || "").split(/\r?\n/).length;
  const topFinding = findings[0];
  const lead = topFinding
    ? `Highest priority: ${topFinding.severity.toUpperCase()} - ${topFinding.title}.`
    : "No static findings were detected by the baseline rules.";

  return {
    mode: "local-fallback",
    model: "deterministic-audit-summarizer",
    latencyMs: 0,
    summary: `${summarizeFindings(findings)} ${lead} Source reviewed: ${lines} lines. Human review is still required before production sign-off.`
  };
}

function localRoles({ sourceCode, findings }) {
  const summary = localSummary({ sourceCode, findings });
  const highRisk = findings.filter((finding) => ["critical", "high"].includes(finding.severity));

  return {
    ...summary,
    workerRouting: {
      primaryLane: findings.some((finding) => /solana|bpf/i.test(finding.title || "")) ? "solana-review" : "evm-static-review",
      secondaryLane: "human-security-review",
      reason: highRisk.length ? "High-risk static findings require reviewer confirmation." : "Baseline static review completed without high-risk findings."
    },
    triage: findings.map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      confidence: finding.confidence,
      exploitability: ["critical", "high"].includes(finding.severity) ? "review-required" : "limited",
      rationale: finding.description
    })),
    falsePositiveReview: findings.map((finding) => ({
      id: finding.id,
      likelyFalsePositive: false,
      reason: "Static rule matched directly; keep open until reviewer validates context."
    })),
    remediationPlan: findings.map((finding) => ({
      id: finding.id,
      patch: finding.recommendation,
      regressionTest: `Add a regression test covering ${finding.title}.`
    })),
    executiveReport: {
      riskPosture: highRisk.length ? "High risk until confirmed findings are remediated." : "Moderate/low risk based on baseline detector output.",
      releaseGate: highRisk.length ? "block-release" : "review-before-release",
      ownerSummary: summary.summary
    }
  };
}

function parseJsonObject(text) {
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callGemini(prompt, { maxOutputTokens = 1200, temperature = 0.2 } = {}) {
  if (!runtimeConfig.geminiApiKey) {
    return { ok: false, mode: "local-fallback", error: "Gemini API key is not configured" };
  }

  const endpoint =
    `${runtimeConfig.geminiApiBase}/models/${runtimeConfig.geminiModel}:generateContent?key=${encodeURIComponent(runtimeConfig.geminiApiKey)}`;
  const started = Date.now();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      ok: false,
      mode: "local-fallback",
      latencyMs: Date.now() - started,
      error: `Gemini request failed: ${response.status} ${body.slice(0, 180)}`
    };
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n").trim() || "";

  return {
    ok: true,
    mode: "gemini",
    model: runtimeConfig.geminiModel,
    latencyMs: Date.now() - started,
    text,
    raw: data
  };
}

function buildRolePrompt({ sourceCode, findings, prompts }) {
  return [
    prompts.hardRulesPrompt || "Use evidence-based blockchain audit reasoning. Do not invent facts.",
    prompts.workerRoutingPrompt || "Route Solidity/EVM, Solana BPF, and infrastructure issues to the most reliable detector and reviewer lane.",
    prompts.triagePrompt || "Classify severity and explain exploitability concisely.",
    prompts.remediationPrompt || "Suggest minimal secure patches and regression tests.",
    prompts.reportPrompt || "Write concise audit reports with executive summary, confirmed findings, reproduction steps, and remediation guidance.",
    "You are the AI analysis layer in Sentracore APP2. Review detector output and source excerpt.",
    "Return ONLY valid JSON using this exact shape:",
    JSON.stringify({
      summary: "short audit summary",
      workerRouting: {
        primaryLane: "evm-static-review | solana-review | ai-deep-review | human-security-review",
        secondaryLane: "optional reviewer lane",
        reason: "why this routing is appropriate"
      },
      triage: [
        {
          id: "finding id",
          severity: "critical | high | medium | low | info",
          confidence: 0.0,
          exploitability: "short exploitability statement",
          rationale: "short evidence-based rationale"
        }
      ],
      falsePositiveReview: [
        {
          id: "finding id",
          likelyFalsePositive: false,
          reason: "why it may or may not be false positive"
        }
      ],
      remediationPlan: [
        {
          id: "finding id",
          patch: "minimal secure patch guidance",
          regressionTest: "test that should be added"
        }
      ],
      executiveReport: {
        riskPosture: "overall risk posture",
        releaseGate: "block-release | review-before-release | acceptable-with-monitoring",
        ownerSummary: "business-friendly summary"
      }
    }, null, 2),
    `Detector output: ${JSON.stringify(findings.slice(0, 16))}`,
    `Source excerpt: ${String(sourceCode || "").slice(0, 9000)}`
  ].join("\n\n");
}

export async function generateAiAuditRoles({ sourceCode, findings, prompts = {} }) {
  const fallback = localRoles({ sourceCode, findings });

  if (!runtimeConfig.geminiApiKey) {
    return fallback;
  }

  try {
    const result = await callGemini(buildRolePrompt({ sourceCode, findings, prompts }), {
      maxOutputTokens: 1800,
      temperature: 0.15
    });

    if (!result.ok) {
      return { ...fallback, providerError: result.error };
    }

    const parsed = parseJsonObject(result.text);
    if (!parsed) {
      return {
        ...fallback,
        mode: "gemini",
        model: runtimeConfig.geminiModel,
        latencyMs: result.latencyMs,
        providerError: "Gemini returned non-JSON role output",
        summary: result.text || fallback.summary
      };
    }

    return {
      ...fallback,
      ...parsed,
      mode: "gemini",
      model: runtimeConfig.geminiModel,
      latencyMs: result.latencyMs
    };
  } catch (error) {
    return {
      ...fallback,
      providerError: error instanceof Error ? error.message : "Unknown Gemini adapter error"
    };
  }
}

export async function generateAiSummary(input) {
  const roles = await generateAiAuditRoles(input);

  return {
    mode: roles.mode,
    model: roles.model,
    latencyMs: roles.latencyMs,
    summary: roles.summary,
    providerError: roles.providerError
  };
}

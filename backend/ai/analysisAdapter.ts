import type { AuditFinding } from "../types/audit";

export interface AiAnalysisInput {
  sourceCode: string;
  findings: AuditFinding[];
}

export interface AiAnalysisOutput {
  summary: string;
  model: string;
  mode: "mock" | "api-ready";
}

export async function generateAiAuditSummary(
  input: AiAnalysisInput,
): Promise<AiAnalysisOutput> {
  const criticalCount = input.findings.filter((finding) => finding.severity === "critical").length;
  const highCount = input.findings.filter((finding) => finding.severity === "high").length;
  const mediumCount = input.findings.filter((finding) => finding.severity === "medium").length;

  return {
    model: "llm-adapter-placeholder",
    mode: "api-ready",
    summary:
      `Initial AI-assisted review prepared. Findings detected: ` +
      `${criticalCount} critical, ${highCount} high, ${mediumCount} medium. ` +
      `This layer is prepared for future OpenAI/LLM integration and human-in-the-loop audit review.`,
  };
}

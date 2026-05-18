import type { AuditJob, AuditResult } from "../types/audit";
import { generateAiAuditSummary } from "../ai/analysisAdapter";
import { detectBasicVulnerabilities } from "../security/basicDetectors";

export async function runAuditPipeline(job: AuditJob): Promise<AuditResult> {
  const findings = detectBasicVulnerabilities(job.sourceCode);
  const aiAnalysis = await generateAiAuditSummary({
    sourceCode: job.sourceCode,
    findings,
  });

  return {
    jobId: job.id,
    status: "completed",
    findings,
    aiSummary: aiAnalysis.summary,
    processedAt: new Date().toISOString(),
  };
}

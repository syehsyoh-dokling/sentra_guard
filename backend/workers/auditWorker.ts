import type { AuditResult } from "../types/audit";
import { auditQueue } from "../queues/auditQueue";
import { runAuditPipeline } from "../pipelines/auditPipeline";

export async function processNextAuditJob(): Promise<AuditResult | undefined> {
  const job = await auditQueue.dequeue();

  if (!job) {
    return undefined;
  }

  return runAuditPipeline({
    ...job,
    status: "processing",
    updatedAt: new Date().toISOString(),
  });
}

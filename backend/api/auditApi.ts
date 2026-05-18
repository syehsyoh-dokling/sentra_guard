import type { AuditJob } from "../types/audit";
import { auditQueue } from "../queues/auditQueue";

export interface CreateAuditJobInput {
  chain?: AuditJob["chain"];
  contractName?: string;
  sourceCode: string;
}

export async function createAuditJob(input: CreateAuditJobInput): Promise<AuditJob> {
  const now = new Date().toISOString();

  const job: AuditJob = {
    id: `audit_${Date.now()}`,
    chain: input.chain ?? "unknown",
    contractName: input.contractName,
    sourceCode: input.sourceCode,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  await auditQueue.enqueue(job);

  return job;
}

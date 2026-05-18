export type AuditJobStatus = "pending" | "processing" | "completed" | "failed";

export type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface AuditJob {
  id: string;
  chain: "ethereum" | "solana" | "polygon" | "bsc" | "unknown";
  contractName?: string;
  sourceCode: string;
  status: AuditJobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditFinding {
  id: string;
  title: string;
  severity: AuditSeverity;
  description: string;
  recommendation: string;
  detector: string;
  line?: number;
}

export interface AuditResult {
  jobId: string;
  status: AuditJobStatus;
  findings: AuditFinding[];
  aiSummary?: string;
  processedAt: string;
}

import type { AuditJob } from "../types/audit";

export interface AuditQueue {
  enqueue(job: AuditJob): Promise<void>;
  dequeue(): Promise<AuditJob | undefined>;
  size(): Promise<number>;
}

export class InMemoryAuditQueue implements AuditQueue {
  private readonly jobs: AuditJob[] = [];

  async enqueue(job: AuditJob): Promise<void> {
    this.jobs.push(job);
  }

  async dequeue(): Promise<AuditJob | undefined> {
    return this.jobs.shift();
  }

  async size(): Promise<number> {
    return this.jobs.length;
  }
}

export const auditQueue = new InMemoryAuditQueue();

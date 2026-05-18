import realtimeEvents from "../data/dummy-realtime-events.json";
import finalReport from "../data/dummy-final-report.json";

export type AuditDemoStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type AuditDemoSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "informational";

export interface AuditDemoFinding {
  id: string;
  severity: AuditDemoSeverity;
  category: string;
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  location: {
    file: string;
    line: number;
    function: string;
  };
}

export interface AuditDemoEvent {
  eventId: string;
  jobId: string;
  type: string;
  stage: string;
  status: AuditDemoStatus;
  progress: number;
  message: string;
  timestamp: string;
  finding?: AuditDemoFinding;
  summary?: {
    riskScore: number;
    riskLevel: AuditDemoSeverity;
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
}

export function getDummyRealtimeEvents(): AuditDemoEvent[] {
  return realtimeEvents as AuditDemoEvent[];
}

export function getDummyFinalReport() {
  return finalReport;
}

export function getDummyEventByIndex(index: number): AuditDemoEvent {
  const events = getDummyRealtimeEvents();

  if (events.length === 0) {
    throw new Error("No dummy realtime audit events available.");
  }

  if (index < 0) {
    return events[0];
  }

  if (index >= events.length) {
    return events[events.length - 1];
  }

  return events[index];
}

export function getDummyCurrentSnapshot(step: number) {
  const events = getDummyRealtimeEvents();
  const safeStep = Math.max(0, Math.min(step, events.length - 1));
  const current = events[safeStep];
  const visibleEvents = events.slice(0, safeStep + 1);
  const visibleFindings = visibleEvents
    .map((event) => event.finding)
    .filter(Boolean);

  return {
    jobId: current.jobId,
    status: current.status,
    stage: current.stage,
    progress: current.progress,
    message: current.message,
    currentEvent: current,
    events: visibleEvents,
    findings: visibleFindings,
    isCompleted: current.status === "completed" || current.progress >= 100,
  };
}

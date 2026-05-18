import { WebSocketServer } from "ws";
import { broadcastRealtimeEvent } from "./realtimeHub.mjs";

const progressHistory = new Map();
let wss;

export function recordJobProgress(jobId, event) {
  if (!jobId) return null;

  const progressEvent = {
    jobId,
    stage: event.stage || "unknown",
    status: event.status || "running",
    percent: Number(event.percent ?? 0),
    message: event.message || "",
    detail: event.detail || null,
    emittedAt: new Date().toISOString()
  };

  const events = progressHistory.get(jobId) || [];
  events.push(progressEvent);
  progressHistory.set(jobId, events.slice(-80));

  broadcastRealtimeEvent("audit-job-progress", progressEvent);

  if (wss) {
    const body = JSON.stringify({
      type: "audit-job-progress",
      ...progressEvent
    });

    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(body);
      }
    }
  }

  return progressEvent;
}

export function getJobProgress(jobId) {
  return {
    jobId,
    events: progressHistory.get(jobId) || []
  };
}

export function attachProgressWebSocket(server) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname !== "/audit/progress/ws") return;

    wss.handleUpgrade(req, socket, head, (ws) => {
      const jobId = url.searchParams.get("jobId");
      ws.send(JSON.stringify({
        type: "connected",
        jobId,
        connectedAt: new Date().toISOString(),
        history: jobId ? getJobProgress(jobId).events : []
      }));
    });
  });

  return wss;
}

export function getProgressSocketClientCount() {
  return wss?.clients?.size || 0;
}

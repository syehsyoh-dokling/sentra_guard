import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getDummyCurrentSnapshot,
  getDummyFinalReport,
  getDummyRealtimeEvents,
} from "../src/audit-demo/runtime/audit-demo-runtime";

function sendJson(res: ServerResponse, data: unknown, statusCode = 200) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-cache",
  });

  res.end(JSON.stringify(data, null, 2));
}

export function handleAuditDemoRoute(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", "http://localhost");

  if (url.pathname === "/audit/demo/events") {
    return sendJson(res, {
      success: true,
      mode: "dummy-realtime-events",
      data: getDummyRealtimeEvents(),
    });
  }

  if (url.pathname === "/audit/demo/report") {
    return sendJson(res, {
      success: true,
      mode: "dummy-final-report",
      data: getDummyFinalReport(),
    });
  }

  if (url.pathname === "/audit/demo/snapshot") {
    const step = Number(url.searchParams.get("step") || "0");

    return sendJson(res, {
      success: true,
      mode: "dummy-current-snapshot",
      data: getDummyCurrentSnapshot(step),
    });
  }

  if (url.pathname === "/audit/demo/stream") {
    const events = getDummyRealtimeEvents();

    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "access-control-allow-origin": "*",
    });

    let index = 0;

    const timer = setInterval(() => {
      if (index >= events.length) {
        res.write(`event: end\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        clearInterval(timer);
        res.end();
        return;
      }

      const event = events[index];
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      index += 1;
    }, 1300);

    req.on("close", () => {
      clearInterval(timer);
    });

    return;
  }

  return false;
}

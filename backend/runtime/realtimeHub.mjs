const clients = new Set();

export function addRealtimeClient(res) {
  clients.add(res);
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  res.write("event: connected\n");
  res.write(`data: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);

  return () => {
    clients.delete(res);
  };
}

export function broadcastRealtimeEvent(event, payload) {
  const data = JSON.stringify({
    ...payload,
    emittedAt: new Date().toISOString()
  });

  for (const client of clients) {
    try {
      client.write(`event: ${event}\n`);
      client.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
}

export function getRealtimeClientCount() {
  return clients.size;
}

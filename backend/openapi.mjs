export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Sentracore Audit Backend API",
    version: "0.1.0",
    description: "Backend API contract for audit jobs, runtime settings, readiness checks, and realtime dashboard data."
  },
  servers: [
    { url: "http://localhost:8787", description: "Local backend" }
  ],
  components: {
    securitySchemes: {
      AdminToken: {
        type: "apiKey",
        in: "header",
        name: "X-Admin-Token"
      }
    }
  },
  paths: {
    "/health": {
      get: { summary: "Backend liveness", responses: { "200": { description: "Backend is online" } } }
    },
    "/health/dependencies": {
      get: { summary: "Dependency health for Postgres and Redis", responses: { "200": { description: "Dependency status" } } }
    },
    "/readiness": {
      get: { summary: "Production readiness score", responses: { "200": { description: "Readiness report" } } }
    },
    "/config/runtime": {
      get: { summary: "Safe runtime config", responses: { "200": { description: "Masked config" } } },
      post: {
        summary: "Update runtime config for current process",
        security: [{ AdminToken: [] }],
        responses: { "200": { description: "Accepted config keys" }, "401": { description: "Admin token required" } }
      }
    },
    "/config/test": {
      post: {
        summary: "Run configured API checks",
        security: [{ AdminToken: [] }],
        responses: { "200": { description: "API test results" } }
      }
    },
    "/audit/jobs": {
      get: { summary: "List audit jobs", responses: { "200": { description: "Audit jobs" } } },
      post: { summary: "Create audit job", responses: { "201": { description: "Audit job created" } } }
    },
    "/audit/contracts/upload": {
      post: {
        summary: "Upload contract source and queue audit job",
        responses: { "202": { description: "Contract accepted and audit job queued" } }
      }
    },
    "/audit/jobs/{id}": {
      get: {
        summary: "Get audit job",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { "200": { description: "Audit job" }, "404": { description: "Not found" } }
      }
    },
    "/audit/jobs/{id}/progress": {
      get: {
        summary: "Get per-job audit progress history",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { "200": { description: "Progress events" }, "404": { description: "Not found" } }
      }
    },
    "/audit/progress/ws": {
      get: {
        summary: "WebSocket stream for per-job progress events",
        parameters: [{ name: "jobId", in: "query", required: false }],
        responses: { "101": { description: "WebSocket upgrade" } }
      }
    },
    "/audit/jobs/{id}/process": {
      post: {
        summary: "Process audit job",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { "200": { description: "Processed result" }, "404": { description: "Not found" } }
      }
    },
    "/security/detector-rules": {
      get: { summary: "Static detector rules", responses: { "200": { description: "Detector rules" } } }
    },
    "/admin/realtime-state": {
      get: { summary: "Current dashboard realtime state", responses: { "200": { description: "Realtime state" } } }
    },
    "/admin/realtime-stream": {
      get: { summary: "Server-sent events stream", responses: { "200": { description: "SSE stream" } } }
    }
  }
};

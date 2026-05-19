import { randomUUID } from "node:crypto";
import { runtimeConfig } from "../config/runtimeConfig.mjs";

const rateBuckets = new Map();
const protectedPrefixes = [
  "/admin/",
  "/config/"
];
const protectedExactPaths = new Set([
  "/api-tests"
]);

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket.remoteAddress || "unknown";
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (!Array.isArray(runtimeConfig.allowedOrigins) || runtimeConfig.allowedOrigins.length === 0) return false;
  return runtimeConfig.allowedOrigins.includes(origin);
}

export function beginRequest(req, res) {
  const requestId = req.headers["x-request-id"] || randomUUID();
  const origin = req.headers.origin || "";
  const startedAt = Date.now();

  res.requestContext = {
    requestId,
    origin: typeof origin === "string" ? origin : "",
    clientIp: getClientIp(req),
    startedAt,
    statusCode: 200
  };

  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (isOriginAllowed(res.requestContext.origin)) {
    res.setHeader("Access-Control-Allow-Origin", res.requestContext.origin || runtimeConfig.publicAppUrl);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token, X-Request-Id");

  return res.requestContext;
}

export function finishRequest(req, res, extra = {}) {
  const ctx = res.requestContext || {};
  const payload = {
    ts: new Date().toISOString(),
    requestId: ctx.requestId,
    method: req.method,
    path: req.url?.split("?")[0] || "/",
    status: extra.statusCode || ctx.statusCode || res.statusCode,
    latencyMs: Date.now() - (ctx.startedAt || Date.now()),
    ip: ctx.clientIp
  };

  console.log(JSON.stringify(payload));
}

export function setResponseStatus(res, statusCode) {
  if (res.requestContext) res.requestContext.statusCode = statusCode;
}

export function isRateLimited(req, res) {
  if (req.method === "OPTIONS") return false;

  const limit = Number(runtimeConfig.rateLimitPerMinute || 60);
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const key = `${res.requestContext?.clientIp || getClientIp(req)}:${minute}`;
  const count = (rateBuckets.get(key) || 0) + 1;

  rateBuckets.set(key, count);

  if (rateBuckets.size > 2000) {
    for (const bucketKey of rateBuckets.keys()) {
      if (!bucketKey.endsWith(`:${minute}`)) rateBuckets.delete(bucketKey);
    }
  }

  return count > limit;
}

export function isProtectedPath(pathname) {
  return protectedExactPaths.has(pathname) || protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function isAdminAuthorized(req, pathname) {
  if (!isProtectedPath(pathname)) return true;
  if (!runtimeConfig.adminBootstrapToken) return true;

  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const token = req.headers["x-admin-token"];
  let queryToken = "";
  try {
    queryToken = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).searchParams.get("adminToken") || "";
  } catch {
    queryToken = "";
  }

  return bearer === runtimeConfig.adminBootstrapToken || token === runtimeConfig.adminBootstrapToken || queryToken === runtimeConfig.adminBootstrapToken;
}

export function isOriginRejected(req, res) {
  if (req.method === "OPTIONS") return false;
  const origin = res.requestContext?.origin;
  return Boolean(origin && !isOriginAllowed(origin));
}

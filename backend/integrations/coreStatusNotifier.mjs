import { runtimeConfig } from "../config/runtimeConfig.mjs";

function coreWebhookUrl() {
  return `${runtimeConfig.coreBackendUrl.replace(/\/$/, "")}/webhooks/sentraguard/job-status`;
}

export async function notifyCoreJobStatus(job, status, details = {}) {
  if (!job?.externalId || job.externalSource !== "sentracore-core-backend") return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(coreWebhookUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        core_job_id: job.externalId,
        sentraguard_job_id: job.id,
        status,
        transfer_status: "TRANSFERRED",
        response: details
      })
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

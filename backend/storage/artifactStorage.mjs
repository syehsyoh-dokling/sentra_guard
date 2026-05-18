import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runtimeConfig } from "../config/runtimeConfig.mjs";

const artifactRoot = process.env.ARTIFACT_STORAGE_DIR || path.join(process.cwd(), ".data", "audit-artifacts");

function isRealStorageConfigured() {
  return Boolean(runtimeConfig.storageBucketUrl && runtimeConfig.storageAccessKey && runtimeConfig.storageSecretKey);
}

function isIpfsConfigured() {
  return Boolean(runtimeConfig.ipfsApiToken && runtimeConfig.ipfsGatewayUrl);
}

export async function storeAuditArtifact({ jobId, filename, body, contentType = "text/markdown" }) {
  await mkdir(path.join(artifactRoot, jobId), { recursive: true });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(artifactRoot, jobId, safeName);
  await writeFile(filePath, body, "utf8");

  return {
    key: `reports/${jobId}/${safeName}`,
    contentType,
    localPath: filePath,
    uri: `local://${jobId}/${safeName}`,
    s3: {
      configured: isRealStorageConfigured(),
      target: runtimeConfig.storageBucketUrl || null,
      uploaded: false
    },
    ipfs: {
      configured: isIpfsConfigured(),
      gateway: runtimeConfig.ipfsGatewayUrl || null,
      uploaded: false
    }
  };
}

export function getStorageAdapterStatus() {
  return {
    mode: isRealStorageConfigured() || isIpfsConfigured() ? "external-ready-with-local-fallback" : "local-fallback",
    artifactRoot,
    s3Configured: isRealStorageConfigured(),
    ipfsConfigured: isIpfsConfigured()
  };
}

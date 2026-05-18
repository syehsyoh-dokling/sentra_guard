export interface BackendConfig {
  redisUrl?: string;
  postgresUrl?: string;
  s3Bucket?: string;
  ipfsGateway?: string;
  aiProvider?: "openai" | "anthropic" | "gemini" | "mock";
}

export const backendConfig: BackendConfig = {
  redisUrl: process.env.REDIS_URL,
  postgresUrl: process.env.POSTGRES_URL,
  s3Bucket: process.env.S3_BUCKET,
  ipfsGateway: process.env.IPFS_GATEWAY,
  aiProvider: (process.env.AI_PROVIDER as BackendConfig["aiProvider"]) ?? "mock",
};

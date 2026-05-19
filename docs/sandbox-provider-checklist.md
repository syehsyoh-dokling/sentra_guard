# Sentracore Sandbox Provider Checklist

This checklist separates integrations that can be tested without production spending from items that still require owner-provided production access.

## Can be tested with sandbox or free developer access

| Area | Setting fields | Test mode | Production handoff |
| --- | --- | --- | --- |
| Payment | `MIDTRANS_BASE_URL`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY` | Midtrans Sandbox | Replace with production Midtrans URL and keys. |
| KYC | `SUMSUB_BASE_URL`, `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY` | Sumsub Sandbox | Replace with production Sumsub token and secret. |
| Email | `RESEND_BASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Resend test/free account | Verify sender domain and keep same API shape. |
| WhatsApp | `META_GRAPH_BASE_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Meta Cloud API test number | Replace token and phone/WABA IDs with production values. |
| Blockchain RPC | `ETHEREUM_RPC_URL`, `SOLANA_RPC_URL`, `BNB_RPC_URL`, `POLYGON_RPC_URL` | Sepolia, Devnet, BNB Testnet, Polygon Amoy | Replace URLs with mainnet/provider URLs. |
| S3-compatible storage | `STORAGE_ENDPOINT_URL`, `STORAGE_BUCKET_URL`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | MinIO or free S3-compatible provider | Replace endpoint and credentials with AWS S3, Cloudflare R2, or final MinIO. |
| IPFS gateway | `IPFS_GATEWAY_URL`, `IPFS_API_TOKEN` | Public gateway, optional pinning token | Replace token with production pinning provider. |
| Auth discovery | `AUTH_ISSUER_URL` | Google/Auth0/Firebase discovery URL | Add final OAuth client and server secrets. |
| Observability | `OBSERVABILITY_URL`, `ERROR_TRACKING_DSN` | Local health, free Sentry/Grafana Cloud | Replace DSN and dashboard URL. |

## Cannot be made production-real without owner input

| Area | Required owner input |
| --- | --- |
| Production payment | Merchant account, production server key, callback URL approval. |
| Production KYC | Production Sumsub account, compliance level, token/secret. |
| Production auth | OAuth client ID/secret, allowed callback URLs, JWT/session secrets. |
| Production domain/TLS | DNS access for frontend/API/core/storage subdomains. |
| Production deploy | SSH host, SSH user, private key, deploy paths. |
| Relayer wallet | Real private key or signing service; never use dummy key. |
| Storage ownership | Final bucket name, retention policy, access keys, backup policy. |

## Current local test target

Use `POST /config/test` on APP2 backend after setting values through the dashboard Settings panel.

Expected local baseline:

- Backend health: pass
- Detector rules: pass
- Realtime state: pass
- Blockchain RPC: pass
- Midtrans/Sumsub/Resend/WhatsApp base API: pass
- S3-compatible storage: pass only after `STORAGE_ENDPOINT_URL` is set
- IPFS gateway: pass
- Docker registry: pass with HTTP 401 accepted as registry-auth reachable

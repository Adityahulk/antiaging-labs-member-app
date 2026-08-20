declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    UPLOADS: R2Bucket;
    ASSETS: Fetcher;
    RAZORPAY_KEY_ID?: string;
    RAZORPAY_KEY_SECRET?: string;
    RAZORPAY_WEBHOOK_SECRET?: string;
    OPEN_WEARABLES_URL?: string;
    OPEN_WEARABLES_API_KEY?: string;
    OPEN_WEARABLES_WEBHOOK_SECRET?: string;
    AI_GATEWAY_URL?: string;
    AI_GATEWAY_TOKEN?: string;
    OPENAI_API_KEY?: string;
    AI_PRIMARY_MODEL?: string;
    AI_FAST_MODEL?: string;
    AI_VISION_MODEL?: string;
    AI_FALLBACK_URL?: string;
    AI_FALLBACK_TOKEN?: string;
    AI_FALLBACK_MODEL?: string;
    AI_TIMEOUT_MS?: string;
    AI_REASONING_EFFORT?: string;
    LAB_ADAPTER_URL?: string;
    LAB_ADAPTER_API_KEY?: string;
    LAB_ADAPTER_WEBHOOK_SECRET?: string;
    ABDM_GATEWAY_URL?: string;
    ABDM_CLIENT_ID?: string;
  }
}
type Env = Cloudflare.Env;

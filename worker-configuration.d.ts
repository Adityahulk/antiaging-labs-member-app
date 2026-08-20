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
    LAB_ADAPTER_URL?: string;
    LAB_ADAPTER_API_KEY?: string;
    LAB_ADAPTER_WEBHOOK_SECRET?: string;
    ABDM_GATEWAY_URL?: string;
    ABDM_CLIENT_ID?: string;
  }
}
type Env = Cloudflare.Env;

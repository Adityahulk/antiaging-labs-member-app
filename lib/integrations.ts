import { env } from "cloudflare:workers";

export type RuntimeConfig = {
  RAZORPAY_KEY_ID?: string; RAZORPAY_KEY_SECRET?: string; RAZORPAY_WEBHOOK_SECRET?: string;
  OPEN_WEARABLES_URL?: string; OPEN_WEARABLES_API_KEY?: string; OPEN_WEARABLES_WEBHOOK_SECRET?: string;
  AI_GATEWAY_URL?: string; AI_GATEWAY_TOKEN?: string;
  LAB_ADAPTER_URL?: string; LAB_ADAPTER_API_KEY?: string; LAB_ADAPTER_WEBHOOK_SECRET?: string;
  ABDM_GATEWAY_URL?: string; ABDM_CLIENT_ID?: string;
};

export function runtimeConfig(): RuntimeConfig {
  return env as unknown as RuntimeConfig;
}

export async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index++) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

export function integrationHealth() {
  const config = runtimeConfig();
  return {
    razorpay: { mode: config.RAZORPAY_KEY_ID && config.RAZORPAY_KEY_SECRET ? "live" : "sandbox", ready: Boolean(config.RAZORPAY_KEY_ID && config.RAZORPAY_KEY_SECRET) },
    openWearables: { mode: config.OPEN_WEARABLES_URL && config.OPEN_WEARABLES_API_KEY ? "live" : "sandbox", ready: Boolean(config.OPEN_WEARABLES_URL && config.OPEN_WEARABLES_API_KEY) },
    ai: { mode: config.AI_GATEWAY_URL ? "live" : "grounded-rules", ready: Boolean(config.AI_GATEWAY_URL) },
    labAdapter: { mode: config.LAB_ADAPTER_URL && config.LAB_ADAPTER_API_KEY ? "live" : "sandbox", ready: Boolean(config.LAB_ADAPTER_URL && config.LAB_ADAPTER_API_KEY) },
    garmin: { mode: config.OPEN_WEARABLES_URL && config.OPEN_WEARABLES_API_KEY ? "approved-gateway" : "import-fallback", ready: Boolean(config.OPEN_WEARABLES_URL && config.OPEN_WEARABLES_API_KEY) },
    abdm: { mode: config.ABDM_GATEWAY_URL && config.ABDM_CLIENT_ID ? "configured" : "optional", ready: Boolean(config.ABDM_GATEWAY_URL && config.ABDM_CLIENT_ID) },
  };
}

export async function openWearablesRequest(path: string, init?: RequestInit) {
  const config = runtimeConfig();
  if (!config.OPEN_WEARABLES_URL || !config.OPEN_WEARABLES_API_KEY) throw new Error("Open Wearables is not configured");
  const base = config.OPEN_WEARABLES_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/api/v1${path}`, { ...init, headers: { "X-Open-Wearables-API-Key": config.OPEN_WEARABLES_API_KEY, "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(`Open Wearables ${response.status}: ${await response.text()}`);
  return response;
}

export async function labAdapterRequest(path:string,init?:RequestInit){const config=runtimeConfig();if(!config.LAB_ADAPTER_URL||!config.LAB_ADAPTER_API_KEY)throw new Error("Lab adapter is not configured");const base=config.LAB_ADAPTER_URL.replace(/\/$/,"");const response=await fetch(`${base}${path}`,{...init,headers:{Authorization:`Bearer ${config.LAB_ADAPTER_API_KEY}`,"Content-Type":"application/json",...init?.headers}});if(!response.ok)throw new Error(`Lab adapter ${response.status}: ${await response.text()}`);return response;}

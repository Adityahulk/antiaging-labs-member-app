# AI gateway implementation and activation

Last reviewed: 21 August 2026.

## What is implemented

All model-backed features now use one server-only Responses-compatible client in `lib/ai-gateway.ts`:

- grounded member chat;
- genetics, cross-modal and protocol draft language;
- structured PDF laboratory extraction;
- strict JSON Schema outputs;
- three attempts for transient `408`, `409`, `429` and `5xx` responses;
- request timeouts, an optional second endpoint, request IDs and model/provider audit labels;
- `store: false` on every OpenAI Responses request;
- deterministic product fallbacks whenever credentials are absent or a provider is unavailable.

No browser bundle receives an API key. The client sends no health payload to application logs and stores only the existing product audit envelope, final output and provider/model label.

## Recommended production topology

Use Cloudflare AI Gateway in front of the OpenAI Responses API. It keeps the application provider-neutral while adding gateway-level observability, rate controls and request handling. The application accepts a full Responses-compatible URL, so model traffic can also be moved to another compatible managed gateway later without changing product features.

```text
Member/Admin action
  -> server route
  -> deterministic safety and tenant-scoped data selection
  -> lib/ai-gateway.ts
  -> Cloudflare AI Gateway
  -> OpenAI Responses API
  -> strict schema parser
  -> product sanitizer and audit record
  -> response or deterministic fallback
```

Use one gateway per environment. Disable prompt/body logging at the gateway unless the exact data policy has been approved. Configure spend and rate alerts before enabling a production cohort.

## Environment configuration

### Fastest activation: direct OpenAI

```dotenv
OPENAI_API_KEY=...
AI_PRIMARY_MODEL=gpt-5.6
AI_FAST_MODEL=gpt-5.6
AI_VISION_MODEL=gpt-5.6
AI_TIMEOUT_MS=30000
AI_REASONING_EFFORT=medium
```

With no `AI_GATEWAY_URL`, the server uses `https://api.openai.com/v1/responses`.

### Recommended activation: Cloudflare AI Gateway

Create an AI Gateway, enable gateway authentication, then set its complete OpenAI Responses route:

```dotenv
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway-id>/openai/responses
AI_GATEWAY_TOKEN=<cloudflare-ai-gateway-token>
OPENAI_API_KEY=<openai-project-key>
AI_PRIMARY_MODEL=gpt-5.6
AI_FAST_MODEL=gpt-5.6
AI_VISION_MODEL=gpt-5.6
AI_TIMEOUT_MS=30000
AI_REASONING_EFFORT=medium
```

`OPENAI_API_KEY` is sent as the provider authorization. `AI_GATEWAY_TOKEN` is sent in Cloudflare's `cf-aig-authorization` header. If the gateway securely injects its own provider key, `OPENAI_API_KEY` may be omitted after that behavior is verified in staging.

### Optional failover

The secondary endpoint must accept the same Responses request/response contract:

```dotenv
AI_FALLBACK_URL=https://secondary.example.com/v1/responses
AI_FALLBACK_TOKEN=...
AI_FALLBACK_MODEL=...
```

Failover starts only after the primary endpoint exhausts transient retries. The application never retries a successful response and does not retry ordinary `4xx` validation failures.

## Model routing

| Workload | Environment selector | Current default | Output contract |
|---|---|---|---|
| Member chat | `AI_FAST_MODEL` | `gpt-5.6` | answer, grounding references, confidence, escalation |
| Report/protocol drafting | `AI_PRIMARY_MODEL` | `gpt-5.6` | summary, priorities, limitations, grounding references |
| PDF lab extraction | `AI_VISION_MODEL` | `gpt-5.6` | canonical observation rows, all marked `needs_review` |

The defaults deliberately favor quality and simplicity for the initial cohort. After collecting a reviewed evaluation set, move simple chat turns to a cheaper model only if grounded-answer and escalation performance remain acceptable. Pin explicit model versions for releases when the provider offers them, and rerun the evaluation suite before changing any model ID.

## Activation checklist

1. Create a project-scoped OpenAI API key and set a hard project budget.
2. Create separate staging and production AI Gateways.
3. Add secrets in the Sites runtime secret manager; never commit them or store them as public build variables.
4. Confirm `/api/integrations/health` reports `ready: true`, the expected mode and model without exposing credentials.
5. Test one report draft, one protocol draft, one chat answer and one representative lab PDF.
6. Verify every PDF observation remains in `needs_review` until a staff reviewer accepts it.
7. Replay timeout, `429`, `500`, malformed JSON and unavailable-fallback cases.
8. Review gateway logs to confirm payload logging and retention match the chosen policy.
9. Run the grounded chat evaluation and review the first production conversations before changing routing or prompts.

## Operational behavior

- A missing key does not break the app. Chat uses deterministic grounded replies; reports and protocols use deterministic structured drafts; PDFs enter manual review when they cannot be extracted.
- A provider outage does not block member access. The same fallbacks apply after retries and optional failover.
- The application never trusts a model's citations blindly. Report draft references are filtered against allowed input IDs, and chat sources are generated from the server-selected record.
- Uploaded PDF content is data, not instruction. Extraction runs under a separate instruction and a strict observation-only schema.

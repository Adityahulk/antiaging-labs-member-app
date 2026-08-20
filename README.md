# Antiaging Labs Member OS

Private, authenticated member and operations app for longitudinal biomarkers, wearables, genetics, Biological Twin state estimation, protocol delivery, and grounded member guidance.

## Implemented

- Phase 1A: versioned catalog, sandbox/live Razorpay adapter, order fulfillment, adaptive intake, uploads, observation verification, structured reports, reviewed protocols, Today, retest, Client 360.
- Phase 1B: Oura/WHOOP/Open Wearables adapters, Apple Health and Garmin imports, personal baselines, data quality, eight-domain Twin, bounded daily adjustments.
- Phase 2: raw array/CSV/VCF ingestion, build and call-rate QC, checksummed genomic artifacts, versioned reanalysis, phase-aware APOE handling, genetics report review, four-layer cross-modal fusion, supervised AI report/protocol drafting, grounded chat audit and retrospective review, vendor-neutral lab adapter.
- Phase 3: direct Apple Health and Android Health Connect pairing/sync, longitudinal outcomes, low-risk n-of-1 experiments, model registry/validation/abstention, FHIR R4 export, and scale-readiness operations.
- Delivery: GitHub web validation, Android APK/AAB builds, iOS simulator builds, signed native release artifacts, Dependabot, and documented deployment/integration gates.

## Architecture

- Vinext/React member PWA and staff console
- Cloudflare D1 for versioned operational and longitudinal records
- R2 for uploaded raw artifacts
- Durable webhook inboxes and idempotent provider operations
- Deterministic Twin/genomics/fusion engines; one Responses-compatible AI gateway is used for traceable draft language, grounded chat responses, and review-gated PDF extraction

## Local commands

```bash
npm install
npm run dev
npm run db:generate
npm test
npm run lint
npx tsc --noEmit
```

The app runs without external credentials in sandbox/deterministic mode. Live Razorpay, Open Wearables, AI, and lab-adapter activation use runtime environment variables configured through Sites.

Native build instructions are in [`native/BUILDING.md`](native/BUILDING.md). The exact live-integration and deployment checklist is in [`docs/DEPLOYMENT_AND_INTEGRATIONS.md`](docs/DEPLOYMENT_AND_INTEGRATIONS.md).
AI routing, models, environment variables, failover and activation tests are documented in [`docs/AI_GATEWAY.md`](docs/AI_GATEWAY.md).

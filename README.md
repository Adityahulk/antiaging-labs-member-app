# Antiaging Labs Member OS

Private, authenticated member and operations app for longitudinal biomarkers, wearables, genetics, Biological Twin state estimation, protocol delivery, and grounded member guidance.

## Implemented

- Phase 1A: versioned catalog, sandbox/live Razorpay adapter, order fulfillment, adaptive intake, uploads, observation verification, structured reports, reviewed protocols, Today, retest, Client 360.
- Phase 1B: Oura/WHOOP/Open Wearables adapters, Apple Health and Garmin imports, personal baselines, data quality, eight-domain Twin, bounded daily adjustments.
- Phase 2: raw array/CSV/VCF ingestion, build and call-rate QC, checksummed genomic artifacts, versioned reanalysis, phase-aware APOE handling, genetics report review, four-layer cross-modal fusion, supervised AI report/protocol drafting, grounded chat audit and retrospective review, vendor-neutral lab adapter.

## Architecture

- Vinext/React member PWA and staff console
- Cloudflare D1 for versioned operational and longitudinal records
- R2 for uploaded raw artifacts
- Durable webhook inboxes and idempotent provider operations
- Deterministic Twin/genomics/fusion engines; AI is used for traceable draft language and grounded chat responses

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

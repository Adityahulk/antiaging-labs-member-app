# Deployment, credentials, integrations, and remaining work

Last reviewed: 20 August 2026.

## Current state

- The web/PWA, API, D1 schema, R2 upload paths, Phase 1A/1B workflows, Phase 2 genetics/supervised intelligence, and Phase 3 native pairing/outcomes/experiments/model-validation/FHIR features are implemented.
- The Sites deployment is live as a private authenticated build at `https://antiaging-labs-member.merry-loom-0538.chatgpt.site` with D1 binding `DB` and R2 binding `UPLOADS`.
- The desired public application origin `https://app.antiaging-labs.com` is the native default, but its DNS/custom-domain routing is not yet complete.
- Without live credentials, payments, wearables and AI drafting deliberately use sandbox, deterministic or import modes. Lab/genetics ordering is intentionally concierge-operated for the first cohort.
- Closed-alpha Sites/ChatGPT authentication is implemented with explicit admin/practitioner email allowlists; production demo identity and demo health seeding are disabled by environment.
- D1/R2 are bound, and the admin can create checksum-verified D1 backup manifests in R2; the daily worker ensures a recent verified copy exists.
- GitHub Actions now validate the web app, build Android debug APK/AAB files, build an iOS simulator application, and produce signed Android/iOS release artifacts when signing secrets are configured.

## External integration matrix

| System | Code path/status | Values or approvals still required |
|---|---|---|
| Cloudflare/Sites | D1 `DB` and R2 `UPLOADS` are deployed; build is private | Bind `app.antiaging-labs.com`, finish DNS/TLS, set runtime secrets, migrate/seed production data, define backup/restore and log alerting |
| Member authentication | Sites/ChatGPT sign-in, anonymous gate, server-side ownership, explicit staff allowlists and production-safe seeding are implemented | Owner approval to make the Site publicly reachable for the cohort; members need ChatGPT accounts. Standalone OTP can wait until after alpha |
| Razorpay | Checkout order creation, signature verification, webhook inbox, refund idempotency, and sandbox fallback exist | Live account/KYC, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; register `/api/webhooks/razorpay`; verify live capture/refund/reconciliation |
| Open Wearables | Oura, WHOOP, and approved Garmin adapter paths plus webhook verification exist | Deploy or contract an Open Wearables instance; `OPEN_WEARABLES_URL`, `OPEN_WEARABLES_API_KEY`, `OPEN_WEARABLES_WEBHOOK_SECRET`; configure its provider credentials and callback URLs |
| Oura | Connect/sync/disconnect flows work through Open Wearables | Oura client ID/secret, production application approval and redirect URL; written data-use decision before Oura data or derivatives enter AI prompts/evaluation |
| WHOOP | Connect/sync/disconnect flows work through Open Wearables | WHOOP client ID/secret, webhook secret, redirect URL and production approval; confirm retention and AI-use terms in writing |
| Apple Health / Apple Watch | Direct on-device HealthKit companion source, Xcode project, entitlement, privacy manifest, CI simulator build and signed-IPA workflow exist | Apple Developer membership, Team ID, registered bundle ID, HealthKit capability, distribution certificate/profile, physical-device QA, App Store Connect record and review |
| Android Health Connect | Direct on-device connector, runtime permissions, encrypted token, incremental sync and WorkManager reconciliation exist | Google Play Developer account, upload/app-signing key, Health Connect declaration and permission approval, physical-device QA and closed-track review |
| Garmin | File import exists; direct gateway route is adapter-ready | Garmin Health API business approval/licence and credentials in the gateway, or retain file-import mode |
| Lab/genetics fulfillment | Full manual concierge console now captures provider, vendor reference, appointment, ETA, tracking, instructions, public updates, private notes and modality-specific statuses | Admin books externally and updates the console. Lab API selection, credentials and automated submission are deferred |
| AI model | Central Responses-compatible gateway, strict schemas, retries/timeouts/failover, grounded chat, review-gated PDF extraction, audit labels and deterministic fallbacks are implemented | Add an OpenAI project key and preferably a Cloudflare AI Gateway URL/token; set runtime secrets and budgets; run the activation checklist in `docs/AI_GATEWAY.md` |
| ABDM/FHIR | FHIR R4 export is implemented; ABDM is optional/configuration-only | ABDM sandbox registration, `ABDM_GATEWAY_URL`, `ABDM_CLIENT_ID` and any production secret/certificate required by the selected gateway; conformance/security testing |
| Notifications | In-app messages/status exist | Select email/SMS/WhatsApp vendors, add templates/consent/delivery webhooks, and configure sender/domain/KYC credentials. No production outbound provider is implemented yet |
| Push notifications | Not implemented | APNs key and FCM project/service account; device-token registry, consent UI, delivery worker and deep-link routing |
| Monitoring | Platform build logs exist | Select error/APM tooling, scrub all health/genetic payloads, create uptime and queue-lag alerts, incident routing and a tested backup-restore runbook |
| Product analytics | Not intentionally connected | Choose a privacy-minimizing analytics setup only after an event-data review; never send biomarker, genomic, protocol, symptom, or chat content |

## GitHub repository configuration

1. Push this repository and workflows to GitHub. The workspace only has the internal Sites remote; no `github.com` remote or pull request is configured yet.
2. Protect `main`; require `Web CI`, `Native CI / Android`, and `Native CI / iOS` before merge.
3. Add the signing values documented in `.github/SECRETS.md` to a reviewer-protected release environment.
4. Enable Dependabot and secret scanning. Restrict Actions to approved actions and pin third-party actions.
5. Run **Native CI** first. Then create closed-test store records and run **Signed Native Release**.
6. Add Play/App Store upload automation only after package IDs and store applications are final; the release workflow currently creates downloadable signed artifacts but does not publish them.

## Deployment sequence

1. **Domain and identity:** attach `app.antiaging-labs.com`; approve public cohort access with the application sign-in gate; maintain `ADMIN_EMAILS` and `PRACTITIONER_EMAILS`.
2. **Data environment:** D1/R2 bindings, migrations and verified weekly application backups are implemented. Before broad launch, rehearse restore into a separate staging database and define a longer-term backup policy.
3. **Server secrets:** add Razorpay, Open Wearables and AI gateway credentials through the hosting secret store. Never put them in client bundles or GitHub variables.
4. **Provider callbacks:** register Razorpay and Open Wearables/Oura/WHOOP webhook URLs; replay duplicate, delayed, invalid-signature and out-of-order fixtures. Lab callbacks are deferred.
5. **Native accounts:** register `com.antiaginglabs.companion` in Apple and Google portals, enable HealthKit/Health Connect declarations, create signing credentials, then run the signed-release workflow.
6. **Closed alpha:** TestFlight + Google Play internal track, physical Apple Watch/iPhone and Android device matrix, timezone/DST/deletion/revocation/offline tests, and 100% human review of reports/protocols.
7. **Operational readiness:** staff training, vendor SLAs, notification delivery, monitoring, backup restore, privacy request handling, incident/rollback exercises and support escalation ownership.
8. **Launch:** switch Razorpay and vendor adapters to live only after reconciliation checks; expand users gradually and monitor payment exceptions, connector freshness, ingestion failures, report turnaround and chat escalations.

## Store-release work still pending

- Final app name, icon set, launch visuals, screenshots, preview video and localized listing copy.
- Apple privacy nutrition labels, export-compliance answers, age rating, review account and HealthKit usage explanation.
- Google Play Data Safety form, Health Apps declaration, content rating, privacy-policy URL, account-deletion URL and testing instructions.
- Real-device performance, accessibility, background-sync reliability and battery-impact testing.
- Decide whether the first release remains a thin companion or also wraps selected PWA views; the current implementation intentionally keeps sensitive device permission/sync UX native and the full product on the web.
- Test signed packages from CI before store submission. The present machine has no Xcode installation, Android SDK, or JDK 17, so local native compilation could not be performed here; GitHub `macos-15` and `ubuntu-latest` jobs are the build authority.

## Product and operations items still pending

- Standalone email/phone OTP, account recovery and staff MFA after the Sites-authenticated alpha.
- Actual live product catalog, GST/invoice rules, serviceability, cancellations, pricing, vendor SKUs and support SLAs.
- Lab and genetics vendor contracts, ordering integration, result mappings, sample-custody workflow and critical-result channel.
- Clinician/staff roster, qualifications, queue ownership, approval SLAs and escalation coverage.
- Evidence/rule/protocol governance content, final biological-age versions, validation sets, review cadence and rollback owners.
- A production approved-evidence corpus for chatbot grounding, model/provider contract, budget/latency targets and a reviewed red-team dataset.
- Email/SMS/WhatsApp and push delivery implementations.
- Production security review, penetration test, dependency/SBOM review, backup restoration, deletion drill and incident exercise.
- Terms, privacy notice, consents, retention schedule, store privacy disclosures and launch claims must match the actual integrations enabled at release.

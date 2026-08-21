# Closed-alpha setup completed

Last reviewed: 22 August 2026.

## Authentication selected for the first cohort

The first cohort uses Sites/ChatGPT sign-in. This is the smallest efficient option because it adds no separate auth vendor, SMS bill, password database, or OAuth secret. Each signed-in person receives a stable Site-specific ID and the server keeps every member query scoped to that ID.

Production behavior:

- anonymous requests see the sign-in screen;
- API requests without an authenticated identity receive `401`;
- local demo access works only when `ALLOW_DEMO_AUTH=true` is explicitly set;
- new production accounts receive empty onboarding records, not Arjun's demonstration health data;
- admin and practitioner access comes only from `ADMIN_EMAILS` and `PRACTITIONER_EMAILS` allowlists or an existing explicit database role;
- a first member is never automatically promoted to administrator.

For the private owner build, Sites already authenticates the owner. To invite the founding cohort, the Site must later be made public with the application sign-in gate still enabled. That access change requires the owner's explicit approval. Every cohort member will need a ChatGPT account. A standalone email/phone OTP provider can replace this after the alpha without changing member ownership in the health tables, provided an account-linking migration is planned.

## Manual test fulfillment

No lab or genetics ordering API is required for the alpha.

After a payment enters the fulfillment queue, an admin:

1. books the biomarker test or genetics kit with the chosen external provider;
2. opens **Operations → Concierge fulfillment → Manage booking details**;
3. adds the provider, external booking reference, appointment or collection date, ETA, tracking link and member instructions;
4. chooses the current status;
5. writes a member-visible update and an optional private internal note;
6. saves the update.

The member immediately sees the sanitized status, booking/collection date, ETA, reference, instructions, tracking link and complete public timeline. Internal notes are stored in the append-only order event but are never returned by member APIs.

Supported genetics states include kit preparation, dispatch, delivery, sample registration, return transit, lab receipt, QC, file receipt, interpretation review and release. Biomarker states include booking, appointment, collection, lab receipt, processing, result verification and release. QC failure, recollection, cancellation and refund remain explicit.

## Database and file storage

The live application already has:

- D1 binding `DB` for structured member and operational records;
- R2 binding `UPLOADS` for source documents, genetics files and backup objects;
- generated, deployable Drizzle migrations;
- prepared statements and ownership-scoped queries;
- automatic `PRAGMA optimize` on schema initialization.

The alpha now also has verified D1 backups:

- an admin can select **Back up now** in Operations;
- the worker creates a versioned JSON manifest under `system-backups/d1/` in R2;
- it computes a SHA-256 checksum;
- it reads the object back from R2;
- it verifies checksum, table count, row count and manifest format;
- it records the result in `backup_runs`;
- the daily worker creates a backup automatically when no verified backup exists from the previous six days.
- a server-only `BACKUP_RUN_KEY` permits an authenticated maintenance trigger without granting a member or browser session access. Keep it in Sites secrets only.

This is an application-level recovery copy suitable for the small alpha. Before a larger production launch, restore a verified manifest into a separate staging D1 database and compare member/order/observation counts before adopting it as a full disaster-recovery procedure. A restore is intentionally never run against the live database from the admin UI.

## Environment values

Production:

```dotenv
APP_ENV=production
ALLOW_DEMO_AUTH=false
SEED_DEMO_DATA=false
ADMIN_EMAILS=founder@your-domain.com
PRACTITIONER_EMAILS=
```

Local demonstration:

```dotenv
APP_ENV=development
ALLOW_DEMO_AUTH=true
SEED_DEMO_DATA=true
```

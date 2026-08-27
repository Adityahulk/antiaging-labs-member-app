# Antiaging Labs operational runbook

## Daily operating check

1. Open Operations and clear urgent and priority safety tickets first.
2. Review data-rights requests. Verify the member identity using the account email before releasing an export or processing deletion.
3. Check the latest backup status. It must be `verified`; a checksum verification confirms that the stored export is readable and complete.

## Recovery drill (monthly)

1. Choose the latest verified database backup in Operations and run **Verify latest**.
2. Restore the JSON export only into a separate, isolated recovery D1 database. Never overwrite the production database for a drill.
3. Confirm expected tables, row counts, a sample member record, and a sample uploaded-object reference.
4. Record the date, operator, backup ID, recovery target, result, and any corrective action in the operations log.
5. Only use a validated recovery copy for a real incident. Before production recovery, freeze writes, create a fresh production backup, get an authorized incident decision, restore, then validate auth, member data, and background jobs.

## Data-copy and deletion requests

1. Move the request to **In review** in Operations.
2. Verify the account holder’s identity through a separate channel.
3. For an export, assemble the member’s account, intake, observations, reports, protocol, chat, upload metadata, and consent history. Encrypt delivery and set an expiry.
4. For deletion, identify data that must be retained for payment reconciliation, safety incident handling, or legal duties. Delete the remaining member data and uploaded objects; invalidate sessions and connected wearable tokens.
5. Record what was completed, what was retained and why, then mark the request completed. Never mark it completed before the underlying deletion/export is actually done.

## Alerting escalation

1. Route unhandled server exceptions and release errors to the error-monitoring service.
2. Page the on-call owner for any urgent safety ticket, auth failure spike, failed scheduled backup, failed payment webhook, or sustained 5xx spike.
3. This product inbox is not emergency care. Urgent user messages must always show emergency-services guidance and be reviewed as a priority support ticket.

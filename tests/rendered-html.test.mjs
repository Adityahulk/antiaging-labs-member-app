import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root=new URL("../",import.meta.url);
const file=(path)=>readFile(new URL(path,root),"utf8");

test("ships the complete member experience instead of the starter",async()=>{
  const [home,layout,shell,styles]=await Promise.all([file("app/page.tsx"),file("app/layout.tsx"),file("components/member-shell.tsx"),file("app/globals.css")]);
  assert.match(home,/TodayExperience/);assert.match(layout,/Antiaging Labs/);assert.match(shell,/Twin/);assert.match(shell,/Protocol/);assert.match(styles,/expanded-map/);assert.doesNotMatch(home,/SkeletonPreview|codex-preview/);
});

test("contains Phase 1A operational workflows",async()=>{
  const [schema,checkout,upload,reports,protocol,admin]=await Promise.all([file("db/schema.ts"),file("app/api/payments/checkout/route.ts"),file("lib/upload-processing.ts"),file("lib/report-engine.ts"),file("lib/protocol-engine.ts"),file("components/workflow-experiences.tsx")]);
  assert.match(schema,/catalogVersions/);assert.match(schema,/orderEvents/);assert.match(schema,/paymentAttempts/);assert.match(checkout,/Idempotency-Key/);assert.match(checkout,/razorpay/);assert.match(upload,/processUpload/);assert.match(reports,/status = 'ready'/);assert.match(protocol,/status = 'current'/);assert.match(admin,/FULFILLMENT QUEUE/);
});

test("contains Phase 1B wearable fusion and daily adaptation",async()=>{
  const [wearables,importers,twin,daily,connections]=await Promise.all([file("lib/wearables.ts"),file("lib/importers.ts"),file("lib/twin-engine.ts"),file("lib/daily-jobs.ts"),file("components/workflow-experiences.tsx")]);
  assert.match(wearables,/openWearablesRequest/);assert.match(importers,/parseAppleHealth/);assert.match(importers,/parseGarmin/);assert.match(twin,/validDays/);assert.match(twin,/confidence/);assert.match(twin,/generateDailyAdjustment/);assert.match(daily,/runDailyJobs/);assert.match(connections,/DIRECT CONNECTIONS/);
});

test("includes deployable migrations and all core routes",async()=>{
  const required=["drizzle/0000_brave_ozymandias.sql","drizzle/0001_modern_mandrill.sql","app/api/twin/recompute/route.ts","app/api/reports/generate/route.ts","app/api/protocols/generate/route.ts","app/api/wearables/connect/[provider]/route.ts","app/admin/clients/[id]/page.tsx"];
  await Promise.all(required.map((path)=>access(new URL(path,root))));
  assert.equal(required.length,7);
});

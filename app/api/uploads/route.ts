import { env } from "cloudflare:workers";
import { getDatabase, id, nowIso } from "@/lib/database";
import { getMemberIdentity } from "@/lib/member";
import { ensureMemberSeed } from "@/lib/seed";
import { processUpload } from "@/lib/upload-processing";

type UploadEnv = { UPLOADS?: R2Bucket };

export async function GET() {
  const identity = await getMemberIdentity();
  await ensureMemberSeed(identity);
  const db = await getDatabase();
  const rows = await db.prepare("SELECT id, type, file_name, content_type, size, status, created_at FROM uploads WHERE member_id = ? ORDER BY created_at DESC").bind(identity.id).all();
  return Response.json(rows.results);
}

export async function POST(request: Request) {
  const identity = await getMemberIdentity();
  await ensureMemberSeed(identity);
  const form = await request.formData();
  const file = form.get("file");
  const type = String(form.get("type") ?? "document");
  if (!(file instanceof File) || !file.size) return Response.json({ error: "Choose a file" }, { status: 400 });
  const maximum = type === "genetics" ? 50 * 1024 * 1024 : 25 * 1024 * 1024;
  if (file.size > maximum) return Response.json({ error: `Maximum file size is ${maximum / 1024 / 1024} MB. Register larger WGS artifacts through the genomic artifact workflow.` }, { status: 413 });
  const allowed = ["application/pdf", "text/csv", "text/plain", "application/json", "application/xml", "text/xml", "application/zip", "application/gzip", "application/octet-stream"];
  if (!allowed.includes(file.type) && !/\.(pdf|csv|txt|json|xml|zip|vcf|gvcf)$/i.test(file.name)) return Response.json({ error: "Unsupported file type" }, { status: 415 });
  const uploadId = id("upload");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `${identity.id}/${uploadId}/${safeName}`;
  const bucket = (env as unknown as UploadEnv).UPLOADS;
  if (!bucket) return Response.json({ error: "Upload storage is unavailable" }, { status: 503 });
  await bucket.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { memberId: identity.id, type } });
  const db = await getDatabase();
  await db.prepare("INSERT INTO uploads (id, member_id, type, object_key, file_name, content_type, size, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'received', ?)")
    .bind(uploadId, identity.id, type, objectKey, file.name, file.type || "application/octet-stream", file.size, nowIso()).run();
  const processing = await processUpload(identity.id, uploadId);
  return Response.json({ id: uploadId, fileName: file.name, type, status: processing.status === "completed" ? "processed" : processing.status, processing }, { status: 201 });
}

import { getDatabase, id, nowIso } from "./database";
import { syncWearableWithTelemetry } from "./wearables";
import { recomputeTwin } from "./twin-engine";
import { generateReport } from "./report-engine";
import { runPhase3Jobs } from "./phase3";
import { maybeCreateScheduledBackup } from "./backups";

export async function runDailyJobs() {
  const db = await getDatabase(); const members = await db.prepare("SELECT id FROM members").all<{ id:string }>(); const results: Array<Record<string,unknown>>=[];
  for (const member of members.results) { const connections=await db.prepare("SELECT provider FROM wearable_connections WHERE member_id=? AND status='active' AND provider IN ('oura','whoop','garmin')").bind(member.id).all<{provider:string}>(); const synced:string[]=[]; for(const connection of connections.results){try{await syncWearableWithTelemetry(member.id,connection.provider,"scheduled_reconcile");synced.push(connection.provider);}catch{/* one provider never blocks the batch */}} const twin=await recomputeTwin(member.id); const today=nowIso().slice(0,10); const weekday=new Date().getUTCDay(); let reportId:string|undefined; if(weekday===1){const existing=await db.prepare("SELECT id FROM reports WHERE member_id=? AND type='wearables' AND source_date>=date('now','-6 day')").bind(member.id).first<{id:string}>(); if(!existing)reportId=(await generateReport(member.id,"wearables")).id;} await db.prepare("INSERT INTO admin_events (member_id,actor_id,action,entity_type,entity_id,detail_json,created_at) VALUES (?,'system','daily_loop.completed','member',?,?,?)").bind(member.id,member.id,JSON.stringify({day:today,synced,twinVersion:twin.version,reportId:reportId??null}),nowIso()).run(); results.push({memberId:member.id,synced,twinVersion:twin.version,reportId}); }
  const phase3=await runPhase3Jobs(); const backup=await maybeCreateScheduledBackup().catch((caught)=>({status:"failed",error:caught instanceof Error?caught.message:"Backup failed"})); await db.prepare("INSERT INTO webhook_events (id,provider,event_type,payload_json,status,received_at,processed_at) VALUES (?,'system','daily_loop',?,'processed',?,?)").bind(id("jobrun"),JSON.stringify({results,phase3,backup}),nowIso(),nowIso()).run(); return {processed:results.length,results,phase3,backup};
}

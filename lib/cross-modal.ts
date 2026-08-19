import { getDatabase, id, nowIso } from "./database";

export const CROSS_MODAL_METHOD_VERSION = "cross-modal-observer-v2.0.0";

type Layer = { type: "laboratory" | "wearable" | "genetics" | "intake"; status: "available" | "pending" | "missing"; quality: number; evidence: string[]; refs: string[] };

const domainConcepts: Record<string, string[]> = {
  metabolic: ["homa_ir", "fasting_glucose", "fasting_insulin", "hba1c"], cardiovascular: ["apob", "ldl", "hdl", "triglycerides"],
  sleep: ["sleep_duration_28d"], recovery: ["hrv_rmssd_28d", "resting_hr_28d"], activity: ["daily_steps_28d"],
  body_composition: ["waist", "weight", "body_fat"], kidney_liver: ["creatinine", "alt", "ast"], constraints: [],
};

const domainGenes: Record<string, string[]> = {
  metabolic: ["FTO", "PPARGC1A"], cardiovascular: ["APOE"], sleep: ["CYP1A2"], recovery: ["COMT", "BDNF"],
  activity: ["ACTN3", "PPARGC1A"], body_composition: ["FTO"], kidney_liver: [], constraints: ["CYP1A2"],
};

function bounded(value: number) { return Math.max(.2, Math.min(.98, Number(value.toFixed(2)))); }

export async function buildCrossModalFindings(memberId: string, snapshotId: string) {
  const db=await getDatabase();const [domains,observations,wearable,genetics,intake]=await Promise.all([
    db.prepare("SELECT * FROM twin_domains WHERE member_id=? AND snapshot_id=? ORDER BY id").bind(memberId,snapshotId).all<Record<string,unknown>>(),
    db.prepare("SELECT id,concept_code,value_number,value_text,unit,effective_at,quality FROM observations WHERE member_id=? AND quality!='rejected' ORDER BY effective_at DESC").bind(memberId).all<Record<string,unknown>>(),
    db.prepare("SELECT COUNT(*) valid_days, MAX(day) latest_day, AVG(quality) quality FROM wearable_daily WHERE member_id=? AND day>=date('now','-28 day') AND quality>=.7").bind(memberId).first<Record<string,unknown>>(),
    db.prepare("SELECT id,gene,rsid,title,summary,evidence_level,status FROM genomic_interpretations WHERE member_id=? ORDER BY created_at DESC").bind(memberId).all<Record<string,unknown>>(),
    db.prepare("SELECT COUNT(*) answered FROM intake_answers WHERE member_id=?").bind(memberId).first<{answered:number}>(),
  ]);
  const latest=new Map<string,Record<string,unknown>>();for(const row of observations.results)if(!latest.has(String(row.concept_code)))latest.set(String(row.concept_code),row);
  const statements:D1PreparedStatement[]=[];const output:Array<Record<string,unknown>>=[];const now=nowIso();
  for(const domain of domains.results){const code=String(domain.domain_code);const concepts=(domainConcepts[code]??[]).map((concept)=>latest.get(concept)).filter(Boolean) as Record<string,unknown>[];const genes=domainGenes[code]??[];const allGenetic=genetics.results.filter((item)=>genes.includes(String(item.gene)));const released=allGenetic.filter((item)=>item.status==="released");const layers:Layer[]=[];
    layers.push({type:"laboratory",status:concepts.length?"available":"missing",quality:concepts.length?Math.min(1,concepts.filter((item)=>item.quality==="accepted").length/Math.max(1,concepts.length)+.15):0,evidence:concepts.map((item)=>`${item.concept_code}: ${item.value_number??item.value_text??"—"} ${item.unit??""}`.trim()),refs:concepts.map((item)=>String(item.id))});
    const wearableDomain=["sleep","recovery","activity"].includes(code);layers.push({type:"wearable",status:wearableDomain&&Number(wearable?.valid_days??0)>0?"available":"missing",quality:wearableDomain?Number(wearable?.quality??0):0,evidence:wearableDomain?[`${Number(wearable?.valid_days??0)} valid days through ${wearable?.latest_day??"—"}`]:[],refs:[]});
    layers.push({type:"genetics",status:released.length?"available":allGenetic.length?"pending":"missing",quality:released.length?.8:0,evidence:(released.length?released:allGenetic).map((item)=>`${item.gene} ${item.rsid}: ${item.title}`),refs:(released.length?released:allGenetic).map((item)=>String(item.id))});
    layers.push({type:"intake",status:Number(intake?.answered??0)>0?"available":"missing",quality:Math.min(1,Number(intake?.answered??0)/40),evidence:[`${Number(intake?.answered??0)} intake answers available`],refs:[]});
    const available=layers.filter((layer)=>layer.status==="available");const base=Number(domain.confidence??.35);const layerQuality=available.length?available.reduce((sum,layer)=>sum+layer.quality,0)/available.length:0;const confidence=bounded(base*.78+layerQuality*.12+Math.min(.08,available.length*.02));const pending=layers.filter((layer)=>layer.status==="pending").map((layer)=>layer.type);const missing=layers.filter((layer)=>layer.status==="missing").map((layer)=>layer.type);const title=`${domain.label} evidence stack`;const statement=`${domain.state_label} state with ${available.length} active evidence layer${available.length===1?"":"s"}. ${pending.length?`${pending.join(", ")} review is pending. `:""}${missing.length?`${missing.join(", ")} would improve resolution.`:"The current inputs provide broad cross-modal context."}`;const refs=layers.flatMap((layer)=>layer.refs);
    const finding={id:id("finding"),memberId,snapshotId,domainCode:code,title,statement,direction:String(domain.trend),confidence,layers,evidenceRefs:refs,missing,methodVersion:CROSS_MODAL_METHOD_VERSION,createdAt:now};output.push(finding);statements.push(db.prepare("INSERT INTO cross_modal_findings (id,member_id,snapshot_id,domain_code,title,statement,direction,confidence,layers_json,evidence_refs_json,missing_json,method_version,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(finding.id,memberId,snapshotId,code,title,statement,finding.direction,confidence,JSON.stringify(layers),JSON.stringify(refs),JSON.stringify(missing),CROSS_MODAL_METHOD_VERSION,now));}
  if(statements.length)await db.batch(statements);return output;
}

export async function getCrossModalFindings(memberId:string,snapshotId:string){const db=await getDatabase();const rows=await db.prepare("SELECT * FROM cross_modal_findings WHERE member_id=? AND snapshot_id=? ORDER BY id").bind(memberId,snapshotId).all<Record<string,unknown>>();return rows.results;}

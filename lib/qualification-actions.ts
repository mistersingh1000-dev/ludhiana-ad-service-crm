import {Qualification,QualificationAnswers,qualifyLead} from "@/lib/lead-intelligence";
export async function saveQualification(service:any,org:string,leadId:string,input:{name:string;answers?:QualificationAnswers;message?:string;currentStatus?:string}):Promise<Qualification>{
 const q=qualifyLead(input.answers||{},input.message||"",input.name);
 const update:any={qualification_answers:input.answers||{},lead_score:q.score,lead_priority:q.priority,lead_intent:q.intent,suggested_action:q.nextAction,suggested_reply:q.replyDraft,lead_summary:q.summary};
 if(input.currentStatus==="new"&&q.suggestedStatus==="Interested")update.status="interested";
 if(q.intent==="not_interested"){update.whatsapp_opt_in=false;update.opted_out_at=new Date().toISOString();}
 const {error}=await service.from("leads").update(update).eq("organization_id",org).eq("id",leadId);
 if(error)throw error;
 if(q.intent!=="not_interested"){
   const {error:taskError}=await service.from("lead_tasks").upsert({organization_id:org,lead_id:leadId,task_key:q.taskKey,title:q.nextAction,due_at:new Date(Date.now()+q.followUpHours*3600000).toISOString(),status:"pending"},{onConflict:"organization_id,lead_id,task_key",ignoreDuplicates:true});
   if(taskError)throw taskError;
 }
 return q;
}

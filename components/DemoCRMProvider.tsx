"use client";

import { Lead, LeadStatus, leads as seedLeads } from "@/lib/demo";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { qualifyLead } from "@/lib/lead-intelligence";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CRMContextValue = {
  leads: Lead[];
  mode: "demo" | "live";
  loading: boolean;
  error: string;
  addLead: (lead: Omit<Lead, "id">) => Promise<void>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  resetDemo: () => void;
};

const STORAGE_KEY = "ludhiana-ad-service-crm-demo-leads-v2";
const CRMContext = createContext<CRMContextValue | null>(null);
const uiToDb: Record<LeadStatus,string> = {"New":"new","Contacted":"contacted","Interested":"interested","Follow-up":"follow_up","Converted":"converted","Lost":"lost"};
const dbToUi: Record<string,LeadStatus> = {new:"New",contacted:"Contacted",interested:"Interested",follow_up:"Follow-up",converted:"Converted",lost:"Lost"};

function formatFollowUp(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
}
function waitingSince(createdAt: string | null, lastContactedAt?: string | null, status?: string) {
  if (!createdAt || lastContactedAt || (status && status !== "new")) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"}`;
}
function toIsoOrNull(value: string) {
  if (!value || value === "Not scheduled" || value === "Completed" || value === "—") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function rowToLead(row:any): Lead {
  return {
    id:String(row.id), name:row.name || "Unnamed lead", phone:row.phone || "", source:row.source || "Manual",
    campaign:row.campaign || "Unspecified", owner:row.owner_name || "Unassigned", status:dbToUi[row.status] || "New",
    nextFollowUp:formatFollowUp(row.next_follow_up_at),answers:row.qualification_answers||{},score:row.lead_score||0,priority:row.lead_priority||"Cold",intent:row.lead_intent||"information",suggestedAction:row.suggested_action||"",suggestedReply:row.suggested_reply||"",summary:row.lead_summary||"", waiting:waitingSince(row.created_at,row.last_contacted_at,row.status), value:Number(row.pipeline_value || 0), createdAt:row.created_at || new Date().toISOString(),
  };
}

export default function DemoCRMProvider({ children }: { children: React.ReactNode }) {
  const liveRequested = process.env.NEXT_PUBLIC_DEMO_MODE === "false";
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const mode: "demo" | "live" = liveRequested && supabase ? "live" : "demo";
  const [leads, setLeads] = useState<Lead[]>(mode === "demo" ? seedLeads : []);
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState(mode === "live");
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled=false;
    async function init(){
      if(mode==="demo"){
        try { const saved=localStorage.getItem(STORAGE_KEY); if(saved) setLeads(JSON.parse(saved)); } catch {}
        setHydrated(true);setLoading(false);return;
      }
      if(!supabase)return;
      setLoading(true);setError("");
      const {data:{user},error:userError}=await supabase.auth.getUser();
      if(cancelled)return;
      if(userError||!user){setError("Your session has expired. Please log in again.");setLoading(false);return;}
      const {data:profile,error:profileError}=await supabase.from("profiles").select("organization_id").eq("id",user.id).single();
      if(cancelled)return;
      if(profileError||!profile?.organization_id){setError("CRM workspace could not be loaded.");setLoading(false);return;}
      setOrgId(profile.organization_id);
      const {data:rows,error:leadError}=await supabase.from("leads").select("id,name,phone,source,campaign,owner_name,status,next_follow_up_at,pipeline_value,created_at,last_contacted_at,qualification_answers,lead_score,lead_priority,lead_intent,suggested_action,suggested_reply,lead_summary").order("created_at",{ascending:false});
      if(cancelled)return;
      if(leadError)setError(leadError.message); else setLeads((rows||[]).map(rowToLead));
      setLoading(false);
    }
    init();return()=>{cancelled=true};
  },[mode,supabase]);

  useEffect(() => {
    if (mode !== "demo" || !hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads, hydrated, mode]);

  async function addLead(lead: Omit<Lead,"id">){
    const q=qualifyLead(lead.answers||{},"",lead.name);
    const enriched={...lead,score:q.score,priority:q.priority,intent:q.intent,suggestedAction:q.nextAction,suggestedReply:q.replyDraft,summary:q.summary};
    if(mode==="demo"||!supabase){setLeads(current=>[{...enriched,id:String(Date.now()),createdAt:lead.createdAt || new Date().toISOString()},...current]);return;}
    if(!orgId){setError("Workspace is still loading. Please try again.");return;}
    const payload={organization_id:orgId,name:lead.name,phone:lead.phone,source:lead.source,campaign:lead.campaign,owner_name:lead.owner,status:uiToDb[lead.status],next_follow_up_at:toIsoOrNull(lead.nextFollowUp),pipeline_value:lead.value,qualification_answers:lead.answers||{},lead_score:q.score,lead_priority:q.priority,lead_intent:q.intent,suggested_action:q.nextAction,suggested_reply:q.replyDraft,lead_summary:q.summary};
    const {data,error:insertError}=await supabase.from("leads").insert(payload).select("id,name,phone,source,campaign,owner_name,status,next_follow_up_at,pipeline_value,created_at,last_contacted_at,qualification_answers,lead_score,lead_priority,lead_intent,suggested_action,suggested_reply,lead_summary").single();
    if(insertError){setError(insertError.message);return;} if(data){setLeads(current=>[rowToLead(data),...current]);await supabase.from("lead_tasks").upsert({organization_id:orgId,lead_id:data.id,task_key:q.taskKey,title:q.nextAction,due_at:new Date(Date.now()+q.followUpHours*3600000).toISOString()},{onConflict:"organization_id,lead_id,task_key",ignoreDuplicates:true});}
  }
  async function updateLead(id:string,patch:Partial<Lead>){
    const currentLead=leads.find(l=>l.id===id);
    const q=patch.answers!==undefined?qualifyLead(patch.answers,"",patch.name||currentLead?.name||"Customer"):null;
    const effectivePatch={...patch,...(q?{score:q.score,priority:q.priority,intent:q.intent,suggestedAction:q.nextAction,suggestedReply:q.replyDraft,summary:q.summary}:{})};
    if(patch.status && patch.status!=="New" && patch.waiting===undefined) effectivePatch.waiting="—";
    setLeads(current=>current.map(lead=>lead.id===id?{...lead,...effectivePatch}:lead));
    if(mode==="demo"||!supabase)return;
    const dbPatch:any={};
    if(patch.name!==undefined)dbPatch.name=patch.name;if(patch.phone!==undefined)dbPatch.phone=patch.phone;if(patch.source!==undefined)dbPatch.source=patch.source;if(patch.campaign!==undefined)dbPatch.campaign=patch.campaign;if(patch.owner!==undefined)dbPatch.owner_name=patch.owner;if(patch.status!==undefined){dbPatch.status=uiToDb[patch.status];if(patch.status!=="New")dbPatch.last_contacted_at=new Date().toISOString();}if(patch.nextFollowUp!==undefined)dbPatch.next_follow_up_at=toIsoOrNull(patch.nextFollowUp);if(patch.value!==undefined)dbPatch.pipeline_value=patch.value;if(q){dbPatch.qualification_answers=patch.answers;dbPatch.lead_score=q.score;dbPatch.lead_priority=q.priority;dbPatch.lead_intent=q.intent;dbPatch.suggested_action=q.nextAction;dbPatch.suggested_reply=q.replyDraft;dbPatch.lead_summary=q.summary;}
    const {error:updateError}=await supabase.from("leads").update(dbPatch).eq("id",id);if(updateError)setError(updateError.message);
  }
  function resetDemo(){if(mode!=="demo")return;setLeads(seedLeads);localStorage.removeItem(STORAGE_KEY);}

  const value=useMemo<CRMContextValue>(()=>({leads,mode,loading,error,addLead,updateLead,resetDemo}),[leads,mode,loading,error,orgId]);
  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useDemoCRM(){const context=useContext(CRMContext);if(!context)throw new Error("useDemoCRM must be used inside DemoCRMProvider");return context;}

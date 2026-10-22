"use client";
import PageTitle from "@/components/PageTitle";
import {useDemoCRM} from "@/components/DemoCRMProvider";
import {createBrowserSupabaseClient} from "@/lib/supabase-browser";
import {qualifyLead,chooseReply,defaultReplyRules,ReplyRule} from "@/lib/lead-intelligence";
import {useEffect,useState} from "react";
const questions=["Required service or plan","Budget","When do you need it?","Call or WhatsApp preference","Location and other requirements"];
const KEY="ludhiana-crm-bot-settings-v1";
export default function Automation(){
 const {mode,leads}=useDemoCRM();
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [message,setMessage]=useState("What is the price? Please call me today.");
 const [rules,setRules]=useState<ReplyRule[]>(defaultReplyRules);
 const [enabled,setEnabled]=useState(false),[org,setOrg]=useState(""),[notice,setNotice]=useState("");
 const [tasks,setTasks]=useState<Array<{id:string;lead_id:string;title:string;due_at:string}>>([]);
 const q=qualifyLead(answers,message,"Customer"),matched=chooseReply(message,rules);
 useEffect(()=>{async function load(){
  if(mode==="demo"){try{const x=JSON.parse(localStorage.getItem(KEY)||"{}");if(x.rules)setRules(x.rules);setEnabled(Boolean(x.enabled));}catch{}return;}
  const s=createBrowserSupabaseClient();if(!s)return;
  const {data:{user}}=await s.auth.getUser();if(!user)return;
  const {data:p}=await s.from("profiles").select("organization_id").eq("id",user.id).single();
  if(!p?.organization_id)return;setOrg(p.organization_id);
  const {data:settings}=await s.from("automation_settings").select("auto_reply_enabled,reply_rules").eq("organization_id",p.organization_id).maybeSingle();
  if(settings){setEnabled(Boolean(settings.auto_reply_enabled));if(Array.isArray(settings.reply_rules)&&settings.reply_rules.length)setRules(settings.reply_rules);}
  const {data:t}=await s.from("lead_tasks").select("id,lead_id,title,due_at").eq("status","pending").order("due_at").limit(30);setTasks(t||[]);
 }void load();},[mode]);
 async function save(){
  if(mode==="demo"){localStorage.setItem(KEY,JSON.stringify({rules,enabled}));setNotice("Rules saved for demo only; no WhatsApp messages sent.");return;}
  const s=createBrowserSupabaseClient();if(!s||!org){setNotice("Connect Supabase and sign in.");return;}
  const valid=rules.map(r=>({...r,keywords:r.keywords.filter(k=>k.trim().length>=2).slice(0,15),reply:r.reply.slice(0,2000)}));
  const {error}=await s.from("automation_settings").upsert({organization_id:org,auto_reply_enabled:enabled,reply_rules:valid});
  setNotice(error?error.message:"Settings saved. Sending additionally requires official WhatsApp Cloud API integration.");
 }
 async function done(id:string){const s=createBrowserSupabaseClient();if(!s)return;const {error}=await s.from("lead_tasks").update({status:"done"}).eq("id",id);if(error)setNotice(error.message);else setTasks(ts=>ts.filter(t=>t.id!==id));}
 return <><PageTitle title="Lead Intelligence & Auto Replies" subtitle="Analyze five lead-form answers and configure keyword-based WhatsApp responses."/>
 <div className="notice" style={{marginBottom:14}}>Auto-reply is OFF by default. In demo mode this page only previews reply text. Live messages require an official WhatsApp Cloud API connection and a recent inbound customer message. A 10-minute cooldown reduces repeated bot replies. A human must confirm purchases and handle escalation.</div>
 {notice&&<div className="notice" style={{marginBottom:14}}>{notice}</div>}
 <div className="grid-2"><div className="card"><div className="card-head"><h3>Test five lead-form answers</h3></div><div className="card-body form">
 {questions.map((x,i)=><label key={i}>{x}<input className="input" value={answers[x]||""} onChange={e=>setAnswers(a=>({...a,[x]:e.target.value}))} placeholder={"Answer "+(i+1)}/></label>)}
 <label>Customer message<textarea className="input" rows={3} value={message} onChange={e=>setMessage(e.target.value)}/></label></div></div>
 <div className="card"><div className="card-head"><h3>Lead analysis</h3><span className="connected">{q.priority} • {q.score}/100</span></div><div className="card-body" style={{display:"grid",gap:12}}>
 <p><strong>Intent:</strong> {q.intent}</p><p><strong>Suggested stage:</strong> {q.suggestedStatus}</p>
 <p><strong>Next action:</strong> {q.nextAction}</p><p><strong>Follow-up:</strong> {q.followUpHours? "Within "+q.followUpHours+" hours":"Do not contact"}</p>
 <p><strong>Why:</strong> {q.reasons.join(" • ")}</p>
 <p><strong>Reply draft:</strong> {matched?.reply||q.replyDraft||"No outreach — opt-out"}</p>
 <button className="btn" onClick={()=>{void navigator.clipboard.writeText(matched?.reply||q.replyDraft);setNotice("Draft copied. Send manually in WhatsApp.");}}>Copy reply draft</button>
 </div></div></div>
 <div className="card" style={{marginTop:14}}><div className="card-head"><h3>Official API auto-reply rules</h3><label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enabled</label></div><div className="card-body form">
 {rules.map((r,i)=><div className="card" style={{padding:12}} key={r.id}>
  <label>Trigger words (comma separated)<input className="input" value={r.keywords.join(", ")} onChange={e=>setRules(rs=>rs.map((x,j)=>j===i?{...x,keywords:e.target.value.split(",").map(w=>w.trim()).filter(Boolean)}:x))}/></label>
  <label>Auto reply<textarea className="input" rows={2} value={r.reply} onChange={e=>setRules(rs=>rs.map((x,j)=>j===i?{...x,reply:e.target.value}:x))}/></label>
  <label><input type="checkbox" checked={Boolean(r.handoff)} onChange={e=>setRules(rs=>rs.map((x,j)=>j===i?{...x,handoff:e.target.checked}:x))}/> Ask human agent to follow up</label>
 </div>)}
 <div><button className="btn" onClick={()=>setRules(xs=>[...xs,{id:"custom_"+Date.now(),keywords:[],reply:""}])}>Add rule</button> <button className="btn btn-primary" onClick={()=>void save()}>Save automation</button></div>
 <p className="small-note">Rules apply only to inbound WhatsApp messages while automatic replies are enabled. A Facebook form submission creates a lead and human follow-up task; it does not trigger unsolicited messages.</p>
 </div></div>
 <div className="card" style={{marginTop:14}}><div className="card-head"><h3>Next-action queue</h3><span className="small-note">{mode==="demo"?"Demo":"Live "+tasks.length+" pending"}</span></div><div className="card-body">
 {mode==="demo"?leads.slice(0,6).map(l=><div className="task" key={l.id}><div className="task-meta"><strong>{l.name}</strong><span>{qualifyLead(l.answers||{},"",l.name).nextAction}</span></div></div>):tasks.map(t=><div className="task" key={t.id}><div className="task-meta"><strong>{t.title}</strong><span>{t.due_at?new Date(t.due_at).toLocaleString("en-IN"):""}</span></div><button className="btn" onClick={()=>void done(t.id)}>Done</button></div>)}
 {mode==="live"&&!tasks.length&&<p>No pending actions.</p>}</div></div>
 </>;
}

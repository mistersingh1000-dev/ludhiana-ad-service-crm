"use client";
import PageTitle from "@/components/PageTitle";
import {useDemoCRM} from "@/components/DemoCRMProvider";
import {createBrowserSupabaseClient} from "@/lib/supabase-browser";
import Link from "next/link";
import {useEffect,useState} from "react";
type Task={id:string;lead_id:string;title:string;due_at:string|null;status:string};
export default function FollowUps(){
 const {leads,updateLead,mode}=useDemoCRM();
 const [tasks,setTasks]=useState<Task[]>([]),[notice,setNotice]=useState("");
 useEffect(()=>{if(mode!=="live")return;const s=createBrowserSupabaseClient();if(!s)return;
  void s.from("lead_tasks").select("id,lead_id,title,due_at,status").eq("status","pending").order("due_at").limit(200)
  .then(({data,error})=>{if(error)setNotice(error.message);else setTasks(data||[]);});
 },[mode]);
 const open=leads.filter(l=>l.status!=="Lost"&&l.status!=="Converted");
 const due=open.filter(l=>{const d=new Date(l.nextFollowUp);return !Number.isNaN(d.getTime())&&d.getTime()<=Date.now();});
 const overdue=tasks.filter(t=>t.due_at&&new Date(t.due_at).getTime()<=Date.now());
 async function complete(id:string){const s=createBrowserSupabaseClient();if(!s)return;
 const {error}=await s.from("lead_tasks").update({status:"done"}).eq("id",id);
 if(error)setNotice(error.message);else setTasks(xs=>xs.filter(t=>t.id!==id));}
 return <><PageTitle title="Follow-ups & Next Actions" subtitle="Callbacks, quotations and scheduled follow-ups for open leads."/>
 {notice&&<div className="notice">{notice}</div>}
 <div className="stats"><div className="stat"><div className="stat-label">Open leads</div><div className="stat-value">{open.length}</div></div><div className="stat"><div className="stat-label">Follow-ups due</div><div className="stat-value">{due.length}</div></div><div className="stat"><div className="stat-label">Pending tasks</div><div className="stat-value">{mode==="demo"?"Demo":tasks.length}</div></div></div>
 <div className="grid-2" style={{marginTop:14}}>
 <div className="card"><div className="card-head"><h3>Lead follow-up queue</h3></div><div className="card-body">{open.map(l=><div className="task" key={l.id}><div className="task-meta"><Link href={"/dashboard/leads/"+l.id}><strong>{l.name}</strong></Link><span>{l.nextFollowUp} • {l.owner} • {l.priority||"Unscored"}</span></div><button className="btn" onClick={()=>void updateLead(l.id,{status:"Contacted",nextFollowUp:"Completed"})}>Done</button></div>)}{!open.length&&<p>No open leads</p>}</div></div>
 <div className="card"><div className="card-head"><h3>Action tasks</h3><span className={overdue.length?"danger":"small-note"}>{overdue.length} overdue</span></div><div className="card-body">
 {mode==="demo"?open.slice(0,8).map(l=><div className="task" key={l.id}><div className="task-meta"><strong>{l.name}</strong><span>{l.suggestedAction||"Contact customer and clarify their need."}</span></div><Link className="btn" href={"/dashboard/leads/"+l.id}>Open</Link></div>):tasks.map(t=><div className="task" key={t.id}><div className="task-meta"><Link href={"/dashboard/leads/"+t.lead_id}><strong>{leads.find(l=>l.id===t.lead_id)?.name||"Lead"}</strong></Link><span>{t.title} • {t.due_at?new Date(t.due_at).toLocaleString("en-IN"):"Not set"}</span></div><button className="btn" onClick={()=>void complete(t.id)}>Done</button></div>)}
 {!open.length&&mode==="demo"&&<p>No pending actions.</p>}{!tasks.length&&mode==="live"&&<p>No pending actions.</p>}</div></div></div>
 <p className="small-note" style={{marginTop:12}}>In-app follow-ups are available. Automatic push/email reminder delivery requires a scheduled notification service.</p>
 </>;
}

"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useState} from "react";
import PageTitle from "@/components/PageTitle";
import {useDemoCRM} from "@/components/DemoCRMProvider";
import {qualifyLead} from "@/lib/lead-intelligence";
import {LeadStatus} from "@/lib/demo";
const stages:LeadStatus[]=["New","Contacted","Interested","Follow-up","Converted","Lost"];
const labels=["Required service / plan","Budget","When do you need it?","Call or WhatsApp?","Location / other requirements"];
export default function LeadDetails(){
 const {id}=useParams<{id:string}>();
 const {leads,updateLead,mode}=useDemoCRM();
 const lead=leads.find(x=>x.id===id);
 const [edited,setEdited]=useState<Record<string,string>|null>(null),[message,setMessage]=useState(""),[notice,setNotice]=useState(""),[schedule,setSchedule]=useState("");
 if(!lead)return <><PageTitle title="Lead details" subtitle="Open a customer from Lead Manager."/><Link href="/dashboard/leads">Back to leads</Link></>;
 const answers=edited||lead.answers||{};
 const existing=Object.entries(answers);
 const pairs=Array.from({length:5},(_,i)=>existing[i]||[labels[i],""]);
 const q=qualifyLead(answers,message,lead.name);
 function change(i:number,col:number,value:string){const next=pairs.map(([k,v])=>[k,v]);next[i][col]=value;setEdited(Object.fromEntries(next.filter(x=>x[0])));}
 const draft=q.replyDraft;
 const whatsapp="https://wa.me/"+lead.phone.replace(/\D/g,"")+"?text="+encodeURIComponent(draft);
 async function save(){await updateLead(lead!.id,{answers});setNotice("Answers saved. Recommendations recalculated.");}
 async function stage(value:LeadStatus){await updateLead(lead!.id,{status:value});setNotice("Stage updated.")}
 async function follow(){if(!schedule){setNotice("Select a follow-up time.");return;}await updateLead(lead!.id,{nextFollowUp:new Date(schedule).toISOString(),status:"Follow-up"});setNotice("Follow-up scheduled.");}
 return <><PageTitle title={lead.name} subtitle={lead.source+" • "+lead.campaign} action={<Link className="btn" href="/dashboard/leads">Back to Leads</Link>}/>
 {notice&&<div className="notice" style={{marginBottom:12}}>{notice}</div>}
 <div className="grid-2"><div className="card"><div className="card-head"><h3>Customer & stage</h3></div><div className="card-body form">
 <p><strong>Phone:</strong> {lead.phone} <strong>Owner:</strong> {lead.owner}</p>
 <label>Actual sales stage<select className="select" value={lead.status} onChange={e=>void stage(e.target.value as LeadStatus)}>{stages.map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Next follow-up<input className="input" type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)}/></label>
 <button className="btn" onClick={()=>void follow()}>Schedule Follow-up</button>
 <a className="btn" href={"tel:"+lead.phone.replace(/[^+\d]/g,"")}>Call Customer</a>
 <p className="small-note">Existing follow-up: {lead.nextFollowUp}. A bot cannot confirm a real purchase.</p></div></div>
 <div className="card"><div className="card-head"><h3>Suggested next step</h3><span className="connected">{q.priority} • {q.score}/100</span></div><div className="card-body form">
 <p><strong>Intent:</strong> {q.intent}</p><p><strong>Suggested stage:</strong> {q.suggestedStatus}</p>
 <p><strong>Action:</strong> {q.nextAction}</p><p><strong>Contact priority:</strong> {q.followUpHours? q.followUpHours+" hour(s)":"Do not contact"}</p>
 <p><strong>Signals:</strong> {q.reasons.join(" • ")}</p>
 <label>Customer message<textarea className="input" rows={3} placeholder="Paste customer's latest message" value={message} onChange={e=>setMessage(e.target.value)}/></label>
 <p><strong>Suggested reply:</strong> {draft||"Opt-out detected; no message."}</p>
 <button className="btn" disabled={!draft} onClick={()=>{void navigator.clipboard.writeText(draft);setNotice("Reply copied.");}}>Copy reply</button>
 {draft&&<a className="btn btn-primary" href={whatsapp} rel="noreferrer" target="_blank">Open WhatsApp with draft (manual send)</a>}
 </div></div></div>
 <div className="card" style={{marginTop:14}}><div className="card-head"><h3>Five lead-form questions & answers</h3></div><div className="card-body form">
 {pairs.map(([question,answer],i)=><div className="form-row" key={i}><label>Question {i+1}<input className="input" value={question} onChange={e=>change(i,0,e.target.value)}/></label><label>Answer {i+1}<input className="input" value={answer} onChange={e=>change(i,1,e.target.value)}/></label></div>)}
 <button className="btn btn-primary" onClick={()=>void save()}>Save answers & requalify</button><p className="small-note">{mode==="demo"?"Demo saves in this browser.":"Live mode saves to your own company workspace."} No WhatsApp message will be auto-sent just because you edited answers.</p>
 </div></div></>;
}

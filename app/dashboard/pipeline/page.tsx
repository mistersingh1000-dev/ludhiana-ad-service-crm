"use client";
import PageTitle from "@/components/PageTitle";
import { useDemoCRM } from "@/components/DemoCRMProvider";
import { LeadStatus } from "@/lib/demo";
import { useState } from "react";
const cols:LeadStatus[]=["New","Contacted","Interested","Follow-up","Converted"];
export default function Pipeline(){const {leads,updateLead}=useDemoCRM();const [dragging,setDragging]=useState<string|null>(null);return <><PageTitle title="Sales Pipeline" subtitle="Drag leads between stages to update their sales status."/><div className="kanban">{cols.map(c=>{const list=leads.filter(l=>l.status===c);return <div className="column" key={c} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragging!==null)updateLead(dragging,{status:c});setDragging(null)}}><div className="column-head"><span>{c}</span><span>{list.length}</span></div>{list.map(l=><div className="lead-card" draggable onDragStart={()=>setDragging(l.id)} onDragEnd={()=>setDragging(null)} key={l.id}><strong>{l.name}</strong><p>{l.campaign}<br/>{l.phone}</p><div className="lead-foot"><span>{l.owner}</span><span>{l.nextFollowUp}</span></div></div>)}</div>})}</div><p className="small-note" style={{marginTop:10}}>Lost leads stay available in Lead Manager and are intentionally hidden from the active pipeline.</p></>}

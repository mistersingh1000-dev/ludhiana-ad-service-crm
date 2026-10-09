"use client";
import PageTitle from "@/components/PageTitle";
import { useDemoCRM } from "@/components/DemoCRMProvider";
import { LeadStatus } from "@/lib/demo";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";

const statuses:LeadStatus[]=["New","Contacted","Interested","Follow-up","Converted","Lost"];

function parseCsvLine(line:string){
  const out:string[]=[];let value="";let quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'&&quoted&&line[i+1]==='"'){value+='"';i++;continue;}
    if(ch==='"'){quoted=!quoted;continue;}
    if(ch===','&&!quoted){out.push(value.trim());value="";continue;}
    value+=ch;
  }
  out.push(value.trim());return out;
}
function normalizeHeader(v:string){return v.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_');}

export default function LeadsPage(){
  const {leads,addLead,updateLead,resetDemo,mode,loading,error}=useDemoCRM();
  const [q,setQ]=useState("");const [filter,setFilter]=useState("All");const [adding,setAdding]=useState(false);const [notice,setNotice]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  const shown=useMemo(()=>leads.filter(l=>(filter==="All"||l.status===filter)&&(l.name+l.phone+l.campaign+l.source).toLowerCase().includes(q.toLowerCase())),[leads,q,filter]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const f=new FormData(e.currentTarget);
    const rawFollowup=String(f.get('followup')||'');
    const followup=rawFollowup?new Date(rawFollowup).toISOString():'Not scheduled';
    await addLead({name:String(f.get('name')),phone:String(f.get('phone')),source:String(f.get('source')),campaign:String(f.get('campaign')),owner:String(f.get('owner')||'Unassigned'),status:'New',nextFollowUp:followup,waiting:'Just now',value:Number(f.get('value')||0),createdAt:new Date().toISOString()});
    setAdding(false);setNotice(mode==='live'?'Lead saved to your CRM.':'Lead added to the demo CRM.');
  }
  function exportCsv(){
    const rows=[["Name","Phone","Source","Campaign","Owner","Status","Next Follow-up","Value"],...shown.map(l=>[l.name,l.phone,l.source,l.campaign,l.owner,l.status,l.nextFollowUp,String(l.value)])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ludhiana-ad-service-crm-leads.csv';a.click();URL.revokeObjectURL(url);
  }
  async function importCsv(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return;
    try{
      const text=await file.text();const lines=text.split(/\r?\n/).filter(Boolean);if(lines.length<2)throw new Error('CSV has no lead rows.');
      const headers=parseCsvLine(lines[0]).map(normalizeHeader);let count=0;
      for(const line of lines.slice(1)){
        const values=parseCsvLine(line);const row=Object.fromEntries(headers.map((h,i)=>[h,values[i]||'']));
        const name=row.name||row.lead_name||row.customer_name;if(!name)continue;
        const status=(statuses.find(s=>s.toLowerCase()===String(row.status||'New').toLowerCase())||'New') as LeadStatus;
        await addLead({name,phone:row.phone||row.mobile||row.whatsapp||'',source:row.source||'CSV Import',campaign:row.campaign||row.ad||'Imported Leads',owner:row.owner||'Unassigned',status,nextFollowUp:row.next_follow_up||row.follow_up||row.followup||'Not scheduled',waiting:'Just now',value:Number(row.value||row.pipeline_value||0)||0,createdAt:new Date().toISOString()});count++;
      }
      setNotice(`${count} lead${count===1?'':'s'} imported from CSV.`);
    }catch(err){setNotice(err instanceof Error?err.message:'CSV import failed.');}
    finally{e.target.value='';}
  }

  return <><PageTitle title="Lead Manager" subtitle="All enquiries from your ads and other channels in one place." action={<button className="btn btn-primary" onClick={()=>setAdding(v=>!v)}>+ Add Lead</button>}/>
  {error&&<div className="notice danger" style={{marginBottom:12}}>{error}</div>}
  {notice&&<div className="notice" style={{marginBottom:12}}>{notice}</div>}
  {loading&&<div className="notice" style={{marginBottom:12}}>Loading CRM leads…</div>}
  {adding&&<form className="card card-body lead-form" onSubmit={submit} style={{marginBottom:14}}><div className="form-row"><label>Lead name<input name="name" className="input" required placeholder="Customer name"/></label><label>Phone / WhatsApp<input name="phone" className="input" required placeholder="+91 98…"/></label></div><div className="form-row"><label>Source<select name="source" className="select"><option>Facebook Lead Ad</option><option>Instagram</option><option>WhatsApp</option><option>Website Form</option><option>Manual</option></select></label><label>Campaign<input name="campaign" className="input" required placeholder="Campaign / offer name"/></label></div><div className="form-row"><label>Owner<input name="owner" className="input" placeholder="Aman"/></label><label>Pipeline value<input name="value" type="number" min="0" className="input" placeholder="0"/></label></div><label>Next follow-up<input name="followup" type="datetime-local" className="input"/></label><div><button className="btn btn-primary">Save Lead</button> <button type="button" className="btn" onClick={()=>setAdding(false)}>Cancel</button></div></form>}
  <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importCsv}/>
  <div className="toolbar"><input className="input" placeholder="Search lead, phone or campaign…" value={q} onChange={e=>setQ(e.target.value)}/><select className="select" value={filter} onChange={e=>setFilter(e.target.value)}>{["All",...statuses].map(x=><option key={x}>{x}</option>)}</select><button className="btn" onClick={()=>fileRef.current?.click()}>Import CSV</button><button className="btn" onClick={exportCsv}>Export CSV</button>{mode==='demo'&&<button className="btn" onClick={()=>{resetDemo();setNotice('Demo data restored.')}}>Reset Demo</button>}<span className={mode==='live'?'connected':'small-note'}>{mode==='live'?'Live database':'Demo browser data'}</span></div>
  <div className="table-wrap"><table><thead><tr><th>Lead</th><th>Source / Campaign</th><th>Owner</th><th>Status</th><th>Next follow-up</th><th>Waiting</th><th>WhatsApp</th></tr></thead><tbody>{shown.map(l=><tr key={l.id}><td><strong>{l.name}</strong><br/><span className="small-note">{l.phone}</span></td><td>{l.source}<br/><span className="small-note">{l.campaign}</span></td><td>{l.owner}</td><td><select className="select" style={{padding:'6px 8px'}} value={l.status} onChange={e=>void updateLead(l.id,{status:e.target.value as LeadStatus})}>{statuses.map(x=><option key={x}>{x}</option>)}</select></td><td>{l.nextFollowUp}</td><td className={l.waiting.includes('hr')?'danger':''}>{l.waiting}</td><td><a className="btn" style={{padding:'7px 9px'}} target="_blank" rel="noreferrer" href={`https://wa.me/${l.phone.replace(/\D/g,'')}`}>Message</a></td></tr>)}</tbody></table>{!loading&&shown.length===0&&<div className="empty-state">No leads match this filter.</div>}</div></>;
}

"use client";
import PageTitle from "@/components/PageTitle";
import { useState } from "react";
const plans=[
  {name:'Ads Client Free',price:'₹0',desc:'Included while using our advertising service.',features:['2 users','Lead pipeline','Reminders & notes','Basic reports','WhatsApp quick open']},
  {name:'Growth',price:'₹999',desc:'For growing sales teams that need WhatsApp workflows.',features:['5 users','Official WhatsApp inbox','Auto assignment','Silence alerts','Campaign reports']},
  {name:'Pro',price:'₹1,999',desc:'For larger teams with automation and advanced controls.',features:['10 users','Advanced automation','Multiple pipelines','Priority support','API/webhook access']},
];
export default function Billing(){const [selected,setSelected]=useState('Ads Client Free');return <><PageTitle title="Plan & Billing" subtitle="Start free, then upgrade only when your business needs more automation."/><div className="notice" style={{marginBottom:14}}>Current demo plan: <strong>{selected}</strong>. Payment checkout will activate when the payment gateway is connected.</div><div className="pricing dashboard-pricing">{plans.map(p=><div className={`price ${selected===p.name?'popular':''}`} key={p.name}><h3>{p.name}</h3><div className="amount">{p.price}<small> / month</small></div><p className="small-note">{p.desc}</p><ul className="checks">{p.features.map(f=><li key={f}>{f}</li>)}</ul><button className={`btn ${p.name==='Growth'?'btn-primary':''}`} onClick={()=>setSelected(p.name)}>{selected===p.name?'Current / Selected':'Choose Plan'}</button></div>)}</div></>}

"use client";

import PageTitle from "@/components/PageTitle";
import { useDemoCRM } from "@/components/DemoCRMProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ChatMessage = { id?: string; body: string; direction: "inbound" | "outbound"; status?: string };

export default function Inbox() {
  const { leads, mode } = useDemoCRM();
  const [active, setActive] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { body: "Hi, I saw your Facebook ad. Please share details.", direction: "inbound" },
    { body: "Hello 👋 Thank you for your enquiry. How can we help you today?", direction: "outbound" },
  ]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState(mode === "live" ? "WhatsApp live inbox" : "Demo inbox");
  const lead = leads[active] || leads[0];

  const loadMessages = useCallback(async () => {
    if (mode !== "live" || !lead) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const { data: conversation } = await supabase.from("conversations").select("id").eq("lead_id", lead.id).eq("channel", "whatsapp").order("last_message_at", { ascending: false }).limit(1).maybeSingle();
    if (!conversation?.id) { setMessages([]); return; }
    const { data } = await supabase.from("messages").select("id,body,direction,status").eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(200);
    setMessages((data || []).map((m:any)=>({ id:m.id, body:m.body || "", direction:m.direction, status:m.status })));
  }, [mode, lead?.id]);

  useEffect(() => {
    if (mode === "demo") {
      if (lead) setMessages([
        { body: `Hi, I am ${lead.name}. I saw your ad and want details.`, direction: "inbound" },
        { body: `Hello ${lead.name.split(" ")[0]} 👋 Thank you for your enquiry.`, direction: "outbound" },
      ]);
      return;
    }
    void loadMessages();
    const timer = window.setInterval(()=>void loadMessages(), 8000);
    return () => window.clearInterval(timer);
  }, [active, mode, loadMessages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !lead) return;
    setDraft("");
    if (mode === "demo") {
      setMessages(m => [...m, { body:text, direction:"outbound", status:"demo" }]);
      setStatus("Demo message saved");
      return;
    }
    setStatus("Sending…");
    const r = await fetch("/api/whatsapp/send", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ leadId:lead.id, to:lead.phone, text }) });
    const data = await r.json().catch(()=>({}));
    if (!r.ok) { setStatus(data.error || "Send failed"); return; }
    setStatus("Sent via WhatsApp");
    await loadMessages();
  }

  return <>
    <PageTitle title="WhatsApp Inbox" subtitle="Shared customer conversations using the official WhatsApp Business Platform." action={<span className="connected">{status}</span>}/>
    <div className="card inbox">
      <div className="chat-list">{leads.slice(0,20).map((l,i)=><button type="button" className={`chat-item chat-button ${i===active?'active':''}`} key={l.id} onClick={()=>setActive(i)}><span className="avatar">{l.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span><div className="chat-meta"><strong>{l.name}</strong><p>{l.campaign}</p></div><span className="small-note">{l.status}</span></button>)}</div>
      <div className="chat-window"><div className="card-head"><div><h3>{lead?.name||'No lead'}</h3><span className="small-note">{lead?.campaign} • Owner: {lead?.owner}</span></div>{lead&&<span className="status interested">{lead.status}</span>}</div>
        <div className="messages">{messages.length ? messages.map((m,i)=><div className={`bubble ${m.direction==='outbound'?'me':''}`} key={m.id||i}>{m.body}{m.status&&mode==='live'&&<span className="message-status">{m.status}</span>}</div>) : <div className="empty-state">No WhatsApp messages saved for this lead yet.</div>}</div>
        <form className="composer" onSubmit={send}><input className="input" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Type a WhatsApp message…" disabled={!lead}/><button className="btn btn-primary" disabled={!lead}>Send</button></form>
      </div>
    </div>
    <p className="small-note" style={{marginTop:10}}>Free-form WhatsApp replies are subject to Meta&apos;s customer-service messaging window. Outside that window, use approved WhatsApp templates in Meta.</p>
  </>;
}

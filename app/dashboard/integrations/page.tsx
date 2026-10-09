"use client";

import PageTitle from "@/components/PageTitle";
import { useDemoCRM } from "@/components/DemoCRMProvider";
import { Facebook, MessageCircleMore, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type StatusMap = Record<string, { connected?: boolean; active?: boolean; config?: Record<string,string> }>;

export default function Integrations() {
  const { mode } = useDemoCRM();
  const [status, setStatus] = useState<StatusMap>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(mode === "live");
  const [origin, setOrigin] = useState("");

  async function load() {
    if (mode !== "live") return;
    setLoading(true);
    const r = await fetch("/api/integrations/settings", { cache: "no-store" });
    const data = await r.json().catch(() => ({}));
    if (r.ok) setStatus(data.integrations || {}); else setNotice(data.error || "Could not load integrations.");
    setLoading(false);
  }

  useEffect(() => { setOrigin(window.location.origin); void load(); }, [mode]);

  async function save(e: FormEvent<HTMLFormElement>, provider: "meta" | "whatsapp") {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (mode === "demo") {
      setStatus(s => ({ ...s, [provider]: { connected: true, active: true, config: Object.fromEntries(form.entries()) as any } }));
      setNotice("Demo connection saved locally for preview. Real credentials are only stored server-side in live mode.");
      return;
    }
    const payload: Record<string,string> = { provider };
    form.forEach((v,k) => payload[k] = String(v));
    const r = await fetch("/api/integrations/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await r.json().catch(() => ({}));
    setNotice(r.ok ? `${provider === "meta" ? "Meta Lead Ads" : "WhatsApp Business"} connected successfully.` : (data.error || "Connection failed."));
    if (r.ok) await load();
  }

  async function disconnect(provider: "meta" | "whatsapp") {
    if (mode === "demo") { setStatus(s => ({ ...s, [provider]: { connected: false, active: false, config: {} } })); setNotice("Demo integration disconnected."); return; }
    const r = await fetch(`/api/integrations/settings?provider=${provider}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    setNotice(r.ok ? "Integration disconnected." : (data.error || "Disconnect failed."));
    if (r.ok) await load();
  }

  const meta = status.meta || {};
  const whatsapp = status.whatsapp || {};
  return <>
    <PageTitle title="Integrations" subtitle="Connect Meta Lead Ads and the official WhatsApp Business Platform for each CRM company."/>
    {loading && <div className="notice" style={{marginBottom:12}}>Loading integration status…</div>}
    {notice && <div className="notice" style={{marginBottom:12}}>{notice}</div>}

    <div className="grid-2">
      <form className="card" onSubmit={e=>void save(e,"meta")}>
        <div className="card-head"><div><Facebook size={24}/><h3>Meta Lead Ads</h3></div><span className={meta.connected ? "connected" : "small-note"}>{meta.connected ? "Connected" : "Not connected"}</span></div>
        <div className="card-body form">
          <p className="small-note">Connect the Facebook Page that receives Instant Form leads. The access token is encrypted on the server and is never returned to the browser.</p>
          <label>Facebook Page ID<input className="input" name="pageId" required defaultValue={meta.config?.page_id || ""} placeholder="1234567890"/></label>
          <label>Page / system-user access token<input className="input" name="accessToken" type="password" placeholder={meta.connected ? "Leave blank to keep existing token" : "Paste token"} autoComplete="off"/></label>
          <div><button className="btn btn-primary">Save Meta Connection</button>{meta.active && <button type="button" className="btn" style={{marginLeft:8}} onClick={()=>void disconnect("meta")}>Disconnect</button>}</div>
          <div className="small-note">Webhook: <code>{origin || "https://YOUR-DOMAIN"}/api/meta/webhook</code></div>
        </div>
      </form>

      <form className="card" onSubmit={e=>void save(e,"whatsapp")}>
        <div className="card-head"><div><MessageCircleMore size={24}/><h3>WhatsApp Business</h3></div><span className={whatsapp.connected ? "connected" : "small-note"}>{whatsapp.connected ? "Connected" : "Not connected"}</span></div>
        <div className="card-body form">
          <p className="small-note">Use Meta WhatsApp Cloud API. Incoming messages are saved into the shared CRM inbox and outbound replies are stored with the customer conversation.</p>
          <label>Phone Number ID<input className="input" name="phoneNumberId" required defaultValue={whatsapp.config?.phone_number_id || ""} placeholder="1234567890"/></label>
          <label>WhatsApp Business Account ID<input className="input" name="businessAccountId" defaultValue={whatsapp.config?.business_account_id || ""} placeholder="Optional WABA ID"/></label>
          <label>Permanent system-user access token<input className="input" name="accessToken" type="password" placeholder={whatsapp.connected ? "Leave blank to keep existing token" : "Paste token"} autoComplete="off"/></label>
          <div><button className="btn btn-primary">Save WhatsApp Connection</button>{whatsapp.active && <button type="button" className="btn" style={{marginLeft:8}} onClick={()=>void disconnect("whatsapp")}>Disconnect</button>}</div>
          <div className="small-note">Webhook: <code>{origin || "https://YOUR-DOMAIN"}/api/whatsapp/webhook</code></div>
        </div>
      </form>
    </div>

    <div className="notice" style={{marginTop:14}}><ShieldCheck size={16} style={{verticalAlign:'middle',marginRight:6}}/>Provider tokens are stored in a server-only table using AES-256-GCM encryption. Configure <code>INTEGRATION_ENCRYPTION_KEY</code>, <code>META_APP_SECRET</code> and <code>META_VERIFY_TOKEN</code> in Vercel before connecting real accounts.</div>
  </>;
}

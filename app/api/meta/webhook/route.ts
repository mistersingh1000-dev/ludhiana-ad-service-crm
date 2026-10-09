import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { verifyMetaSignature } from "@/lib/meta-signature";
import { findProviderIntegrationByConfig, normalizePhone } from "@/lib/integrations";

function fieldMap(fieldData: any[]) {
  const out: Record<string, string> = {};
  for (const field of fieldData || []) {
    const name = String(field?.name || "").toLowerCase();
    const value = Array.isArray(field?.values) ? String(field.values[0] || "") : "";
    if (name) out[name] = value;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) return new NextResponse(challenge ?? "", { status: 200 });
  return new NextResponse("Verification failed", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const service = createServiceClient();
  if (!service) return NextResponse.json({ received: true, stored: false });

  const version = process.env.META_GRAPH_API_VERSION || "v24.0";
  for (const entry of body.entry ?? []) {
    const pageId = String(entry?.id || "");
    for (const change of entry.changes ?? []) {
      const value = change?.value ?? {};
      const leadId = String(value?.leadgen_id || "");
      if (change?.field !== "leadgen" || !leadId) continue;

      const integration = pageId ? await findProviderIntegrationByConfig(service, "meta", "page_id", pageId) : null;
      const organizationId = integration?.organization_id || null;
      const { data: event } = await service.from("integration_events").upsert({
        organization_id: organizationId,
        provider: "meta",
        event_type: "leadgen",
        external_id: leadId,
        payload: value,
      }, { onConflict: "provider,external_id" }).select("id").maybeSingle();

      const token = integration?.accessToken || process.env.META_LEAD_ACCESS_TOKEN || "";
      if (!organizationId || !token) continue;

      try {
        const fields = ["id", "created_time", "ad_id", "ad_name", "adset_id", "adset_name", "campaign_id", "campaign_name", "form_id", "field_data"].join(",");
        const graphResponse = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(leadId)}?fields=${encodeURIComponent(fields)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!graphResponse.ok) continue;
        const lead = await graphResponse.json();
        const values = fieldMap(lead?.field_data || []);
        const fullName = values.full_name || values.name || [values.first_name, values.last_name].filter(Boolean).join(" ") || "Meta Lead";
        const phone = values.phone_number || values.phone || values.mobile_number || values.mobile || "";
        const email = values.email || "";

        const { error: leadError } = await service.from("leads").upsert({
          organization_id: organizationId,
          name: fullName,
          phone,
          phone_normalized: normalizePhone(phone),
          email,
          source: "Facebook Lead Ad",
          campaign: lead?.campaign_name || value?.campaign_id || "Meta Lead Ads",
          adset: lead?.adset_name || value?.adgroup_id || "",
          ad_name: lead?.ad_name || value?.ad_id || "",
          status: "new",
          meta_lead_id: leadId,
        }, { onConflict: "meta_lead_id" });
        if (!leadError && event?.id) {
          await service.from("integration_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
        }
      } catch {
        // Keep the event unprocessed so an operator can inspect/replay it later.
      }
    }
  }

  return NextResponse.json({ received: true });
}

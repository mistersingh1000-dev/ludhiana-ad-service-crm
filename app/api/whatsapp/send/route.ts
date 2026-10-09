import { NextRequest, NextResponse } from "next/server";
import { createServerAuthClient } from "@/lib/supabase-server-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { getProviderIntegration, normalizePhone } from "@/lib/integrations";

export async function POST(req: NextRequest) {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  if (demoMode) return NextResponse.json({ error: "WhatsApp sending is disabled on the public demo." }, { status: 503 });

  const auth = await createServerAuthClient();
  const service = createServiceClient();
  if (!auth || !service) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  const { data: claimsData } = await auth.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await auth.from("profiles").select("organization_id").eq("id", userId).maybeSingle();
  const organizationId = profile?.organization_id;
  if (!organizationId) return NextResponse.json({ error: "CRM workspace not found." }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const to = normalizePhone(body?.to || "");
  const text = String(body?.text ?? "").trim();
  const requestedLeadId = String(body?.leadId || "").trim();
  if (!/^\d{8,15}$/.test(to)) return NextResponse.json({ error: "A valid international phone number is required." }, { status: 400 });
  if (!text || text.length > 4096) return NextResponse.json({ error: "Message must contain 1 to 4096 characters." }, { status: 400 });

  const integration = await getProviderIntegration(service, organizationId, "whatsapp");
  const token = integration?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneId = String(integration?.config?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || "");
  const version = process.env.META_GRAPH_API_VERSION || "v24.0";
  if (!token || !phoneId) return NextResponse.json({ error: "WhatsApp is not connected for this CRM workspace." }, { status: 503 });

  let leadId = "";
  if (requestedLeadId) {
    const { data: lead } = await service.from("leads").select("id").eq("id", requestedLeadId).eq("organization_id", organizationId).maybeSingle();
    leadId = lead?.id || "";
  }
  if (!leadId) {
    const { data: lead } = await service.from("leads").select("id").eq("organization_id", organizationId).eq("phone_normalized", to).order("created_at", { ascending: false }).limit(1).maybeSingle();
    leadId = lead?.id || "";
  }

  const graphResponse = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: text } }),
  });
  const result = await graphResponse.json().catch(() => ({}));
  if (!graphResponse.ok) return NextResponse.json({ error: result?.error?.message || "WhatsApp send failed.", provider: result }, { status: graphResponse.status });

  const providerMessageId = String(result?.messages?.[0]?.id || "");
  let { data: conversation } = await service.from("conversations").select("id").eq("organization_id", organizationId).eq("channel", "whatsapp").eq("external_contact_id", to).maybeSingle();
  if (!conversation) {
    const created = await service.from("conversations").insert({ organization_id: organizationId, lead_id: leadId || null, channel: "whatsapp", external_contact_id: to, last_message_at: new Date().toISOString() }).select("id").single();
    conversation = created.data;
  } else {
    await service.from("conversations").update({ lead_id: leadId || null, last_message_at: new Date().toISOString() }).eq("id", conversation.id);
  }
  if (conversation?.id) {
    await service.from("messages").insert({ organization_id: organizationId, conversation_id: conversation.id, direction: "outbound", body: text, provider_message_id: providerMessageId || null, status: "sent" });
  }

  return NextResponse.json({ ok: true, messageId: providerMessageId || null });
}

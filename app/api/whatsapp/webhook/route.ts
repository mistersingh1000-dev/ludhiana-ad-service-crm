import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { verifyMetaSignature } from "@/lib/meta-signature";
import { findProviderIntegrationByConfig, normalizePhone } from "@/lib/integrations";

function messageText(message: any) {
  if (message?.type === "text") return String(message?.text?.body || "");
  if (message?.type === "button") return String(message?.button?.text || "");
  if (message?.type === "interactive") return String(message?.interactive?.button_reply?.title || message?.interactive?.list_reply?.title || "Interactive reply");
  if (message?.type === "image") return String(message?.image?.caption || "[Image]");
  if (message?.type === "document") return String(message?.document?.caption || message?.document?.filename || "[Document]");
  if (message?.type === "audio") return "[Audio]";
  if (message?.type === "video") return String(message?.video?.caption || "[Video]");
  return `[${String(message?.type || "message")}]`;
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

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change?.value ?? {};
      const phoneNumberId = String(value?.metadata?.phone_number_id || "");
      if (!phoneNumberId) continue;
      const integration = await findProviderIntegrationByConfig(service, "whatsapp", "phone_number_id", phoneNumberId);
      const organizationId = integration?.organization_id;
      if (!organizationId) continue;

      for (const status of value?.statuses ?? []) {
        const providerMessageId = String(status?.id || "");
        const state = String(status?.status || "");
        if (providerMessageId && state) {
          await service.from("messages").update({ status: state }).eq("provider_message_id", providerMessageId);
          await service.from("integration_events").upsert({
            organization_id: organizationId,
            provider: "whatsapp",
            event_type: "message_status",
            external_id: `${providerMessageId}:${state}`,
            payload: status,
            processed_at: new Date().toISOString(),
          }, { onConflict: "provider,external_id" });
        }
      }

      for (const message of value?.messages ?? []) {
        const providerMessageId = String(message?.id || "");
        const from = normalizePhone(message?.from || "");
        if (!providerMessageId || !from) continue;
        const contactName = String(value?.contacts?.[0]?.profile?.name || `WhatsApp ${from.slice(-4)}`);

        const { data: existingLead } = await service.from("leads")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("phone_normalized", from)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let leadId = existingLead?.id as string | undefined;
        if (!leadId) {
          const { data: createdLead } = await service.from("leads").insert({
            organization_id: organizationId,
            name: contactName,
            phone: `+${from}`,
            phone_normalized: from,
            source: "WhatsApp",
            campaign: "WhatsApp Inbound",
            status: "new",
          }).select("id").single();
          leadId = createdLead?.id;
        }

        let { data: conversation } = await service.from("conversations")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("channel", "whatsapp")
          .eq("external_contact_id", from)
          .maybeSingle();
        if (!conversation) {
          const created = await service.from("conversations").insert({
            organization_id: organizationId,
            lead_id: leadId || null,
            channel: "whatsapp",
            external_contact_id: from,
            last_message_at: new Date().toISOString(),
          }).select("id").single();
          conversation = created.data;
        } else {
          await service.from("conversations").update({ lead_id: leadId || null, last_message_at: new Date().toISOString() }).eq("id", conversation.id);
        }

        if (conversation?.id) {
          await service.from("messages").upsert({
            organization_id: organizationId,
            conversation_id: conversation.id,
            direction: "inbound",
            body: messageText(message),
            provider_message_id: providerMessageId,
            status: "received",
          }, { onConflict: "provider_message_id", ignoreDuplicates: true });
        }

        await service.from("integration_events").upsert({
          organization_id: organizationId,
          provider: "whatsapp",
          event_type: "message",
          external_id: providerMessageId,
          payload: message,
          processed_at: new Date().toISOString(),
        }, { onConflict: "provider,external_id" });
      }
    }
  }

  return NextResponse.json({ received: true });
}

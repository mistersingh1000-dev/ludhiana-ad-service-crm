import { NextRequest, NextResponse } from "next/server";
import { getTeamManagerContext } from "@/lib/admin-auth";
import { canEncryptIntegrationSecrets, encryptIntegrationSecret } from "@/lib/integration-crypto";

const allowedProviders = new Set(["meta", "whatsapp"]);

export async function GET() {
  const ctx = await getTeamManagerContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: integrations, error } = await ctx.service
    .from("integrations")
    .select("provider,config,is_active")
    .eq("organization_id", ctx.organizationId)
    .in("provider", ["meta", "whatsapp"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: secretRows } = await ctx.service
    .from("integration_secrets")
    .select("provider")
    .eq("organization_id", ctx.organizationId);
  const secretProviders = new Set((secretRows || []).map((row: any) => row.provider));

  const result: Record<string, any> = {};
  for (const row of integrations || []) {
    result[row.provider] = {
      connected: Boolean(row.is_active && secretProviders.has(row.provider)),
      active: Boolean(row.is_active),
      config: row.config || {},
    };
  }
  return NextResponse.json({ integrations: result, encryptionReady: canEncryptIntegrationSecrets() });
}

export async function POST(req: NextRequest) {
  const ctx = await getTeamManagerContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canEncryptIntegrationSecrets()) {
    return NextResponse.json({ error: "Server encryption is not configured. Add INTEGRATION_ENCRYPTION_KEY in Vercel first." }, { status: 503 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const provider = String(body.provider || "").toLowerCase();
  if (!allowedProviders.has(provider)) return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });

  const accessToken = String(body.accessToken || "").trim();
  const { data: existingSecret } = await ctx.service
    .from("integration_secrets")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("provider", provider)
    .maybeSingle();
  if (!accessToken && !existingSecret) return NextResponse.json({ error: "Access token is required for the first connection." }, { status: 400 });

  let config: Record<string, string>;
  if (provider === "meta") {
    const pageId = String(body.pageId || "").trim();
    if (!/^\d+$/.test(pageId)) return NextResponse.json({ error: "A valid Meta Page ID is required." }, { status: 400 });
    config = { page_id: pageId };
  } else {
    const phoneNumberId = String(body.phoneNumberId || "").trim();
    const businessAccountId = String(body.businessAccountId || "").trim();
    if (!/^\d+$/.test(phoneNumberId)) return NextResponse.json({ error: "A valid WhatsApp Phone Number ID is required." }, { status: 400 });
    config = { phone_number_id: phoneNumberId, business_account_id: businessAccountId };
  }

  const { error: integrationError } = await ctx.service.from("integrations").upsert({
    organization_id: ctx.organizationId,
    provider,
    config,
    is_active: true,
  }, { onConflict: "organization_id,provider" });
  if (integrationError) return NextResponse.json({ error: integrationError.message }, { status: 500 });

  if (accessToken) {
    const encrypted = encryptIntegrationSecret(accessToken);
    const { error: secretError } = await ctx.service.from("integration_secrets").upsert({
      organization_id: ctx.organizationId,
      provider,
      access_token_encrypted: encrypted,
    }, { onConflict: "organization_id,provider" });
    if (secretError) return NextResponse.json({ error: secretError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getTeamManagerContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const provider = String(req.nextUrl.searchParams.get("provider") || "").toLowerCase();
  if (!allowedProviders.has(provider)) return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  await ctx.service.from("integration_secrets").delete().eq("organization_id", ctx.organizationId).eq("provider", provider);
  const { error } = await ctx.service.from("integrations").update({ is_active: false }).eq("organization_id", ctx.organizationId).eq("provider", provider);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

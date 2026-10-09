import { decryptIntegrationSecret } from "@/lib/integration-crypto";

type ServiceClient = any;

export async function getProviderIntegration(service: ServiceClient, organizationId: string, provider: "meta" | "whatsapp") {
  const { data: integration } = await service
    .from("integrations")
    .select("organization_id,provider,config,is_active")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .eq("is_active", true)
    .maybeSingle();
  if (!integration) return null;

  const { data: secretRow } = await service
    .from("integration_secrets")
    .select("access_token_encrypted")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();

  return { ...integration, accessToken: decryptIntegrationSecret(secretRow?.access_token_encrypted) };
}

export async function findProviderIntegrationByConfig(
  service: ServiceClient,
  provider: "meta" | "whatsapp",
  key: string,
  value: string,
) {
  const { data } = await service
    .from("integrations")
    .select("organization_id,provider,config,is_active")
    .eq("provider", provider)
    .eq("is_active", true);

  const integration = (data || []).find((row: any) => String(row?.config?.[key] || "") === String(value));
  if (!integration) return null;
  const { data: secretRow } = await service
    .from("integration_secrets")
    .select("access_token_encrypted")
    .eq("organization_id", integration.organization_id)
    .eq("provider", provider)
    .maybeSingle();

  return { ...integration, accessToken: decryptIntegrationSecret(secretRow?.access_token_encrypted) };
}

export function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "");
}

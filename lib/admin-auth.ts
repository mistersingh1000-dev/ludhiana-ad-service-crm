import { createServerAuthClient } from "@/lib/supabase-server-auth";
import { createServiceClient } from "@/lib/supabase-server";

export async function getSuperAdminContext() {
  const auth = await createServerAuthClient();
  if (!auth) return null;
  const { data: claimsData } = await auth.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  const email = String(claimsData?.claims?.email || "").toLowerCase();
  if (!userId) return null;
  const { data: profile } = await auth.from("profiles").select("role").eq("id", userId).maybeSingle();
  const configured = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
  if (profile?.role !== "super_admin" && !configured.includes(email)) return null;
  const service = createServiceClient();
  if (!service) return null;
  return { auth, service, userId, email };
}

export async function getTeamManagerContext() {
  const auth = await createServerAuthClient();
  if (!auth) return null;
  const { data: claimsData } = await auth.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await auth.from("profiles").select("organization_id,role").eq("id", userId).maybeSingle();
  if (!profile?.organization_id || !["owner","manager","super_admin"].includes(profile.role)) return null;
  const service = createServiceClient();
  if (!service) return null;
  return { auth, service, userId, organizationId: profile.organization_id, role: profile.role };
}

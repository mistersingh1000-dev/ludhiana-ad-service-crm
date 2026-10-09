import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase-server-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  if (demoMode) return children;

  const supabase = await createServerAuthClient();
  if (!supabase) redirect("/login");

  const { data: claimsData } = await supabase.auth.getClaims();
  const subject = claimsData?.claims?.sub;
  const email = String(claimsData?.claims?.email || "").toLowerCase();
  if (!subject) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", subject).maybeSingle();
  const configuredAdmins = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
  const isAdmin = profile?.role === "super_admin" || configuredAdmins.includes(email);
  if (!isAdmin) redirect("/dashboard");

  return children;
}

"use client";

import Link from "next/link";
import { Bell, LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function UserActions() {
  const router = useRouter();
  async function logout() {
    const supabase = createBrowserSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  return <div className="top-actions">
    <Link className="circle-btn circle-link" href="/dashboard/leads" aria-label="Search leads"><Search size={16}/></Link>
    <Link className="circle-btn circle-link" href="/dashboard/follow-ups" aria-label="Follow-up notifications"><Bell size={16}/></Link>
    <span className="avatar">LAS</span>
    <button className="circle-btn" aria-label="Logout" title="Logout" onClick={logout}><LogOut size={16}/></button>
  </div>;
}

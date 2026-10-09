"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BellRing, CircleDollarSign, ContactRound, Gauge, Inbox, KanbanSquare, PlugZap, Settings, ShieldCheck, UsersRound } from "lucide-react";
import { BRAND } from "@/lib/brand";

const items = [
  ["/dashboard", "Dashboard", Gauge],
  ["/dashboard/leads", "Leads", ContactRound],
  ["/dashboard/pipeline", "Pipeline", KanbanSquare],
  ["/dashboard/follow-ups", "Follow-ups", BellRing],
  ["/dashboard/inbox", "WhatsApp Inbox", Inbox],
  ["/dashboard/team", "Team", UsersRound],
  ["/dashboard/reports", "Reports", BarChart3],
  ["/dashboard/integrations", "Integrations", PlugZap],
  ["/dashboard/billing", "Plan & Billing", CircleDollarSign],
  ["/dashboard/settings", "Settings", Settings],
  ["/admin", "Super Admin", ShieldCheck],
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  return (
    <aside className="sidebar">
      <div className="side-brand"><span className="logo">L</span> {BRAND.name}</div>
      <nav className="menu">
        {items.map(([href, label, Icon]) => {
          const active = pathname === href;
          return <Link key={href} href={href} className={active ? "active" : ""}><Icon size={15} style={{marginRight:9,verticalAlign:-3}}/>{label}</Link>;
        })}
      </nav>
      <div className="side-bottom"><div className="user-chip"><strong>{demoMode?"Demo Business":"CRM Workspace"}</strong><span>{demoMode?"Free Ads Client Plan":"Ludhiana Ad Service CRM"}</span></div></div>
    </aside>
  );
}

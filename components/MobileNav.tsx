"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, ContactRound, Gauge, Inbox, Settings } from "lucide-react";
const items=[["/dashboard","Home",Gauge],["/dashboard/leads","Leads",ContactRound],["/dashboard/follow-ups","Follow",BellRing],["/dashboard/inbox","Inbox",Inbox],["/dashboard/settings","Settings",Settings]] as const;
export default function MobileNav(){const path=usePathname();return <nav className="mobile-nav">{items.map(([href,label,Icon])=><Link key={href} href={href} className={path===href?'active':''}><Icon size={17}/><span>{label}</span></Link>)}</nav>}

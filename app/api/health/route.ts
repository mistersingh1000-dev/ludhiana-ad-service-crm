import { NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";
export function GET(){
  const demoMode=process.env.NEXT_PUBLIC_DEMO_MODE!=="false";
  const supabase=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return NextResponse.json({ok:true,service:BRAND.name,time:new Date().toISOString(),mode:demoMode?"demo":"live",database:supabase?"configured":"not-configured"});
}

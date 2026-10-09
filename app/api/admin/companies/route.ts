import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/admin-auth";

export async function GET(){
  const ctx=await getSuperAdminContext();if(!ctx)return NextResponse.json({error:"Forbidden"},{status:403});
  const {data:orgs,error}=await ctx.service.from("organizations").select("id,name,plan,status,trial_ends_at,created_at").order("created_at",{ascending:false});
  if(error)return NextResponse.json({error:error.message},{status:500});
  const {data:profiles}=await ctx.service.from("profiles").select("organization_id,full_name,role");
  const {data:leads}=await ctx.service.from("leads").select("organization_id");
  const rows=(orgs||[]).map(org=>{
    const members=(profiles||[]).filter(p=>p.organization_id===org.id);
    const owner=members.find(p=>p.role==="owner")?.full_name||"Pending invite";
    return {id:org.id,company:org.name,owner,plan:org.plan,leads:(leads||[]).filter(l=>l.organization_id===org.id).length,users:members.length,status:org.status,expiry:org.trial_ends_at};
  });
  return NextResponse.json({companies:rows});
}

export async function POST(req:NextRequest){
  const ctx=await getSuperAdminContext();if(!ctx)return NextResponse.json({error:"Forbidden"},{status:403});
  let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
  const company=String(body.company||"").trim();const ownerEmail=String(body.ownerEmail||"").trim().toLowerCase();const ownerName=String(body.ownerName||"Owner").trim();const plan=String(body.plan||"trial").toLowerCase();
  if(!company||!/^\S+@\S+\.\S+$/.test(ownerEmail))return NextResponse.json({error:"Company and a valid owner email are required."},{status:400});
  if(!["trial","free","growth","pro","agency"].includes(plan))return NextResponse.json({error:"Invalid plan."},{status:400});
  const slug=`${company.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${Date.now().toString(36)}`;
  const {data:org,error:orgError}=await ctx.service.from("organizations").insert({name:company,slug,plan,status:plan==="trial"?"trial":"active"}).select("id").single();
  if(orgError||!org)return NextResponse.json({error:orgError?.message||"Could not create company."},{status:500});
  const {error:inviteRowError}=await ctx.service.from("team_invites").insert({organization_id:org.id,email:ownerEmail,role:"owner",invited_by:ctx.userId});
  if(inviteRowError){await ctx.service.from("organizations").delete().eq("id",org.id);return NextResponse.json({error:inviteRowError.message},{status:500});}
  const redirectTo=`${process.env.NEXT_PUBLIC_APP_URL||req.nextUrl.origin}/auth/callback?next=/dashboard`;
  const {error:inviteError}=await ctx.service.auth.admin.inviteUserByEmail(ownerEmail,{redirectTo,data:{full_name:ownerName,business_name:company}});
  if(inviteError){await ctx.service.from("organizations").delete().eq("id",org.id);return NextResponse.json({error:`Company was not created because the owner invite failed: ${inviteError.message}`},{status:500});}
  return NextResponse.json({ok:true,organizationId:org.id},{status:201});
}

export async function PATCH(req:NextRequest){
  const ctx=await getSuperAdminContext();if(!ctx)return NextResponse.json({error:"Forbidden"},{status:403});
  let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
  const id=String(body.id||"");const patch:any={};
  if(body.plan!==undefined){const plan=String(body.plan).toLowerCase();if(!["trial","free","growth","pro","agency"].includes(plan))return NextResponse.json({error:"Invalid plan"},{status:400});patch.plan=plan;}
  if(body.status!==undefined){const status=String(body.status).toLowerCase();if(!["active","trial","suspended"].includes(status))return NextResponse.json({error:"Invalid status"},{status:400});patch.status=status;}
  if(!id||Object.keys(patch).length===0)return NextResponse.json({error:"Nothing to update"},{status:400});
  const {error}=await ctx.service.from("organizations").update(patch).eq("id",id);if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true});
}

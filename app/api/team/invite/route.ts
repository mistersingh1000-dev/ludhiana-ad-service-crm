import { NextRequest, NextResponse } from "next/server";
import { getTeamManagerContext } from "@/lib/admin-auth";

export async function POST(req:NextRequest){
  const ctx=await getTeamManagerContext();if(!ctx)return NextResponse.json({error:"Forbidden"},{status:403});
  let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
  const email=String(body.email||"").trim().toLowerCase();const fullName=String(body.fullName||"Team Member").trim();const role=String(body.role||"agent").toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"A valid email is required."},{status:400});
  if(!["manager","agent"].includes(role))return NextResponse.json({error:"Role must be manager or agent."},{status:400});
  const {error:rowError}=await ctx.service.from("team_invites").insert({organization_id:ctx.organizationId,email,role,invited_by:ctx.userId});
  if(rowError)return NextResponse.json({error:rowError.message},{status:500});
  const redirectTo=`${process.env.NEXT_PUBLIC_APP_URL||req.nextUrl.origin}/auth/callback?next=/dashboard`;
  const {error:inviteError}=await ctx.service.auth.admin.inviteUserByEmail(email,{redirectTo,data:{full_name:fullName}});
  if(inviteError){await ctx.service.from("team_invites").delete().eq("organization_id",ctx.organizationId).eq("email",email).is("accepted_at",null);return NextResponse.json({error:inviteError.message},{status:500});}
  return NextResponse.json({ok:true});
}

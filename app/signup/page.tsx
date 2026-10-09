"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BRAND } from "@/lib/brand";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function Signup(){
  const router=useRouter();
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");setLoading(true);
    const form=new FormData(e.currentTarget);
    const email=String(form.get("email")||"");
    const password=String(form.get("password")||"");
    const fullName=String(form.get("fullName")||"");
    const businessName=String(form.get("businessName")||"");
    const phone=String(form.get("phone")||"");
    const businessType=String(form.get("businessType")||"");
    const supabase=createBrowserSupabaseClient();
    if(!supabase){router.push("/dashboard");return;}
    const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${window.location.origin}/auth/callback?next=/dashboard`,data:{full_name:fullName,business_name:businessName,phone,business_type:businessType}}});
    setLoading(false);
    if(error){setError(error.message);return;}
    if(!data.session){setError("Account created. Please check your email to confirm your account, then log in.");return;}
    router.push("/dashboard");router.refresh();
  }

  return <div className="auth-shell"><div className="auth-card"><Link className="brand" href="/"><span className="logo">L</span>{BRAND.name}</Link><h1>Start your free trial</h1><p>Create your company CRM workspace. No card required for the {BRAND.trialDays}-day trial.</p><form className="form" onSubmit={submit}><div className="form-row"><label>Your name<input name="fullName" className="input" required placeholder="Your name"/></label><label>Business name<input name="businessName" className="input" required placeholder="Your Business"/></label></div><label>Work email<input name="email" className="input" type="email" required placeholder="you@business.com" autoComplete="email"/></label><label>Mobile / WhatsApp<input name="phone" className="input" required placeholder="+91 …"/></label><label>Create password<input name="password" className="input" type="password" minLength={8} required placeholder="Minimum 8 characters" autoComplete="new-password"/></label><label>Business type<select name="businessType" className="select"><option>Advertising client</option><option>Clinic / Healthcare</option><option>Salon / Beauty</option><option>Insurance</option><option>Real Estate</option><option>Education</option><option>Other</option></select></label>{error&&<div className="notice danger">{error}</div>}<button className="btn btn-primary" disabled={loading}>{loading?"Creating workspace…":"Create Free CRM"}</button></form><p>Already have an account? <Link href="/login" style={{color:'#b8afff'}}>Login</Link></p></div></div>;
}

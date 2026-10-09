"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { BRAND } from "@/lib/brand";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function ForgotPassword(){
  const [email,setEmail]=useState("");const [message,setMessage]=useState("");
  async function submit(e:FormEvent){e.preventDefault();const supabase=createBrowserSupabaseClient();if(!supabase){setMessage("Demo mode: connect Supabase to enable password reset emails.");return;}const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/auth/callback?next=/update-password`});setMessage(error?error.message:"Password reset email sent. Please check your inbox.");}
  return <div className="auth-shell"><div className="auth-card"><Link className="brand" href="/"><span className="logo">L</span>{BRAND.name}</Link><h1>Reset password</h1><p>Enter your login email and we will send a reset link.</p><form className="form" onSubmit={submit}><label>Email<input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@business.com"/></label><button className="btn btn-primary">Send reset link</button></form>{message&&<div className="notice" style={{marginTop:12}}>{message}</div>}<p><Link href="/login" style={{color:'#b8afff'}}>Back to login</Link></p></div></div>;
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BRAND } from "@/lib/brand";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function Login(){
  const router=useRouter();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();setError("");setLoading(true);
    const supabase=createBrowserSupabaseClient();
    if(!supabase){router.push("/dashboard");return;}
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setLoading(false);
    if(error){setError(error.message);return;}
    router.push("/dashboard");router.refresh();
  }

  return <div className="auth-shell"><div className="auth-card"><Link className="brand" href="/"><span className="logo">L</span>{BRAND.name}</Link><h1>Welcome back</h1><p>Login to manage ad leads, follow-ups and customer conversations.</p><form className="form" onSubmit={submit}><label>Email<input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@business.com" required autoComplete="email"/></label><label>Password<input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password"/></label>{error&&<div className="notice danger">{error}</div>}<button className="btn btn-primary" disabled={loading}>{loading?"Signing in…":"Login"}</button></form><p><Link href="/forgot-password" style={{color:'#b8afff'}}>Forgot password?</Link></p><p className="small-note">Without Supabase credentials, login safely opens the local demo workspace without sending your password in the URL.</p><p>New here? <Link href="/signup" style={{color:'#b8afff'}}>Start free trial</Link></p></div></div>;
}

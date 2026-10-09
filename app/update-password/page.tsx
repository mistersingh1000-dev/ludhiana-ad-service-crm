"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function UpdatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (password.length < 8) return setMessage("Password must be at least 8 characters.");
    if (password !== confirm) return setMessage("Passwords do not match.");
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return setMessage("Demo mode: password updates activate after Supabase is connected.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setMessage(error.message);
    router.replace("/dashboard");
    router.refresh();
  }

  return <div className="auth-shell"><div className="auth-card"><Link className="brand" href="/"><span className="logo">L</span>{BRAND.name}</Link><h1>Create new password</h1><p>Choose a new password for your CRM account.</p><form className="form" onSubmit={submit}><label>New password<input className="input" type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></label><label>Confirm password<input className="input" type="password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></label>{message&&<div className="notice">{message}</div>}<button className="btn btn-primary" disabled={loading}>{loading?"Updating…":"Update Password"}</button></form></div></div>;
}

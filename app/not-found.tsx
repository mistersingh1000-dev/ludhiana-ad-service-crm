import Link from "next/link";
import { BRAND } from "@/lib/brand";
export default function NotFound(){return <div className="auth-shell"><div className="auth-card"><Link className="brand" href="/"><span className="logo">L</span>{BRAND.name}</Link><h1>Page not found</h1><p>The page you requested does not exist or may have moved.</p><Link className="btn btn-primary" href="/">Back to home</Link></div></div>}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  if (demoMode) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard/", "/admin/", "/api/"] }] };
}

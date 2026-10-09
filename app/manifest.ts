import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND.description,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07101c",
    theme_color: "#6d5dfc",
  };
}

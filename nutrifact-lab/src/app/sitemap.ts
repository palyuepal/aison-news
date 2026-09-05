import type { MetadataRoute } from "next";
import { supplements } from "@/data/supplements";

const base = "https://nutrifact-lab-mvp.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/supplements", "/evidence", "/about", "/editorial-policy", "/disclaimer"];
  return [
    ...staticPages.map((path) => ({ url: `${base}${path}`, lastModified: new Date("2026-09-05") })),
    ...supplements.map((item) => ({ url: `${base}/supplements/${item.slug}`, lastModified: new Date(item.updated) }))
  ];
}

import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";
import { store } from "@/server/db";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/grade/8/science"];
  if (store.isPublished()) paths.push("/grade/8/science/nutrients");
  return paths.map((path) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));
}

import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";
import { STAGES, gradeAvailable, registeredLessons } from "@/content/catalog";
import { store } from "@/server/db";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const lessons = registeredLessons(store.isPublished());
  const paths = [
    "/",
    ...STAGES.map((stage) => stage.href),
    "/grade/8/science",
  ];
  if (gradeAvailable(lessons, 8)) paths.push("/grade/8");
  if (store.isPublished()) paths.push("/grade/8/science/nutrients");
  return paths.map((path) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.8,
  }));
}

import { Home } from "@/components/home";
import { registeredLessons } from "@/content/catalog";
import { publicPageMetadata, siteDescription } from "@/content/site";
import { store } from "@/server/db";
export const dynamic = "force-dynamic";
export const metadata = {
  ...publicPageMetadata("مدارك | مساحة للاكتشاف", siteDescription, "/"),
  title: { absolute: "مدارك | مساحة للاكتشاف" },
};
export default function Page() {
  return <Home lessons={registeredLessons(store.isPublished())} />;
}

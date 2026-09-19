import { Home } from "@/components/home";
import { publicPageMetadata, siteDescription } from "@/content/site";
export const metadata = {
  ...publicPageMetadata("مدارك | مساحة للاكتشاف", siteDescription, "/"),
  title: { absolute: "مدارك | مساحة للاكتشاف" },
};
export default function Page() {
  return <Home />;
}

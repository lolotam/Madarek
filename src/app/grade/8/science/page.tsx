import { Curriculum } from "@/components/curriculum";
import { store } from "@/server/db";
import { publicPageMetadata } from "@/content/site";
export const dynamic = "force-dynamic";
export const metadata = publicPageMetadata(
  "علوم الصف الثامن — فهرس الدروس",
  "اكتشفي وحدات علوم الصف الثامن ودروس الفصل الأول ٢٠٢٦–٢٠٢٧ بالمنهج الكويتي. ابدئي بدرس المغذّيات والأنشطة والاختبار التفاعلي.",
  "/grade/8/science",
);
export default function Page() {
  return <Curriculum published={store.isPublished()} />;
}

import { Curriculum } from "@/components/curriculum";
import { store } from "@/server/db";
export const dynamic = "force-dynamic";
export const metadata = { title: "علوم الصف الثامن — فهرس الدروس" };
export default function Page() {
  return <Curriculum published={store.isPublished()} />;
}

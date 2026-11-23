import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { store } from "@/server/db";
import { EnglishAdmin } from "@/components/english-admin";
import "../../grade/2/english/school.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "تقييم الإنجليزية",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = store.sessionUser((await cookies()).get("hana_session")?.value);
  if (!user) redirect("/login");
  if (user.role !== "admin") notFound();
  return <EnglishAdmin />;
}

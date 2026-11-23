import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { store } from "@/server/db";
import { englishJourney } from "@/server/english.mjs";
import { Dashboard } from "@/components/dashboard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "مساحتك التعليمية",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ fromLesson?: string }>;
}) {
  const user = store.sessionUser((await cookies()).get("hana_session")?.value);
  if (!user) redirect("/login");
  const snapshot = store.snapshot(user.id) as React.ComponentProps<
    typeof Dashboard
  >["initial"];
  const { fromLesson } = await searchParams;
  const stages =
    user.role === "student" && user.grade === 2
      ? englishJourney(snapshot.englishAttempts ?? [])
      : undefined;
  return (
    <Dashboard
      initial={snapshot}
      englishStages={stages}
      fromEnglishLesson={
        typeof fromLesson === "string" && /^(?:[1-9]|1\d|20)$/.test(fromLesson)
          ? Number(fromLesson)
          : undefined
      }
    />
  );
}

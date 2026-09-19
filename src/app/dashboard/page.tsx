import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { store } from "@/server/db";
import { Dashboard } from "@/components/dashboard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "مساحتك التعليمية",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = store.sessionUser((await cookies()).get("hana_session")?.value);
  if (!user) redirect("/login");
  const snapshot = store.snapshot(user.id);
  return (
    <Dashboard
      initial={snapshot as React.ComponentProps<typeof Dashboard>["initial"]}
    />
  );
}

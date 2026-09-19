import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ComponentProps } from "react";
import { store } from "@/server/db";
import { AdminDashboard } from "@/components/admin";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "لوحة الإدارة",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const user = store.sessionUser((await cookies()).get("hana_session")?.value);
  if (!user) redirect("/login");
  if (user.role !== "admin") notFound();
  const users = store.listAdminUsers(user.id, { q: "", page: 1 });
  const settings = store.getAdminSettings(user.id);
  const audit = store.listAdminAudit(user.id);
  const snapshot = store.snapshot(user.id);
  type Props = ComponentProps<typeof AdminDashboard>;
  return (
    <AdminDashboard
      selfId={user.id}
      initialUsers={users as Props["initialUsers"]}
      initialSettings={settings as Props["initialSettings"]}
      initialAudit={audit as Props["initialAudit"]}
      initialSnapshot={snapshot as Props["initialSnapshot"]}
    />
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { store } from "@/server/db";
import { Shop } from "@/components/shop/shop";
import type { ShopState } from "@/components/shop/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "متجر مدارك",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const user = store.sessionUser((await cookies()).get("hana_session")?.value);
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/dashboard");
  return <Shop initial={store.shop(user.id) as ShopState} name={user.name} />;
}

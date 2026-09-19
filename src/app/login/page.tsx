import { Auth } from "@/components/auth";
export const metadata = {
  title: "دخول إلى مساحتك",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return (
    <Auth
      initialMode={
        ["login", "register", "student"].includes(mode || "") ? mode : "login"
      }
    />
  );
}

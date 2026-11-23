import { Auth } from "@/components/auth";
export const metadata = {
  title: "دخول إلى مساحتك",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; lesson?:string }>;
}) {
  const { mode, lesson } = await searchParams;
  return (
    <Auth returnLesson={lesson && /^(?:[1-9]|1\d|2[01])$/.test(lesson) ? lesson : undefined}
      initialMode={
        ["login", "register", "student"].includes(mode || "") ? mode : "login"
      }
    />
  );
}

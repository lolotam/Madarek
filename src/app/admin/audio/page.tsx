import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { store } from "@/server/db";
import { loadReviewBoard } from "@/server/audio/review-board.mjs";
import {
  AudioReviewBoard,
  type ReviewBoardData,
} from "@/components/audio-review";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "مراجعة الصوت",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const user = store.sessionUser((await cookies()).get("hana_session")?.value);
  if (!user) redirect("/login");
  if (user.role !== "admin") notFound();
  const board = (await loadReviewBoard("nutrients")) as ReviewBoardData;
  return <AudioReviewBoard board={board} />;
}

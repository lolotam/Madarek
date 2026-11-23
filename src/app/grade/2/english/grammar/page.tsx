import Link from "next/link";
import { GrammarCards } from "@/components/english-grammar";
import "../school.css";

export const metadata = { title: "شرح قواعد الإنجليزية | الصف الثاني" };

export default function GrammarIndex() {
  return (
    <section className="container section school">
      <div className="breadcrumbs">
        <Link href="/grade/2/english">My School Day</Link>
      </div>
      <h1>شرح القواعد</h1>
      <GrammarCards />
    </section>
  );
}

import Link from "next/link";
import { grammarPath, grammarRules } from "@/content/english-grammar";
import { questionCount } from "@/server/english.mjs";
import { Diagram } from "./english-lesson";

export function QuestionBadge({ count }: { count: number }) {
  return (
    <span className="school-question-count">
      {count.toLocaleString("ar-u-nu-arab")} {count <= 10 ? "أسئلة" : "سؤالًا"}
    </span>
  );
}

export function GrammarCards() {
  return (
    <div className="school-grammar-grid">
      {grammarRules.map((rule) => (
        <Link
          className="school-grammar-card"
          key={rule.id}
          href={`${grammarPath}/${rule.id}`}
        >
          <QuestionBadge count={questionCount(rule.page)} />
          <span className="school-icon" aria-hidden="true">
            {rule.icon}
          </span>
          <span className="school-grammar-card-name">
            <strong>{rule.title}</strong>
            <span lang="en" dir="ltr">
              {rule.english}
            </span>
          </span>
          <p>{rule.description}</p>
        </Link>
      ))}
    </div>
  );
}

export function GrammarGuide({
  rule,
}: {
  rule: (typeof grammarRules)[number];
}) {
  return (
    <section className="container section school school-guide">
      <div className="breadcrumbs">
        <Link href="/grade/2/english">الإنجليزية</Link> /{" "}
        <Link href={grammarPath}>شرح القواعد</Link>
      </div>
      <header className="school-guide-hero" data-rule={rule.id}>
        <div>
          <p lang="en" dir="ltr">
            {rule.english}
          </p>
          <h1>{rule.title}</h1>
          <p>{rule.description}</p>
          <a className="button primary" href="#practice">
            ابدأ التدريب ·{" "}
            {questionCount(rule.page).toLocaleString("ar-u-nu-arab")}
          </a>
        </div>
        <Diagram q={{ id: rule.id, scene: rule.scene }} />
      </header>
      <div className="school-guide-steps">
        {rule.steps.map((step) => (
          <article className="school-rule-step" key={step.title}>
            <h2>
              <span aria-hidden="true">{step.icon}</span> {step.title}
            </h2>
            <p>{step.note}</p>
            <ul dir="ltr" lang="en">
              {step.samples.map(([pattern, example]) => (
                <li key={pattern}>
                  <strong>{pattern}</strong>
                  <span>{example}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

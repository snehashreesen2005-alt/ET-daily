import { useState } from "react";
import type { Editorial } from "../lib/supabase";

const when = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function Card({ e }: { e: Editorial }) {
  const [view, setView] = useState<"summary" | "full">("summary");
  const tab = (v: "summary" | "full", label: string) => (
    <button role="tab" aria-selected={view === v} onClick={() => setView(v)}
      className={`px-3 py-1 text-sm border-b-2 focus-visible:outline focus-visible:outline-2 ${view === v ? "border-[#1b1a17] font-semibold" : "border-transparent text-[#5b564b]"}`}>
      {label}
    </button>
  );
  return (
    <article className="border-t-4 border-double border-[#1b1a17] py-8">
      <h2 className="font-[family-name:var(--font-head)] text-3xl font-extrabold leading-tight sm:text-4xl">{e.headline}</h2>
      <p className="mt-3 text-sm text-[#5b564b]">
        By <span className="font-semibold text-[#1b1a17]">{e.author}</span>, {when(e.publish_date)}.{" "}
        <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2 hover:text-[#1b1a17]">
          Read the original on Economic Times
        </a>
      </p>
      <p className="mt-5 font-[family-name:var(--font-head)] text-xl leading-relaxed">{e.overview}</p>

      <div role="tablist" className="mt-6 flex gap-2 border-b border-[#c9bfa6]">
        {tab("summary", "Key takeaways and implications")}
        {tab("full", "Full text")}
      </div>

      {view === "summary" ? (
        <div className="mt-5 grid gap-6 leading-7 sm:grid-cols-2">
          <section>
            <h3 className="mb-2 font-semibold">Key takeaways</h3>
            <ul className="list-disc space-y-2 pl-5">{e.takeaways.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </section>
          <section>
            <h3 className="mb-2 font-semibold">Why it matters for India</h3>
            <p>{e.implication}</p>
          </section>
        </div>
      ) : (
        <div className="mt-5 max-w-prose space-y-4 leading-7">
          {e.full_text.split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
    </article>
  );
}

export default function EditorialStack({ items }: { items: Editorial[] }) {
  return <div className="flex flex-col">{items.map((e) => <Card key={e.id} e={e} />)}</div>;
}

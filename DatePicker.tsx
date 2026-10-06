const fmt = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

type Props = { dates: string[]; current: string; onChange: (d: string) => void };

export default function DatePicker({ dates, current, onChange }: Props) {
  const i = dates.indexOf(current); // dates are sorted newest first
  const btn =
    "border border-[#1b1a17] px-3 py-1.5 text-sm font-medium hover:bg-[#1b1a17] hover:text-[#f3eddf] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <nav aria-label="Edition date" className="flex flex-wrap items-center justify-center gap-3">
      <button className={btn} disabled={i < 0 || i >= dates.length - 1} onClick={() => onChange(dates[i + 1])}>Previous edition</button>
      <label className="sr-only" htmlFor="edition">Jump to edition</label>
      <select id="edition" value={current} onChange={(e) => onChange(e.target.value)}
        className="border border-[#1b1a17] bg-transparent px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2">
        {dates.map((d) => <option key={d} value={d}>{fmt(d)}</option>)}
      </select>
      <button className={btn} disabled={i <= 0} onClick={() => onChange(dates[i - 1])}>Next edition</button>
    </nav>
  );
}

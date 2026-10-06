import { useCallback, useEffect, useState } from "react";
import { supabase, type Editorial } from "./lib/supabase";
import EditorialStack from "./components/EditorialStack";
import DatePicker from "./components/DatePicker";
import AdminPanel from "./components/AdminPanel";

const readDate = () => new URLSearchParams(window.location.search).get("date");

export default function App() {
  const [dates, setDates] = useState<string[] | null>(null);
  const [requested, setRequested] = useState<string | null>(readDate());
  const [items, setItems] = useState<Editorial[]>([]);
  const [error, setError] = useState("");

  // Back/forward buttons
  useEffect(() => {
    const onPop = () => setRequested(readDate());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const loadDates = useCallback(async () => {
    const { data, error } = await supabase
      .from("editorials").select("publish_date").order("publish_date", { ascending: false }).limit(400);
    if (error) return setError(error.message);
    setDates([...new Set((data ?? []).map((r) => r.publish_date as string))]);
  }, []);
  useEffect(() => { loadDates(); }, [loadDates]);

  const current = dates && (requested && dates.includes(requested) ? requested : dates[0]);

  useEffect(() => {
    if (!current) return;
    supabase.from("editorials").select("*").eq("publish_date", current).order("slot")
      .then(({ data, error }) => (error ? setError(error.message) : setItems((data ?? []) as Editorial[])));
  }, [current]);

  const goTo = (d: string) => {
    history.pushState(null, "", `?date=${d}`);
    setRequested(d);
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 text-center">
        <h1 className="font-[family-name:var(--font-head)] text-5xl font-extrabold tracking-tight sm:text-6xl">ET Digest Daily</h1>
        <p className="mt-2 text-[#5b564b]">The three Economic Times commentary columns, summarised each morning.</p>
        {dates && current && <div className="mt-6"><DatePicker dates={dates} current={current} onChange={goTo} /></div>}
      </header>

      {error && <p role="alert" className="mb-6 text-[#8a2b1f]">Could not load editions: {error}</p>}

      {dates === null ? (
        <p className="py-10 text-center text-[#5b564b]">Loading today&apos;s columns.</p>
      ) : items.length ? (
        <EditorialStack items={items} />
      ) : (
        <p className="border-t-4 border-double border-[#1b1a17] py-10 text-center">
          No editions yet. Open the Admin section below and run a sync to load today&apos;s columns.
        </p>
      )}

      <footer className="mt-12"><AdminPanel onSynced={loadDates} /></footer>
    </main>
  );
}

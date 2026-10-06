import { useRef, useState } from "react";

type Run = { id: string; run_date: string; status: string; articles_saved: number; error: string | null; started_at: string; finished_at: string | null };

export default function AdminPanel({ onSynced }: { onSynced?: () => void }) {
  const [pw, setPw] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const headers = { "x-admin-password": pw };
  const refresh = async () => {
    const r = await fetch("/api/sync", { headers });
    if (r.status === 401) return setMsg("Wrong admin password.");
    const j = await r.json();
    setRuns(j.runs ?? []);
  };

  const sync = async () => {
    setBusy(true);
    setMsg("Sync started. Fetching the feed, reading articles and writing summaries.");
    timer.current = setInterval(refresh, 2500); // live status while the POST is in flight
    try {
      const r = await fetch("/api/sync", { method: "POST", headers });
      const j = await r.json();
      if (j.ok) onSynced?.();
      setMsg(j.ok ? `Saved ${j.saved} columns for ${j.publish_date}.` : `Sync failed: ${j.error}`);
    } catch (e) {
      setMsg(`Request failed: ${(e as Error).message}`);
    } finally {
      if (timer.current) clearInterval(timer.current);
      setBusy(false);
      refresh();
    }
  };

  const field = "border border-[#1b1a17] bg-transparent px-3 py-1.5 text-sm";
  return (
    <details className="mt-10 border-t border-[#c9bfa6] pt-4 text-sm">
      <summary className="cursor-pointer text-[#5b564b]">Admin</summary>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input type="password" aria-label="Admin password" placeholder="Admin password" value={pw} onChange={(e) => setPw(e.target.value)} className={field} />
        <button onClick={sync} disabled={busy || !pw} className="bg-[#1b1a17] px-4 py-1.5 font-medium text-[#f3eddf] disabled:opacity-40">
          {busy ? "Syncing" : "Run sync now"}
        </button>
        <button onClick={refresh} disabled={!pw} className={field}>Check pipeline health</button>
      </div>
      {msg && <p role="status" className="mt-3">{msg}</p>}
      {runs.length > 0 && (
        <table className="mt-4 w-full text-left">
          <thead><tr className="border-b border-[#c9bfa6]"><th className="py-1">Started</th><th>Status</th><th>Saved</th><th>Error</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-[#e3dac3] align-top">
                <td className="py-1">{new Date(r.started_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td>{r.status}</td><td>{r.articles_saved}</td><td className="text-[#8a2b1f]">{r.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}

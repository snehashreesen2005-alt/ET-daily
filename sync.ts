import { timingSafeEqual } from "node:crypto";
import { db } from "./_lib/db.js";
import { scrapeDailyEditorials } from "./_lib/scraper.js";
import { summarize } from "./_lib/summarizer.js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const safeEq = (a = "", b = "") => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
const isCron = (req: Request) =>
  !!process.env.CRON_SECRET && safeEq(req.headers.get("authorization") ?? "", `Bearer ${process.env.CRON_SECRET}`);
const isAdmin = (req: Request) =>
  !!process.env.ADMIN_PASSWORD && safeEq(req.headers.get("x-admin-password") ?? "", process.env.ADMIN_PASSWORD);

async function runSync() {
  const supabase = db();

  // Lock: a "running" row older than 10 minutes is treated as a crashed run.
  const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: active } = await supabase
    .from("pipeline_runs").select("id").eq("status", "running").gt("started_at", cutoff).limit(1);
  if (active?.length) return json({ ok: false, error: "A sync is already running" }, 409);

  const { data: run, error: runErr } = await supabase
    .from("pipeline_runs")
    .insert({ run_date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()), status: "running" })
    .select("id").single();
  if (runErr || !run) return json({ ok: false, error: runErr?.message }, 500);

  try {
    const articles = await scrapeDailyEditorials();
    // Summarize everything first: a failure here leaves existing data untouched.
    const digests = await Promise.all(articles.map((a) => summarize(a)));
    const rows = articles.map((a, i) => ({ ...a, ...digests[i] }));

    // Idempotent: re-running for the same date replaces rows on (publish_date, slot).
    const { error } = await supabase.from("editorials").upsert(rows, { onConflict: "publish_date,slot" });
    if (error) throw new Error(error.message);

    await supabase.from("pipeline_runs")
      .update({ status: "completed", articles_saved: rows.length, finished_at: new Date().toISOString() })
      .eq("id", run.id);
    return json({ ok: true, publish_date: rows[0].publish_date, saved: rows.length });
  } catch (e) {
    const message = (e as Error).message;
    await supabase.from("pipeline_runs")
      .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
      .eq("id", run.id);
    return json({ ok: false, error: message }, 500);
  }
}

// GET: Vercel Cron (Bearer CRON_SECRET) runs a sync; admin password returns recent runs.
export async function GET(req: Request) {
  if (isCron(req)) return runSync();
  if (isAdmin(req)) {
    const { data } = await db().from("pipeline_runs").select("*").order("started_at", { ascending: false }).limit(5);
    return json({ ok: true, runs: data ?? [] });
  }
  return json({ ok: false, error: "Unauthorized" }, 401);
}

// POST: manual trigger from the admin panel.
export async function POST(req: Request) {
  if (!isAdmin(req)) return json({ ok: false, error: "Unauthorized" }, 401);
  return runSync();
}

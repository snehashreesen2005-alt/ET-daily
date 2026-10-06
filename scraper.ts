import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";

export const RSS_URL =
  "https://economictimes.indiatimes.com/opinion/et-commentary/rssfeeds/897228747.cms";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type ScrapedArticle = {
  slot: number;
  publish_date: string; // YYYY-MM-DD, IST
  headline: string;
  author: string;
  source_url: string;
  full_text: string;
};

type FeedItem = { title: string; link: string; date: Date; description: string };

export const istDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

async function fetchText(url: string, attempts = 3): Promise<string> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xml,*/*", "Accept-Language": "en-IN,en;q=0.9" },
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw new Error(`Fetch failed after ${attempts} attempts: ${(last as Error)?.message}`);
}

const clean = (s: string) =>
  s.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

export async function fetchFeedItems(): Promise<FeedItem[]> {
  const xml = await fetchText(RSS_URL);
  const parsed = new XMLParser({ ignoreAttributes: true }).parse(xml);
  const raw = parsed?.rss?.channel?.item;
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr
    .map((i: any) => ({
      title: clean(String(i.title ?? "")),
      link: String(i.link ?? "").trim(),
      date: new Date(i.pubDate),
      description: clean(cheerio.load(String(i.description ?? "")).text()),
    }))
    .filter((i: FeedItem) => i.title && i.link && !isNaN(i.date.getTime()))
    .sort((a: FeedItem, b: FeedItem) => b.date.getTime() - a.date.getTime());
}

function extractArticle(html: string, fallbackDesc: string) {
  const $ = cheerio.load(html);
  let body = "";
  let author = "";

  // 1) JSON-LD (most stable across ET template changes)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).contents().text());
      const nodes = ([] as any[]).concat(json, json?.["@graph"] ?? []);
      for (const n of nodes) {
        if (n?.articleBody && String(n.articleBody).length > body.length) body = String(n.articleBody);
        const a = Array.isArray(n?.author) ? n.author[0] : n?.author;
        if (a?.name && !author) author = String(a.name);
      }
    } catch {}
  });

  // 2) DOM fallback
  if (body.length < 600) {
    $("script,style,noscript,.ad,.adContainer,.related,.story_list").remove();
    $("br").replaceWith("\n");
    for (const sel of [".artText", ".Normal", "[data-articlebody]", "article"]) {
      const t = $(sel).first().text();
      if (t.length > body.length) body = t;
    }
  }
  if (!author) author = $('meta[name="author"]').attr("content") || $(".auth-name,.byline").first().text() || "";

  body = clean(cheerio.load(`<div>${body}</div>`).text());
  if (body.length < 400) body = fallbackDesc; // paywall / layout change safety net
  if (body.length < 150) throw new Error("Could not extract article body");
  return { body, author: clean(author) || "Economic Times" };
}

/** Newest 3 commentary pieces from the feed, with full text. */
export async function scrapeDailyEditorials(): Promise<ScrapedArticle[]> {
  const top = (await fetchFeedItems()).slice(0, 3);
  if (top.length < 3) throw new Error(`Feed returned only ${top.length} usable items; expected 3`);
  const editionDate = istDate(top[0].date);

  return Promise.all(
    top.map(async (item, idx) => {
      const { body, author } = extractArticle(await fetchText(item.link), item.description);
      return {
        slot: idx + 1,
        publish_date: editionDate,
        headline: item.title,
        author,
        source_url: item.link,
        full_text: body,
      };
    })
  );
}

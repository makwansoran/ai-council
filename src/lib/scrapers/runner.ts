import { load } from "cheerio";
import { classifyText, isHormuz } from "@/lib/classifier";
import {
  insertScraperRun,
  insertSignals,
  updateScraper,
} from "@/lib/repo";
import type { ScraperRow } from "@/lib/supabase/types";
import { runRssIngest } from "@/lib/scrapers/news";
import { runXUserIngest } from "@/lib/scrapers/x";

const UA =
  "Mozilla/5.0 (compatible; AIMarketCouncil/1.0; +https://github.com/)";

export interface ScrapeResult {
  status: "ok" | "error";
  items_count: number;
  output: unknown;
  error?: string | null;
}

export async function runScraper(scraper: ScraperRow): Promise<ScrapeResult> {
  const start = Date.now();
  try {
    let result: ScrapeResult;
    switch (scraper.kind) {
      case "rss":
        result = await runRssIngest(scraper);
        break;
      case "x_user":
        result = await runXUserIngest(scraper);
        break;
      case "web":
        result = await runWebScrape(scraper);
        break;
      case "custom":
        result = await runWebScrape(scraper);
        break;
      default:
        result = {
          status: "error",
          items_count: 0,
          output: null,
          error: `unknown scraper kind: ${scraper.kind}`,
        };
    }
    await insertScraperRun({
      scraper_id: scraper.id,
      status: result.status,
      items_count: result.items_count,
      error: result.error ?? null,
      output: result.output ?? null,
      finished_at: new Date().toISOString(),
    });
    await updateScraper(scraper.id, {
      last_run_at: new Date().toISOString(),
      last_status: result.status,
      last_error: result.error ?? null,
    });
    console.log(
      `[scraper ${scraper.name}] ${result.status} ${result.items_count} items (${Date.now() - start}ms)`,
    );
    return result;
  } catch (err) {
    const msg = (err as Error).message;
    await insertScraperRun({
      scraper_id: scraper.id,
      status: "error",
      items_count: 0,
      error: msg,
      output: null,
      finished_at: new Date().toISOString(),
    });
    await updateScraper(scraper.id, {
      last_run_at: new Date().toISOString(),
      last_status: "error",
      last_error: msg,
    });
    return { status: "error", items_count: 0, output: null, error: msg };
  }
}

async function runWebScrape(scraper: ScraperRow): Promise<ScrapeResult> {
  const res = await fetch(scraper.source, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    cache: "no-store",
  });
  if (!res.ok) {
    return {
      status: "error",
      items_count: 0,
      output: null,
      error: `HTTP ${res.status}`,
    };
  }
  const html = await res.text();
  const $ = load(html);

  let text = "";
  if (scraper.instructions && scraper.instructions.trim().length > 0) {
    try {
      // Treat instructions as a CSS selector if it looks like one.
      const selector = scraper.instructions.trim();
      $(selector).each((_, el) => {
        text += `${$(el).text().trim()}\n`;
      });
    } catch {
      text = $("body").text();
    }
  } else {
    text = $("body").text();
  }
  text = text.replace(/\s+/g, " ").trim().slice(0, 8000);

  const category = scraper.category;
  const hormuz = scraper.is_hormuz || isHormuz(text);

  await insertSignals([
    {
      kind: "scraper_extract",
      title: `${scraper.name} extract`,
      body: text.slice(0, 500),
      url: scraper.source,
      category,
      is_hormuz: hormuz,
      weight: 1,
      market_id: null,
      metadata: { length: text.length, classified: classifyText(text) },
    },
  ]);

  return {
    status: "ok",
    items_count: 1,
    output: { length: text.length, preview: text.slice(0, 500) },
  };
}

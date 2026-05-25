import type { Category } from "@/lib/supabase/types";

const POLITICS_KEYWORDS = [
  "election",
  "elections",
  "president",
  "presidential",
  "senate",
  "congress",
  "parliament",
  "prime minister",
  "supreme court",
  "vote",
  "voting",
  "ballot",
  "primary",
  "republican",
  "democrat",
  "gop",
  "biden",
  "trump",
  "harris",
  "putin",
  "xi jinping",
  "netanyahu",
  "khamenei",
  "erdogan",
  "macron",
  "campaign",
  "impeach",
  "cabinet",
  "minister",
  "diplomat",
  "sanction",
  "treaty",
];

const WAR_KEYWORDS = [
  "war",
  "ceasefire",
  "invasion",
  "strike",
  "airstrike",
  "missile",
  "drone",
  "nuclear",
  "iran",
  "israel",
  "gaza",
  "lebanon",
  "hezbollah",
  "hamas",
  "houthi",
  "yemen",
  "russia",
  "ukraine",
  "kyiv",
  "moscow",
  "china",
  "taiwan",
  "nato",
  "idf",
  "irgc",
  "centcom",
  "conflict",
  "weapons",
  "armed",
  "soldiers",
  "troops",
  "front line",
  "battlefield",
];

const GEOPOL_KEYWORDS = [
  "hormuz",
  "strait of hormuz",
  "tanker",
  "oil price",
  "opec",
  "saudi",
  "uae",
  "qatar",
  "turkey",
  "syria",
  "iraq",
  "north korea",
  "venezuela",
  "south china sea",
  "indo-pacific",
];

const HORMUZ_KEYWORDS = [
  "hormuz",
  "strait of hormuz",
  "irgc navy",
  "iranian navy",
  "tanker",
  "oil tanker",
  "vlcc",
  "kharg",
  "bandar abbas",
  "musandam",
  "gulf of oman",
  "persian gulf",
  "fifth fleet",
  "us navy gulf",
];

function hasAny(text: string, keywords: string[]) {
  return keywords.some((k) => text.includes(k));
}

export function classifyText(input: string): Category {
  const t = input.toLowerCase();
  if (hasAny(t, WAR_KEYWORDS)) return "war";
  if (hasAny(t, GEOPOL_KEYWORDS)) return "geopolitics";
  if (hasAny(t, POLITICS_KEYWORDS)) return "politics";
  return "other";
}

export function isHormuz(input: string): boolean {
  const t = input.toLowerCase();
  return hasAny(t, HORMUZ_KEYWORDS);
}

export function isInScope(category: Category | null | undefined) {
  return (
    category === "politics" || category === "war" || category === "geopolitics"
  );
}

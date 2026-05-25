import { getCronSecret } from "@/lib/env";

export function checkCronSecret(req: Request): { ok: true } | { ok: false; status: number; body: string } {
  const expected = getCronSecret();
  if (!expected) {
    return { ok: true };
  }
  const provided =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(req.url).searchParams.get("secret") ||
    "";
  if (provided === expected) return { ok: true };
  return { ok: false, status: 401, body: "Unauthorized" };
}

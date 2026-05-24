import "server-only";
import { headers } from "next/headers";

// Best-effort client IP extraction. Trusts X-Forwarded-For (set by Vercel,
// Cloudflare, most proxies) and falls back to X-Real-IP. Returns "unknown"
// when no trustworthy header is present — the rate limiter still bucket-keys
// off it, so worst case is everyone-without-an-IP shares a bucket.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    // Take the leftmost IP — that's the original client per spec.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

import "server-only";
import { headers } from "next/headers";
import { publicEnv } from "@/lib/env";

// Two-portal architecture:
//   - "admin"  → super-admin surface (admin.example.com in prod,
//                admin.localhost:3000 in dev)
//   - "tenant" → business-owner-and-team surface (example.com / localhost:3000)
//
// Routing is host-based and only activates when NEXT_PUBLIC_ADMIN_URL is
// configured AND its host differs from NEXT_PUBLIC_APP_URL. With one URL
// set, everything collapses to a single "tenant" portal that admins reach
// via /admin (legacy behavior).
export type Portal = "admin" | "tenant";

function safeHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function getAdminHost(): string | null {
  return safeHost(publicEnv.NEXT_PUBLIC_ADMIN_URL);
}

export function getAppHost(): string {
  return new URL(publicEnv.NEXT_PUBLIC_APP_URL).host;
}

// True only when the admin URL is a meaningfully different host from
// the app URL. We don't enable host routing if both env vars resolve
// to the same origin (would create a routing loop).
export function isPortalRoutingEnabled(): boolean {
  const adminHost = getAdminHost();
  const appHost = getAppHost();
  return adminHost !== null && adminHost !== appHost;
}

// Server-only: reads the `x-portal` header set by proxy.ts. Falls back
// to "tenant" so the (app) layout works in single-portal deployments.
export async function getPortal(): Promise<Portal> {
  const h = await headers();
  return h.get("x-portal") === "admin" ? "admin" : "tenant";
}

// Build a fully-qualified URL on the other portal. Used by the login
// action to tell admins-on-tenant-portal where to actually sign in.
export function buildPortalUrl(portal: Portal, pathname: string): string {
  const base =
    portal === "admin"
      ? publicEnv.NEXT_PUBLIC_ADMIN_URL ?? publicEnv.NEXT_PUBLIC_APP_URL
      : publicEnv.NEXT_PUBLIC_APP_URL;
  return new URL(pathname, base).toString();
}

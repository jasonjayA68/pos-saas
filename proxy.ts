import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/admin",
  "/pos",
  "/products",
  "/inventory",
  "/sales",
  "/customers",
  "/staff",
  "/reports",
  "/settings",
  "/billing",
];

const AUTH_PREFIXES = ["/login", "/signup", "/forgot-password"];

// Paths reachable on the admin portal. Everything outside this list
// 404s on the admin subdomain so tenant-facing URLs (/dashboard, /pos…)
// never appear there.
const ADMIN_PORTAL_ALLOWED_PREFIXES = [
  "/admin",
  "/login",
  "/logout",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/api/auth",
  "/_next",
];

function parseHost(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  // ── Portal detection (host-based) ───────────────────────────────────
  // Routing only activates when both env vars point to *distinct* hosts.
  // With NEXT_PUBLIC_ADMIN_URL unset (or equal to APP_URL), the app runs
  // single-portal — admins reach /admin via the regular domain.
  const adminHost = parseHost(process.env.NEXT_PUBLIC_ADMIN_URL);
  const appHost = parseHost(process.env.NEXT_PUBLIC_APP_URL);
  const requestHost = request.headers.get("host") ?? "";
  const path = request.nextUrl.pathname;

  const portalRoutingEnabled =
    adminHost !== null && appHost !== null && adminHost !== appHost;
  const portal: "admin" | "tenant" =
    portalRoutingEnabled && requestHost === adminHost ? "admin" : "tenant";

  // ── Cross-portal blocks ─────────────────────────────────────────────
  if (portalRoutingEnabled) {
    if (portal === "admin") {
      const isAdminAllowed =
        ADMIN_PORTAL_ALLOWED_PREFIXES.some((p) => path.startsWith(p)) ||
        path === "/" ||
        path === "/favicon.ico" ||
        /\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(path);

      if (!isAdminAllowed) {
        return new NextResponse(null, { status: 404 });
      }
      // Root on the admin subdomain → /admin (layout decides login vs dashboard).
      if (path === "/") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
    } else {
      // On tenant portal: bounce /admin/* over to the admin subdomain.
      if (path.startsWith("/admin") && adminHost) {
        const target = new URL(
          path + request.nextUrl.search,
          `${request.nextUrl.protocol}//${adminHost}`,
        );
        return NextResponse.redirect(target);
      }
    }
  }

  // ── Supabase session refresh ────────────────────────────────────────
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh session — do not put logic between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthPage = AUTH_PREFIXES.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    // Already authed visitors land on the portal's home, not a generic one.
    url.pathname = portal === "admin" ? "/admin" : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ── Layout-consumed headers + security defaults ────────────────────
  response.headers.set("x-pathname", path);
  response.headers.set("x-portal", portal);

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

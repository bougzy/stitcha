import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  checkRateLimit,
  RATE_LIMIT_GENERAL,
  RATE_LIMIT_AUTH,
  RATE_LIMIT_ADMIN,
} from "@/lib/rate-limit";

const protectedPaths = [
  "/dashboard",
  "/clients",
  "/orders",
  "/onboarding",
  "/settings",
  "/finances",
  "/billing",
  "/heartbeat",
  "/calendar",
  "/rank",
  "/style-vault",
];

const authPaths = ["/login", "/register", "/forgot-password"];

/** Add security headers to any response */
function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rate limiting for API routes ---
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const key = `${ip}:${pathname}`;

    // Choose rate limit tier based on route
    const isAuthRoute = pathname.startsWith("/api/auth") || pathname.startsWith("/api/admin/auth");
    const isAdminRoute = pathname.startsWith("/api/admin");
    const config = isAuthRoute ? RATE_LIMIT_AUTH : isAdminRoute ? RATE_LIMIT_ADMIN : RATE_LIMIT_GENERAL;

    const result = checkRateLimit(key, config);
    if (!result.allowed) {
      const res = NextResponse.json(
        { success: false, error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)));
      return withSecurityHeaders(res);
    }
  }

  // Allow public scan routes (client-facing scan pages)
  if (pathname.match(/^\/scan\/[^/]+$/)) {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || "stitcha-app-secret-key-2024-production-ready",
  });

  // Redirect authenticated users away from auth pages
  if (authPaths.some((path) => pathname.startsWith(path))) {
    if (token) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  // Protect dashboard routes (including /scan management page)
  if (protectedPaths.some((path) => pathname.startsWith(path)) || pathname === "/scan") {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/orders/:path*",
    "/scan/:path*",
    "/scan",
    "/onboarding/:path*",
    "/settings/:path*",
    "/finances/:path*",
    "/billing/:path*",
    "/heartbeat/:path*",
    "/calendar/:path*",
    "/rank/:path*",
    "/style-vault/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/api/:path*",
  ],
};

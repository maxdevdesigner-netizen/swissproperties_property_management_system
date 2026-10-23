import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// /api/cron checks its own bearer secret.
const PUBLIC_PATHS = ["/login", "/forgot-password", "/api/auth", "/api/health", "/api/cron"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", pathname + search);
  return NextResponse.redirect(login, 307);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|logo|uploads).*)"],
};

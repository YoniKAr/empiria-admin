import { auth0 } from "./lib/auth0";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // Only run auth0.middleware() for /auth/* routes (login, callback, logout).
  // For all other routes, pass through — avoids the SDK misinterpreting
  // query params or unnecessarily rolling sessions on every request.
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    try {
      return await auth0.middleware(request);
    } catch {
      // Clear stale session cookie and redirect to login
      const response = NextResponse.redirect(new URL("/auth/login", request.url));
      response.cookies.set("appSession", "", { maxAge: 0, path: "/" });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

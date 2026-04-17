import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/activity",
  "/investigate",
  "/coverage",
  "/ioc",
  "/reports",
  "/graph",
  "/correlation",
  "/analytics",
  "/audit",
  "/settings",
  "/snort",
  "/sigma",
  "/yara",
  "/feeds",
  "/servers",
  "/distribution",
  "/credits",
  "/workspace",
  "/customizer",
]

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasAuthCookie = Boolean(request.cookies.get("detective.identity")?.value)
  const creditsUnlocked = request.cookies.get("detective-credits-unlocked")?.value === "1"
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (isProtected && !hasAuthCookie) {
    const target = new URL("/auth", request.url)
    target.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(target)
  }

  if (pathname.startsWith("/credits") && !creditsUnlocked) {
    const target = new URL("/dashboard", request.url)
    return NextResponse.redirect(target)
  }

  if (pathname === "/auth" && hasAuthCookie) {
    const target = new URL("/dashboard", request.url)
    return NextResponse.redirect(target)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/auth",
    "/dashboard/:path*",
    "/activity/:path*",
    "/investigate/:path*",
    "/coverage/:path*",
    "/ioc/:path*",
    "/reports/:path*",
    "/graph/:path*",
    "/correlation/:path*",
    "/analytics/:path*",
    "/audit/:path*",
    "/settings/:path*",
    "/snort/:path*",
    "/sigma/:path*",
    "/yara/:path*",
    "/feeds/:path*",
    "/servers/:path*",
    "/distribution/:path*",
    "/credits/:path*",
    "/workspace/:path*",
    "/customizer/:path*",
  ],
}

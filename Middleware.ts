import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from "jose";
import {
  type UserRole,
  normalizeRole,
  SESSION_COOKIE_NAME,
  DEFAULT_AUTHENTICATED_REDIRECT,
  LOGIN_PATH,
  BLOCKED_PATH,
  UNAUTHORIZED_PATH,
  AUTH_BASE_PATHS,
  VERIFIED_USER_ID_HEADER,
  VERIFIED_USER_ROLE_HEADER,
  BLOCKED_CLAIM_KEY,
  ROLE_CLAIM_KEY,
} from "@/lib/server/constants";

/**
 * INDUSTRIAL LOGIC:
 * 1. Stateless Verification: Uses JWKS for rapid token validation.
 * 2. Path Prioritization: Matches longest path first to prevent 'over-matching'.
 * 3. Onboarding Pass-through: Ensures users without profiles aren't trapped in redirect loops.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!PROJECT_ID) {
  throw new Error("Critical Configuration Error: Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
}

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

type RouteRule = {
  protected: boolean;
  requiredRole?: UserRole;
  allowIncompleteProfile?: boolean; // New flag for onboarding safety
};

const ROUTE_RULES: Record<string, RouteRule> = {
  "/dashboard": { protected: true },
  "/onboarding": { protected: true, allowIncompleteProfile: true },
  "/provider/dashboard": { protected: true, requiredRole: "provider" },
  "/provider/register": { protected: true, requiredRole: "provider", allowIncompleteProfile: true },
  "/provider/document-upload": { protected: true, requiredRole: "provider" },
  "/provider/pending-verification": { protected: true, requiredRole: "provider", allowIncompleteProfile: true },
  "/provider/jobs": { protected: true, requiredRole: "provider" },
  "/provider/job": { protected: true, requiredRole: "provider" },
  "/provider/availability": { protected: true, requiredRole: "provider" },
  "/provider/earnings": { protected: true, requiredRole: "provider" },
  "/provider/notifications": { protected: true, requiredRole: "provider" },
  "/provider/hub": { protected: true, requiredRole: "provider" },
  "/provider/bank-details": { protected: true, requiredRole: "provider" },
  "/provider/profile": { protected: true, requiredRole: "provider" },
  // Add other routes as needed
};

/**
 * Matches the current path to the most specific rule available.
 */
function matchRoute(pathname: string): RouteRule | null {
  const routes = Object.keys(ROUTE_RULES);
  const bestMatch = routes
    .filter((route) => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];
  return bestMatch ? ROUTE_RULES[bestMatch] : null;
}

function clearSessionAndRedirect(request: NextRequest, destination: string) {
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0 }); // Industrial standard for clearing
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const matchedRule = matchRoute(pathname);

  // 1. PUBLIC ROUTE CHECK
  if (!matchedRule?.protected) {
    // If user is already logged in and hits login/signup, send to dashboard
    if (sessionCookie && AUTH_BASE_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url));
    }
    return NextResponse.next();
  }

  // 2. MISSING SESSION CHECK
  if (!sessionCookie) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. TOKEN VALIDATION
  try {
    const { payload } = await jwtVerify(sessionCookie, JWKS, {
      issuer: `https://session.firebase.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
      algorithms: ["RS256"],
    });

    if (payload[BLOCKED_CLAIM_KEY] === true) {
      return clearSessionAndRedirect(request, BLOCKED_PATH);
    }

    const role: UserRole = normalizeRole(payload[ROLE_CLAIM_KEY]);

    // 4. ROLE AUTHORIZATION
    if (matchedRule.requiredRole && role !== matchedRule.requiredRole) {
      return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url));
    }

    // 5. INJECT AUTH HEADERS FOR DOWNSTREAM APIS/COMPONENTS
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(VERIFIED_USER_ID_HEADER, payload.sub as string);
    requestHeaders.set(VERIFIED_USER_ROLE_HEADER, role);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });

  } catch (error) {
    if (error instanceof joseErrors.JWTExpired || error instanceof joseErrors.JWTInvalid) {
      console.warn("[Middleware] Auth Expired or Invalid");
      return clearSessionAndRedirect(request, LOGIN_PATH);
    }
    console.error("[Middleware] System Error:", error);
    return clearSessionAndRedirect(request, LOGIN_PATH);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types";

// =============================================================================
// Route protection middleware
// Handles: unauthenticated redirect, role-based route guarding
// =============================================================================

// ─── Route access rules ────────────────────────────────────────────────────
const ROUTE_RULES: Array<{
  pattern: RegExp;
  allowedRoles: UserRole[];
}> = [
  // Admin-only routes
  {
    pattern: /^\/api\/sync/,
    allowedRoles: ["admin"],
  },
  // Mentor routes — hidden from support_team
  {
    pattern: /^\/(dashboard\/)?mentors/,
    allowedRoles: ["admin", "academic_team"],
  },
  {
    pattern: /^\/api\/mentors/,
    allowedRoles: ["admin", "academic_team"],
  },
  // All other dashboard routes — all authenticated roles
  {
    pattern: /^\/(dashboard|courses|students|api\/)/,
    allowedRoles: ["admin", "academic_team", "support_team"],
  },
];

// ─── Public routes — skip auth check ──────────────────────────────────────
const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function getAllowedRoles(pathname: string): UserRole[] | null {
  for (const rule of ROUTE_RULES) {
    if (rule.pattern.test(pathname)) {
      return rule.allowedRoles;
    }
  }
  return null; // no specific rule — allow all authenticated
}

// =============================================================================
// Middleware function
// =============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without auth check
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ─── Create Supabase server client ──────────────────────────────────────
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // ─── Check session ───────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Check role from the users table ────────────────────────────────────
  // IMPORTANT: app_metadata.role is NOT populated anywhere in this app's auth
  // flow (login only updates last_login_at). Reading it here silently fell
  // back to "support_team" for every user, including admins. We query the
  // `users` table directly instead — RLS policy "Users can read own profile"
  // permits this for the authenticated caller.
  const { data: dbUser, error: roleError } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("supabase_uid", user.id)
    .single();

  if (roleError || !dbUser || !dbUser.is_active) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = dbUser.role as UserRole;

  const allowedRoles = getAllowedRoles(pathname);

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // For API routes: return 403
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { data: null, error: "Forbidden: insufficient role" },
        { status: 403 },
      );
    }
    // For page routes: redirect to dashboard with access denied flag
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("error", "access_denied");
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
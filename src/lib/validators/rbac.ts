import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userRepository } from "@/lib/repositories/user.repository";
import type { UserRole, AuthUser } from "@/types";
import { NextResponse } from "next/server";

// =============================================================================
// RBAC helpers for API route handlers
// =============================================================================

/**
 * Gets the authenticated user from the current session.
 * Returns null if not authenticated or user not found in our DB.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await userRepository.findBySupabaseUid(user.id);
  if (!dbUser || !dbUser.is_active) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    full_name: dbUser.full_name,
    role: dbUser.role,
  };
}

/**
 * Requires authentication and optionally a specific role.
 * Returns the auth user or a 401/403 NextResponse.
 */
export async function requireAuth(
  allowedRoles?: UserRole[],
): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const user = await getAuthUser();

  if (!user) {
    return {
      response: NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      response: NextResponse.json(
        { data: null, error: "Forbidden: insufficient role" },
        { status: 403 },
      ),
    };
  }

  return { user };
}

/**
 * Type guard to check if requireAuth returned a response (error) or user.
 */
export function isAuthError(
  result: { user: AuthUser } | { response: NextResponse },
): result is { response: NextResponse } {
  return "response" in result;
}

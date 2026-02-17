import { redirect } from "next/navigation";
import { auth0 } from "./auth0";
import { getSupabaseAdmin } from "./supabase";
import type { User } from "./types";

/**
 * Verifies the current session user is a platform admin.
 *
 * - Not logged in → redirect to /auth/login
 * - Logged in but no Supabase record → redirect to /unauthorized
 * - Logged in but role !== 'admin' → redirect to /unauthorized
 * - Admin → returns the full Supabase user row
 */
export async function requireAdmin(): Promise<User> {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const auth0Id = session.user.sub;
  const supabase = getSupabaseAdmin();

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth0_id", auth0Id)
    .is("deleted_at", null)
    .single();

  if (error || !user) {
    redirect("/unauthorized");
  }

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  return user as User;
}

/**
 * Non-redirecting version — returns null if not an admin.
 * Useful for conditional UI (e.g. the unauthorized page needs to know
 * who's logged in to show their role).
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return null;

    const supabase = getSupabaseAdmin();
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("auth0_id", session.user.sub)
      .is("deleted_at", null)
      .single();

    return (user as User) ?? null;
  } catch {
    return null;
  }
}

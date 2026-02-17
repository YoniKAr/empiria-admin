import { ShieldX, ArrowLeft, LogOut } from "lucide-react";
import { getSessionUser } from "@/lib/admin-guard";

export default async function UnauthorizedPage() {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Access Denied
        </h1>
        <p className="text-slate-500 mb-6">
          This dashboard is restricted to platform administrators only.
        </p>

        {/* User info if logged in */}
        {user && (
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-slate-500 mb-1">Signed in as</p>
            <p className="font-medium text-slate-900">
              {user.full_name || "Unnamed User"}
            </p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 capitalize">
                {user.role.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        )}

        {!user && (
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-500">
              You are not signed in, or your account was not found on the
              platform.
            </p>
          </div>
        )}

        {/* Help text */}
        <p className="text-xs text-slate-400 mb-8">
          If you believe this is a mistake, contact a platform administrator to
          have your account role updated.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {user ? (
            <>
              {/* Route them to the app for their role */}
              {user.role === "organizer" && (
                <a
                  href={
                    process.env.NEXT_PUBLIC_ORGANIZER_APP_URL ||
                    "https://organizer.empiriaindia.com"
                  }
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go to Organizer Dashboard
                </a>
              )}
              {user.role === "attendee" && (
                <a
                  href="https://profile.empiriaindia.com"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go to My Profile
                </a>
              )}
              <a
                href="/auth/logout"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </a>
            </>
          ) : (
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

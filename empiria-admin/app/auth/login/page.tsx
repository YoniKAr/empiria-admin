import { Shield } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Empiria Admin
        </h1>
        <p className="text-slate-500 mb-8">
          Sign in to access the platform administration dashboard.
        </p>
        <a
          href="/auth/login"
          className="inline-flex items-center justify-center w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Sign in with Auth0
        </a>
        <p className="text-xs text-slate-400 mt-6">
          Only users with admin privileges can access this dashboard.
        </p>
      </div>
    </div>
  );
}

import { requireAdmin } from "@/lib/admin-guard";
import ProfileForm from "./ProfileForm";

export default async function SettingsPage() {
  const admin = await requireAdmin();

  const parts = (admin.full_name || "").split(" ");
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";

  return (
    <div className="max-w-4xl w-full">
      <div className="flex items-center gap-8 border-b border-slate-200 mb-8 pt-2">
        <div className="pb-3 border-b-2 border-orange-500 text-orange-500 font-medium text-sm">
          Profile Details
        </div>
        <div className="pb-3 text-slate-500 font-medium text-sm hover:text-slate-800 cursor-pointer">
          Security
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[28px] font-bold text-[#1a1209]">Profile Information</h1>
        <div className="px-4 py-1.5 rounded-full border border-emerald-500 text-emerald-600 font-medium text-[13px] bg-emerald-50/50">
          Active
        </div>
      </div>
      <p className="text-slate-500 text-[15px] mb-12">Update your photo and personal details.</p>

      <ProfileForm
        firstName={firstName}
        lastName={lastName}
        email={admin.email}
        avatarUrl={admin.avatar_url || ""}
      />
    </div>
  );
}

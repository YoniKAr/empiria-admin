"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { updateAdminProfile } from "@/lib/actions";
import { User } from "lucide-react";

export default function ProfileForm({
  firstName: initialFirstName,
  lastName: initialLastName,
  email,
  avatarUrl,
}: {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  async function handleAction(formData: FormData) {
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateAdminProfile(formData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <form action={handleAction} className="space-y-12 pb-16">
      <div className="flex items-center gap-6">
        <div className="relative w-[88px] h-[88px] rounded-full overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Profile" fill className="object-cover" />
          ) : (
            <User className="w-10 h-10 text-slate-300" />
          )}
        </div>
        <div>
          <h3 className="font-bold text-[15px] text-[#1a1209] mb-2.5">Profile Photo</h3>
          <div className="flex items-center gap-4 text-[15px] font-medium">
            <button type="button" className="text-orange-500 hover:text-orange-600 transition-colors">Update</button>
            <button type="button" className="text-slate-500 hover:text-slate-700 transition-colors">Remove</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="flex flex-col gap-3">
          <label className="text-[12px] font-bold tracking-[0.08em] text-slate-400 uppercase">First Name</label>
          <input
            type="text"
            name="first_name"
            defaultValue={initialFirstName}
            className="w-full pb-3 border-b border-slate-200/80 focus:border-[#f98f1d] outline-none text-[#1a1209] text-[15px] placeholder-slate-300 bg-transparent transition-colors"
            placeholder="First"
          />
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-[12px] font-bold tracking-[0.08em] text-slate-400 uppercase">Last Name</label>
          <input
            type="text"
            name="last_name"
            defaultValue={initialLastName}
            className="w-full pb-3 border-b border-slate-200/80 focus:border-[#f98f1d] outline-none text-[#1a1209] text-[15px] placeholder-slate-300 bg-transparent transition-colors"
            placeholder="Last"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-100/50 pb-12">
        <label className="text-[12px] font-bold tracking-[0.08em] text-slate-400 uppercase">Email Address</label>
        <input
          type="email"
          defaultValue={email}
          readOnly
          className="w-full pb-3 border-b border-slate-200/80 outline-none text-slate-500 text-[15px] bg-transparent cursor-not-allowed"
        />
        <p className="text-[13px] text-slate-400 mt-1">Email cannot be changed here. Contact support if needed.</p>
      </div>

      <div className="flex justify-end items-center gap-4 pt-2">
        {success && <span className="text-emerald-500 text-[14px] font-medium">Saved tracking!</span>}
        <button
          type="submit"
          disabled={isPending}
          className="bg-[#f98f1d] hover:bg-[#ea8315] active:bg-[#db760d] text-white px-7 py-2.5 rounded-lg font-medium text-[15px] transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

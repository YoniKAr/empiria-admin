"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { updateAdminProfile, uploadAvatarImage } from "@/lib/actions";
import { User } from "lucide-react";

export default function ProfileForm({
  firstName: initialFirstName,
  lastName: initialLastName,
  email,
  avatarUrl: initialAvatarUrl,
}: {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(initialAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const result = await uploadAvatarImage(fd);

      if (!result.success) {
        setError(result.error);
      } else {
        setCurrentAvatarUrl(result.data.avatar_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handleAction(formData: FormData) {
    formData.set("avatar_url", currentAvatarUrl);
    setSuccess(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateAdminProfile(formData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save changes. Please try again.");
      }
    });
  }

  return (
    <form action={handleAction} className="space-y-12 pb-16">
      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative w-[88px] h-[88px] rounded-full overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
          {currentAvatarUrl ? (
            <Image src={currentAvatarUrl} alt="Profile" fill className="object-cover" />
          ) : (
            <User className="w-10 h-10 text-slate-300" />
          )}
        </div>
        <div>
          <h3 className="font-bold text-[15px] text-[#1a1209] mb-2.5">Profile Photo</h3>
          <div className="flex items-center gap-4 text-[15px] font-medium">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-orange-500 hover:text-orange-600 transition-colors disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Update"}
            </button>
            <button
              type="button"
              disabled={isUploading || !currentAvatarUrl}
              onClick={() => setCurrentAvatarUrl("")}
              className="text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Name */}
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

      {/* Email */}
      <div className="flex flex-col gap-3">
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
        {error && <span className="text-red-500 text-[14px] font-medium">{error}</span>}
        {success && <span className="text-emerald-500 text-[14px] font-medium">Changes saved!</span>}
        <button
          type="submit"
          disabled={isPending || isUploading}
          className="bg-[#f98f1d] hover:bg-[#ea8315] active:bg-[#db760d] text-white px-7 py-2.5 rounded-lg font-medium text-[15px] transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

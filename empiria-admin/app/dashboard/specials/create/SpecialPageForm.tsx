"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createCategoryPage,
  updateCategoryPage,
  uploadCategoryPageAsset,
} from "@/lib/actions";
import { Upload, FileText, X, Image as ImageIcon, Film } from "lucide-react";

interface SpecialPageFormProps {
  categories: Array<{ id: string; name: string; slug: string }>;
  existingPage?: {
    id: string;
    category_id: string;
    slug: string;
    title: string;
    hero_media_url: string | null;
    hero_media_type: "image" | "video";
    subtitle: string | null;
    description: string | null;
    pamphlet_url: string | null;
    events_bg_url: string | null;
    events_section_title: string | null;
  } | null;
}

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

export function SpecialPageForm({ categories, existingPage }: SpecialPageFormProps) {
  const router = useRouter();
  const isEditing = !!existingPage;

  const [categoryId, setCategoryId] = useState(existingPage?.category_id ?? "");
  const [title, setTitle] = useState(existingPage?.title ?? "");
  const [slug, setSlug] = useState(existingPage?.slug ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing);
  const [heroMediaType, setHeroMediaType] = useState<"image" | "video">(
    existingPage?.hero_media_type ?? "image"
  );
  const [heroImageUrl, setHeroImageUrl] = useState(
    existingPage?.hero_media_type === "image" ? (existingPage?.hero_media_url ?? "") : ""
  );
  const [heroVideoUrl, setHeroVideoUrl] = useState(
    existingPage?.hero_media_type === "video" ? (existingPage?.hero_media_url ?? "") : ""
  );
  const [subtitle, setSubtitle] = useState(existingPage?.subtitle ?? "");
  const [description, setDescription] = useState(existingPage?.description ?? "");
  const [pamphletUrl, setPamphletUrl] = useState(existingPage?.pamphlet_url ?? "");
  const [pamphletName, setPamphletName] = useState(
    existingPage?.pamphlet_url ? existingPage.pamphlet_url.split("/").pop() ?? "pamphlet.pdf" : ""
  );
  const [eventsBgUrl, setEventsBgUrl] = useState(existingPage?.events_bg_url ?? "");
  const [eventsSectionTitle, setEventsSectionTitle] = useState(
    existingPage?.events_section_title ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDraggingHero, setIsDraggingHero] = useState(false);
  const [isDraggingPamphlet, setIsDraggingPamphlet] = useState(false);
  const [isDraggingBg, setIsDraggingBg] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingPamphlet, setUploadingPamphlet] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  const heroInputRef = useRef<HTMLInputElement>(null);
  const pamphletInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // --- Helpers ---

  function generateSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(value);
  }

  async function handleUpload(file: File, assetType: string): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("asset_type", assetType);
    const res = await uploadCategoryPageAsset(fd);
    if (res.success) return res.data.url;
    setError(res.error);
    return null;
  }

  // --- Drag-and-drop handlers ---

  function makeDragHandlers(
    setDragging: (v: boolean) => void,
    onDrop: (file: File) => void
  ) {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      onDragEnter: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      },
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onDrop(file);
      },
    };
  }

  async function handleHeroImageUpload(file: File) {
    setUploadingHero(true);
    setError(null);
    const url = await handleUpload(file, "hero");
    if (url) setHeroImageUrl(url);
    setUploadingHero(false);
  }

  async function handlePamphletUpload(file: File) {
    setUploadingPamphlet(true);
    setError(null);
    const url = await handleUpload(file, "pamphlet");
    if (url) {
      setPamphletUrl(url);
      setPamphletName(file.name);
    }
    setUploadingPamphlet(false);
  }

  async function handleBgUpload(file: File) {
    setUploadingBg(true);
    setError(null);
    const url = await handleUpload(file, "bg");
    if (url) setEventsBgUrl(url);
    setUploadingBg(false);
  }

  const heroDragHandlers = makeDragHandlers(setIsDraggingHero, handleHeroImageUpload);
  const pamphletDragHandlers = makeDragHandlers(setIsDraggingPamphlet, handlePamphletUpload);
  const bgDragHandlers = makeDragHandlers(setIsDraggingBg, handleBgUpload);

  // --- Submit ---

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = {
      category_id: categoryId,
      title: title.trim(),
      slug: slug.trim(),
      hero_media_type: heroMediaType,
      hero_media_url: heroMediaType === "image" ? heroImageUrl || null : heroVideoUrl || null,
      subtitle: subtitle || null,
      description: description || null,
      pamphlet_url: pamphletUrl || null,
      events_bg_url: eventsBgUrl || null,
      events_section_title: eventsSectionTitle || null,
    };

    try {
      const res = isEditing
        ? await updateCategoryPage(existingPage!.id, form)
        : await createCategoryPage(form);

      if (!res.success) {
        setError(res.error);
        setSaving(false);
        return;
      }

      router.push("/dashboard/specials");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  // --- Embed preview ---

  const embedUrl = heroMediaType === "video" && heroVideoUrl ? getEmbedUrl(heroVideoUrl) : null;

  // --- Input class names ---

  const inputClass =
    "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white";

  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 max-w-2xl">
        {/* Category */}
        <div>
          <label className={labelClass}>
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">Select a category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className={labelClass}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="e.g. Summer Music Festival"
            className={inputClass}
          />
        </div>

        {/* Slug */}
        <div>
          <label className={labelClass}>Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            className={`${inputClass} font-mono`}
            placeholder="auto-generated-from-title"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Will be available at{" "}
            <span className="font-mono text-slate-500">/specials/{slug || "..."}</span>
          </p>
        </div>

        {/* Hero Media Type */}
        <div>
          <label className={labelClass}>Hero Media Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setHeroMediaType("image")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                heroMediaType === "image"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Image
            </button>
            <button
              type="button"
              onClick={() => setHeroMediaType("video")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                heroMediaType === "video"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Film className="w-4 h-4" />
              Video
            </button>
          </div>
        </div>

        {/* Hero Image Upload */}
        {heroMediaType === "image" && (
          <div>
            <label className={labelClass}>Hero Image</label>
            {heroImageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={heroImageUrl}
                  alt="Hero preview"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setHeroImageUrl("")}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            ) : (
              <div
                {...heroDragHandlers}
                onClick={() => heroInputRef.current?.click()}
                className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isDraggingHero
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-slate-200 hover:border-indigo-500/50"
                }`}
              >
                {uploadingHero ? (
                  <p className="text-sm text-slate-500">Uploading...</p>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">
                      Drag and drop an image, or click to browse
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      JPEG, PNG, WebP, or GIF
                    </p>
                  </>
                )}
              </div>
            )}
            <input
              ref={heroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleHeroImageUpload(file);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {/* Hero Video URL */}
        {heroMediaType === "video" && (
          <div>
            <label className={labelClass}>Hero Video URL</label>
            <input
              type="url"
              value={heroVideoUrl}
              onChange={(e) => setHeroVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              className={inputClass}
            />
            {embedUrl && (
              <div className="mt-3 rounded-xl overflow-hidden border border-slate-200">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={embedUrl}
                    title="Video preview"
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subtitle */}
        <div>
          <label className={labelClass}>Subtitle</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Optional subtitle"
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Optional description"
            className={inputClass}
          />
        </div>

        {/* PDF Pamphlet */}
        <div>
          <label className={labelClass}>PDF Pamphlet</label>
          {pamphletUrl ? (
            <div className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl bg-slate-50">
              <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <span className="text-sm text-slate-700 truncate flex-1">
                {pamphletName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPamphletUrl("");
                  setPamphletName("");
                }}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          ) : (
            <div
              {...pamphletDragHandlers}
              onClick={() => pamphletInputRef.current?.click()}
              className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDraggingPamphlet
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-200 hover:border-indigo-500/50"
              }`}
            >
              {uploadingPamphlet ? (
                <p className="text-sm text-slate-500">Uploading...</p>
              ) : (
                <>
                  <FileText className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">
                    Drag and drop a PDF, or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-1">PDF files only</p>
                </>
              )}
            </div>
          )}
          <input
            ref={pamphletInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePamphletUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Events Background Image */}
        <div>
          <label className={labelClass}>Events Background Image</label>
          {eventsBgUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img
                src={eventsBgUrl}
                alt="Background preview"
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={() => setEventsBgUrl("")}
                className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          ) : (
            <div
              {...bgDragHandlers}
              onClick={() => bgInputRef.current?.click()}
              className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDraggingBg
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-200 hover:border-indigo-500/50"
              }`}
            >
              {uploadingBg ? (
                <p className="text-sm text-slate-500">Uploading...</p>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">
                    Drag and drop an image, or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    JPEG, PNG, WebP, or GIF
                  </p>
                </>
              )}
            </div>
          )}
          <input
            ref={bgInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleBgUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Events Section Title */}
        <div>
          <label className={labelClass}>Events Section Title</label>
          <input
            type="text"
            value={eventsSectionTitle}
            onChange={(e) => setEventsSectionTitle(e.target.value)}
            placeholder={
              selectedCategory
                ? `${selectedCategory.name} Events`
                : "{category name} Events"
            }
            className={inputClass}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || uploadingHero || uploadingPamphlet || uploadingBg}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Special Page"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/specials")}
            className="px-6 py-2.5 text-slate-600 text-sm font-medium hover:text-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Search, Trash2, Image as ImageIcon, Film, Award, X } from "lucide-react";
import { deleteEventMedia, getEventMedia, type EventMediaItem } from "@/lib/actions";

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  cover: { label: "Cover", color: "#2563eb", bg: "#eff6ff" },
  gallery: { label: "Gallery", color: "#059669", bg: "#ecfdf5" },
  sponsor: { label: "Sponsor", color: "#d97706", bg: "#fffbeb" },
  trailer: { label: "Trailer", color: "#7c3aed", bg: "#f5f3ff" },
};

const TYPE_ICONS: Record<string, typeof ImageIcon> = {
  cover: ImageIcon,
  gallery: ImageIcon,
  sponsor: Award,
  trailer: Film,
};

export function MediaManagerClient({
  initialMedia,
}: {
  initialMedia: EventMediaItem[];
}) {
  const [media, setMedia] = useState(initialMedia);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<EventMediaItem | null>(null);

  const filtered = media.filter((item) => {
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesSearch =
      !search ||
      item.eventTitle.toLowerCase().includes(search.toLowerCase()) ||
      item.url.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const typeCounts = media.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleDelete = async (item: EventMediaItem) => {
    const key = `${item.eventId}-${item.type}-${item.index ?? item.url}`;
    setDeleting(key);
    try {
      const res = await deleteEventMedia({
        eventId: item.eventId,
        type: item.type,
        url: item.url,
        index: item.index,
      });
      if (res.success) {
        setMedia((prev) =>
          prev.filter(
            (m) =>
              !(
                m.eventId === item.eventId &&
                m.type === item.type &&
                m.url === item.url
              )
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await getEventMedia();
      setMedia(fresh);
    } catch {
      // silently fail
    } finally {
      setRefreshing(false);
    }
  };

  const getVideoEmbed = (url: string) => {
    const ytMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch)
      return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event name..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>

        <div className="flex gap-1.5">
          {[
            { value: "all", label: `All (${media.length})` },
            { value: "cover", label: `Cover (${typeCounts.cover || 0})` },
            { value: "gallery", label: `Gallery (${typeCounts.gallery || 0})` },
            { value: "sponsor", label: `Sponsor (${typeCounts.sponsor || 0})` },
            { value: "trailer", label: `Trailer (${typeCounts.trailer || 0})` },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === opt.value
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Media Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ImageIcon className="size-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            {search || typeFilter !== "all"
              ? "No media matches your filters."
              : "No media found across events."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item, idx) => {
            const key = `${item.eventId}-${item.type}-${item.index ?? idx}`;
            const isDeleting =
              deleting === `${item.eventId}-${item.type}-${item.index ?? item.url}`;
            const typeInfo = TYPE_LABELS[item.type];
            const Icon = TYPE_ICONS[item.type] || ImageIcon;

            return (
              <div
                key={key}
                className={`group relative bg-white rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-md ${
                  isDeleting ? "opacity-50" : ""
                }`}
              >
                {/* Media Preview */}
                <div className="aspect-[4/3] relative bg-slate-100">
                  {item.type === "trailer" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/5">
                      {getVideoEmbed(item.url) ? (
                        <img
                          src={getVideoEmbed(item.url)!}
                          alt="Video thumbnail"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <>
                          <Film className="size-8 text-slate-400" />
                          <span className="text-xs text-slate-500 px-2 text-center truncate w-full">
                            {item.url}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={`${item.type} for ${item.eventTitle}`}
                      className={`h-full w-full ${
                        item.type === "sponsor" ? "object-contain p-3" : "object-cover"
                      }`}
                      loading="lazy"
                    />
                  )}

                  {/* Type badge */}
                  <span
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                    style={{
                      backgroundColor: typeInfo.bg,
                      color: typeInfo.color,
                    }}
                  >
                    {typeInfo.label}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={() => setConfirmDelete(item)}
                    disabled={isDeleting}
                    className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 hover:bg-red-700 disabled:opacity-50"
                    title="Delete media"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {/* Event Info */}
                <div className="p-3">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {item.eventTitle}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {item.eventSlug}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Delete Media
              </h3>
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-4">
              {confirmDelete.type !== "trailer" ? (
                <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 mb-3">
                  <img
                    src={confirmDelete.url}
                    alt="Preview"
                    className={`h-full w-full ${
                      confirmDelete.type === "sponsor"
                        ? "object-contain p-4"
                        : "object-cover"
                    }`}
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 mb-3 flex items-center justify-center">
                  <Film className="size-10 text-slate-300" />
                </div>
              )}
              <p className="text-sm text-slate-600">
                Remove this{" "}
                <span className="font-semibold">
                  {TYPE_LABELS[confirmDelete.type].label.toLowerCase()}
                </span>{" "}
                from{" "}
                <span className="font-semibold">
                  {confirmDelete.eventTitle}
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={!!deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { getEventMedia } from "@/lib/actions";
import { MediaManagerClient } from "./MediaManagerClient";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const media = await getEventMedia();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Media</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage and moderate event images, sponsor logos, and video embeds across all events.
        </p>
      </div>

      <MediaManagerClient initialMedia={media} />
    </div>
  );
}

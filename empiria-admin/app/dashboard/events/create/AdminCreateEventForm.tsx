"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminCreateEvent } from "./actions";

interface Category {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
}

interface OccurrenceInput {
    id: string;
    starts_at: string;
    ends_at: string;
    label: string;
}

interface TierInput {
    id: string;
    name: string;
    price: number;
    quantity: number;
    max_per_order: number;
}

interface SplitInput {
    id: string;
    recipientEmail: string;
    percentage: number;
    description: string;
}

export default function AdminCreateEventForm({
    categories,
    adminAuthId,
}: {
    categories: Category[];
    adminAuthId: string;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Basic fields
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [currency, setCurrency] = useState("cad");
    const [status, setStatus] = useState<"draft" | "published">("draft");

    // Venue
    const [venueName, setVenueName] = useState("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("CA");
    const [addressText, setAddressText] = useState("");

    // Occurrences
    const [occurrences, setOccurrences] = useState<OccurrenceInput[]>([
        { id: crypto.randomUUID(), starts_at: "", ends_at: "", label: "" },
    ]);

    // Ticket Tiers
    const [tiers, setTiers] = useState<TierInput[]>([
        { id: crypto.randomUUID(), name: "General Admission", price: 0, quantity: 100, max_per_order: 10 },
    ]);

    // Revenue Splits (optional)
    const [splits, setSplits] = useState<SplitInput[]>([]);

    // Auto-generate slug from title
    const handleTitleChange = (value: string) => {
        setTitle(value);
        setSlug(
            value
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .slice(0, 80)
        );
    };

    // Occurrence management
    const addOccurrence = () => {
        setOccurrences([
            ...occurrences,
            { id: crypto.randomUUID(), starts_at: "", ends_at: "", label: "" },
        ]);
    };

    const removeOccurrence = (id: string) => {
        if (occurrences.length > 1) {
            setOccurrences(occurrences.filter((o) => o.id !== id));
        }
    };

    const updateOccurrence = (id: string, field: keyof OccurrenceInput, value: string) => {
        setOccurrences(occurrences.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
    };

    // Tier management
    const addTier = () => {
        setTiers([
            ...tiers,
            { id: crypto.randomUUID(), name: "", price: 0, quantity: 100, max_per_order: 10 },
        ]);
    };

    const removeTier = (id: string) => {
        if (tiers.length > 1) {
            setTiers(tiers.filter((t) => t.id !== id));
        }
    };

    const updateTier = (id: string, field: keyof TierInput, value: string | number) => {
        setTiers(tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    };

    // Split management
    const addSplit = () => {
        setSplits([
            ...splits,
            { id: crypto.randomUUID(), recipientEmail: "", percentage: 0, description: "" },
        ]);
    };

    const removeSplit = (id: string) => {
        setSplits(splits.filter((s) => s.id !== id));
    };

    const updateSplit = (id: string, field: keyof SplitInput, value: string | number) => {
        setSplits(splits.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await adminCreateEvent({
                title,
                slug,
                description,
                categoryId: categoryId || null,
                currency,
                status,
                venueName,
                city,
                country,
                addressText,
                occurrences: occurrences.map((o) => ({
                    starts_at: o.starts_at,
                    ends_at: o.ends_at,
                    label: o.label,
                })),
                tiers: tiers.map((t) => ({
                    name: t.name,
                    price: t.price,
                    quantity: t.quantity,
                    max_per_order: t.max_per_order,
                })),
                splits: splits
                    .filter((s) => s.recipientEmail && s.percentage > 0)
                    .map((s) => ({
                        recipientEmail: s.recipientEmail,
                        percentage: s.percentage,
                        description: s.description,
                    })),
            });

            if (!result.success) {
                setError(result.error);
                return;
            }

            router.push(`/dashboard/events/${result.data.id}`);
        } catch (err: any) {
            setError(err.message || "Failed to create event");
        } finally {
            setLoading(false);
        }
    };

    const activeCategories = categories.filter((c) => c.is_active);

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Event title"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Event description"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        >
                            <option value="">Select category</option>
                            {activeCategories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        >
                            <option value="cad">CAD</option>
                            <option value="usd">USD</option>
                            <option value="eur">EUR</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                    </select>
                </div>
            </div>

            {/* Venue */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Venue</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Venue Name</label>
                        <input
                            type="text"
                            value={venueName}
                            onChange={(e) => setVenueName(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            placeholder="Venue name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            placeholder="City"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                        <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        >
                            <option value="CA">Canada</option>
                            <option value="US">United States</option>
                            <option value="FR">France</option>
                            <option value="DE">Germany</option>
                            <option value="ES">Spain</option>
                            <option value="IT">Italy</option>
                            <option value="NL">Netherlands</option>
                            <option value="BE">Belgium</option>
                            <option value="AT">Austria</option>
                            <option value="IE">Ireland</option>
                            <option value="PT">Portugal</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                        <input
                            type="text"
                            value={addressText}
                            onChange={(e) => setAddressText(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            placeholder="Full address"
                        />
                    </div>
                </div>
            </div>

            {/* Dates/Occurrences */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Dates</h2>
                    <button type="button" onClick={addOccurrence} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                        + Add Date
                    </button>
                </div>
                {occurrences.map((occ, i) => (
                    <div key={occ.id} className="grid grid-cols-3 gap-3 items-end border-b border-slate-100 pb-4 last:border-0">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Start</label>
                            <input
                                type="datetime-local"
                                value={occ.starts_at}
                                onChange={(e) => updateOccurrence(occ.id, "starts_at", e.target.value)}
                                required
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">End</label>
                            <input
                                type="datetime-local"
                                value={occ.ends_at}
                                onChange={(e) => updateOccurrence(occ.id, "ends_at", e.target.value)}
                                required
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Label</label>
                                <input
                                    type="text"
                                    value={occ.label}
                                    onChange={(e) => updateOccurrence(occ.id, "label", e.target.value)}
                                    placeholder="e.g. Day 1"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                            </div>
                            {occurrences.length > 1 && (
                                <button type="button" onClick={() => removeOccurrence(occ.id)} className="text-red-500 hover:text-red-700 px-2 py-2">
                                    &times;
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Ticket Tiers */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Ticket Tiers</h2>
                    <button type="button" onClick={addTier} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                        + Add Tier
                    </button>
                </div>
                {tiers.map((tier) => (
                    <div key={tier.id} className="grid grid-cols-4 gap-3 items-end border-b border-slate-100 pb-4 last:border-0">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                            <input
                                type="text"
                                value={tier.name}
                                onChange={(e) => updateTier(tier.id, "name", e.target.value)}
                                required
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="Tier name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Price</label>
                            <input
                                type="number"
                                value={tier.price}
                                onChange={(e) => updateTier(tier.id, "price", parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.01}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                            <input
                                type="number"
                                value={tier.quantity}
                                onChange={(e) => updateTier(tier.id, "quantity", parseInt(e.target.value) || 0)}
                                min={1}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Max/Order</label>
                                <input
                                    type="number"
                                    value={tier.max_per_order}
                                    onChange={(e) => updateTier(tier.id, "max_per_order", parseInt(e.target.value) || 1)}
                                    min={1}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                            </div>
                            {tiers.length > 1 && (
                                <button type="button" onClick={() => removeTier(tier.id)} className="text-red-500 hover:text-red-700 px-2 py-2">
                                    &times;
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Revenue Splits (Optional) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Revenue Splits</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Optional — assign revenue shares to organizers</p>
                    </div>
                    <button type="button" onClick={addSplit} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                        + Add Split
                    </button>
                </div>
                {splits.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No revenue splits configured. All revenue goes to the platform.</p>
                )}
                {splits.map((split) => (
                    <div key={split.id} className="grid grid-cols-3 gap-3 items-end border-b border-slate-100 pb-4 last:border-0">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Recipient Email</label>
                            <input
                                type="email"
                                value={split.recipientEmail}
                                onChange={(e) => updateSplit(split.id, "recipientEmail", e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="organizer@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Percentage (%)</label>
                            <input
                                type="number"
                                value={split.percentage}
                                onChange={(e) => updateSplit(split.id, "percentage", parseFloat(e.target.value) || 0)}
                                min={0}
                                max={100}
                                step={0.1}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={split.description}
                                    onChange={(e) => updateSplit(split.id, "description", e.target.value)}
                                    placeholder="Role / reason"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <button type="button" onClick={() => removeSplit(split.id)} className="text-red-500 hover:text-red-700 px-2 py-2">
                                &times;
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.push("/dashboard/events")}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading || !title || !slug}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? "Creating..." : "Create Event"}
                </button>
            </div>
        </form>
    );
}

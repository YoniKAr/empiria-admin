"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { getSupabaseAdmin } from "@/lib/supabase";

type ActionResult<T = unknown> =
    | { success: true; data: T }
    | { success: false; error: string };

export async function adminCreateEvent(input: {
    title: string;
    slug: string;
    description: string;
    categoryId: string | null;
    currency: string;
    status: "draft" | "published";
    venueName: string;
    city: string;
    country: string;
    addressText: string;
    occurrences: Array<{ starts_at: string; ends_at: string; label: string }>;
    tiers: Array<{ name: string; price: number; quantity: number; max_per_order: number }>;
    splits: Array<{ recipientEmail: string; percentage: number; description: string }>;
}): Promise<ActionResult<{ id: string }>> {
    const admin = await requireAdmin();
    const supabase = getSupabaseAdmin();

    // Validate slug uniqueness
    const { data: existingEvent } = await supabase
        .from("events")
        .select("id")
        .eq("slug", input.slug)
        .maybeSingle();

    if (existingEvent) {
        return { success: false, error: "An event with this slug already exists" };
    }

    // Calculate total capacity
    const totalCapacity = input.tiers.reduce((sum, t) => sum + t.quantity, 0);

    // Create the event
    const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
            organizer_id: admin.auth0_id,
            title: input.title,
            slug: input.slug,
            description: input.description ? { text: input.description } : null,
            category_id: input.categoryId || null,
            currency: input.currency,
            status: input.status,
            location_type: "physical",
            venue_name: input.venueName || null,
            city: input.city || null,
            country: input.country || null,
            address_text: input.addressText || null,
            seating_type: "general_admission",
            seating_config: {},
            total_capacity: totalCapacity,
            total_tickets_sold: 0,
            platform_fee_percent: 5,
            platform_fee_fixed: 0,
            source_app: "admin",
        })
        .select("id")
        .single();

    if (eventError || !event) {
        console.error("Admin event creation error:", eventError);
        return { success: false, error: eventError?.message || "Failed to create event" };
    }

    // Create occurrences
    for (const occ of input.occurrences) {
        if (!occ.starts_at || !occ.ends_at) continue;
        const { error: occError } = await supabase.from("event_occurrences").insert({
            event_id: event.id,
            starts_at: new Date(occ.starts_at).toISOString(),
            ends_at: new Date(occ.ends_at).toISOString(),
            label: occ.label || null,
        });
        if (occError) {
            console.error("Occurrence creation error:", occError);
        }
    }

    // Create ticket tiers
    for (const tier of input.tiers) {
        const { error: tierError } = await supabase.from("ticket_tiers").insert({
            event_id: event.id,
            name: tier.name,
            price: tier.price,
            currency: input.currency,
            initial_quantity: tier.quantity,
            remaining_quantity: tier.quantity,
            max_per_order: tier.max_per_order,
        });
        if (tierError) {
            console.error("Tier creation error:", tierError);
        }
    }

    // Create revenue splits (optional)
    for (const split of input.splits) {
        // Look up recipient by email
        const { data: recipient } = await supabase
            .from("users")
            .select("auth0_id, stripe_account_id")
            .eq("email", split.recipientEmail.toLowerCase())
            .single();

        if (recipient) {
            const { error: splitError } = await supabase.from("revenue_splits").insert({
                event_id: event.id,
                recipient_user_id: recipient.auth0_id,
                recipient_stripe_id: recipient.stripe_account_id,
                percentage: split.percentage,
                source_type: "net_revenue",
                description: split.description || null,
            });
            if (splitError) {
                console.error("Split creation error:", splitError);
            }
        }
    }

    revalidatePath("/dashboard/events");
    return { success: true, data: { id: event.id } };
}

import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  // Verify admin
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: adminUser } = await supabase
    .from("users")
    .select("role")
    .eq("auth0_id", session.user.sub)
    .single();

  if (!adminUser || adminUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    // ─── Categories ───
    const categoryNames = [
      "Music",
      "Technology",
      "Food & Drink",
      "Sports",
      "Arts & Culture",
      "Business",
      "Education",
      "Health & Wellness",
    ];
    const categoryRows = categoryNames.map((name) => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      is_active: true,
    }));
    const { data: categories } = await supabase
      .from("categories")
      .upsert(categoryRows, { onConflict: "slug" })
      .select();

    const catMap = new Map((categories ?? []).map((c: any) => [c.slug, c.id]));

    // ─── Organizer users ───
    const organizers = [
      {
        auth0_id: "auth0|seed_org_priya",
        email: "priya@example.com",
        full_name: "Priya Sharma",
        role: "organizer",
        stripe_account_id: "acct_seed_priya",
        stripe_onboarding_completed: true,
        default_currency: "cad",
      },
      {
        auth0_id: "auth0|seed_org_marcus",
        email: "marcus@example.com",
        full_name: "Marcus Chen",
        role: "organizer",
        stripe_account_id: "acct_seed_marcus",
        stripe_onboarding_completed: true,
        default_currency: "usd",
      },
      {
        auth0_id: "auth0|seed_org_anika",
        email: "anika@example.com",
        full_name: "Anika Patel",
        role: "organizer",
        stripe_account_id: "acct_seed_anika",
        stripe_onboarding_completed: true,
        default_currency: "inr",
      },
    ];

    // ─── Attendee users ───
    const attendees = [
      { auth0_id: "auth0|seed_att_1", email: "alice@example.com", full_name: "Alice Johnson", role: "attendee" },
      { auth0_id: "auth0|seed_att_2", email: "bob@example.com", full_name: "Bob Williams", role: "attendee" },
      { auth0_id: "auth0|seed_att_3", email: "carol@example.com", full_name: "Carol Martinez", role: "attendee" },
      { auth0_id: "auth0|seed_att_4", email: "dave@example.com", full_name: "Dave Kim", role: "attendee" },
      { auth0_id: "auth0|seed_att_5", email: "emma@example.com", full_name: "Emma Singh", role: "attendee" },
    ];

    await supabase.from("users").upsert([...organizers, ...attendees], { onConflict: "auth0_id" });

    // ─── Events ───
    const now = new Date();
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

    const eventsData = [
      {
        organizer_id: "auth0|seed_org_priya",
        title: "Toronto Jazz Festival 2026",
        slug: "toronto-jazz-festival-2026",
        category_id: catMap.get("music"),
        start_at: daysFromNow(30),
        end_at: daysFromNow(32),
        venue_name: "Nathan Phillips Square",
        city: "Toronto",
        status: "published",
        is_featured: true,
        platform_fee_percent: 5,
        currency: "cad",
        total_capacity: 500,
        source_app: "organizer.empiriaindia.com",
      },
      {
        organizer_id: "auth0|seed_org_priya",
        title: "Startup Pitch Night - Vancouver",
        slug: "startup-pitch-night-vancouver",
        category_id: catMap.get("business"),
        start_at: daysFromNow(14),
        end_at: daysFromNow(14),
        venue_name: "Convention Centre West",
        city: "Vancouver",
        status: "published",
        platform_fee_percent: 5,
        currency: "cad",
        total_capacity: 200,
        source_app: "organizer.empiriaindia.com",
      },
      {
        organizer_id: "auth0|seed_org_marcus",
        title: "AI & Machine Learning Summit",
        slug: "ai-ml-summit-sf",
        category_id: catMap.get("technology"),
        start_at: daysFromNow(45),
        end_at: daysFromNow(46),
        venue_name: "Moscone Center",
        city: "San Francisco",
        status: "published",
        is_featured: true,
        platform_fee_percent: 5,
        currency: "usd",
        total_capacity: 1000,
        source_app: "organizer.empiriaindia.com",
      },
      {
        organizer_id: "auth0|seed_org_marcus",
        title: "Street Food Festival SF",
        slug: "street-food-festival-sf",
        category_id: catMap.get("food---drink"),
        start_at: daysAgo(10),
        end_at: daysAgo(9),
        venue_name: "Ferry Building",
        city: "San Francisco",
        status: "completed",
        platform_fee_percent: 5,
        currency: "usd",
        total_capacity: 300,
        source_app: "organizer.empiriaindia.com",
      },
      {
        organizer_id: "auth0|seed_org_anika",
        title: "Mumbai Tech Meetup",
        slug: "mumbai-tech-meetup",
        category_id: catMap.get("technology"),
        start_at: daysFromNow(7),
        end_at: daysFromNow(7),
        venue_name: "BKC Tech Hub",
        city: "Mumbai",
        status: "published",
        platform_fee_percent: 3,
        currency: "inr",
        total_capacity: 150,
        source_app: "organizer.empiriaindia.com",
      },
      {
        organizer_id: "auth0|seed_org_anika",
        title: "Delhi Food Crawl",
        slug: "delhi-food-crawl",
        category_id: catMap.get("food---drink"),
        start_at: daysFromNow(20),
        end_at: daysFromNow(20),
        venue_name: "Chandni Chowk",
        city: "Delhi",
        status: "draft",
        platform_fee_percent: 3,
        currency: "inr",
        total_capacity: 50,
        source_app: "organizer.empiriaindia.com",
      },
      {
        organizer_id: "auth0|seed_org_priya",
        title: "Cancelled Yoga Retreat",
        slug: "cancelled-yoga-retreat",
        category_id: catMap.get("health---wellness"),
        start_at: daysFromNow(60),
        end_at: daysFromNow(62),
        venue_name: "Banff Springs",
        city: "Banff",
        status: "cancelled",
        platform_fee_percent: 5,
        currency: "cad",
        total_capacity: 30,
        source_app: "organizer.empiriaindia.com",
      },
    ];

    const { data: events } = await supabase
      .from("events")
      .upsert(eventsData, { onConflict: "slug" })
      .select();

    const eventMap = new Map((events ?? []).map((e: any) => [e.slug, e]));

    // ─── Ticket Tiers ───
    const tierRows: any[] = [];
    for (const [slug, event] of eventMap.entries()) {
      const ev = event as any;
      if (ev.currency === "inr") {
        tierRows.push(
          { event_id: ev.id, name: "General", price: 500, currency: "inr", initial_quantity: 100, remaining_quantity: 80, max_per_order: 5 },
          { event_id: ev.id, name: "VIP", price: 2000, currency: "inr", initial_quantity: 20, remaining_quantity: 15, max_per_order: 2 }
        );
      } else {
        const base = ev.currency === "usd" ? 25 : 30;
        tierRows.push(
          { event_id: ev.id, name: "Early Bird", price: base, currency: ev.currency, initial_quantity: 100, remaining_quantity: 60, max_per_order: 5 },
          { event_id: ev.id, name: "General Admission", price: base * 2, currency: ev.currency, initial_quantity: 200, remaining_quantity: 150, max_per_order: 10 },
          { event_id: ev.id, name: "VIP", price: base * 5, currency: ev.currency, initial_quantity: 50, remaining_quantity: 40, max_per_order: 2 }
        );
      }
    }

    // Delete existing tiers for these events to avoid duplicates
    const eventIds = Array.from(eventMap.values()).map((e: any) => e.id);
    await supabase.from("ticket_tiers").delete().in("event_id", eventIds);
    const { data: tiers } = await supabase.from("ticket_tiers").insert(tierRows).select();

    // ─── Orders and Tickets ───
    const attIds = attendees.map((a) => a.auth0_id);
    const orderRows: any[] = [];
    const ticketRows: any[] = [];

    const publishedEvents = (events ?? []).filter(
      (e: any) => e.status === "published" || e.status === "completed"
    );

    let orderIndex = 0;
    for (const event of publishedEvents as any[]) {
      const eventTiers = (tiers ?? []).filter((t: any) => t.event_id === event.id);
      if (eventTiers.length === 0) continue;

      // Generate 3-6 orders per event
      const numOrders = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numOrders; i++) {
        const buyerId = attIds[orderIndex % attIds.length];
        const tier = eventTiers[i % eventTiers.length] as any;
        const qty = 1 + Math.floor(Math.random() * 3);
        const subtotal = Number(tier.price) * qty;
        const fee = Math.round(subtotal * (event.platform_fee_percent / 100) * 100) / 100;
        const payout = subtotal - fee;
        const daysBack = Math.floor(Math.random() * 60);

        const orderPlaceholder = {
          user_id: buyerId,
          event_id: event.id,
          stripe_payment_intent_id: `pi_seed_${orderIndex}`,
          stripe_checkout_session_id: `cs_seed_${orderIndex}`,
          total_amount: subtotal,
          platform_fee_amount: fee,
          organizer_payout_amount: payout,
          currency: event.currency,
          status: "completed",
          source_app: "shop.empiriaindia.com",
          created_at: daysAgo(daysBack),
        };
        orderRows.push(orderPlaceholder);

        // We'll create tickets after we have order IDs
        for (let t = 0; t < qty; t++) {
          ticketRows.push({
            _order_index: orderIndex,
            event_id: event.id,
            tier_id: tier.id,
            user_id: buyerId,
            attendee_name: attendees.find((a) => a.auth0_id === buyerId)?.full_name ?? "Unknown",
            attendee_email: attendees.find((a) => a.auth0_id === buyerId)?.email,
            status: event.status === "completed" ? "used" : "valid",
          });
        }

        orderIndex++;
      }
    }

    // Clean up existing seed orders
    await supabase.from("orders").delete().like("stripe_payment_intent_id", "pi_seed_%");

    const { data: insertedOrders } = await supabase.from("orders").insert(orderRows).select();

    // Now create order_items and tickets with real order IDs
    if (insertedOrders) {
      const orderItemRows: any[] = [];
      const finalTicketRows: any[] = [];

      for (let i = 0; i < insertedOrders.length; i++) {
        const order = insertedOrders[i] as any;
        const relatedTix = ticketRows.filter((t) => (t as any)._order_index === i);
        const tier = relatedTix[0] as any;

        if (tier) {
          orderItemRows.push({
            order_id: order.id,
            tier_id: tier.tier_id,
            quantity: relatedTix.length,
            unit_price: Number(order.total_amount) / relatedTix.length,
            subtotal: order.total_amount,
          });
        }

        for (const t of relatedTix) {
          const { _order_index, ...ticketData } = t as any;
          finalTicketRows.push({ ...ticketData, order_id: order.id });
        }
      }

      await supabase.from("order_items").insert(orderItemRows);

      // Disable the trigger temporarily by inserting tickets directly
      // (The trigger would fail because these are seed events without proper stock)
      // Instead we update remaining_quantity manually
      await supabase.from("tickets").insert(finalTicketRows);

      // Update total_tickets_sold on events
      for (const event of publishedEvents as any[]) {
        const count = finalTicketRows.filter(
          (t) => (t as any).event_id === event.id
        ).length;
        if (count > 0) {
          await supabase
            .from("events")
            .update({ total_tickets_sold: count })
            .eq("id", event.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      seeded: {
        categories: categories?.length ?? 0,
        users: organizers.length + attendees.length,
        events: events?.length ?? 0,
        tiers: tiers?.length ?? 0,
        orders: insertedOrders?.length ?? 0,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

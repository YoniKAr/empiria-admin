// ─── Enums (match Supabase custom ENUM types) ───

export type UserRole = "attendee" | "organizer" | "non_profit" | "admin";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type SeatingType = "general_admission" | "reserved";
export type OrderStatus = "pending" | "completed" | "refunded" | "cancelled";
export type TicketStatus = "valid" | "used" | "cancelled" | "expired";
export type SplitSource = "platform_fee" | "net_revenue";

// ─── Table Row Types ───

export interface User {
  id: string;
  auth0_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  profile_data: Record<string, unknown>;
  settings: Record<string, unknown>;
  interests: string[];
  stripe_account_id: string | null;
  stripe_onboarding_completed: boolean;
  default_currency: string;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description: Record<string, unknown> | null;
  category_id: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  gallery_images: string[] | null;
  start_at: string;
  end_at: string;
  location_type: string;
  venue_name: string | null;
  address_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
  city: string | null;
  status: EventStatus;
  seating_type: SeatingType;
  seating_config: Record<string, unknown>;
  is_featured: boolean;
  platform_fee_percent: number;
  platform_fee_fixed: number;
  currency: string;
  total_capacity: number;
  total_tickets_sold: number;
  source_app: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  organizer?: User;
  category?: Category;
}

export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  initial_quantity: number;
  remaining_quantity: number;
  max_per_order: number;
  sales_start_at: string | null;
  sales_end_at: string | null;
  is_hidden: boolean;
}

export interface Ticket {
  id: string;
  event_id: string;
  tier_id: string;
  order_id: string | null;
  user_id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  qr_code_secret: string;
  status: TicketStatus;
  seat_label: string | null;
  purchase_date: string;
  event?: Event;
  tier?: TicketTier;
  order?: Order;
}

export interface Order {
  id: string;
  user_id: string;
  event_id: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  total_amount: number;
  platform_fee_amount: number;
  organizer_payout_amount: number;
  currency: string;
  payout_breakdown: Record<string, unknown>;
  status: OrderStatus;
  source_app: string | null;
  created_at: string;
  updated_at: string;
  event?: Event;
  buyer?: User;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  tier_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tier?: TicketTier;
}

export interface RevenueSplit {
  id: string;
  event_id: string;
  recipient_user_id: string | null;
  recipient_stripe_id: string | null;
  percentage: number;
  source_type: SplitSource;
  description: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

// ─── Dashboard KPIs ───

export interface DashboardKpis {
  totalRevenue: number;
  platformFees: number;
  totalOrders: number;
  totalUsers: number;
  totalEvents: number;
  totalTicketsSold: number;
  currency: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  platformFees: number;
  orders: number;
}

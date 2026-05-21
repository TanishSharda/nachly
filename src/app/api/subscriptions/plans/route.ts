import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const fallbackPlans = [
  {
    id: "studio",
    name: "Studio Pass",
    description: "Unlimited access to all premium routines",
    interval_months: 1,
    price_inr: 49900,
    is_active: true,
  },
  {
    id: "creator",
    name: "Creator Club",
    description: "Premium routines + monthly masterclass",
    interval_months: 1,
    price_inr: 89900,
    is_active: true,
  },
  {
    id: "elite",
    name: "Elite Masterclass",
    description: "All access + live coaching sessions",
    interval_months: 1,
    price_inr: 149900,
    is_active: true,
  },
];

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ plans: fallbackPlans, fallback: true });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id,name,description,interval_months,price_inr,is_active")
    .eq("is_active", true)
    .order("price_inr", { ascending: true });

  if (error) {
    return NextResponse.json({ plans: fallbackPlans, fallback: true });
  }

  return NextResponse.json({ plans: data ?? [] });
}

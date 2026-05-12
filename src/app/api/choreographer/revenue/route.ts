import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const fallback = {
  summary: {
    totalEarned: 25474,
    pendingPayout: 8073,
    revenueSplit: 60,
  },
  streams: {
    ppv: 9240,
    subscriptions: 11880,
    workshops: 4354,
  },
  payoutHistory: [
    { period: "March 2026", purchases: 45, gross: 13455, share: 8073, status: "pending" },
    { period: "February 2026", purchases: 38, gross: 11362, share: 6817, status: "paid" },
    { period: "January 2026", purchases: 31, gross: 9269, share: 5561, status: "paid" },
    { period: "December 2025", purchases: 28, gross: 8372, share: 5023, status: "paid" },
  ],
};

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ ...fallback, fallback: true });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ...fallback, fallback: true });
  }

  const [payoutsResponse, purchasesResponse, subscriptionsResponse, workshopsResponse] = await Promise.all([
    supabase
      .from("payouts")
      .select("period_start,period_end,total_purchases,gross_amount_inr,choreographer_share,status,paid_at")
      .eq("choreographer_id", user.id)
      .order("period_end", { ascending: false })
      .limit(12),
    supabase
      .from("purchases")
      .select("amount_inr,status,payment_provider,created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("subscriptions")
      .select("amount_inr,status,payment_provider,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("workshops")
      .select("price_inr,status,created_at")
      .eq("choreographer_id", user.id)
      .limit(200),
  ]);

  if (payoutsResponse.error) {
    return NextResponse.json({ ...fallback, fallback: true });
  }

  const payouts = payoutsResponse.data || [];
  const purchases = purchasesResponse.error ? [] : purchasesResponse.data || [];
  const subscriptions = subscriptionsResponse.error ? [] : subscriptionsResponse.data || [];
  const workshops = workshopsResponse.error ? [] : workshopsResponse.data || [];

  const completedPpv = purchases.reduce((sum, item) => sum + Number(item.amount_inr || 0), 0);
  const subscriptionRevenue = subscriptions.reduce((sum, item) => sum + Number(item.amount_inr || 0), 0);
  const workshopRevenue = workshops.reduce((sum, item) => sum + Number(item.price_inr || 0), 0);
  const totalEarned = payouts.reduce((sum, item) => sum + Number(item.choreographer_share || 0), 0) || completedPpv + subscriptionRevenue + workshopRevenue;
  const pendingPayout = payouts.filter((item) => item.status !== "paid").reduce((sum, item) => sum + Number(item.choreographer_share || 0), 0);

  return NextResponse.json({
    summary: {
      totalEarned,
      pendingPayout,
      revenueSplit: 60,
    },
    streams: {
      ppv: completedPpv,
      subscriptions: subscriptionRevenue,
      workshops: workshopRevenue,
    },
    payoutHistory: payouts.map((payout) => ({
      period: `${new Date(payout.period_start).toLocaleString("en-US", { month: "long", year: "numeric" })}`,
      purchases: payout.total_purchases,
      gross: payout.gross_amount_inr,
      share: payout.choreographer_share,
      status: payout.status,
    })),
  });
}

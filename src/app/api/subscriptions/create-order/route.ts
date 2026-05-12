import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

function missingRazorpayConfigResponse() {
  return NextResponse.json(
    { error: "Razorpay is not configured", detail: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
    { status: 503 }
  );
}

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return missingRazorpayConfigResponse();
  }

  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const planId = String(body.planId || "").trim();
  if (!planId) {
    return NextResponse.json({ error: "Invalid plan payload" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please log in to continue payment" }, { status: 401 });
  }

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id,name,price_inr,interval_months,is_active")
    .eq("id", planId)
    .maybeSingle();

  if (!plan?.id || !plan.is_active) {
    return NextResponse.json({ error: "Subscription plan not available" }, { status: 404 });
  }

  const amountPaise = Number(plan.price_inr || 0);
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    return NextResponse.json({ error: "Invalid plan price" }, { status: 400 });
  }

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id,status,ends_at")
    .eq("user_id", user.id)
    .eq("plan_id", plan.id)
    .maybeSingle();

  if (existingSub?.status === "active") {
    return NextResponse.json({ error: "Subscription already active" }, { status: 409 });
  }

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  const receipt = `naachly_sub_${plan.id}_${Date.now()}`.slice(0, 40);

  const orderPayload = {
    amount: Math.round(amountPaise),
    currency: "INR",
    receipt,
    notes: {
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      intervalMonths: plan.interval_months,
    },
  };

  const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderPayload),
  });

  const razorpayJson = await razorpayResponse.json().catch(() => ({}));
  if (!razorpayResponse.ok || !razorpayJson?.id) {
    return NextResponse.json({ error: razorpayJson?.error?.description || "Unable to create payment order" }, { status: 502 });
  }

  const amountInr = Math.max(1, Math.round(amountPaise / 100));

  const { error: upsertError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        plan_id: plan.id,
        amount_inr: amountInr,
        status: "pending",
        order_id: razorpayJson.id,
        payment_provider: "razorpay",
      },
      { onConflict: "user_id,plan_id" }
    );

  if (upsertError) {
    return NextResponse.json({ error: "Unable to reserve subscription" }, { status: 500 });
  }

  return NextResponse.json({
    orderId: razorpayJson.id,
    amount: razorpayJson.amount,
    currency: razorpayJson.currency || "INR",
    keyId,
    plan: {
      id: plan.id,
      name: plan.name,
      intervalMonths: plan.interval_months,
    },
    user: {
      name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Dancer",
      email: user.email || "",
    },
  });
}

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

function missingRazorpayConfigResponse() {
  return NextResponse.json(
    { error: "Razorpay is not configured", detail: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
    { status: 503 }
  );
}

export async function POST(request: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return missingRazorpayConfigResponse();
  }

  let body: {
    planId?: string;
    amountPaise?: number;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const planId = String(body.planId || "").trim();
  const amountPaise = Number(body.amountPaise || 0);
  const orderId = String(body.razorpay_order_id || "").trim();
  const paymentId = String(body.razorpay_payment_id || "").trim();
  const signature = String(body.razorpay_signature || "").trim();

  if (!planId || !orderId || !paymentId || !signature || !Number.isFinite(amountPaise) || amountPaise < 100) {
    return NextResponse.json({ error: "Invalid verification payload" }, { status: 400 });
  }

  const digest = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (digest !== signature) {
    return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please log in to finalize payment" }, { status: 401 });
  }

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id,interval_months")
    .eq("id", planId)
    .maybeSingle();

  if (!plan?.id) {
    return NextResponse.json({ ok: true, verified: true, subscriptionRecorded: false });
  }

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setMonth(endsAt.getMonth() + (plan.interval_months || 1));

  const amountInr = Math.max(1, Math.round(amountPaise / 100));

  const { error: upsertError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        plan_id: plan.id,
        amount_inr: amountInr,
        status: "active",
        payment_id: paymentId,
        order_id: orderId,
        payment_provider: "razorpay",
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
      },
      { onConflict: "user_id,plan_id" }
    );

  if (upsertError) {
    return NextResponse.json({ error: "Payment verified but subscription record failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, verified: true, subscriptionRecorded: true });
}

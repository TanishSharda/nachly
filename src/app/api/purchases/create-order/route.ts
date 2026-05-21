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

  let body: { styleSlug?: string; styleName?: string; amountPaise?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const styleSlug = String(body.styleSlug || "").trim().toLowerCase();
  const styleName = String(body.styleName || "Dance Style").trim();

  if (!styleSlug) {
    return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please log in to continue payment" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: styleRow } = await supabase
    .from("dance_styles")
    .select("id, name, price_inr, is_active")
    .eq("slug", styleSlug)
    .maybeSingle();

  if (!styleRow?.id || !styleRow.is_active) {
    return NextResponse.json({ error: "Dance style not available" }, { status: 404 });
  }

  const amountPaise = Number(styleRow.price_inr || 0);
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    return NextResponse.json({ error: "Invalid style price" }, { status: 400 });
  }

  const { data: existingPurchase } = await supabase
    .from("purchases")
    .select("status")
    .eq("user_id", user.id)
    .eq("style_id", styleRow.id)
    .maybeSingle();

  if (existingPurchase?.status === "completed") {
    return NextResponse.json({ error: "Style already unlocked" }, { status: 409 });
  }

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  const receipt = `naachly_${styleSlug}_${Date.now()}`.slice(0, 40);
  const orderPayload = {
    amount: Math.round(amountPaise),
    currency: "INR",
    receipt,
    notes: {
      userId: user.id,
      styleSlug,
      styleName: styleRow.name || styleName,
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

  const { error: insertError } = await supabase
    .from("purchases")
    .upsert(
      {
        user_id: user.id,
        style_id: styleRow.id,
        amount_inr: amountInr,
        status: "pending",
        order_id: razorpayJson.id,
        payment_provider: "razorpay",
      },
      { onConflict: "user_id,style_id" }
    );

  if (insertError) {
    return NextResponse.json({ error: "Unable to reserve purchase" }, { status: 500 });
  }

  return NextResponse.json({
    orderId: razorpayJson.id,
    amount: razorpayJson.amount,
    currency: razorpayJson.currency || "INR",
    keyId,
    user: {
      name:
        profile?.full_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.email?.split("@")[0] ?? "Dancer"),
      email: user.email || "",
    },
  });
}

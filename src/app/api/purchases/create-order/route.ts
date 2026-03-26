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
  const amountPaise = Number(body.amountPaise || 0);

  if (!styleSlug || !Number.isFinite(amountPaise) || amountPaise < 100) {
    return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
  }

  const supabase = createServerSupabase();
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

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  const receipt = `naachly_${styleSlug}_${Date.now()}`.slice(0, 40);
  const orderPayload = {
    amount: Math.round(amountPaise),
    currency: "INR",
    receipt,
    notes: {
      userId: user.id,
      styleSlug,
      styleName,
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

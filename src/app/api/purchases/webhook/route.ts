import crypto from "node:crypto";
import { NextResponse, NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logServiceRoleUsage } from '@/lib/security/serviceRoleAudit';
import { enforceRateLimit } from '@/lib/security/rateLimiter';

function missingRazorpayConfigResponse() {
  return NextResponse.json(
    { error: "Razorpay webhook is not configured", detail: "Set RAZORPAY_WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY." },
    { status: 503 }
  );
}

function timingSafeEquals(a: string, b: string) {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(request: Request) {
  // enforce a basic rate limit per IP for this webhook
  try {
    const maybe = await enforceRateLimit(request as unknown as NextRequest, { windowMs: 60_000, max: 30, keyPrefix: 'webhook:razorpay' });
    if (maybe) return maybe;
  } catch (e) {
    // continue on limiter errors
  }
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!webhookSecret || !serviceKey) {
    return missingRazorpayConfigResponse();
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  if (!timingSafeEquals(signature, expected)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const event = String((payload as { event?: string }).event || "");
  const payment = (payload as any)?.payload?.payment?.entity;
  const order = (payload as any)?.payload?.order?.entity;

  const orderId = String(payment?.order_id || order?.id || "");
  const paymentId = String(payment?.id || "");
  const status = String(payment?.status || order?.status || "");

  if (!orderId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let mappedStatus: "completed" | "failed" | "pending" = "pending";
  if (event === "payment.captured" || event === "order.paid" || status === "captured" || status === "paid") {
    mappedStatus = "completed";
  } else if (event === "payment.failed" || status === "failed") {
    mappedStatus = "failed";
  }

  const db = createServiceRoleClient();
  try {
    logServiceRoleUsage({ caller: 'api/purchases/webhook', note: `order:${orderId} payment:${paymentId} status:${mappedStatus}` });
  } catch (_) {}

  const { data: updatedRow, error: updateError } = await db
    .from("purchases")
    .update({
      status: mappedStatus,
      payment_id: paymentId || null,
      payment_ref: paymentId || null,
      payment_provider: "razorpay",
      payment_payload: payload,
    })
    .eq("order_id", orderId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: "Webhook update failed" }, { status: 500 });
  }

  if (updatedRow?.id) {
    return NextResponse.json({ ok: true });
  }

  const notes = payment?.notes || order?.notes || {};
  const fallbackUserId = String(notes?.userId || "");
  const fallbackStyleSlug = String(notes?.styleSlug || "").trim().toLowerCase();

  if (!fallbackUserId || !fallbackStyleSlug) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { data: styleRow } = await db
    .from("dance_styles")
    .select("id, price_inr")
    .eq("slug", fallbackStyleSlug)
    .maybeSingle();

  if (!styleRow?.id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const amountInr = Math.max(1, Math.round(Number(styleRow.price_inr || 0) / 100));

  await db
    .from("purchases")
    .upsert(
      {
        user_id: fallbackUserId,
        style_id: styleRow.id,
        amount_inr: amountInr,
        status: mappedStatus,
        order_id: orderId,
        payment_id: paymentId || null,
        payment_ref: paymentId || null,
        payment_provider: "razorpay",
        payment_payload: payload,
      },
      { onConflict: "user_id,style_id" }
    );

  return NextResponse.json({ ok: true });
}

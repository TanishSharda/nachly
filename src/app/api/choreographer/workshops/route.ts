import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const workshopSchema = z.object({
  title: z.string().trim().min(3).max(120),
  startAt: z.string().trim().datetime(),
  durationMinutes: z.number().int().min(15).max(480),
  priceInr: z.number().int().min(0).max(99999999),
  capacity: z.number().int().min(1).max(5000),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
});

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ workshops: [], fallback: true });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ workshops: [], fallback: true });
  }

  const { data, error } = await supabase
    .from("workshops")
    .select("id,title,start_at,duration_minutes,price_inr,capacity,status")
    .eq("choreographer_id", user.id)
    .order("start_at", { ascending: true });

  if (error) {
    return NextResponse.json({ workshops: [], fallback: true });
  }

  return NextResponse.json({ workshops: data ?? [], fallback: false });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = workshopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workshop payload" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("workshops")
    .insert({
      choreographer_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      start_at: parsed.data.startAt,
      duration_minutes: parsed.data.durationMinutes,
      price_inr: parsed.data.priceInr,
      capacity: parsed.data.capacity,
      status: "scheduled",
    })
    .select("id,title,start_at,duration_minutes,price_inr,capacity,status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create workshop" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, workshop: data });
}

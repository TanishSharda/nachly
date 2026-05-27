import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient, createServerSupabase } from "@/lib/supabase/server";

const registerUploadSchema = z.object({
  path: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  size: z.number().int().nonnegative(),
  type: z.string().trim().min(1),
  choreographyId: z.string().uuid().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = registerUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
    }

    const db = createServiceRoleClient();
    const payload = parsed.data;

    const { error } = await db.from("choreography_uploads").insert({
      user_id: user.id,
      file_name: payload.fileName,
      file_path: payload.path,
      file_size: payload.size,
      file_type: payload.type,
      choreography_id: payload.choreographyId ?? null,
      status: "completed",
      metadata: {
        uploadedAt: new Date().toISOString(),
        originalSize: payload.size,
      },
    });

    if (error) {
      console.error("[/api/choreographer/register-upload] Database error:", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/choreographer/register-upload] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
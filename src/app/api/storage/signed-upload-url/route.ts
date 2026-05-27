import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = String(body?.path || "").trim();
    const bucket = String(body?.bucket || "choreographer-uploads").trim();
    const upsert = Boolean(body?.upsert);

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert });

    if (error || !data?.token || !data?.signedUrl) {
      console.error("[/api/storage/signed-upload-url] createSignedUploadUrl error:", error);
      return NextResponse.json(
        { error: error?.message || "Failed to create signed upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, signedUrl: data.signedUrl, token: data.token, path: data.path });
  } catch (err) {
    console.error("[/api/storage/signed-upload-url] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
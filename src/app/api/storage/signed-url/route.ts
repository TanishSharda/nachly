import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = String(body?.path || "").trim();
    const bucket = String(body?.bucket || "choreographer-uploads").trim();
    const expires = Number(body?.expires || 60); // seconds

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Service role key not configured" },
        { status: 500 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expires);

    if (error || !data?.signedURL) {
      console.error("[/api/storage/signed-url] createSignedUrl error:", error);
      return NextResponse.json({ error: error?.message || "Failed to create signed URL" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: data.signedURL, expiresAt: data.expiration });
  } catch (err) {
    console.error("[/api/storage/signed-url] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

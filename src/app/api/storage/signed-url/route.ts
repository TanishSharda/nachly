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

    // Build Supabase base URL and public object URL
    const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");

    // If the object is publicly available, return the public URL immediately
    try {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
      const head = await fetch(publicUrl, { method: "HEAD" });
      if (head.ok) {
        return NextResponse.json({ ok: true, url: publicUrl, expiresAt: null });
      }
    } catch (err) {
      // ignore and continue to signed URL creation
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

      // Fallback: call Supabase Storage REST API directly to sign the object
      try {
        const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
        const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");

        if (!supabaseUrl || !serviceKey) {
          return NextResponse.json({ error: "Failed to create signed URL" }, { status: 500 });
        }

        const resp = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ paths: [path], expiresIn: Number(expires) }),
        });

        const json = await resp.json();
        if (resp.ok && Array.isArray(json) && json[0]?.signedURL) {
          const signedURL = json[0].signedURL;
          const full = signedURL.startsWith("http") ? signedURL : `${supabaseUrl}${signedURL}`;
          return NextResponse.json({ ok: true, url: full, expiresAt: json[0].expires_at || null });
        }

        console.error("[/api/storage/signed-url] REST fallback error:", json);
        return NextResponse.json({ error: json?.message || "Failed to create signed URL" }, { status: 500 });
      } catch (err) {
        console.error("[/api/storage/signed-url] REST fallback threw:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, url: data.signedURL, expiresAt: data.expiration });
  } catch (err) {
    console.error("[/api/storage/signed-url] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

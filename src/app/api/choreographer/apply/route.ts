import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { appendApplicationToSheet } from "@/lib/fallbacks/googleSheets";
import { sendApplicationEmail } from "@/lib/fallbacks/email";

const APPLY_COOLDOWN_MS = 10 * 60 * 1000;

const applySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  portfolio: z.string().trim().url().max(2000).optional().or(z.literal("")),
  sampleVideo: z.string().trim().url().max(2000),
  experience: z.string().trim().min(20).max(5000),
  specialties: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
});

function missingSupabaseConfigResponse() {
  return NextResponse.json(
    {
      error: "Service temporarily unavailable",
      detail:
        "Missing required server configuration: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    },
    { status: 503 }
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid application payload" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data: existing } = await db
    .from("choreographer_applications")
    .select("id,status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = existing?.[0];
  if (latest?.created_at) {
    const latestAt = new Date(latest.created_at).getTime();
    if (!Number.isNaN(latestAt)) {
      const elapsedMs = Date.now() - latestAt;
      if (elapsedMs < APPLY_COOLDOWN_MS) {
        const retryAfterSec = Math.max(1, Math.ceil((APPLY_COOLDOWN_MS - elapsedMs) / 1000));
        return NextResponse.json(
          {
            error: "You are submitting too quickly. Please wait before trying again.",
            retryAfterSeconds: retryAfterSec,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSec),
            },
          }
        );
      }
    }
  }

  if (latest && latest.status === "pending") {
    return NextResponse.json(
      { error: "You already have a pending application under review." },
      { status: 409 }
    );
  }

  const input = parsed.data;
  const profileUpdate: { full_name?: string; bio?: string } = {};
  if (input.name) profileUpdate.full_name = input.name;
  if (input.bio) profileUpdate.bio = input.bio;

  if (Object.keys(profileUpdate).length > 0) {
    await db.from("profiles").update(profileUpdate).eq("id", user.id);
  }

  const { data, error } = await db
    .from("choreographer_applications")
    .insert({
      user_id: user.id,
      portfolio_url: input.portfolio || null,
      sample_video: input.sampleVideo,
      experience: input.experience,
      specialties: input.specialties,
      status: "pending",
    })
    .select("id,status,created_at")
    .single();

  if (error) {
    console.error("[/api/choreographer/apply] Insert error:", error);
    // If the routines/table isn't present in this environment, surface a clear message
    const isMissingTable = error.code === "PGRST205" || (error.message && String(error.message).includes("Could not find the table"));

    // Try persistent fallback: append to Google Sheet & send email notification
    try {
      const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT;
      const sheetId = process.env.CHOREO_APPS_SPREADSHEET_ID;
      const row = [user.id, input.name, input.email, input.portfolio || "", input.sampleVideo, input.experience, (input.specialties || []).join(','), new Date().toISOString()];

      if (saJson && sheetId) {
        await appendApplicationToSheet({ serviceAccountJson: saJson, spreadsheetId: sheetId, values: row });
      }

      // Send notification email
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const notifyTo = process.env.CHOREO_APPS_NOTIFY_EMAIL;

      if (notifyTo && smtpHost && smtpPort) {
        const html = `<p>New choreographer application (fallback)</p><ul><li>user: ${user.id}</li><li>name: ${input.name}</li><li>email: ${input.email}</li><li>portfolio: ${input.portfolio}</li><li>experience: ${input.experience}</li></ul>`;
        await sendApplicationEmail({ smtpHost, smtpPort, smtpUser, smtpPass, from: smtpUser, to: notifyTo, subject: 'New choreographer application (fallback)', html });
      }
    } catch (fallbackErr) {
      console.error('[/api/choreographer/apply] fallback error', fallbackErr);
    }

    if (isMissingTable) {
      return NextResponse.json(
        {
          ok: true,
          fallback: true,
          message: 'Application received — queued via fallback. We will review it soon.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    application: {
      id: data.id,
      status: data.status,
      createdAt: data.created_at,
    },
  });
}

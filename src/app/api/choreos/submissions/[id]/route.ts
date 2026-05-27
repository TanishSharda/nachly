import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  action: z.enum(["submit", "resubmit", "evaluate", "moderate"]),
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(3).max(2000).optional(),
  caption: z.string().trim().max(280).optional().or(z.literal("")),
  videoUrl: z.string().trim().url().max(2000).optional(),
  checklist: z
    .object({
      fullBodyVisible: z.boolean(),
      stableCamera: z.boolean(),
      goodLighting: z.boolean(),
    })
    .optional(),
  moderation: z
    .object({
      decision: z.enum(["approved", "rejected", "needs_improvement"]),
      tier: z.enum(["community", "rising", "official"]).optional(),
      notes: z.string().trim().max(2000).optional().or(z.literal("")),
    })
    .optional(),
  evaluation: z
    .object({
      overall: z.number().int().min(0).max(100),
      timing: z.number().int().min(0).max(100),
      energy: z.number().int().min(0).max(100),
      accuracy: z.number().int().min(0).max(100),
      expression: z.number().int().min(0).max(100),
      levelTag: z.enum(["beginner", "intermediate", "pro"]),
      qualityTag: z.enum(["clean", "needs_improvement"]),
      tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
      suggestions: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
    })
    .optional(),
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

function isAdmin(profile: { role?: string } | null | undefined) {
  return profile?.role === "admin";
}

async function loadCurrentUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function getSubmissionId(context: any) {
  const params = await context?.params;
  return String(params?.id || "").trim();
}

export async function GET(_: Request, context: any) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const id = await getSubmissionId(context);
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { supabase, user } = await loadCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();

  let query = db.from("choreo_submissions").select("*").eq("id", id).limit(1);
  if (!isAdmin(profile)) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load submission" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  return NextResponse.json({ submission: data });
}

export async function PATCH(request: Request, context: any) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const id = await getSubmissionId(context);
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { supabase, user } = await loadCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();

  let baseQuery = db.from("choreo_submissions").select("*").eq("id", id).limit(1);
  if (!isAdmin(profile)) {
    baseQuery = baseQuery.eq("user_id", user.id);
  }

  const { data: existing, error: existingError } = await baseQuery.maybeSingle();
  if (existingError) {
    return NextResponse.json({ error: "Failed to load existing submission" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const input = parsed.data;

  if (input.action === "submit") {
    const updatePayload = {
      submission_status: "pending_review",
      ai_status: "queued",
      submitted_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("choreo_submissions")
      .update(updatePayload)
      .eq("id", id)
      .select("id,submission_status,ai_status,submitted_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to submit choreography" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, submission: data });
  }

  if (input.action === "resubmit") {
    const checklistPassed =
      input.checklist?.fullBodyVisible && input.checklist?.stableCamera && input.checklist?.goodLighting;

    if (!checklistPassed) {
      return NextResponse.json(
        {
          error: "Resubmission blocked by quality checklist",
          message: "Your choreography is close to being featured",
          suggestions: [
            "Improve clarity of your movement.",
            "Ensure full body visibility.",
            "Improve timing and retake once stable.",
          ],
          cta: "Re-record & Improve",
        },
        { status: 422 }
      );
    }

    const checklist = input.checklist!;

    const { data, error } = await db
      .from("choreo_submissions")
      .update({
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        caption: input.caption ?? existing.caption,
        video_url: input.videoUrl ?? existing.video_url,
        checklist_full_body_visible: checklist.fullBodyVisible,
        checklist_stable_camera: checklist.stableCamera,
        checklist_good_lighting: checklist.goodLighting,
        checklist_passed: true,
        submission_status: "pending_review",
        ai_status: "queued",
        improvement_suggestions: [],
        submitted_at: new Date().toISOString(),
        version: Number(existing.version || 1) + 1,
      })
      .eq("id", id)
      .select("id,version,submission_status,ai_status,submitted_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to resubmit choreography" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, submission: data, cta: "Re-record & Improve" });
  }

  if (input.action === "evaluate") {
    const ev = input.evaluation;
    if (!ev) {
      return NextResponse.json({ error: "evaluation payload is required" }, { status: 400 });
    }

    const nextStatus = ev.overall >= 82 ? "approved" : "needs_improvement";
    const nextTier = ev.overall >= 90 ? "official" : ev.overall >= 82 ? "rising" : "community";

    const { data, error } = await db
      .from("choreo_submissions")
      .update({
        ai_status: "completed",
        ai_overall_score: ev.overall,
        ai_timing_score: ev.timing,
        ai_energy_score: ev.energy,
        ai_accuracy_score: ev.accuracy,
        ai_expression_score: ev.expression,
        ai_level_tag: ev.levelTag,
        ai_quality_tag: ev.qualityTag,
        ai_tags: ev.tags,
        improvement_suggestions: ev.suggestions,
        submission_status: nextStatus,
        tier: nextTier,
        ai_feedback: {
          timing: ev.timing,
          energy: ev.energy,
          accuracy: ev.accuracy,
          expression: ev.expression,
        },
      })
      .eq("id", id)
      .select("id,submission_status,tier,ai_overall_score,ai_quality_tag,improvement_suggestions")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to finalize AI evaluation" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      submission: data,
      message:
        nextStatus === "needs_improvement"
          ? "Your choreography is close to being featured"
          : "Your choreography passed evaluation",
      cta: nextStatus === "needs_improvement" ? "Re-record & Improve" : null,
    });
  }

  if (input.action === "moderate") {
    if (!isAdmin(profile)) {
      return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    }

    if (!input.moderation) {
      return NextResponse.json({ error: "moderation payload is required" }, { status: 400 });
    }

    const decision = input.moderation.decision;
    const mappedStatus = decision === "approved" ? "approved" : decision;

    const { data, error } = await db
      .from("choreo_submissions")
      .update({
        submission_status: mappedStatus,
        tier: input.moderation.tier ?? existing.tier,
        review_notes: input.moderation.notes || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,submission_status,tier,review_notes,reviewed_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to moderate choreography" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, submission: data });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

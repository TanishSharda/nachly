/**
 * Choreography Queries
 * Handles all choreography submissions related database queries
 */

import { createServerSupabase, createServiceRoleClient } from '../server';
import { logServiceRoleUsage } from '@/lib/security/serviceRoleAudit';

async function getReadOnlySupabaseClient() {
  // Prefer the server-scoped Supabase client which respects the current request's
  // authentication/cookies. Only fall back to the service-role client when an
  // explicit environment flag allows it. This reduces accidental service-role
  // exposure in server helpers.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.ALLOW_SERVICE_ROLE_READONLY === '1') {
    try {
      logServiceRoleUsage({ caller: 'lib/supabase/queries/choreos:getReadOnlySupabaseClient', note: 'readonly-fallback' });
    } catch (_) {}
    return createServiceRoleClient();
  }

  return await createServerSupabase();
}

export interface ChoreographyFeedItem {
  id: string;
  // source ids
  user_id?: string;
  choreographer_id?: string;

  // canonical fields
  title: string;
  description?: string | null;
  video_url?: string | null;
  demo_video_url?: string | null;
  teaching_video_url?: string | null;

  // style / difficulty
  style_slug?: string | null;
  dance_style?: string | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
  difficulty_level?: string | null;

  // status / metadata
  submission_status?: string | null;
  status?: string | null;
  tier?: string | null;
  published_at?: string | null;

  // engagement
  engagement_score?: number;
  view_count?: number;
  views_count?: number;
  like_count?: number;
  saves_count?: number;

  // timestamps
  created_at?: string | null;
  updated_at?: string | null;
  

  // creator
  creator_name?: string | null;
  creator_avatar_url?: string | null;
  choreographer_name?: string | null;

  // Optional normalized media fields used by the feed UI
  demo_reel?: {
    id?: string;
    choreography_post_id?: string;
    video_url?: string | null;
    thumbnail_url?: string | null;
    duration_seconds?: number | null;
    music_credit?: string | null;
    created_at?: string | null;
  } | null;
  tutorial?: {
    id?: string;
    choreography_post_id?: string;
    video_url?: string | null;
    duration_seconds?: number | null;
    created_at?: string | null;
  } | null;
  // additional UI aliases
  style?: string | null;
  caption?: string | null;
  source?: string | null;
}

/**
 * Get feed of published choreography submissions (approved only)
 * Paginated, ordered by engagement
 */
export async function getChoreographyFeed(
  options: {
    limit?: number;
    offset?: number;
    cursor?: string; // ISO timestamp paging token (returns older items before this timestamp)
    style?: string;
    difficulty?: string;
  } = {}
) {
  const { limit = 20, offset = 0, cursor, style, difficulty } = options;

  try {
    const supabase = await getReadOnlySupabaseClient();
    // Fetch approved submissions
    // Avoid embedding related `profiles` directly to prevent ambiguous relationship errors
    let submissionsQuery = supabase
      .from('choreo_submissions')
      .select('id,user_id,title,description,caption,video_url,style_slug,difficulty,submission_status,tier,engagement_score,view_count,like_count,published_at,created_at,updated_at')
      .not('published_at', 'is', null);

    if (style) submissionsQuery = submissionsQuery.eq('style_slug', style);
    if (difficulty) submissionsQuery = submissionsQuery.eq('difficulty', difficulty);

    const { data: submissions, error: subsError } = await submissionsQuery;
    if (subsError) {
      console.error('[getChoreographyFeed] submissions error:', subsError);
      return { posts: [], error: subsError.message };
    }

    // Fetch published/approved routines (creator performance videos)
    let routinesQuery = supabase
      .from('routines')
      .select('id,title,slug,description,caption,difficulty,is_published,is_approved,submission_tier,ai_overall_score,ai_tags,choreographer_id,created_at,updated_at,profiles(full_name,avatar_url),dance_styles(slug,name),routine_videos(video_url,video_type,sort_order),routine_steps(id,step_number,label,start_time,end_time)')
      .eq('is_published', true)
      .eq('is_approved', true);

    if (style) routinesQuery = routinesQuery.eq('dance_styles.slug', style);
    if (difficulty) routinesQuery = routinesQuery.eq('difficulty', difficulty);

    const { data: routines, error: routinesError } = await routinesQuery;
    if (routinesError) {
      console.error('[getChoreographyFeed] routines error:', routinesError);
      // continue with submissions only
    }

    // Normalize submissions to unified post shape
    const normalizedSubs = (submissions || []).map((s: any) => ({
      id: s.id,
      user_id: s.user_id || null,
      title: s.title,
      description: s.description || s.caption || '',
      video_url: s.video_url,
      demo_video_url: s.video_url || null,
      teaching_video_url: s.video_url || null,
      style_slug: s.style_slug,
      difficulty: s.difficulty,
      submission_status: s.submission_status,
      tier: s.tier || s.submission_tier || 'community',
      engagement_score: s.engagement_score || 0,
      view_count: s.view_count || 0,
      views_count: s.view_count || 0,
      like_count: s.like_count || 0,
      saves_count: 0,
      creator_name: null,
      creator_avatar_url: s.profiles?.avatar_url || null,
      published_at: s.published_at || s.created_at || null,
      demo_reel: null,
      tutorial: { video_url: s.video_url, duration_seconds: null },
      source: 'submission',
    }));

    // Normalize routines to unified post shape
    const normalizedRoutines = (routines || []).map((r: any) => {
      const preferred = (r.routine_videos || []).find((v: any) => v.video_type === 'performance') || (r.routine_videos || [])[0] || null;
      const teaching = (r.routine_videos || []).find((v: any) => v.video_type === 'teaching') || null;
      const tutorial = teaching ? { video_url: teaching.video_url, duration_seconds: null } : preferred ? { video_url: preferred.video_url, duration_seconds: null } : null;
      return {
        id: r.id,
        choreographer_id: r.choreographer_id || null,
        title: r.title,
        description: r.description || r.caption || '',
        video_url: preferred ? preferred.video_url : '',
        demo_video_url: preferred ? preferred.video_url : null,
        teaching_video_url: teaching ? teaching.video_url : null,
        // dance_styles comes from PostgREST nested select and is an array
        style_slug: r.dance_styles?.[0]?.slug || null,
        difficulty: r.difficulty || null,
        submission_status: 'published',
        tier: r.submission_tier || 'community',
        engagement_score: 0,
        view_count: r.view_count || 0,
        views_count: r.view_count || 0,
        like_count: r.like_count || 0,
        saves_count: 0,
        creator_name: r.profiles?.[0]?.full_name || r.profiles?.full_name || null,
        creator_avatar_url: r.profiles?.[0]?.avatar_url || r.profiles?.avatar_url || null,
        published_at: r.created_at || null,
        demo_reel: null,
        tutorial,
        source: 'routine',
      };
    });

    // Merge and sort by engagement_score
    const combined = [...normalizedSubs, ...normalizedRoutines].sort((a, b) => {
      const aPublished = new Date(a.published_at || 0).getTime();
      const bPublished = new Date(b.published_at || 0).getTime();
      if (bPublished !== aPublished) return bPublished - aPublished;
      return (b.engagement_score || 0) - (a.engagement_score || 0);
    });

    // Support cursor-based pagination: if `cursor` provided, return items with
    // `published_at` strictly older than the cursor and use that to compute nextCursor.
    if (cursor) {
      const cursorTime = new Date(cursor).getTime();
      const filtered = combined.filter((it) => {
        const ts = new Date(it.published_at || 0).getTime();
        return ts < cursorTime;
      });
      const page = filtered.slice(0, limit);
      const nextCursor = page.length > 0 ? page[page.length - 1].published_at || null : null;
      return { posts: page as ChoreographyFeedItem[], error: null, nextCursor };
    }

    const paged = combined.slice(offset, offset + limit);

    return { posts: paged as ChoreographyFeedItem[], error: null };
  } catch (err: any) {
    console.error('[getChoreographyFeed] Unexpected error:', err?.message || err);
    return { posts: [], error: err?.message || 'Failed to load choreography feed' };
  }
}

/**
 * Get single choreography submission with details
 */
export async function getChoreographyPost(id: string) {
  try {
    const supabase = await getReadOnlySupabaseClient();
    const { data, error } = await supabase
      .from('choreo_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[getChoreographyPost] Error:', error);
      return { post: null, error };
    }

    // Normalize the DB row into a safe post shape used by the UI.
    const row: any = data || {};
    const teaching = row.teach_video_url || row.performance_video_url || row.video_url || null;
    const tutorial = { video_url: teaching, duration_seconds: null };

    const post = {
      id: row.id,
      title: row.title || row.song_name || 'Untitled Choreo',
      description: row.description || row.caption || '',
      video_url: row.video_url || null,
      demo_video_url: row.video_url || null,
      teaching_video_url: row.teach_video_url || teaching,
      performance_video_url: row.performance_video_url || row.video_url || null,
      style_slug: row.style_slug || null,
      difficulty: row.difficulty || null,
      submission_status: row.submission_status || null,
      tier: row.tier || 'community',
      engagement_score: row.engagement_score || 0,
      view_count: row.view_count || 0,
      like_count: row.like_count || 0,
      saves_count: row.saves_count || 0,
      creator_name: row.creator_name || null,
      creator_avatar_url: row.creator_avatar_url || null,
      published_at: row.published_at || row.created_at || null,
      demo_reel: null,
      tutorial,
      source: 'submission',
      // UI expects a 'moves' array — provide an empty array when missing
      moves: Array.isArray(row.moves) ? row.moves : [],
      // preserve any ai fields
      ai_overall_score: row.ai_overall_score ?? null,
      ai_tags: Array.isArray(row.ai_tags) ? row.ai_tags : [],
    };

    return { post, error: null };
  } catch (err: any) {
    console.error('[getChoreographyPost] Unexpected error:', err);
    return { post: null, error: err?.message || 'Failed to load choreography' };
  }
}

/**
 * Get choreographer's submissions (all statuses for creator dashboard)
 */
export async function getChoreographerPosts(choreographerId: string, status?: string) {
  const supabase = await getReadOnlySupabaseClient();

  let query = supabase
    .from('choreo_submissions')
    .select('*')
    .eq('user_id', choreographerId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('submission_status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getChoreographerPosts] Error:', error);
    return { posts: [], error };
  }

  return { posts: data || [], error: null };
}

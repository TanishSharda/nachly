/**
 * Choreography Queries
 * Handles all choreography submissions related database queries
 */

import { createServerSupabase, createServiceRoleClient } from '../server';

async function getReadOnlySupabaseClient() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : await createServerSupabase();
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
    style?: string;
    difficulty?: string;
  } = {}
) {
  const { limit = 20, offset = 0, style, difficulty } = options;

  try {
    const supabase = await getReadOnlySupabaseClient();
    // Fetch approved submissions
    let submissionsQuery = supabase
      .from('choreo_submissions')
      .select('*')
      .eq('submission_status', 'approved');

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
      .select('id,title,slug,description,caption,difficulty,is_published,is_approved,submission_tier,ai_overall_score,ai_tags,choreographer_id,profiles(full_name),dance_styles(slug,name),routine_videos(video_url,video_type,sort_order),routine_steps(id,step_number,label,start_time,end_time)')
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
      title: s.title,
      description: s.description || s.caption || '',
      video_url: s.video_url,
      style_slug: s.style_slug,
      difficulty: s.difficulty,
      submission_status: s.submission_status,
      tier: s.tier || s.submission_tier || 'community',
      engagement_score: s.engagement_score || 0,
      view_count: s.view_count || 0,
      views_count: s.view_count || 0,
      like_count: s.like_count || 0,
      saves_count: s.saves_count || 0,
      creator_name: s.creator_name || null,
      demo_reel: null,
      tutorial: { video_url: s.video_url, duration_seconds: null },
      source: 'submission',
    }));

    // Normalize routines to unified post shape
    const normalizedRoutines = (routines || []).map((r: any) => {
      const preferred = (r.routine_videos || []).find((v: any) => v.video_type === 'performance') || (r.routine_videos || [])[0] || null;
      const tutorial = preferred ? { video_url: preferred.video_url, duration_seconds: null } : null;
      return {
        id: r.id,
        title: r.title,
        description: r.description || r.caption || '',
        video_url: preferred ? preferred.video_url : '',
        // dance_styles comes from PostgREST nested select and is an array
        style_slug: r.dance_styles?.[0]?.slug || null,
        difficulty: r.difficulty || null,
        submission_status: 'published',
        tier: r.submission_tier || 'community',
        engagement_score: 0,
        view_count: r.view_count || 0,
        views_count: r.view_count || 0,
        like_count: r.like_count || 0,
        saves_count: r.saves_count || 0,
        creator_name: r.profiles?.[0]?.full_name || r.profiles?.full_name || null,
        demo_reel: null,
        tutorial,
        source: 'routine',
      };
    });

    // Merge and sort by engagement_score
    const combined = [...normalizedSubs, ...normalizedRoutines].sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0));

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

    return { post: data, error: null };
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

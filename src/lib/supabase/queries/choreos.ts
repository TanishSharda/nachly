/**
 * Choreography Posts Queries
 * Handles all chireo/choreography related database queries
 */

import { createServerSupabase } from '../server';

export interface ChoreographyPost {
  id: string;
  choreographer_id: string;
  title: string;
  description: string;
  dance_style: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  demo_reel_id: string;
  tutorial_id: string;
  status: 'draft' | 'published';
  views_count: number;
  saves_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoReel {
  id: string;
  choreography_post_id: string;
  video_url: string;
  thumbnail_url: string;
  duration_seconds: number;
  music_credit: string;
  created_at: string;
}

export interface Tutorial {
  id: string;
  choreography_post_id: string;
  video_url: string;
  duration_seconds: number;
  created_at: string;
}

export interface ChoreographyFeedItem extends ChoreographyPost {
  demo_reel?: DemoReel | null;
  tutorial?: Tutorial | null;
  creator_name?: string;
  creator_avatar_url?: string | null;
}

/**
 * Get feed of choreography posts (demo reels)
 * Paginated, ordered by recency
 */
export async function getChoreographyFeed(
  options: {
    limit?: number;
    offset?: number;
    style?: string;
    difficulty?: string;
  } = {}
) {
  const supabase = createServerSupabase();
  const { limit = 20, offset = 0, style, difficulty } = options;

  let query = supabase
    .from('choreography_posts')
    .select(`
      *,
      demo_reel:demo_reel_id(*),
      tutorial:tutorial_id(*)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (style) {
    query = query.eq('dance_style', style);
  }

  if (difficulty) {
    query = query.eq('difficulty_level', difficulty);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getChoreographyFeed] Error:', error);
    return { posts: [], error };
  }

  return { posts: (data || []) as ChoreographyFeedItem[], error: null };
}

/**
 * Get single choreography post with details
 */
export async function getChoreographyPost(id: string) {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('choreography_posts')
    .select(`
      *,
      demo_reel:demo_reel_id(*),
      tutorial:tutorial_id(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getChoreographyPost] Error:', error);
    return { post: null, error };
  }

  return { post: data, error: null };
}

/**
 * Get choreographer's posts
 */
export async function getChoreographerPosts(choreographerId: string, status?: string) {
  const supabase = createServerSupabase();

  let query = supabase
    .from('choreography_posts')
    .select('*')
    .eq('choreographer_id', choreographerId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getChoreographerPosts] Error:', error);
    return { posts: [], error };
  }

  return { posts: data || [], error: null };
}

/**
 * Create a new choreography post (with both demo reel and tutorial)
 */
export async function createChoreographyPost(
  choreographerId: string,
  data: {
    title: string;
    description: string;
    dance_style: string;
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';
    demo_reel_url: string;
    demo_reel_thumbnail: string;
    tutorial_url: string;
    music_credit?: string;
    status?: 'draft' | 'published';
  }
) {
  const supabase = createServerSupabase();

  // Start transaction - create choreography post
  const { data: post, error: postError } = await supabase
    .from('choreography_posts')
    .insert({
      choreographer_id: choreographerId,
      title: data.title,
      description: data.description,
      dance_style: data.dance_style,
      difficulty_level: data.difficulty_level,
      status: data.status || 'draft',
    })
    .select()
    .single();

  if (postError || !post) {
    console.error('[createChoreographyPost] Post creation error:', postError);
    return { post: null, error: postError };
  }

  // Create demo reel
  const { data: reel, error: reelError } = await supabase
    .from('demo_reels')
    .insert({
      choreography_post_id: post.id,
      video_url: data.demo_reel_url,
      thumbnail_url: data.demo_reel_thumbnail,
      duration_seconds: 60, // To be updated after video processing
      music_credit: data.music_credit || '',
    })
    .select()
    .single();

  if (reelError || !reel) {
    console.error('[createChoreographyPost] Reel creation error:', reelError);
    return { post: null, error: reelError };
  }

  // Create tutorial
  const { data: tutorial, error: tutorialError } = await supabase
    .from('tutorials')
    .insert({
      choreography_post_id: post.id,
      video_url: data.tutorial_url,
      duration_seconds: 300, // To be updated after video processing
    })
    .select()
    .single();

  if (tutorialError || !tutorial) {
    console.error('[createChoreographyPost] Tutorial creation error:', tutorialError);
    return { post: null, error: tutorialError };
  }

  // Update post with demo_reel_id and tutorial_id
  const { data: updatedPost, error: updateError } = await supabase
    .from('choreography_posts')
    .update({
      demo_reel_id: reel.id,
      tutorial_id: tutorial.id,
    })
    .eq('id', post.id)
    .select()
    .single();

  if (updateError) {
    console.error('[createChoreographyPost] Update error:', updateError);
    return { post: null, error: updateError };
  }

  return { post: updatedPost, error: null };
}

/**
 * Update choreography post status
 */
export async function updateChoreographyPostStatus(
  postId: string,
  status: 'draft' | 'published'
) {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('choreography_posts')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .eq('id', postId)
    .select()
    .single();

  if (error) {
    console.error('[updateChoreographyPostStatus] Error:', error);
    return { post: null, error };
  }

  return { post: data, error: null };
}

/**
 * Increment choreography post view count
 */
export async function incrementPostViews(postId: string) {
  const supabase = createServerSupabase();

  const { error } = await supabase.rpc('increment_post_views', {
    post_id: postId,
  });

  if (error) {
    console.error('[incrementPostViews] Error:', error);
    return { error };
  }

  return { error: null };
}

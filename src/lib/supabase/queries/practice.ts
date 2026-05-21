/**
 * Practice Sessions & Learning Queries
 * Handles all practice sessions, attempts, and learning progress
 */

import { createServerSupabase } from '../server';

export interface PracticeSession {
  id: string;
  user_id: string;
  choreography_post_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'in-progress' | 'completed' | 'abandoned';
  duration_seconds: number;
  overall_score: number;
  created_at: string;
}

export interface PracticeAttempt {
  id: string;
  session_id: string;
  step_index: number;
  video_url: string;
  pose_data: Record<string, unknown>;
  accuracy_score: number;
  timing_score: number;
  energy_score: number;
  expression_score: number;
  completed_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  choreography_post_id: string;
  total_practices: number;
  completed_practices: number;
  best_score: number;
  last_practiced_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new practice session
 */
export async function createPracticeSession(
  userId: string,
  choreographyPostId: string
) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('practice_sessions')
    .insert({
      user_id: userId,
      choreography_post_id: choreographyPostId,
      status: 'in-progress',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[createPracticeSession] Error:', error);
    return { session: null, error };
  }

  return { session: data, error: null };
}

/**
 * Get user's practice sessions
 */
export async function getUserPracticeSessions(
  userId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const supabase = await createServerSupabase();
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[getUserPracticeSessions] Error:', error);
    return { sessions: [], error };
  }

  return { sessions: data || [], error: null };
}

/**
 * Get single practice session
 */
export async function getPracticeSession(sessionId: string) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('[getPracticeSession] Error:', error);
    return { session: null, error };
  }

  return { session: data, error: null };
}

/**
 * Update practice session with completion data
 */
export async function completePracticeSession(
  sessionId: string,
  overallScore: number
) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('practice_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      overall_score: overallScore,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('[completePracticeSession] Error:', error);
    return { session: null, error };
  }

  return { session: data, error: null };
}

/**
 * Record a practice attempt for a step
 */
export async function recordPracticeAttempt(
  sessionId: string,
  stepIndex: number,
  poseData: Record<string, unknown>,
  scores: {
    accuracy: number;
    timing: number;
    energy: number;
    expression: number;
  },
  videoUrl: string
) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('practice_attempts')
    .insert({
      session_id: sessionId,
      step_index: stepIndex,
      video_url: videoUrl,
      pose_data: poseData,
      accuracy_score: scores.accuracy,
      timing_score: scores.timing,
      energy_score: scores.energy,
      expression_score: scores.expression,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[recordPracticeAttempt] Error:', error);
    return { attempt: null, error };
  }

  return { attempt: data, error: null };
}

/**
 * Get user progress for a choreography
 */
export async function getUserProgress(
  userId: string,
  choreographyPostId: string
) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('choreography_post_id', choreographyPostId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine
    console.error('[getUserProgress] Error:', error);
    return { progress: null, error };
  }

  return { progress: data || null, error: null };
}

/**
 * Update or create user progress
 */
export async function updateUserProgress(
  userId: string,
  choreographyPostId: string,
  data: { best_score?: number; completed_practices?: number }
) {
  const supabase = await createServerSupabase();

  const existing = await getUserProgress(userId, choreographyPostId);

  if (existing.progress) {
    const { data: updated, error } = await supabase
      .from('user_progress')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        last_practiced_at: new Date().toISOString(),
      })
      .eq('id', existing.progress.id)
      .select()
      .single();

    if (error) {
      console.error('[updateUserProgress] Update error:', error);
      return { progress: null, error };
    }

    return { progress: updated, error: null };
  } else {
    const { data: created, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        choreography_post_id: choreographyPostId,
        best_score: data.best_score || 0,
        completed_practices: data.completed_practices || 1,
        total_practices: 1,
        last_practiced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[updateUserProgress] Create error:', error);
      return { progress: null, error };
    }

    return { progress: created, error: null };
  }
}

/**
 * Get user's practice statistics
 */
export async function getUserPracticeStats(userId: string) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .order('best_score', { ascending: false });

  if (error) {
    console.error('[getUserPracticeStats] Error:', error);
    return { stats: null, error };
  }

  const stats = {
    totalChoreographies: data?.length || 0,
    completedCount: (data || []).filter((p) => (p as any).completed_practices > 0).length,
    averageBestScore: data && data.length > 0
      ? Math.round((data as any[]).reduce((sum, p) => sum + p.best_score, 0) / data.length)
      : 0,
    topScore: data && data.length > 0 ? Math.max(...(data as any[]).map((p) => p.best_score)) : 0,
  };

  return { stats, error: null };
}

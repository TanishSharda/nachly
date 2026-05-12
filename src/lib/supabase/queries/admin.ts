/**
 * Admin Dashboard Queries
 * Handles admin governance, platform management, and business intelligence
 */

import { createServerSupabase } from '../server';

export interface AdminStats {
  dau: number; // Daily Active Users
  mau: number; // Monthly Active Users
  total_users: number;
  total_choreographers: number;
  total_posts: number;
  total_revenue: number;
}

export interface CreatorQualityScore {
  choreographer_id: string;
  avg_completion_rate: number;
  avg_user_rating: number;
  posts_published: number;
  suspension_flags: number;
  quality_score: number; // 0-100
}

/**
 * Get platform overview stats
 */
export async function getPlatformStats() {
  const supabase = createServerSupabase();

  try {
    // Get user counts
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: totalChoreographers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'choreographer');

    // Get post counts
    const { count: totalPosts } = await supabase
      .from('choreography_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    // Get DAU/MAU from practice sessions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthlyUsers } = await supabase
      .from('practice_sessions')
      .select('user_id')
      .gt('created_at', thirtyDaysAgo.toISOString());

    const uniqueMonthlyUsers = new Set((monthlyUsers || []).map((s: any) => s.user_id)).size;

    // Today's active users
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: dailyUsers } = await supabase
      .from('practice_sessions')
      .select('user_id')
      .gt('created_at', todayStart.toISOString());

    const uniqueDailyUsers = new Set((dailyUsers || []).map((s: any) => s.user_id)).size;

    // Revenue (from subscriptions and purchases)
    const { data: revenue } = await supabase
      .from('routine_purchases')
      .select('price')
      .eq('payment_status', 'completed');

    const totalRevenue =
      (revenue || []).reduce((sum, p: any) => sum + (p.price || 0), 0) / 100; // Convert from paise

    const stats: AdminStats = {
      dau: uniqueDailyUsers,
      mau: uniqueMonthlyUsers,
      total_users: totalUsers || 0,
      total_choreographers: totalChoreographers || 0,
      total_posts: totalPosts || 0,
      total_revenue: totalRevenue,
    };

    return { stats, error: null };
  } catch (error) {
    console.error('[getPlatformStats] Error:', error);
    return { stats: null, error };
  }
}

/**
 * Get user → choreographer conversion funnel
 */
export async function getConversionFunnel() {
  const supabase = createServerSupabase();

  try {
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: appliedUsers } = await supabase
      .from('choreographer_applications')
      .select('*', { count: 'exact', head: true });

    const { count: approvedUsers } = await supabase
      .from('choreographer_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    const funnel = {
      total_users: totalUsers || 0,
      applied_choreographers: appliedUsers || 0,
      approved_choreographers: approvedUsers || 0,
      application_rate: totalUsers ? ((appliedUsers || 0) / totalUsers) * 100 : 0,
      approval_rate: appliedUsers ? ((approvedUsers || 0) / appliedUsers) * 100 : 0,
    };

    return { funnel, error: null };
  } catch (error) {
    console.error('[getConversionFunnel] Error:', error);
    return { funnel: null, error };
  }
}

/**
 * Get revenue breakdown by creator and content type
 */
export async function getRevenueBreakdown() {
  const supabase = createServerSupabase();

  try {
    // Revenue by creator
    const { data: creatorRevenue } = await supabase
      .from('choreographer_submissions')
      .select('choreographer_id, revenue')
      .order('revenue', { ascending: false })
      .limit(10);

    // Revenue by content type (dance style)
    const { data: typeRevenue } = await supabase
      .from('choreography_posts')
      .select('dance_style, views_count')
      .eq('status', 'published');

    return {
      breakdown: {
        by_creator: creatorRevenue || [],
        by_style: typeRevenue || [],
      },
      error: null,
    };
  } catch (error) {
    console.error('[getRevenueBreakdown] Error:', error);
    return { breakdown: null, error };
  }
}

/**
 * Calculate creator quality score
 */
export async function calculateCreatorQualityScore(
  choreographerId: string
): Promise<{ score: CreatorQualityScore | null; error: unknown }> {
  const supabase = createServerSupabase();

  try {
    // Get creator posts
    const { data: posts } = await supabase
      .from('choreography_posts')
      .select('id')
      .eq('choreographer_id', choreographerId);

    if (!posts || posts.length === 0) {
      return {
        score: {
          choreographer_id: choreographerId,
          avg_completion_rate: 0,
          avg_user_rating: 0,
          posts_published: 0,
          suspension_flags: 0,
          quality_score: 0,
        },
        error: null,
      };
    }

    const postIds = (posts as any[]).map((p) => p.id);

    // Get practice attempts (proxy for completion rate)
    const { data: attempts } = await supabase
      .from('practice_sessions')
      .select('*')
      .in('choreography_post_id', postIds);

    const completedCount = (attempts || []).filter((a: any) => a.status === 'completed').length;
    const avgCompletionRate = attempts && attempts.length > 0 ? (completedCount / attempts.length) * 100 : 0;

    // Get ratings (if available)
    const { data: ratings } = await supabase
      .from('choreographer_submissions')
      .select('rating')
      .eq('choreographer_id', choreographerId);

    const avgRating =
      ratings && ratings.length > 0
        ? (ratings as any[]).reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
        : 0;

    // Get suspension flags
    const { data: flags } = await supabase
      .from('choreographer_moderation')
      .select('*')
      .eq('choreographer_id', choreographerId)
      .eq('status', 'flagged');

    const suspensionFlags = flags?.length || 0;

    // Calculate quality score (0-100)
    const qualityScore = Math.round(
      (avgCompletionRate * 0.5 + avgRating * 10 * 0.3 - suspensionFlags * 5 * 0.2) / 100 * 100
    );

    const score: CreatorQualityScore = {
      choreographer_id: choreographerId,
      avg_completion_rate: Math.round(avgCompletionRate),
      avg_user_rating: Math.round(avgRating * 10) / 10,
      posts_published: posts.length,
      suspension_flags: suspensionFlags,
      quality_score: Math.max(0, Math.min(100, qualityScore)),
    };

    return { score, error: null };
  } catch (error) {
    console.error('[calculateCreatorQualityScore] Error:', error);
    return { score: null, error };
  }
}

/**
 * Suspend choreographer
 */
export async function suspendChoreographer(choreographerId: string, reason: string) {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('choreographer_moderation')
    .insert({
      choreographer_id: choreographerId,
      status: 'suspended',
      reason,
      suspended_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[suspendChoreographer] Error:', error);
    return { record: null, error };
  }

  return { record: data, error: null };
}

/**
 * Reinstate choreographer
 */
export async function reinstateChoreographer(choreographerId: string) {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('choreographer_moderation')
    .update({
      status: 'active',
      reinstated_at: new Date().toISOString(),
    })
    .eq('choreographer_id', choreographerId)
    .eq('status', 'suspended')
    .select()
    .single();

  if (error) {
    console.error('[reinstateChoreographer] Error:', error);
    return { record: null, error };
  }

  return { record: data, error: null };
}

/**
 * Flag content for moderation
 */
export async function flagContentForModeration(
  postId: string,
  reason: string,
  reportedBy?: string
) {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('content_moderation_queue')
    .insert({
      choreography_post_id: postId,
      reason,
      reported_by: reportedBy,
      status: 'pending_review',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[flagContentForModeration] Error:', error);
    return { flag: null, error };
  }

  return { flag: data, error: null };
}

/**
 * Get content moderation queue
 */
export async function getModerationQueue(options: { limit?: number; offset?: number } = {}) {
  const supabase = createServerSupabase();
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from('content_moderation_queue')
    .select('*')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[getModerationQueue] Error:', error);
    return { queue: [], error };
  }

  return { queue: data || [], error: null };
}

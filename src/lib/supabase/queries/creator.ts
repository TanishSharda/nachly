/**
 * Creator/Choreographer Queries
 * Handles choreographer submissions, analytics, and monetization
 */

import { createServerSupabase } from '../server';

export interface ChoreographerApplication {
  id: string;
  user_id: string;
  status: 'under_review' | 'approved' | 'rejected' | 'needs_revision';
  full_name: string;
  bio: string;
  dance_styles: string[];
  portfolio_url: string;
  contact_email: string;
  location: string;
  social_links?: Record<string, string>;
  certifications?: string;
  teaching_experience?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
}

export interface CreatorAnalytics {
  post_id: string;
  views: number;
  saves: number;
  shares: number;
  learn_ctr: number; // Learn button click-through rate
  tutorial_completion_rate: number;
  revenue: number;
  created_at: string;
}

export interface CreatorEarnings {
  id: string;
  choreographer_id: string;
  period: string; // YYYY-MM format
  views: number;
  completions: number;
  revenue: number;
  platform_fee: number;
  creator_payout: number;
  status: 'pending' | 'processed' | 'paid';
  created_at: string;
}

/**
 * Create choreographer application
 */
export async function createChoreographerApplication(
  userId: string,
  data: {
    full_name: string;
    bio: string;
    dance_styles: string[];
    portfolio_url: string;
    contact_email: string;
    location: string;
    social_links?: Record<string, string>;
    certifications?: string;
    teaching_experience?: string;
  }
) {
  const supabase = await createServerSupabase();

  const { data: application, error } = await supabase
    .from('choreographer_applications')
    .insert({
      user_id: userId,
      status: 'under_review',
      ...data,
    })
    .select()
    .single();

  if (error) {
    console.error('[createChoreographerApplication] Error:', error);
    return { application: null, error };
  }

  return { application, error: null };
}

/**
 * Get choreographer application
 */
export async function getChoreographerApplication(userId: string) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('choreographer_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[getChoreographerApplication] Error:', error);
    return { application: null, error };
  }

  return { application: data || null, error: null };
}

/**
 * Get pending choreographer applications (for admin)
 */
export async function getPendingApplications(options: { limit?: number; offset?: number } = {}) {
  const supabase = await createServerSupabase();
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from('choreographer_applications')
    .select('*')
    .eq('status', 'under_review')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[getPendingApplications] Error:', error);
    return { applications: [], error };
  }

  return { applications: data || [], error: null };
}

/**
 * Get creator analytics for a post
 */
export async function getPostAnalytics(postId: string) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('choreographer_submissions')
    .select('*')
    .eq('choreography_post_id', postId)
    .single();

  if (error) {
    console.error('[getPostAnalytics] Error:', error);
    return { analytics: null, error };
  }

  return { analytics: data, error: null };
}

/**
 * Get creator's aggregate analytics
 */
export async function getCreatorAnalytics(choreographerId: string) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('choreographer_submissions')
    .select('*')
    .eq('choreographer_id', choreographerId);

  if (error) {
    console.error('[getCreatorAnalytics] Error:', error);
    return { analytics: null, error };
  }

  const totalAnalytics = {
    total_views: 0,
    total_saves: 0,
    total_revenue: 0,
    posts: data?.length || 0,
  };

  if (data && data.length > 0) {
    totalAnalytics.total_views = (data as any[]).reduce((sum, a) => sum + (a.views || 0), 0);
    totalAnalytics.total_saves = (data as any[]).reduce((sum, a) => sum + (a.saves || 0), 0);
    totalAnalytics.total_revenue = (data as any[]).reduce((sum, a) => sum + (a.revenue || 0), 0);
  }

  return { analytics: totalAnalytics, error: null };
}

/**
 * Get creator earnings for a period
 */
export async function getCreatorEarnings(choreographerId: string, period?: string) {
  const supabase = await createServerSupabase();

  let query = supabase
    .from('creator_earnings')
    .select('*')
    .eq('choreographer_id', choreographerId)
    .order('period', { ascending: false });

  if (period) {
    query = query.eq('period', period);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getCreatorEarnings] Error:', error);
    return { earnings: [], error };
  }

  return { earnings: data || [], error: null };
}

/**
 * Request payout (creator requests withdrawal)
 */
export async function requestCreatorPayout(
  choreographerId: string,
  amount: number,
  bankDetails?: Record<string, unknown>
) {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('creator_payouts')
    .insert({
      choreographer_id: choreographerId,
      amount,
      bank_details: bankDetails,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[requestCreatorPayout] Error:', error);
    return { payout: null, error };
  }

  return { payout: data, error: null };
}

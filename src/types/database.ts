export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: "student" | "choreographer" | "admin";
  bio: string | null;
  preferences: {
    dance_styles?: string[];
    experience_level?: "beginner" | "intermediate" | "advanced";
  };
  social_links: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface FeedbackSubmission {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string;
  dance_styles: string[];
  other_style: string | null;
  experience_level: "beginner" | "intermediate" | "advanced";
  message: string;
  message_hash: string;
  ip_hash: string;
  created_at: string;
}

export interface DanceStyle {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  gradient_from: string;
  gradient_to: string;
  price_inr: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Routine {
  id: string;
  style_id: string;
  choreographer_id: string;
  title: string;
  slug: string;
  description: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration_seconds: number;
  thumbnail_url: string | null;
  is_published: boolean;
  is_approved: boolean;
  submission_tier?: "community" | "rising" | "official";
  submission_status?:
    | "draft"
    | "pending_review"
    | "ai_evaluating"
    | "needs_improvement"
    | "approved"
    | "rejected"
    | "published";
  caption?: string | null;
  community_video_url?: string | null;
  ai_overall_score?: number | null;
  ai_score_breakdown?: {
    timing?: number;
    energy?: number;
    accuracy?: number;
    expression?: number;
  };
  ai_tags?: string[];
  quality_checklist?: {
    fullBodyVisible?: boolean;
    stableCamera?: boolean;
    goodLighting?: boolean;
  };
  resubmission_count?: number;
  last_feedback?: string | null;
  is_weekly_featured?: boolean;
  featured_week_start?: string | null;
  featured_week_end?: string | null;
  official_selected_at?: string | null;
  creator_badge_awarded?: boolean;
  creator_badge_awarded_at?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  choreographer?: Profile;
  style?: DanceStyle;
  videos?: RoutineVideo[];
  steps?: RoutineStep[];
}

export interface RoutineVideo {
  id: string;
  routine_id: string;
  video_type: "performance" | "teaching" | "practice";
  video_url: string;
  duration_seconds: number | null;
  sort_order: number;
  created_at: string;
}

export interface RoutineStep {
  id: string;
  routine_id: string;
  step_number: number;
  label: string;
  start_time: number;
  end_time: number;
  description: string | null;
  created_at: string;
}

export interface InstructorPoseData {
  id: string;
  routine_id: string;
  timestamp_ms: number;
  keypoints: PoseLandmark[];
  angles: Record<string, number>;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  style_id: string;
  amount_inr: number;
  status: "pending" | "completed" | "refunded";
  payment_ref: string | null;
  created_at: string;
  // Joined
  style?: DanceStyle;
}

export interface UserProgress {
  id: string;
  user_id: string;
  routine_id: string;
  learn_completed: boolean;
  current_step: number;
  steps_completed: number[];
  best_score: number;
  total_sessions: number;
  total_practice_ms: number;
  last_practiced_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  routine?: Routine;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  routine_id: string;
  accuracy_score: number;
  consistency_score: number;
  completion_pct: number;
  duration_ms: number;
  difficulty_level: string | null;
  body_part_scores: Record<string, number> | null;
  mistakes: string[] | null;
  created_at: string;
}

export interface ChoreographerApplication {
  id: string;
  user_id: string;
  portfolio_url: string | null;
  experience: string;
  specialties: string[];
  sample_video: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Joined
  profile?: Profile;
}

export interface Payout {
  id: string;
  choreographer_id: string;
  period_start: string;
  period_end: string;
  total_purchases: number;
  gross_amount_inr: number;
  choreographer_share: number;
  platform_share: number;
  status: "pending" | "processing" | "paid";
  paid_at: string | null;
  created_at: string;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  updated_at: string;
}

export interface ChoreoSubmission {
  id: string;
  user_id: string;
  routine_id: string | null;
  title: string;
  description: string;
  caption: string | null;
  video_url: string;
  style_slug: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  checklist_full_body_visible: boolean;
  checklist_stable_camera: boolean;
  checklist_good_lighting: boolean;
  checklist_passed: boolean;
  tier: "community" | "rising" | "official";
  submission_status:
    | "draft"
    | "pending_review"
    | "ai_evaluating"
    | "needs_improvement"
    | "approved"
    | "rejected"
    | "archived";
  ai_status: "pending" | "queued" | "processing" | "completed" | "failed";
  ai_overall_score: number | null;
  ai_timing_score: number | null;
  ai_energy_score: number | null;
  ai_accuracy_score: number | null;
  ai_expression_score: number | null;
  ai_level_tag: "beginner" | "intermediate" | "pro" | null;
  ai_quality_tag: "clean" | "needs_improvement" | null;
  ai_tags: string[];
  ai_feedback: {
    timing?: number;
    energy?: number;
    accuracy?: number;
    expression?: number;
  };
  improvement_suggestions: string[];
  engagement_score: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  try_this_count: number;
  weekly_points: number;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  version: number;
  parent_submission_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyFeaturedChoreo {
  id: string;
  week_start: string;
  week_end: string;
  slot_position: number;
  submission_id: string;
  routine_id: string | null;
  user_id: string;
  rank_score: number;
  is_curator_override: boolean;
  curator_note: string | null;
  created_by: string | null;
  created_at: string;
}

export type ChoreoReactionType = "loved_it" | "hard" | "practicing" | "fast_moves";

export interface ChoreoReaction {
  id: string;
  choreo_id: string;
  user_id: string | null;
  anon_key: string | null;
  reaction_type: ChoreoReactionType;
  created_at: string;
}

export interface UserSavedChoreo {
  id: string;
  user_id: string;
  choreo_id: string;
  title: string | null;
  video_url: string | null;
  style_slug: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  caption: string | null;
  created_at: string;
}

// AI Pose Types
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface JointAngle {
  name: string;
  angle: number;
  visibility: number;
}

export interface FrameComparison {
  overallScore: number;
  jointScores: Record<string, { diff: number; category: "perfect" | "gentle" | "mistake" }>;
  activeJointCount: number;
}

export interface SessionResult {
  accuracy: number;
  consistency: number;
  completion: number;
  bodyPartScores: Record<string, number>;
  mistakes: string[];
  totalFrames: number;
  perfectFrames: number;
  goodFrames: number;
}

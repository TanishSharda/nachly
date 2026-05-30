import { getSiteUrl } from "@/lib/utils/site-url";

export const SITE_NAME = "Nachly";
export const SITE_DESCRIPTION = "AI-powered dance academy — learn from real choreographers, practice with AI coaching";
export const SITE_URL = getSiteUrl();

export const PRICE_PER_STYLE_INR = 299;
export const PRICE_PER_STYLE_PAISE = 29900;
export const PLATFORM_SHARE_PCT = 40;
export const CHOREOGRAPHER_SHARE_PCT = 60;

export const DANCE_STYLES = ["hip-hop", "bollywood", "kathak", "bhangra"] as const;
export type DanceStyleSlug = (typeof DANCE_STYLES)[number];

export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const VIDEO_TYPES = ["performance", "teaching", "practice"] as const;
export type VideoType = (typeof VIDEO_TYPES)[number];

export const USER_ROLES = ["student", "choreographer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const NAV_LINKS = [
  { label: "Feed", href: "/learn/feed" },
  { label: "Practice", href: "/learn/practice" },
  { label: "Profile", href: "/learn/profile", auth: true },
] as const;

export const DASHBOARD_NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: "home" },
  { label: "Practice", href: "/learn/practice", icon: "monitor" },
  { label: "My Drills", href: "/dashboard/drills", icon: "target" },
  { label: "AI Feedback", href: "/dashboard/feedback", icon: "bar-chart-2" },
  { label: "Send Feedback", href: "/dashboard/send-feedback", icon: "message-square" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "trending-up" },
  { label: "Dance Library", href: "/dashboard/library", icon: "grid" },
  { label: "Profile", href: "/dashboard/profile", icon: "user" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
] as const;

export const STYLE_META: Record<DanceStyleSlug, { name: string; emoji: string; gradientFrom: string; gradientTo: string }> = {
  "hip-hop": { name: "Hip Hop", emoji: "🎤", gradientFrom: "#0E0E0E", gradientTo: "#1C1B1B" },
  bollywood: { name: "Bollywood", emoji: "💃", gradientFrom: "#0E0E0E", gradientTo: "#1C1B1B" },
  kathak: { name: "Kathak", emoji: "🪷", gradientFrom: "#0E0E0E", gradientTo: "#1C1B1B" },
  bhangra: { name: "Bhangra", emoji: "🥁", gradientFrom: "#0E0E0E", gradientTo: "#1C1B1B" },
};

export const FEEDBACK_DANCE_STYLE_OPTIONS = [
  "Hip Hop",
  "Bollywood",
  "Contemporary",
  "Breaking",
  "Other",
] as const;

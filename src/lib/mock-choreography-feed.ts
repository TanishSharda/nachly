import type { ChoreographyFeedItem } from "@/lib/supabase/queries/choreos";

const now = new Date().toISOString();

export const MOCK_CHOREOGRAPHY_FEED: ChoreographyFeedItem[] = [
  {
    id: "feed-monsoon-1",
    choreographer_id: "choreo-mono-1",
    creator_name: "Naachly Official",
    creator_avatar_url: null,
    title: "Monsoon Groove",
    description: "Clean traveling steps, expressive hands, and a finish built for repeat practice.",
    dance_style: "bollywood",
    difficulty_level: "intermediate",
    demo_reel_id: "demo-monsoon-1",
    tutorial_id: "tutorial-monsoon-1",
    status: "published",
    views_count: 12400,
    saves_count: 880,
    published_at: now,
    created_at: now,
    updated_at: now,
    demo_reel: {
      id: "demo-monsoon-1",
      choreography_post_id: "feed-monsoon-1",
      video_url: "/videos/one-night.optimized.mp4",
      thumbnail_url: "/videos/one-night.poster.jpg",
      duration_seconds: 58,
      music_credit: "Amaal Mallik remix edit",
      created_at: now,
    },
    tutorial: {
      id: "tutorial-monsoon-1",
      choreography_post_id: "feed-monsoon-1",
      video_url: "/videos/one-night.optimized.mp4",
      duration_seconds: 312,
      created_at: now,
    },
  },
  {
    id: "feed-bhangra-1",
    choreographer_id: "choreo-bhangra-1",
    creator_name: "Amrit K.",
    creator_avatar_url: null,
    title: "Bhangra Rush",
    description: "Explosive shoulders, grounded jumps, and a tempo that stays front-footed.",
    dance_style: "bhangra",
    difficulty_level: "advanced",
    demo_reel_id: "demo-bhangra-1",
    tutorial_id: "tutorial-bhangra-1",
    status: "published",
    views_count: 9850,
    saves_count: 710,
    published_at: now,
    created_at: now,
    updated_at: now,
    demo_reel: {
      id: "demo-bhangra-1",
      choreography_post_id: "feed-bhangra-1",
      video_url: "/videos/bijuria.optimized.mp4",
      thumbnail_url: "/videos/bijuria.poster.jpg",
      duration_seconds: 44,
      music_credit: "Punjabi club edit",
      created_at: now,
    },
    tutorial: {
      id: "tutorial-bhangra-1",
      choreography_post_id: "feed-bhangra-1",
      video_url: "/videos/bijuria.optimized.mp4",
      duration_seconds: 268,
      created_at: now,
    },
  },
  {
    id: "feed-fusion-1",
    choreographer_id: "choreo-fusion-1",
    creator_name: "Rhea V.",
    creator_avatar_url: null,
    title: "Fusion Lines",
    description: "A soft, musical beginner piece that bridges classical timing and contemporary flow.",
    dance_style: "fusion",
    difficulty_level: "beginner",
    demo_reel_id: "demo-fusion-1",
    tutorial_id: "tutorial-fusion-1",
    status: "published",
    views_count: 6740,
    saves_count: 420,
    published_at: now,
    created_at: now,
    updated_at: now,
    demo_reel: {
      id: "demo-fusion-1",
      choreography_post_id: "feed-fusion-1",
      video_url: "/videos/zumba-basics.optimized.mp4",
      thumbnail_url: "/videos/one-night.poster.jpg",
      duration_seconds: 51,
      music_credit: "Fusion edit",
      created_at: now,
    },
    tutorial: {
      id: "tutorial-fusion-1",
      choreography_post_id: "feed-fusion-1",
      video_url: "/videos/zumba-basics.optimized.mp4",
      duration_seconds: 241,
      created_at: now,
    },
  },
  {
    id: "feed-cardio-1",
    choreographer_id: "choreo-cardio-1",
    creator_name: "Studio Pulse",
    creator_avatar_url: null,
    title: "Cardio Burst",
    description: "A fast learner-friendly loop with high repeat value and crisp counts.",
    dance_style: "bollywood",
    difficulty_level: "beginner",
    demo_reel_id: "demo-cardio-1",
    tutorial_id: "tutorial-cardio-1",
    status: "published",
    views_count: 14890,
    saves_count: 1110,
    published_at: now,
    created_at: now,
    updated_at: now,
    demo_reel: {
      id: "demo-cardio-1",
      choreography_post_id: "feed-cardio-1",
      video_url: "/videos/zumba-cardio.optimized.mp4",
      thumbnail_url: "/videos/one-night.poster.jpg",
      duration_seconds: 47,
      music_credit: "Cardio loop edit",
      created_at: now,
    },
    tutorial: {
      id: "tutorial-cardio-1",
      choreography_post_id: "feed-cardio-1",
      video_url: "/videos/zumba-cardio.optimized.mp4",
      duration_seconds: 286,
      created_at: now,
    },
  },
];

export function getMockChoreographyFeed(options: {
  limit?: number;
  offset?: number;
  style?: string;
  difficulty?: string;
} = {}) {
  const { limit = 20, offset = 0, style, difficulty } = options;

  const filtered = MOCK_CHOREOGRAPHY_FEED.filter((item) => {
    if (style && style !== "all" && item.dance_style !== style) {
      return false;
    }

    if (difficulty && difficulty !== "all" && item.difficulty_level !== difficulty) {
      return false;
    }

    return true;
  });

  return {
    posts: filtered.slice(offset, offset + limit),
    hasMore: offset + limit < filtered.length,
    nextOffset: offset + limit,
    fallback: true,
  };
}
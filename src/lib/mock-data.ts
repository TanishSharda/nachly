import type { DanceStyle, Routine, RoutineStep, RoutineVideo } from "@/types/database";

export const MOCK_STYLES: DanceStyle[] = [
  {
    id: "style-1",
    slug: "hip-hop",
    name: "Hip Hop",
    description: "Master the fundamentals of hip hop with groove, isolations, and street-style choreography. From popping to locking, learn the moves that define urban dance culture.",
    cover_image: null,
    gradient_from: "#0E0E0E",
    gradient_to: "#1C1B1B",
    price_inr: 19900,
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "style-2",
    slug: "bollywood",
    name: "Bollywood",
    description: "Feel the rhythm of Bollywood with expressive choreography, graceful hand movements, and high-energy footwork. Dance to the biggest Bollywood hits.",
    cover_image: null,
    gradient_from: "#0E0E0E",
    gradient_to: "#1C1B1B",
    price_inr: 29900,
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "style-3",
    slug: "kathak",
    name: "Kathak",
    description: "Explore the elegance of Kathak, one of India's classical dance forms. Learn intricate footwork patterns, expressive storytelling through abhinaya, and graceful spins.",
    cover_image: null,
    gradient_from: "#0E0E0E",
    gradient_to: "#1C1B1B",
    price_inr: 19900,
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "style-4",
    slug: "bhangra",
    name: "Bhangra",
    description: "Get energized with Bhangra, the high-energy Punjabi folk dance. Learn powerful shoulder movements, jumps, and the infectious beats that make everyone want to dance.",
    cover_image: null,
    gradient_from: "#0E0E0E",
    gradient_to: "#1C1B1B",
    price_inr: 19900,
    is_active: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
];

// Only Bijuria has a real video — no dummy routines
const BIJURIA_ROUTINE: Routine = {
  id: "routine-bollywood-bijuria",
  style_id: "style-2",
  choreographer_id: "choreographer-1",
  title: "Bijuria",
  slug: "bijuria",
  description: "Dance to the iconic Bijuria! Learn graceful Bollywood moves with expressive hand gestures, playful footwork, and the infectious energy of this timeless classic. A perfect blend of folk and filmi style.",
  difficulty: "intermediate",
  duration_seconds: 42,
  thumbnail_url: null,
  is_published: true,
  is_approved: true,
  sort_order: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const ONE_NIGHT_ROUTINE: Routine = {
  id: "routine-bollywood-one-night",
  style_id: "style-2",
  choreographer_id: "choreographer-1",
  title: "One Night",
  slug: "one-night",
  description:
    "A high-energy Bollywood combo with strong accents, dramatic arms, and stage-ready transitions. Great for building confidence and performance texture.",
  difficulty: "intermediate",
  duration_seconds: 58,
  thumbnail_url: null,
  is_published: true,
  is_approved: true,
  sort_order: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Only real routines — dummy routines removed
export const MOCK_ROUTINES: Record<string, Routine[]> = {
  "hip-hop": [],
  bollywood: [BIJURIA_ROUTINE, ONE_NIGHT_ROUTINE],
  kathak: [],
  bhangra: [],
};

const STEP_INTERVAL = 10; // seconds per step

export function getMockSteps(routineId: string, durationOverride?: number): RoutineStep[] {
  let totalDuration = durationOverride || 90;
  for (const routines of Object.values(MOCK_ROUTINES)) {
    const found = routines.find((r) => r.id === routineId);
    if (found) {
      totalDuration = found.duration_seconds;
      break;
    }
  }

  const stepCount = Math.ceil(totalDuration / STEP_INTERVAL);

  return Array.from({ length: stepCount }, (_, i) => {
    const startTime = i * STEP_INTERVAL;
    const endTime = Math.min((i + 1) * STEP_INTERVAL, totalDuration);

    return {
      id: `step-${routineId}-${i + 1}`,
      routine_id: routineId,
      step_number: i + 1,
      label: `Step ${i + 1}`,
      start_time: startTime,
      end_time: endTime,
      description: `Practice this ${Math.round(endTime - startTime)}s segment. Watch carefully, then try it yourself.`,
      created_at: new Date().toISOString(),
    };
  });
}

// Map of routine IDs to their real video files (in public/videos/)
const ROUTINE_VIDEOS: Record<string, string> = {
  "routine-bollywood-bijuria": "/videos/bijuria.mp4",
  "routine-bollywood-one-night": "/videos/one-night.mp4",
};

export function getMockVideos(routineId: string): RoutineVideo[] {
  const videoUrl = ROUTINE_VIDEOS[routineId] || "";
  return [
    {
      id: `video-${routineId}-perf`,
      routine_id: routineId,
      video_type: "performance",
      video_url: videoUrl,
      duration_seconds: 240,
      sort_order: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: `video-${routineId}-teach`,
      routine_id: routineId,
      video_type: "teaching",
      video_url: videoUrl,
      duration_seconds: 360,
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: `video-${routineId}-prac`,
      routine_id: routineId,
      video_type: "practice",
      video_url: videoUrl,
      duration_seconds: 240,
      sort_order: 2,
      created_at: new Date().toISOString(),
    },
  ];
}

export function getRoutineVideoUrl(routineId: string): string | null {
  return ROUTINE_VIDEOS[routineId] || null;
}

export function getStyleBySlug(slug: string): DanceStyle | undefined {
  return MOCK_STYLES.find((s) => s.slug === slug);
}

export function getRoutineBySlug(styleSlug: string, routineSlug: string): Routine | undefined {
  return MOCK_ROUTINES[styleSlug]?.find((r) => r.slug === routineSlug);
}

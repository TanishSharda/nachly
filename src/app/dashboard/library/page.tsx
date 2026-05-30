"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import { getChoreographyIndex } from "@/lib/api/choreos";

type ChoreoItem = {
  styleSlug: string;
  styleName?: string;
  routineSlug?: string | null;
};

type PracticeSession = {
  styleSlug?: string;
  completion?: number;
};

type StyleCard = {
  slug: string;
  name: string;
  routineCount: number;
  firstRoutineSlug: string | null;
  gradientFrom: string;
  gradientTo: string;
  progress: number;
};

const STYLE_GRADIENTS: Record<string, { from: string; to: string }> = {
  bollywood: { from: "#e11d48", to: "#fb7185" },
  "hip-hop": { from: "#2563eb", to: "#22d3ee" },
  kathak: { from: "#f59e0b", to: "#f97316" },
  bhangra: { from: "#16a34a", to: "#84cc16" },
};

type AccessState = {
  purchasedSlugs: string[];
  subscriptionActive: boolean;
  loading: boolean;
};

export default function DashLibraryPage() {
  const [access, setAccess] = useState<AccessState>({ purchasedSlugs: [], subscriptionActive: false, loading: true });
  const [styleCards, setStyleCards] = useState<StyleCard[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadAccess() {
      try {
        const [subscriptionResponse, sessionsResponse] = await Promise.all([
          fetch("/api/subscriptions/check", { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
          fetch("/api/practice-sessions?limit=100", { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
        ]);

        const choreos = await getChoreographyIndex();
        const sessions = Array.isArray(sessionsResponse?.sessions) ? (sessionsResponse.sessions as PracticeSession[]) : [];

        const styleMap = new Map<string, { name: string; routineSlugs: Set<string> }>();
        for (const choreo of choreos) {
          const slug = String(choreo.styleSlug || "").trim();
          if (!slug) continue;
          const current = styleMap.get(slug) || { name: choreo.styleName || slug, routineSlugs: new Set<string>() };
          if (choreo.routineSlug) {
            current.routineSlugs.add(String(choreo.routineSlug));
          }
          styleMap.set(slug, current);
        }

        const styleSlugs = [...styleMap.keys()];
        const purchaseResponses = await Promise.all(
          styleSlugs.map(async (slug) => {
            const response = await fetch(`/api/purchases/check?styleSlug=${encodeURIComponent(slug)}`, { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));
            return { slug, purchased: Boolean(response.ok && payload?.purchased) };
          })
        );

        const styleProgress = new Map<string, { total: number; count: number }>();
        for (const session of sessions) {
          const slug = String(session.styleSlug || "").trim();
          if (!slug) continue;
          const completion = Number(session.completion || 0);
          const current = styleProgress.get(slug) || { total: 0, count: 0 };
          current.total += completion;
          current.count += 1;
          styleProgress.set(slug, current);
        }

        const nextStyles: StyleCard[] = styleSlugs.map((slug) => {
          const meta = styleMap.get(slug)!;
          const progressMeta = styleProgress.get(slug);
          const gradient = STYLE_GRADIENTS[slug] || { from: "#3f3f46", to: "#71717a" };
          return {
            slug,
            name: meta.name,
            routineCount: meta.routineSlugs.size,
            firstRoutineSlug: [...meta.routineSlugs][0] || null,
            gradientFrom: gradient.from,
            gradientTo: gradient.to,
            progress: progressMeta && progressMeta.count > 0 ? Math.round(progressMeta.total / progressMeta.count) : 0,
          };
        });

        if (!mounted) return;

        setStyleCards(nextStyles);
        setAccess({
          purchasedSlugs: purchaseResponses.filter((item) => item.purchased).map((item) => item.slug),
          subscriptionActive: Boolean(subscriptionResponse?.active),
          loading: false,
        });
      } catch {
        if (mounted) {
          setStyleCards([]);
          setAccess({ purchasedSlugs: [], subscriptionActive: false, loading: false });
        }
      }
    }

    void loadAccess();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleStyles = useMemo(() => {
    if (access.subscriptionActive) return styleCards;
    return styleCards.filter((style) => access.purchasedSlugs.includes(style.slug));
  }, [access.purchasedSlugs, access.subscriptionActive, styleCards]);

  const hasAccess = visibleStyles.length > 0;

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Dance Library</h1>
        <p className="text-zinc-400 mt-2 text-lg">Explore your unlocked styles and masterclasses.</p>
      </header>

      {access.loading ? (
        <div className="rounded-2xl p-6 dash-glass dash-card text-zinc-400">Loading your library...</div>
      ) : null}

      {access.subscriptionActive ? (
        <div className="mb-6 rounded-2xl border border-[#F3B2AB]/20 bg-[#F3B2AB]/10 px-4 py-3 text-sm text-white">
          <p className="font-semibold text-[#F3B2AB]">Naachly Plus active</p>
          <p className="mt-1 text-zinc-200">You can access the full library from your subscription.</p>
        </div>
      ) : null}

      {!hasAccess && !access.loading ? (
        <div className="rounded-2xl p-6 dash-glass dash-card text-zinc-300">
          No unlocked styles yet. <Link href="/learn/feed" className="text-[#F3B2AB] underline">Explore styles</Link> or <Link href="/subscribe" className="text-[#F3B2AB] underline">view plans</Link>.
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {visibleStyles.map((style) => {

          return (
            <div
              key={style.slug}
              className="min-h-[220px] rounded-2xl overflow-hidden relative flex flex-col justify-end p-6 dash-glass dash-card cursor-pointer group animate-slide-up"
              style={{
                background: `linear-gradient(to top, rgba(0,0,0,0.85), transparent), linear-gradient(135deg, ${style.gradientFrom}, ${style.gradientTo})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-nred-700/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-white">{style.name}</h3>
                  <Badge variant={access.subscriptionActive ? "success" : "outline"} size="sm">
                    {access.subscriptionActive ? "Plus" : "Unlocked"}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{style.routineCount} routines</p>
                <Progress value={style.progress} size="sm" className="mt-4" />
                <div className="mt-4 flex gap-2">
                  <Link href={`/explore/${style.slug}`} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15">
                    Open style
                  </Link>
                  {style.firstRoutineSlug ? (
                    <Link href={`/explore/${style.slug}/${style.firstRoutineSlug}`} className="rounded-lg bg-[#F3B2AB]/15 px-3 py-1.5 text-xs font-semibold text-[#F3B2AB] hover:bg-[#F3B2AB]/20">
                      First routine
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

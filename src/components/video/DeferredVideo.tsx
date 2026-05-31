"use client";

import React, { useEffect, useRef, useState } from "react";

type Source = { src: string; type?: string };

export default function DeferredVideo({
  src,
  sources,
  poster,
  className,
  autoPlay = false,
  muted = false,
  loop = false,
  playsInline = true,
  preload = "metadata",
}: {
  src?: string;
  sources?: Source[];
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  preload?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(false);

  // Keyboard play/pause support for accessibility
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (el.paused) void el.play().catch(() => {});
        else el.pause();
      }
      if (e.key === 'Enter') {
        if (el.paused) void el.play().catch(() => {});
        else el.pause();
      }
    };

    el.addEventListener('keydown', onKey as any);
    return () => el.removeEventListener('keydown', onKey as any);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (visible) {
      try {
        v.load();
        if (autoPlay) {
          void v.play().catch(() => {});
        }
      } catch {}
    }
  }, [visible, autoPlay]);

  return (
    <video
      ref={ref}
      poster={poster}
      tabIndex={0}
      aria-label={poster ? 'Video preview' : 'Video'}
      className={className}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      preload={preload}
    >
      {visible && (
        src ? (
          <source key={src} src={src} />
        ) : sources && Array.isArray(sources) ? (
          sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)
        ) : null
      )}
    </video>
  );
}

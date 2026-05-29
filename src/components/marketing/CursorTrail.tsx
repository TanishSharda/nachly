"use client";

import { useEffect } from "react";

export default function CursorTrail() {
  useEffect(() => {
    const root = document.documentElement;
    const trail: HTMLDivElement[] = [];

    function createDot(x: number, y: number) {
      const el = document.createElement("div");
      el.className = "nachly-cursor-dot";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      document.body.appendChild(el);
      trail.push(el);
      window.setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "scale(1.6)";
        window.setTimeout(() => el.remove(), 600);
      }, 40);
    }

    let ticking = false;
    function onMove(e: MouseEvent) {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          createDot(e.clientX, e.clientY);
          ticking = false;
        });
      }
    }

    root.addEventListener("pointermove", onMove);
    return () => {
      root.removeEventListener("pointermove", onMove);
      trail.forEach((d) => d.remove());
    };
  }, []);

  return null;
}

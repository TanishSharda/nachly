"use client";

import { useEffect } from "react";

export default function AtmosphereController() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-atmosphere]'));
    if (!sections.length) return;

    const root = document.documentElement;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const atm = entry.target.getAttribute("data-atmosphere");
          if (!atm) return;
          if (entry.isIntersecting) {
            root.classList.remove("atmosphere-hiphop", "atmosphere-contemporary", "atmosphere-afro");
            root.classList.add(`atmosphere-${atm}`);
          }
        });
      },
      { threshold: 0.45 }
    );

    sections.forEach((s) => obs.observe(s));

    return () => obs.disconnect();
  }, []);

  return null;
}

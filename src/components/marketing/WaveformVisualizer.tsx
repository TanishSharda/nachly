"use client";

import { useEffect, useRef } from "react";

export default function WaveformVisualizer({ amplitude = 0.6 }: { amplitude?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      t += 0.02;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(243,178,171,0.85)";
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const nx = x / w;
        const y = h / 2 + Math.sin(nx * 12 - t * 2) * h * 0.12 * amplitude * (0.6 + 0.4 * Math.sin(t * 0.7 + nx * 8));
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [amplitude]);

  return <canvas ref={canvasRef} className="w-full h-12 rounded-md" />;
}

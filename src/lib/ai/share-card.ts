// lib/ai/share-card.ts — Generate a shareable score card image via Canvas API

interface ShareCardOptions {
  userName?: string;
  routineTitle?: string;
  accuracy?: number;
  consistency?: number;
  completion?: number;
  streak?: number;
}

/** Rounded rect helper */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates a PNG data URL of a score card (1080×1080).
 * Uses black/red/white theme matching Naachly branding.
 */
export async function generateShareCard({
  userName = "Dancer",
  routineTitle = "Dance Session",
  accuracy = 0,
  consistency = 0,
  completion = 0,
  streak = 0,
}: ShareCardOptions): Promise<string> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#000000");
  bgGrad.addColorStop(0.5, "#0A0A0A");
  bgGrad.addColorStop(1, "#050505");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Ambient glow circles
  ctx.save();
  ctx.globalAlpha = 0.08;
  const glow1 = ctx.createRadialGradient(200, 200, 0, 200, 200, 400);
  glow1.addColorStop(0, "#A3E635");
  glow1.addColorStop(1, "transparent");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(880, 880, 0, 880, 880, 400);
  glow2.addColorStop(0, "#65A30D");
  glow2.addColorStop(1, "transparent");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // ── Border ──
  const borderGrad = ctx.createLinearGradient(0, 0, W, 0);
  borderGrad.addColorStop(0, "#A3E635");
  borderGrad.addColorStop(1, "#65A30D");
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 4;
  roundRect(ctx, 20, 20, W - 40, H - 40, 32);
  ctx.stroke();

  // ── Logo ──
  ctx.font = "700 56px Inter, Sora, sans-serif";
  const logoGrad = ctx.createLinearGradient(340, 80, 740, 80);
  logoGrad.addColorStop(0, "#A3E635");
  logoGrad.addColorStop(1, "#FFFFFF");
  ctx.fillStyle = logoGrad;
  ctx.textAlign = "center";
  ctx.fillText("Naachly", W / 2, 120);

  // ── User name + routine ──
  ctx.font = "600 36px Inter, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(userName, W / 2, 200);

  ctx.font = "400 24px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(routineTitle, W / 2, 245);

  // ── Score circles ──
  const scores = [
    { value: accuracy, label: "Accuracy", color: "#A3E635" },
    { value: consistency, label: "Consistency", color: "#FFFFFF" },
    { value: completion, label: "Completion", color: "#39FF14" },
  ];

  const circleY = 440;
  const circleR = 85;
  const spacing = 280;
  const startX = (W - spacing * 2) / 2;

  for (let i = 0; i < scores.length; i++) {
    const cx = startX + i * spacing;
    const { value, label, color } = scores[i];

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, circleY, circleR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 10;
    ctx.stroke();

    // Progress arc
    ctx.beginPath();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (value / 100) * Math.PI * 2;
    ctx.arc(cx, circleY, circleR, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";

    // Add glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Value text
    ctx.font = "700 42px Inter, sans-serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(`${value}%`, cx, circleY + 14);

    // Label
    ctx.font = "400 18px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(label, cx, circleY + circleR + 36);
  }

  // ── Overall score ──
  const overall = Math.round((accuracy + consistency + completion) / 3);
  ctx.font = "800 72px Inter, sans-serif";
  const overallGrad = ctx.createLinearGradient(
    W / 2 - 80,
    650,
    W / 2 + 80,
    650
  );
  overallGrad.addColorStop(0, "#A3E635");
  overallGrad.addColorStop(1, "#FFFFFF");
  ctx.fillStyle = overallGrad;
  ctx.fillText(`${overall}`, W / 2, 700);

  ctx.font = "500 22px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("Overall Score", W / 2, 740);

  // ── Streak ──
  if (streak > 0) {
    ctx.font = "600 28px Inter, sans-serif";
    ctx.fillStyle = "#A3E635";
    ctx.fillText(`🔥 ${streak} day streak`, W / 2, 810);
  }

  // ── Motivational text ──
  let motivText = "";
  if (overall >= 85) motivText = "Dance floor legend! 🏆";
  else if (overall >= 60) motivText = "Getting better every day! 💪";
  else motivText = "Keep grooving! 🎶";

  ctx.font = "400 26px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(motivText, W / 2, 870);

  // ── Footer ──
  ctx.font = "400 18px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillText("Try it yourself → naachly.com", W / 2, H - 60);

  return canvas.toDataURL("image/png");
}

/**
 * Download the share card image.
 */
export async function downloadShareCard(
  opts: ShareCardOptions
): Promise<string> {
  const dataUrl = await generateShareCard(opts);
  const link = document.createElement("a");
  link.download = `naachly-${opts.userName || "score"}-${Date.now()}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
}

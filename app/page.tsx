"use client";

import React, { useEffect, useRef, useState } from "react";

// =============================
// Spirit PFP Generator (from scratch)
// - 100% original client-side code (no external APIs)
// - Upload a square (or any) image
// - Apply neon-cyan "spirit" glow + particles
// - Tweak sliders, then Download PNG
// =============================

export default function SpiritPfpGenerator() {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState(1024); // output size

  // Effect options
  const [glow, setGlow] = useState(24); // px blur for glow
  const [intensity, setIntensity] = useState(0.7); // 0..1
  const [cyanize, setCyanize] = useState(0.55); // 0..1 (how much cyan tint)
  const [contrast, setContrast] = useState(1.1); // 0.5..2
  const [saturation, setSaturation] = useState(1.25); // 0.2..2.5
  const [vignette, setVignette] = useState(0.35); // 0..1
  const [particles, setParticles] = useState(150); // count of sparkles
  const [lightning, setLightning] = useState(true);
  const [background, setBackground] = useState<"dark" | "transparent">("dark");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPick = () => fileRef.current?.click();

  const handleFile = (f: File) => {
    const url = URL.createObjectURL(f);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const draw = async () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    setBusy(true);

    const W = size;
    const H = size;
    cv.width = W;
    cv.height = H;

    // Background
    ctx.clearRect(0, 0, W, H);
    if (background === "dark") {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0b1220");
      g.addColorStop(1, "#0a0f1a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // Draw user image, fit-cover to square
    if (img) {
      const { sx, sy, s, dx, dy, d } = fitCover(img.width, img.height, W, H);
      // Base, slightly enhanced
      ctx.filter = `contrast(${contrast}) saturate(${saturation})`;
      ctx.drawImage(img, sx, sy, s, s, dx, dy, d, d);
      ctx.filter = "none";

      // Cyan tint overlay (screen)
      ctx.globalCompositeOperation = "screen";
      const tint = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.8);
      const c = clamp(cyanize, 0, 1);
      tint.addColorStop(0, `rgba(0, 255, 255, ${0.35 * c})`);
      tint.addColorStop(1, `rgba(0, 160, 255, ${0.10 * c})`);
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";

      // Glow pass: blur the original composite, then screen it back
      if (glow > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.filter = `blur(${glow}px) brightness(${1 + intensity}) saturate(${1 + intensity * 0.4})`;
        ctx.drawImage(cv, 0, 0); // self-blur
        ctx.restore();
      }

      // Spirit particles
      drawParticles(ctx, W, H, particles, intensity);

      // Lightning arcs (optional)
      if (lightning) drawLightning(ctx, W, H, 6, intensity);

      // Vignette
      if (vignette > 0) {
        const vg = ctx.createRadialGradient(W / 2, H / 2, W * (1 - vignette), W / 2, H / 2, W * 0.75);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }
    }

    setBusy(false);
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, size, glow, intensity, cyanize, contrast, saturation, vignette, particles, lightning, background]);

  const reset = () => {
    setGlow(24);
    setIntensity(0.7);
    setCyanize(0.55);
    setContrast(1.1);
    setSaturation(1.25);
    setVignette(0.35);
    setParticles(150);
    setLightning(true);
    setBackground("dark");
  };

  const download = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = `spirit-pfp-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex flex-col items-center p-6 gap-6">
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
        Enter the <span className="text-cyan-300">Spirit</span> World
      </h1>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="w-full max-w-5xl grid md:grid-cols-[1.1fr_0.9fr] gap-6"
      >
        {/* Canvas / Preview */}
        <div className="bg-slate-800 rounded-2xl shadow-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">🪄</span>
              <span className="font-semibold">Preview</span>
            </div>
            <div className="text-xs opacity-70">Output: {size}×{size}px</div>
          </div>

          <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-600 flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full" />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={onPick}
              className="px-4 py-2 rounded-2xl bg-slate-700 hover:bg-slate-600 transition flex items-center gap-2"
            >
              📷 Upload Image
            </button>
            <button
              onClick={download}
              className="px-4 py-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold transition flex items-center gap-2"
            >
              💾 Download PNG
            </button>
            <button
              onClick={reset}
              className="px-3 py-2 rounded-2xl bg-slate-700 hover:bg-slate-600 transition flex items-center gap-2"
              title="Reset controls"
            >
              🔄 Reset
            </button>
            <span className="ml-auto text-sm opacity-70 flex items-center gap-1">
              ✨ {busy ? "Rendering…" : "Ready"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-slate-800 rounded-2xl shadow-xl p-5 flex flex-col gap-5">
          <Control label="Export Size" hint="Higher = crisper, larger file">
            <input
              type="range" min={512} max={2048} step={256}
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-xs opacity-70">{size}px</div>
          </Control>

          <Control label="Glow" hint="Outer aura blur">
            <input type="range" min={0} max={60} value={glow} onChange={(e)=>setGlow(parseInt(e.target.value))} className="w-full"/>
          </Control>

          <Control label="Intensity" hint="How strong the effect blends">
            <input type="range" min={0} max={1} step={0.01} value={intensity} onChange={(e)=>setIntensity(parseFloat(e.target.value))} className="w-full"/>
          </Control>

          <Control label="Cyanize" hint="Adds a cyan/blue spirit tint">
            <input type="range" min={0} max={1} step={0.01} value={cyanize} onChange={(e)=>setCyanize(parseFloat(e.target.value))} className="w-full"/>
          </Control>

          <Control label="Contrast">
            <input type="range" min={0.5} max={2} step={0.01} value={contrast} onChange={(e)=>setContrast(parseFloat(e.target.value))} className="w-full"/>
          </Control>

          <Control label="Saturation">
            <input type="range" min={0.2} max={2.5} step={0.01} value={saturation} onChange={(e)=>setSaturation(parseFloat(e.target.value))} className="w-full"/>
          </Control>

          <Control label="Vignette">
            <input type="range" min={0} max={1} step={0.01} value={vignette} onChange={(e)=>setVignette(parseFloat(e.target.value))} className="w-full"/>
          </Control>

          <Control label="Particles" hint="Mystic sparkles">
            <input type="range" min={0} max={600} step={10} value={particles} onChange={(e)=>setParticles(parseInt(e.target.value))} className="w-full"/>
          </Control>

          <div className="flex items-center justify-between gap-4">
            <Toggle label="Lightning" checked={lightning} onChange={setLightning} />
            <div className="flex items-center gap-2 text-sm">
              <span className="opacity-70">Background</span>
              <select
                value={background}
                onChange={(e)=>setBackground(e.target.value as any)}
                className="bg-slate-700 rounded-xl px-3 py-1"
              >
                <option value="dark">Dark</option>
                <option value="transparent">Transparent</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-600 p-4 text-xs leading-relaxed opacity-80">
            <p className="mb-2">Drop an image anywhere on this panel or use <b>Upload Image</b>. The effect renders locally in your browser.</p>
            <p>Tip: Start with a clean, centered PFP (1024×1024). For transparent export, choose <b>Background → Transparent</b>.</p>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e)=>{ const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <PrimaryCTA onClick={onPick}>
        Spiritify Your PFP
      </PrimaryCTA>

      <footer className="text-xs opacity-60 pt-2">
        Built fresh for you — not affiliated with spiritworld.meme.
      </footer>
    </div>
  );
}

function Control({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-700 rounded-xl p-4 border border-slate-600">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-xs opacity-60">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`px-3 py-1 rounded-xl border border-slate-600 ${checked ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-700"}`}
    >
      {label}: <b className="ml-1">{checked ? "On" : "Off"}</b>
    </button>
  );
}

function PrimaryCTA({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 px-8 py-4 rounded-full bg-cyan-400 text-slate-900 font-extrabold text-lg shadow-2xl hover:shadow-cyan-500/30 hover:bg-cyan-300 transition transform hover:scale-105"
    >
      {children}
    </button>
  );
}

// =============================
// Helpers
// =============================
function clamp(v: number, a: number, b: number) { 
  return Math.max(a, Math.min(b, v)); 
}

function fitCover(iw: number, ih: number, W: number, H: number) {
  const ir = iw / ih, r = W / H;
  let s = 0, sx = 0, sy = 0, d = 0, dx = 0, dy = 0;
  if (ir > r) { // wider image
    s = Math.floor(ih * (W / H));
    sx = Math.floor((iw - s) / 2);
    sy = 0;
    d = W;
    dx = 0; dy = 0;
  } else {
    s = Math.floor(iw * (H / W));
    sy = Math.floor((ih - s) / 2);
    sx = 0;
    d = H;
    dx = 0; dy = 0;
  }
  return { sx, sy, s, dx, dy, d };
}

function drawParticles(ctx: CanvasRenderingContext2D, W: number, H: number, count: number, intensity: number) {
  const rnd = seeded(Math.floor(intensity * 1e6) ^ W ^ H);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < count; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = 0.5 + rnd() * 2.2;
    const a = 0.35 + rnd() * 0.45;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, `rgba(100,220,255,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLightning(ctx: CanvasRenderingContext2D, W: number, H: number, branches: number, intensity: number) {
  const rnd = seeded(12345 + Math.floor(intensity * 1000));
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (let b = 0; b < branches; b++) {
    const x0 = rnd() * W * 0.8 + W * 0.1;
    const y0 = rnd() * H * 0.8 + H * 0.1;
    const len = (H * 0.25 + rnd() * H * 0.35) * (0.7 + intensity * 0.6);
    const segments = 15 + Math.floor(rnd() * 18);
    const jitter = 10 + 30 * rnd();

    const pts: [number, number][] = [[x0, y0]];
    let x = x0, y = y0;
    const angle = (rnd() * Math.PI * 2);
    for (let i = 1; i <= segments; i++) {
      x += Math.cos(angle + (rnd() - 0.5) * 0.5) * (len / segments);
      y += Math.sin(angle + (rnd() - 0.5) * 0.5) * (len / segments);
      x += (rnd() - 0.5) * jitter;
      y += (rnd() - 0.5) * jitter;
      pts.push([x, y]);
    }

    // glow
    ctx.strokeStyle = "rgba(120,220,255,0.55)";
    ctx.lineWidth = 6;
    ctx.filter = `blur(${8 + 10 * intensity}px)`;
    path(ctx, pts); ctx.stroke();

    // core
    ctx.filter = "none";
    ctx.strokeStyle = "rgba(200,255,255,0.9)";
    ctx.lineWidth = 2;
    path(ctx, pts); ctx.stroke();
  }
  ctx.restore();
}

function path(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
}

function seeded(seed: number) {
  // Tiny LCG
  let s = seed >>> 0 || 1;
  return function () {
    s = (1664525 * s + 1013904223) >>> 0;
    return (s & 0x00ffffff) / 0x01000000;
  }
}
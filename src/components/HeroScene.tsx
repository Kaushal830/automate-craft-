"use client";

import { useEffect, useRef } from "react";
import { useScroll, useTransform, motion, useSpring } from "framer-motion";

interface HeroSceneProps {
  isPromptFocused?: boolean;
}

/* ─── Aurora Blob ─── */
class AuroraBlob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: [number, number, number];
  phase: number;
  breathSpeed: number;
  breathAmp: number;

  constructor(
    width: number,
    height: number,
    color: [number, number, number],
    radiusRange: [number, number]
  ) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.25;
    this.vy = (Math.random() - 0.5) * 0.2;
    this.radius = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
    this.color = color;
    this.phase = Math.random() * Math.PI * 2;
    this.breathSpeed = 0.003 + Math.random() * 0.004;
    this.breathAmp = 0.12 + Math.random() * 0.1;
  }

  update(width: number, height: number, time: number, speedMult: number) {
    this.x += this.vx * speedMult;
    this.y += this.vy * speedMult;

    // Gentle wrap-around
    if (this.x < -this.radius) this.x = width + this.radius;
    if (this.x > width + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = height + this.radius;
    if (this.y > height + this.radius) this.y = -this.radius;

    // Breathing scale
    return this.radius * (1 + Math.sin(time * this.breathSpeed + this.phase) * this.breathAmp);
  }
}

export default function HeroScene({ isPromptFocused = false }: HeroSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPromptFocusedRef = useRef(isPromptFocused);

  useEffect(() => {
    isPromptFocusedRef.current = isPromptFocused;
  }, [isPromptFocused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2); // Cap DPR for performance
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reduceMotionQuery.matches;
    let isPageVisible = document.visibilityState === "visible";

    const sizeCanvas = () => {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    sizeCanvas();

    // Aurora color palette — deep blues, cyans, violets fading into dark
    const blobs: AuroraBlob[] = [
      // Primary blue aurora — large, dominant
      new AuroraBlob(width, height, [26, 58, 143], [280, 400]),    // deep blue
      new AuroraBlob(width, height, [59, 130, 246], [220, 340]),   // accent blue
      // Cyan accent
      new AuroraBlob(width, height, [6, 182, 212], [180, 280]),    // cyan
      // Violet accent
      new AuroraBlob(width, height, [124, 58, 237], [200, 320]),   // violet
      // Subtle warm highlight
      new AuroraBlob(width, height, [99, 102, 241], [160, 260]),   // indigo
    ];

    let animationFrameId: number;
    let time = 0;
    const mouse = { x: width / 2, y: height / 2, rx: width / 2, ry: height / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.rx = e.clientX;
      mouse.ry = e.clientY;
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      sizeCanvas();
    };

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };

    const handleVisibilityChange = () => {
      isPageVisible = document.visibilityState === "visible";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reduceMotionQuery.addEventListener("change", handleMotionPreference);

    const draw = () => {
      if (!isPageVisible) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      time++;

      // Smooth mouse interpolation
      mouse.x += (mouse.rx - mouse.x) * 0.04;
      mouse.y += (mouse.ry - mouse.y) * 0.04;

      const focused = isPromptFocusedRef.current;
      const speedMult = focused ? 0.4 : 1;

      // Clear with dark background
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);

      // Draw aurora blobs with additive-like blending using "lighter"
      ctx.globalCompositeOperation = "lighter";

      blobs.forEach((blob) => {
        const currentRadius = reducedMotion
          ? blob.radius
          : blob.update(width, height, time, speedMult);

        // Subtle mouse influence — aurora shifts slightly toward cursor
        const mouseInfluenceX = (mouse.x - width / 2) * 0.04;
        const mouseInfluenceY = (mouse.y - height / 2) * 0.03;
        const drawX = blob.x + mouseInfluenceX;
        const drawY = blob.y + mouseInfluenceY;

        // Create a soft radial gradient for each blob
        const grad = ctx.createRadialGradient(
          drawX, drawY, 0,
          drawX, drawY, currentRadius
        );

        const [r, g, b] = blob.color;
        const baseOpacity = focused ? 0.06 : 0.08;

        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseOpacity})`);
        grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${baseOpacity * 0.6})`);
        grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${baseOpacity * 0.25})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.beginPath();
        ctx.arc(drawX, drawY, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Reset composite operation
      ctx.globalCompositeOperation = "source-over";

      // Subtle cursor glow — a soft accent halo following the mouse
      const cursorDist = Math.hypot(mouse.rx - width / 2, mouse.ry - height / 2);
      if (cursorDist > 15) {
        const cursorGrad = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, 200
        );
        cursorGrad.addColorStop(0, "rgba(59, 130, 246, 0.06)");
        cursorGrad.addColorStop(0.5, "rgba(59, 130, 246, 0.02)");
        cursorGrad.addColorStop(1, "rgba(59, 130, 246, 0)");

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 200, 0, Math.PI * 2);
        ctx.fillStyle = cursorGrad;
        ctx.fill();
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reduceMotionQuery.removeEventListener("change", handleMotionPreference);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const { scrollY } = useScroll();
  const canvasYRaw = useTransform(scrollY, [0, 320, 900], [0, -10, -50]);
  const canvasOpacityRaw = useTransform(scrollY, [0, 360, 920], [1, 0.92, 0]);
  const canvasY = useSpring(canvasYRaw, { stiffness: 70, damping: 24, mass: 0.6 });
  const canvasOpacity = useSpring(canvasOpacityRaw, { stiffness: 90, damping: 26, mass: 0.5 });

  return (
    <>
      <motion.div
        style={{ y: canvasY, opacity: canvasOpacity }}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 [mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)]"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </motion.div>

      {/* Film grain overlay for organic texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
    </>
  );
}

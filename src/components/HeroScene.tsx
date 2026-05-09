"use client";

import { useEffect, useRef } from "react";
import { useScroll, useTransform, motion, useSpring } from "framer-motion";

interface HeroSceneProps {
  isPromptFocused?: boolean;
}

class FloatingBall {
  id: number;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  depth: number;

  constructor(id: number, width: number, height: number) {
    this.id = id;
    this.baseX = Math.random() * width;
    this.baseY = Math.random() * height;
    this.x = this.baseX;
    this.y = this.baseY;
    
    // Depth layer: 0 (back) to 1 (front)
    this.depth = Math.random();
    
    // Size, opacity, and speed based on depth to create a parallax / depth of field effect
    if (this.depth < 0.33) {
      // Large, faint background balls (out of focus look)
      this.radius = 25 + Math.random() * 40;
      this.opacity = 0.02 + Math.random() * 0.03;
      this.vx = (Math.random() - 0.5) * 0.15;
      this.vy = (Math.random() - 0.5) * 0.15;
    } else if (this.depth < 0.66) {
      // Medium mid-ground balls
      this.radius = 10 + Math.random() * 15;
      this.opacity = 0.05 + Math.random() * 0.06;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = (Math.random() - 0.5) * 0.25;
    } else {
      // Small, sharper foreground balls
      this.radius = 3 + Math.random() * 5;
      this.opacity = 0.15 + Math.random() * 0.2;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
    }
  }

  update(width: number, height: number, speedMultiplier: number) {
    this.x += this.vx * speedMultiplier;
    this.y += this.vy * speedMultiplier;

    // Wrap around screen smoothly
    if (this.x < -this.radius * 2) this.x = width + this.radius * 2;
    if (this.x > width + this.radius * 2) this.x = -this.radius * 2;
    if (this.y < -this.radius * 2) this.y = height + this.radius * 2;
    if (this.y > height + this.radius * 2) this.y = -this.radius * 2;
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
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const balls: FloatingBall[] = [];
    // Increase density: 50 to 100 balls for a fuller aesthetic look
    const NUM_BALLS = Math.min(Math.max(Math.floor(width / 30), 25), 50);

    for (let i = 0; i < NUM_BALLS; i++) {
      balls.push(new FloatingBall(i, width, height));
    }

    let animationFrameId: number;
    const mouse = { x: width / 2, y: height / 2, rx: width / 2, ry: height / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.rx = e.clientX;
      mouse.ry = e.clientY;
    };
    
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const draw = () => {
      mouse.x += (mouse.rx - mouse.x) * 0.08;
      mouse.y += (mouse.ry - mouse.y) * 0.08;
      
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      const focused = isPromptFocusedRef.current;
      const speedMult = focused ? 0.3 : 1;
      const centerX = width / 2;
      const centerY = height * 0.55;

      balls.forEach(ball => {
        ball.update(width, height, speedMult);

        const pX = (mouse.x - width / 2) * 0.06 * ball.depth;
        const pY = (mouse.y - height / 2) * 0.06 * ball.depth;
        
        let targetX = ball.x + pX;
        let targetY = ball.y + pY;
        
        const distToMouse = Math.hypot(targetX - mouse.x, targetY - mouse.y);
        const repelRadius = 250;
        if (distToMouse < repelRadius) {
            const pullStrength = (repelRadius - distToMouse) / repelRadius;
            targetX += ((targetX - mouse.x) / distToMouse) * 30 * pullStrength * ball.depth;
            targetY += ((targetY - mouse.y) / distToMouse) * 30 * pullStrength * ball.depth;
        }

        if (focused && ball.depth >= 0.33) {
           const distToCenter = Math.hypot(centerX - targetX, centerY - targetY);
           if (distToCenter > 100) {
               targetX += (centerX - targetX) * 0.01;
               targetY += (centerY - targetY) * 0.01;
           }
        }

        ctx.beginPath();
        if (ball.depth < 0.66) {
            const grad = ctx.createRadialGradient(targetX, targetY, 0, targetX, targetY, ball.radius);
            grad.addColorStop(0, `rgba(255, 255, 255, ${ball.opacity})`);
            grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
            ctx.fillStyle = grad;
            ctx.arc(targetX, targetY, ball.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.arc(targetX, targetY, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${ball.opacity})`; 
            ctx.fill();
        }
      });

      const distFromCenter = Math.hypot(mouse.rx - width/2, mouse.ry - height/2);
      if (distFromCenter > 20 || focused) {
        const auraGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180);
        auraGrad.addColorStop(0, "rgba(59, 130, 246, 0.08)"); 
        auraGrad.addColorStop(1, "rgba(59, 130, 246, 0)");
        
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 180, 0, Math.PI * 2);
        ctx.fillStyle = auraGrad;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const { scrollY } = useScroll();
  const canvasYRaw = useTransform(scrollY, [0, 320, 900], [0, -10, -50]);
  const canvasOpacityRaw = useTransform(scrollY, [0, 360, 920], [1, 0.92, 0]);
  const canvasY = useSpring(canvasYRaw, { stiffness: 70, damping: 24, mass: 0.6 });
  const canvasOpacity = useSpring(canvasOpacityRaw, { stiffness: 90, damping: 26, mass: 0.5 });

  return (
    <motion.div
      style={{ y: canvasY, opacity: canvasOpacity }}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 [mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </motion.div>
  );
}

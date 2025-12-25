
import React, { useEffect, useRef } from 'react';
import { Particle } from '../types';

interface ParticleSystemProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
  onComplete: () => void;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ startX, startY, endX, endY, active, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  // Fix: Provide initial value for useRef to resolve 'Expected 1 arguments, but got 0' error
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles
    const particleCount = 20;
    particlesRef.current = Array.from({ length: particleCount }).map(() => ({
      x: startX,
      y: startY,
      targetX: endX,
      targetY: endY,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 0.05 + 0.02,
      life: 1,
      color: `rgba(139, 195, 74, ${Math.random() * 0.5 + 0.5})`
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allDead = true;

      particlesRef.current.forEach((p) => {
        if (p.life <= 0) return;
        allDead = false;

        // Simple easing
        p.x += (p.targetX - p.x) * p.speed;
        p.y += (p.targetY - p.y) * p.speed;
        p.life -= 0.01;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        const dist = Math.sqrt(Math.pow(p.targetX - p.x, 2) + Math.pow(p.targetY - p.y, 2));
        if (dist < 5) p.life = 0;
      });

      if (allDead) {
        onComplete();
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [active, startX, startY, endX, endY, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  );
};

export default ParticleSystem;

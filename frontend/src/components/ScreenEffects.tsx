
import React, { useEffect, useRef } from 'react';
import { ScreenEffectType } from '../types';

interface ScreenEffectsProps {
  type: ScreenEffectType;
}

const ScreenEffects: React.FC<ScreenEffectsProps> = ({ type }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<any[]>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // 修复：增加对 type 的非空检查
    if (!type || type === 'none') {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initial Particle Count
    let count = 60;
    if (type === 'light-rain') count = 35; 
    if (type === 'heavy-rain') count = 90; 
    if (type === 'heavy-snow') count = 150;
    if (type === 'sakura') count = 45;

    particles.current = Array.from({ length: count }).map(() => createParticle(canvas.width, canvas.height, type));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.current.forEach(p => {
        updateParticle(p, canvas.width, canvas.height, type);
        drawParticle(ctx, p, type);
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [type]);

  if (!type || type === 'none') return null;

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[50]" />;
};

function createParticle(w: number, h: number, type: ScreenEffectType = 'none') {
  // 修复：增加 type 默认值防止 production includes 报错
  const safeType = type || 'none';
  const isRain = safeType.includes('rain');
  const isSnow = safeType.includes('snow');
  
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    size: isRain ? Math.random() * 2 + 1.5 : Math.random() * 3 + 1,
    speedY: isRain ? Math.random() * 2 + 1.5 : isSnow ? Math.random() * 1.5 + 0.5 : Math.random() * 2 + 1,
    speedX: safeType === 'sakura' ? Math.random() * 2 - 1 : isRain ? (Math.random() - 0.5) * 0.2 : Math.random() * 0.5 - 0.25,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: Math.random() * 0.05,
    opacity: isRain ? Math.random() * 0.3 + 0.2 : Math.random() * 0.5 + 0.3,
    trail: isRain ? [] : null 
  };
}

function updateParticle(p: any, w: number, h: number, type: ScreenEffectType = 'none') {
  const safeType = type || 'none';
  const isRain = safeType.includes('rain');
  
  p.y += p.speedY;
  p.x += p.speedX;

  if (isRain) {
    if (Math.random() < 0.02) p.speedX = (Math.random() - 0.5) * 0.3;
    if (p.trail) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 15) p.trail.shift();
    }
  }

  if (safeType === 'sakura') p.rotation += p.rotationSpeed;

  if (p.y > h + 50) {
    p.y = -50;
    p.x = Math.random() * w;
    if (isRain) p.trail = [];
  }
  if (p.x > w + 20) p.x = -20;
  if (p.x < -20) p.x = w + 20;
}

function drawParticle(ctx: CanvasRenderingContext2D, p: any, type: ScreenEffectType = 'none') {
  const safeType = type || 'none';
  ctx.save();
  
  if (safeType.includes('snow')) {
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'white';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  } else if (safeType.includes('rain')) {
    if (p.trail && p.trail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.15)';
      ctx.lineWidth = p.size * 0.6;
      ctx.lineCap = 'round';
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = p.opacity + 0.2;
    ctx.fillStyle = 'rgba(180, 210, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.size * 0.8, p.size * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(p.x - p.size * 0.2, p.y - p.size * 0.5, p.size * 0.3, p.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

  } else if (safeType === 'sakura') {
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = '#ffb7c5';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 2, p.size * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff9eb5';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-p.size, 0);
    ctx.lineTo(p.size, 0);
    ctx.stroke();
  }
  
  ctx.restore();
}

export default ScreenEffects;

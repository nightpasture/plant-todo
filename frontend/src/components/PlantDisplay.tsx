
import React, { useState } from 'react';
import { PlantType, PlantStage } from '../types';
import { Heart } from 'lucide-react';
import { PLANTS } from '../constants';

interface PlantDisplayProps {
  plantId: string;
  points: number;
  isDead: boolean;
  isSmall?: boolean;
  onInteraction: () => void;
}

const PlantDisplay: React.FC<PlantDisplayProps> = ({ plantId, points, isDead, isSmall, onInteraction }) => {
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const plant = PLANTS.find(p => p.id === plantId) || PLANTS[0];

  const safePoints = Number(points) || 0;

  let stage: PlantStage = 'seedling';
  if (safePoints >= 30) stage = 'blooming';
  else if (safePoints >= 15) stage = 'mature';
  else if (safePoints >= 5) stage = 'young';
  else if (safePoints >= 1) stage = 'sprout';

  const handleClick = (e: React.MouseEvent) => {
    if (isDead) return;
    onInteraction();
    const id = Date.now();
    const newHeart = { id, x: (Math.random() - 0.5) * (isSmall ? 50 : 80) };
    setHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== id));
    }, 1500);
  };

  return (
    <div className={`flex flex-col items-center justify-center pointer-events-none select-none z-[1] transition-all duration-500 ${isSmall ? 'scale-[0.85] origin-bottom-right' : ''}`}>
      <div className="relative pointer-events-auto cursor-pointer group" onClick={handleClick}>
        <div className="absolute inset-0 z-10">
          {hearts.map(h => (
            <div
              key={h.id}
              className="absolute text-red-400 opacity-0 pointer-events-none"
              style={{
                left: `calc(50% + ${h.x}px)`,
                top: '20%',
                animation: 'heart-float 1.5s forwards cubic-bezier(0.1, 0.8, 0.3, 1)'
              }}
            >
              <Heart fill="currentColor" size={isSmall ? 16 : 20} />
            </div>
          ))}
        </div>

        <div className={`relative transition-all duration-700 ease-in-out transform group-hover:scale-105 ${isDead ? 'grayscale brightness-75 blur-[0.5px]' : 'animate-breath'}`}>
          <img
            src={plant.images[stage]}
            alt={plant.name}
            className={`${isSmall ? 'w-48 h-48' : 'w-56 h-56 md:w-72 md:h-72'} object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)]`}
          />
          {isDead && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-black/40 backdrop-blur-md text-white px-5 py-2 rounded-full text-[10px] font-medium tracking-widest cute-font border border-white/20">
                已枯萎
              </span>
            </div>
          )}
        </div>

        <div className={`${isSmall ? 'w-24 h-2.5' : 'w-32 h-4'} bg-black/5 rounded-[100%] blur-xl mt-[-20px] mx-auto group-hover:scale-110 group-hover:bg-black/10 transition-all duration-500`}></div>
      </div>

      <div className={`${isSmall ? 'mt-4' : 'mt-8'} text-center animate-in fade-in slide-in-from-bottom-4 duration-1000`}>
        <h2 className={`${isSmall ? 'text-xl' : 'text-3xl'} cute-font text-emerald-900 font-bold tracking-[0.2em] mb-2`}>{plant.name}</h2>
        <div className="flex flex-col items-center gap-2">
          <div className={`${isSmall ? 'h-1.5 w-28' : 'h-1.5 w-40'} bg-emerald-100 rounded-full overflow-hidden shadow-inner`}>
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000 ease-out shadow-sm"
              style={{ width: `${Math.min(100, (safePoints % 15) / 15 * 100)}%` }}
            />
          </div>
          {isSmall ? (
             <span className="text-[9px] text-emerald-600 font-bold tracking-widest uppercase">养分: {safePoints}</span>
          ) : (
            <span className="text-[10px] text-emerald-700 font-bold tracking-widest uppercase bg-emerald-100/50 px-3 py-1 rounded-full border border-emerald-200/50">
              养成积分: {safePoints}
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes heart-float {
          0% { transform: translateY(0) scale(0.5) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-120px) scale(1.5) rotate(${Math.random() > 0.5 ? 20 : -20}deg); opacity: 0; }
        }
        @keyframes breath {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.02) translateY(-5px); }
        }
        .animate-breath {
          animation: breath 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default PlantDisplay;

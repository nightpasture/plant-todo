
import { PlantType } from './types';

// SVG 资源生成函数，保持代码整洁并支持自定义颜色
const createPlantSVG = (content: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="potGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#f5f5f5;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" />
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="0" dy="2" result="offsetblur" />
        <feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#softShadow)">
      <!-- Pot Background -->
      <path d="M70 150 L130 150 L140 180 L60 180 Z" fill="url(#potGrad)" />
      <path d="M65 145 H135 V152 H65 Z" fill="#ffffff" />
      <rect x="90" y="152" width="20" height="2" fill="#d1d5db" rx="1" />
      
      <!-- Soil -->
      <path d="M70 150 Q100 145 130 150" fill="none" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
      
      ${content}
    </g>
  </svg>
`)}`;

export const PLANTS: PlantType[] = [
  {
    id: 'monstera',
    name: '优雅龟背竹',
    description: '具有独特艺术感的叶片，是室内的宁静之选。',
    images: {
      seedling: createPlantSVG(`<path d="M100 145 V130 Q100 120 110 115" stroke="#4ADE80" stroke-width="3" fill="none"/><circle cx="110" cy="115" r="4" fill="#4ADE80"/>`),
      sprout: createPlantSVG(`<path d="M100 145 V120" stroke="#4ADE80" stroke-width="3" fill="none"/><path d="M100 120 Q85 110 100 95 Q115 110 100 120" fill="#22C55E"/>`),
      young: createPlantSVG(`<path d="M100 145 V110" stroke="#166534" stroke-width="4" fill="none"/><path d="M100 110 Q70 80 100 60 Q130 80 100 110" fill="#22C55E" />`),
      mature: createPlantSVG(`<path d="M100 145 V100" stroke="#166534" stroke-width="4" fill="none"/><path d="M100 100 Q60 50 100 20 Q140 50 100 100" fill="#15803d"/><circle cx="85" cy="60" r="4" fill="#f0fdf4"/><path d="M100 110 Q140 90 150 110 Q130 130 100 110" fill="#16a34a" />`),
      blooming: createPlantSVG(`<path d="M100 145 V90" stroke="#14532d" stroke-width="5" fill="none"/><path d="M100 90 Q50 30 100 10 Q150 30 100 90" fill="#14532d"/><path d="M100 100 Q150 80 165 110 Q140 140 100 100" fill="#166534" /><circle cx="80" cy="50" r="5" fill="#f0fdf4"/><circle cx="120" cy="40" r="4" fill="#f0fdf4"/>`)
    }
  },
  {
    id: 'lavender',
    name: '浪漫薰衣草',
    description: '淡雅的紫色芬芳，带你领略普罗旺斯的温柔。',
    images: {
      seedling: createPlantSVG(`<path d="M100 150 V135" stroke="#8b5cf6" stroke-width="2"/><circle cx="100" cy="135" r="3" fill="#8b5cf6"/>`),
      sprout: createPlantSVG(`<path d="M100 150 V120" stroke="#4ade80" stroke-width="2"/><circle cx="100" cy="115" r="5" fill="#a78bfa"/>`),
      young: createPlantSVG(`<path d="M95 150 L90 100 M105 150 L110 100" stroke="#22c55e" stroke-width="2"/><ellipse cx="90" cy="100" rx="4" ry="10" fill="#8b5cf6"/><ellipse cx="110" cy="100" rx="4" ry="10" fill="#8b5cf6"/>`),
      mature: createPlantSVG(`<g stroke="#166534" stroke-width="2">${[80, 95, 110, 120].map(x => `<path d="M100 150 L${x} 80"/>`).join('')}</g>${[80, 95, 110, 120].map(x => `<ellipse cx="${x}" cy="80" rx="5" ry="15" fill="#7c3aed"/>`).join('')}`),
      blooming: createPlantSVG(`<g stroke="#14532d" stroke-width="2">${[70, 85, 100, 115, 130].map(x => `<path d="M100 150 L${x} 60"/>`).join('')}</g>${[70, 85, 100, 115, 130].map(x => `<g transform="translate(${x},60)"><ellipse cx="0" cy="0" rx="6" ry="20" fill="#6d28d9"/><circle cx="0" cy="-15" r="3" fill="#c4b5fd" opacity="0.6"/></g>`).join('')}`)
    }
  },
  {
    id: 'rose',
    name: '优雅红玫瑰',
    description: '热烈而高贵，每一片花瓣都诉说着爱与灵感。',
    images: {
      seedling: createPlantSVG(`<path d="M100 150 V135" stroke="#166534" stroke-width="2"/><circle cx="100" cy="135" r="4" fill="#ef4444"/>`),
      sprout: createPlantSVG(`<path d="M100 150 V115" stroke="#166534" stroke-width="2"/><path d="M100 115 Q90 105 100 95 Q110 105 100 115" fill="#b91c1c"/>`),
      young: createPlantSVG(`<path d="M100 150 V100" stroke="#166534" stroke-width="3"/><path d="M100 110 L85 115" stroke="#166534" stroke-width="1"/><g transform="translate(100,90)"><circle r="12" fill="#ef4444"/><circle r="6" fill="#b91c1c" opacity="0.5"/></g>`),
      mature: createPlantSVG(`<path d="M100 150 V80" stroke="#166534" stroke-width="3"/><g transform="translate(100,70)"><path d="M0 -15 Q15 -15 15 0 Q15 15 0 15 Q-15 15 -15 0 Q-15 -15 0 -15" fill="#ef4444"/><path d="M0 -8 Q8 -8 8 0 Q8 8 0 8 Q-8 8 -8 0 Q-8 -8 0 -8" fill="#dc2626"/><circle r="3" fill="#991b1b"/></g>`),
      blooming: createPlantSVG(`<path d="M100 150 V70" stroke="#14532d" stroke-width="4"/><g transform="translate(100,60)">${[0, 120, 240].map(r => `<ellipse rx="25" ry="15" fill="#ef4444" transform="rotate(${r})"/>`).join('')}<circle r="10" fill="#b91c1c"/><circle r="5" fill="#7f1d1d"/></g><path d="M100 100 L120 110 Q130 100 120 90 Z" fill="#166534"/>`)
    }
  },
  {
    id: 'sakura',
    name: '梦幻早樱',
    description: '如云霞般绚烂，记录生命中每一个动人的瞬间。',
    images: {
      seedling: createPlantSVG(`<path d="M100 150 L105 135" stroke="#78350f" stroke-width="2"/><circle cx="105" cy="135" r="3" fill="#fce7f3"/>`),
      sprout: createPlantSVG(`<path d="M100 150 Q90 130 100 115" stroke="#78350f" stroke-width="3" fill="none"/><circle cx="100" cy="115" r="6" fill="#fbcfe8"/>`),
      young: createPlantSVG(`<path d="M100 150 Q85 120 110 95" stroke="#451a03" stroke-width="4" fill="none"/><circle cx="110" cy="95" r="12" fill="#f9a8d4"/><circle cx="105" cy="90" r="4" fill="#ffffff" opacity="0.6"/>`),
      mature: createPlantSVG(`<path d="M100 150 Q75 110 115 80" stroke="#451a03" stroke-width="6" fill="none"/><g transform="translate(115,80)">${[0, 72, 144, 216, 288].map(r => `<ellipse rx="15" ry="10" fill="#f9a8d4" transform="rotate(${r})"/>`).join('')}<circle r="4" fill="#fdf2f8"/></g>`),
      blooming: createPlantSVG(`<path d="M100 150 Q60 100 110 60 Q140 40 120 30" stroke="#451a03" stroke-width="8" fill="none"/><g transform="translate(110,60)">${Array.from({length: 3}).map((_, i) => `<circle cx="${(i-1)*20}" cy="${i*5}" r="25" fill="#fbcfe8" opacity="0.8"/>`).join('')}</g><g transform="translate(130,40)">${[0, 60, 120, 180, 240, 300].map(r => `<circle cx="${15*Math.cos(r*Math.PI/180)}" cy="${15*Math.sin(r*Math.PI/180)}" r="8" fill="#f9a8d4"/>`).join('')}<circle r="5" fill="#ffffff"/></g>`)
    }
  },
  {
    id: 'tulip',
    name: '气质郁金香',
    description: '简约而不失格调，在静默中绽放极致的优雅。',
    images: {
      seedling: createPlantSVG(`<path d="M100 150 V135" stroke="#22c55e" stroke-width="3"/><rect x="96" y="130" width="8" height="10" rx="4" fill="#facc15"/>`),
      sprout: createPlantSVG(`<path d="M100 150 V120" stroke="#22c55e" stroke-width="4"/><path d="M100 120 Q85 110 100 95 Q115 110 100 120" fill="#f87171"/>`),
      young: createPlantSVG(`<path d="M100 150 V100" stroke="#166534" stroke-width="4"/><path d="M100 100 Q85 80 100 65 Q115 80 100 100" fill="#f87171"/><path d="M100 145 Q120 130 115 110" stroke="#22c55e" stroke-width="5" fill="none"/>`),
      mature: createPlantSVG(`<path d="M100 150 V80" stroke="#166534" stroke-width="5"/><g transform="translate(100,75)"><path d="M-12 0 Q0 -25 12 0 L8 15 L-8 15 Z" fill="#fb7185"/><path d="M-6 0 Q0 -20 6 0 L4 12 L-4 12 Z" fill="#f43f5e"/></g>`),
      blooming: createPlantSVG(`<path d="M100 150 V70" stroke="#14532d" stroke-width="6"/><g transform="translate(100,60)"><path d="M-15 0 Q0 -30 15 0 L10 20 L-10 20 Z" fill="#f43f5e"/><path d="M-8 -5 Q0 -25 8 -5 L6 15 L-6 15 Z" fill="#be123c"/></g><path d="M100 140 Q70 120 80 90" stroke="#166534" stroke-width="8" fill="none" stroke-linecap="round"/>`)
    }
  },
  {
    id: 'palm',
    name: '热带棕榈',
    description: '夏日的微风与摇曳的影，让桌面充满海岛活力。',
    images: {
      seedling: createPlantSVG(`<path d="M100 150 L100 130" stroke="#78350f" stroke-width="3"/><circle cx="100" cy="130" r="4" fill="#4ade80"/>`),
      sprout: createPlantSVG(`<path d="M100 150 Q100 130 115 120" stroke="#78350f" stroke-width="4" fill="none"/><path d="M115 120 L130 110 L120 130 Z" fill="#22c55e"/>`),
      young: createPlantSVG(`<path d="M100 150 Q100 110 110 80" stroke="#78350f" stroke-width="6" fill="none"/><g transform="translate(110,80)">${[0, 45, -45].map(r => `<path d="M0 0 Q20 -10 40 0" stroke="#166534" stroke-width="4" fill="none" transform="rotate(${r})"/>`).join('')}</g>`),
      mature: createPlantSVG(`<path d="M100 150 Q100 100 90 60" stroke="#451a03" stroke-width="10" fill="none"/><g transform="translate(90,60)">${[0, 60, 120, 180, 240, 300].map(r => `<path d="M0 0 Q30 -15 60 0" stroke="#15803d" stroke-width="5" fill="none" transform="rotate(${r})"/>`).join('')}</g>`),
      blooming: createPlantSVG(`<path d="M100 150 Q105 100 85 40" stroke="#451a03" stroke-width="12" fill="none"/><g transform="translate(85,40)">${Array.from({length: 12}).map((_, i) => `<path d="M0 0 Q40 -20 80 0" stroke="#14532d" stroke-width="6" fill="none" transform="rotate(${i * 30})"/>`).join('')}</g><circle cx="95" cy="55" r="6" fill="#78350f"/><circle cx="80" cy="65" r="5" fill="#78350f"/>`)
    }
  },
  {
    id: 'maple',
    name: '深秋红枫',
    description: '层林尽染的壮丽，在指尖感受季节的流转。',
    images: {
      seedling: createPlantSVG(`<path d="M100 150 L100 135" stroke="#78350f" stroke-width="2"/><circle cx="100" cy="135" r="3" fill="#f97316"/>`),
      sprout: createPlantSVG(`<path d="M100 150 V120" stroke="#78350f" stroke-width="3" fill="none"/><path d="M100 120 L85 110 L115 110 Z" fill="#ea580c"/>`),
      young: createPlantSVG(`<path d="M100 150 V90" stroke="#451a03" stroke-width="4" fill="none"/><path d="M100 90 L80 70 L120 70 Z" fill="#c2410c"/><path d="M100 110 L120 100 L110 120 Z" fill="#9a3412"/>`),
      mature: createPlantSVG(`<path d="M100 150 V70" stroke="#451a03" stroke-width="6" fill="none"/><g transform="translate(100,70)">${[0, 120, 240].map(r => `<path d="M0 0 L-20 -20 L0 -40 L20 -20 Z" fill="#b91c1c" transform="rotate(${r})"/>`).join('')}</g>`),
      blooming: createPlantSVG(`<path d="M100 150 V60" stroke="#451a03" stroke-width="8" fill="none"/><g transform="translate(100,50)">${Array.from({length: 8}).map((_, i) => `<path d="M0 0 L-25 -25 L0 -50 L25 -25 Z" fill="#991b1b" opacity="0.9" transform="rotate(${i * 45})"/>`).join('')}</g><path d="M85 175 L75 180" stroke="#b91c1c" stroke-width="2" opacity="0.6"/>`)
    }
  },
  {
    id: 'willow',
    name: '垂丝绿柳',
    description: '依依惜别的柔情，如丝般顺滑的治愈体验。',
    images: {
      seedling: createPlantSVG(`<path d="M100 150 L95 135" stroke="#166534" stroke-width="2"/><circle cx="95" cy="135" r="2" fill="#86efac"/>`),
      sprout: createPlantSVG(`<path d="M100 150 Q90 130 105 115" stroke="#166534" stroke-width="3" fill="none"/><path d="M105 115 Q115 125 105 135" fill="#4ade80" opacity="0.7"/>`),
      young: createPlantSVG(`<path d="M100 150 Q80 120 110 90" stroke="#451a03" stroke-width="5" fill="none"/><path d="M110 90 Q120 110 110 130" stroke="#22c55e" stroke-width="2" fill="none" stroke-dasharray="4 2"/>`),
      mature: createPlantSVG(`<path d="M100 150 Q70 110 115 70" stroke="#451a03" stroke-width="7" fill="none"/><g stroke="#16a34a" stroke-width="2" fill="none">${[100, 115, 130].map(x => `<path d="M115 70 Q${x} 100 ${x-10} 140"/>`).join('')}</g>`),
      blooming: createPlantSVG(`<path d="M100 150 Q60 100 110 50 Q130 30 150 40" stroke="#451a03" stroke-width="9" fill="none"/><g stroke="#15803d" stroke-width="2.5" fill="none">${[80, 100, 120, 140, 160].map(x => `<path d="M110 50 Q${x} 100 ${x-20} 150" opacity="0.8"/>`).join('')}</g><circle cx="110" cy="50" r="4" fill="#d1fae5"/>`)
    }
  },
  {
    id: 'cactus',
    name: '萌萌仙人掌',
    description: '坚韧、圆润，在极简的形态中蕴含力量。',
    images: {
      seedling: createPlantSVG(`<circle cx="100" cy="140" r="6" fill="#86efac"/>`),
      sprout: createPlantSVG(`<rect x="92" y="115" width="16" height="30" rx="8" fill="#4ade80"/>`),
      young: createPlantSVG(`<rect x="85" y="100" width="30" height="45" rx="15" fill="#22c55e"/><circle cx="90" cy="115" r="2" fill="#ffffff" opacity="0.6"/>`),
      mature: createPlantSVG(`<rect x="85" y="90" width="30" height="60" rx="15" fill="#166534"/><rect x="110" y="105" width="20" height="30" rx="10" fill="#15803d"/><path d="M100 95 L100 145" stroke="#ffffff" stroke-width="1" stroke-dasharray="2 2" opacity="0.3"/>`),
      blooming: createPlantSVG(`<rect x="85" y="90" width="30" height="60" rx="15" fill="#064e3b"/><path d="M100 75 Q90 65 100 55 Q110 65 100 75" fill="#fb7185" /><path d="M100 85 Q90 80 100 75 Q110 80 100 85" fill="#f43f5e" />`)
    }
  },
  {
    id: 'sunflower',
    name: '活力向日葵',
    description: '永远追随光的方向，带给桌面无尽的温暖。',
    images: {
      seedling: createPlantSVG(`<path d="M100 145 L100 130 Q90 125 90 115" stroke="#4ade80" stroke-width="3" fill="none"/><circle cx="90" cy="115" r="4" fill="#4ade80"/>`),
      sprout: createPlantSVG(`<path d="M100 145 V120" stroke="#4ade80" stroke-width="3" fill="none"/><path d="M100 120 Q85 110 70 115" stroke="#4ade80" stroke-width="3" fill="none"/>`),
      young: createPlantSVG(`<path d="M100 145 V80" stroke="#15803d" stroke-width="4" fill="none"/><circle cx="100" cy="80" r="10" fill="#facc15" />`),
      mature: createPlantSVG(`<path d="M100 145 V70" stroke="#15803d" stroke-width="4" fill="none"/><circle cx="100" cy="70" r="25" fill="#eab308" /><circle cx="100" cy="70" r="15" fill="#713f12" />`),
      blooming: createPlantSVG(`<path d="M100 145 V70" stroke="#15803d" stroke-width="5" fill="none"/><g transform="translate(100, 70)">${Array.from({length: 12}).map((_, i) => `<path d="M0 -35 Q10 -20 0 0 Q-10 -20 0 -35" fill="#fbbf24" transform="rotate(${i * 30})"/>`).join('')}<circle cx="0" cy="0" r="18" fill="#451a03" /></g>`)
    }
  },
  {
    id: 'bonsai',
    name: '古风小松',
    description: '岁月的沉淀与自然的剪影，带你进入禅意时刻。',
    images: {
      seedling: createPlantSVG(`<path d="M100 150 L95 130" stroke="#78350f" stroke-width="3" fill="none"/><circle cx="95" cy="130" r="3" fill="#22c55e"/>`),
      sprout: createPlantSVG(`<path d="M100 150 Q90 135 105 120" stroke="#78350f" stroke-width="4" fill="none"/><circle cx="105" cy="120" r="6" fill="#166534"/>`),
      young: createPlantSVG(`<path d="M100 150 Q80 130 110 110" stroke="#451a03" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="110" cy="105" rx="15" ry="10" fill="#14532d" />`),
      mature: createPlantSVG(`<path d="M100 150 Q70 120 110 90" stroke="#451a03" stroke-width="8" fill="none"/><ellipse cx="115" cy="85" rx="25" ry="15" fill="#064e3b" />`),
      blooming: createPlantSVG(`<path d="M100 150 Q60 110 110 80 Q140 60 110 40" stroke="#451a03" stroke-width="10" fill="none"/><ellipse cx="115" cy="45" rx="35" ry="20" fill="#064e3b" /><rect x="65" y="140" width="8" height="12" fill="#e5e7eb" rx="1" />`)
    }
  }
];

export const DEFAULT_NOTE_COLORS = [
  '#F4E1E8', 
  '#4F90F5', 
  '#9FBEED', 
  '#F3F6F2', 
  '#6159A7', 
  '#BBADEA', 
  '#412C3C', 
  '#98C3C9', 
  '#433931', 
  '#2D431A', 
];

export const INITIAL_SURVIVAL_DAYS = 3;
export const POINTS_PER_TODO = 1;
export const SURVIVAL_DAYS_PER_POINT = 5;
export const NEW_PLANT_COST = 300;

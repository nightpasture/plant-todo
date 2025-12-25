
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Todo, SubTask } from '../types';
import { Check, Trash2, Zap } from 'lucide-react';

interface StickyNoteProps {
  todo: Todo;
  isMobile: boolean;
  isGlass?: boolean;
  glassOpacity?: number;
  onUpdate: (updated: Todo) => void;
  onDelete: (id: string) => void;
  onConvert: (todo: Todo, x: number, y: number) => void;
  onFocus: (id: string) => void;
}

const StickyNote: React.FC<StickyNoteProps> = React.memo(({ todo, isMobile, isGlass, glassOpacity = 0.6, onUpdate, onDelete, onConvert, onFocus }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  // 根据当前设备环境选择对应的坐标
  const displayX = isMobile ? (todo.mx ?? todo.x) : todo.x;
  const displayY = isMobile ? (todo.my ?? todo.y) : todo.y;

  const [localPos, setLocalPos] = useState({ x: displayX, y: displayY });
  const dragOffset = useRef({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  
  // 记录上一次显示的坐标
  const lastDisplayPos = useRef({ x: displayX, y: displayY });

  // 监听来自父组件的坐标变化
  useEffect(() => {
    const propChanged = displayX !== lastDisplayPos.current.x || displayY !== lastDisplayPos.current.y;
    if (propChanged && !isDragging) {
      setLocalPos({ x: displayX, y: displayY });
      lastDisplayPos.current = { x: displayX, y: displayY };
    }
  }, [displayX, displayY, isDragging]);

  const startDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    onFocus(todo.id);
    dragOffset.current = {
      x: clientX - localPos.x,
      y: clientY - localPos.y
    };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!isDragging || !noteRef.current) return;
    const width = noteRef.current.offsetWidth;
    const height = noteRef.current.offsetHeight;
    let nextX = clientX - dragOffset.current.x;
    let nextY = clientY - dragOffset.current.y;
    
    // 边界检查
    nextX = Math.max(0, Math.min(nextX, window.innerWidth - width));
    nextY = Math.max(0, Math.min(nextY, window.innerHeight - height));
    
    setLocalPos({ x: nextX, y: nextY });
  };

  const endDrag = () => {
    if (isDragging) {
      lastDisplayPos.current = { x: localPos.x, y: localPos.y };
      const updateObj = { ...todo };
      if (isMobile) {
        updateObj.mx = localPos.x;
        updateObj.my = localPos.y;
      } else {
        updateObj.x = localPos.x;
        updateObj.y = localPos.y;
      }
      onUpdate(updateObj);
      setIsDragging(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    startDrag(e.clientX, e.clientY);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    const handleUp = () => endDrag();

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, localPos, isMobile]); 

  const toggleSubTask = useCallback((subTaskId: string) => {
    const tasks = todo.subTasks || [];
    const updatedSubTasks = tasks.map(st => 
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdate({ ...todo, subTasks: updatedSubTasks });
  }, [todo, onUpdate]);

  const isAllCompleted = useMemo(() => {
    const tasks = todo.subTasks || [];
    return tasks.length > 0 && tasks.every(st => st.completed);
  }, [todo.subTasks]);

  const formattedTime = useMemo(() => 
    new Date(todo.createdAt || Date.now()).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  , [todo.createdAt]);

  const alphaHex = useMemo(() => {
    const alpha = Math.round(glassOpacity * 255);
    return alpha.toString(16).padStart(2, '0');
  }, [glassOpacity]);

  const bgColor = useMemo(() => {
    const baseColor = todo.color || '#fff9c4';
    if (isGlass) {
      return `${baseColor}${alphaHex}`;
    }
    return baseColor;
  }, [todo.color, isGlass, alphaHex]);

  // 当透明度为 0 时，不仅颜色透明，模糊效果也应当消失
  const glassClass = (isGlass && glassOpacity > 0) ? 'backdrop-blur-md' : '';

  return (
    <div
      ref={noteRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={`absolute w-64 p-5 shadow-xl cursor-grab active:cursor-grabbing rounded-2xl border border-white/20 touch-none
        ${isDragging ? 'shadow-2xl z-[999]' : 'shadow-lg'} 
        ${glassClass}
        ${todo.isConverted ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100'}`}
      style={{
        left: `${localPos.x}px`,
        top: `${localPos.y}px`,
        backgroundColor: bgColor,
        zIndex: todo.zIndex || 10,
        transform: isDragging ? 'scale(1.05) rotate(0deg)' : `rotate(${(((todo.createdAt || 0) % 10) - 5) / 2}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease, background-color 0.3s ease, opacity 0.3s ease'
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold cute-font text-gray-900 line-clamp-2 pr-2">{todo.title || '未命名任务'}</h3>
        <button onClick={() => onDelete(todo.id)} className="p-1.5 hover:bg-black/5 rounded-full transition-colors text-gray-400 hover:text-red-500">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-3 mb-5 max-h-48 overflow-y-auto fancy-scroll pr-1">
        {(todo.subTasks || []).map(st => (
          <div key={st.id} className="flex items-start gap-2 group">
            <button onClick={() => toggleSubTask(st.id)} className={`mt-0.5 w-5 h-5 min-w-[1.25rem] rounded-lg border flex items-center justify-center transition-all ${st.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-black/10 bg-white/40 hover:border-black/30'}`}>
              {st.completed && <Check size={12} strokeWidth={3} />}
            </button>
            <span className={`text-sm flex-1 break-words leading-tight font-medium ${st.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{st.text || ''}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-black/5">
        <span className="text-[10px] text-gray-500 font-mono opacity-60 tracking-tighter">{formattedTime}</span>
        {isAllCompleted && !todo.isConverted && (
          <button
            onClick={() => {
              const rect = noteRef.current?.getBoundingClientRect();
              if (rect) onConvert(todo, rect.left + rect.width / 2, rect.top + rect.height / 2);
            }}
            disabled={todo.isConverted}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-[11px] font-bold rounded-xl hover:bg-black transition-all shadow-md active:scale-95 animate-pulse disabled:opacity-50 disabled:animate-none"
          >
            <Zap size={12} fill="currentColor" />
            转化养分
          </button>
        )}
      </div>
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/10 rounded-full"></div>
    </div>
  );
});

StickyNote.displayName = 'StickyNote';
export default StickyNote;


import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Info, RotateCcw, Sprout, ShoppingBag, Clock, X, Trash2, ListTodo, Image as ImageIcon, Sparkles, CloudOff, RefreshCw, ShieldCheck, CloudRain, Snowflake, Flower2, Search, Calendar, History as HistoryIcon, ChevronRight, AlertTriangle, Loader2, Sliders, LayoutGrid } from 'lucide-react';
import { AppState, Todo, SubTask, PlantType, AppSettings, ScreenEffectType } from './types';
import { 
  PLANTS, 
  NOTE_COLORS, 
  INITIAL_SURVIVAL_DAYS, 
  POINTS_PER_TODO, 
  SURVIVAL_DAYS_PER_POINT, 
  NEW_PLANT_COST 
} from './constants';
import { APP_CONFIG } from './config';
import StickyNote from './components/StickyNote';
import PlantDisplay from './components/PlantDisplay';
import ParticleSystem from './components/ParticleSystem';
import ScreenEffects from './components/ScreenEffects';

const STORAGE_KEY = 'plant_todo_app_state_v3';
const SYNC_URL = `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.SYNC_PATH}`;
const HISTORY_URL = `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.HISTORY_PATH}`;
const IMAGE_URL = `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.IMAGE_PATH}`;
const RESET_URL = `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.RESET_PATH}`;

interface HistoryTodo extends Todo {
  convertedAt?: number;
}

const sanitizeState = (data: any): AppState => {
  const d = data || {};
  return {
    todos: Array.isArray(d.todos) ? d.todos : [],
    points: typeof d.points === 'number' ? d.points : 0,
    activePlantId: d.activePlantId || PLANTS[0].id,
    deathTime: d.deathTime || (Date.now() + INITIAL_SURVIVAL_DAYS * 24 * 60 * 60 * 1000),
    isPlantDead: !!d.isPlantDead,
    adoptedPlants: Array.isArray(d.adoptedPlants) ? d.adoptedPlants : [PLANTS[0].id],
    settings: {
      glassEffectEnabled: d.settings?.glassEffectEnabled !== undefined ? !!d.settings.glassEffectEnabled : true,
      glassOpacity: typeof d.settings?.glassOpacity === 'number' ? d.settings.glassOpacity : 0.6,
      customBackground: d.settings?.customBackground || null,
      screenEffect: (d.settings?.screenEffect as ScreenEffectType) || 'none',
    }
  };
};

const App: React.FC = () => {
  const hasFetchedInitialData = useRef<boolean>(false);
  const lastCloudSyncRef = useRef<string>("");
  const stateRef = useRef<AppState | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  
  const lastLocalUpdateTimeRef = useRef<number>(0);
  const COOL_DOWN_PERIOD = 5000;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let initialState: AppState;
    if (saved) {
      try {
        initialState = sanitizeState(JSON.parse(saved));
      } catch (e) {
        initialState = sanitizeState(null);
      }
    } else {
      initialState = sanitizeState(null);
    }
    stateRef.current = initialState;
    return initialState;
  });

  useEffect(() => {
    stateRef.current = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newSubTasks, setNewSubTasks] = useState<string[]>(['']);
  const [animation, setAnimation] = useState<{ active: boolean; x: number; y: number } | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'idle'>('idle');
  
  const [historyTodos, setHistoryTodos] = useState<HistoryTodo[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateStart, setHistoryDateStart] = useState('');
  const [historyDateEnd, setHistoryDateEnd] = useState('');

  const syncToCloud = useCallback(async () => {
    if (!hasFetchedInitialData.current || !stateRef.current || isSyncingRef.current) return;
    const dataStr = JSON.stringify(stateRef.current);
    if (dataStr === lastCloudSyncRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    try {
      const response = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: dataStr,
      });
      if (response.ok) {
        lastCloudSyncRef.current = dataStr;
        setSyncStatus('synced');
      } else {
        throw new Error('Sync Error');
      }
    } catch (e) {
      setSyncStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const markLocalChange = useCallback(() => {
    lastLocalUpdateTimeRef.current = Date.now();
  }, []);

  // 整理桌面核心逻辑：升级为阶梯式位移，防止重叠
  const clampTodosToViewport = useCallback(async (manual = false) => {
    if (manual) setIsOrganizing(true);
    
    setState(prev => {
      let changed = false;
      const noteWidth = 256; 
      const noteHeight = 200; 
      
      const maxX = window.innerWidth - noteWidth;
      const maxY = window.innerHeight - noteHeight;

      let staggerCounter = 0; // 用于计算阶梯位移

      const newTodos = prev.todos.map((t, idx) => {
        let updated = { ...t };
        let itemChanged = false;

        // 检查桌面端坐标是否越界
        const isPCInvalid = t.x > maxX || t.x < 0 || t.y > maxY || t.y < 20;
        if (isPCInvalid) {
          // 如果失效或手动整理，使用阶梯位移
          updated.x = Math.max(40, Math.min(40 + (staggerCounter * 20), maxX - 20));
          updated.y = Math.max(100, Math.min(100 + (staggerCounter * 50), maxY - 20));
          itemChanged = true;
        }

        // 检查移动端坐标是否越界
        const hasMobileCoords = t.mx !== undefined && t.my !== undefined;
        const isMobileInvalid = hasMobileCoords && (t.mx > maxX || t.mx < 0 || t.my > maxY || t.my < 50);

        if (isMobileInvalid || (isMobile && !hasMobileCoords)) {
          updated.mx = Math.max(20, Math.min(20 + (staggerCounter * 10), maxX - 20));
          updated.my = Math.max(80, Math.min(80 + (staggerCounter * 55), maxY - 180)); // 避开底部植物和工具栏
          itemChanged = true;
        }

        if (itemChanged || manual) {
          changed = true;
          staggerCounter++;
        }
        return updated;
      });

      if (changed || manual) {
        markLocalChange();
        return { ...prev, todos: newTodos };
      }
      return prev;
    });

    if (manual) {
      setTimeout(() => {
        setIsOrganizing(false);
        syncToCloud(); 
      }, 500);
    }
  }, [isMobile, markLocalChange, syncToCloud]);

  useEffect(() => {
    if (hasFetchedInitialData.current) {
      clampTodosToViewport();
    }
  }, [clampTodosToViewport, isMobile]); // 切换模式时也触发一次校验

  const filteredHistory = useMemo(() => {
    return (historyTodos || [])
      .filter(todo => {
        const matchesSearch = (todo.title || '').toLowerCase().includes(historySearch.toLowerCase());
        const timestamp = todo.convertedAt || 0;
        let matchesDate = true;
        if (historyDateStart) matchesDate = matchesDate && timestamp >= new Date(historyDateStart).getTime();
        if (historyDateEnd) {
          const end = new Date(historyDateEnd);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && timestamp <= end.getTime();
        }
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => (b.convertedAt || 0) - (a.convertedAt || 0));
  }, [historyTodos, historySearch, historyDateStart, historyDateEnd]);

  const fetchFromCloud = useCallback(async () => {
    if (Date.now() - lastLocalUpdateTimeRef.current < COOL_DOWN_PERIOD) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const res = await fetch(SYNC_URL);
      if (res.ok) {
        const cloudData = await res.json();
        const sanitized = sanitizeState(cloudData);
        const cloudStr = JSON.stringify(sanitized);
        hasFetchedInitialData.current = true;
        if (cloudStr !== JSON.stringify(stateRef.current)) {
          setState(sanitized);
          lastCloudSyncRef.current = cloudStr;
        }
        setSyncStatus('synced');
      } else if (res.status === 404) {
        hasFetchedInitialData.current = true;
        await syncToCloud();
      }
    } catch (e) {
      setSyncStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  }, [syncToCloud]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(HISTORY_URL);
      if (res.ok) {
        const data = await res.json();
        setHistoryTodos(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Fetch history error", e);
    }
  }, []);

  useEffect(() => {
    fetchFromCloud();
    const interval = setInterval(() => fetchFromCloud(), APP_CONFIG.SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFromCloud]);

  useEffect(() => {
    const timer = setTimeout(() => syncToCloud(), APP_CONFIG.AUTO_SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [state, syncToCloud]);

  useEffect(() => {
    const checkSurvival = () => {
      const now = Date.now();
      const currentDeathTime = stateRef.current?.deathTime || 0;
      if (now > currentDeathTime && !stateRef.current?.isPlantDead) {
        setState(prev => ({ ...prev, isPlantDead: true, points: 0 }));
      }
    };
    const timer = setInterval(checkSurvival, 10000); 
    checkSurvival(); 
    return () => clearInterval(timer);
  }, []);

  const handleAddTodo = () => {
    if (!newTodoTitle.trim()) return;
    markLocalChange();
    const tasks: SubTask[] = (newSubTasks || [])
      .filter(t => t && t.trim() !== '')
      .map(t => ({ id: Math.random().toString(36).substr(2, 9), text: t, completed: false }));
    
    const padding = 100;
    const initialX = Math.random() * (window.innerWidth - 300 - padding) + padding/2;
    const initialY = Math.random() * (window.innerHeight - 300 - padding) + padding/2;

    const newTodo: Todo = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTodoTitle,
      subTasks: tasks,
      createdAt: Date.now(),
      x: initialX,
      y: initialY,
      mx: 20, 
      my: 80 + state.todos.length * 45, // 默认阶梯堆叠
      zIndex: (state.todos?.length || 0) + 10,
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      isConverted: false
    };

    setState(prev => ({ ...prev, todos: [...(prev.todos || []), newTodo] }));
    setNewTodoTitle('');
    setNewSubTasks(['']);
    setShowAddModal(false);
  };

  const handleUpdateTodo = useCallback((updated: Todo) => {
    markLocalChange();
    setState(prev => ({
      ...prev,
      todos: (prev.todos || []).map(t => {
        if (t.id === updated.id) {
          if (isMobile) return { ...updated, x: t.x, y: t.y }; 
          else return { ...updated, mx: t.mx, my: t.my }; 
        }
        return t;
      })
    }));
  }, [markLocalChange, isMobile]);

  const handleDeleteTodo = useCallback((id: string) => {
    markLocalChange();
    setState(prev => ({
      ...prev,
      todos: (prev.todos || []).filter(t => t.id !== id)
    }));
  }, [markLocalChange]);

  const handleFocusTodo = useCallback((id: string) => {
    setState(prev => {
      const todos = prev.todos || [];
      const maxZ = Math.max(10, ...todos.map(t => t.zIndex || 0));
      return {
        ...prev,
        todos: todos.map(t => t.id === id ? { ...t, zIndex: maxZ + 1 } : t)
      };
    });
  }, []);

  const handleConvert = async (todo: Todo, x: number, y: number) => {
    const currentTodo = state.todos.find(t => t.id === todo.id);
    if (!currentTodo || currentTodo.isConverted) return;
    markLocalChange();
    setAnimation({ active: true, x, y });
    const conversionTime = Date.now();
    setState(prev => {
      const nextPoints = (prev.points || 0) + POINTS_PER_TODO;
      const extraTime = POINTS_PER_TODO * SURVIVAL_DAYS_PER_POINT * 24 * 60 * 60 * 1000;
      const baseTime = prev.isPlantDead ? Date.now() : prev.deathTime;
      return {
        ...prev,
        points: nextPoints,
        deathTime: baseTime + extraTime,
        isPlantDead: false,
        todos: (prev.todos || []).map(t => t.id === todo.id ? { ...t, isConverted: true } : t)
      };
    });
    try {
      const historyItem: HistoryTodo = { ...currentTodo, isConverted: true, convertedAt: conversionTime };
      await fetch(HISTORY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(historyItem) });
      fetchHistory();
    } catch (e) { console.error(e); }
    setTimeout(() => {
      setState(prev => ({ ...prev, todos: (prev.todos || []).filter(t => t.id !== todo.id) }));
    }, 1500);
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    markLocalChange();
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...updates } }));
  };

  const adoptPlant = (plant: PlantType) => {
    markLocalChange();
    const adopted = Array.isArray(state.adoptedPlants) ? state.adoptedPlants : [PLANTS[0].id];
    const isOwned = adopted.includes(plant.id);
    if (isOwned) setState(prev => ({ ...prev, activePlantId: plant.id }));
    else {
      if ((state.points || 0) >= NEW_PLANT_COST) {
        setState(prev => ({
          ...prev,
          points: (prev.points || 0) - NEW_PLANT_COST,
          adoptedPlants: [...adopted, plant.id],
          activePlantId: plant.id
        }));
      } else alert(`养分不足，领养需要 ${NEW_PLANT_COST} 养分。`);
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert("壁纸限制 20MB 以内。"); return; }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(IMAGE_URL, { method: 'POST', body: formData });
      if (response.ok) updateSettings({ customBackground: Date.now().toString() });
    } catch (err) { alert("同步失败"); } finally { setIsUploading(false); }
  };

  const handleFactoryReset = async () => {
    if (!window.confirm("确定要重新开始吗？")) return;
    try {
      const response = await fetch(RESET_URL, { method: 'POST' });
      if (response.ok) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }
    } catch (err) { alert("网络错误"); }
  };

  const timeLeft = Math.max(0, (state.deathTime || 0) - Date.now());
  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const backgroundStyle = state.settings?.customBackground 
    ? { backgroundImage: `url(${IMAGE_URL}?t=${state.settings.customBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const effectOptions: { id: ScreenEffectType; label: string; icon: any }[] = [
    { id: 'none', label: '无特效', icon: X },
    { id: 'light-rain', label: '小雨', icon: CloudRain },
    { id: 'heavy-rain', label: '大雨', icon: CloudRain },
    { id: 'light-snow', label: '小雪', icon: Snowflake },
    { id: 'heavy-snow', label: '大雪', icon: Snowflake },
    { id: 'sakura', label: '樱花', icon: Flower2 },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f7f9f7] transition-all duration-1000" style={backgroundStyle}>
      <ScreenEffects type={state.settings?.screenEffect || 'none'} />
      {!state.settings?.customBackground && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none" style={{ backgroundImage: 'radial-gradient(#065f46 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      )}

      <div className="fixed top-8 right-8 z-[100] flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 text-[10px] font-bold uppercase tracking-widest text-gray-500 shadow-sm cursor-pointer hover:bg-white/80 transition-all">
        {syncStatus === 'syncing' ? <><RefreshCw className="animate-spin text-emerald-500" size={14}/> 正在同步</> : syncStatus === 'synced' ? <><ShieldCheck className="text-emerald-600" size={14}/> 数据安全</> : <><CloudOff className="text-red-400" size={14}/> 离线模式</>}
      </div>

      <div className="relative w-full h-full p-4 overflow-hidden">
        {(state.todos || []).map(todo => (
          <StickyNote 
            key={todo.id} todo={todo} isMobile={isMobile}
            isGlass={state.settings?.glassEffectEnabled} glassOpacity={state.settings?.glassOpacity}
            onUpdate={handleUpdateTodo} onDelete={handleDeleteTodo} onFocus={handleFocusTodo} onConvert={handleConvert} 
          />
        ))}
        {/* 植物展示：移动端位置回落，与底部功能栏处于同一水平线 */}
        <div className={`fixed transition-all duration-1000 ease-in-out ${isMobile ? 'bottom-8 -right-4' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}>
          <PlantDisplay plantId={state.activePlantId} points={state.points || 0} isDead={!!state.isPlantDead} isSmall={isMobile} onInteraction={() => {}} />
        </div>
      </div>

      <div className="fixed top-8 left-8 flex flex-col gap-3 pointer-events-none z-[100] transition-all duration-500">
        <div className={`bg-white/80 backdrop-blur-xl ${isMobile ? 'px-3 py-2' : 'px-5 py-3'} rounded-2xl shadow-xl border border-white/50 pointer-events-auto flex items-center gap-3 transition-all`}>
          <div className={`p-1.5 rounded-xl transition-colors ${state.isPlantDead ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}><Clock size={isMobile ? 16 : 20} /></div>
          <div className="flex flex-col">
            {!isMobile && <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">植物倒计时</span>}
            <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} cute-font font-bold ${state.isPlantDead ? 'text-red-500' : 'text-emerald-900'}`}>{state.isPlantDead ? '枯萎' : `${daysLeft}d ${hoursLeft}h`}</span>
          </div>
        </div>
        <div className={`bg-white/80 backdrop-blur-xl ${isMobile ? 'px-3 py-2' : 'px-5 py-3'} rounded-2xl shadow-xl border border-white/50 pointer-events-auto flex items-center gap-3 transition-all`}>
          <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600"><Sprout size={isMobile ? 16 : 20} /></div>
          <div className="flex flex-col">
            {!isMobile && <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">当前总养分</span>}
            <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} cute-font text-emerald-900 font-bold`}>{state.points || 0}</span>
          </div>
        </div>
        <button onClick={() => { fetchHistory(); setShowHistoryModal(true); }} className={`bg-white/80 backdrop-blur-xl ${isMobile ? 'px-3 py-2' : 'px-5 py-3'} rounded-2xl shadow-xl border border-white/50 pointer-events-auto flex items-center gap-3 transition-all hover:bg-emerald-50 group`}>
          <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:rotate-12 transition-transform"><HistoryIcon size={isMobile ? 16 : 20} /></div>
          <div className="flex flex-col text-left">
            {!isMobile && <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">时光印记</span>}
            <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} cute-font text-indigo-900 font-bold`}>{isMobile ? '足迹' : '查看足迹'}</span>
          </div>
        </button>
      </div>

      {/* 功能按钮：移动端保持横向且缩放 */}
      <div className={`fixed z-[1000] transition-all duration-700 ease-in-out ${isMobile ? 'bottom-8 left-8 flex-row gap-4 px-4 py-2.5' : 'bottom-10 left-1/2 -translate-x-1/2 flex-row gap-6 px-8 py-4'} flex items-center bg-white/40 backdrop-blur-2xl rounded-full shadow-2xl border border-white/40 hover:bg-white/60`}>
        <button onClick={() => setShowAboutModal(true)} className={`${isMobile ? 'p-1.5' : 'p-3'} hover:bg-white/50 rounded-full transition-all text-gray-500 hover:text-emerald-700 active:scale-90`}><Info size={isMobile ? 22 : 26} strokeWidth={1.5} /></button>
        <button onClick={() => setShowAddModal(true)} className={`bg-emerald-600 hover:bg-emerald-500 text-white ${isMobile ? 'p-3' : 'p-5'} rounded-full shadow-[0_10px_30px_-5px_rgba(5,150,105,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center group`}><Plus size={isMobile ? 28 : 36} className="group-hover:rotate-90 transition-transform duration-500" /></button>
        <button onClick={() => setShowStoreModal(true)} className={`${isMobile ? 'p-1.5' : 'p-3'} hover:bg-white/50 rounded-full transition-all text-gray-500 hover:text-emerald-700 active:scale-90`}><ShoppingBag size={isMobile ? 22 : 26} strokeWidth={1.5} /></button>
      </div>

      {animation && <ParticleSystem startX={animation.x} startY={animation.y} endX={isMobile ? window.innerWidth - 60 : window.innerWidth / 2} endY={isMobile ? window.innerHeight - 80 : window.innerHeight / 2} active={animation.active} onComplete={() => setAnimation(null)} />}

      {/* Settings Modal - Added Organize Desktop Button */}
      {showAboutModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#fcfdfc] w-full max-w-lg rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white animate-in slide-in-from-bottom-8 duration-500 fancy-scroll overflow-y-auto max-h-[90vh]">
            <h2 className="text-3xl cute-font text-gray-950 font-bold mb-6 tracking-tight">桌面美学设置</h2>
            <div className="space-y-6 mb-10">
              
              <section className="space-y-4">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={14} /> 桌面排版</h3>
                <button 
                  onClick={() => clampTodosToViewport(true)}
                  disabled={isOrganizing}
                  className="w-full py-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-sm font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isOrganizing ? <Loader2 className="animate-spin" size={18}/> : <LayoutGrid size={18}/>}
                  一键整理并同步
                </button>
                <p className="text-[10px] text-gray-400 text-center px-4 leading-relaxed">便签消失或遮挡？点击按钮自动将便签以阶梯形式重新排布在可视区域内。</p>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Sparkles size={14} /> 氛围特效</h3>
                <div className="grid grid-cols-3 gap-3">
                  {effectOptions.map(opt => (
                    <button key={opt.id} onClick={() => updateSettings({ screenEffect: opt.id })} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${(state.settings?.screenEffect || 'none') === opt.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-50 bg-white text-gray-400 hover:border-emerald-100'}`}>
                      <opt.icon size={20} className="mb-1" />
                      <span className="text-[10px] font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14} /> 个性化</h3>
                <div className="p-5 rounded-[2rem] bg-white border border-gray-100 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">毛玻璃便签</span>
                    <button onClick={() => updateSettings({ glassEffectEnabled: !state.settings?.glassEffectEnabled })} className={`w-12 h-6 rounded-full p-1 transition-all ${state.settings?.glassEffectEnabled ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${state.settings?.glassEffectEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {state.settings?.glassEffectEnabled && (
                    <div className="space-y-4">
                      <input type="range" min="0" max="1" step="0.01" value={state.settings.glassOpacity} onChange={(e) => updateSettings({ glassOpacity: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center"><span className="font-bold text-gray-900 text-sm">桌面壁纸</span>{state.settings?.customBackground && <button onClick={() => updateSettings({ customBackground: null })} className="text-xs text-red-400 font-bold">移除自定义</button>}</div>
                  <label className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-100 rounded-xl cursor-pointer hover:border-emerald-200 hover:bg-emerald-50/20 transition-all text-xs font-bold text-gray-500 relative overflow-hidden">
                    {isUploading ? (
                      <><Loader2 size={18} className="animate-spin text-emerald-600" /> 正在上传...</>
                    ) : (
                      <><ImageIcon size={18}/><input type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" /> 选择新壁纸</>
                    )}
                  </label>
                </div>
              </section>

              <section className="space-y-4 pt-4 border-t border-red-50">
                <h3 className="text-xs font-black text-red-400 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> 危险操作</h3>
                <button onClick={handleFactoryReset} className="w-full py-4 border-2 border-red-100 text-red-500 rounded-2xl text-xs font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2 active:scale-95">
                  <RotateCcw size={16} /> 恢复出厂设置
                </button>
              </section>
            </div>
            <button onClick={() => setShowAboutModal(false)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95">完成设置</button>
          </div>
        </div>
      )}

      {/* Other Modals... (omitted for brevity, assume they remain unchanged from previous stable state) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-10 bg-black/20 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="bg-[#fcfdfc] w-full max-w-6xl h-full max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white">
            <div className="p-6 pb-4 border-b border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><HistoryIcon size={20} /></div>
                  <h2 className="text-2xl cute-font text-emerald-950 font-bold">时光印记</h2>
                </div>
                <div className="flex flex-wrap gap-2 flex-1 md:max-w-xl">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type="text" placeholder="搜标题..." className="w-full pl-9 pr-4 py-1.5 bg-gray-50 rounded-xl text-xs outline-none focus:bg-white border border-transparent focus:border-indigo-100" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                  </div>
                  <input type="date" className="bg-gray-50 px-2 py-1.5 rounded-xl text-[10px] outline-none border border-transparent" value={historyDateStart} onChange={e => setHistoryDateStart(e.target.value)} />
                  <input type="date" className="bg-gray-50 px-2 py-1.5 rounded-xl text-[10px] outline-none border border-transparent" value={historyDateEnd} onChange={e => setHistoryDateEnd(e.target.value)} />
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto fancy-scroll p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHistory.map(todo => (
                   <div key={todo.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                         <h3 className="font-bold cute-font text-gray-900">{todo.title}</h3>
                         <div className="text-[9px] text-gray-400 font-mono">{new Date(todo.convertedAt || 0).toLocaleDateString()}</div>
                      </div>
                      <div className="space-y-1">
                        {todo.subTasks.map(st => (
                          <div key={st.id} className="text-[10px] text-gray-400 line-through truncate">• {st.text}</div>
                        ))}
                      </div>
                   </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#fcfdfc] w-full max-w-lg rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl cute-font text-gray-900 font-bold">记录新的灵感</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <input autoFocus placeholder="标题..." className="w-full text-xl cute-font font-bold border-b border-gray-100 focus:border-emerald-500 outline-none pb-2 bg-transparent" value={newTodoTitle} onChange={e => setNewTodoTitle(e.target.value)} />
              <div className="space-y-3 max-h-[40vh] overflow-y-auto fancy-scroll pr-2">
                {newSubTasks.map((task, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input placeholder={`具体步骤 ${idx + 1}`} className="flex-1 bg-gray-50 rounded-xl py-2 px-4 text-sm" value={task} onChange={e => {
                      const updated = [...newSubTasks];
                      updated[idx] = e.target.value;
                      setNewSubTasks(updated);
                    }} />
                    {newSubTasks.length > 1 && <button onClick={() => setNewSubTasks(newSubTasks.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400"><Trash2 size={16}/></button>}
                  </div>
                ))}
                <button onClick={() => setNewSubTasks([...newSubTasks, ''])} className="w-full border border-dashed border-gray-200 rounded-xl py-2 text-xs text-gray-400 hover:border-emerald-200 hover:text-emerald-500 transition-all">+ 添加步骤</button>
              </div>
              <button onClick={handleAddTodo} className="w-full bg-emerald-800 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-900 transition-all">贴上便签</button>
            </div>
          </div>
        </div>
      )}

      {showStoreModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#fcfdfc] w-full max-w-5xl rounded-[3rem] p-8 md:p-10 shadow-2xl overflow-hidden border border-white">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl cute-font text-emerald-950 font-bold">温室花园</h2>
              <button onClick={() => setShowStoreModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 overflow-y-auto max-h-[60vh] fancy-scroll px-2">
              {PLANTS.map(plant => {
                const isOwned = (state.adoptedPlants || []).includes(plant.id);
                const isActive = state.activePlantId === plant.id;
                return (
                  <div key={plant.id} className={`p-4 rounded-3xl border transition-all flex flex-col items-center ${isActive ? 'border-emerald-500 bg-emerald-50 shadow-inner' : 'border-gray-50 bg-white hover:border-emerald-100 hover:shadow-lg'}`}>
                    <img src={plant.images.mature} className="w-24 h-24 mb-4 object-contain" />
                    <h3 className="font-bold text-sm mb-1">{plant.name}</h3>
                    <p className="text-[9px] text-gray-400 text-center mb-4 px-2 line-clamp-2 leading-relaxed">{plant.description}</p>
                    <button onClick={() => adoptPlant(plant)} disabled={isActive} className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-emerald-500 text-white cursor-default' : isOwned ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-md'}`}>{isActive ? '养护中' : isOwned ? '切换' : `${NEW_PLANT_COST} 领养`}</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

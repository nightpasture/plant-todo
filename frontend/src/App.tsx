
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Info, RotateCcw, Sprout, ShoppingBag, Clock, X, Trash2, ListTodo, Image as ImageIcon, Sparkles, CloudOff, RefreshCw, ShieldCheck, CloudRain, Snowflake, Flower2, Search, Calendar, History as HistoryIcon, ChevronRight, AlertTriangle, Loader2, Sliders, LayoutGrid, Palette, CheckCircle, Edit2, UploadCloud, AlarmClock, Repeat, CalendarClock } from 'lucide-react';
import { AppState, Todo, SubTask, PlantType, AppSettings, ScreenEffectType, RecurringRule, RecurrenceFrequency } from './types';
import { 
  PLANTS, 
  DEFAULT_NOTE_COLORS, 
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
    recurringRules: Array.isArray(d.recurringRules) ? d.recurringRules : [],
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
      noteColors: Array.isArray(d.settings?.noteColors) ? d.settings.noteColors : [...DEFAULT_NOTE_COLORS],
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

  // Background upload ref for optimistic UI
  const pendingBackgroundFile = useRef<File | null>(null);
  const [backgroundSyncPending, setBackgroundSyncPending] = useState(false);

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
  const [showRulesModal, setShowRulesModal] = useState(false); // New modal for rules

  const [isUploading, setIsUploading] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  
  // Edit & Add State
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null); // For editing rules

  const [todoTitle, setTodoTitle] = useState('');
  const [subTasks, setSubTasks] = useState<string[]>(['']);
  
  // Recurring Task State
  const [isRecurringMode, setIsRecurringMode] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>('daily');
  const [recurrenceTime, setRecurrenceTime] = useState('09:00');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([1]); // Default Monday
  const [recurrenceDate, setRecurrenceDate] = useState<number>(1);

  const [animation, setAnimation] = useState<{ active: boolean; x: number; y: number } | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'idle'>('idle');
  
  const [historyTodos, setHistoryTodos] = useState<HistoryTodo[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateStart, setHistoryDateStart] = useState('');
  const [historyDateEnd, setHistoryDateEnd] = useState('');

  // Settings State
  const [newColorInput, setNewColorInput] = useState('#ffffff');
  const [isGradientMode, setIsGradientMode] = useState(false);
  // Preview color for settings modal
  const [previewColor, setPreviewColor] = useState(state.settings.noteColors[0] || DEFAULT_NOTE_COLORS[0]);

  // Update preview color when opening settings or when colors change
  useEffect(() => {
      if (showAboutModal && state.settings.noteColors.length > 0) {
          if (!previewColor || !state.settings.noteColors.includes(previewColor)) {
              setPreviewColor(state.settings.noteColors[0]);
          }
      }
  }, [showAboutModal, state.settings.noteColors]);

  // Background Sync Logic
  useEffect(() => {
    const bgPending = localStorage.getItem('bg_sync_pending') === 'true';
    setBackgroundSyncPending(bgPending);

    if (bgPending && pendingBackgroundFile.current) {
        // Retry upload if we have the file in memory
        performBackgroundUpload(pendingBackgroundFile.current);
    }
  }, []);

  const performBackgroundUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(IMAGE_URL, { method: 'POST', body: formData });
      if (response.ok) {
        setBackgroundSyncPending(false);
        localStorage.removeItem('bg_sync_pending');
        pendingBackgroundFile.current = null;
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error("Background sync failed, will retry later or prompt user");
    } finally {
      setIsUploading(false);
    }
  };

  const syncToCloud = useCallback(async () => {
    if (!hasFetchedInitialData.current || !stateRef.current || isSyncingRef.current) return;
    
    // Check if background needs sync (only works if we have file in memory for this session)
    if (backgroundSyncPending && pendingBackgroundFile.current) {
         performBackgroundUpload(pendingBackgroundFile.current);
    }

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
  }, [backgroundSyncPending]);

  const markLocalChange = useCallback(() => {
    lastLocalUpdateTimeRef.current = Date.now();
  }, []);

  // --- Automatic Todo Generation Logic ---
  useEffect(() => {
    const checkRecurringRules = () => {
      if (!stateRef.current) return;
      const now = new Date();
      const currentTimestamp = now.getTime();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentDay = now.getDay(); // 0 is Sunday
      const currentDate = now.getDate();

      let hasChanges = false;
      const updatedRules = stateRef.current.recurringRules.map(rule => {
        // Prevent multiple generations on the same day/trigger period
        const lastGen = new Date(rule.lastGenerated);
        const isSameDay = lastGen.getDate() === currentDate && 
                          lastGen.getMonth() === now.getMonth() && 
                          lastGen.getFullYear() === now.getFullYear();

        if (isSameDay) return rule;

        // Check time constraint
        const [ruleHour, ruleMinute] = rule.time.split(':').map(Number);
        const timePassed = (currentHours > ruleHour) || (currentHours === ruleHour && currentMinutes >= ruleMinute);
        
        if (!timePassed) return rule;

        let shouldGenerate = false;
        let dueDate = 0;

        if (rule.frequency === 'daily') {
          shouldGenerate = true;
          // Due date is end of today
          const d = new Date(now);
          d.setHours(23, 59, 59, 999);
          dueDate = d.getTime();
        } else if (rule.frequency === 'weekly') {
          // Rule days: 0-6 (assume 0 is Sun, 1 is Mon to match JS getDay)
          // Adjust if UI used 1-7. UI uses: 1 (Mon) to 0 (Sun). Matches JS getDay() except UI order.
          if (rule.daysOfWeek && rule.daysOfWeek.includes(currentDay)) {
            shouldGenerate = true;
            // Due date is end of this week (Sunday)
            const d = new Date(now);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? 0 : 7); // adjust when day is sunday
            const endOfWeek = new Date(d.setDate(diff));
            endOfWeek.setHours(23, 59, 59, 999);
            dueDate = endOfWeek.getTime();
          }
        } else if (rule.frequency === 'monthly') {
           if (rule.dayOfMonth === currentDate) {
             shouldGenerate = true;
             // Due date is end of this month
             const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
             d.setHours(23, 59, 59, 999);
             dueDate = d.getTime();
           }
        }

        if (shouldGenerate) {
            hasChanges = true;
            // Create the Todo
            const subTasks: SubTask[] = rule.subTasks.map(t => ({
                id: Math.random().toString(36).substr(2, 9),
                text: t,
                completed: false
            }));
            
            const padding = 100;
            const initialX = Math.random() * (window.innerWidth - 300 - padding) + padding/2;
            const initialY = Math.random() * (window.innerHeight - 300 - padding) + padding/2;
            
            const newTodo: Todo = {
                id: Math.random().toString(36).substr(2, 9),
                title: rule.title,
                subTasks: subTasks,
                createdAt: Date.now(),
                x: initialX,
                y: initialY,
                mx: 20, 
                my: 80, 
                zIndex: 100, // Top
                color: rule.color,
                isConverted: false,
                isRecurring: true,
                dueDate: dueDate
            };
            
            // Add to state via ref to avoid closure staleness in loop, but we need setState eventually
            stateRef.current = {
                ...stateRef.current!,
                todos: [...stateRef.current!.todos, newTodo],
                recurringRules: stateRef.current!.recurringRules.map(r => r.id === rule.id ? { ...r, lastGenerated: currentTimestamp } : r)
            };
            return { ...rule, lastGenerated: currentTimestamp };
        }
        return rule;
      });

      if (hasChanges && stateRef.current) {
         setState({...stateRef.current}); // Trigger re-render
         markLocalChange();
      }
    };

    const interval = setInterval(checkRecurringRules, 60000); // Check every minute
    checkRecurringRules(); // Check on mount
    return () => clearInterval(interval);
  }, [markLocalChange]);

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
        const lowerSearch = historySearch.toLowerCase();
        // Updated search logic: match title OR subtasks
        const matchesSearch = (todo.title || '').toLowerCase().includes(lowerSearch) || 
                              (todo.subTasks || []).some(st => (st.text || '').toLowerCase().includes(lowerSearch));
        
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

  // Open modal for adding
  const openAddModal = () => {
    setEditingTodo(null);
    setEditingRuleId(null);
    setTodoTitle('');
    setSubTasks(['']);
    setIsRecurringMode(false);
    setRecurrenceFreq('daily');
    setRecurrenceTime('09:00');
    setRecurrenceDays([1]);
    setRecurrenceDate(1);
    setShowAddModal(true);
  };

  // Open modal for editing todo
  const handleEditTodo = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setEditingRuleId(null);
    setTodoTitle(todo.title);
    setSubTasks(todo.subTasks.map(t => t.text));
    setIsRecurringMode(false); // Edit existing always defaults to normal editing
    setShowAddModal(true);
  }, []);

  // Open modal for editing Rule
  const handleEditRule = useCallback((rule: RecurringRule) => {
    setEditingRuleId(rule.id);
    setEditingTodo(null);
    setTodoTitle(rule.title);
    setSubTasks(rule.subTasks);
    setIsRecurringMode(true);
    setRecurrenceFreq(rule.frequency);
    setRecurrenceTime(rule.time);
    if (rule.daysOfWeek) setRecurrenceDays(rule.daysOfWeek);
    if (rule.dayOfMonth) setRecurrenceDate(rule.dayOfMonth);
    setShowRulesModal(false); // Close list
    setShowAddModal(true); // Open editor
  }, []);

  const handleDeleteRule = (id: string) => {
      markLocalChange();
      setState(prev => ({
          ...prev,
          recurringRules: prev.recurringRules.filter(r => r.id !== id)
      }));
  };

  // Save (Add or Update)
  const handleSaveTodo = () => {
    if (!todoTitle.trim()) {
        alert("请输入标题");
        return;
    }
    
    // Validate: Must have at least one non-empty subtask
    const validSubTasks = (subTasks || []).filter(t => t && t.trim() !== '');
    if (validSubTasks.length === 0) {
      alert("请至少添加一个子任务");
      return;
    }
    
    markLocalChange();
    
    if (isRecurringMode) {
      // Create or Update a Recurring Rule
      const availableColors = state.settings.noteColors.length > 0 ? state.settings.noteColors : DEFAULT_NOTE_COLORS;
      
      const newRule: RecurringRule = {
        id: editingRuleId || Math.random().toString(36).substr(2, 9),
        title: todoTitle,
        subTasks: validSubTasks,
        frequency: recurrenceFreq,
        time: recurrenceTime,
        daysOfWeek: recurrenceFreq === 'weekly' ? recurrenceDays : undefined,
        dayOfMonth: recurrenceFreq === 'monthly' ? recurrenceDate : undefined,
        color: editingRuleId ? (state.recurringRules.find(r => r.id === editingRuleId)?.color || availableColors[0]) : availableColors[Math.floor(Math.random() * availableColors.length)],
        lastGenerated: editingRuleId ? (state.recurringRules.find(r => r.id === editingRuleId)?.lastGenerated || 0) : 0
      };

      // --- Immediate Generation Logic for NEW rules ---
      let generatedNow = false;
      if (!editingRuleId) {
          const now = new Date();
          const currentHours = now.getHours();
          const currentMinutes = now.getMinutes();
          const currentDay = now.getDay();
          const currentDate = now.getDate();
          
          const [ruleHour, ruleMinute] = recurrenceTime.split(':').map(Number);
          // Check if time has passed OR matches current minute (approx)
          const timePassed = (currentHours > ruleHour) || (currentHours === ruleHour && currentMinutes >= ruleMinute);
          
          let shouldGenerate = false;
          let dueDate = 0;

          if (timePassed) {
             if (recurrenceFreq === 'daily') {
                 shouldGenerate = true;
                 const d = new Date(now);
                 d.setHours(23, 59, 59, 999);
                 dueDate = d.getTime();
             } else if (recurrenceFreq === 'weekly') {
                 if (recurrenceDays.includes(currentDay)) {
                     shouldGenerate = true;
                     const d = new Date(now);
                     const diff = d.getDate() - currentDay + (currentDay === 0 ? 0 : 7);
                     const endOfWeek = new Date(d.setDate(diff));
                     endOfWeek.setHours(23, 59, 59, 999);
                     dueDate = endOfWeek.getTime();
                 }
             } else if (recurrenceFreq === 'monthly') {
                 if (recurrenceDate === currentDate) {
                     shouldGenerate = true;
                     const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                     d.setHours(23, 59, 59, 999);
                     dueDate = d.getTime();
                 }
             }
          }

          if (shouldGenerate) {
              // Generate immediately
              const padding = 100;
              const initialX = Math.random() * (window.innerWidth - 300 - padding) + padding/2;
              const initialY = Math.random() * (window.innerHeight - 300 - padding) + padding/2;
              
              const subTasksObjs: SubTask[] = validSubTasks.map(t => ({
                  id: Math.random().toString(36).substr(2, 9),
                  text: t,
                  completed: false
              }));
              
              const newTodo: Todo = {
                  id: Math.random().toString(36).substr(2, 9),
                  title: newRule.title,
                  subTasks: subTasksObjs,
                  createdAt: Date.now(),
                  x: initialX,
                  y: initialY,
                  mx: 20,
                  my: 80,
                  zIndex: 100,
                  color: newRule.color,
                  isConverted: false,
                  isRecurring: true,
                  dueDate: dueDate
              };
              
              // Mark rule as generated
              newRule.lastGenerated = Date.now();
              generatedNow = true;

              setState(prev => ({
                  ...prev,
                  todos: [...prev.todos, newTodo]
              }));
          }
      }

      setState(prev => {
          const exists = prev.recurringRules.some(r => r.id === newRule.id);
          return {
              ...prev,
              recurringRules: exists 
                  ? prev.recurringRules.map(r => r.id === newRule.id ? newRule : r)
                  : [...prev.recurringRules, newRule]
          };
      });

    } else if (editingTodo) {
        // Update existing Todo logic
        const updatedSubTasks: SubTask[] = validSubTasks.map((text, idx) => {
            const existing = editingTodo.subTasks[idx];
            if (existing && existing.text === text) {
                return existing;
            }
            return { id: Math.random().toString(36).substr(2, 9), text, completed: false };
        });

        setState(prev => ({
            ...prev,
            todos: prev.todos.map(t => t.id === editingTodo.id ? {
                ...t,
                title: todoTitle,
                subTasks: updatedSubTasks
            } : t)
        }));
    } else {
        // Create new one-time Todo logic
        const tasks: SubTask[] = validSubTasks.map(t => ({ 
            id: Math.random().toString(36).substr(2, 9), 
            text: t, 
            completed: false 
        }));
        
        const padding = 100;
        const initialX = Math.random() * (window.innerWidth - 300 - padding) + padding/2;
        const initialY = Math.random() * (window.innerHeight - 300 - padding) + padding/2;

        const availableColors = state.settings.noteColors.length > 0 ? state.settings.noteColors : DEFAULT_NOTE_COLORS;
        const newTodo: Todo = {
            id: Math.random().toString(36).substr(2, 9),
            title: todoTitle,
            subTasks: tasks,
            createdAt: Date.now(),
            x: initialX,
            y: initialY,
            mx: 20, 
            my: 80 + state.todos.length * 45, 
            zIndex: (state.todos?.length || 0) + 10,
            color: availableColors[Math.floor(Math.random() * availableColors.length)],
            isConverted: false
        };

        setState(prev => ({ ...prev, todos: [...(prev.todos || []), newTodo] }));
    }

    setTodoTitle('');
    setSubTasks(['']);
    setEditingTodo(null);
    setEditingRuleId(null);
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

  // Optimistic Background Upload
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert("壁纸限制 20MB 以内。"); return; }
    
    // 1. Optimistic Update: Create blob URL
    const blobUrl = URL.createObjectURL(file);
    const timestampId = Date.now().toString();
    
    // We cheat a bit here by storing the blob URL temporarily in our state/logic wrapper
    // But since the App component re-renders, we rely on the customBackground string.
    // To make this work with the existing logic:
    // We update settings with a temporary ID.
    // AND we need to intercept the style generation to use the blob URL if it matches pending.
    
    // For simplicity with existing code structure:
    // We won't use the standard IMAGE_URL fetch for pending, we'll store the Blob URL in a separate map or just rely on browser cache if we used the same URL, 
    // but URL.createObjectURL creates a unique one.
    
    // Actually, easier way: Use a FileReader to get base64 for local preview immediately? 
    // No, Blob URL is faster.
    
    // Store pending blob url in a window object or ref to use in rendering
    (window as any)[`bg_blob_${timestampId}`] = blobUrl;
    
    updateSettings({ customBackground: timestampId });
    
    // 2. Set Sync Pending Status
    setBackgroundSyncPending(true);
    localStorage.setItem('bg_sync_pending', 'true');
    pendingBackgroundFile.current = file;

    // 3. Trigger Upload
    performBackgroundUpload(file);
  };

  const handleAddColor = () => {
    if(!newColorInput) return;
    const currentColors = state.settings.noteColors;
    if(!currentColors.includes(newColorInput)) {
        updateSettings({ noteColors: [...currentColors, newColorInput] });
        setPreviewColor(newColorInput);
    }
    setNewColorInput('#ffffff');
  };

  const handleRemoveColor = (color: string) => {
    const currentColors = state.settings.noteColors;
    updateSettings({ noteColors: currentColors.filter(c => c !== color) });
    if (previewColor === color) {
        setPreviewColor(currentColors.filter(c => c !== color)[0] || DEFAULT_NOTE_COLORS[0]);
    }
  };

  const handleFactoryReset = async () => {
    if (!window.confirm("确定要重新开始吗？")) return;
    try {
      const response = await fetch(RESET_URL, { method: 'POST' });
      if (response.ok) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }
    } catch (err) { alert("网络错误"); }
  };

  const toggleRecurrenceDay = (day: number) => {
     setRecurrenceDays(prev => 
         prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
     );
  };

  const timeLeft = Math.max(0, (state.deathTime || 0) - Date.now());
  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  // Background Image Logic
  const getBackgroundImage = () => {
     if (!state.settings?.customBackground) return 'none';
     
     // Check if we have a pending blob for this ID
     const pendingBlob = (window as any)[`bg_blob_${state.settings.customBackground}`];
     if (pendingBlob) {
         return `url(${pendingBlob})`;
     }
     
     return `url(${IMAGE_URL}?t=${state.settings.customBackground})`;
  };

  const backgroundStyle = { 
    backgroundImage: getBackgroundImage(), 
    backgroundSize: 'cover', 
    backgroundPosition: 'center' 
  };

  const effectOptions: { id: ScreenEffectType; label: string; icon: any }[] = [
    { id: 'none', label: '无特效', icon: X },
    { id: 'light-rain', label: '小雨', icon: CloudRain },
    { id: 'heavy-rain', label: '大雨', icon: CloudRain },
    { id: 'light-snow', label: '小雪', icon: Snowflake },
    { id: 'heavy-snow', label: '大雪', icon: Snowflake },
    { id: 'sakura', label: '樱花', icon: Flower2 },
  ];

  const weekDays = [
      { id: 1, label: '周一' }, { id: 2, label: '周二' }, { id: 3, label: '周三' }, 
      { id: 4, label: '周四' }, { id: 5, label: '周五' }, { id: 6, label: '周六' }, 
      { id: 0, label: '周日' }
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f7f9f7] transition-all duration-1000" style={backgroundStyle}>
      <ScreenEffects type={state.settings?.screenEffect || 'none'} />
      {!state.settings?.customBackground && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none" style={{ backgroundImage: 'radial-gradient(#065f46 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      )}

      {/* Sync Status Indicators */}
      <div className="fixed top-8 right-8 z-[100] flex flex-col gap-2 items-end">
        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 text-[10px] font-bold uppercase tracking-widest text-gray-500 shadow-sm cursor-pointer hover:bg-white/80 transition-all">
            {syncStatus === 'syncing' ? <><RefreshCw className="animate-spin text-emerald-500" size={14}/> 正在同步</> : syncStatus === 'synced' ? <><ShieldCheck className="text-emerald-600" size={14}/> 数据安全</> : <><CloudOff className="text-red-400" size={14}/> 离线模式</>}
        </div>
        {backgroundSyncPending && (
             <div className="flex items-center gap-2 bg-amber-100/80 backdrop-blur-md px-4 py-2 rounded-full border border-amber-200 text-[10px] font-bold uppercase tracking-widest text-amber-700 shadow-sm animate-pulse">
                <UploadCloud size={14} /> 壁纸未同步
             </div>
        )}
      </div>

      <div className="relative w-full h-full p-4 overflow-hidden">
        {(state.todos || []).map(todo => (
          <StickyNote 
            key={todo.id} todo={todo} isMobile={isMobile}
            isGlass={state.settings?.glassEffectEnabled} glassOpacity={state.settings?.glassOpacity}
            onUpdate={handleUpdateTodo} onDelete={handleDeleteTodo} onFocus={handleFocusTodo} onConvert={handleConvert} 
            onEdit={handleEditTodo}
          />
        ))}
        {/* 植物展示：移动端位置回落，与底部功能栏处于同一水平线 */}
        <div className={`fixed transition-all duration-1000 ease-in-out ${isMobile ? 'bottom-8 -right-4' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}>
          <PlantDisplay plantId={state.activePlantId} points={state.points || 0} isDead={!!state.isPlantDead} isSmall={isMobile} onInteraction={() => {}} />
        </div>
      </div>

      <div className={`fixed top-8 left-8 flex flex-col ${isMobile ? 'gap-3' : 'gap-5'} pointer-events-none z-[100] transition-all duration-500`}>
        <div className={`bg-white/80 backdrop-blur-xl ${isMobile ? 'px-3 py-2' : 'px-6 py-4'} rounded-2xl shadow-xl border border-white/50 pointer-events-auto flex items-center ${isMobile ? 'gap-3' : 'gap-4'} transition-all`}>
          <div className={`p-1.5 rounded-xl transition-colors ${state.isPlantDead ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}><Clock size={isMobile ? 16 : 28} /></div>
          <div className="flex flex-col">
            {!isMobile && <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">植愈倒计时</span>}
            <span className={`${isMobile ? 'text-[11px]' : 'text-xl'} cute-font font-bold ${state.isPlantDead ? 'text-red-500' : 'text-emerald-900'}`}>{state.isPlantDead ? '枯萎' : `${daysLeft}d ${hoursLeft}h`}</span>
          </div>
        </div>
        <div className={`bg-white/80 backdrop-blur-xl ${isMobile ? 'px-3 py-2' : 'px-6 py-4'} rounded-2xl shadow-xl border border-white/50 pointer-events-auto flex items-center ${isMobile ? 'gap-3' : 'gap-4'} transition-all`}>
          <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600"><Sprout size={isMobile ? 16 : 28} /></div>
          <div className="flex flex-col">
            {!isMobile && <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">当前总养分</span>}
            <span className={`${isMobile ? 'text-[11px]' : 'text-xl'} cute-font text-emerald-900 font-bold`}>{state.points || 0}</span>
          </div>
        </div>
        <button onClick={() => { fetchHistory(); setShowHistoryModal(true); }} className={`bg-white/80 backdrop-blur-xl ${isMobile ? 'px-3 py-2' : 'px-6 py-4'} rounded-2xl shadow-xl border border-white/50 pointer-events-auto flex items-center ${isMobile ? 'gap-3' : 'gap-4'} transition-all hover:bg-emerald-50 group`}>
          <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:rotate-12 transition-transform"><HistoryIcon size={isMobile ? 16 : 28} /></div>
          <div className="flex flex-col text-left">
            {!isMobile && <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">时光印记</span>}
            <span className={`${isMobile ? 'text-[11px]' : 'text-xl'} cute-font text-indigo-900 font-bold`}>{isMobile ? '足迹' : '查看足迹'}</span>
          </div>
        </button>
         <button onClick={() => setShowRulesModal(true)} className={`bg-white/80 backdrop-blur-xl ${isMobile ? 'px-3 py-2' : 'px-6 py-4'} rounded-2xl shadow-xl border border-white/50 pointer-events-auto flex items-center ${isMobile ? 'gap-3' : 'gap-4'} transition-all hover:bg-emerald-50 group`}>
          <div className="p-1.5 rounded-xl bg-rose-50 text-rose-500 group-hover:rotate-12 transition-transform"><CalendarClock size={isMobile ? 16 : 28} /></div>
          <div className="flex flex-col text-left">
            {!isMobile && <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">自动任务</span>}
            <span className={`${isMobile ? 'text-[11px]' : 'text-xl'} cute-font text-rose-900 font-bold`}>{isMobile ? '任务' : '管理任务'}</span>
          </div>
        </button>
      </div>

      {/* 功能按钮：移动端保持横向且缩放 */}
      <div className={`fixed z-[1000] transition-all duration-700 ease-in-out ${isMobile ? 'bottom-8 left-8 flex-row gap-4 px-4 py-2.5' : 'bottom-10 left-1/2 -translate-x-1/2 flex-row gap-6 px-8 py-4'} flex items-center bg-white/40 backdrop-blur-2xl rounded-full shadow-2xl border border-white/40 hover:bg-white/60`}>
        <button onClick={() => setShowAboutModal(true)} className={`${isMobile ? 'p-1.5' : 'p-3'} hover:bg-white/50 rounded-full transition-all text-gray-500 hover:text-emerald-700 active:scale-90`}><Info size={isMobile ? 22 : 26} strokeWidth={1.5} /></button>
        <button onClick={openAddModal} className={`bg-emerald-600 hover:bg-emerald-500 text-white ${isMobile ? 'p-3' : 'p-5'} rounded-full shadow-[0_10px_30px_-5px_rgba(5,150,105,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center group`}><Plus size={isMobile ? 28 : 36} className="group-hover:rotate-90 transition-transform duration-500" /></button>
        <button onClick={() => setShowStoreModal(true)} className={`${isMobile ? 'p-1.5' : 'p-3'} hover:bg-white/50 rounded-full transition-all text-gray-500 hover:text-emerald-700 active:scale-90`}><ShoppingBag size={isMobile ? 22 : 26} strokeWidth={1.5} /></button>
      </div>

      {animation && <ParticleSystem startX={animation.x} startY={animation.y} endX={isMobile ? window.innerWidth - 60 : window.innerWidth / 2} endY={isMobile ? window.innerHeight - 80 : window.innerHeight / 2} active={animation.active} onComplete={() => setAnimation(null)} />}

      {/* Settings Modal */}
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

              {/* Unified Appearance Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Palette size={14} /> 外观与便签</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Preview Area */}
                    <div className="aspect-square rounded-[2rem] border border-gray-100 overflow-hidden relative shadow-inner">
                        <div className="absolute inset-0 bg-gray-200" style={backgroundStyle}></div>
                        {/* Mock Note */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 p-5 rounded-2xl shadow-xl border border-white/20 ${state.settings.glassEffectEnabled ? 'backdrop-blur-md' : ''}`}
                             style={{
                                 background: previewColor || state.settings.noteColors[0] || DEFAULT_NOTE_COLORS[0],
                                 backgroundColor: state.settings.glassEffectEnabled 
                                    ? ((previewColor || state.settings.noteColors[0] || DEFAULT_NOTE_COLORS[0]).startsWith('#') 
                                        ? (previewColor || state.settings.noteColors[0] || DEFAULT_NOTE_COLORS[0]) + Math.round(state.settings.glassOpacity * 255).toString(16).padStart(2, '0') 
                                        : (previewColor || state.settings.noteColors[0] || DEFAULT_NOTE_COLORS[0]))
                                    : (previewColor || state.settings.noteColors[0] || DEFAULT_NOTE_COLORS[0]),
                                 transform: 'translate(-50%, -50%) rotate(-2deg)'
                             }}
                        >
                            <div className="h-3 w-24 bg-black/10 rounded-full mb-3"></div>
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-black/5 rounded-full"></div>
                                <div className="h-2 w-5/6 bg-black/5 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Controls Area */}
                    <div className="space-y-4">
                         <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
                             <div className="flex justify-between items-center"><span className="font-bold text-gray-900 text-xs">桌面壁纸</span>{state.settings?.customBackground && <button onClick={() => updateSettings({ customBackground: null })} className="text-[10px] text-red-400 font-bold">移除自定义</button>}</div>
                             <label className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-100 rounded-xl cursor-pointer hover:border-emerald-200 hover:bg-emerald-50/20 transition-all text-[10px] font-bold text-gray-500 relative overflow-hidden">
                                {isUploading ? (
                                <><Loader2 size={14} className="animate-spin text-emerald-600" /> 上传中...</>
                                ) : (
                                <><ImageIcon size={14}/><input type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" /> 选择图片</>
                                )}
                             </label>
                             {backgroundSyncPending && <div className="text-[9px] text-amber-500 flex items-center gap-1 justify-center"><AlertTriangle size={10} /> 壁纸等待同步中</div>}
                         </div>

                         <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-900 text-xs">毛玻璃效果</span>
                                <button onClick={() => updateSettings({ glassEffectEnabled: !state.settings?.glassEffectEnabled })} className={`w-10 h-5 rounded-full p-1 transition-all ${state.settings?.glassEffectEnabled ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${state.settings?.glassEffectEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            {state.settings?.glassEffectEnabled && (
                                <input type="range" min="0" max="1" step="0.01" value={state.settings.glassOpacity} onChange={(e) => updateSettings({ glassOpacity: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded-[2rem] bg-white border border-gray-100 shadow-sm space-y-4">
                     <span className="font-bold text-gray-900 text-xs block mb-2">便签颜色库</span>
                     <div className="flex flex-wrap gap-2 mb-4">
                        {state.settings.noteColors.map((color, idx) => (
                            <div key={idx} 
                                 onClick={() => setPreviewColor(color)}
                                 className={`w-10 h-10 rounded-full border-2 relative group cursor-pointer transition-transform active:scale-95 ${previewColor === color ? 'border-emerald-500 scale-110 shadow-md' : 'border-gray-100 hover:border-gray-300'}`} 
                                 style={{ background: color }}
                            >
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveColor(color); }} 
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 shadow-sm"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                     </div>
                     <div className="flex gap-2 items-end">
                         <div className="flex-1 space-y-1">
                             <div className="flex gap-2 mb-2 text-[10px] font-bold text-gray-400">
                                 <button onClick={() => setIsGradientMode(false)} className={`pb-1 ${!isGradientMode ? 'text-emerald-600 border-b-2 border-emerald-600' : ''}`}>单色</button>
                                 <button onClick={() => setIsGradientMode(true)} className={`pb-1 ${isGradientMode ? 'text-emerald-600 border-b-2 border-emerald-600' : ''}`}>CSS渐变</button>
                             </div>
                             {isGradientMode ? (
                                 <input type="text" placeholder="linear-gradient(...)" className="w-full bg-gray-50 px-2 py-1.5 rounded-lg text-xs border border-transparent focus:bg-white focus:border-emerald-200 outline-none" value={newColorInput} onChange={e => setNewColorInput(e.target.value)} />
                             ) : (
                                 <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-transparent focus-within:bg-white focus-within:border-emerald-200">
                                     <input type="color" className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0" value={newColorInput.startsWith('#') ? newColorInput : '#ffffff'} onChange={e => setNewColorInput(e.target.value)} />
                                     <input type="text" className="flex-1 bg-transparent text-xs outline-none" value={newColorInput} onChange={e => setNewColorInput(e.target.value)} />
                                 </div>
                             )}
                         </div>
                         <button onClick={handleAddColor} className="bg-emerald-100 text-emerald-700 p-2 rounded-lg hover:bg-emerald-200 transition-colors"><Plus size={16} /></button>
                     </div>
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

      {/* Rules Manager Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/10 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#fcfdfc] w-full max-w-2xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500"><CalendarClock size={20} /></div>
                     <h2 className="text-2xl cute-font text-gray-950 font-bold">自动任务管理</h2>
                  </div>
                  <button onClick={() => setShowRulesModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto fancy-scroll space-y-4 pr-2">
                    {state.recurringRules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                             <Repeat size={48} strokeWidth={1} />
                             <p className="text-sm">暂无自动任务规则</p>
                        </div>
                    ) : (
                        state.recurringRules.map(rule => (
                            <div key={rule.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                         <h3 className="font-bold text-gray-800 text-sm cute-font text-lg">{rule.title}</h3>
                                         <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-bold">
                                             {rule.frequency === 'daily' ? '每天' : rule.frequency === 'weekly' ? '每周' : '每月'}
                                         </span>
                                    </div>
                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                        <Clock size={12} /> {rule.time}
                                        {rule.frequency === 'weekly' && (
                                            <span className="flex gap-1">
                                                {rule.daysOfWeek?.map(d => weekDays.find(wd => wd.id === d)?.label).join('、')}
                                            </span>
                                        )}
                                        {rule.frequency === 'monthly' && (
                                            <span>{rule.dayOfMonth}日</span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1 line-clamp-1 max-w-[200px]">
                                        {rule.subTasks.join(' · ')}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEditRule(rule)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-indigo-500 transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteRule(rule.id)} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                    修改后的规则将仅对未来生成的任务生效，不影响已创建的便签。
                </div>
            </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-10 bg-black/20 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="bg-[#fcfdfc] w-full max-w-6xl h-full max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white">
            <div className="p-6 pb-4 border-b border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><HistoryIcon size={20} /></div>
                  <h2 className="text-2xl cute-font text-emerald-950 font-bold">时光印记</h2>
                </div>
                
                <div className="flex flex-col md:flex-row gap-2 flex-1 w-full md:max-w-xl">
                  <div className="relative w-full md:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type="text" placeholder="搜标题或步骤..." className="w-full pl-9 pr-4 py-1.5 bg-gray-50 rounded-xl text-xs outline-none focus:bg-white border border-transparent focus:border-indigo-100" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <input type="date" className="flex-1 md:w-auto bg-gray-50 px-2 py-1.5 rounded-xl text-[10px] outline-none border border-transparent" value={historyDateStart} onChange={e => setHistoryDateStart(e.target.value)} />
                    <input type="date" className="flex-1 md:w-auto bg-gray-50 px-2 py-1.5 rounded-xl text-[10px] outline-none border border-transparent" value={historyDateEnd} onChange={e => setHistoryDateEnd(e.target.value)} />
                  </div>
                </div>

                <button onClick={() => setShowHistoryModal(false)} className="absolute top-0 right-0 md:static w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto fancy-scroll p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHistory.map(todo => (
                   <div key={todo.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                         <h3 className="text-xl font-bold cute-font text-gray-900 leading-snug">{todo.title}</h3>
                         <div className="text-xs text-gray-400 font-mono whitespace-nowrap ml-2 mt-1">{new Date(todo.convertedAt || 0).toLocaleDateString()}</div>
                      </div>
                      <div className="space-y-2">
                        {todo.subTasks.map(st => (
                          <div key={st.id} className="text-sm text-gray-500 truncate flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                             {st.text}
                          </div>
                        ))}
                      </div>
                   </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Todo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#fcfdfc] w-full max-w-lg rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl cute-font text-gray-900 font-bold">{editingTodo ? '编辑灵感' : editingRuleId ? '编辑自动任务' : '记录新的灵感'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <input autoFocus placeholder="标题..." className="w-full text-xl cute-font font-bold border-b border-gray-100 focus:border-emerald-500 outline-none pb-2 bg-transparent" value={todoTitle} onChange={e => setTodoTitle(e.target.value)} />
              
              {!editingTodo && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                         <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><Repeat size={14}/> 自动创建任务</span>
                         <button onClick={() => setIsRecurringMode(!isRecurringMode)} disabled={!!editingRuleId} className={`w-8 h-4 rounded-full p-0.5 transition-all ${isRecurringMode ? 'bg-emerald-500' : 'bg-gray-300'} ${editingRuleId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${isRecurringMode ? 'translate-x-4' : 'translate-x-0'}`} />
                         </button>
                    </div>
                    {isRecurringMode && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-200/50">
                            <div className="flex gap-2">
                                <select value={recurrenceFreq} onChange={(e) => setRecurrenceFreq(e.target.value as RecurrenceFrequency)} className="bg-white border border-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-emerald-300">
                                    <option value="daily">每天</option>
                                    <option value="weekly">每周</option>
                                    <option value="monthly">每月</option>
                                </select>
                                <input type="time" value={recurrenceTime} onChange={(e) => setRecurrenceTime(e.target.value)} className="bg-white border border-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-emerald-300 flex-1" />
                            </div>
                            
                            {recurrenceFreq === 'weekly' && (
                                <div className="flex justify-between gap-1">
                                    {weekDays.map(d => (
                                        <button 
                                            key={d.id} 
                                            onClick={() => toggleRecurrenceDay(d.id)}
                                            className={`text-[10px] w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ${recurrenceDays.includes(d.id) ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {recurrenceFreq === 'monthly' && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>每月</span>
                                    <input type="number" min="1" max="31" value={recurrenceDate} onChange={(e) => setRecurrenceDate(parseInt(e.target.value))} className="w-12 bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none text-center" />
                                    <span>日自动创建</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
              )}

              <div className="space-y-3 max-h-[40vh] overflow-y-auto fancy-scroll pr-2">
                {subTasks.map((task, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input placeholder={`具体步骤 ${idx + 1}`} className="flex-1 bg-gray-50 rounded-xl py-2 px-4 text-sm" value={task} onChange={e => {
                      const updated = [...subTasks];
                      updated[idx] = e.target.value;
                      setSubTasks(updated);
                    }} />
                    {subTasks.length > 1 && <button onClick={() => setSubTasks(subTasks.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400"><Trash2 size={16}/></button>}
                  </div>
                ))}
                <button onClick={() => setSubTasks([...subTasks, ''])} className="w-full border border-dashed border-gray-200 rounded-xl py-2 text-xs text-gray-400 hover:border-emerald-200 hover:text-emerald-500 transition-all">+ 添加步骤</button>
              </div>
              
              {!subTasks.some(t => t.trim()) && (
                 <div className="flex items-center gap-2 text-amber-500 text-xs px-1 animate-pulse">
                    <AlertTriangle size={14} />
                    <span>请增加至少一个待办事项</span>
                 </div>
              )}
              
              <button onClick={handleSaveTodo} className="w-full bg-emerald-800 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-900 transition-all">{editingTodo ? '保存修改' : isRecurringMode ? (editingRuleId ? '保存规则修改' : '设置自动任务') : '贴上便签'}</button>
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

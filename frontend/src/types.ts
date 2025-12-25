
export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  subTasks: SubTask[];
  createdAt: number;
  x: number;
  y: number;
  mx?: number; // Mobile X
  my?: number; // Mobile Y
  zIndex: number;
  color: string;
  isConverted: boolean;
}

export type PlantStage = 'seedling' | 'sprout' | 'young' | 'mature' | 'blooming';
export type ScreenEffectType = 'none' | 'light-snow' | 'heavy-snow' | 'light-rain' | 'heavy-rain' | 'sakura';

export interface PlantType {
  id: string;
  name: string;
  description: string;
  images: Record<PlantStage, string>;
}

export interface AppSettings {
  glassEffectEnabled: boolean;
  glassOpacity: number; // 0 to 1
  customBackground: string | null;
  screenEffect: ScreenEffectType;
}

export interface AppState {
  todos: Todo[];
  points: number;
  activePlantId: string;
  deathTime: number; // Timestamp
  isPlantDead: boolean;
  adoptedPlants: string[];
  settings: AppSettings;
}

export interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  speed: number;
  life: number;
  color: string;
}

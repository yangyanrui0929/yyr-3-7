export type CellType = 'empty' | 'windmill' | 'house' | 'factory' | 'battery' | 'wire' | 'relay' | 'timer' | 'priority_valve';

export type ToolType = CellType | 'remove';

export type RuleCondition = 'day' | 'night' | 'low_battery' | 'fault';

export type RuleAction = 'prioritize_factory' | 'prioritize_house' | 'cutoff_nonessential' | 'bypass_fault';

export interface Rule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  enabled: boolean;
  priority: number;
  triggered: boolean;
  description: string;
}

export const DEFAULT_RULES: Rule[] = [
  {
    id: 'rule-day-factory',
    name: '白天工坊优先',
    condition: 'day',
    action: 'prioritize_factory',
    enabled: false,
    priority: 1,
    triggered: false,
    description: '白天时优先给工坊供电，确保生产效率',
  },
  {
    id: 'rule-night-house',
    name: '夜晚住房优先',
    condition: 'night',
    action: 'prioritize_house',
    enabled: false,
    priority: 2,
    triggered: false,
    description: '夜晚时优先给住房供电，保障居民生活',
  },
  {
    id: 'rule-low-battery',
    name: '低电量保护',
    condition: 'low_battery',
    action: 'cutoff_nonessential',
    enabled: false,
    priority: 3,
    triggered: false,
    description: '蓄电池低于20%时关闭工坊等非必要建筑',
  },
  {
    id: 'rule-fault-bypass',
    name: '故障绕行',
    condition: 'fault',
    action: 'bypass_fault',
    enabled: false,
    priority: 4,
    triggered: false,
    description: '检测到故障时自动绕开故障线路',
  },
];

export const LOW_BATTERY_THRESHOLD = 0.2;

export interface GridCell {
  x: number;
  y: number;
  type: CellType;
  rotation: number;
  powered: boolean;
  faulty: boolean;
  relayOpen?: boolean;
  timerSchedule?: 'day' | 'night';
  priorityTarget?: 'house' | 'factory';
}

export const GRID_SIZE = 8;

export const BUILDING_STATS = {
  windmill: { dayGen: 5, nightGen: 1, consumption: 0, name: '风车', emoji: '🌀' },
  house: { dayGen: 0, nightGen: 0, consumption: 2, name: '住房', emoji: '🏠' },
  factory: { dayGen: 0, nightGen: 0, consumption: 4, name: '工坊', emoji: '🏭' },
  battery: { dayGen: 0, nightGen: 0, consumption: 0, storage: 20, name: '蓄电池', emoji: '🔋' },
  wire: { dayGen: 0, nightGen: 0, consumption: 0, name: '电线', emoji: '⚡' },
  relay: { dayGen: 0, nightGen: 0, consumption: 0, name: '继电器', emoji: '🔌' },
  timer: { dayGen: 0, nightGen: 0, consumption: 0, name: '定时器', emoji: '⏰' },
  priority_valve: { dayGen: 0, nightGen: 0, consumption: 0, name: '优先阀', emoji: '🔀' },
} as const;

export const WIRE_CONNECTIONS: Record<number, [boolean, boolean, boolean, boolean]> = {
  0: [true, false, true, false],
  1: [false, true, false, true],
  2: [true, true, false, false],
  3: [true, false, false, true],
  4: [false, true, true, false],
  5: [false, false, true, true],
};

export const DIR_OFFSETS: Array<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const TOOLS: Array<{ type: ToolType; name: string; emoji: string; description: string }> = [
  { type: 'windmill', name: '风车', emoji: '🌀', description: '白天+5电，夜晚+1电' },
  { type: 'house', name: '住房', emoji: '🏠', description: '消耗2电，提供满意度' },
  { type: 'factory', name: '工坊', emoji: '🏭', description: '消耗4电，生产物资' },
  { type: 'battery', name: '蓄电池', emoji: '🔋', description: '存储20电量' },
  { type: 'wire', name: '电线', emoji: '⚡', description: '传导电力，右键/R旋转' },
  { type: 'relay', name: '继电器', emoji: '🔌', description: '规则触发时断开/闭合线路' },
  { type: 'timer', name: '定时器', emoji: '⏰', description: '白天/夜晚自动切换通断' },
  { type: 'priority_valve', name: '优先阀', emoji: '🔀', description: '控制下游建筑供电优先级' },
  { type: 'remove', name: '拆除', emoji: '🗑️', description: '移除建筑或电线' },
];

export const DAY_LENGTH = 100;
export const DAY_THRESHOLD = 50;
export const TICK_INTERVAL = 300;
export const FAULT_CHANCE = 0.002;

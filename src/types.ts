/**
 * TypeScript Data Models for Kanban Squad Game
 */

export type SquadRole = 'analyst' | 'developer' | 'qa';

export type BoardStage = 'analysis' | 'development' | 'testing';

export type BoardColumn = 'backlog' | 'ready' | 'analysis' | 'development' | 'testing' | 'deployed';

export type ClassOfService = 'standard' | 'fixed-date' | 'expedite' | 'tech-debt';

export type DemandType = 'story' | 'bug' | 'support' | 'docs' | 'epic';

export interface SquadMember {
  id: string;
  name: string;
  role: SquadRole;
  roleLabel: string;
  allowedStage: BoardStage;
  avatar: string;
  dailyCost: number;
  currentDice: number;
  isAbsent: boolean;
  assignedCardId: string | null;
}

export interface Card {
  id: string;
  code: string;
  title: string;
  description: string;
  classOfService: ClassOfService;
  column: BoardColumn;
  createdDay: number;
  startedDay: number | null;
  completedDay: number | null;
  deadlineDay: number;
  baseValue: number;
  currentValue: number;
  penaltyPerDay: number;
  accumulatedPenalty: number;
  effortAnalysis: number;
  doneAnalysis: number;
  effortDev: number;
  doneDev: number;
  effortTest: number;
  doneTest: number;
  totalEffort: number;
  isBlocked: boolean;
  assignedAgents: string[];
  isManual: boolean;
  isHighValue: boolean;
  bugRejectionCount: number;
  hasBug?: boolean;
  demandType?: DemandType;
  parentEpicId?: string | null;
  parentEpicCode?: string | null;
  parentEpicTitle?: string | null;
  isEpic?: boolean;
  docCostPerDay?: number;
  accumulatedDocCost?: number;
  epicTotalStories?: number;
  epicTotalBugs?: number;
  epicSpawnedStories?: number;
  epicSpawnedBugs?: number;
}

export interface WipLimits {
  backlog: number;
  ready: number;
  analysis: number;
  development: number;
  testing: number;
  deployed: number;
}

export interface FinancialHistoryItem {
  day: number;
  revenue: number;
  cost: number;
  penalties: number;
  profit: number;
  cash: number;
}

export interface FinancialLedger {
  initialCash: number;
  currentCash: number;
  totalRevenue: number;
  totalCost: number;
  totalPenalties: number;
  bonusEarned: number;
  netProfit: number;
  consecutiveNegativeDays: number;
  maxNegativeDaysAllowed: number;
  isBankrupt: boolean;
  history: FinancialHistoryItem[];
}

export type GameOverReason = 'bankruptcy' | 'completed' | null;

export interface GameScore {
  totalScore: number;
  rank: 'S' | 'A' | 'B' | 'C' | 'D';
  rankTitle: string;
  deliveredCount: number;
  onTimeCount: number;
  onTimeRate: number;
  delayedCount: number;
  avgLeadTime: string;
  throughput: string;
  initialCash: number;
  finalCash: number;
  netProfit: number;
  totalRevenue: number;
  totalCost: number;
  totalPenalties: number;
  wipRemaining: number;
  finishedDay: number;
}

export interface CFDPoint {
  day: number;
  backlog: number;
  ready: number;
  analysis: number;
  development: number;
  testing: number;
  deployed: number;
}

export interface DailyDelivery {
  day: number;
  count: number;
  value: number;
}

export interface EventLog {
  day: number;
  title: string;
  badge: string;
  type: 'positive' | 'negative' | 'critical' | 'neutral';
  description: string;
  impactText: string;
  customResult?: string;
}

export interface GameExportData {
  version: string;
  exportedAt: string;
  security: {
    hashAlgorithm: string;
    signature: string;
    integrityNotice: string;
  };
  gameData: {
    day: number;
    wipLimits: WipLimits;
    cards: Card[];
    financial: FinancialLedger;
    cfdHistory: CFDPoint[];
    dailyDelivered: DailyDelivery[];
    eventsHistory: EventLog[];
    agents: Record<string, SquadMember>;
  };
}

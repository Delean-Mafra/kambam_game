/**
 * KANBAN SQUAD GAME ENGINE (TypeScript)
 * Implements Little's Law, Strict Role Separation (3 Analysts, 3 Devs, 3 QAs),
 * Swarming, QA defect rejection, side-effect regression spawning, and financial accounting.
 */

import type {
  SquadMember,
  Card,
  WipLimits,
  FinancialLedger,
  CFDPoint,
  DailyDelivery,
  EventLog,
  GameExportData,
  GameOverReason,
  GameScore,
  DemandType
} from './types';
import { SQUAD_EVENTS } from './events';
import { soundEngine } from './audio';
import { generateAntiTamperHash, verifyAntiTamperHash } from './crypto';

export class KanbanGameEngine {
  public day: number = 1;
  public lastEvent: EventLog | null = null;
  public wipLimits: WipLimits;
  public agents: Record<string, SquadMember>;
  public financial: FinancialLedger;
  public cfdHistory: CFDPoint[] = [];
  public dailyDelivered: DailyDelivery[] = [];
  public eventsHistory: EventLog[] = [];
  public cards: Card[] = [];
  public isGameOver: boolean = false;
  public gameOverReason: GameOverReason = null;
  public finalScore: GameScore | null = null;
  public lastDemandGeneratedDay: number = 1;

  constructor() {
    this.wipLimits = {
      backlog: 999,
      ready: 3,
      analysis: 2,
      development: 3,
      testing: 2,
      deployed: 999,
    };

    this.agents = this.createSquadMembers();
    this.financial = {
      initialCash: 1000000,
      currentCash: 1000000,
      totalRevenue: 0,
      totalCost: 0,
      totalPenalties: 0,
      bonusEarned: 0,
      netProfit: 0,
      consecutiveNegativeDays: 0,
      maxNegativeDaysAllowed: 7,
      isBankrupt: false,
      history: [],
    };

    this.reset();
  }

  private createSquadMembers(): Record<string, SquadMember> {
    return {
      // 3 Analistas de Negócios (EXCLUSIVOS para Análise & Discovery)
      analyst1: {
        id: 'analyst1',
        name: 'Sofia',
        role: 'analyst',
        roleLabel: 'Lead Discovery',
        allowedStage: 'analysis',
        avatar: '🔍',
        dailyCost: 250,
        currentDice: 4,
        isAbsent: false,
        assignedCardId: null,
      },
      analyst2: {
        id: 'analyst2',
        name: 'Carlos',
        role: 'analyst',
        roleLabel: 'Product Owner',
        allowedStage: 'analysis',
        avatar: '📋',
        dailyCost: 250,
        currentDice: 3,
        isAbsent: false,
        assignedCardId: null,
      },
      analyst3: {
        id: 'analyst3',
        name: 'Mariana',
        role: 'analyst',
        roleLabel: 'Business Analyst',
        allowedStage: 'analysis',
        avatar: '📊',
        dailyCost: 250,
        currentDice: 5,
        isAbsent: false,
        assignedCardId: null,
      },

      // 3 Desenvolvedores (EXCLUSIVOS para Desenvolvimento)
      dev1: {
        id: 'dev1',
        name: 'Lucas',
        role: 'developer',
        roleLabel: 'Frontend Engineer',
        allowedStage: 'development',
        avatar: '💻',
        dailyCost: 350,
        currentDice: 5,
        isAbsent: false,
        assignedCardId: null,
      },
      dev2: {
        id: 'dev2',
        name: 'Rafael',
        role: 'developer',
        roleLabel: 'Backend Engineer',
        allowedStage: 'development',
        avatar: '⚙️',
        dailyCost: 350,
        currentDice: 4,
        isAbsent: false,
        assignedCardId: null,
      },
      dev3: {
        id: 'dev3',
        name: 'Thiago',
        role: 'developer',
        roleLabel: 'Fullstack & DevOps',
        allowedStage: 'development',
        avatar: '🚀',
        dailyCost: 350,
        currentDice: 4,
        isAbsent: false,
        assignedCardId: null,
      },

      // 3 Testadores / QA (EXCLUSIVOS para Testes & QA)
      qa1: {
        id: 'qa1',
        name: 'Beatriz',
        role: 'qa',
        roleLabel: 'QA Specialist',
        allowedStage: 'testing',
        avatar: '🧪',
        dailyCost: 250,
        currentDice: 4,
        isAbsent: false,
        assignedCardId: null,
      },
      qa2: {
        id: 'qa2',
        name: 'Gabriela',
        role: 'qa',
        roleLabel: 'Automation QA',
        allowedStage: 'testing',
        avatar: '🛡️',
        dailyCost: 250,
        currentDice: 3,
        isAbsent: false,
        assignedCardId: null,
      },
      qa3: {
        id: 'qa3',
        name: 'Rodrigo',
        role: 'qa',
        roleLabel: 'Performance QA',
        allowedStage: 'testing',
        avatar: '⚡',
        dailyCost: 250,
        currentDice: 5,
        isAbsent: false,
        assignedCardId: null,
      },
    };
  }

  public reset(): void {
    this.day = 1;
    this.lastEvent = null;
    this.isGameOver = false;
    this.gameOverReason = null;
    this.finalScore = null;

    this.wipLimits = {
      backlog: 999,
      ready: 3,
      analysis: 2,
      development: 3,
      testing: 2,
      deployed: 999,
    };

    this.agents = this.createSquadMembers();

    this.financial = {
      initialCash: 1000000,
      currentCash: 1000000,
      totalRevenue: 0,
      totalCost: 0,
      totalPenalties: 0,
      bonusEarned: 0,
      netProfit: 0,
      consecutiveNegativeDays: 0,
      maxNegativeDaysAllowed: 7,
      isBankrupt: false,
      history: [],
    };

    this.lastDemandGeneratedDay = 1;
    this.cfdHistory = [];
    this.dailyDelivered = [];
    this.eventsHistory = [];
    this.cards = this.getInitialCards();

    this.recordCFDSnapshot();
    this.recordFinancialSnapshot();
  }

  private getInitialCards(): Card[] {
    return [
      {
        id: 'crd-101',
        code: 'CRD-101',
        title: 'Módulo de Pagamento Pix',
        description: 'Implementação de QR Code dinâmico e webhook síncrono do Bacen.',
        classOfService: 'fixed-date',
        demandType: 'story',
        column: 'development',
        createdDay: 1,
        startedDay: 1,
        completedDay: null,
        deadlineDay: 5,
        baseValue: 2800,
        currentValue: 2800,
        penaltyPerDay: 500,
        accumulatedPenalty: 0,
        effortAnalysis: 3,
        doneAnalysis: 3,
        effortDev: 6,
        doneDev: 2,
        effortTest: 3,
        doneTest: 0,
        totalEffort: 12,
        isBlocked: false,
        assignedAgents: ['dev1'],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
      },
      {
        id: 'crd-102',
        code: 'CRD-102',
        title: 'Autenticação 2FA (TOTP)',
        description: 'Segurança de acesso via aplicativo autenticador do usuário.',
        classOfService: 'standard',
        demandType: 'story',
        column: 'analysis',
        createdDay: 1,
        startedDay: 1,
        completedDay: null,
        deadlineDay: 7,
        baseValue: 1900,
        currentValue: 1900,
        penaltyPerDay: 250,
        accumulatedPenalty: 0,
        effortAnalysis: 4,
        doneAnalysis: 1,
        effortDev: 4,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 10,
        isBlocked: false,
        assignedAgents: ['analyst1'],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
      },
      {
        id: 'crd-103',
        code: 'CRD-103',
        title: 'Refatoração da Camada de Cache',
        description: 'Migração de cache local para Redis Cluster de alta disponibilidade.',
        classOfService: 'tech-debt',
        demandType: 'story',
        column: 'ready',
        createdDay: 1,
        startedDay: 1,
        completedDay: null,
        deadlineDay: 10,
        baseValue: 900,
        currentValue: 900,
        penaltyPerDay: 50,
        accumulatedPenalty: 0,
        effortAnalysis: 2,
        doneAnalysis: 0,
        effortDev: 5,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 9,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
      },
      {
        id: 'crd-104',
        code: 'CRD-104',
        title: 'Dashboard Operacional em Tempo Real',
        description: 'Métricas gerenciais com WebSockets para diretoria de operações.',
        classOfService: 'standard',
        demandType: 'story',
        column: 'ready',
        createdDay: 1,
        startedDay: 1,
        completedDay: null,
        deadlineDay: 8,
        baseValue: 2400,
        currentValue: 2400,
        penaltyPerDay: 300,
        accumulatedPenalty: 0,
        effortAnalysis: 3,
        doneAnalysis: 0,
        effortDev: 6,
        doneDev: 0,
        effortTest: 3,
        doneTest: 0,
        totalEffort: 12,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
      },
      {
        id: 'crd-105',
        code: 'CRD-105',
        title: 'Documentação: Manual Regulatório & SPED Fiscal',
        description: 'Elaboração documental obrigatória. Não gera faturamento (Lucro R$ 0); atrasos aumentam os custos de conformidade.',
        classOfService: 'standard',
        demandType: 'docs',
        column: 'backlog',
        createdDay: 1,
        startedDay: null,
        completedDay: null,
        deadlineDay: 10,
        baseValue: 0,
        currentValue: 0,
        penaltyPerDay: 0,
        accumulatedPenalty: 0,
        effortAnalysis: 3,
        doneAnalysis: 0,
        effortDev: 3,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 8,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
        accumulatedDocCost: 400,
        docCostPerDay: 180,
      },
      {
        id: 'crd-106',
        code: 'CRD-106',
        title: 'Adequação LGPD - Opt-out',
        description: 'Painel de consentimento e anonimização de dados do titular.',
        classOfService: 'fixed-date',
        demandType: 'story',
        column: 'backlog',
        createdDay: 1,
        startedDay: null,
        completedDay: null,
        deadlineDay: 9,
        baseValue: 2700,
        currentValue: 2700,
        penaltyPerDay: 600,
        accumulatedPenalty: 0,
        effortAnalysis: 2,
        doneAnalysis: 0,
        effortDev: 5,
        doneDev: 0,
        effortTest: 3,
        doneTest: 0,
        totalEffort: 10,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
      },
      {
        id: 'crd-107',
        code: 'CRD-107',
        title: 'Apoio ao Suporte: Investigação de Chamado VIP',
        description: 'Suporte técnico a cliente corporativo com instabilidade no extrato financeiro.',
        classOfService: 'standard',
        demandType: 'support',
        column: 'backlog',
        createdDay: 1,
        startedDay: null,
        completedDay: null,
        deadlineDay: 8,
        baseValue: 1500,
        currentValue: 1500,
        penaltyPerDay: 200,
        accumulatedPenalty: 0,
        effortAnalysis: 2,
        doneAnalysis: 0,
        effortDev: 3,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 7,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
      },
      {
        id: 'bug-108',
        code: 'BUG-108',
        title: 'Bug: Falha na Conciliação de Boletos',
        description: 'Retorno bancário não identificando baixas de títulos pagos após as 18h.',
        classOfService: 'expedite',
        demandType: 'bug',
        column: 'backlog',
        createdDay: 1,
        startedDay: null,
        completedDay: null,
        deadlineDay: 4,
        baseValue: 1600,
        currentValue: 1600,
        penaltyPerDay: 350,
        accumulatedPenalty: 0,
        effortAnalysis: 1,
        doneAnalysis: 0,
        effortDev: 3,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 6,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
      }
    ];
  }

  public rollDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * STRICT ROLE ALLOCATION ENFORCEMENT:
   * - Analysts CAN ONLY work on cards in 'analysis'
   * - Developers CAN ONLY work on cards in 'development'
   * - QAs CAN ONLY work on cards in 'testing'
   */
  public toggleAgentAssignment(agentId: string, cardId: string): { success: boolean; message?: string } {
    const card = this.cards.find(c => c.id === cardId);
    const agent = this.agents[agentId];
    if (!card || !agent) return { success: false, message: 'Cartão ou membro não encontrado.' };

    if (!card.assignedAgents) card.assignedAgents = [];

    const isAlreadyAssigned = card.assignedAgents.includes(agentId);

    if (isAlreadyAssigned) {
      // Unassign
      card.assignedAgents = card.assignedAgents.filter(id => id !== agentId);
      agent.assignedCardId = null;
      return { success: true };
    }

    // Role check: agent can ONLY be assigned if the card is in their allowed stage
    if (card.column !== agent.allowedStage) {
      const stageNames: Record<string, string> = {
        analysis: 'Análise & Discovery',
        development: 'Desenvolvimento',
        testing: 'Testes & QA',
      };
      const allowedName = stageNames[agent.allowedStage] || agent.allowedStage;
      return {
        success: false,
        message: `Restrição de Função: ${agent.name} (${agent.roleLabel}) só pode atuar na etapa "${allowedName}"!`,
      };
    }

    // Remove agent from any previous card
    this.cards.forEach(c => {
      if (c.assignedAgents && c.assignedAgents.includes(agentId)) {
        c.assignedAgents = c.assignedAgents.filter(id => id !== agentId);
      }
    });

    // Assign to this card
    card.assignedAgents.push(agentId);
    agent.assignedCardId = cardId;
    return { success: true };
  }

  public canMoveTo(column: string): boolean {
    if (column === 'backlog' || column === 'deployed') return true;
    const currentCount = this.cards.filter(c => c.column === column).length;
    const limit = (this.wipLimits as any)[column] || 999;
    return currentCount < limit;
  }

  public moveCard(cardId: string, targetColumn: any): { success: boolean; message?: string; card?: Card } {
    const card = this.cards.find(c => c.id === cardId);
    if (!card) return { success: false, message: 'Cartão não encontrado.' };

    if (card.column === targetColumn) return { success: true };

    const isExpedite = card.classOfService === 'expedite';
    if (!this.canMoveTo(targetColumn) && !isExpedite) {
      const limit = (this.wipLimits as any)[targetColumn] || 999;
      return {
        success: false,
        message: `Limite de WIP da coluna "${targetColumn.toUpperCase()}" atingido! Respeite o fluxo (Máx: ${limit}).`,
      };
    }

    const order = ['backlog', 'ready', 'analysis', 'development', 'testing', 'deployed'];
    const fromIdx = order.indexOf(card.column);
    const toIdx = order.indexOf(targetColumn);

    if (toIdx > fromIdx) {
      if (card.column === 'analysis' && card.doneAnalysis < card.effortAnalysis) {
        return { success: false, message: `Análise incompleta (${card.doneAnalysis}/${card.effortAnalysis} pts). Realize o discovery antes!` };
      }
      if (card.column === 'development' && card.doneDev < card.effortDev) {
        return { success: false, message: `Desenvolvimento incompleto (${card.doneDev}/${card.effortDev} pts). Código ainda em construção!` };
      }
      if (card.column === 'testing' && card.doneTest < card.effortTest) {
        return { success: false, message: `Testes incompletos (${card.doneTest}/${card.effortTest} pts). Qualidade ainda não homologada!` };
      }
      if (card.isBlocked) {
        return { success: false, message: `Cartão está BLOQUEADO por impedimento externo. Desbloqueie-o primeiro!` };
      }
    }

    // Role sanitation: when moving to a new column, free up agents who cannot work in the new column
    if (card.assignedAgents && card.assignedAgents.length > 0) {
      card.assignedAgents = card.assignedAgents.filter(agentId => {
        const agent = this.agents[agentId];
        if (agent && agent.allowedStage !== targetColumn) {
          agent.assignedCardId = null;
          return false;
        }
        return true;
      });
    }

    card.column = targetColumn;

    if (targetColumn === 'ready' && !card.startedDay) {
      card.startedDay = this.day;
    }

    if (targetColumn === 'deployed' && !card.completedDay) {
      card.completedDay = this.day;
      let earned = Math.max(0, card.currentValue);

      if (card.demandType === 'docs') {
        earned = 0; // Documentação gera apenas custo sem lucro
        const docCost = card.accumulatedDocCost || 400;
        this.financial.totalCost += docCost;
      } else {
        this.financial.totalRevenue += earned;
      }

      this.financial.netProfit = this.financial.totalRevenue - this.financial.totalCost - this.financial.totalPenalties + (this.financial.bonusEarned || 0);
      this.financial.currentCash = this.financial.initialCash + this.financial.netProfit;
      if (this.financial.currentCash >= 0) {
        this.financial.consecutiveNegativeDays = 0;
        this.financial.isBankrupt = false;
      }

      // Free all assigned agents
      if (card.assignedAgents) {
        card.assignedAgents.forEach(agentId => {
          if (this.agents[agentId]) this.agents[agentId].assignedCardId = null;
        });
        card.assignedAgents = [];
      }

      const existingToday = this.dailyDelivered.find(d => d.day === this.day);
      if (existingToday) {
        existingToday.count += 1;
        existingToday.value += earned;
      } else {
        this.dailyDelivered.push({ day: this.day, count: 1, value: earned });
      }

      soundEngine.playTaskComplete();
    } else {
      soundEngine.playCardDrop();
    }

    return { success: true, card };
  }

  public unblockCard(cardId: string): boolean {
    const card = this.cards.find(c => c.id === cardId);
    if (card) {
      card.isBlocked = false;
      return true;
    }
    return false;
  }

  public addCard(cardData: any): Card {
    const rawVal = parseInt(cardData.baseValue, 10);
    let baseVal = isNaN(rawVal) ? 1500 : rawVal;

    // Regra: Demanda custando mais de 35k é considerada EPIC
    const isEpic = baseVal > 35000 || cardData.demandType === 'epic';
    let demandType: DemandType = cardData.demandType || (isEpic ? 'epic' : 'story');
    if (baseVal > 35000) {
      demandType = 'epic';
    }

    let isHigh = baseVal >= 3000;
    if (isEpic) isHigh = true;

    let effAnalysis = parseInt(cardData.effortAnalysis, 10) || 2;
    let effDev = parseInt(cardData.effortDev, 10) || 4;
    let effTest = parseInt(cardData.effortTest, 10) || 2;
    let deadlineDays = parseInt(cardData.deadlineDays, 10) || 7;

    let accumulatedDocCost = 0;
    let docCostPerDay = 0;

    let epicTotalStories = 0;
    let epicTotalBugs = 0;

    if (demandType === 'docs') {
      // Documentação não gera lucro (apenas custo)
      baseVal = 0;
      accumulatedDocCost = 400;
      docCostPerDay = 180;
    } else if (isEpic) {
      // Épico: O total de desenvolvedores calculados permanece rigorosamente inalterado (3 devs)
      effAnalysis = Math.max(effAnalysis, 4);
      effDev = Math.max(effDev, 8);
      effTest = Math.max(effTest, 4);
      deadlineDays = Math.max(deadlineDays, 14);

      // Quanto maior o valor do epic, maior o número de bugs e stories geradas no backlog
      epicTotalStories = Math.max(3, Math.floor(baseVal / 10000));
      epicTotalBugs = Math.max(1, Math.floor(baseVal / 18000));
    }

    const codePrefix = isEpic ? 'EPIC-' : 'CRD-';
    const newCard: Card = {
      id: (isEpic ? 'epic-' : 'crd-') + (Date.now() % 1000000),
      code: codePrefix + (100 + this.cards.length + 1),
      title: cardData.title || (isEpic ? 'Novo Épico Estratégico' : 'Nova Demanda'),
      description: cardData.description || (isEpic ? 'Demanda de grande porte que decompõe em histórias e bugs relacionados.' : 'Descrição da funcionalidade.'),
      classOfService: cardData.classOfService || (isEpic ? 'fixed-date' : 'standard'),
      demandType,
      column: 'backlog',
      createdDay: this.day,
      startedDay: null,
      completedDay: null,
      deadlineDay: this.day + deadlineDays,
      baseValue: demandType === 'docs' ? 0 : baseVal,
      currentValue: demandType === 'docs' ? 0 : baseVal,
      penaltyPerDay: demandType === 'docs' ? 0 : (parseInt(cardData.penaltyPerDay, 10) || Math.round(baseVal * 0.15)),
      accumulatedPenalty: 0,
      effortAnalysis: effAnalysis,
      doneAnalysis: 0,
      effortDev: effDev,
      doneDev: 0,
      effortTest: effTest,
      doneTest: 0,
      totalEffort: effAnalysis + effDev + effTest,
      isBlocked: false,
      assignedAgents: [],
      isManual: true,
      isHighValue: isHigh,
      bugRejectionCount: 0,
      isEpic,
      accumulatedDocCost,
      docCostPerDay,
      epicTotalStories,
      epicTotalBugs,
      epicSpawnedStories: 0,
      epicSpawnedBugs: 0,
    };

    this.cards.push(newCard);

    // Se for Épico, gera imediatamente o primeiro lote de stories e bug vinculados no backlog
    if (isEpic) {
      this.spawnEpicChildDemand(newCard, 'story');
      this.spawnEpicChildDemand(newCard, 'story');
      if (epicTotalBugs > 0) {
        this.spawnEpicChildDemand(newCard, 'bug');
      }

      const epicNotice: EventLog = {
        day: this.day,
        title: `💎 NOVO ÉPICO CRIADO: [${newCard.code}]`,
        badge: 'Épico Estratégico',
        type: 'positive',
        description: `Demanda de grande porte "${newCard.title}" (R$ ${baseVal.toLocaleString('pt-BR')}) iniciada no Backlog!`,
        impactText: `Por ser um Épico, foram planejadas ${epicTotalStories} Stories e ${epicTotalBugs} Bugs relacionados que entrarão no Backlog ao longo do fluxo. O squad mantém rigorosamente os 3 Desenvolvedores calculados!`,
        customResult: `As primeiras histórias e bugs vinculados ao [${newCard.code}] já surgiram no Backlog!`,
      };
      this.eventsHistory.unshift(epicNotice);
      this.lastEvent = epicNotice;
    }

    return newCard;
  }

  public spawnEpicChildDemand(epic: Card, type: 'story' | 'bug'): Card | null {
    if (type === 'story') {
      epic.epicSpawnedStories = (epic.epicSpawnedStories || 0) + 1;
      const storyIdx = epic.epicSpawnedStories;
      const storyTitles = [
        `Arquitetura & Especificação do Módulo`,
        `Desenvolvimento do Core & APIs`,
        `Integração de Mensageria & Eventos`,
        `Interface de Usuário & Experiência`,
        `Segurança, Auditoria & Permissões`,
        `Cache Distribuído & Escalabilidade`,
        `Relatórios & Painel Administrativo`,
        `Mecanismos de Sincronização Síncrona`,
        `Webhooks & Integrações Externas`,
        `Homologação Final & Documentação Técnica`,
      ];
      const titleSuffix = storyTitles[(storyIdx - 1) % storyTitles.length];
      const subValue = Math.round(epic.baseValue / Math.max(1, (epic.epicTotalStories || 4)));

      const storyCard: Card = {
        id: 'crd-' + (Date.now() % 1000000) + '-' + Math.floor(Math.random() * 1000),
        code: 'CRD-' + (100 + this.cards.length + 1),
        title: `[Story • ${epic.code}] ${titleSuffix}`,
        description: `História #${storyIdx} relacionada ao Épico [${epic.code}] "${epic.title}". Entrega funcional imprescindível para o valor do projeto.`,
        classOfService: 'standard',
        demandType: 'story',
        column: 'backlog',
        createdDay: this.day,
        startedDay: null,
        completedDay: null,
        deadlineDay: this.day + 7 + storyIdx,
        baseValue: subValue,
        currentValue: subValue,
        penaltyPerDay: Math.round(subValue * 0.15),
        accumulatedPenalty: 0,
        effortAnalysis: 2,
        doneAnalysis: 0,
        effortDev: 4,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 8,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
        parentEpicId: epic.id,
        parentEpicCode: epic.code,
        parentEpicTitle: epic.title,
      };

      this.cards.push(storyCard);
      return storyCard;
    } else {
      epic.epicSpawnedBugs = (epic.epicSpawnedBugs || 0) + 1;
      const bugIdx = epic.epicSpawnedBugs;
      const bugTitles = [
        `Inconsistência de Schema no Epic`,
        `Timeout de Integração com Serviços`,
        `Falha de Validação de Dados Críticos`,
        `Conflito de Concorrência em Transações`,
        `Erro de Serialização JSON no Gateway`,
      ];
      const bugTitle = bugTitles[(bugIdx - 1) % bugTitles.length];
      const bugVal = 1600;

      const bugCard: Card = {
        id: 'bug-' + (Date.now() % 1000000) + '-' + Math.floor(Math.random() * 1000),
        code: 'BUG-' + (100 + this.cards.length + 1),
        title: `[Bug • ${epic.code}] ${bugTitle}`,
        description: `Defeito decorrente da alta complexidade do Épico [${epic.code}] "${epic.title}". Requer correção pelos desenvolvedores do squad.`,
        classOfService: 'expedite',
        demandType: 'bug',
        column: 'backlog',
        createdDay: this.day,
        startedDay: null,
        completedDay: null,
        deadlineDay: this.day + 3,
        baseValue: bugVal,
        currentValue: bugVal,
        penaltyPerDay: 400,
        accumulatedPenalty: 0,
        effortAnalysis: 1,
        doneAnalysis: 0,
        effortDev: 3,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 6,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
        parentEpicId: epic.id,
        parentEpicCode: epic.code,
        parentEpicTitle: epic.title,
      };

      this.cards.push(bugCard);
      return bugCard;
    }
  }

  public spawnRandomBacklogDemand(): Card {
    const types: ('bug' | 'support' | 'docs' | 'story')[] = ['bug', 'support', 'docs', 'story'];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const cardNum = 100 + this.cards.length + 1;
    let card: Card;

    if (chosenType === 'bug') {
      const bugOptions = [
        { title: 'Falha na Validação de Pagamento Pix', desc: 'Usuários relatam intermitência no webhook de confirmação do Bacen.' },
        { title: 'Crash no Checkout em Dispositivos Android', desc: 'Exceção não tratada ao tentar calcular frete para múltiplos itens.' },
        { title: 'Inconsistência no Cálculo de Alíquotas de ICMS', desc: 'Divergência de centavos nas notas fiscais emitidas para o Sudeste.' },
        { title: 'Memory Leak no Processamento de Fila SQS', desc: 'Consumo elevado de RAM nos nós de background durante o pico.' },
      ];
      const opt = bugOptions[Math.floor(Math.random() * bugOptions.length)];
      const val = 1500 + Math.floor(Math.random() * 8) * 100;
      card = {
        id: 'bug-' + Date.now().toString(36),
        code: 'BUG-' + cardNum,
        title: `🐛 ${opt.title}`,
        description: opt.desc,
        classOfService: Math.random() < 0.5 ? 'expedite' : 'standard',
        demandType: 'bug',
        column: 'backlog',
        createdDay: this.day,
        startedDay: null,
        completedDay: null,
        deadlineDay: this.day + 4,
        baseValue: val,
        currentValue: val,
        penaltyPerDay: 300,
        accumulatedPenalty: 0,
        effortAnalysis: 1,
        doneAnalysis: 0,
        effortDev: 3,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 6,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
      };
    } else if (chosenType === 'support') {
      const supportOptions = [
        { title: 'Apoio ao Suporte: Investigação de Acesso VIP', desc: 'Cliente corporativo com bloqueio intermitente de permissões no portal.' },
        { title: 'Apoio ao Cliente: Conciliação de Extratos Enterprise', desc: 'Geração emergencial de script contábil para encerramento de mês.' },
        { title: 'Apoio ao Atendimento: Diagnóstico de Latência no App', desc: 'Equipe de suporte solicita apoio técnico para mapear lentidão em chamados.' },
        { title: 'Apoio N3: Recuperação de Lote de Transações Pendentes', desc: 'Sincronização manual com parceiro para desbloquear pedidos de clientes.' },
      ];
      const opt = supportOptions[Math.floor(Math.random() * supportOptions.length)];
      const val = 1400 + Math.floor(Math.random() * 7) * 100;
      card = {
        id: 'sup-' + Date.now().toString(36),
        code: 'SUP-' + cardNum,
        title: `🎧 ${opt.title}`,
        description: opt.desc,
        classOfService: 'standard',
        demandType: 'support',
        column: 'backlog',
        createdDay: this.day,
        startedDay: null,
        completedDay: null,
        deadlineDay: this.day + 5,
        baseValue: val,
        currentValue: val,
        penaltyPerDay: 200,
        accumulatedPenalty: 0,
        effortAnalysis: 2,
        doneAnalysis: 0,
        effortDev: 3,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 7,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
      };
    } else if (chosenType === 'docs') {
      const docOptions = [
        { title: 'Documentação: Manual de Auditoria & Conformidade Fiscal', desc: 'Atualização mandatória para fiscalização regulatória. Demanda gera custo sem receita; quanto mais atrasar, maiores as multas.' },
        { title: 'Documentação: Dicionário de Dados e Políticas LGPD', desc: 'Mapeamento formal de ciclo de vida de dados sensíveis para o time jurídico. Custo operacional contínuo até conclusão.' },
        { title: 'Documentação: Especificação de Arquitetura & APIs Públicas', desc: 'Contrato de integração para parceiros do ecossistema. Sem retorno financeiro direto; atrasos elevam o custo de consultoria.' },
        { title: 'Documentação: Guia de Procedimentos Operacionais e SLA', desc: 'Formalização de normas de compliance para clientes corporativos. Gera custo de elaboração sem faturamento.' },
      ];
      const opt = docOptions[Math.floor(Math.random() * docOptions.length)];
      card = {
        id: 'doc-' + Date.now().toString(36),
        code: 'DOC-' + cardNum,
        title: `📄 ${opt.title}`,
        description: opt.desc,
        classOfService: 'standard',
        demandType: 'docs',
        column: 'backlog',
        createdDay: this.day,
        startedDay: null,
        completedDay: null,
        deadlineDay: this.day + 6,
        baseValue: 0,
        currentValue: 0,
        penaltyPerDay: 0,
        accumulatedPenalty: 0,
        effortAnalysis: 3,
        doneAnalysis: 0,
        effortDev: 2,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 7,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
        accumulatedDocCost: 400,
        docCostPerDay: 180,
      };
    } else {
      // story
      const storyOptions = [
        { title: 'Story: Novo Filtro Dinâmico no Catálogo de Produtos', desc: 'Melhoria de usabilidade para acelerar a busca de produtos pelos clientes.' },
        { title: 'Story: Notificações em Tempo Real com WebSockets', desc: 'Envio imediato de alertas de status de transação para os usuários.' },
        { title: 'Story: Otimização do Fluxo de Pagamento em 1-Clique', desc: 'Redução de fricção no carrinho de compras aumentando a taxa de conversão.' },
        { title: 'Story: Dashboard Personalizado para Administradores', desc: 'Visualização de métricas customizadas por departamento no portal web.' },
      ];
      const opt = storyOptions[Math.floor(Math.random() * storyOptions.length)];
      const val = 2000 + Math.floor(Math.random() * 8) * 150;
      card = {
        id: 'crd-' + Date.now().toString(36),
        code: 'CRD-' + cardNum,
        title: `💡 ${opt.title}`,
        description: opt.desc,
        classOfService: 'standard',
        demandType: 'story',
        column: 'backlog',
        createdDay: this.day,
        startedDay: null,
        completedDay: null,
        deadlineDay: this.day + 7,
        baseValue: val,
        currentValue: val,
        penaltyPerDay: Math.round(val * 0.15),
        accumulatedPenalty: 0,
        effortAnalysis: 2,
        doneAnalysis: 0,
        effortDev: 4,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 8,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: val >= 3000,
        bugRejectionCount: 0,
      };
    }

    this.cards.push(card);
    return card;
  }

  public spawnRegressionBug(sourceCard: Card): void {
    const bugCode = 'REGRESSÃO-' + Math.floor(100 + Math.random() * 900);
    const regBug: Card = {
      id: 'bug-' + Date.now().toString(36),
      code: bugCode,
      title: `💥 Regressão Crítica: Falha gerada por [${sourceCard.code}]`,
      description: `A alteração de alta complexidade em "${sourceCard.title}" impactou código compartilhado e quebrou funcionalidades em produção!`,
      classOfService: 'expedite',
      column: 'development',
      createdDay: this.day,
      startedDay: this.day,
      completedDay: null,
      deadlineDay: this.day + 2,
      baseValue: 1800,
      currentValue: 1800,
      penaltyPerDay: 800,
      accumulatedPenalty: 0,
      effortAnalysis: 1,
      doneAnalysis: 1,
      effortDev: 3,
      doneDev: 0,
      effortTest: 2,
      doneTest: 0,
      totalEffort: 6,
      isBlocked: false,
      assignedAgents: [],
      isManual: false,
      isHighValue: false,
      bugRejectionCount: 0,
    };

    this.cards.unshift(regBug);

    const eventNotice: EventLog = {
      day: this.day,
      title: `💥 EFEITO COLATERAL: Regressão no Sistema`,
      badge: 'Regressão Crítica',
      type: 'critical',
      description: `A demanda de alto valor [${sourceCard.code}] (${sourceCard.title}) causou um efeito colateral inesperado na arquitetura!`,
      impactText: `Um novo chamado urgente [${bugCode}] entrou em Desenvolvimento e precisa de atenção imediata!`,
      customResult: `Priorize a equipe para conter a quebra no produto!`,
    };
    this.eventsHistory.unshift(eventNotice);
    this.lastEvent = eventNotice;

    soundEngine.playWarning();
  }

  /**
   * ADVANCE TO NEXT DAY
   */
  public nextDay(): {
    day: number;
    event: EventLog | null;
    gameOver?: boolean;
    gameOverReason?: GameOverReason;
    score?: GameScore | null;
  } {
    if (this.isGameOver) {
      return {
        day: this.day,
        event: this.lastEvent,
        gameOver: true,
        gameOverReason: this.gameOverReason,
        score: this.finalScore,
      };
    }

    this.day += 1;

    // Check if reached Day 31 (end of 30-day simulation cycle)
    if (this.day >= 31) {
      this.isGameOver = true;
      this.gameOverReason = 'completed';
      this.finalScore = this.calculateScore();
      this.recordCFDSnapshot();
      this.recordFinancialSnapshot();

      const finalEvent: EventLog = {
        day: 31,
        title: '🏁 FIM DO CICLO (DIA 31): Simulação Concluída!',
        badge: 'Ciclo Encerrado',
        type: 'positive',
        description: 'Parabéns! O squad completou o ciclo mensal de 30 dias de operação ágil.',
        impactText: 'Confira seu placar geral (Score) e o desempenho financeiro e operacional.',
        customResult: `Score Final: ${this.finalScore.totalScore} pts (Rank ${this.finalScore.rank})`,
      };
      this.eventsHistory.unshift(finalEvent);
      this.lastEvent = finalEvent;

      return {
        day: 31,
        event: finalEvent,
        gameOver: true,
        gameOverReason: 'completed',
        score: this.finalScore,
      };
    }

    soundEngine.playDiceRoll();

    // 1. Roll dice & reset temporary states
    Object.values(this.agents).forEach(agent => {
      agent.isAbsent = false;
      agent.currentDice = this.rollDice();
    });

    // 2. Random Event Trigger
    this.lastEvent = null;
    if (this.day >= 2 && Math.random() < 0.60 && SQUAD_EVENTS.length > 0) {
      const eventIndex = Math.floor(Math.random() * SQUAD_EVENTS.length);
      const chosenEvent = SQUAD_EVENTS[eventIndex];
      const customMsg = chosenEvent.apply(this);

      this.lastEvent = {
        day: this.day,
        title: chosenEvent.title,
        badge: chosenEvent.badge,
        type: chosenEvent.type,
        description: chosenEvent.description,
        impactText: chosenEvent.impactText,
        customResult: customMsg || '',
      };
      this.eventsHistory.unshift(this.lastEvent);

      if (chosenEvent.type === 'critical' || chosenEvent.type === 'negative') {
        soundEngine.playWarning();
      }
    }

    // 2.1 Atualização de Custo das Demandas de Documentação (apenas geram custo sem lucro, aumentando conforme atrasam)
    this.cards.forEach(card => {
      if (card.demandType === 'docs' && card.column !== 'deployed') {
        const isDelayed = this.day > card.deadlineDay;
        const dailyRate = isDelayed ? 380 : 180;
        card.accumulatedDocCost = (card.accumulatedDocCost || 400) + dailyRate;
      }
    });

    // 2.2 Novas Demandas Automáticas no Backlog (no mínimo 1 a cada 2 dias)
    const daysSinceLastDemand = this.day - this.lastDemandGeneratedDay;
    if (daysSinceLastDemand >= 2 || (this.day > 1 && Math.random() < 0.65)) {
      const newDemand = this.spawnRandomBacklogDemand();
      this.lastDemandGeneratedDay = this.day;

      const typeLabels: Record<string, string> = {
        bug: '🐛 Correção de Bug',
        support: '🎧 Apoio ao Suporte/Cliente',
        docs: '📄 Criação de Documentação',
        story: '💡 Story (Melhoria)',
      };
      const label = typeLabels[newDemand.demandType || 'story'] || 'Demanda';

      if (!this.lastEvent || this.lastEvent.type === 'positive') {
        const backlogNotice: EventLog = {
          day: this.day,
          title: `📥 Nova Demanda no Backlog: [${newDemand.code}]`,
          badge: label,
          type: 'neutral',
          description: `Uma nova demanda do tipo "${label}" chegou ao Backlog: "${newDemand.title}".`,
          impactText: newDemand.demandType === 'docs'
            ? 'Atenção: Documentação gera apenas custo sem lucro! Quanto mais demorar a entrega, maior o custo ao final.'
            : `Valor estimado: R$ ${newDemand.baseValue.toLocaleString('pt-BR')} (Prazo: D${newDemand.deadlineDay}).`,
          customResult: 'Gerencie o fluxo e respeite os limites de WIP do squad.',
        };
        this.eventsHistory.unshift(backlogNotice);
        if (!this.lastEvent) this.lastEvent = backlogNotice;
      }
    }

    // 2.3 Progressão de Demandas de Épicos (Stories e Bugs gerados automaticamente ao longo do fluxo)
    const activeEpics = this.cards.filter(c => c.isEpic && c.column !== 'deployed');
    activeEpics.forEach(epic => {
      const hasPendingStories = (epic.epicSpawnedStories || 0) < (epic.epicTotalStories || 0);
      const hasPendingBugs = (epic.epicSpawnedBugs || 0) < (epic.epicTotalBugs || 0);

      if (hasPendingStories && Math.random() < 0.70) {
        this.spawnEpicChildDemand(epic, 'story');
      }
      if (hasPendingBugs && Math.random() < 0.50) {
        this.spawnEpicChildDemand(epic, 'bug');
      }
    });

    // 3. STRICT SPECIALIST WORK EFFORT APPLICATION
    // STEP A: Apply effort from ASSIGNED agents
    Object.values(this.agents).forEach(agent => {
      if (agent.isAbsent || !agent.assignedCardId) return;

      const card = this.cards.find(c => c.id === agent.assignedCardId);
      if (!card || card.column !== agent.allowedStage || card.isBlocked) return;

      const points = agent.currentDice;

      if (agent.allowedStage === 'analysis') {
        card.doneAnalysis = Math.min(card.effortAnalysis, card.doneAnalysis + points);
      } else if (agent.allowedStage === 'development') {
        card.doneDev = Math.min(card.effortDev, card.doneDev + points);
      } else if (agent.allowedStage === 'testing') {
        card.doneTest = Math.min(card.effortTest, card.doneTest + points);
      }
    });

    // STEP B: Unassigned agents apply points to unassigned cards in their OWN stage
    let unassignedAnalysisPts = 0;
    let unassignedDevPts = 0;
    let unassignedTestPts = 0;

    Object.values(this.agents).forEach(agent => {
      if (agent.isAbsent || agent.assignedCardId) return;
      if (agent.role === 'analyst') unassignedAnalysisPts += agent.currentDice;
      else if (agent.role === 'developer') unassignedDevPts += agent.currentDice;
      else if (agent.role === 'qa') unassignedTestPts += agent.currentDice;
    });

    const priorityWeight: Record<string, number> = { 'expedite': 4, 'fixed-date': 3, 'standard': 2, 'tech-debt': 1 };
    const sortCards = (arr: Card[]) => [...arr].sort((a, b) => (priorityWeight[b.classOfService] || 0) - (priorityWeight[a.classOfService] || 0));

    // Distribute unassigned analysis points (Only Analysts)
    const unassignedAnalysisCards = sortCards(this.cards.filter(c => c.column === 'analysis' && !c.isBlocked && (!c.assignedAgents || c.assignedAgents.length === 0)));
    for (const card of unassignedAnalysisCards) {
      const needed = card.effortAnalysis - card.doneAnalysis;
      if (needed > 0 && unassignedAnalysisPts > 0) {
        const spent = Math.min(needed, unassignedAnalysisPts);
        card.doneAnalysis += spent;
        unassignedAnalysisPts -= spent;
      }
    }

    // Distribute unassigned dev points (Only Developers)
    const unassignedDevCards = sortCards(this.cards.filter(c => c.column === 'development' && !c.isBlocked && (!c.assignedAgents || c.assignedAgents.length === 0)));
    for (const card of unassignedDevCards) {
      const needed = card.effortDev - card.doneDev;
      if (needed > 0 && unassignedDevPts > 0) {
        const spent = Math.min(needed, unassignedDevPts);
        card.doneDev += spent;
        unassignedDevPts -= spent;
      }
    }

    // Distribute unassigned test points (Only QAs)
    const unassignedTestCards = sortCards(this.cards.filter(c => c.column === 'testing' && !c.isBlocked && (!c.assignedAgents || c.assignedAgents.length === 0)));
    for (const card of unassignedTestCards) {
      const needed = card.effortTest - card.doneTest;
      if (needed > 0 && unassignedTestPts > 0) {
        const spent = Math.min(needed, unassignedTestPts);
        card.doneTest += spent;
        unassignedTestPts -= spent;
      }
    }

    // 4. TESTING REPROVAL & REGRESSION CHECK
    this.cards.forEach(card => {
      if (card.column === 'testing' && card.doneTest >= card.effortTest) {
        if (card.isManual && card.isHighValue && card.bugRejectionCount === 0) {
          if (Math.random() < 0.70) {
            // QA REPROVAÇÃO: Retorna para desenvolvimento
            card.column = 'development';
            card.doneDev = Math.max(0, card.effortDev - 3);
            card.doneTest = 0;
            card.bugRejectionCount = 1;
            card.hasBug = true;

            // Free QA agents since it's going back to Dev
            if (card.assignedAgents) {
              card.assignedAgents = card.assignedAgents.filter(id => {
                const ag = this.agents[id];
                if (ag && ag.role === 'qa') {
                  ag.assignedCardId = null;
                  return false;
                }
                return true;
              });
            }

            const bugEvent: EventLog = {
              day: this.day,
              title: `🐛 DEFEITO REPROVADO EM QA: [${card.code}]`,
              badge: 'Qualidade QA',
              type: 'critical',
              description: `A equipe de QA identificou falhas graves na demanda de alto ganho "${card.title}"!`,
              impactText: `O cartão foi REPROVADO e retornou para Desenvolvimento para correção (+3 pts).`,
              customResult: `Alavanque desenvolvedores para corrigir antes do prazo!`,
            };
            this.eventsHistory.unshift(bugEvent);
            this.lastEvent = bugEvent;
            soundEngine.playWarning();

            if (Math.random() < 0.65) {
              this.spawnRegressionBug(card);
            }
          }
        }
      }
    });

    // 5. Daily Squad Salary Cost (9 members)
    const dailyCost = Object.values(this.agents).reduce((acc, a) => acc + (a.dailyCost || 0), 0);
    this.financial.totalCost += dailyCost;

    // 6. Check Deadlines & Penalties
    this.cards.forEach(card => {
      if (card.column !== 'backlog' && card.column !== 'deployed' && card.demandType !== 'docs') {
        if (this.day > card.deadlineDay) {
          const daysOverdue = this.day - card.deadlineDay;
          let penaltyToday = 0;

          if (card.classOfService === 'fixed-date') {
            if (daysOverdue >= 3) {
              penaltyToday = card.currentValue + 500;
              card.currentValue = 0;
            } else {
              penaltyToday = Math.round(card.baseValue * 0.35);
              card.currentValue = Math.max(0, card.currentValue - penaltyToday);
            }
          } else if (card.classOfService === 'expedite') {
            penaltyToday = card.penaltyPerDay || 600;
            card.currentValue = Math.max(0, card.currentValue - penaltyToday);
          } else if (card.classOfService === 'standard') {
            penaltyToday = Math.round(card.baseValue * 0.15);
            card.currentValue = Math.max(0, card.currentValue - penaltyToday);
          } else {
            penaltyToday = 50;
            card.currentValue = Math.max(0, card.currentValue - penaltyToday);
          }

          card.accumulatedPenalty += penaltyToday;
          this.financial.totalPenalties += penaltyToday;
        }
      }
    });

    this.financial.netProfit = this.financial.totalRevenue - this.financial.totalCost - this.financial.totalPenalties + (this.financial.bonusEarned || 0);
    this.financial.currentCash = this.financial.initialCash + this.financial.netProfit;

    // 7. Check 7-Day Negative Cash Bankruptcy Rule
    if (this.financial.currentCash < 0) {
      this.financial.consecutiveNegativeDays += 1;
      if (this.financial.consecutiveNegativeDays >= this.financial.maxNegativeDaysAllowed) {
        this.financial.isBankrupt = true;
        this.isGameOver = true;
        this.gameOverReason = 'bankruptcy';
        this.finalScore = this.calculateScore();

        const bankruptcyEvent: EventLog = {
          day: this.day,
          title: '🚨 FALÊNCIA POR INADIMPLÊNCIA: Operações Encerradas!',
          badge: 'Falência / Game Over',
          type: 'critical',
          description: `A empresa operou no vermelho por ${this.financial.consecutiveNegativeDays} dias consecutivos e não possui mais caixa para pagar os 9 colaboradores do squad.`,
          impactText: `Saldo final em caixa: -R$ ${Math.abs(this.financial.currentCash).toLocaleString('pt-BR')}. As atividades foram interrompidas.`,
          customResult: `Fim de Jogo! Pontuação Final: ${this.finalScore.totalScore} pts.`,
        };
        this.eventsHistory.unshift(bankruptcyEvent);
        this.lastEvent = bankruptcyEvent;
      }
    } else {
      this.financial.consecutiveNegativeDays = 0;
      this.financial.isBankrupt = false;
    }

    this.recordCFDSnapshot();
    this.recordFinancialSnapshot();

    return {
      day: this.day,
      event: this.lastEvent,
      gameOver: this.isGameOver,
      gameOverReason: this.gameOverReason,
      score: this.finalScore,
    };
  }

  public calculateScore(): GameScore {
    const delivered = this.cards.filter(c => c.column === 'deployed');
    const inProgress = this.cards.filter(c => c.column !== 'backlog' && c.column !== 'deployed');
    const onTime = delivered.filter(c => (c.completedDay || 0) <= c.deadlineDay);
    const delayed = delivered.filter(c => (c.completedDay || 0) > c.deadlineDay);
    const onTimeRate = delivered.length > 0 ? Math.round((onTime.length / delivered.length) * 100) : 0;

    const leadTimes = delivered.map(c => Math.max(1, (c.completedDay || 1) - (c.startedDay || 1)));
    const avgLead = leadTimes.length > 0 ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1) : '0.0';
    const effectiveDays = Math.max(1, Math.min(30, this.day));
    const throughput = (delivered.length / effectiveDays).toFixed(2);

    // Scoring algorithm:
    // Base: 1000 pts
    // + 500 pts per card delivered
    // + 300 pts bonus per on-time delivery
    // - 250 pts per delayed delivery
    // - penalidades financeiras acumuladas (proporcional)
    // + 1 pt a cada R$ 100 de lucro líquido (ou dedução se prejuízo)
    // + 1000 pts se caixa final positivo
    // - 3000 pts se falência por inadimplência
    let rawScore = 1000;
    rawScore += delivered.length * 500;
    rawScore += onTime.length * 300;
    rawScore -= delayed.length * 250;
    rawScore -= Math.min(2500, Math.round(this.financial.totalPenalties / 10));
    rawScore += Math.round(this.financial.netProfit / 100);

    if (this.financial.currentCash > 0) {
      rawScore += 1000;
    }

    if (this.gameOverReason === 'bankruptcy') {
      rawScore = Math.max(0, rawScore - 3000);
    }

    const totalScore = Math.max(0, Math.round(rawScore));

    let rank: 'S' | 'A' | 'B' | 'C' | 'D' = 'C';
    let rankTitle = '🥉 Sobrevivente do Fluxo';

    if (this.gameOverReason === 'bankruptcy') {
      rank = 'D';
      rankTitle = '🚨 Falência Operacional (Inadimplência)';
    } else if (totalScore >= 8000) {
      rank = 'S';
      rankTitle = '🏆 Diretor(a) Lendário(a) de Operações';
    } else if (totalScore >= 6000) {
      rank = 'A';
      rankTitle = '🥇 Líder Ágil Estratégico(a)';
    } else if (totalScore >= 4000) {
      rank = 'B';
      rankTitle = '🥈 Gerente de Squad Eficiente';
    } else if (totalScore >= 2000) {
      rank = 'C';
      rankTitle = '🥉 Gestor(a) Júnior em Formação';
    } else {
      rank = 'D';
      rankTitle = '⚠️ Operação sob Crise';
    }

    return {
      totalScore,
      rank,
      rankTitle,
      deliveredCount: delivered.length,
      onTimeCount: onTime.length,
      onTimeRate,
      delayedCount: delayed.length,
      avgLeadTime: avgLead,
      throughput,
      initialCash: this.financial.initialCash,
      finalCash: this.financial.currentCash,
      netProfit: this.financial.netProfit,
      totalRevenue: this.financial.totalRevenue,
      totalCost: this.financial.totalCost,
      totalPenalties: this.financial.totalPenalties,
      wipRemaining: inProgress.length,
      finishedDay: Math.min(31, this.day),
    };
  }

  public recordCFDSnapshot(): void {
    const counts: CFDPoint = {
      day: this.day,
      backlog: this.cards.filter(c => c.column === 'backlog').length,
      ready: this.cards.filter(c => c.column === 'ready').length,
      analysis: this.cards.filter(c => c.column === 'analysis').length,
      development: this.cards.filter(c => c.column === 'development').length,
      testing: this.cards.filter(c => c.column === 'testing').length,
      deployed: this.cards.filter(c => c.column === 'deployed').length,
    };
    this.cfdHistory.push(counts);
  }

  public recordFinancialSnapshot(): void {
    this.financial.history.push({
      day: this.day,
      revenue: this.financial.totalRevenue,
      cost: this.financial.totalCost,
      penalties: this.financial.totalPenalties,
      profit: this.financial.netProfit,
      cash: this.financial.currentCash,
    });
  }

  public getKPIs() {
    const delivered = this.cards.filter(c => c.column === 'deployed');
    const inProgress = this.cards.filter(c => c.column !== 'backlog' && c.column !== 'deployed');
    const blocked = this.cards.filter(c => c.isBlocked);
    const overdue = inProgress.filter(c => this.day > c.deadlineDay);

    const leadTimes = delivered.map(c => Math.max(1, (c.completedDay || 1) - (c.startedDay || 1)));
    const avgLeadTime = leadTimes.length > 0 ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1) : '0.0';
    const effectiveDays = Math.max(1, Math.min(30, this.day));
    const throughput = (delivered.length / effectiveDays).toFixed(2);

    return {
      day: this.day,
      deliveredCount: delivered.length,
      wipTotal: inProgress.length,
      blockedCount: blocked.length,
      overdueCount: overdue.length,
      avgLeadTime,
      throughput,
      revenue: this.financial.totalRevenue,
      cost: this.financial.totalCost,
      penalties: this.financial.totalPenalties,
      profit: this.financial.netProfit,
      cash: this.financial.currentCash,
      initialCash: this.financial.initialCash,
      consecutiveNegativeDays: this.financial.consecutiveNegativeDays,
      maxNegativeDaysAllowed: this.financial.maxNegativeDaysAllowed,
      isBankrupt: this.financial.isBankrupt,
      isGameOver: this.isGameOver,
      gameOverReason: this.gameOverReason,
    };
  }

  /**
   * Export Game State with Cryptographic Anti-Tamper Hash
   */
  public async exportGameState(): Promise<string> {
    const rawData = {
      day: this.day,
      wipLimits: this.wipLimits,
      cards: this.cards,
      financial: this.financial,
      cfdHistory: this.cfdHistory,
      dailyDelivered: this.dailyDelivered,
      eventsHistory: this.eventsHistory,
      agents: this.agents,
    };

    const signature = await generateAntiTamperHash(rawData);

    const exportPayload: GameExportData = {
      version: '1.3.0',
      exportedAt: new Date().toISOString(),
      security: {
        hashAlgorithm: 'SHA-256-HMAC',
        signature,
        integrityNotice: 'Assinado digitalmente contra adulteração de valores (Anti-Hack). Modificações invalidam a carga.',
      },
      gameData: rawData,
    };

    return JSON.stringify(exportPayload, null, 2);
  }

  /**
   * Import Game State and Verify Anti-Tamper Hash
   */
  public async importGameState(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);

      if (!parsed || !parsed.gameData || !parsed.security || !parsed.security.signature) {
        return {
          success: false,
          message: '❌ Arquivo inválido! O arquivo não possui a estrutura de assinatura de segurança requerida.',
        };
      }

      // Verify anti-tamper signature
      const isValid = await verifyAntiTamperHash(parsed.gameData, parsed.security.signature);
      if (!isValid) {
        soundEngine.playWarning();
        return {
          success: false,
          message: '🚨 VIOLAÇÃO DE INTEGRIDADE DETECTADA! A assinatura criptográfica (hash) não corresponde aos dados. O arquivo foi modificado manualmente ou adulterado para tentar burlar os valores do jogo!',
        };
      }

      // Restore verified state
      const gd = parsed.gameData;
      this.day = gd.day || 1;
      this.wipLimits = gd.wipLimits || this.wipLimits;
      this.cards = gd.cards || [];
      this.financial = gd.financial || this.financial;
      if (this.financial.initialCash === undefined) this.financial.initialCash = 1000000;
      if (this.financial.currentCash === undefined) {
        this.financial.currentCash = this.financial.initialCash + (this.financial.netProfit || 0);
      }
      if (this.financial.consecutiveNegativeDays === undefined) {
        this.financial.consecutiveNegativeDays = this.financial.currentCash < 0 ? 1 : 0;
      }
      if (this.financial.maxNegativeDaysAllowed === undefined) {
        this.financial.maxNegativeDaysAllowed = 7;
      }
      this.isGameOver = this.day >= 31 || this.financial.isBankrupt;
      this.gameOverReason = this.financial.isBankrupt ? 'bankruptcy' : (this.day >= 31 ? 'completed' : null);
      if (this.isGameOver) {
        this.finalScore = this.calculateScore();
      }
      this.cfdHistory = gd.cfdHistory || [];
      this.dailyDelivered = gd.dailyDelivered || [];
      this.eventsHistory = gd.eventsHistory || [];
      if (gd.agents) this.agents = gd.agents;

      return {
        success: true,
        message: '✅ Integridade confirmada! Assinatura criptográfica válida. Jogo restaurado com sucesso.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: '❌ Erro ao decodificar JSON: ' + (err?.message || 'Arquivo corrompido'),
      };
    }
  }
}

export const kanbanEngine = new KanbanGameEngine();

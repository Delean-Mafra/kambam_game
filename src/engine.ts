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
  GameExportData
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
      totalRevenue: 0,
      totalCost: 0,
      totalPenalties: 0,
      bonusEarned: 0,
      netProfit: 0,
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
      totalRevenue: 0,
      totalCost: 0,
      totalPenalties: 0,
      bonusEarned: 0,
      netProfit: 0,
      history: [],
    };

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
        title: 'Exportação Contábil SPED',
        description: 'Relatório fiscal em arquivo texto compatível com validador da Receita.',
        classOfService: 'standard',
        column: 'backlog',
        createdDay: 1,
        startedDay: null,
        completedDay: null,
        deadlineDay: 12,
        baseValue: 1600,
        currentValue: 1600,
        penaltyPerDay: 200,
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
      },
      {
        id: 'crd-106',
        code: 'CRD-106',
        title: 'Adequação LGPD - Opt-out',
        description: 'Painel de consentimento e anonimização de dados do titular.',
        classOfService: 'fixed-date',
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
      const earned = Math.max(0, card.currentValue);
      this.financial.totalRevenue += earned;

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
    const baseVal = parseInt(cardData.baseValue, 10) || 1500;
    const isHigh = baseVal >= 3000;

    const newCard: Card = {
      id: 'crd-' + (Date.now() % 100000),
      code: 'CRD-' + (100 + this.cards.length + 1),
      title: cardData.title || 'Nova Demanda',
      description: cardData.description || 'Descrição da funcionalidade.',
      classOfService: cardData.classOfService || 'standard',
      column: 'backlog',
      createdDay: this.day,
      startedDay: null,
      completedDay: null,
      deadlineDay: this.day + (parseInt(cardData.deadlineDays, 10) || 7),
      baseValue: baseVal,
      currentValue: baseVal,
      penaltyPerDay: parseInt(cardData.penaltyPerDay, 10) || Math.round(baseVal * 0.15),
      accumulatedPenalty: 0,
      effortAnalysis: parseInt(cardData.effortAnalysis, 10) || 2,
      doneAnalysis: 0,
      effortDev: parseInt(cardData.effortDev, 10) || 4,
      doneDev: 0,
      effortTest: parseInt(cardData.effortTest, 10) || 2,
      doneTest: 0,
      totalEffort: (parseInt(cardData.effortAnalysis, 10) || 2) + (parseInt(cardData.effortDev, 10) || 4) + (parseInt(cardData.effortTest, 10) || 2),
      isBlocked: false,
      assignedAgents: [],
      isManual: true,
      isHighValue: isHigh,
      bugRejectionCount: 0,
    };

    this.cards.push(newCard);
    return newCard;
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
  public nextDay(): { day: number; event: EventLog | null } {
    this.day += 1;
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
      if (card.column !== 'backlog' && card.column !== 'deployed') {
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

    this.recordCFDSnapshot();
    this.recordFinancialSnapshot();

    return {
      day: this.day,
      event: this.lastEvent,
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
    });
  }

  public getKPIs() {
    const delivered = this.cards.filter(c => c.column === 'deployed');
    const inProgress = this.cards.filter(c => c.column !== 'backlog' && c.column !== 'deployed');
    const blocked = this.cards.filter(c => c.isBlocked);
    const overdue = inProgress.filter(c => this.day > c.deadlineDay);

    const leadTimes = delivered.map(c => Math.max(1, (c.completedDay || 1) - (c.startedDay || 1)));
    const avgLeadTime = leadTimes.length > 0 ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1) : '0.0';
    const throughput = (delivered.length / Math.max(1, this.day)).toFixed(2);

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

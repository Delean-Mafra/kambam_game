/**
 * KANBAN SQUAD GAME ENGINE
 * Core business rules, WIP limit governance, dice simulation, team allocation (swarming),
 * deadline SLA calculations, penalty reductions, bug detection in QA, regression generation,
 * and financial accounting.
 */

class KanbanGameEngine {
  constructor() {
    this.initialSquadCost = 1550; // Daily squad salary cost (R$ 1.550/dia)
    this.reset();
  }

  reset() {
    this.day = 1;
    this.isRunning = false;
    this.lastEvent = null;

    // WIP Limits (inspired by Little's Law and Kanban best practices)
    this.wipLimits = {
      backlog: 999,
      ready: 3,
      analysis: 2,
      development: 3,
      testing: 2,
      deployed: 999,
    };

    // Squad Team Members
    this.agents = {
      analyst: {
        id: 'analyst',
        name: 'Sofia',
        role: 'Product / Discovery',
        specialty: 'analysis',
        avatar: '🔍',
        dailyCost: 350,
        currentDice: 4,
        isAbsent: false,
        assignedCardId: null,
      },
      devFront: {
        id: 'devFront',
        name: 'Lucas',
        role: 'Frontend Dev',
        specialty: 'development',
        avatar: '💻',
        dailyCost: 400,
        currentDice: 5,
        isAbsent: false,
        assignedCardId: null,
      },
      devBack: {
        id: 'devBack',
        name: 'Rafael',
        role: 'Backend & DevOps',
        specialty: 'development',
        avatar: '⚙️',
        dailyCost: 450,
        currentDice: 4,
        isAbsent: false,
        assignedCardId: null,
      },
      qa: {
        id: 'qa',
        name: 'Beatriz',
        role: 'QA Specialist',
        specialty: 'testing',
        avatar: '🧪',
        dailyCost: 350,
        currentDice: 3,
        isAbsent: false,
        assignedCardId: null,
      },
    };

    // Financial ledger
    this.financial = {
      totalRevenue: 0,
      totalCost: 0,
      totalPenalties: 0,
      bonusEarned: 0,
      netProfit: 0,
      history: [],
    };

    // Historical tracking for analytics
    this.cfdHistory = [];
    this.dailyDelivered = [];
    this.eventsHistory = [];

    // Pre-populate balanced initial cards
    this.cards = this.getInitialCards();

    // Initial snapshots
    this.recordCFDSnapshot();
    this.recordFinancialSnapshot();
  }

  getInitialCards() {
    return [
      {
        id: 'crd-101',
        code: 'CRD-101',
        title: 'Módulo de Pagamento Pix',
        description: 'Implementação de geração de QR Code dinâmico e webhook do Bacen.',
        classOfService: 'fixed-date',
        column: 'development',
        createdDay: 1,
        startedDay: 1,
        completedDay: null,
        deadlineDay: 5,
        baseValue: 2400,
        currentValue: 2400,
        penaltyPerDay: 500,
        accumulatedPenalty: 0,
        effortAnalysis: 3,
        doneAnalysis: 3,
        effortDev: 5,
        doneDev: 2,
        effortTest: 3,
        doneTest: 0,
        totalEffort: 11,
        isBlocked: false,
        assignedAgents: ['devFront'],
        isManual: false,
        bugRejectionCount: 0,
      },
      {
        id: 'crd-102',
        code: 'CRD-102',
        title: 'Autenticação 2FA (TOTP)',
        description: 'Segurança para login via aplicativo autenticador do usuário.',
        classOfService: 'standard',
        column: 'analysis',
        createdDay: 1,
        startedDay: 1,
        completedDay: null,
        deadlineDay: 7,
        baseValue: 1800,
        currentValue: 1800,
        penaltyPerDay: 250,
        accumulatedPenalty: 0,
        effortAnalysis: 3,
        doneAnalysis: 1,
        effortDev: 4,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 9,
        isBlocked: false,
        assignedAgents: ['analyst'],
        isManual: false,
        bugRejectionCount: 0,
      },
      {
        id: 'crd-103',
        code: 'CRD-103',
        title: 'Refatoração da Camada de Cache',
        description: 'Migração de cache em memória para Redis Cluster para evitar gargalos.',
        classOfService: 'tech-debt',
        column: 'ready',
        createdDay: 1,
        startedDay: 1,
        completedDay: null,
        deadlineDay: 10,
        baseValue: 800,
        currentValue: 800,
        penaltyPerDay: 50,
        accumulatedPenalty: 0,
        effortAnalysis: 1,
        doneAnalysis: 0,
        effortDev: 4,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 7,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        bugRejectionCount: 0,
      },
      {
        id: 'crd-104',
        code: 'CRD-104',
        title: 'Dashboard de Vendas em Tempo Real',
        description: 'Exibição de métricas operacionais com WebSockets para diretoria.',
        classOfService: 'standard',
        column: 'ready',
        createdDay: 1,
        startedDay: 1,
        completedDay: null,
        deadlineDay: 8,
        baseValue: 2200,
        currentValue: 2200,
        penaltyPerDay: 300,
        accumulatedPenalty: 0,
        effortAnalysis: 2,
        doneAnalysis: 0,
        effortDev: 6,
        doneDev: 0,
        effortTest: 3,
        doneTest: 0,
        totalEffort: 11,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        bugRejectionCount: 0,
      },
      {
        id: 'crd-105',
        code: 'CRD-105',
        title: 'Exportação Contábil em PDF/Excel',
        description: 'Relatório mensal com regras contábeis da Receita Federal.',
        classOfService: 'standard',
        column: 'backlog',
        createdDay: 1,
        startedDay: null,
        completedDay: null,
        deadlineDay: 12,
        baseValue: 1500,
        currentValue: 1500,
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
        bugRejectionCount: 0,
      },
      {
        id: 'crd-106',
        code: 'CRD-106',
        title: 'Recuperação de Carrinho Abandonado',
        description: 'Disparo de e-mail e push notification com cupom de desconto.',
        classOfService: 'standard',
        column: 'backlog',
        createdDay: 1,
        startedDay: null,
        completedDay: null,
        deadlineDay: 14,
        baseValue: 1900,
        currentValue: 1900,
        penaltyPerDay: 250,
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
        bugRejectionCount: 0,
      },
      {
        id: 'crd-107',
        code: 'CRD-107',
        title: 'Adequação LGPD - Exclusão de Conta',
        description: 'Rotina de anonimização e exclusão definitiva de dados pessoais.',
        classOfService: 'fixed-date',
        column: 'backlog',
        createdDay: 1,
        startedDay: null,
        completedDay: null,
        deadlineDay: 9,
        baseValue: 2600,
        currentValue: 2600,
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
        bugRejectionCount: 0,
      }
    ];
  }

  rollDice() {
    return Math.floor(Math.random() * 6) + 1;
  }

  // Toggle member assignment to a card
  toggleAgentAssignment(agentId, cardId) {
    const card = this.cards.find(c => c.id === cardId);
    const agent = this.agents[agentId];
    if (!card || !agent) return;

    if (!card.assignedAgents) card.assignedAgents = [];

    const idx = card.assignedAgents.indexOf(agentId);
    if (idx !== -1) {
      // Unassign
      card.assignedAgents.splice(idx, 1);
      agent.assignedCardId = null;
    } else {
      // Remove agent from any previous card
      this.cards.forEach(c => {
        if (c.assignedAgents && c.assignedAgents.includes(agentId)) {
          c.assignedAgents = c.assignedAgents.filter(id => id !== agentId);
        }
      });
      // Assign to this card
      card.assignedAgents.push(agentId);
      agent.assignedCardId = cardId;
    }
  }

  canMoveTo(column) {
    if (column === 'backlog' || column === 'deployed') return true;
    const currentCount = this.cards.filter(c => c.column === column).length;
    const limit = this.wipLimits[column] || 999;
    return currentCount < limit;
  }

  moveCard(cardId, targetColumn, isAuto = false) {
    const card = this.cards.find(c => c.id === cardId);
    if (!card) return { success: false, message: 'Cartão não encontrado.' };

    if (card.column === targetColumn) return { success: true };

    const isExpedite = card.classOfService === 'expedite';
    if (!this.canMoveTo(targetColumn) && !isExpedite) {
      return {
        success: false,
        message: `Limite de WIP da coluna "${targetColumn.toUpperCase()}" atingido! Respeite o fluxo (Máx: ${this.wipLimits[targetColumn]}).`,
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

    card.column = targetColumn;

    if (targetColumn === 'ready' && !card.startedDay) {
      card.startedDay = this.day;
    }

    if (targetColumn === 'deployed' && !card.completedDay) {
      card.completedDay = this.day;
      const earned = Math.max(0, card.currentValue);
      this.financial.totalRevenue += earned;

      // Free up any assigned agents
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

      if (window.soundEngine) window.soundEngine.playTaskComplete();
    } else {
      if (window.soundEngine) window.soundEngine.playCardDrop();
    }

    return { success: true, card };
  }

  unblockCard(cardId) {
    const card = this.cards.find(c => c.id === cardId);
    if (card) {
      card.isBlocked = false;
      return true;
    }
    return false;
  }

  addCard(cardData) {
    const baseVal = parseInt(cardData.baseValue, 10) || 1500;
    const isHigh = baseVal >= 3000;

    const newCard = {
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

  /**
   * Spawn a regression bug caused by a large high-value manual project
   */
  spawnRegressionBug(sourceCard) {
    const bugCode = 'REGRESSÃO-' + Math.floor(100 + Math.random() * 900);
    const regBug = {
      id: 'bug-' + Date.now().toString(36),
      code: bugCode,
      title: `💥 Regressão Crítica: Falha gerada por [${sourceCard.code}]`,
      description: `A alteração de alta complexidade em "${sourceCard.title}" impactou tabelas compartilhadas e derrubou módulos legados em produção!`,
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
      bugRejectionCount: 0,
    };

    this.cards.unshift(regBug);

    const eventNotice = {
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

    if (window.soundEngine) window.soundEngine.playWarning();
  }

  /**
   * ADVANCE TO NEXT DAY
   */
  nextDay() {
    this.day += 1;

    if (window.soundEngine) window.soundEngine.playDiceRoll();

    // 1. Roll dice & reset temporary states
    Object.values(this.agents).forEach(agent => {
      agent.isAbsent = false;
      agent.currentDice = this.rollDice();
    });

    // 2. Random Event Trigger (~55% chance each day after day 1)
    this.lastEvent = null;
    if (this.day >= 2 && Math.random() < 0.60 && window.SQUAD_EVENTS) {
      const eventIndex = Math.floor(Math.random() * window.SQUAD_EVENTS.length);
      const chosenEvent = window.SQUAD_EVENTS[eventIndex];
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
        if (window.soundEngine) window.soundEngine.playWarning();
      }
    }

    // 3. SPECIALIST WORK EFFORT APPLICATION
    // STEP A: First apply effort from ASSIGNED agents (Swarming / Targeted Focus)
    Object.values(this.agents).forEach(agent => {
      if (agent.isAbsent || !agent.assignedCardId) return;

      const card = this.cards.find(c => c.id === agent.assignedCardId);
      if (!card || card.column === 'backlog' || card.column === 'deployed' || card.isBlocked) return;

      // Calculate efficiency on target card
      const currentStage = card.column; // 'analysis', 'development', or 'testing'
      const isDomain = (
        (currentStage === 'analysis' && agent.specialty === 'analysis') ||
        (currentStage === 'development' && agent.specialty === 'development') ||
        (currentStage === 'testing' && agent.specialty === 'testing')
      );

      // 2x if in their specialty, 1x if mobbing/swarming cross-skill
      const points = isDomain ? agent.currentDice * 2 : agent.currentDice * 1;

      if (currentStage === 'analysis') {
        const needed = card.effortAnalysis - card.doneAnalysis;
        card.doneAnalysis = Math.min(card.effortAnalysis, card.doneAnalysis + points);
      } else if (currentStage === 'development') {
        const needed = card.effortDev - card.doneDev;
        card.doneDev = Math.min(card.effortDev, card.doneDev + points);
      } else if (currentStage === 'testing') {
        const needed = card.effortTest - card.doneTest;
        card.doneTest = Math.min(card.effortTest, card.doneTest + points);
      }
    });

    // STEP B: Apply remaining effort from UNASSIGNED agents to general backlog of their column
    let pointsAnalysis = 0;
    let pointsDev = 0;
    let pointsTest = 0;

    if (!this.agents.analyst.isAbsent && !this.agents.analyst.assignedCardId) {
      pointsAnalysis += this.agents.analyst.currentDice * 2;
    }
    if (!this.agents.devFront.isAbsent && !this.agents.devFront.assignedCardId) {
      pointsDev += this.agents.devFront.currentDice * 2;
    }
    if (!this.agents.devBack.isAbsent && !this.agents.devBack.assignedCardId) {
      pointsDev += this.agents.devBack.currentDice * 2;
    }
    if (!this.agents.qa.isAbsent && !this.agents.qa.assignedCardId) {
      pointsTest += this.agents.qa.currentDice * 2;
    }

    const priorityWeight = { 'expedite': 4, 'fixed-date': 3, 'standard': 2, 'tech-debt': 1 };
    const sortCards = (arr) => [...arr].sort((a, b) => (priorityWeight[b.classOfService] || 0) - (priorityWeight[a.classOfService] || 0));

    // Distribute unassigned analysis points
    const unassignedAnalysisCards = sortCards(this.cards.filter(c => c.column === 'analysis' && !c.isBlocked && (!c.assignedAgents || c.assignedAgents.length === 0)));
    for (const card of unassignedAnalysisCards) {
      const needed = card.effortAnalysis - card.doneAnalysis;
      if (needed > 0 && pointsAnalysis > 0) {
        const spent = Math.min(needed, pointsAnalysis);
        card.doneAnalysis += spent;
        pointsAnalysis -= spent;
      }
    }

    // Distribute unassigned dev points
    const unassignedDevCards = sortCards(this.cards.filter(c => c.column === 'development' && !c.isBlocked && (!c.assignedAgents || c.assignedAgents.length === 0)));
    for (const card of unassignedDevCards) {
      const needed = card.effortDev - card.doneDev;
      if (needed > 0 && pointsDev > 0) {
        const spent = Math.min(needed, pointsDev);
        card.doneDev += spent;
        pointsDev -= spent;
      }
    }

    // Distribute unassigned test points
    const unassignedTestCards = sortCards(this.cards.filter(c => c.column === 'testing' && !c.isBlocked && (!c.assignedAgents || c.assignedAgents.length === 0)));
    for (const card of unassignedTestCards) {
      const needed = card.effortTest - card.doneTest;
      if (needed > 0 && pointsTest > 0) {
        const spent = Math.min(needed, pointsTest);
        card.doneTest += spent;
        pointsTest -= spent;
      }
    }

    // 4. TESTING STAGE VALIDATION: BUG DETECTION & REGRESSION FOR HIGH-VALUE / MANUAL DEMANDS
    this.cards.forEach(card => {
      if (card.column === 'testing' && card.doneTest >= card.effortTest) {
        // High-value manual demands carry high regression & defect risk in testing!
        if (card.isManual && card.isHighValue && card.bugRejectionCount === 0) {
          // 65% chance that QA catches a critical bug
          if (Math.random() < 0.70) {
            // REPROVAÇÃO EM TESTES: volta para desenvolvimento!
            card.column = 'development';
            card.doneDev = Math.max(0, card.effortDev - 3); // needs 3 more dev points to fix
            card.doneTest = 0; // must be re-tested
            card.bugRejectionCount = 1;
            card.hasBug = true;

            const bugEvent = {
              day: this.day,
              title: `🐛 DEFEITO REPROVADO EM QA: [${card.code}]`,
              badge: 'Qualidade QA',
              type: 'critical',
              description: `Beatriz (QA) identificou bugs críticos na demanda de alto ganho "${card.title}" durante os testes de integração!`,
              impactText: `O cartão foi REPROVADO e retornou para Desenvolvimento para correção de defeitos (+3 pts).`,
              customResult: `Alavanque desenvolvedores para corrigir o bug antes do prazo!`,
            };
            this.eventsHistory.unshift(bugEvent);
            this.lastEvent = bugEvent;

            if (window.soundEngine) window.soundEngine.playWarning();

            // 60% chance that this high-value feature causes a regression bug elsewhere in the system!
            if (Math.random() < 0.65) {
              this.spawnRegressionBug(card);
            }
          }
        }
      }
    });

    // 5. Daily Squad Operational Cost
    const dailyCost = Object.values(this.agents).reduce((acc, a) => acc + (a.dailyCost || 0), 0);
    this.financial.totalCost += dailyCost;

    // 6. Check Deadlines & Calculate Overdue Penalties
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

    // Compute net profit
    this.financial.netProfit = this.financial.totalRevenue - this.financial.totalCost - this.financial.totalPenalties + (this.financial.bonusEarned || 0);

    // 7. Record History
    this.recordCFDSnapshot();
    this.recordFinancialSnapshot();

    return {
      day: this.day,
      event: this.lastEvent,
    };
  }

  recordCFDSnapshot() {
    const counts = {
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

  recordFinancialSnapshot() {
    this.financial.history.push({
      day: this.day,
      revenue: this.financial.totalRevenue,
      cost: this.financial.totalCost,
      penalties: this.financial.totalPenalties,
      profit: this.financial.netProfit,
    });
  }

  getKPIs() {
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
}

window.kanbanEngine = new KanbanGameEngine();

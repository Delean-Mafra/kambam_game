/**
 * KANBAN SQUAD UI CONTROLLER (TypeScript)
 * Manages 9 Squad Members (3 Analysts, 3 Devs, 3 QAs), Stage-Specific Allocation,
 * Swarming, Dynamic Risk Calculator, and Cryptographic Anti-Tamper Save/Load.
 */

import { KanbanGameEngine } from './engine';
import { chartsEngine } from './charts';
import { soundEngine } from './audio';
import type { Card, EventLog, SquadMember } from './types';

export class UIController {
  private engine: KanbanGameEngine;
  private draggedCardId: string | null = null;
  private autoPlayInterval: any = null;

  constructor(engine: KanbanGameEngine) {
    this.engine = engine;
  }

  public init(): void {
    this.bindEvents();
    this.setupNewCardCalculator();
    this.updateAll();
  }

  private bindEvents(): void {
    // Next Day Button
    const btnNext = document.getElementById('btnNextDay');
    if (btnNext) {
      btnNext.addEventListener('click', () => this.handleNextDay());
    }

    // Auto Play Toggle
    const btnAuto = document.getElementById('btnAutoPlay');
    if (btnAuto) {
      btnAuto.addEventListener('click', () => this.toggleAutoPlay());
    }

    // Reset Button -> In-App Modal (avoids window.confirm)
    const btnReset = document.getElementById('btnResetGame');
    if (btnReset) {
      btnReset.addEventListener('click', () => this.openModal('modalResetConfirm'));
    }

    // Modal Confirm Reset Button
    const btnConfirmReset = document.getElementById('btnConfirmReset');
    if (btnConfirmReset) {
      btnConfirmReset.addEventListener('click', () => {
        this.engine.reset();
        this.closeModals();
        this.updateAll();
        soundEngine.playCardDrop();
        this.showToast('Simulação reiniciada para o Dia 1 com sucesso!', 'success');
      });
    }

    // Sound Toggle
    const btnSound = document.getElementById('btnToggleSound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        const enabled = soundEngine.toggleSound();
        btnSound.textContent = enabled ? '🔊 Som Ativo' : '🔇 Mudo';
        this.showToast(enabled ? 'Efeitos sonoros ativados.' : 'Efeitos sonoros desativados.', 'info');
      });
    }

    // Modals
    const btnNewCard = document.getElementById('btnNewCard');
    if (btnNewCard) {
      btnNewCard.addEventListener('click', () => this.openModal('modalNewCard'));
    }

    const btnBacklogQuick = document.getElementById('btnBacklogQuickAdd');
    if (btnBacklogQuick) {
      btnBacklogQuick.addEventListener('click', () => this.openModal('modalNewCard'));
    }

    const btnWipModal = document.getElementById('btnWipLimits');
    if (btnWipModal) {
      btnWipModal.addEventListener('click', () => {
        this.populateWipModal();
        this.openModal('modalWip');
      });
    }

    const btnHelpModal = document.getElementById('btnHelpModal');
    if (btnHelpModal) {
      btnHelpModal.addEventListener('click', () => this.openModal('modalHelp'));
    }

    const btnExportModal = document.getElementById('btnExportModal');
    if (btnExportModal) {
      btnExportModal.addEventListener('click', async () => {
        await this.populateExportData();
        this.openModal('modalExport');
      });
    }

    const btnImportAction = document.getElementById('btnImportAction');
    if (btnImportAction) {
      btnImportAction.addEventListener('click', () => this.handleImportData());
    }

    // Form: New Card Submit
    const formCard = document.getElementById('formNewCard') as HTMLFormElement | null;
    if (formCard) {
      formCard.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
          title: (document.getElementById('cardTitle') as HTMLInputElement).value,
          description: (document.getElementById('cardDesc') as HTMLTextAreaElement).value,
          classOfService: (document.getElementById('cardClass') as HTMLSelectElement).value,
          deadlineDays: (document.getElementById('cardDeadline') as HTMLInputElement).value,
          baseValue: (document.getElementById('cardValue') as HTMLInputElement).value,
          effortAnalysis: (document.getElementById('cardEffortAnalysis') as HTMLInputElement).value,
          effortDev: (document.getElementById('cardEffortDev') as HTMLInputElement).value,
          effortTest: (document.getElementById('cardEffortTest') as HTMLInputElement).value,
        };
        const newCard = this.engine.addCard(data);
        this.closeModals();
        formCard.reset();
        this.setupNewCardCalculator();
        this.updateAll();

        if (newCard.isHighValue) {
          this.showToast(`🔥 Demanda de alto valor [${newCard.code}] inserida! Exige Swarming de Analistas, Devs e QAs em suas respectivas fases para evitar bugs e atrasos.`, 'warning');
        } else {
          this.showToast(`Nova demanda [${newCard.code}] inserida no Backlog!`, 'success');
        }
      });
    }

    // Form: WIP limits submit
    const formWip = document.getElementById('formWipLimits') as HTMLFormElement | null;
    if (formWip) {
      formWip.addEventListener('submit', (e) => {
        e.preventDefault();
        this.engine.wipLimits.ready = parseInt((document.getElementById('wipReady') as HTMLInputElement).value, 10) || 3;
        this.engine.wipLimits.analysis = parseInt((document.getElementById('wipAnalysis') as HTMLInputElement).value, 10) || 2;
        this.engine.wipLimits.development = parseInt((document.getElementById('wipDevelopment') as HTMLInputElement).value, 10) || 3;
        this.engine.wipLimits.testing = parseInt((document.getElementById('wipTesting') as HTMLInputElement).value, 10) || 2;
        this.closeModals();
        this.updateAll();
        this.showToast('Novos limites de WIP configurados!', 'success');
      });
    }

    this.setupDragAndDrop();

    // Keyboard Shortcuts (Space bar for Next Day)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.handleNextDay();
      }
    });

    // Close Modals
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || (e.target as HTMLElement).classList.contains('modal-close-btn')) {
          this.closeModals();
        }
      });
    });
  }

  private setupNewCardCalculator(): void {
    const valInput = document.getElementById('cardValue') as HTMLInputElement | null;
    const deadlineInput = document.getElementById('cardDeadline') as HTMLInputElement | null;
    const analysisInput = document.getElementById('cardEffortAnalysis') as HTMLInputElement | null;
    const devInput = document.getElementById('cardEffortDev') as HTMLInputElement | null;
    const testInput = document.getElementById('cardEffortTest') as HTMLInputElement | null;
    const adviceBox = document.getElementById('calculatorAdvice');

    if (!valInput) return;

    const recalc = () => {
      const val = parseInt(valInput.value, 10) || 1500;

      let deadlineDays = 8;
      let effAnalysis = 2;
      let effDev = 4;
      let effTest = 2;
      let adviceHtml = '';

      if (val < 2500) {
        deadlineDays = Math.max(6, 12 - Math.floor(val / 400));
        effAnalysis = 2;
        effDev = Math.max(3, Math.round(val / 500));
        effTest = 2;
        adviceHtml = `
          <div style="font-size:0.75rem; color:#6ee7b7; font-weight:600;">🟢 Demanda Equilibrada (Baixo Risco)</div>
          <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">
            Prazo confortável (${deadlineDays} dias). 1 especialista por etapa é suficiente. Risco baixo de regressão.
          </div>
        `;
      } else if (val < 4500) {
        deadlineDays = Math.max(4, 8 - Math.floor((val - 2500) / 700));
        effAnalysis = 3;
        effDev = Math.max(5, Math.round(val / 450));
        effTest = 3;
        adviceHtml = `
          <div style="font-size:0.75rem; color:#fbbf24; font-weight:700;">🟡 Alto Retorno / Prazo Apertado (${deadlineDays} dias)</div>
          <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">
            Exige alocação de <strong>2 a 3 especialistas em cada fase</strong> (Swarming). Risco moderado de bugs em QA.
          </div>
        `;
      } else {
        deadlineDays = Math.max(2, 4 - Math.floor((val - 4500) / 1500));
        effAnalysis = 3;
        effDev = Math.max(7, Math.round(val / 400));
        effTest = 4;
        adviceHtml = `
          <div style="font-size:0.75rem; color:#f87171; font-weight:700;">🔴 MEGA PROJETO ESTRATÉGICO / RISCO CRÍTICO</div>
          <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">
            Prazo ULTRA curto (<strong>${deadlineDays} dias</strong>) e esforço elevado (${effAnalysis + effDev + effTest} pts).
            <strong>Exige os 3 especialistas focados</strong> em cada etapa para não estourar o SLA.
            Gera alto risco (70%) de reprovação nos testes e quebra de regressões no produto!
          </div>
        `;
      }

      if (deadlineInput) deadlineInput.value = deadlineDays.toString();
      if (analysisInput) analysisInput.value = effAnalysis.toString();
      if (devInput) devInput.value = effDev.toString();
      if (testInput) testInput.value = effTest.toString();
      if (adviceBox) adviceBox.innerHTML = adviceHtml;
    };

    valInput.addEventListener('input', recalc);
    recalc();

    (window as any).setCardPreset = (type: string) => {
      const titleInput = document.getElementById('cardTitle') as HTMLInputElement | null;
      const descInput = document.getElementById('cardDesc') as HTMLTextAreaElement | null;
      const classInput = document.getElementById('cardClass') as HTMLSelectElement | null;

      if (type === 'standard') {
        if (titleInput) titleInput.value = 'Módulo de Notificações Push';
        if (descInput) descInput.value = 'Envio de alertas em tempo real de promoções no app.';
        if (classInput) classInput.value = 'standard';
        valInput.value = '1800';
      } else if (type === 'high-gain') {
        if (titleInput) titleInput.value = 'Nova Engine de Inteligência de Crédito';
        if (descInput) descInput.value = 'Cálculo de risco financeiro com alto valor e prazo rigoroso.';
        if (classInput) classInput.value = 'fixed-date';
        valInput.value = '4500';
      } else if (type === 'mega-urgent') {
        if (titleInput) titleInput.value = 'Integração com Sistema ERP Global';
        if (descInput) descInput.value = 'Contrato estratégico multimilionário com entrega urgente.';
        if (classInput) classInput.value = 'fixed-date';
        valInput.value = '6500';
      }
      recalc();
    };
  }

  private setupDragAndDrop(): void {
    const columns = document.querySelectorAll('.cards-dropzone');
    columns.forEach(zone => {
      const el = zone as HTMLElement;
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetCol = el.dataset.column || '';
        if (this.engine.canMoveTo(targetCol)) {
          el.classList.add('drag-over');
          el.classList.remove('drag-forbidden');
        } else {
          el.classList.add('drag-forbidden');
          el.classList.remove('drag-over');
        }
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('drag-over', 'drag-forbidden');
      });

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over', 'drag-forbidden');
        if (this.draggedCardId) {
          const targetCol = el.dataset.column;
          const result = this.engine.moveCard(this.draggedCardId, targetCol);
          if (!result.success) {
            this.showToast(result.message || 'Movimento inválido', 'warning');
            soundEngine.playWarning();
          } else {
            this.updateAll();
          }
          this.draggedCardId = null;
        }
      });
    });
  }

  public handleNextDay(): void {
    const result = this.engine.nextDay();
    this.updateAll();

    if (result.event) {
      this.showEventToast(result.event);
    }
  }

  public toggleAutoPlay(): void {
    const btn = document.getElementById('btnAutoPlay');
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
      if (btn) btn.textContent = '▶️ Auto-Play';
      this.showToast('Auto-play pausado.', 'info');
    } else {
      this.autoPlayInterval = setInterval(() => {
        this.handleNextDay();
      }, 2500);
      if (btn) btn.textContent = '⏸️ Pausar';
      this.showToast('Auto-play iniciado (avanço a cada 2.5s).', 'info');
    }
  }

  public updateAll(): void {
    this.renderHeader();
    this.renderSquad();
    this.renderKPIs();
    this.renderBoard();
    this.renderCharts();
  }

  private renderHeader(): void {
    const dayVal = document.getElementById('currentDayValue');
    if (dayVal) dayVal.textContent = this.engine.day.toString();
  }

  /**
   * Renders the 9 Squad Members grouped cleanly by functional roles:
   * - 3 Analistas de Negócios (Análise & Discovery)
   * - 3 Desenvolvedores (Desenvolvimento)
   * - 3 Testadores / QA (Testes & QA)
   */
  private renderSquad(): void {
    const container = document.getElementById('squadMembers');
    if (!container) return;

    container.innerHTML = '';

    const roleGroups: { title: string; role: string; color: string; badge: string; list: SquadMember[] }[] = [
      {
        title: 'Analistas de Negócios (Discovery)',
        role: 'analyst',
        color: '#ec4899',
        badge: '🔍 Análise',
        list: Object.values(this.engine.agents).filter(a => a.role === 'analyst'),
      },
      {
        title: 'Desenvolvedores (Engenharia)',
        role: 'developer',
        color: '#8b5cf6',
        badge: '💻 Desenvolvimento',
        list: Object.values(this.engine.agents).filter(a => a.role === 'developer'),
      },
      {
        title: 'Testadores / QA (Qualidade)',
        role: 'qa',
        color: '#10b981',
        badge: '🧪 Testes',
        list: Object.values(this.engine.agents).filter(a => a.role === 'qa'),
      },
    ];

    roleGroups.forEach(group => {
      const groupCol = document.createElement('div');
      groupCol.className = 'squad-role-cluster';
      groupCol.innerHTML = `
        <div class="squad-cluster-header" style="border-left: 3px solid ${group.color};">
          <span class="cluster-title">${group.title}</span>
          <span class="cluster-badge" style="background:${group.color}22; color:${group.color};">${group.badge}</span>
        </div>
        <div class="cluster-members-row"></div>
      `;

      const membersRow = groupCol.querySelector('.cluster-members-row')!;

      group.list.forEach(agent => {
        const card = document.createElement('div');
        card.className = `member-card ${agent.role} ${agent.isAbsent ? 'absent' : ''}`;

        let focusHtml = '<span style="color:#64748b; font-size:0.65rem;">🌐 Apoio Geral</span>';
        if (agent.assignedCardId) {
          const assignedCard = this.engine.cards.find(c => c.id === agent.assignedCardId);
          if (assignedCard) {
            focusHtml = `<span style="color:#38bdf8; font-size:0.65rem; font-weight:700;">🎯 Focado: ${assignedCard.code}</span>`;
          }
        }

        card.innerHTML = `
          <div class="member-avatar">${agent.avatar}</div>
          <div class="member-info">
            <span class="member-name">${agent.name}</span>
            <span class="member-role">${agent.roleLabel}</span>
            ${focusHtml}
          </div>
          <div class="member-dice-result" title="Dado rolado para hoje">
            ${agent.isAbsent ? 'AUS' : '🎲 ' + agent.currentDice}
          </div>
        `;
        membersRow.appendChild(card);
      });

      container.appendChild(groupCol);
    });
  }

  private renderKPIs(): void {
    const kpis = this.engine.getKPIs();

    const setVal = (id: string, val: string | number, cls?: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = val.toString();
        if (cls) el.className = `kpi-value ${cls}`;
      }
    };

    setVal('kpiDelivered', kpis.deliveredCount);
    setVal('kpiWIP', kpis.wipTotal);
    setVal('kpiOverdue', kpis.overdueCount, kpis.overdueCount > 0 ? 'warning' : '');
    setVal('kpiAvgLead', `${kpis.avgLeadTime}d`);
    setVal('kpiThroughput', `${kpis.throughput} /d`);
    setVal('kpiRevenue', `R$ ${kpis.revenue.toLocaleString('pt-BR')}`);
    setVal('kpiCost', `R$ ${kpis.cost.toLocaleString('pt-BR')}`, 'cost');
    setVal('kpiPenalties', `-R$ ${kpis.penalties.toLocaleString('pt-BR')}`, kpis.penalties > 0 ? 'warning' : '');

    const profitCls = kpis.profit >= 0 ? 'profit' : 'loss';
    const profitSign = kpis.profit >= 0 ? '+' : '';
    setVal('kpiProfit', `${profitSign}R$ ${kpis.profit.toLocaleString('pt-BR')}`, profitCls);
  }

  private renderBoard(): void {
    const columns = ['backlog', 'ready', 'analysis', 'development', 'testing', 'deployed'];

    columns.forEach(col => {
      const dropzone = document.getElementById(`cards-${col}`);
      const wipBadge = document.getElementById(`wip-${col}`);
      const wipBarFill = document.getElementById(`wipfill-${col}`);
      const colCards = this.engine.cards.filter(c => c.column === col);
      const limit = (this.engine.wipLimits as any)[col] || 999;

      if (wipBadge) {
        if (limit >= 999) {
          wipBadge.textContent = `${colCards.length}`;
        } else {
          wipBadge.textContent = `${colCards.length} / ${limit}`;
          wipBadge.className = 'column-wip-badge';
          if (colCards.length >= limit) wipBadge.classList.add('breached');
          else if (colCards.length === limit - 1) wipBadge.classList.add('near-limit');
        }
      }

      if (wipBarFill && limit < 999) {
        const pct = Math.min(100, (colCards.length / limit) * 100);
        wipBarFill.style.width = `${pct}%`;
        wipBarFill.className = 'wip-fill';
        if (colCards.length >= limit) wipBarFill.classList.add('danger');
        else if (colCards.length === limit - 1) wipBarFill.classList.add('warning');
      }

      if (!dropzone) return;
      dropzone.innerHTML = '';

      if (colCards.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-placeholder';
        empty.textContent = col === 'deployed' ? 'Nenhum item entregue ainda' : 'Arraste tarefas aqui';
        dropzone.appendChild(empty);
        return;
      }

      colCards.forEach(card => {
        const cardEl = this.createCardElement(card);
        dropzone.appendChild(cardEl);
      });
    });
  }

  /**
   * Creates Card DOM with STRICT ROLE SEPARATION:
   * - In 'analysis': only the 3 Analysts can be toggled
   * - In 'development': only the 3 Devs can be toggled
   * - In 'testing': only the 3 QAs can be toggled
   */
  private createCardElement(card: Card): HTMLElement {
    const el = document.createElement('div');
    el.className = `kanban-card ${card.classOfService} ${card.isBlocked ? 'is-blocked' : ''}`;
    el.draggable = true;
    el.dataset.id = card.id;

    const classLabels: Record<string, string> = {
      'expedite': '🚨 Expedite (Urgente)',
      'fixed-date': '📅 Data Fixa',
      'standard': '📦 Padrão',
      'tech-debt': '🛠️ Dívida Técnica',
    };

    const daysLeft = card.deadlineDay - this.engine.day;
    let deadlineClass = 'ontime';
    let deadlineText = `Prazo: D${card.deadlineDay} (${daysLeft}d restantes)`;

    if (daysLeft === 0) {
      deadlineClass = 'warning';
      deadlineText = `Prazo: HOJE! (D${card.deadlineDay})`;
    } else if (daysLeft < 0) {
      deadlineClass = 'delayed';
      deadlineText = `⚠️ Atrasado há ${Math.abs(daysLeft)}d!`;
    }

    let readyBadge = '';
    if (card.column === 'analysis' && card.doneAnalysis >= card.effortAnalysis) {
      readyBadge = '<div class="ready-next-badge">✨ Análise concluída! Pronto para Dev</div>';
    } else if (card.column === 'development' && card.doneDev >= card.effortDev) {
      readyBadge = '<div class="ready-next-badge">✨ Código concluído! Pronto para Teste</div>';
    } else if (card.column === 'testing' && card.doneTest >= card.effortTest) {
      readyBadge = '<div class="ready-next-badge">✨ Testes aprovados! Pronto para Deploy</div>';
    }

    let blockedBadge = '';
    if (card.isBlocked) {
      blockedBadge = `
        <div class="blocked-banner">
          <span>⛔ Impedimento Externo</span>
          <button class="btn-unblock" onclick="window.uiController.unblockCard('${card.id}')">Desbloquear</button>
        </div>
      `;
    }

    let bugBanner = '';
    if (card.bugRejectionCount > 0 && card.column === 'development') {
      bugBanner = `
        <div class="bug-rejection-banner">
          <span>🚨 Reprovado em QA! Retornou p/ Dev</span>
        </div>
      `;
    }

    // STRICT STAGE-SPECIFIC COLLABORATOR ALLOCATION
    const assigned = card.assignedAgents || [];
    const isSwarming = assigned.length >= 2;
    let allocationHtml = '';

    if (card.column === 'analysis') {
      // ONLY the 3 Analysts
      const analysts = [this.engine.agents.analyst1, this.engine.agents.analyst2, this.engine.agents.analyst3];
      allocationHtml = `
        <div class="card-allocation-box">
          <div class="allocation-label-row">
            <span>Alocar Analistas de Negócios (Discovery):</span>
            ${isSwarming ? `<span class="swarming-pill">⚡ Swarming (${assigned.length} analistas)</span>` : ''}
          </div>
          <div class="assigned-agents-selector">
            ${analysts.map(a => `
              <button type="button" class="btn-agent-chip ${assigned.includes(a.id) ? 'active-analyst' : ''}"
                title="Alocar ${a.name} (${a.roleLabel})" onclick="window.uiController.toggleAgentOnCard('${a.id}', '${card.id}')">
                ${a.avatar} ${a.name}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (card.column === 'development') {
      // ONLY the 3 Developers
      const devs = [this.engine.agents.dev1, this.engine.agents.dev2, this.engine.agents.dev3];
      allocationHtml = `
        <div class="card-allocation-box">
          <div class="allocation-label-row">
            <span>Alocar Desenvolvedores (Engenharia):</span>
            ${isSwarming ? `<span class="swarming-pill">⚡ Swarming (${assigned.length} devs)</span>` : ''}
          </div>
          <div class="assigned-agents-selector">
            ${devs.map(d => `
              <button type="button" class="btn-agent-chip ${assigned.includes(d.id) ? 'active-dev-front' : ''}"
                title="Alocar ${d.name} (${d.roleLabel})" onclick="window.uiController.toggleAgentOnCard('${d.id}', '${card.id}')">
                ${d.avatar} ${d.name}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (card.column === 'testing') {
      // ONLY the 3 QAs
      const qas = [this.engine.agents.qa1, this.engine.agents.qa2, this.engine.agents.qa3];
      allocationHtml = `
        <div class="card-allocation-box">
          <div class="allocation-label-row">
            <span>Alocar Testadores / QA (Qualidade):</span>
            ${isSwarming ? `<span class="swarming-pill">⚡ Swarming (${assigned.length} QAs)</span>` : ''}
          </div>
          <div class="assigned-agents-selector">
            ${qas.map(q => `
              <button type="button" class="btn-agent-chip ${assigned.includes(q.id) ? 'active-qa' : ''}"
                title="Alocar ${q.name} (${q.roleLabel})" onclick="window.uiController.toggleAgentOnCard('${q.id}', '${card.id}')">
                ${q.avatar} ${q.name}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="card-header-line">
        <div class="card-id-class">
          <span class="card-id">${card.code}</span>
          <span class="class-indicator ${card.classOfService}">${classLabels[card.classOfService] || card.classOfService}</span>
        </div>
      </div>

      <div class="card-title">${card.title}</div>
      <div class="card-desc">${card.description}</div>

      ${readyBadge}
      ${blockedBadge}
      ${bugBanner}

      <!-- Stage Effort Bars -->
      <div class="stages-progress">
        <div class="stage-item">
          <span class="stage-name">Análise</span>
          <div class="stage-bar-wrap">
            <div class="stage-bar-fill analysis" style="width: ${(card.doneAnalysis / card.effortAnalysis) * 100}%"></div>
          </div>
          <span class="stage-count">${card.doneAnalysis}/${card.effortAnalysis}</span>
        </div>
        <div class="stage-item">
          <span class="stage-name">Dev</span>
          <div class="stage-bar-wrap">
            <div class="stage-bar-fill development" style="width: ${(card.doneDev / card.effortDev) * 100}%"></div>
          </div>
          <span class="stage-count">${card.doneDev}/${card.effortDev}</span>
        </div>
        <div class="stage-item">
          <span class="stage-name">QA</span>
          <div class="stage-bar-wrap">
            <div class="stage-bar-fill testing" style="width: ${(card.doneTest / card.effortTest) * 100}%"></div>
          </div>
          <span class="stage-count">${card.doneTest}/${card.effortTest}</span>
        </div>
      </div>

      ${allocationHtml}

      <!-- Deadline & Penalty -->
      <div class="card-deadline-box">
        <span class="deadline-text ${deadlineClass}">${deadlineText}</span>
        ${card.accumulatedPenalty > 0 ? `<span class="penalty-tag">-R$ ${card.accumulatedPenalty}</span>` : ''}
      </div>

      <!-- Footer: Current Value & Delivery -->
      <div class="card-footer">
        <div class="card-value-display">
          <span class="card-value-current">R$ ${card.currentValue.toLocaleString('pt-BR')}</span>
          ${card.accumulatedPenalty > 0 ? `<span class="card-value-original">R$ ${card.baseValue}</span>` : ''}
        </div>
        ${card.column !== 'deployed' ? `<span style="font-size:0.68rem; color:#94a3b8;">Arraste para mover</span>` : `<span style="font-size:0.68rem; color:#34d399;">✅ Entregue D${card.completedDay}</span>`}
      </div>
    `;

    el.addEventListener('dragstart', () => {
      this.draggedCardId = card.id;
      el.classList.add('is-dragging');
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('is-dragging');
    });

    return el;
  }

  public toggleAgentOnCard(agentId: string, cardId: string): void {
    const result = this.engine.toggleAgentAssignment(agentId, cardId);
    if (!result.success) {
      this.showToast(result.message || 'Alocação não permitida.', 'warning');
      soundEngine.playWarning();
      return;
    }

    soundEngine.playCardDrop();
    this.updateAll();

    const agent = this.engine.agents[agentId];
    const card = this.engine.cards.find(c => c.id === cardId);
    if (agent && card) {
      if (card.assignedAgents && card.assignedAgents.includes(agentId)) {
        this.showToast(`${agent.name} (${agent.roleLabel}) alocado(a) em [${card.code}]. Esforço focado nesta tarefa!`, 'info');
      } else {
        this.showToast(`${agent.name} liberado(a) de [${card.code}] para apoio geral de ${agent.roleLabel}.`, 'info');
      }
    }
  }

  public unblockCard(cardId: string): void {
    if (this.engine.unblockCard(cardId)) {
      this.showToast('Impedimento resolvido! Cartão liberado para avanço.', 'success');
      this.updateAll();
    }
  }

  private renderCharts(): void {
    chartsEngine.renderCFD('cfdChartCanvas', this.engine.cfdHistory);
    chartsEngine.renderLeadTime('leadTimeChartCanvas', this.engine.cards.filter(c => c.column === 'deployed'));
    chartsEngine.renderFinancial('financialChartCanvas', this.engine.financial.history);
    chartsEngine.renderThroughput('throughputChartCanvas', this.engine.dailyDelivered);
  }

  public showToast(message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info'): void {
    const shelf = document.getElementById('toastShelf');
    if (!shelf) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '🚨' };
    toast.innerHTML = `<span>${icons[type] || '📢'}</span><span>${message}</span>`;

    shelf.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  private showEventToast(event: EventLog): void {
    const toast = document.createElement('div');
    toast.className = 'event-alert-toast';
    toast.innerHTML = `
      <div class="event-toast-header">
        <span>⚡ EVENTO DO DIA (D${event.day}):</span>
        <span>${event.title}</span>
      </div>
      <div class="event-toast-body">${event.description}</div>
      <div style="font-weight:700; color:#fbbf24; font-size:0.75rem;">Impacto: ${event.impactText}</div>
      ${event.customResult ? `<div style="font-size:0.72rem; color:#6ee7b7;">${event.customResult}</div>` : ''}
      <button class="btn btn-secondary btn-sm" style="margin-top:0.3rem; align-self:flex-end;" onclick="this.parentElement.remove()">Entendido</button>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.remove();
      }
    }, 10000);
  }

  public openModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('is-open');
  }

  public closeModals(): void {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('is-open'));
  }

  private populateWipModal(): void {
    const setV = (id: string, val: number) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = val.toString();
    };
    setV('wipReady', this.engine.wipLimits.ready);
    setV('wipAnalysis', this.engine.wipLimits.analysis);
    setV('wipDevelopment', this.engine.wipLimits.development);
    setV('wipTesting', this.engine.wipLimits.testing);
  }

  /**
   * Exports game state with anti-tamper SHA-256 HMAC signature
   */
  private async populateExportData(): Promise<void> {
    const area = document.getElementById('exportJsonTextarea') as HTMLTextAreaElement | null;
    if (area) {
      area.value = 'Gerando assinatura criptográfica de integridade...';
      const json = await this.engine.exportGameState();
      area.value = json;
    }
  }

  /**
   * Imports game state verifying anti-tamper signature
   */
  private async handleImportData(): Promise<void> {
    const area = document.getElementById('exportJsonTextarea') as HTMLTextAreaElement | null;
    if (!area || !area.value.trim()) {
      this.showToast('Cole o conteúdo JSON do save no campo de texto.', 'warning');
      return;
    }

    const result = await this.engine.importGameState(area.value);
    if (result.success) {
      this.closeModals();
      this.updateAll();
      soundEngine.playCardDrop();
      this.showToast(result.message, 'success');
    } else {
      this.showToast(result.message, 'danger');
    }
  }
}

/**
 * KANBAN SQUAD UI CONTROLLER (TypeScript)
 * Manages 9 Squad Members (3 Analysts, 3 Devs, 3 QAs), Stage-Specific Allocation,
 * Swarming, Dynamic Risk Calculator, and Cryptographic Anti-Tamper Save/Load.
 */

import { KanbanGameEngine } from './engine';
import { chartsEngine } from './charts';
import { soundEngine } from './audio';
import type { Card, EventLog, SquadMember, GameScore } from './types';

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

    // Scoreboard Restart Button
    const btnScoreboardRestart = document.getElementById('btnScoreboardRestart');
    if (btnScoreboardRestart) {
      btnScoreboardRestart.addEventListener('click', () => {
        this.engine.reset();
        this.closeModals();
        this.updateAll();
        soundEngine.playCardDrop();
        this.showToast('Novo ciclo de 30 dias iniciado! Bom jogo!', 'success');
      });
    }

    // Bankruptcy Restart Button
    const btnBankruptcyRestart = document.getElementById('btnBankruptcyRestart');
    if (btnBankruptcyRestart) {
      btnBankruptcyRestart.addEventListener('click', () => {
        this.engine.reset();
        this.closeModals();
        this.updateAll();
        soundEngine.playCardDrop();
        this.showToast('Simulação reiniciada. Controle custos e prazos para não entrar no vermelho!', 'info');
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
        const demandTypeSelect = document.getElementById('cardDemandType') as HTMLSelectElement | null;
        const demandType = demandTypeSelect ? demandTypeSelect.value : 'story';
        const data = {
          title: (document.getElementById('cardTitle') as HTMLInputElement).value,
          description: (document.getElementById('cardDesc') as HTMLTextAreaElement).value,
          classOfService: (document.getElementById('cardClass') as HTMLSelectElement).value,
          demandType,
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

        if (newCard.isEpic) {
          this.showToast(`💎 Épico [${newCard.code}] inserido! Histórias e bugs relacionados já foram gerados no Backlog. O squad mantém fixos os 3 desenvolvedores!`, 'warning');
        } else if (newCard.demandType === 'docs') {
          this.showToast(`📄 Documentação [${newCard.code}] inserida! Não gera lucro; entregue rápido para minimizar o custo no caixa!`, 'info');
        } else if (newCard.isHighValue) {
          this.showToast(`🔥 Demanda de alto valor [${newCard.code}] inserida no Backlog!`, 'warning');
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
    const typeSelect = document.getElementById('cardDemandType') as HTMLSelectElement | null;
    const deadlineInput = document.getElementById('cardDeadline') as HTMLInputElement | null;
    const analysisInput = document.getElementById('cardEffortAnalysis') as HTMLInputElement | null;
    const devInput = document.getElementById('cardEffortDev') as HTMLInputElement | null;
    const testInput = document.getElementById('cardEffortTest') as HTMLInputElement | null;
    const adviceBox = document.getElementById('calculatorAdvice');

    if (!valInput) return;

    const recalc = () => {
      const val = parseInt(valInput.value, 10) || 0;
      const type = typeSelect ? typeSelect.value : 'story';
      const isEpic = val > 35000 || type === 'epic';

      let deadlineDays = 8;
      let effAnalysis = 2;
      let effDev = 4;
      let effTest = 2;
      let adviceHtml = '';

      if (isEpic) {
        if (typeSelect && typeSelect.value !== 'epic') typeSelect.value = 'epic';
        const numStories = Math.max(3, Math.floor(val / 10000));
        const numBugs = Math.max(1, Math.floor(val / 18000));
        deadlineDays = Math.max(14, Math.round(val / 2500));
        effAnalysis = Math.max(4, Math.round(val / 8000));
        effDev = Math.max(8, Math.round(val / 3500));
        effTest = Math.max(4, Math.round(val / 7000));

        adviceHtml = `
          <div style="font-size:0.78rem; color:#c084fc; font-weight:700;">💎 DEMANDA ÉPICA (Valor superior a R$ 35k)</div>
          <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px; line-height:1.4;">
            Esta demanda é classificada como <strong>ÉPICO</strong>! Pela complexidade de R$ ${val.toLocaleString('pt-BR')}, gerará automaticamente <strong>${numStories} Stories e ${numBugs} Bugs vinculados</strong> no Backlog ao longo do fluxo.
            <br><span style="color:#fbbf24; font-weight:600;">⚠️ Capacidade Fixa:</span> O total de desenvolvedores calculados para o desenvolvimento <strong>não pode ser alterado</strong> (permanece fixo em 3: Lucas, Rafael, Thiago). O squad deve usar o fluxo Kanban para entregar!
          </div>
        `;
      } else if (type === 'docs' || val === 0) {
        deadlineDays = 6;
        effAnalysis = 3;
        effDev = 2;
        effTest = 2;
        adviceHtml = `
          <div style="font-size:0.78rem; color:#f59e0b; font-weight:700;">📄 CRIAÇÃO DE DOCUMENTAÇÃO (Custo Sem Lucro)</div>
          <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px; line-height:1.4;">
            Demandas de documentação geram <strong>apenas custo sem lucro</strong> (R$ 0 de faturamento).
            <br><span style="color:#f87171; font-weight:600;">⚠️ Impacto Financeiro:</span> Quanto mais demorar a entrega de documentos, maior é o custo acumulado (+R$ 180/dia e +R$ 380/dia se atrasar) debitado do caixa ao final!
          </div>
        `;
      } else if (val < 2500) {
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
        deadlineDays = Math.max(3, 6 - Math.floor((val - 4500) / 3000));
        effAnalysis = 3;
        effDev = Math.max(7, Math.round(val / 600));
        effTest = 4;
        adviceHtml = `
          <div style="font-size:0.75rem; color:#f87171; font-weight:700;">🔴 PROJETO CRÍTICO DE ALTO RETORNO</div>
          <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">
            Prazo curto (${deadlineDays} dias) e esforço elevado (${effAnalysis + effDev + effTest} pts).
            Exige especialistas focados em cada etapa para não estourar o SLA.
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
    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'epic' && parseInt(valInput.value, 10) <= 35000) {
          valInput.value = '45000';
        } else if (typeSelect.value === 'story' && parseInt(valInput.value, 10) > 35000) {
          valInput.value = '3500';
        }
        recalc();
      });
    }
    recalc();

    (window as any).setCardPreset = (presetType: string) => {
      const titleInput = document.getElementById('cardTitle') as HTMLInputElement | null;
      const descInput = document.getElementById('cardDesc') as HTMLTextAreaElement | null;
      const classInput = document.getElementById('cardClass') as HTMLSelectElement | null;

      if (presetType === 'standard') {
        if (titleInput) titleInput.value = 'Otimização do Checkout em 1 Clique';
        if (descInput) descInput.value = 'Melhoria no fluxo de pagamento aumentando a taxa de conversão do e-commerce.';
        if (classInput) classInput.value = 'standard';
        if (typeSelect) typeSelect.value = 'story';
        valInput.value = '2500';
      } else if (presetType === 'high-gain') {
        if (titleInput) titleInput.value = 'Nova Engine de Inteligência de Crédito';
        if (descInput) descInput.value = 'Cálculo de risco financeiro com alto valor de retorno e prazo rigoroso.';
        if (classInput) classInput.value = 'fixed-date';
        if (typeSelect) typeSelect.value = 'story';
        valInput.value = '4500';
      } else if (presetType === 'epic') {
        if (titleInput) titleInput.value = 'Nova Plataforma de Pagamentos Multicanal';
        if (descInput) descInput.value = 'Grande iniciativa de R$ 45.000 que gera automaticamente múltiplas histórias e bugs correlacionados no Backlog.';
        if (classInput) classInput.value = 'fixed-date';
        if (typeSelect) typeSelect.value = 'epic';
        valInput.value = '45000';
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

    if (result.gameOver) {
      if (this.autoPlayInterval) {
        clearInterval(this.autoPlayInterval);
        this.autoPlayInterval = null;
        const btn = document.getElementById('btnAutoPlay');
        if (btn) btn.textContent = '▶️ Auto-Play';
      }

      if (result.gameOverReason === 'bankruptcy' && result.score) {
        soundEngine.playWarning();
        this.showBankruptcyModal(result.score);
      } else if (result.gameOverReason === 'completed' && result.score) {
        soundEngine.playTaskComplete();
        this.showScoreboardModal(result.score);
      }
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
      if (this.engine.isGameOver) {
        this.showToast('A simulação já foi encerrada. Reinicie para jogar novamente!', 'warning');
        return;
      }
      this.autoPlayInterval = setInterval(() => {
        if (this.engine.isGameOver) {
          clearInterval(this.autoPlayInterval);
          this.autoPlayInterval = null;
          if (btn) btn.textContent = '▶️ Auto-Play';
          return;
        }
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
    if (dayVal) {
      dayVal.textContent = Math.min(31, this.engine.day).toString();
    }
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

    // Saldo em Caixa (Cash Balance)
    const cashCls = kpis.cash >= 0 ? 'profit' : 'loss';
    const cashSign = kpis.cash < 0 ? '-' : '';
    setVal('kpiCash', `${cashSign}R$ ${Math.abs(kpis.cash).toLocaleString('pt-BR')}`, cashCls);

    // Negative Cash Warning Banner (7-day rule)
    const banner = document.getElementById('negativeCashAlert');
    const alertTitle = document.getElementById('alertCashTitle');
    const alertMsg = document.getElementById('alertCashMsg');
    const negativeDaysBadge = document.getElementById('negativeDaysBadge');

    if (kpis.consecutiveNegativeDays > 0) {
      if (banner) banner.classList.remove('hidden');
      const daysLeft = Math.max(0, kpis.maxNegativeDaysAllowed - kpis.consecutiveNegativeDays);
      if (alertTitle) {
        alertTitle.textContent = `🚨 ALERTA DE CAIXA NEGATIVO (${kpis.consecutiveNegativeDays}/${kpis.maxNegativeDaysAllowed} dias no vermelho)`;
      }
      if (alertMsg) {
        alertMsg.textContent = `A empresa está com saldo devedor de -R$ ${Math.abs(kpis.cash).toLocaleString('pt-BR')}. Se não retornar ao saldo positivo em até ${daysLeft} dia(s), haverá falência por inadimplência com a equipe!`;
      }
      if (negativeDaysBadge) {
        negativeDaysBadge.textContent = daysLeft > 0 ? `Restam ${daysLeft} dia(s) para falência` : `FALÊNCIA IMINENTE`;
      }
    } else {
      if (banner) banner.classList.add('hidden');
    }
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
    el.className = `kanban-card ${card.classOfService} ${card.isEpic ? 'is-epic' : ''} ${card.demandType ? 'demand-' + card.demandType : ''} ${card.isBlocked ? 'is-blocked' : ''}`;
    el.draggable = true;
    el.dataset.id = card.id;

    const classLabels: Record<string, string> = {
      'expedite': '🚨 Expedite (Urgente)',
      'fixed-date': '📅 Data Fixa',
      'standard': '📦 Padrão',
      'tech-debt': '🛠️ Dívida Técnica',
    };

    const typeLabels: Record<string, { label: string; icon: string; css: string }> = {
      epic: { label: 'Épico Estratégico', icon: '💎', css: 'badge-epic' },
      bug: { label: 'Bug / Defeito', icon: '🐛', css: 'badge-bug' },
      support: { label: 'Apoio Suporte', icon: '🎧', css: 'badge-support' },
      docs: { label: 'Documentação', icon: '📄', css: 'badge-docs' },
      story: { label: 'Story (Melhoria)', icon: '💡', css: 'badge-story' },
    };
    const currentType = card.demandType || (card.isEpic ? 'epic' : 'story');
    const typeInfo = typeLabels[currentType] || typeLabels.story;
    const demandBadgeHtml = `<span class="demand-pill ${typeInfo.css}">${typeInfo.icon} ${typeInfo.label}</span>`;

    let epicRelationHtml = '';
    if (card.parentEpicCode) {
      epicRelationHtml = `
        <div class="epic-parent-badge" title="Demanda filha originada pelo Épico ${card.parentEpicCode}: ${card.parentEpicTitle || ''}">
          <span class="epic-link-icon">🔗</span>
          <span class="epic-link-text">Vinculada ao Épico <strong>[${card.parentEpicCode}]</strong></span>
        </div>
      `;
    }

    let epicProgressHtml = '';
    if (card.isEpic) {
      const childStories = this.engine.cards.filter(c => c.parentEpicId === card.id && c.demandType === 'story');
      const childBugs = this.engine.cards.filter(c => c.parentEpicId === card.id && c.demandType === 'bug');
      const childDelivered = childStories.filter(c => c.column === 'deployed').length;
      const totalStories = Math.max(card.epicTotalStories || 0, childStories.length);
      const totalBugs = Math.max(card.epicTotalBugs || 0, childBugs.length);
      const pct = totalStories > 0 ? Math.round((childDelivered / totalStories) * 100) : 0;

      epicProgressHtml = `
        <div class="epic-progress-box">
          <div class="epic-progress-header">
            <span>⚡ Decomposição do Épico no Backlog:</span>
            <span class="epic-progress-stat">${childDelivered}/${totalStories} Stories • ${totalBugs} Bugs</span>
          </div>
          <div class="epic-progress-bar-wrap" title="${pct}% das histórias concluídas">
            <div class="epic-progress-bar-fill" style="width: ${pct}%"></div>
          </div>
          <div class="epic-capacity-note">👥 Squad com 3 Devs fixos calculados</div>
        </div>
      `;
    }

    let deadlineClass = 'ontime';
    let deadlineText = '';

    if (card.column === 'deployed') {
      // Concluída: O tempo para de contar e não aparece como vencida no presente!
      const finishDay = card.completedDay || this.engine.day;
      if (finishDay <= card.deadlineDay) {
        deadlineClass = 'ontime';
        deadlineText = `✅ Concluída no prazo (D${finishDay})`;
      } else {
        const delay = finishDay - card.deadlineDay;
        deadlineClass = 'delayed';
        deadlineText = `⚠️ Concluída com atraso de ${delay}d (D${finishDay})`;
      }
    } else {
      const daysLeft = card.deadlineDay - this.engine.day;
      if (card.demandType === 'docs') {
        if (daysLeft > 0) {
          deadlineClass = 'ontime';
          deadlineText = `Prazo: D${card.deadlineDay} (${daysLeft}d restantes)`;
        } else if (daysLeft === 0) {
          deadlineClass = 'warning';
          deadlineText = `Prazo Documentação: HOJE!`;
        } else {
          deadlineClass = 'delayed';
          deadlineText = `⚠️ Atraso encarecendo entrega (+R$ 380/d)!`;
        }
      } else {
        if (daysLeft > 0) {
          deadlineClass = 'ontime';
          deadlineText = `Prazo: D${card.deadlineDay} (${daysLeft}d restantes)`;
        } else if (daysLeft === 0) {
          deadlineClass = 'warning';
          deadlineText = `Prazo: HOJE! (D${card.deadlineDay})`;
        } else {
          deadlineClass = 'delayed';
          deadlineText = `⚠️ Atrasado há ${Math.abs(daysLeft)}d!`;
        }
      }
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
    if (card.isBlocked && card.column !== 'deployed') {
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

    let valueFooterHtml = '';
    if (card.demandType === 'docs') {
      const isOverdue = card.column !== 'deployed' && this.engine.day > card.deadlineDay;
      const rate = isOverdue ? 380 : 180;
      const accCost = card.accumulatedDocCost || 400;
      valueFooterHtml = `
        <div class="card-value-display docs-value-box">
          <span class="card-value-docs-zero" title="Documentação gera apenas custo sem lucro">R$ 0 (Lucro)</span>
          <span class="card-value-docs-cost" title="Custo acumulado deduzido na entrega">💸 Custo: R$ ${accCost.toLocaleString('pt-BR')} ${card.column !== 'deployed' ? `(+R$ ${rate}/d)` : ''}</span>
        </div>
      `;
    } else {
      valueFooterHtml = `
        <div class="card-value-display">
          <span class="card-value-current">R$ ${card.currentValue.toLocaleString('pt-BR')}</span>
          ${card.accumulatedPenalty > 0 ? `<span class="card-value-original">R$ ${card.baseValue.toLocaleString('pt-BR')}</span>` : ''}
        </div>
      `;
    }

    el.innerHTML = `
      <div class="card-header-line">
        <div class="card-id-class">
          <span class="card-id">${card.code}</span>
          <span class="class-indicator ${card.classOfService}">${classLabels[card.classOfService] || card.classOfService}</span>
        </div>
        ${demandBadgeHtml}
      </div>

      ${epicRelationHtml}

      <div class="card-title">${card.title}</div>
      <div class="card-desc">${card.description}</div>

      ${epicProgressHtml}
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
        ${card.accumulatedPenalty > 0 && card.demandType !== 'docs' ? `<span class="penalty-tag">-R$ ${card.accumulatedPenalty}</span>` : ''}
      </div>

      <!-- Footer: Current Value & Delivery -->
      <div class="card-footer">
        ${valueFooterHtml}
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

  /**
   * Displays the Final Scoreboard Modal (Day 31 End of Cycle)
   */
  public showScoreboardModal(score: GameScore): void {
    const modal = document.getElementById('modalScoreboard');
    const body = document.getElementById('scoreboardBody');
    if (!modal || !body) return;

    const rankColors: Record<string, string> = {
      'S': '#fbbf24',
      'A': '#10b981',
      'B': '#3b82f6',
      'C': '#8b5cf6',
      'D': '#ef4444',
    };
    const rankColor = rankColors[score.rank] || '#10b981';

    body.innerHTML = `
      <div class="scoreboard-hero">
        <div class="score-rank-badge" style="border-color: ${rankColor}; color: ${rankColor};">
          <span class="rank-letter">${score.rank}</span>
          <span class="rank-score">${score.totalScore} pts</span>
        </div>
        <div class="score-hero-details">
          <h3 class="score-title">${score.rankTitle}</h3>
          <p class="score-subtitle">Simulação finalizada com sucesso no encerramento do Dia 30 (Dia ${score.finishedDay}).</p>
        </div>
      </div>

      <div class="score-section-title">💰 Desempenho Financeiro & Caixa</div>
      <div class="score-stat-grid">
        <div class="score-stat-card">
          <span class="stat-label">Saldo Inicial</span>
          <span class="stat-val">R$ ${score.initialCash.toLocaleString('pt-BR')}</span>
        </div>
        <div class="score-stat-card highlight">
          <span class="stat-label">Saldo Final em Caixa</span>
          <span class="stat-val ${score.finalCash >= 0 ? 'profit' : 'loss'}">
            ${score.finalCash < 0 ? '-' : ''}R$ ${Math.abs(score.finalCash).toLocaleString('pt-BR')}
          </span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Lucro Líquido Acumulado</span>
          <span class="stat-val ${score.netProfit >= 0 ? 'profit' : 'loss'}">
            ${score.netProfit >= 0 ? '+' : ''}R$ ${score.netProfit.toLocaleString('pt-BR')}
          </span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Faturamento Total</span>
          <span class="stat-val profit">R$ ${score.totalRevenue.toLocaleString('pt-BR')}</span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Custos com Pessoal</span>
          <span class="stat-val cost">R$ ${score.totalCost.toLocaleString('pt-BR')}</span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Penalidades por Atraso</span>
          <span class="stat-val ${score.totalPenalties > 0 ? 'warning' : 'profit'}">-R$ ${score.totalPenalties.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <div class="score-section-title">📊 Eficiência Operacional & Métricas de Fluxo</div>
      <div class="score-stat-grid">
        <div class="score-stat-card">
          <span class="stat-label">Demandas Entregues</span>
          <span class="stat-val" style="color: #60a5fa;">${score.deliveredCount} itens</span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Entregas no Prazo</span>
          <span class="stat-val profit">${score.onTimeCount} (${score.onTimeRate}%)</span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Entregas com Atraso</span>
          <span class="stat-val ${score.delayedCount > 0 ? 'warning' : 'profit'}">${score.delayedCount} itens</span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Lead Time Médio</span>
          <span class="stat-val">${score.avgLeadTime} dias</span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Throughput Médio</span>
          <span class="stat-val">${score.throughput} /dia</span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">WIP Restante</span>
          <span class="stat-val">${score.wipRemaining} itens</span>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  /**
   * Displays the Bankruptcy Modal (GameOver by 7 Consecutive Negative Cash Days)
   */
  public showBankruptcyModal(score: GameScore): void {
    const modal = document.getElementById('modalBankruptcy');
    const body = document.getElementById('bankruptcyBody');
    if (!modal || !body) return;

    body.innerHTML = `
      <div class="bankruptcy-hero">
        <div class="bankruptcy-icon">🚨</div>
        <div class="bankruptcy-info">
          <h3>Operações Encerradas por Falta de Caixa!</h3>
          <p>
            A empresa operou por <strong>7 dias consecutivos com saldo devedor</strong>.
            Sem capital para honrar os pagamentos diários dos 9 especialistas do squad, as atividades foram
            interrompidas por inadimplência.
          </p>
        </div>
      </div>

      <div class="score-stat-grid" style="margin-top: 1rem;">
        <div class="score-stat-card highlight" style="border-color: #ef4444;">
          <span class="stat-label">Saldo Devedor no Encerramento</span>
          <span class="stat-val loss">-R$ ${Math.abs(score.finalCash).toLocaleString('pt-BR')}</span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Dia da Interrupção</span>
          <span class="stat-val">Dia ${score.finishedDay} de 30</span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Prejuízo Acumulado</span>
          <span class="stat-val loss">R$ ${score.netProfit.toLocaleString('pt-BR')}</span>
        </div>
        <div class="score-stat-card">
          <span class="stat-label">Pontuação do Jogador</span>
          <span class="stat-val">${score.totalScore} pts (${score.rankTitle})</span>
        </div>
      </div>

      <div class="bankruptcy-lesson-box">
        <strong>💡 Lição de Governança Ágil (Little's Law & Cash Flow):</strong>
        <p>
          Controlar limites de WIP (Work In Progress) e focar em finalizar itens antes de puxar novas demandas
          é indispensável para garantir fluxo contínuo de receita e evitar que multas e custos fixos superem os ganhos!
        </p>
      </div>
    `;

    modal.classList.add('active');
  }
}

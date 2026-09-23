/**
 * KANBAN SQUAD UI CONTROLLER
 * DOM binding, Drag & Drop, Team Allocation (Swarming), Dynamic Value/Deadline Calculator,
 * Regression alerts, Modals, and Audio Feedback.
 */

class UIController {
  constructor(engine) {
    this.engine = engine;
    this.draggedCardId = null;
    this.autoPlayInterval = null;
  }

  init() {
    this.bindEvents();
    this.setupNewCardCalculator();
    this.updateAll();
  }

  bindEvents() {
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

    // Reset Button -> Opens In-App Modal (NO window.confirm which is blocked in iframes!)
    const btnReset = document.getElementById('btnResetGame');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.openModal('modalResetConfirm');
      });
    }

    // Modal Confirm Reset Button
    const btnConfirmReset = document.getElementById('btnConfirmReset');
    if (btnConfirmReset) {
      btnConfirmReset.addEventListener('click', () => {
        this.engine.reset();
        this.closeModals();
        this.updateAll();
        if (window.soundEngine) window.soundEngine.playCardDrop();
        this.showToast('Simulação reiniciada para o Dia 1 com sucesso!', 'success');
      });
    }

    // Sound Toggle
    const btnSound = document.getElementById('btnToggleSound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        const enabled = window.soundEngine.toggleSound();
        btnSound.textContent = enabled ? '🔊 Som Ativo' : '🔇 Mudo';
        this.showToast(enabled ? 'Efeitos sonoros ativados.' : 'Efeitos sonoros desativados.', 'info');
      });
    }

    // Modals buttons
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
      btnExportModal.addEventListener('click', () => {
        this.populateExportData();
        this.openModal('modalExport');
      });
    }

    // Form: New Card Submit
    const formCard = document.getElementById('formNewCard');
    if (formCard) {
      formCard.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
          title: document.getElementById('cardTitle').value,
          description: document.getElementById('cardDesc').value,
          classOfService: document.getElementById('cardClass').value,
          deadlineDays: document.getElementById('cardDeadline').value,
          baseValue: document.getElementById('cardValue').value,
          effortAnalysis: document.getElementById('cardEffortAnalysis').value,
          effortDev: document.getElementById('cardEffortDev').value,
          effortTest: document.getElementById('cardEffortTest').value,
        };
        const newCard = this.engine.addCard(data);
        this.closeModals();
        formCard.reset();
        this.setupNewCardCalculator();
        this.updateAll();

        if (newCard.isHighValue) {
          this.showToast(`🔥 Demanda de alto valor [${newCard.code}] adicionada! Devido ao alto retorno, seu prazo é curto e requer alocação de equipe (swarming) para evitar bugs e atrasos.`, 'warning');
        } else {
          this.showToast(`Nova demanda [${newCard.code}] inserida no Backlog!`, 'success');
        }
      });
    }

    // Form: WIP limits submit
    const formWip = document.getElementById('formWipLimits');
    if (formWip) {
      formWip.addEventListener('submit', (e) => {
        e.preventDefault();
        this.engine.wipLimits.ready = parseInt(document.getElementById('wipReady').value, 10) || 3;
        this.engine.wipLimits.analysis = parseInt(document.getElementById('wipAnalysis').value, 10) || 2;
        this.engine.wipLimits.development = parseInt(document.getElementById('wipDevelopment').value, 10) || 3;
        this.engine.wipLimits.testing = parseInt(document.getElementById('wipTesting').value, 10) || 2;
        this.closeModals();
        this.updateAll();
        this.showToast('Novos limites de WIP configurados!', 'success');
      });
    }

    // Setup Drag and Drop Listeners on Columns
    this.setupDragAndDrop();

    // Keyboard Shortcuts (Space bar for Next Day)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.handleNextDay();
      }
    });

    // Close Modals on backdrop or close button
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-close-btn')) {
          this.closeModals();
        }
      });
    });
  }

  setupNewCardCalculator() {
    const valInput = document.getElementById('cardValue');
    const deadlineInput = document.getElementById('cardDeadline');
    const analysisInput = document.getElementById('cardEffortAnalysis');
    const devInput = document.getElementById('cardEffortDev');
    const testInput = document.getElementById('cardEffortTest');
    const adviceBox = document.getElementById('calculatorAdvice');

    if (!valInput) return;

    const recalc = () => {
      const val = parseInt(valInput.value, 10) || 1500;

      // Rule: "Quanto maior o valor, menor é o prazo e mais pessoas precisam ser envolvidas"
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
            Prazo confortável (${deadlineDays} dias). 1 desenvolvedor é suficiente para entregar no prazo. Risco reduzido de regressão.
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
            Exige alocação de <strong>2 especialistas</strong> em pareamento. Chance de 50% de detecção de bugs em QA.
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
            <strong>Exige SWARMING (3 a 4 colaboradores focados)</strong>.
            Gera alto risco (70%) de reprovação em testes e quebra de funcionalidades legadas (Regressão no Sistema)!
          </div>
        `;
      }

      if (deadlineInput) deadlineInput.value = deadlineDays;
      if (analysisInput) analysisInput.value = effAnalysis;
      if (devInput) devInput.value = effDev;
      if (testInput) testInput.value = effTest;
      if (adviceBox) adviceBox.innerHTML = adviceHtml;
    };

    valInput.addEventListener('input', recalc);
    recalc();

    // Preset button triggers
    window.setCardPreset = (type) => {
      const titleInput = document.getElementById('cardTitle');
      const descInput = document.getElementById('cardDesc');
      const classInput = document.getElementById('cardClass');

      if (type === 'standard') {
        if (titleInput) titleInput.value = 'Módulo de Notificações Push';
        if (descInput) descInput.value = 'Envio de alertas em tempo real de promoções no app.';
        if (classInput) classInput.value = 'standard';
        valInput.value = 1800;
      } else if (type === 'high-gain') {
        if (titleInput) titleInput.value = 'Nova Engine de Inteligência de Crédito';
        if (descInput) descInput.value = 'Cálculo de risco financeiro de alto valor com impacto direto na receita.';
        if (classInput) classInput.value = 'fixed-date';
        valInput.value = 4500;
      } else if (type === 'mega-urgent') {
        if (titleInput) titleInput.value = 'Integração com Sistema ERP Global';
        if (descInput) descInput.value = 'Contrato multimilionário com entrega urgente e SLA implacável.';
        if (classInput) classInput.value = 'fixed-date';
        valInput.value = 6500;
      }
      recalc();
    };
  }

  setupDragAndDrop() {
    const columns = document.querySelectorAll('.cards-dropzone');
    columns.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetCol = zone.dataset.column;
        if (this.engine.canMoveTo(targetCol)) {
          zone.classList.add('drag-over');
          zone.classList.remove('drag-forbidden');
        } else {
          zone.classList.add('drag-forbidden');
          zone.classList.remove('drag-over');
        }
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over', 'drag-forbidden');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over', 'drag-forbidden');
        if (this.draggedCardId) {
          const targetCol = zone.dataset.column;
          const result = this.engine.moveCard(this.draggedCardId, targetCol);
          if (!result.success) {
            this.showToast(result.message, 'warning');
            if (window.soundEngine) window.soundEngine.playWarning();
          } else {
            this.updateAll();
          }
          this.draggedCardId = null;
        }
      });
    });
  }

  handleNextDay() {
    const result = this.engine.nextDay();
    this.updateAll();

    if (result.event) {
      this.showEventToast(result.event);
    }
  }

  toggleAutoPlay() {
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

  updateAll() {
    this.renderHeader();
    this.renderSquad();
    this.renderKPIs();
    this.renderBoard();
    this.renderCharts();
  }

  renderHeader() {
    const dayVal = document.getElementById('currentDayValue');
    if (dayVal) dayVal.textContent = this.engine.day;
  }

  renderSquad() {
    const container = document.getElementById('squadMembers');
    if (!container) return;

    container.innerHTML = '';
    Object.values(this.engine.agents).forEach(agent => {
      const card = document.createElement('div');
      card.className = `member-card ${agent.id} ${agent.isAbsent ? 'absent' : ''}`;

      // Show focused assignment if allocated to a card
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
          <span class="member-role">${agent.role}</span>
          ${focusHtml}
        </div>
        <div class="member-dice-result" title="Dado rolado para hoje">
          ${agent.isAbsent ? 'AUS' : '🎲 ' + agent.currentDice}
        </div>
      `;
      container.appendChild(card);
    });
  }

  renderKPIs() {
    const kpis = this.engine.getKPIs();

    const setVal = (id, val, cls) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = val;
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

  renderBoard() {
    const columns = ['backlog', 'ready', 'analysis', 'development', 'testing', 'deployed'];

    columns.forEach(col => {
      const dropzone = document.getElementById(`cards-${col}`);
      const wipBadge = document.getElementById(`wip-${col}`);
      const wipBarFill = document.getElementById(`wipfill-${col}`);
      const colCards = this.engine.cards.filter(c => c.column === col);
      const limit = this.engine.wipLimits[col] || 999;

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

  createCardElement(card) {
    const el = document.createElement('div');
    el.className = `kanban-card ${card.classOfService} ${card.isBlocked ? 'is-blocked' : ''}`;
    el.draggable = true;
    el.dataset.id = card.id;

    const classLabels = {
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

    // Ready for next stage?
    let readyBadge = '';
    if (card.column === 'analysis' && card.doneAnalysis >= card.effortAnalysis) {
      readyBadge = '<div class="ready-next-badge">✨ Análise concluída! Pronto para Dev</div>';
    } else if (card.column === 'development' && card.doneDev >= card.effortDev) {
      readyBadge = '<div class="ready-next-badge">✨ Código concluído! Pronto para Teste</div>';
    } else if (card.column === 'testing' && card.doneTest >= card.effortTest) {
      readyBadge = '<div class="ready-next-badge">✨ Testes aprovados! Pronto para Deploy</div>';
    }

    // Blocked alert
    let blockedBadge = '';
    if (card.isBlocked) {
      blockedBadge = `
        <div class="blocked-banner">
          <span>⛔ Impedimento Externo</span>
          <button class="btn-unblock" onclick="window.uiController.unblockCard('${card.id}')">Desbloquear</button>
        </div>
      `;
    }

    // QA Bug Rejection Banner
    let bugBanner = '';
    if (card.bugRejectionCount > 0 && card.column === 'development') {
      bugBanner = `
        <div class="bug-rejection-banner">
          <span>🚨 Reprovado em QA! Retornou p/ Dev</span>
        </div>
      `;
    }

    // Squad Member Allocation Controls (Swarming)
    const assigned = card.assignedAgents || [];
    const isSwarming = assigned.length >= 2;
    const isDeployed = card.column === 'deployed';

    let allocationHtml = '';
    if (!isDeployed && card.column !== 'backlog') {
      const isAnalystActive = assigned.includes('analyst');
      const isDevFrontActive = assigned.includes('devFront');
      const isDevBackActive = assigned.includes('devBack');
      const isQAActive = assigned.includes('qa');

      allocationHtml = `
        <div class="card-allocation-box">
          <div class="allocation-label-row">
            <span>Alocação de Especialistas:</span>
            ${isSwarming ? `<span class="swarming-pill">⚡ Swarming (${assigned.length} focados)</span>` : ''}
          </div>
          <div class="assigned-agents-selector">
            <button type="button" class="btn-agent-chip ${isAnalystActive ? 'active-analyst' : ''}" 
              title="Alocar Sofia (Discovery/Análise)" onclick="window.uiController.toggleAgentOnCard('analyst', '${card.id}')">
              🔍 Sofia
            </button>
            <button type="button" class="btn-agent-chip ${isDevFrontActive ? 'active-dev-front' : ''}" 
              title="Alocar Lucas (Frontend)" onclick="window.uiController.toggleAgentOnCard('devFront', '${card.id}')">
              💻 Lucas
            </button>
            <button type="button" class="btn-agent-chip ${isDevBackActive ? 'active-dev-back' : ''}" 
              title="Alocar Rafael (Backend/DevOps)" onclick="window.uiController.toggleAgentOnCard('devBack', '${card.id}')">
              ⚙️ Rafael
            </button>
            <button type="button" class="btn-agent-chip ${isQAActive ? 'active-qa' : ''}" 
              title="Alocar Beatriz (QA Specialist)" onclick="window.uiController.toggleAgentOnCard('qa', '${card.id}')">
              🧪 Beatriz
            </button>
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

  toggleAgentOnCard(agentId, cardId) {
    this.engine.toggleAgentAssignment(agentId, cardId);
    if (window.soundEngine) window.soundEngine.playCardDrop();
    this.updateAll();

    const agent = this.engine.agents[agentId];
    const card = this.engine.cards.find(c => c.id === cardId);
    if (agent && card) {
      if (card.assignedAgents && card.assignedAgents.includes(agentId)) {
        this.showToast(`${agent.name} (${agent.role}) alocado(a) no cartão [${card.code}]. Seus pontos diários focarão nesta demanda!`, 'info');
      } else {
        this.showToast(`${agent.name} liberado(a) de [${card.code}] para apoio geral.`, 'info');
      }
    }
  }

  unblockCard(cardId) {
    if (this.engine.unblockCard(cardId)) {
      this.showToast('Impedimento resolvido! Cartão liberado para avanço.', 'success');
      this.updateAll();
    }
  }

  renderCharts() {
    if (!window.chartsEngine) return;
    window.chartsEngine.renderCFD('cfdChartCanvas', this.engine.cfdHistory);
    window.chartsEngine.renderLeadTime('leadTimeChartCanvas', this.engine.cards.filter(c => c.column === 'deployed'));
    window.chartsEngine.renderFinancial('financialChartCanvas', this.engine.financial.history);
    window.chartsEngine.renderThroughput('throughputChartCanvas', this.engine.dailyDelivered);
  }

  showToast(message, type = 'info') {
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

  showEventToast(event) {
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

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('is-open');
  }

  closeModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('is-open'));
  }

  populateWipModal() {
    const setV = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setV('wipReady', this.engine.wipLimits.ready);
    setV('wipAnalysis', this.engine.wipLimits.analysis);
    setV('wipDevelopment', this.engine.wipLimits.development);
    setV('wipTesting', this.engine.wipLimits.testing);
  }

  populateExportData() {
    const area = document.getElementById('exportJsonTextarea');
    if (area) {
      const state = {
        day: this.engine.day,
        wipLimits: this.engine.wipLimits,
        cards: this.engine.cards,
        financial: this.engine.financial,
        cfdHistory: this.engine.cfdHistory,
        dailyDelivered: this.engine.dailyDelivered,
        eventsHistory: this.engine.eventsHistory,
      };
      area.value = JSON.stringify(state, null, 2);
    }
  }

  importData() {
    const area = document.getElementById('exportJsonTextarea');
    if (!area) return;
    try {
      const state = JSON.parse(area.value);
      if (state.day && Array.isArray(state.cards)) {
        this.engine.day = state.day;
        this.engine.wipLimits = state.wipLimits || this.engine.wipLimits;
        this.engine.cards = state.cards;
        this.engine.financial = state.financial || this.engine.financial;
        this.engine.cfdHistory = state.cfdHistory || [];
        this.engine.dailyDelivered = state.dailyDelivered || [];
        this.engine.eventsHistory = state.eventsHistory || [];

        this.closeModals();
        this.updateAll();
        this.showToast('Estado do jogo importado com sucesso!', 'success');
      } else {
        this.showToast('Formato JSON inválido para a simulação.', 'warning');
      }
    } catch (e) {
      this.showToast('Erro ao processar JSON: ' + e.message, 'warning');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.uiController = new UIController(window.kanbanEngine);
  window.uiController.init();
});

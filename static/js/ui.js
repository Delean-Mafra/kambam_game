/**
 * ===================================================================================
 * KANBAN EV - INTERFACE DO USUÁRIO
 * ===================================================================================
 * 
 * Este arquivo contém toda a lógica de interação com o usuário:
 * - Drag and Drop de cartões
 * - Renderização do quadro Kanban
 * - Modais e formulários
 * - Toasts e notificações
 * - Atualizações da UI
 * 
 * ===================================================================================
 */

// ===================================================================================
// INICIALIZAÇÃO
// ===================================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Kanban EV - Iniciando UI...');
    
    // Inicializar jogo
    initGame();
    
    // Inicializar gráficos
    Charts.init();
    
    // Renderizar UI inicial
    renderBoard();
    updateStats();
    updateHistory();
    Charts.updateAll(getGameState());
    
    // Configurar event listeners
    setupEventListeners();
    
    // Mostrar toast de boas-vindas
    showToast('Bem-vindo ao Kanban EV!', 'info');
    
    updateGameStatus('Pronto para jogar');
});

// ===================================================================================
// EVENT LISTENERS
// ===================================================================================

function setupEventListeners() {
    // Botão Próximo Dia
    document.getElementById('btnNextDay').addEventListener('click', handleNextDay);
    
    // Botão Reiniciar
    document.getElementById('btnRestart').addEventListener('click', handleRestart);
    
    // Botão Ajuda
    document.getElementById('btnHelp').addEventListener('click', () => openModal('modalHelp'));
    
    // Botão Adicionar Cartão
    document.getElementById('btnAddCard').addEventListener('click', () => {
        document.getElementById('formCard').reset();
        document.getElementById('modalCardTitle').textContent = 'Adicionar Cartão';
        openModal('modalCard');
    });
    
    // Formulário de cartão
    document.getElementById('formCard').addEventListener('submit', handleAddCard);
    document.getElementById('btnCancelCard').addEventListener('click', () => closeModal('modalCard'));
    
    // Export/Import
    document.getElementById('btnExportState').addEventListener('click', handleExport);
    document.getElementById('btnImportState').addEventListener('click', () => openModal('modalImport'));
    document.getElementById('btnCopyExport').addEventListener('click', handleCopyExport);
    document.getElementById('btnConfirmImport').addEventListener('click', handleImport);
    
    // Fechar modais
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });
    
    // Fechar modal ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
    
    // Tecla Escape para fechar modais
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
    
    // Configurar drag and drop
    setupDragAndDrop();
}

// ===================================================================================
// HANDLERS
// ===================================================================================

/**
 * Processa o próximo dia
 */
function handleNextDay() {
    const state = getGameState();
    if (state) {
        const warnings = getUnallocatedSpecialistsWarnings(state);
        if (warnings.length > 0) {
            const message =
                '⚠️ Existem especialistas sem tarefa alocada para hoje:\n\n' +
                warnings.join('\n') +
                '\n\nDeseja realmente prosseguir para o próximo dia?';

            const ok = confirm(message);
            if (!ok) {
                return;
            }
        }
    }

    const btn = document.getElementById('btnNextDay');
    btn.disabled = true;
    btn.textContent = '⏳ Processando...';
    
    setTimeout(() => {
        const result = processDay();
        
        if (result) {
            // Atualizar UI
            renderBoard();
            updateStats();
            updateHistory();
            updateDiceDisplay(result.diceResults);
            Charts.updateAll(getGameState());
            
            // Feedback visual
            showToast(`Dia ${result.day} processado!`, 'success');
            
            // Mostrar resultados dos dados
            showDiceResults(result.diceResults);
            
            updateGameStatus(`Dia ${result.day} - Em andamento`);
        }
        
        btn.disabled = false;
        btn.textContent = '🎲 Próximo Dia';
    }, 500);
}

/**
 * Retorna avisos de especialistas não alocados (por coluna de trabalho).
 * Considera o máximo definido em CONFIG.MAX_SPECIALISTS_PER_COLUMN.
 */
function getUnallocatedSpecialistsWarnings(state) {
    const warnings = [];

    // Mapeia colunas de trabalho para comparar contra o limite
    const workColumns = CONFIG.WORK_COLUMNS || [];
    const maxPerColumn = CONFIG.MAX_SPECIALISTS_PER_COLUMN;

    if (!maxPerColumn || workColumns.length === 0) {
        return warnings;
    }

    workColumns.forEach(column => {
        const cardsInColumn = state.cards.filter(c => c.currentColumn === column);
        if (cardsInColumn.length === 0) {
            // Sem cards na coluna: nunca alerta
            return;
        }

        let allocatedTotal = 0;
        const zeroAllocatedCards = [];

        cardsInColumn.forEach(card => {
            const allocatedForCard = state.specialistAllocations?.[card.id]?.[column] || 0;
            allocatedTotal += allocatedForCard;
            if (allocatedForCard === 0) {
                zeroAllocatedCards.push(card);
            }
        });

        const available = Math.max(0, maxPerColumn - allocatedTotal);

        // Só alerta se:
        // 1) existe pelo menos um card sem especialista na coluna
        // 2) existe especialista disponível (não alocado em nenhum outro card da coluna)
        if (available > 0 && zeroAllocatedCards.length > 0) {
            warnings.push(
                `- ${getColumnName(column)}: ${zeroAllocatedCards.length} card(s) sem especialista e ${available} especialista(s) disponível(is)`
            );
        }
    });

    return warnings;
}

/**
 * Reinicia o jogo
 */
function handleRestart() {
    if (confirm('Tem certeza que deseja reiniciar o jogo? Todo o progresso será perdido.')) {
        restartGame();
        renderBoard();
        updateStats();
        updateHistory();
        Charts.init();
        Charts.updateAll(getGameState());
        
        // Reset dice display
        document.querySelectorAll('.agent-dice').forEach(el => el.textContent = '-');
        document.querySelectorAll('.last-dice').forEach(el => el.textContent = '-');
        
        showToast('Jogo reiniciado!', 'info');
        updateGameStatus('Pronto para jogar');
    }
}

/**
 * Adiciona um novo cartão
 */
function handleAddCard(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const cardData = {
        title: formData.get('title'),
        description: formData.get('description'),
        effort: formData.get('effort'),
        value: formData.get('value'),
        priority: formData.get('priority'),
        category: formData.get('category')
    };
    
    const card = addCard(cardData);
    
    renderBoard();
    updateStats();
    updateHistory();
    
    closeModal('modalCard');
    showToast(`Cartão "${card.title}" adicionado!`, 'success');
}

/**
 * Exporta estado do jogo
 */
function handleExport() {
    const json = exportGameState();
    document.getElementById('exportData').value = json;
    document.getElementById('modalExportTitle').textContent = '📤 Exportar Estado';
    openModal('modalExport');
}

/**
 * Copia estado exportado
 */
function handleCopyExport() {
    const textarea = document.getElementById('exportData');
    textarea.select();
    document.execCommand('copy');
    showToast('Estado copiado para a área de transferência!', 'success');
}

/**
 * Importa estado do jogo
 */
function handleImport() {
    const json = document.getElementById('importData').value;
    
    if (!json.trim()) {
        showToast('Cole o JSON do estado do jogo', 'warning');
        return;
    }
    
    const result = importGameState(json);
    
    if (result.success) {
        renderBoard();
        updateStats();
        updateHistory();
        Charts.updateAll(getGameState());
        
        closeModal('modalImport');
        showToast('Estado importado com sucesso!', 'success');
    } else {
        showToast(`Erro: ${result.reason}`, 'error');
    }
}

// ===================================================================================
// DRAG AND DROP
// ===================================================================================

let draggedCard = null;
let sourceColumn = null;

function setupDragAndDrop() {
    // Configurar após renderização do board
    document.querySelectorAll('.cards-container').forEach(container => {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('drop', handleDrop);
        container.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    draggedCard = e.target;
    sourceColumn = e.target.closest('.cards-container').id;
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.cardId);
    
    // Highlight de colunas válidas
    highlightValidColumns(sourceColumn);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedCard = null;
    sourceColumn = null;
    
    // Remover highlights
    document.querySelectorAll('.cards-container').forEach(container => {
        container.classList.remove('drag-over', 'blocked');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const container = e.target.closest('.cards-container');
    if (container && !container.classList.contains('blocked')) {
        container.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const container = e.target.closest('.cards-container');
    if (container) {
        container.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    
    const container = e.target.closest('.cards-container');
    if (!container) return;
    
    container.classList.remove('drag-over');
    
    const cardId = e.dataTransfer.getData('text/plain');
    const toColumn = container.id;
    
    if (sourceColumn === toColumn) return;
    
    // Tentar mover cartão
    const result = moveCard(cardId, toColumn);
    
    if (result.success) {
        renderBoard();
        updateStats();
        updateHistory();
        Charts.updateAll(getGameState());
        showToast(`Cartão movido para ${getColumnName(toColumn)}`, 'success');
    } else {
        showToast(result.reason, 'warning');
        // Animação de shake no cartão
        const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardEl) {
            cardEl.style.animation = 'shake 0.5s';
            setTimeout(() => cardEl.style.animation = '', 500);
        }
    }
}

function highlightValidColumns(fromColumn) {
    const fromIndex = CONFIG.COLUMN_ORDER.indexOf(fromColumn);
    const state = getGameState();
    
    CONFIG.COLUMN_ORDER.forEach((col, index) => {
        const container = document.getElementById(col);
        if (!container) return;
        
        // Verificar se movimento é válido
        const validation = Rules.validateMove(fromColumn, col, state);
        
        if (!validation.valid && col !== fromColumn) {
            container.classList.add('blocked');
        }
    });
}

// ===================================================================================
// RENDERIZAÇÃO
// ===================================================================================

/**
 * Renderiza o quadro Kanban completo
 */
function renderBoard() {
    const state = getGameState();
    
    CONFIG.COLUMN_ORDER.forEach(column => {
        renderColumn(column, state);
    });
    
    // Atualizar contadores de WIP
    updateWIPIndicators(state);
}

/**
 * Renderiza uma coluna específica
 */
function renderColumn(columnId, state) {
    const container = document.getElementById(columnId);
    if (!container) return;
    
    // Limpar container
    container.innerHTML = '';
    
    // Filtrar cartões da coluna
    const cards = state.cards.filter(c => c.currentColumn === columnId);
    
    // Ordenar por prioridade
    cards.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
    
    // Renderizar cartões
    cards.forEach(card => {
        container.appendChild(createCardElement(card, state.day, state));
    });
    
    // Atualizar contador
    const columnEl = document.querySelector(`[data-column="${columnId}"]`);
    if (columnEl) {
        const countEl = columnEl.querySelector('.card-count');
        if (countEl) countEl.textContent = cards.length;
    }
}

/**
 * Cria elemento HTML de um cartão
 */
function createCardElement(card, currentDay, state) {
    const cardEl = document.createElement('div');
    cardEl.className = `card priority-${card.priority}`;
    cardEl.draggable = true;
    cardEl.dataset.cardId = card.id;
    
    // Verificar se está parado
    if (Rules.isStale(card, currentDay)) {
        cardEl.classList.add('stale');
    }
    
    // Adicionar classe para bugs
    if (card.hasBug) {
        cardEl.classList.add('has-bug');
    }
    
    // Adicionar classe para deployed
    if (card.currentColumn === 'deployed') {
        cardEl.classList.add('deployed');
    }
    
    // Calcular progresso
    const progress = card.effortRequired > 0 
        ? Math.min(100, (card.effortDone / card.effortRequired) * 100)
        : 0;
    
    // Dias desde última movimentação
    const daysInColumn = currentDay - card.lastMovedDay;
    
    // Verificar criticidade
    const criticality = card.deadline ? Rules.calculateCriticality(card.value, currentDay, card.deadline) : 'low';
    const daysUntilDeadline = card.deadline ? card.deadline - currentDay : null;
    
    // Badge de "Pronto para Entrega"
    let readyBadge = '';
    if (card.readyForDeployment && card.currentColumn !== 'deployed') {
        readyBadge = '<div class="ready-badge">✅ Pronto para Entrega</div>';
    }
    
    // Indicador de bug
    let bugIndicator = '';
    if (card.hasBug) {
        bugIndicator = '<div class="bug-indicator">🐛 Bug Detectado</div>';
    }
    
    // Indicador de deadline
    let deadlineIndicator = '';
    if (daysUntilDeadline !== null && card.currentColumn !== 'deployed') {
        const deadlineClass = criticality === 'urgent' ? 'deadline-urgent' : 
                             criticality === 'high' ? 'deadline-high' : 
                             criticality === 'medium' ? 'deadline-medium' : 'deadline-low';
        const deadlineText = daysUntilDeadline > 0 ? `${daysUntilDeadline} dias restantes` : 
                            daysUntilDeadline === 0 ? 'Prazo hoje!' : 
                            `${Math.abs(daysUntilDeadline)} dias de atraso`;
        deadlineIndicator = `<div class="deadline-indicator ${deadlineClass}">⏰ ${deadlineText}</div>`;
    }
    
    // Controles de alocação de especialistas (apenas para colunas de trabalho)
    let specialistControls = '';
    if (CONFIG.WORK_COLUMNS.includes(card.currentColumn)) {
        const currentAllocation = state?.specialistAllocations?.[card.id]?.[card.currentColumn] || 0;
        specialistControls = `
            <div class="specialist-controls">
                <button class="specialist-btn" onclick="adjustSpecialists('${card.id}', '${card.currentColumn}', -1)">-</button>
                <span class="specialist-count">👥 ${currentAllocation}</span>
                <button class="specialist-btn" onclick="adjustSpecialists('${card.id}', '${card.currentColumn}', 1)">+</button>
            </div>
        `;
    }
    
    // Mostrar valor final se deployed com penalty
    const valueDisplay = card.currentColumn === 'deployed' && card.finalValue !== undefined
        ? `<span class="card-value ${card.finalValue < card.value ? 'penalty' : ''}">💰 R$ ${card.finalValue} ${card.finalValue < card.value ? '(Penalizado)' : ''}</span>`
        : `<span class="card-value">💰 R$ ${card.value}</span>`;
    
    cardEl.innerHTML = `
        <span class="card-category ${card.category}">${CONFIG.CATEGORIES[card.category]?.label || card.category}</span>
        ${readyBadge}
        ${bugIndicator}
        ${deadlineIndicator}
        <div class="card-header">
            <span class="card-id">${card.id}</span>
            <div class="card-title">${escapeHtml(card.title)}</div>
        </div>
        <div class="card-body">
            ${card.currentColumn !== 'backlog' && card.currentColumn !== 'deployed' ? `
                <div class="card-progress">
                    <div class="card-progress-bar" style="width: ${progress}%"></div>
                </div>
            ` : ''}
            <div class="card-stats">
                <span class="card-effort">⚡ ${card.effortDone}/${card.effortRequired}</span>
                ${valueDisplay}
            </div>
            ${daysInColumn > 0 ? `<span class="card-days">📅 ${daysInColumn} dia(s) aqui</span>` : ''}
            ${specialistControls}
        </div>
    `;
    
    // Event listeners de drag
    cardEl.addEventListener('dragstart', handleDragStart);
    cardEl.addEventListener('dragend', handleDragEnd);
    
    return cardEl;
}

/**
 * Atualiza indicadores de WIP
 */
function updateWIPIndicators(state) {
    CONFIG.COLUMN_ORDER.forEach(column => {
        const columnEl = document.querySelector(`[data-column="${column}"]`);
        if (!columnEl) return;
        
        const wipBar = columnEl.querySelector('.wip-bar');
        if (!wipBar) return;
        
        const count = state.cards.filter(c => c.currentColumn === column).length;
        const limit = CONFIG.WIP_LIMITS[column];
        
        if (limit === Infinity) return;
        
        const percentage = (count / limit) * 100;
        wipBar.style.setProperty('--wip-percentage', `${percentage}%`);
        wipBar.querySelector('::after')?.style?.setProperty('width', `${percentage}%`);
        
        // Remover classes anteriores
        wipBar.classList.remove('warning', 'danger');
        
        // Adicionar classe apropriada
        if (percentage >= 100) {
            wipBar.classList.add('danger');
        } else if (percentage >= 75) {
            wipBar.classList.add('warning');
        }
        
        // Atualizar barra via pseudo-elemento
        wipBar.style.background = `linear-gradient(to right, 
            ${percentage >= 100 ? '#dc3545' : percentage >= 75 ? '#ffc107' : '#28a745'} ${percentage}%, 
            rgba(255,255,255,0.1) ${percentage}%)`;
    });
}

// ===================================================================================
// ATUALIZAÇÕES DE UI
// ===================================================================================

/**
 * Atualiza estatísticas
 */
function updateStats() {
    const state = getGameState();
    const metrics = Rules.calculateMetrics(state);
    
    document.getElementById('currentDay').textContent = state.day;
    document.getElementById('totalValue').textContent = `R$ ${metrics.totalValue}`;
    document.getElementById('totalCost').textContent = `R$ ${metrics.totalCost}`;
    
    const profitEl = document.getElementById('profit');
    profitEl.textContent = `R$ ${metrics.profit}`;
    profitEl.className = `stat-value ${metrics.profit >= 0 ? 'positive' : 'negative'}`;
    
    document.getElementById('avgLeadTime').textContent = `${metrics.avgLeadTime} dias`;
    document.getElementById('throughput').textContent = `${metrics.throughput} / dia`;
    document.getElementById('blockedCount').textContent = metrics.blockedCount;
}

/**
 * Atualiza histórico
 */
function updateHistory() {
    const state = getGameState();
    const historyList = document.getElementById('historyList');
    
    if (state.history.length === 0) {
        historyList.innerHTML = '<p class="history-empty">Nenhuma ação ainda...</p>';
        return;
    }
    
    historyList.innerHTML = state.history.slice(0, 50).map(entry => `
        <div class="history-item">
            <span class="day">Dia ${entry.day}</span>
            <span class="action">${escapeHtml(entry.action)}</span>
            ${entry.details ? `<span class="details">${escapeHtml(entry.details)}</span>` : ''}
        </div>
    `).join('');
}

/**
 * Atualiza display dos dados
 */
function updateDiceDisplay(diceResults) {
    const state = window.GameState;
    
    Object.entries(diceResults).forEach(([agent, dice]) => {
        // Verificar se está ausente
        const isAbsent = state && state.agentAbsences[agent] > 0;
        
        // Slot do agente na coluna
        const slotId = agent + 'Dice';
        const slotEl = document.getElementById(slotId);
        if (slotEl) {
            if (isAbsent) {
                slotEl.textContent = `⚠️ Ausente (${state.agentAbsences[agent]}d)`;
                slotEl.classList.add('agent-absent');
            } else {
                slotEl.textContent = `🎲 ${dice}`;
                slotEl.classList.remove('agent-absent');
                slotEl.classList.add('animate-dice');
                setTimeout(() => slotEl.classList.remove('animate-dice'), 1000);
            }
        }
        
        // Atualizar agent-slot visual
        const agentSlot = document.querySelector(`.agent-slot[data-agent-type="${agent}"]`);
        if (agentSlot) {
            if (isAbsent) {
                agentSlot.classList.add('absent');
            } else {
                agentSlot.classList.remove('absent');
            }
        }
        
        // Painel da equipe
        const teamEl = document.getElementById(`team${capitalize(agent)}`);
        if (teamEl) {
            const diceSpan = teamEl.querySelector('.last-dice');
            if (diceSpan) {
                if (isAbsent) {
                    diceSpan.textContent = '⚠️';
                } else {
                    diceSpan.textContent = dice;
                }
            }
        }
    });
}

/**
 * Mostra resultados dos dados
 */
function showDiceResults(diceResults) {
    let message = 'Dados: ';
    Object.entries(diceResults).forEach(([agent, dice]) => {
        const agentConfig = CONFIG.AGENT_EFFICIENCY[agent];
        message += `${agentConfig.name}: ${dice}  `;
    });
    
    showToast(message, 'info', 3000);
}

/**
 * Atualiza status do jogo
 */
function updateGameStatus(status) {
    document.getElementById('gameStatus').textContent = status;
}

// ===================================================================================
// MODAIS
// ===================================================================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        
        // Focar no primeiro input
        const firstInput = modal.querySelector('input, textarea, button');
        if (firstInput) firstInput.focus();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
}

// ===================================================================================
// ALOCAÇÃO DE ESPECIALISTAS
// ===================================================================================

/**
 * Ajusta quantidade de especialistas alocados em um cartão
 */
function adjustSpecialists(cardId, column, delta) {
    const state = getGameState();
    if (!state) return;
    
    const currentAllocation = state.specialistAllocations[cardId]?.[column] || 0;
    const newCount = Math.max(0, Math.min(CONFIG.MAX_SPECIALISTS_PER_COLUMN, currentAllocation + delta));
    
    const result = allocateSpecialists(cardId, column, newCount);
    
    if (result.success) {
        renderBoard();
        showToast(`Alocados ${newCount} especialista(s)`, 'success', 2000);
    } else {
        showToast(result.reason, 'error');
    }
}

// ===================================================================================
// TOASTS (NOTIFICAÇÕES)
// ===================================================================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;
    
    container.appendChild(toast);
    
    // Remover após duração
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Adicionar animação de saída ao CSS via JS
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .animate-dice {
        animation: diceRoll 0.5s ease;
    }
    
    @keyframes diceRoll {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); color: #ffc107; }
    }
`;
document.head.appendChild(style);

// ===================================================================================
// UTILITÁRIOS
// ===================================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Exportar para uso global
window.showToast = showToast;
window.renderBoard = renderBoard;
window.updateStats = updateStats;

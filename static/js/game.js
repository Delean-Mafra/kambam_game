/**
 * ===================================================================================
 * KANBAN EV - LÓGICA PRINCIPAL DO JOGO
 * ===================================================================================
 * 
 * Este arquivo contém toda a lógica do jogo, incluindo:
 * - Estado do jogo (GameState)
 * - Processamento de dias/turnos
 * - Movimentação de cartões
 * - Cálculo de trabalho
 * - Histórico de ações
 * 
 * IMPORTANTE: Recarregar a página ZERA todo o estado do jogo.
 * Não há persistência - use Export/Import para salvar manualmente.
 * 
 * ===================================================================================
 */

// ===================================================================================
// ESTADO DO JOGO
// ===================================================================================

/**
 * Estado global do jogo
 * Reinicializado a cada refresh da página
 */
let GameState = {
    day: 0,
    cards: [],
    agents: {},
    specialistAllocations: {},  // { cardId: { analysis: 1, development: 2, testing: 1 } }
    agentAbsences: {},          // { analyst: 0, developer: 2, tester: 0 } - dias restantes de ausência
    history: [],
    metrics: {
        cfd: [],            // Cumulative Flow Diagram data
        leadTimes: [],      // Lead times de cartões completados
        financial: [],      // Dados financeiros por dia
        throughput: []      // Throughput por dia
    },
    diceResults: {},        // Resultados dos dados do dia atual
    dailyCostHistory: [],   // Histórico de custos diários
    isRunning: false
};

// ===================================================================================
// INICIALIZAÇÃO DO JOGO
// ===================================================================================

/**
 * Inicializa um novo jogo
 */
function initGame() {
    console.log('🎮 Inicializando Kanban EV...');
    
    // Reset do estado
    GameState = {
        day: 0,
        cards: [],
        agents: {
            analyst: { type: 'analyst', lastDice: 0, available: true },
            developer: { type: 'developer', lastDice: 0, available: true },
            tester: { type: 'tester', lastDice: 0, available: true }
        },
        specialistAllocations: {}, // { cardId: { analysis: 1, development: 2, testing: 1 } }
        agentAbsences: {           // Dias restantes de ausência
            analyst: 0,
            developer: 0,
            tester: 0
        },
        history: [],
        metrics: {
            cfd: [],
            leadTimes: [],
            financial: [],
            throughput: []
        },
        diceResults: {},
        dailyCostHistory: [],
        isRunning: true
    };

    // Manter referência global sempre apontando para o estado atual
    if (typeof window !== 'undefined') {
        window.GameState = GameState;
    }
    
    // Criar cartões iniciais a partir do seed
    GameState.cards = SAMPLE_CARDS.map((card, index) => {
        const effort = card.effort;
        const value = card.value;
        const deadline = Rules.calculateDeadline(value, effort);
        const priority = Rules.calculateCriticality(value);
        
        return {
            ...card,
            id: card.id || `C${String(index + 1).padStart(3, '0')}`,
            currentColumn: 'backlog',
            effortRequired: effort,
            effortDone: 0,
            priority: priority,
            originalPriority: card.priority || priority,
            value: value,
            originalValue: value,
            finalValue: value,
            deadline: deadline,
            createdDay: 0,
            startedDay: null,
            completedDay: null,
            lastMovedDay: 0,
            hasBug: false,
            readyForDeployment: false
        };
    });
    
    // Registrar estado inicial do CFD
    recordCFD();
    
    // Adicionar entrada no histórico
    addHistory('system', 'Jogo iniciado', `${GameState.cards.length} cartões no backlog`);
    
    console.log('✅ Jogo inicializado com', GameState.cards.length, 'cartões');
    
    return GameState;
}

// ===================================================================================
// PROCESSAMENTO DE DIA
// ===================================================================================

/**
 * Processa um dia de trabalho
 * - Rola dados para cada agente
 * - Aplica trabalho aos cartões em progresso
 * - Atualiza métricas
 * - Processa eventos aleatórios
 */
function processDay() {
    if (!GameState.isRunning) {
        console.warn('⚠️ Jogo não está rodando');
        return null;
    }
    
    // Incrementar dia
    GameState.day++;
    
    console.log(`📅 Processando Dia ${GameState.day}...`);
    
    // Processar ausências de especialistas
    processAbsences();
    
    // Gerar eventos aleatórios
    const events = generateRandomEvents();
    
    // Rolar dados para cada agente disponível
    const diceResults = {};
    Object.keys(GameState.agents).forEach(agentType => {
        if (GameState.agentAbsences[agentType] > 0) {
            diceResults[agentType] = 0; // Ausente não rola dado
        } else {
            const dice = rollDice();
            diceResults[agentType] = dice;
            GameState.agents[agentType].lastDice = dice;
        }
    });
    
    GameState.diceResults = diceResults;
    
    // Processar trabalho em cada coluna de trabalho
    const workReport = [];
    
    CONFIG.WORK_COLUMNS.forEach(column => {
        const cardsInColumn = GameState.cards.filter(c => c.currentColumn === column);
        
        if (cardsInColumn.length === 0) return;
        
        // Determinar qual agente trabalha nesta coluna
        let agentType;
        if (column === 'analysis') agentType = 'analyst';
        else if (column === 'development') agentType = 'developer';
        else if (column === 'testing') agentType = 'tester';
        
        // Verificar se agente está disponível
        if (GameState.agentAbsences[agentType] > 0) {
            addHistory('absence', `${CONFIG.AGENT_EFFICIENCY[agentType].name} ausente`, 
                `Indisponível por mais ${GameState.agentAbsences[agentType]} dia(s)`);
            return;
        }
        
        const dice = diceResults[agentType];
        
        // Processar cada cartão na coluna
        cardsInColumn.forEach(card => {
            const specialistCount = GameState.specialistAllocations[card.id]?.[column] || 0;
            
            if (specialistCount === 0) return; // Sem especialistas alocados
            
            const work = Rules.calculateWork(agentType, column, dice, specialistCount);
            const previousEffort = card.effortDone;
            card.effortDone = Math.min(card.effortRequired, card.effortDone + work);
            const actualWork = card.effortDone - previousEffort;
            
            workReport.push({
                agent: CONFIG.AGENT_EFFICIENCY[agentType].name,
                card: card.title,
                dice: dice,
                specialists: specialistCount,
                work: actualWork,
                progress: `${card.effortDone}/${card.effortRequired}`
            });
            
            // Verificar se cartão está pronto para mover
            if (card.effortDone >= card.effortRequired) {
                // Se for teste, verificar se detecta bug
                if (column === 'testing' && !card.hasBug && Math.random() < CONFIG.EVENTS.TESTER_BUG_DETECTION) {
                    card.hasBug = true;
                    card.effortDone = 0; // Reset para correção
                    card.currentColumn = 'development'; // Volta para desenvolvimento
                    card.lastMovedDay = GameState.day;
                    
                    // Limpar alocação de tester
                    if (GameState.specialistAllocations[card.id]) {
                        GameState.specialistAllocations[card.id]['testing'] = 0;
                    }
                    
                    addHistory('bug', `🐛 Bug detectado em "${card.title}"`, 
                        'Testador identificou problema - retornando para desenvolvimento');
                } else {
                    addHistory('work', `"${card.title}" pronto para avançar`, 
                        `Trabalho completo na etapa ${getColumnName(column)}`);
                    
                    // Marcar como pronto para deployment se passou por todas as etapas
                    if (column === 'testing' && !card.hasBug) {
                        card.readyForDeployment = true;
                    }
                }
            }
        });
    });
    
    // Calcular custo do dia
    const dailyCost = calculateDailyCost();
    GameState.dailyCostHistory.push(dailyCost);
    
    // Registrar métricas
    recordCFD();
    recordFinancial();
    recordThroughput();
    
    // Adicionar ao histórico
    const diceStr = Object.entries(diceResults)
        .map(([agent, dice]) => `${CONFIG.AGENT_EFFICIENCY[agent].name}: 🎲${dice}`)
        .join(', ');
    
    addHistory('dice', `Dia ${GameState.day}`, diceStr);
    
    // Reportar eventos
    events.forEach(event => {
        addHistory(event.type, event.title, event.description);
    });
    
    workReport.forEach(w => {
        addHistory('work', `${w.agent} (${w.specialists}x) trabalhou em "${w.card}"`, 
            `Dado: ${w.dice}, Progresso: ${w.progress}`);
    });
    
    console.log('✅ Dia processado:', { diceResults, workReport, events });
    
    return {
        day: GameState.day,
        diceResults,
        workReport,
        events,
        dailyCost
    };
}

/**
 * Rola um dado de 6 lados
 * @returns {number} Valor de 1 a 6
 */
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

/**
 * Processa ausências de especialistas (decrementa contador)
 */
function processAbsences() {
    Object.keys(GameState.agentAbsences).forEach(agentType => {
        if (GameState.agentAbsences[agentType] > 0) {
            GameState.agentAbsences[agentType]--;
            if (GameState.agentAbsences[agentType] === 0) {
                GameState.agents[agentType].available = true;
                addHistory('info', `${CONFIG.AGENT_EFFICIENCY[agentType].name} retornou`, 
                    'Especialista disponível novamente');
            }
        }
    });
}

/**
 * Gera eventos aleatórios (bugs, ausências)
 */
function generateRandomEvents() {
    const events = [];
    
    // Chance de gerar bug
    if (Math.random() < CONFIG.EVENTS.BUG_CHANCE_PER_DAY) {
        const bugCard = createBugCard();
        GameState.cards.push(bugCard);
        events.push({
            type: 'bug',
            title: '🐛 Novo Bug Identificado',
            description: `Card de bug "${bugCard.title}" adicionado ao backlog`
        });
    }
    
    // Chance de ausência de especialista
    if (Math.random() < CONFIG.EVENTS.ABSENCE_CHANCE_PER_DAY) {
        const agentTypes = Object.keys(GameState.agents);
        const availableAgents = agentTypes.filter(type => 
            GameState.agentAbsences[type] === 0
        );
        
        if (availableAgents.length > 0) {
            const randomAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
            const duration = Math.random() < 0.5 ? 1 : 2; // 1 ou 2 dias
            const reasons = ['atestado médico', 'banco de horas', 'licença'];
            const reason = reasons[Math.floor(Math.random() * reasons.length)];
            
            GameState.agentAbsences[randomAgent] = duration;
            GameState.agents[randomAgent].available = false;
            
            events.push({
                type: 'absence',
                title: `⚠️ ${CONFIG.AGENT_EFFICIENCY[randomAgent].name} Ausente`,
                description: `Motivo: ${reason} - Duração: ${duration} dia(s)`
            });
        }
    }
    
    return events;
}

/**
 * Cria um card de bug
 */
function createBugCard() {
    const bugTitles = [
        'Erro de validação',
        'Bug crítico em produção',
        'Problema de performance',
        'Interface quebrada',
        'Falha de segurança',
        'Inconsistência de dados'
    ];
    
    const title = bugTitles[Math.floor(Math.random() * bugTitles.length)];
    const value = Math.floor(Math.random() * 3) + 1; // 1-3
    
    return {
        id: `bug-${Date.now()}`,
        title: title,
        value: value,
        effortRequired: Math.floor(Math.random() * 10) + 5, // 5-15
        effortDone: 0,
        currentColumn: 'backlog',
        createdDay: GameState.day,
        hasBug: true,
        readyForDeployment: false,
        deadline: GameState.day + Rules.calculateDeadline(value),
        priority: Rules.calculateCriticality(value, GameState.day, GameState.day + Rules.calculateDeadline(value))
    };
}

/**
 * Calcula custo diário baseado em especialistas alocados
 */
function calculateDailyCost() {
    let totalSpecialists = 0;
    
    Object.values(GameState.specialistAllocations).forEach(allocations => {
        Object.values(allocations).forEach(count => {
            totalSpecialists += count;
        });
    });
    
    return totalSpecialists * CONFIG.DAILY_COST_PER_SPECIALIST;
}

/**
 * Aloca especialistas em um cartão
 * @param {string} cardId - ID do cartão
 * @param {string} column - Coluna onde alocar
 * @param {number} count - Quantidade de especialistas (1-3)
 */
function allocateSpecialists(cardId, column, count) {
    const card = GameState.cards.find(c => c.id === cardId);
    
    if (!card) {
        return { success: false, reason: 'Cartão não encontrado' };
    }
    
    if (card.currentColumn !== column) {
        return { success: false, reason: 'Cartão não está nesta coluna' };
    }
    
    if (count < 0 || count > CONFIG.MAX_SPECIALISTS_PER_COLUMN) {
        return { success: false, reason: `Máximo ${CONFIG.MAX_SPECIALISTS_PER_COLUMN} especialistas por coluna` };
    }
    
    // Calcular total de especialistas já alocados nesta coluna
    const cardsInColumn = GameState.cards.filter(c => c.currentColumn === column);
    let totalInColumn = 0;
    
    cardsInColumn.forEach(c => {
        if (c.id !== cardId && GameState.specialistAllocations[c.id]) {
            totalInColumn += GameState.specialistAllocations[c.id][column] || 0;
        }
    });
    
    if (totalInColumn + count > CONFIG.MAX_SPECIALISTS_PER_COLUMN) {
        return { 
            success: false, 
            reason: `Máximo ${CONFIG.MAX_SPECIALISTS_PER_COLUMN} especialistas na coluna. Já alocados: ${totalInColumn}` 
        };
    }
    
    // Inicializar estrutura se necessário
    if (!GameState.specialistAllocations[cardId]) {
        GameState.specialistAllocations[cardId] = {};
    }
    
    GameState.specialistAllocations[cardId][column] = count;
    
    addHistory('allocation', `Especialistas alocados em "${card.title}"`, 
        `${count}x especialista(s) em ${getColumnName(column)}`);
    
    return { success: true, count };
}

// ===================================================================================
// MOVIMENTAÇÃO DE CARTÕES
// ===================================================================================

/**
 * Move um cartão para outra coluna
 * @param {string} cardId - ID do cartão
 * @param {string} toColumn - Coluna de destino
 * @returns {Object} Resultado da operação
 */
function moveCard(cardId, toColumn) {
    const card = GameState.cards.find(c => c.id === cardId);
    
    if (!card) {
        return { success: false, reason: 'Cartão não encontrado' };
    }
    
    const fromColumn = card.currentColumn;
    
    // Impedir movimento de cartões já deployed
    if (fromColumn === 'deployed') {
        return { success: false, reason: 'Cartões entregues não podem ser movidos' };
    }
    
    // Validar movimento
    const validation = Rules.validateMove(fromColumn, toColumn, GameState);
    if (!validation.valid) {
        return { success: false, reason: validation.reason };
    }
    
    // Verificar se trabalho está completo antes de avançar
    const fromIndex = CONFIG.COLUMN_ORDER.indexOf(fromColumn);
    const toIndex = CONFIG.COLUMN_ORDER.indexOf(toColumn);
    
    if (toIndex > fromIndex && CONFIG.WORK_COLUMNS.includes(fromColumn)) {
        if (card.effortDone < card.effortRequired) {
            return { 
                success: false, 
                reason: `Trabalho incompleto: ${card.effortDone}/${card.effortRequired}` 
            };
        }
        // Reset do esforço para próxima etapa
        card.effortDone = 0;
    }
    
    // Executar movimento
    card.currentColumn = toColumn;
    card.lastMovedDay = GameState.day;
    
    // Marcar início se movendo para "ready"
    if (toColumn === 'ready' && !card.startedDay) {
        card.startedDay = GameState.day;
    }
    
    // Marcar conclusão se movendo para "deployed"
    if (toColumn === 'deployed') {
        card.completedDay = GameState.day;
        
        // Calcular penalty por atraso
        const penalty = Rules.calculateLatePenalty(card.value, GameState.day, card.deadline);
        const finalValue = card.value - penalty;
        card.finalValue = finalValue;
        
        const leadTime = Rules.calculateLeadTime(card);
        GameState.metrics.leadTimes.push({
            cardId: card.id,
            title: card.title,
            leadTime,
            value: finalValue
        });
        
        let message = `Lead Time: ${leadTime} dias`;
        if (penalty > 0) {
            message += ` ⚠️ ATRASADO! Penalidade: R$ ${penalty}, Valor Final: R$ ${finalValue}`;
            addHistory('penalty', `"${card.title}" entregue com atraso`, message);
        } else {
            message += `, Valor: R$ ${finalValue}`;
            addHistory('complete', `"${card.title}" concluído!`, message);
        }
    } else {
        addHistory('move', `"${card.title}" movido`, 
            `${getColumnName(fromColumn)} → ${getColumnName(toColumn)}`);
    }
    
    // Atualizar CFD após movimento
    recordCFD();
    
    return { success: true, card };
}

/**
 * Adiciona um novo cartão ao backlog
 * @param {Object} cardData - Dados do cartão
 * @returns {Object} Cartão criado
 */
function addCard(cardData) {
    const id = `C${String(GameState.cards.length + 1).padStart(3, '0')}`;
    
    const card = {
        id,
        title: sanitizeText(cardData.title),
        description: sanitizeText(cardData.description || ''),
        priority: cardData.priority || 'medium',
        category: cardData.category || 'feature',
        effortRequired: parseInt(cardData.effort) || 5,
        effortDone: 0,
        value: parseInt(cardData.value) || 100,
        currentColumn: 'backlog',
        createdDay: GameState.day,
        startedDay: null,
        completedDay: null,
        lastMovedDay: GameState.day
    };
    
    GameState.cards.push(card);
    
    addHistory('add', `Novo cartão: "${card.title}"`, 
        `Esforço: ${card.effortRequired}, Valor: R$ ${card.value}`);
    
    recordCFD();
    
    return card;
}

// ===================================================================================
// HISTÓRICO E LOGS
// ===================================================================================

/**
 * Adiciona uma entrada ao histórico
 * @param {string} type - Tipo da ação
 * @param {string} action - Descrição da ação
 * @param {string} details - Detalhes adicionais
 */
function addHistory(type, action, details) {
    GameState.history.unshift({
        day: GameState.day,
        type,
        action,
        details,
        timestamp: new Date().toISOString()
    });
    
    // Manter apenas os últimos 100 registros
    if (GameState.history.length > 100) {
        GameState.history.pop();
    }
}

// ===================================================================================
// MÉTRICAS E REGISTROS
// ===================================================================================

/**
 * Registra dados do CFD (Cumulative Flow Diagram)
 */
function recordCFD() {
    const cfdEntry = {
        day: GameState.day,
        backlog: countCardsInColumn('backlog'),
        ready: countCardsInColumn('ready'),
        analysis: countCardsInColumn('analysis'),
        development: countCardsInColumn('development'),
        testing: countCardsInColumn('testing'),
        deployed: countCardsInColumn('deployed')
    };
    
    GameState.metrics.cfd.push(cfdEntry);
}

/**
 * Registra dados financeiros
 */
function recordFinancial() {
    const deployed = GameState.cards.filter(c => c.currentColumn === 'deployed');
    const totalValue = deployed.reduce((sum, c) => sum + c.value, 0);
    const totalCost = GameState.day * CONFIG.DAILY_COST;
    
    GameState.metrics.financial.push({
        day: GameState.day,
        value: totalValue,
        cost: totalCost,
        profit: totalValue - totalCost
    });
}

/**
 * Registra throughput
 */
function recordThroughput() {
    const deployed = GameState.cards.filter(c => c.currentColumn === 'deployed');
    
    // Calcular quantos foram completados hoje
    const completedToday = deployed.filter(c => c.completedDay === GameState.day).length;
    
    GameState.metrics.throughput.push({
        day: GameState.day,
        completed: completedToday,
        cumulative: deployed.length
    });
}

/**
 * Conta cartões em uma coluna
 * @param {string} column - Nome da coluna
 * @returns {number} Quantidade de cartões
 */
function countCardsInColumn(column) {
    return GameState.cards.filter(c => c.currentColumn === column).length;
}

// ===================================================================================
// EXPORT/IMPORT
// ===================================================================================

/**
 * Exporta o estado do jogo como JSON
 * @returns {string} JSON do estado
 */
function exportGameState() {
    return JSON.stringify(GameState, null, 2);
}

/**
 * Importa estado do jogo de JSON
 * @param {string} jsonString - JSON do estado
 * @returns {Object} Resultado da importação
 */
function importGameState(jsonString) {
    try {
        const state = JSON.parse(jsonString);
        
        // Validação básica
        if (!state.cards || !Array.isArray(state.cards)) {
            return { success: false, reason: 'Estado inválido: cards ausente' };
        }
        
        if (typeof state.day !== 'number') {
            return { success: false, reason: 'Estado inválido: day ausente' };
        }
        
        GameState = state;
        GameState.isRunning = true;

        // Manter referência global sempre apontando para o estado atual
        if (typeof window !== 'undefined') {
            window.GameState = GameState;
        }
        
        return { success: true };
    } catch (e) {
        return { success: false, reason: 'JSON inválido: ' + e.message };
    }
}

// ===================================================================================
// UTILITÁRIOS
// ===================================================================================

/**
 * Sanitiza texto para evitar XSS
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
function sanitizeText(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Retorna nome amigável da coluna
 * @param {string} column - ID da coluna
 * @returns {string} Nome da coluna
 */
function getColumnName(column) {
    const names = {
        backlog: 'Backlog',
        ready: 'Pronto',
        analysis: 'Análise',
        development: 'Desenvolvimento',
        testing: 'Teste',
        deployed: 'Concluído'
    };
    return names[column] || column;
}

/**
 * Obtém o estado atual do jogo
 * @returns {Object} Estado do jogo
 */
function getGameState() {
    return GameState;
}

/**
 * Reinicia o jogo
 */
function restartGame() {
    initGame();
}

// Exportar para uso global
window.GameState = GameState;
window.initGame = initGame;
window.processDay = processDay;
window.moveCard = moveCard;
window.addCard = addCard;
window.exportGameState = exportGameState;
window.importGameState = importGameState;
window.getGameState = getGameState;
window.restartGame = restartGame;
window.getColumnName = getColumnName;
window.countCardsInColumn = countCardsInColumn;

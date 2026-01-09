/**
 * ===================================================================================
 * KANBAN EV - REGRAS E CONFIGURAÇÕES DO JOGO
 * ===================================================================================
 * 
 * Este arquivo contém todas as constantes, configurações e regras do jogo.
 * Modifique os valores aqui para ajustar a dificuldade e mecânicas.
 * 
 * ===================================================================================
 */

// ===================================================================================
// PARÂMETROS CONFIGURÁVEIS
// ===================================================================================

const CONFIG = {
    // Configurações gerais
    DAILY_COST_PER_SPECIALIST: 100,     // Custo diário por especialista (R$)
    MAX_DAYS: 30,                       // Número máximo de dias
    STALE_THRESHOLD: 5,                 // Dias para considerar um cartão "parado"
    MAX_SPECIALISTS_PER_COLUMN: 3,      // Máximo de especialistas por coluna
    
    // Limites de WIP por coluna
    WIP_LIMITS: {
        backlog: Infinity,              // Sem limite no backlog
        ready: 3,                       // Limite de cartões prontos
        analysis: 3,                    // Limite em análise
        development: 4,                 // Limite em desenvolvimento
        testing: 3,                     // Limite em teste
        deployed: Infinity              // Sem limite em concluído
    },
    
    // Eficiência dos agentes
    AGENT_EFFICIENCY: {
        analyst: {
            name: 'Analista',
            icon: '🔍',
            color: 'analyst',
            baseEfficiency: 1,
            specialtyColumn: 'analysis',
            specialtyMultiplier: 2       // Dobra quando trabalha na especialidade
        },
        developer: {
            name: 'Desenvolvedor',
            icon: '💻',
            color: 'developer',
            baseEfficiency: 1,
            specialtyColumn: 'development',
            specialtyMultiplier: 2
        },
        tester: {
            name: 'Testador',
            icon: '🧪',
            color: 'tester',
            baseEfficiency: 1,
            specialtyColumn: 'testing',
            specialtyMultiplier: 2
        }
    },
    
    // Eventos aleatórios
    EVENTS: {
        BUG_CHANCE_PER_DAY: 0.15,        // 15% chance de bug aparecer por dia
        ABSENCE_CHANCE_PER_DAY: 0.1,     // 10% chance de ausência por dia
        TESTER_BUG_DETECTION: 0.3,       // 30% chance de detectar bug ao testar
        ABSENCE_DURATION_MIN: 1,
        ABSENCE_DURATION_MAX: 2
    },
    
    // Cálculo de prazo baseado em valor
    DEADLINE_CALCULATION: {
        BASE_DAYS: 10,                   // Dias base para qualquer projeto
        DAYS_PER_100_VALUE: -0.5,        // Reduz 0.5 dia a cada R$100 de valor
        MIN_DEADLINE: 3                  // Prazo mínimo
    },
    
    // Penalidades
    PENALTIES: {
        LATE_PENALTY_PERCENT: 0.1,       // 10% de penalidade por dia de atraso
        MAX_PENALTY_PERCENT: 0.5         // Máximo 50% de penalidade
    },
    
    // Colunas de trabalho (onde os agentes podem processar)
    WORK_COLUMNS: ['analysis', 'development', 'testing'],
    
    // Ordem das colunas (para validar movimentos)
    COLUMN_ORDER: ['backlog', 'ready', 'analysis', 'development', 'testing', 'deployed'],
    
    // Configurações de prioridade
    PRIORITIES: {
        low: { label: 'Baixa', color: '#27ae60', order: 1 },
        medium: { label: 'Média', color: '#f39c12', order: 2 },
        high: { label: 'Alta', color: '#e74c3c', order: 3 },
        urgent: { label: 'Urgente', color: '#9b59b6', order: 4 }
    },
    
    // Configurações de categoria
    CATEGORIES: {
        feature: { label: 'Feature', color: '#3498db' },
        bug: { label: 'Bug', color: '#e74c3c' },
        improvement: { label: 'Melhoria', color: '#2ecc71' },
        'tech-debt': { label: 'Dívida Técnica', color: '#f39c12' }
    }
};

// ===================================================================================
// CARTÕES DE EXEMPLO (SEED DATA)
// ===================================================================================

const SAMPLE_CARDS = [
    { id: 'C001', title: 'Painel de Instrumentos', effort: 3, value: 200, priority: 'medium', category: 'feature', description: 'Implementar painel de instrumentos do veículo' },
    { id: 'C002', title: 'Atualização ECU', effort: 5, value: 500, priority: 'high', category: 'feature', description: 'Atualizar firmware da unidade de controle' },
    { id: 'C003', title: 'Correção Sensor ABS', effort: 2, value: 150, priority: 'urgent', category: 'bug', description: 'Corrigir leitura incorreta do sensor ABS' },
    { id: 'C004', title: 'Otimização Bateria', effort: 6, value: 600, priority: 'high', category: 'improvement', description: 'Otimizar consumo de bateria do sistema' },
    { id: 'C005', title: 'Interface Multimídia', effort: 4, value: 300, priority: 'medium', category: 'feature', description: 'Nova interface do sistema multimídia' },
    { id: 'C006', title: 'Diagnóstico OBD', effort: 3, value: 250, priority: 'low', category: 'feature', description: 'Sistema de diagnóstico OBD-II' },
    { id: 'C007', title: 'Refatorar Telemetria', effort: 4, value: 180, priority: 'low', category: 'tech-debt', description: 'Refatorar código de telemetria legado' },
    { id: 'C008', title: 'Câmera de Ré', effort: 2, value: 200, priority: 'medium', category: 'feature', description: 'Integração com câmera de ré' },
    { id: 'C009', title: 'Bug Bluetooth', effort: 1, value: 100, priority: 'high', category: 'bug', description: 'Conexão Bluetooth cai intermitentemente' },
    { id: 'C010', title: 'GPS Melhorado', effort: 5, value: 400, priority: 'medium', category: 'improvement', description: 'Melhorar precisão do GPS' },
    { id: 'C011', title: 'Controle Climático', effort: 4, value: 350, priority: 'medium', category: 'feature', description: 'Sistema de controle climático inteligente' },
    { id: 'C012', title: 'Alerta Colisão', effort: 7, value: 700, priority: 'high', category: 'feature', description: 'Sistema de alerta de colisão frontal' },
    { id: 'C013', title: 'Limpeza Código USB', effort: 2, value: 80, priority: 'low', category: 'tech-debt', description: 'Limpar código do driver USB' },
    { id: 'C014', title: 'Velocímetro Digital', effort: 3, value: 220, priority: 'medium', category: 'feature', description: 'Novo velocímetro digital HD' },
    { id: 'C015', title: 'Falha Airbag', effort: 2, value: 300, priority: 'urgent', category: 'bug', description: 'Corrigir falso positivo do sensor de airbag' },
    { id: 'C016', title: 'Economia Energia', effort: 5, value: 450, priority: 'medium', category: 'improvement', description: 'Modo de economia de energia avançado' },
    { id: 'C017', title: 'Assistente Voz', effort: 8, value: 800, priority: 'low', category: 'feature', description: 'Integração com assistente de voz' },
    { id: 'C018', title: 'Atualização OTA', effort: 6, value: 550, priority: 'high', category: 'feature', description: 'Sistema de atualização over-the-air' },
    { id: 'C019', title: 'Logs Diagnóstico', effort: 3, value: 150, priority: 'low', category: 'tech-debt', description: 'Melhorar sistema de logs de diagnóstico' },
    { id: 'C020', title: 'Parking Assist', effort: 5, value: 500, priority: 'medium', category: 'feature', description: 'Assistente de estacionamento automático' }
];

// ===================================================================================
// VALIDAÇÕES E REGRAS
// ===================================================================================

const Rules = {
    /**
     * Verifica se um movimento de cartão é válido
     * @param {string} fromColumn - Coluna de origem
     * @param {string} toColumn - Coluna de destino
     * @param {Object} gameState - Estado atual do jogo
     * @returns {Object} { valid: boolean, reason: string }
     */
    validateMove(fromColumn, toColumn, gameState) {
        // Não pode mover para a mesma coluna
        if (fromColumn === toColumn) {
            return { valid: false, reason: 'Cartão já está nesta coluna' };
        }
        
        // Verificar ordem das colunas (só pode mover para direita, exceto rework)
        const fromIndex = CONFIG.COLUMN_ORDER.indexOf(fromColumn);
        const toIndex = CONFIG.COLUMN_ORDER.indexOf(toColumn);
        
        // Não pode pular colunas para frente
        if (toIndex > fromIndex + 1) {
            return { valid: false, reason: 'Não pode pular colunas' };
        }
        
        // Verificar limite de WIP na coluna de destino
        const wipLimit = CONFIG.WIP_LIMITS[toColumn];
        const currentCount = gameState.cards.filter(c => c.currentColumn === toColumn).length;
        
        if (currentCount >= wipLimit) {
            return { valid: false, reason: `Limite de WIP atingido (${wipLimit})` };
        }
        
        // Verificar se cartão pode avançar (trabalho completo na coluna atual)
        if (toIndex > fromIndex && CONFIG.WORK_COLUMNS.includes(fromColumn)) {
            const card = gameState.cards.find(c => c.currentColumn === fromColumn);
            if (card && card.effortDone < card.effortRequired) {
                return { valid: false, reason: 'Trabalho não concluído nesta etapa' };
            }
        }
        
        return { valid: true, reason: '' };
    },
    
    /**
     * Verifica se um cartão pode ser puxado do backlog
     * @param {Object} gameState - Estado atual do jogo
     * @returns {Object} { valid: boolean, reason: string }
     */
    canPullFromBacklog(gameState) {
        const readyCount = gameState.cards.filter(c => c.currentColumn === 'ready').length;
        const wipLimit = CONFIG.WIP_LIMITS.ready;
        
        if (readyCount >= wipLimit) {
            return { valid: false, reason: `Coluna "Pronto" cheia (${wipLimit})` };
        }
        
        return { valid: true, reason: '' };
    },
    
    /**
     * Calcula o trabalho realizado por especialistas em uma coluna
     * @param {string} agentType - Tipo do agente
     * @param {string} column - Coluna onde está trabalhando
     * @param {number} diceRoll - Resultado do dado (1-6)
     * @param {number} specialistCount - Número de especialistas alocados
     * @returns {number} Quantidade de trabalho realizado
     */
    calculateWork(agentType, column, diceRoll, specialistCount = 1) {
        const agent = CONFIG.AGENT_EFFICIENCY[agentType];
        let work = diceRoll * agent.baseEfficiency * specialistCount;
        
        // Dobra se for especialidade
        if (column === agent.specialtyColumn) {
            work *= agent.specialtyMultiplier;
        }
        
        return work;
    },
    
    /**
     * Calcula o prazo de entrega baseado no valor do projeto
     * @param {number} value - Valor do projeto
     * @param {number} effort - Esforço total estimado
     * @returns {number} Prazo em dias
     */
    calculateDeadline(value, effort) {
        const config = CONFIG.DEADLINE_CALCULATION;
        let deadline = config.BASE_DAYS + (value / 100) * config.DAYS_PER_100_VALUE;
        deadline = Math.max(deadline, config.MIN_DEADLINE);
        // Ajustar baseado no esforço também
        deadline = Math.max(deadline, effort * 0.5);
        return Math.round(deadline);
    },
    
    /**
     * Calcula criticidade baseada no valor
     * @param {number} value - Valor do projeto
     * @returns {string} Nível de criticidade
     */
    calculateCriticality(value) {
        if (value >= 600) return 'urgent';
        if (value >= 400) return 'high';
        if (value >= 200) return 'medium';
        return 'low';
    },
    
    /**
     * Calcula penalidade por atraso
     * @param {number} daysLate - Dias de atraso
     * @param {number} originalValue - Valor original
     * @returns {number} Valor com penalidade
     */
    calculateLatePenalty(daysLate, originalValue) {
        if (daysLate <= 0) return originalValue;
        
        const penaltyPercent = Math.min(
            daysLate * CONFIG.PENALTIES.LATE_PENALTY_PERCENT,
            CONFIG.PENALTIES.MAX_PENALTY_PERCENT
        );
        
        return Math.round(originalValue * (1 - penaltyPercent));
    },
    
    /**
     * Verifica se um cartão está parado há muito tempo
     * @param {Object} card - Cartão a verificar
     * @param {number} currentDay - Dia atual
     * @returns {boolean}
     */
    isStale(card, currentDay) {
        return (currentDay - card.lastMovedDay) >= CONFIG.STALE_THRESHOLD;
    },
    
    /**
     * Calcula o lead time de um cartão completado
     * @param {Object} card - Cartão completado
     * @returns {number} Lead time em dias
     */
    calculateLeadTime(card) {
        if (!card.startedDay || !card.completedDay) return 0;
        return card.completedDay - card.startedDay;
    },
    
    /**
     * Calcula métricas do jogo
     * @param {Object} gameState - Estado atual do jogo
     * @returns {Object} Métricas calculadas
     */
    calculateMetrics(gameState) {
        const deployed = gameState.cards.filter(c => c.currentColumn === 'deployed');
        
        // Calcular valor total considerando penalidades
        const totalValue = deployed.reduce((sum, c) => {
            if (c.finalValue !== undefined) return sum + c.finalValue;
            return sum + c.value;
        }, 0);
        
        // Custo baseado em especialistas alocados
        let dailyCosts = 0;
        if (gameState.dailyCostHistory && gameState.dailyCostHistory.length > 0) {
            dailyCosts = gameState.dailyCostHistory.reduce((sum, cost) => sum + cost, 0);
        } else {
            // Fallback: estimar baseado em especialistas atuais
            const totalSpecialists = Object.values(gameState.specialistAllocations || {})
                .reduce((sum, allocations) => {
                    return sum + Object.values(allocations).reduce((s, count) => s + count, 0);
                }, 0);
            dailyCosts = gameState.day * totalSpecialists * CONFIG.DAILY_COST_PER_SPECIALIST;
        }
        
        const totalCost = dailyCosts;
        
        // Lead time médio
        const leadTimes = deployed
            .filter(c => c.completedDay && c.startedDay)
            .map(c => c.completedDay - c.startedDay);
        const avgLeadTime = leadTimes.length > 0 
            ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1)
            : 0;
        
        // Throughput (cartões por dia)
        const throughput = gameState.day > 0 
            ? (deployed.length / gameState.day).toFixed(2)
            : 0;
        
        // Cartões bloqueados (em colunas com WIP cheio)
        let blockedCount = 0;
        CONFIG.COLUMN_ORDER.forEach(col => {
            const count = gameState.cards.filter(c => c.currentColumn === col).length;
            if (count >= CONFIG.WIP_LIMITS[col]) {
                blockedCount += count;
            }
        });
        
        return {
            totalValue,
            totalCost,
            profit: totalValue - totalCost,
            avgLeadTime,
            throughput,
            blockedCount,
            deployedCount: deployed.length
        };
    }
};

// Exportar para uso global
window.CONFIG = CONFIG;
window.SAMPLE_CARDS = SAMPLE_CARDS;
window.Rules = Rules;

/**
 * ===================================================================================
 * KANBAN EV - GRÁFICOS E VISUALIZAÇÕES
 * ===================================================================================
 * 
 * Este arquivo contém todas as funções de renderização de gráficos:
 * - CFD (Cumulative Flow Diagram)
 * - Lead Time
 * - Desempenho Financeiro
 * - Throughput
 * 
 * Os gráficos são renderizados usando Canvas nativo sem dependências externas.
 * Para usar Chart.js ou outras bibliotecas, substitua as funções de desenho.
 * 
 * ===================================================================================
 */

// ===================================================================================
// CONFIGURAÇÕES DOS GRÁFICOS
// ===================================================================================

const CHART_CONFIG = {
    colors: {
        backlog: '#6c757d',
        ready: '#17a2b8',
        analysis: '#e74c3c',
        development: '#2ecc71',
        testing: '#3498db',
        deployed: '#27ae60',
        value: '#2ecc71',
        cost: '#e74c3c',
        profit: '#3498db',
        throughput: '#9b59b6'
    },
    padding: 40,
    gridLines: 5,
    animationDuration: 300
};

// ===================================================================================
// CLASSE DE GRÁFICO BASE
// ===================================================================================

class ChartRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn(`Canvas ${canvasId} não encontrado`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // Listener para redimensionamento
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 20;
        this.canvas.height = 200;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }
    
    clear() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    drawGrid(maxValue) {
        if (!this.ctx) return;
        
        const padding = CHART_CONFIG.padding;
        const gridLines = CHART_CONFIG.gridLines;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Linhas horizontais
        for (let i = 0; i <= gridLines; i++) {
            const y = padding + (this.height - padding * 2) * (i / gridLines);
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(this.width - padding, y);
            this.ctx.stroke();
            
            // Labels do eixo Y
            const value = Math.round(maxValue * (1 - i / gridLines));
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(value.toString(), padding - 5, y + 3);
        }
    }
    
    drawXLabels(labels) {
        if (!this.ctx || labels.length === 0) return;
        
        const padding = CHART_CONFIG.padding;
        const step = (this.width - padding * 2) / Math.max(labels.length - 1, 1);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        
        labels.forEach((label, i) => {
            if (i % Math.ceil(labels.length / 10) === 0 || labels.length <= 10) {
                const x = padding + step * i;
                this.ctx.fillText(label, x, this.height - 10);
            }
        });
    }
}

// ===================================================================================
// GRÁFICO CFD (CUMULATIVE FLOW DIAGRAM)
// ===================================================================================

class CFDChart extends ChartRenderer {
    constructor() {
        super('cfdChart');
    }
    
    draw(data) {
        if (!this.ctx || !data || data.length === 0) return;
        
        this.clear();
        
        const padding = CHART_CONFIG.padding;
        const chartWidth = this.width - padding * 2;
        const chartHeight = this.height - padding * 2;
        
        // Calcular total máximo para escala
        const maxTotal = Math.max(...data.map(d => 
            d.backlog + d.ready + d.analysis + d.development + d.testing + d.deployed
        ), 1);
        
        this.drawGrid(maxTotal);
        
        const columns = ['deployed', 'testing', 'development', 'analysis', 'ready', 'backlog'];
        const step = chartWidth / Math.max(data.length - 1, 1);
        
        // Desenhar áreas empilhadas (de baixo para cima)
        columns.forEach((col, colIndex) => {
            this.ctx.beginPath();
            this.ctx.fillStyle = CHART_CONFIG.colors[col] + '80'; // Adiciona transparência
            
            // Calcular área
            data.forEach((d, i) => {
                const x = padding + step * i;
                
                // Soma de todas as colunas abaixo
                let yBase = 0;
                for (let j = 0; j < colIndex; j++) {
                    yBase += d[columns[j]];
                }
                
                // Valor desta coluna
                const yTop = yBase + d[col];
                
                const yBasePx = this.height - padding - (yBase / maxTotal) * chartHeight;
                const yTopPx = this.height - padding - (yTop / maxTotal) * chartHeight;
                
                if (i === 0) {
                    this.ctx.moveTo(x, yBasePx);
                }
                this.ctx.lineTo(x, yTopPx);
            });
            
            // Fechar área voltando pela base
            for (let i = data.length - 1; i >= 0; i--) {
                const x = padding + step * i;
                let yBase = 0;
                for (let j = 0; j < colIndex; j++) {
                    yBase += data[i][columns[j]];
                }
                const yBasePx = this.height - padding - (yBase / maxTotal) * chartHeight;
                this.ctx.lineTo(x, yBasePx);
            }
            
            this.ctx.closePath();
            this.ctx.fill();
        });
        
        // Labels do eixo X
        this.drawXLabels(data.map(d => `D${d.day}`));
        
        // Legenda
        this.drawLegend(columns);
    }
    
    drawLegend(columns) {
        const legendY = 15;
        let legendX = CHART_CONFIG.padding;
        
        this.ctx.font = '10px sans-serif';
        
        columns.reverse().forEach(col => {
            // Quadrado colorido
            this.ctx.fillStyle = CHART_CONFIG.colors[col];
            this.ctx.fillRect(legendX, legendY - 8, 10, 10);
            
            // Texto
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            const name = getColumnName(col);
            this.ctx.fillText(name, legendX + 14, legendY);
            
            legendX += this.ctx.measureText(name).width + 25;
        });
    }
}

// ===================================================================================
// GRÁFICO DE LEAD TIME
// ===================================================================================

class LeadTimeChart extends ChartRenderer {
    constructor() {
        super('leadTimeChart');
    }
    
    draw(data) {
        if (!this.ctx || !data || data.length === 0) {
            this.drawEmpty();
            return;
        }
        
        this.clear();
        
        const padding = CHART_CONFIG.padding;
        const chartWidth = this.width - padding * 2;
        const chartHeight = this.height - padding * 2;
        
        const maxLeadTime = Math.max(...data.map(d => d.leadTime), 1);
        
        this.drawGrid(maxLeadTime);
        
        const barWidth = Math.min(30, chartWidth / data.length - 5);
        const step = chartWidth / data.length;
        
        // Desenhar barras
        data.forEach((d, i) => {
            const x = padding + step * i + (step - barWidth) / 2;
            const barHeight = (d.leadTime / maxLeadTime) * chartHeight;
            const y = this.height - padding - barHeight;
            
            // Cor baseada no lead time (verde para rápido, vermelho para lento)
            const hue = 120 - (d.leadTime / maxLeadTime) * 120;
            this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            // Valor no topo
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(d.leadTime.toString(), x + barWidth / 2, y - 5);
        });
        
        // Labels
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = '9px sans-serif';
        data.forEach((d, i) => {
            const x = padding + step * i + step / 2;
            const label = d.cardId.slice(-3);
            this.ctx.fillText(label, x, this.height - 10);
        });
        
        // Média
        const avg = data.reduce((sum, d) => sum + d.leadTime, 0) / data.length;
        const avgY = this.height - padding - (avg / maxLeadTime) * chartHeight;
        
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(padding, avgY);
        this.ctx.lineTo(this.width - padding, avgY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.fillStyle = '#f39c12';
        this.ctx.fillText(`Média: ${avg.toFixed(1)} dias`, this.width - padding - 60, avgY - 5);
    }
    
    drawEmpty() {
        this.clear();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Nenhum cartão concluído ainda', this.width / 2, this.height / 2);
    }
}

// ===================================================================================
// GRÁFICO FINANCEIRO
// ===================================================================================

class FinancialChart extends ChartRenderer {
    constructor() {
        super('financialChart');
    }
    
    draw(data) {
        if (!this.ctx || !data || data.length === 0) return;
        
        this.clear();
        
        const padding = CHART_CONFIG.padding;
        const chartWidth = this.width - padding * 2;
        const chartHeight = this.height - padding * 2;
        
        // Encontrar valores máximos e mínimos
        const allValues = data.flatMap(d => [d.value, d.cost, d.profit]);
        const maxValue = Math.max(...allValues, 1);
        const minValue = Math.min(...allValues, 0);
        const range = maxValue - minValue;
        
        this.drawGrid(maxValue);
        
        const step = chartWidth / Math.max(data.length - 1, 1);
        
        // Desenhar linha do zero
        const zeroY = this.height - padding - ((-minValue) / range) * chartHeight;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, zeroY);
        this.ctx.lineTo(this.width - padding, zeroY);
        this.ctx.stroke();
        
        // Função para desenhar linha
        const drawLine = (key, color) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            data.forEach((d, i) => {
                const x = padding + step * i;
                const y = this.height - padding - ((d[key] - minValue) / range) * chartHeight;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            });
            
            this.ctx.stroke();
            
            // Pontos
            data.forEach((d, i) => {
                const x = padding + step * i;
                const y = this.height - padding - ((d[key] - minValue) / range) * chartHeight;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                this.ctx.fillStyle = color;
                this.ctx.fill();
            });
        };
        
        drawLine('value', CHART_CONFIG.colors.value);
        drawLine('cost', CHART_CONFIG.colors.cost);
        drawLine('profit', CHART_CONFIG.colors.profit);
        
        // Labels
        this.drawXLabels(data.map(d => `D${d.day}`));
        
        // Legenda
        this.drawFinancialLegend();
    }
    
    drawFinancialLegend() {
        const legendY = 15;
        let legendX = CHART_CONFIG.padding;
        
        this.ctx.font = '10px sans-serif';
        
        const items = [
            { key: 'Valor', color: CHART_CONFIG.colors.value },
            { key: 'Custo', color: CHART_CONFIG.colors.cost },
            { key: 'Lucro', color: CHART_CONFIG.colors.profit }
        ];
        
        items.forEach(item => {
            this.ctx.fillStyle = item.color;
            this.ctx.fillRect(legendX, legendY - 8, 10, 10);
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillText(item.key, legendX + 14, legendY);
            
            legendX += this.ctx.measureText(item.key).width + 30;
        });
    }
}

// ===================================================================================
// GRÁFICO DE THROUGHPUT
// ===================================================================================

class ThroughputChart extends ChartRenderer {
    constructor() {
        super('throughputChart');
    }
    
    draw(data) {
        if (!this.ctx || !data || data.length === 0) return;
        
        this.clear();
        
        const padding = CHART_CONFIG.padding;
        const chartWidth = this.width - padding * 2;
        const chartHeight = this.height - padding * 2;
        
        const maxCompleted = Math.max(...data.map(d => d.completed), 1);
        
        this.drawGrid(maxCompleted);
        
        const barWidth = Math.min(20, chartWidth / data.length - 2);
        const step = chartWidth / data.length;
        
        // Desenhar barras
        data.forEach((d, i) => {
            const x = padding + step * i + (step - barWidth) / 2;
            const barHeight = (d.completed / maxCompleted) * chartHeight;
            const y = this.height - padding - barHeight;
            
            this.ctx.fillStyle = CHART_CONFIG.colors.throughput;
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            if (d.completed > 0) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '10px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(d.completed.toString(), x + barWidth / 2, y - 5);
            }
        });
        
        // Linha de tendência (média móvel)
        if (data.length >= 3) {
            this.ctx.strokeStyle = '#f39c12';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            for (let i = 2; i < data.length; i++) {
                const avg = (data[i-2].completed + data[i-1].completed + data[i].completed) / 3;
                const x = padding + step * i + step / 2;
                const y = this.height - padding - (avg / maxCompleted) * chartHeight;
                
                if (i === 2) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.stroke();
        }
        
        // Labels
        this.drawXLabels(data.map(d => `D${d.day}`));
    }
}

// ===================================================================================
// GERENCIADOR DE GRÁFICOS
// ===================================================================================

const Charts = {
    cfd: null,
    leadTime: null,
    financial: null,
    throughput: null,
    
    init() {
        this.cfd = new CFDChart();
        this.leadTime = new LeadTimeChart();
        this.financial = new FinancialChart();
        this.throughput = new ThroughputChart();
        
        console.log('📊 Gráficos inicializados');
    },
    
    updateAll(gameState) {
        if (!gameState || !gameState.metrics) return;
        
        if (this.cfd) {
            this.cfd.draw(gameState.metrics.cfd);
        }
        
        if (this.leadTime) {
            this.leadTime.draw(gameState.metrics.leadTimes);
        }
        
        if (this.financial) {
            this.financial.draw(gameState.metrics.financial);
        }
        
        if (this.throughput) {
            this.throughput.draw(gameState.metrics.throughput);
        }
    },
    
    resize() {
        if (this.cfd) this.cfd.resize();
        if (this.leadTime) this.leadTime.resize();
        if (this.financial) this.financial.resize();
        if (this.throughput) this.throughput.resize();
        
        // Redesenhar após resize
        const state = getGameState();
        if (state) {
            this.updateAll(state);
        }
    }
};

// Listener para redimensionamento
window.addEventListener('resize', () => {
    requestAnimationFrame(() => Charts.resize());
});

// Exportar para uso global
window.Charts = Charts;

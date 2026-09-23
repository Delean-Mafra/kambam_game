/**
 * High-DPI Agile Metrics Canvas Charts Engine in TypeScript
 */

import type { CFDPoint, Card, FinancialHistoryItem, DailyDelivery } from './types';

export class ChartsEngine {
  private devicePixelRatio: number;

  constructor() {
    this.devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  }

  private setupCanvas(canvasId: string): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 380;
    const height = 180;

    canvas.width = width * this.devicePixelRatio;
    canvas.height = height * this.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
    ctx.clearRect(0, 0, width, height);

    return { ctx, width, height };
  }

  public renderCFD(canvasId: string, cfdHistory: CFDPoint[]): void {
    const setup = this.setupCanvas(canvasId);
    if (!setup) return;
    const { ctx, width, height } = setup;

    if (!cfdHistory || cfdHistory.length === 0) {
      this.drawEmptyState(ctx, width, height, 'Aguardando dados dos primeiros dias...');
      return;
    }

    const padding = { top: 20, right: 15, bottom: 25, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    let maxTotal = 1;
    cfdHistory.forEach(d => {
      const sum = (d.deployed || 0) + (d.testing || 0) + (d.development || 0) + (d.analysis || 0) + (d.ready || 0);
      if (sum > maxTotal) maxTotal = sum;
    });
    maxTotal = Math.max(maxTotal, 5);

    const stepX = cfdHistory.length > 1 ? chartW / (cfdHistory.length - 1) : chartW;

    const layers: { key: keyof CFDPoint; color: string; label: string }[] = [
      { key: 'deployed', color: '#10b981', label: 'Concluído' },
      { key: 'testing', color: '#06b6d4', label: 'Teste' },
      { key: 'development', color: '#6366f1', label: 'Dev' },
      { key: 'analysis', color: '#ec4899', label: 'Análise' },
      { key: 'ready', color: '#f59e0b', label: 'Pronto' },
    ];

    const stackedSeries: number[][] = layers.map(() => []);

    cfdHistory.forEach(dayPoint => {
      let cumulative = 0;
      layers.forEach((layer, layerIdx) => {
        cumulative += (dayPoint[layer.key] as number || 0);
        stackedSeries[layerIdx].push(cumulative);
      });
    });

    for (let l = layers.length - 1; l >= 0; l--) {
      ctx.beginPath();
      ctx.fillStyle = layers[l].color + '44';
      ctx.strokeStyle = layers[l].color;
      ctx.lineWidth = 1.5;

      cfdHistory.forEach((_, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - (stackedSeries[l][i] / maxTotal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      for (let i = cfdHistory.length - 1; i >= 0; i--) {
        const x = padding.left + i * stepX;
        const prevY = l > 0 
          ? padding.top + chartH - (stackedSeries[l - 1][i] / maxTotal) * chartH 
          : padding.top + chartH;
        ctx.lineTo(x, prevY);
      }

      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      cfdHistory.forEach((_, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - (stackedSeries[l][i] / maxTotal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    this.drawAxes(ctx, padding, chartW, chartH, maxTotal);
  }

  public renderLeadTime(canvasId: string, deliveredCards: Card[]): void {
    const setup = this.setupCanvas(canvasId);
    if (!setup) return;
    const { ctx, width, height } = setup;

    if (!deliveredCards || deliveredCards.length === 0) {
      this.drawEmptyState(ctx, width, height, 'Nenhuma entrega realizada ainda.');
      return;
    }

    const padding = { top: 20, right: 15, bottom: 25, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const leadTimes = deliveredCards.map(c => Math.max(1, (c.completedDay || 0) - (c.startedDay || 0)));
    const maxLead = Math.max(...leadTimes, 8);
    const avgLead = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;

    const avgY = padding.top + chartH - (avgLead / maxLead) * chartH;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, avgY);
    ctx.lineTo(padding.left + chartW, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Média: ${avgLead.toFixed(1)}d`, padding.left + chartW, avgY - 4);

    const barWidth = Math.min(24, Math.max(8, (chartW / deliveredCards.length) - 4));
    deliveredCards.forEach((c, idx) => {
      const lt = Math.max(1, (c.completedDay || 0) - (c.startedDay || 0));
      const step = chartW / deliveredCards.length;
      const x = padding.left + idx * step + step / 2;
      const y = padding.top + chartH - (lt / maxLead) * chartH;

      ctx.fillStyle = lt <= 5 ? '#10b981' : (lt <= 8 ? '#f59e0b' : '#ef4444');
      ctx.beginPath();
      ctx.roundRect(x - barWidth / 2, y, barWidth, padding.top + chartH - y, [3, 3, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${lt}d`, x, y - 4);

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(c.code ? c.code.replace('CRD-', '#') : `#${idx + 1}`, x, height - 8);
    });

    this.drawAxes(ctx, padding, chartW, chartH, maxLead, 'd');
  }

  public renderFinancial(canvasId: string, history: FinancialHistoryItem[]): void {
    const setup = this.setupCanvas(canvasId);
    if (!setup) return;
    const { ctx, width, height } = setup;

    if (!history || history.length === 0) {
      this.drawEmptyState(ctx, width, height, 'Aguardando fechamento do primeiro dia...');
      return;
    }

    const padding = { top: 20, right: 15, bottom: 25, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    let maxVal = 1000;
    let minVal = 0;
    history.forEach(h => {
      if (h.revenue > maxVal) maxVal = h.revenue;
      if (h.cost > maxVal) maxVal = h.cost;
      if (h.profit > maxVal) maxVal = h.profit;
      if (h.profit < minVal) minVal = h.profit;
    });

    const range = Math.max(maxVal - minVal, 1000);
    const stepX = history.length > 1 ? chartW / (history.length - 1) : chartW;

    if (minVal < 0) {
      const zeroY = padding.top + chartH - ((0 - minVal) / range) * chartH;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(padding.left + chartW, zeroY);
      ctx.stroke();
    }

    const series: { key: keyof FinancialHistoryItem; color: string; label: string }[] = [
      { key: 'revenue', color: '#10b981', label: 'Receita' },
      { key: 'cost', color: '#f97316', label: 'Custo' },
      { key: 'profit', color: '#3b82f6', label: 'Lucro' },
    ];

    series.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      history.forEach((h, i) => {
        const val = (h[s.key] as number) || 0;
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - ((val - minVal) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      history.forEach((h, i) => {
        const val = (h[s.key] as number) || 0;
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - ((val - minVal) / range) * chartH;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`R$ ${(maxVal / 1000).toFixed(1)}k`, padding.left - 5, padding.top + 10);
    ctx.fillText(`R$ ${(minVal / 1000).toFixed(1)}k`, padding.left - 5, padding.top + chartH);
  }

  public renderThroughput(canvasId: string, dailyDelivered: DailyDelivery[]): void {
    const setup = this.setupCanvas(canvasId);
    if (!setup) return;
    const { ctx, width, height } = setup;

    if (!dailyDelivered || dailyDelivered.length === 0) {
      this.drawEmptyState(ctx, width, height, 'Sem histórico de entregas por dia.');
      return;
    }

    const padding = { top: 20, right: 15, bottom: 25, left: 30 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxCount = Math.max(...dailyDelivered.map(d => d.count || 0), 4);
    const step = chartW / dailyDelivered.length;
    const barW = Math.min(22, step * 0.7);

    dailyDelivered.forEach((d, idx) => {
      const count = d.count || 0;
      const x = padding.left + idx * step + step / 2;
      const y = padding.top + chartH - (count / maxCount) * chartH;

      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, y, barW, padding.top + chartH - y, [3, 3, 0, 0]);
      ctx.fill();

      if (count > 0) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${count}`, x, y - 4);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`D${d.day}`, x, height - 8);
    });

    this.drawAxes(ctx, padding, chartW, chartH, maxCount);
  }

  private drawAxes(ctx: CanvasRenderingContext2D, padding: any, chartW: number, chartH: number, maxY: number, unit = ''): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartH);
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left + chartW, padding.top);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(maxY)}${unit}`, padding.left - 5, padding.top + 8);
    ctx.fillText(`0${unit}`, padding.left - 5, padding.top + chartH);
  }

  private drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number, message: string): void {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, width / 2, height / 2);
  }
}

export const chartsEngine = new ChartsEngine();

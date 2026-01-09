// This file contains functions to manage and display game metrics for the Kanban board game.
// It resets the metrics state upon page reload.

let metrics = {
    cumulativeFlow: [],
    cycleTime: [],
    financial: {
        totalValue: 0,
        dailyCost: 300,
        totalCost: 0,
        profit: 0
    },
    deployedCards: []
};

function updateMetrics(currentDay, cards) {
    // Update cumulative flow data
    const cfdData = {
        day: currentDay,
        backlog: cards.columns.backlog.length,
        ready: cards.columns.ready.length,
        analysis: cards.columns.analysis.length,
        development: cards.columns.development.length,
        testing: cards.columns.testing.length,
        deployed: cards.columns.deployed.length
    };
    metrics.cumulativeFlow.push(cfdData);

    // Update financial metrics
    metrics.financial.totalCost = currentDay * metrics.financial.dailyCost;

    // Calculate total value of deployed cards
    let totalValue = 0;
    for (const cardId of cards.columns.deployed) {
        totalValue += cards.cards[cardId].value;
    }

    metrics.financial.totalValue = totalValue;
    metrics.financial.profit = totalValue - metrics.financial.totalCost;

    return metrics;
}

function resetMetrics() {
    metrics = {
        cumulativeFlow: [],
        cycleTime: [],
        financial: {
            totalValue: 0,
            dailyCost: 300,
            totalCost: 0,
            profit: 0
        },
        deployedCards: []
    };
}

// Call resetMetrics on page load to ensure metrics start fresh
window.onload = resetMetrics;
// This file contains functions to simulate dice rolls for the game.
// The dice rolls are used to determine outcomes during gameplay.

function rollDice(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollMultipleDice(numDice, sides) {
    const results = [];
    for (let i = 0; i < numDice; i++) {
        results.push(rollDice(sides));
    }
    return results;
}

function displayDiceRolls(numDice, sides) {
    const rolls = rollMultipleDice(numDice, sides);
    const resultContainer = document.getElementById('dice-results');
    resultContainer.innerHTML = `Rolled: ${rolls.join(', ')}`;
}

// Example usage: Roll 2 six-sided dice and display the results
document.addEventListener('DOMContentLoaded', () => {
    const rollButton = document.getElementById('roll-button');
    rollButton.addEventListener('click', () => {
        displayDiceRolls(2, 6);
    });
});
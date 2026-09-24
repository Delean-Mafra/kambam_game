/**
 * App Entry Point (TypeScript)
 */

import '../static/css/game.css';
import { kanbanEngine } from './engine';
import { UIController } from './ui';
import { soundEngine } from './audio';
import { chartsEngine } from './charts';

declare global {
  interface Window {
    kanbanEngine: typeof kanbanEngine;
    uiController: UIController;
    soundEngine: typeof soundEngine;
    chartsEngine: typeof chartsEngine;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const ui = new UIController(kanbanEngine);
  window.kanbanEngine = kanbanEngine;
  window.uiController = ui;
  window.soundEngine = soundEngine;
  window.chartsEngine = chartsEngine;

  ui.init();
});

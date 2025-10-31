/**
 * Enhanced SWSE System Initialization
 */

import { registerHandlebarsHelpers } from './helpers/handlebars/enhanced-helpers.js';
import SWSEActorSheetEnhanced from './scripts/actors/character/swse-character-sheet-enhanced.js';

Hooks.once('init', async function() {
  console.log('SWSE | Initializing Enhanced Star Wars Saga Edition System');
  
  // Register enhanced Handlebars helpers
  registerHandlebarsHelpers();
  
  // Unregister existing actor sheets if any
  Actors.unregisterSheet('core', ActorSheet);
  
  // Register enhanced actor sheet
  Actors.registerSheet('swse', SWSEActorSheetEnhanced, {
    types: ['character'],
    makeDefault: true,
    label: 'SWSE.SheetLabels.Character'
  });
  
  console.log('SWSE | Enhanced system initialization complete');
});

Hooks.once('ready', async function() {
  console.log('SWSE | System ready');
  
  // Display welcome message
  ui.notifications.info('SWSE Enhanced System loaded! Check the Summary tab for your combat dashboard.');
});

Hooks.on('preUpdateActor', async function(actor, changes, options, userId) {
  // Auto-calculate condition track penalties when condition changes
  if (changes.system?.conditionTrack?.current !== undefined) {
    const penalties = [0, -1, -2, -5, -10, 0];
    const newPos = changes.system.conditionTrack.current;
    
    if (!changes.system.conditionTrack) {
      changes.system.conditionTrack = {};
    }
    
    changes.system.conditionTrack.penalty = penalties[newPos];
    changes.system.conditionTrack.helpless = (newPos === 5);
  }
});

/**
 * SWSE System Initialization
 * This is the main entry point for your system.
 * Everything starts here when Foundry loads.
 */

// Import all the pieces we need
import { SWSEActorBase } from './actors/base/swse-actor-base.js';
import { SWSECharacter } from './actors/character/swse-character.js';
import SWSEActorSheetEnhanced from './actors/character/swse-character-sheet-enhanced.js';
import { SWSECharacterDataModel } from './data-models/character-data-model.js';
import { SWSERoll } from './rolls/enhanced-rolls.js';
import { DamageSystem } from './combat/damage-system.js';
import { SWSEDropHandler } from './drag-drop/drop-handler.js';
import { ConditionTrackComponent } from './components/condition-track.js';
import { ForceSuiteComponent } from './components/force-suite.js';

// System initialization
Hooks.once('init', async function() {
  console.log('SWSE | Starting Enhanced System Initialization');

  // Define custom Actor classes
  CONFIG.Actor.documentClass = SWSEActorBase;

  // Register data models
  CONFIG.Actor.dataModels = {
    character: SWSECharacterDataModel,
    npc: SWSECharacterDataModel,  // NPCs use the same model
    vehicle: SWSECharacterDataModel  // Simplified for now
  };

  // Make roll system globally available
  game.swse = {
    rolls: SWSERoll,
    damage: DamageSystem,
    components: {
      ConditionTrack: ConditionTrackComponent,
      ForceSuite: ForceSuiteComponent
    }
  };

  // Unregister the core sheets
  Actors.unregisterSheet('core', ActorSheet);
  Items.unregisterSheet('core', ItemSheet);

  // Register our enhanced sheet
  Actors.registerSheet('swse', SWSEActorSheetEnhanced, {
    types: ['character'],
    makeDefault: true,
    label: 'SWSE Enhanced Character Sheet'
  });

  // Register settings
  game.settings.register('swse', 'autoConditionRecovery', {
    name: 'Automatic Condition Recovery',
    hint: 'Prompt for condition recovery at start of turn',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('swse', 'autoDamageThreshold', {
    name: 'Automatic Damage Threshold',
    hint: 'Automatically move condition track when damage exceeds threshold',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // Register Handlebars helpers
  Handlebars.registerHelper('conditionPenalty', function(track) {
    const penalties = [0, -1, -2, -5, -10, 0];
    return penalties[track] || 0;
  });

  Handlebars.registerHelper('isHelpless', function(track) {
    return track === 5;
  });

  Handlebars.registerHelper('formatModifier', function(value) {
    const num = Number(value) || 0;
    return num >= 0 ? `+${num}` : `${num}`;
  });

  console.log('SWSE | System initialization complete');
});

// When the system is ready
Hooks.once('ready', async function() {
  console.log('SWSE | System ready');

  // Show welcome message
  if (game.user.isGM) {
    ui.notifications.info(`
      SWSE Enhanced System Loaded!
      • Visual Condition Track active
      • Damage Threshold automation enabled
      • Force Suite management ready
      • Check the Summary tab for your combat dashboard
    `);
  }

  // Set up chat message handlers
  Hooks.on('renderChatMessage', (message, html) => {
    // This is handled in enhanced-rolls.js now
  });

  // Set up combat automation
  if (game.settings.get('swse', 'autoConditionRecovery')) {
    Hooks.on('combatTurn', async (combat, updateData, updateOptions) => {
      const combatant = combat.combatant;
      if (!combatant) return;

      const actor = combatant.actor;
      if (!actor) return;

      // Check if actor is on condition track
      if (actor.system.conditionTrack.current > 0 && 
          !actor.system.conditionTrack.persistent) {

        // Prompt for recovery
        const recover = await Dialog.confirm({
          title: 'Condition Recovery',
          content: `<p>${actor.name} can attempt condition recovery.</p>
                    <p>Make a DC 10 Endurance check?</p>`
        });

        if (recover) {
          const endurance = actor.system.skills.endurance;
          const roll = await new Roll(`1d20 + ${endurance.total}`).evaluate({async: true});

          await roll.toMessage({
            speaker: ChatMessage.getSpeaker({actor}),
            flavor: 'Condition Recovery (DC 10)'
          });

          if (roll.total >= 10) {
            await actor.moveConditionTrack(-1);
            ui.notifications.info(`${actor.name} recovers!`);
          }
        }
      }
    });
  }
});

// Handle actor preparation
Hooks.on('preUpdateActor', function(actor, changes, options, userId) {
  // If condition track changes, update penalty
  if (changes.system?.conditionTrack?.current !== undefined) {
    const penalties = [0, -1, -2, -5, -10, 0];
    const newPos = changes.system.conditionTrack.current;

    if (!changes.system.conditionTrack) {
      changes.system.conditionTrack = {};
    }

    changes.system.conditionTrack.penalty = penalties[newPos];
  }
});

// Export for debugging
window.SWSE = {
  ConditionTrack: ConditionTrackComponent,
  ForceSuite: ForceSuiteComponent,
  Roll: SWSERoll,
  Damage: DamageSystem
};

console.log('SWSE | Enhanced system fully loaded');

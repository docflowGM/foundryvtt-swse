/**
 * ArchetypeEngineHooks
 *
 * Automatic initialization and integration of the archetype engine
 * with Foundry's actor lifecycle.
 *
 * Call this module from your main module initialization to automatically:
 * - Initialize archetype data on game ready
 * - Calculate affinity when actors are created
 * - Update affinity when characters change
 * - Handle level-up recalculation
 */

import { SWSELogger } from '../utils/logger.js';
import {
  initializeArchetypeData,
  initializeActorAffinity,
  recalculateActorAffinity
} from './ArchetypeAffinityEngine.js';
import {
  handleCharacterChange,
  handleLevelUp
} from './ArchetypeSuggestionIntegration.js';

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

/**
 * Main setup hook - call this ONCE from your module
 *
 * Example usage in main.js:
 * ```javascript
 * import { setupArchetypeEngineHooks } from './scripts/engine/ArchetypeEngineHooks.js';
 * setupArchetypeEngineHooks();
 * ```
 */
export function setupArchetypeEngineHooks() {
  SWSELogger.log('[ArchetypeEngineHooks] Setting up hooks...');

  // 1. Initialize archetype data when game is ready
  Hooks.once('ready', async () => {
    await initializeArchetypeDataHook();
  });

  // 2. Initialize affinity when actor is created
  Hooks.on('createActor', async (actor) => {
    await onActorCreate(actor);
  });

  // 3. Update affinity when actor is updated
  Hooks.on('updateActor', async (actor, change, options, userId) => {
    await onActorUpdate(actor, change);
  });

  // 4. Update affinity on character sheet close (ensures clean state)
  Hooks.on('closeActorSheet', async (sheet) => {
    await onActorSheetClose(sheet);
  });

  SWSELogger.log('[ArchetypeEngineHooks] Hooks registered successfully');
}

// ─────────────────────────────────────────────────────────────
// HOOK IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Called once when Foundry is ready
 * Validates and initializes archetype data
 */
async function initializeArchetypeDataHook() {
  SWSELogger.log('[ArchetypeEngineHooks] Initializing archetype data...');

  const result = await initializeArchetypeData();

  SWSELogger.log(
    `[ArchetypeEngineHooks] ✅ Archetype engine ready: ${result.stats.activeCount} archetypes loaded`
  );

  return result;
}

/**
 * Called when actor is created
 * Initializes archetype affinity storage
 */
async function onActorCreate(actor) {
  try {
    // Skip non-character actors
    if (!actor.isCharacter) {
      return;
    }

    SWSELogger.log(`[ArchetypeEngineHooks] New character created: ${actor.name}`);

    // Initialize affinity storage
    await initializeActorAffinity(actor);

    // Calculate initial affinity
    const result = await recalculateActorAffinity(actor);

    if (Object.keys(result.affinity).length > 0) {
      SWSELogger.log(
        `[ArchetypeEngineHooks] Initialized affinity for ${actor.name} (${Object.keys(result.affinity).length} archetypes)`
      );
    }
  } catch (err) {
    SWSELogger.error('[ArchetypeEngineHooks] Error on actor create:', err);
  }
}

/**
 * Called when actor is updated
 * Detects changes and recalculates affinity if needed
 */
async function onActorUpdate(actor, change) {
  try {
    // Skip non-character actors
    if (!actor.isCharacter) {
      return;
    }

    const changedPaths = Object.keys(change);

    // Check if any relevant changes occurred
    const relevantChanges = changedPaths.some(path =>
      path.includes('items') ||  // Feats/talents added/removed
      path.includes('attributes')  // Ability scores changed
    );

    if (!relevantChanges) {
      return;
    }

    // Handle the character change
    const result = await handleCharacterChange(actor, changedPaths);

    if (result.updated) {
      SWSELogger.log(
        `[ArchetypeEngineHooks] ${actor.name}: ${result.reason}`
      );

      if (result.stats) {
        SWSELogger.log(
          `  • ${result.stats.archetypeCount} archetypes, ${result.stats.prestigeHints} prestige hints`
        );
      }

      // Emit custom hook so other modules can react
      Hooks.call('swseAffinityUpdated', actor, result);
    }
  } catch (err) {
    SWSELogger.error('[ArchetypeEngineHooks] Error on actor update:', err);
  }
}

/**
 * Called when actor sheet is closed
 * Ensures affinity is up-to-date before closing
 */
async function onActorSheetClose(sheet) {
  try {
    const actor = sheet.actor;

    if (!actor || !actor.isCharacter) {
      return;
    }

    // Final affinity sync
    const result = await handleCharacterChange(actor, []);

    if (result.updated) {
      SWSELogger.log(`[ArchetypeEngineHooks] Final affinity sync for ${actor.name}`);
    }
  } catch (err) {
    // Silent fail - sheet closing shouldn't error
    SWSELogger.debug('[ArchetypeEngineHooks] Error on actor sheet close:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// UTILITY HOOKS FOR LEVEL-UP & SPECIAL EVENTS
// ─────────────────────────────────────────────────────────────

/**
 * Optional: Handle level-up events (call this from your level-up handler)
 *
 * Example usage:
 * ```javascript
 * actor.on('levelUp', async () => {
 *   await onCharacterLevelUp(actor);
 * });
 * ```
 */
export async function onCharacterLevelUp(actor) {
  try {
    if (!actor.isCharacter) {
      return;
    }

    SWSELogger.log(`[ArchetypeEngineHooks] Level-up for ${actor.name} (level ${actor.system.level})`);

    const result = await handleLevelUp(actor);

    if (result.prestigeHints && result.prestigeHints.length > 0) {
      const primaryHints = result.prestigeHints.filter(h => h.strength === 'primary');
      if (primaryHints.length > 0) {
        SWSELogger.log(
          `[ArchetypeEngineHooks] 🎯 New prestige paths for ${actor.name}:`
        );
        primaryHints.forEach(hint => {
          hint.prestigeOptions.forEach(opt => {
            SWSELogger.log(`  - ${opt}`);
          });
        });

        // Emit prestige hint hook
        Hooks.call('swsePrestigeHintsAvailable', actor, result.prestigeHints);
      }
    }

    return result;
  } catch (err) {
    SWSELogger.error('[ArchetypeEngineHooks] Error on level up:', err);
  }
}

/**
 * Optional: Force recalculation for an actor
 * Useful for testing or manual refresh
 *
 * Example usage:
 * ```javascript
 * await forceAffinityRecalculation(actor);
 * ```
 */
export async function forceAffinityRecalculation(actor) {
  try {
    if (!actor.isCharacter) {
      SWSELogger.warn('[ArchetypeEngineHooks] Can only recalculate character actors');
      return;
    }

    SWSELogger.log(`[ArchetypeEngineHooks] Force recalculating affinity for ${actor.name}...`);

    const result = await recalculateActorAffinity(actor);

    SWSELogger.log(
      `[ArchetypeEngineHooks] ✅ Recalculation complete (${Object.keys(result.affinity).length} archetypes)`
    );

    Hooks.call('swseAffinityRecalculated', actor, result);

    return result;
  } catch (err) {
    SWSELogger.error('[ArchetypeEngineHooks] Error forcing recalculation:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// CUSTOM HOOKS (for other modules to listen to)
// ─────────────────────────────────────────────────────────────

/**
 * Custom Foundry hooks you can listen to:
 *
 * 1. swseAffinityUpdated
 *    Fired when archetype affinity is recalculated
 *    Hook.on('swseAffinityUpdated', (actor, result) => { ... })
 *
 * 2. swsePrestigeHintsAvailable
 *    Fired when new prestige hints become available (usually at level-up)
 *    Hook.on('swsePrestigeHintsAvailable', (actor, hints) => { ... })
 *
 * 3. swseAffinityRecalculated
 *    Fired when affinity is manually recalculated
 *    Hook.on('swseAffinityRecalculated', (actor, result) => { ... })
 *
 * Example:
 * ```javascript
 * Hooks.on('swseAffinityUpdated', (actor, result) => {
 *   console.log(`${actor.name}'s affinity was updated!`);
 *   // Refresh UI, send notifications, etc.
 * });
 * ```
 */

// ─────────────────────────────────────────────────────────────
// EXPORT FOR USE IN OTHER MODULES
// ─────────────────────────────────────────────────────────────

export {
  onCharacterLevelUp,
  forceAffinityRecalculation
};

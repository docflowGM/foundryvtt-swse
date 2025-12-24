/**
 * Destiny System Hooks
 * Registers handlers for Destiny Point spending and instant effects
 */

import { SWSELogger } from '../utils/logger.js';
import { DestinyEffects } from '../utils/destiny-effects.js';

export function registerDestinyHooks() {
  SWSELogger.log("SWSE | Registering Destiny Hooks");

  /**
   * Hook: swse.destinyPointSpent
   * Called when a Destiny Point is spent
   *
   * Usage:
   *   Hooks.on('swse.destinyPointSpent', (actor, type, options) => {
   *     // Handle the effect
   *   });
   */

  // Auto-Crit handler
  Hooks.on('swse.destinyPointSpent', async (actor, type, options) => {
    if (type !== 'auto-crit') return;
    SWSELogger.log(`[Destiny] ${actor.name} triggered Auto Crit`);
  });

  // Auto-Miss handler
  Hooks.on('swse.destinyPointSpent', async (actor, type, options) => {
    if (type !== 'auto-miss') return;
    SWSELogger.log(`[Destiny] ${actor.name} triggered Auto Miss`);
  });

  // Act Out of Turn handler
  Hooks.on('swse.destinyPointSpent', async (actor, type, options) => {
    if (type !== 'act-out-of-turn') return;
    SWSELogger.log(`[Destiny] ${actor.name} triggered Act Out of Turn`);
  });

  // Gain Force Points handler
  Hooks.on('swse.destinyPointSpent', async (actor, type, options) => {
    if (type !== 'gain-force-points') return;
    SWSELogger.log(`[Destiny] ${actor.name} triggered Gain Force Points`);
  });

  // Take Damage for Ally handler
  Hooks.on('swse.destinyPointSpent', async (actor, type, options) => {
    if (type !== 'take-damage-for-ally') return;
    SWSELogger.log(`[Destiny] ${actor.name} triggered Take Damage for Ally`);
  });

  // Timed Effects handlers
  Hooks.on('swse.destinyPointSpent', async (actor, type, options) => {
    // Check if this is a timed effect
    const effectKey = type.replace(/\-/g, '-');
    if (!DestinyEffects.TIMED_EFFECTS[type] &&
        !DestinyEffects.TIMED_EFFECTS[effectKey]) return;

    // Effects are already applied by the dialog, just log
    SWSELogger.log(`[Destiny] ${actor.name} triggered timed effect: ${type}`);
  });

  SWSELogger.log("SWSE | Destiny Hooks registered");
}

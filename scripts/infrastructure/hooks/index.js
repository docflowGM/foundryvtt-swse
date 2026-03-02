/**
 * SWSE Hooks Module
 * Central exports for all hook-related functionality
 *
 * @module hooks
 * @description
 * This module provides centralized hook management for the SWSE system.
 * All hooks are registered through the HooksRegistry with priority control.
 *
 * Usage:
 *   import { registerInitHooks } from '../../../../index.js';
 *   registerInitHooks();
 */

export { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
export { registerInitHooks } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/init-hooks.js";
export { registerCombatHooks } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/combat-hooks.js";
export { registerActorHooks } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/actor-hooks.js";
export { registerUIHooks } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/ui-hooks.js";
export { registerLevelUpSheetHooks } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/levelup-sheet-hooks.js";
export { registerDestinyHooks } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/destiny-hooks.js";

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
 *   import { registerInitHooks } from '../../index.js';
 *   registerInitHooks();
 */

export { HooksRegistry } from './hooks-registry.js';
export { registerInitHooks } from './init-hooks.js';
export { registerCombatHooks } from './combat-hooks.js';
export { registerActorHooks } from './actor-hooks.js';
export { registerUIHooks } from './ui-hooks.js';

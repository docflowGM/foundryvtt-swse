/**
 * Actor Lifecycle Hooks
 * All actor-related hook handlers consolidated here
 *
 * @module actor-hooks
 * @description
 * Manages all actor lifecycle hooks:
 * - preUpdateActor: Validation and pre-processing
 * - updateActor: Post-update processing
 * - dropActorSheetData: Drag-and-drop handling
 */

import { HooksRegistry } from './hooks-registry.js';
import { SWSELogger } from '../utils/logger.js';

/**
 * Register all actor-related hooks
 * Called during system initialization
 */
export function registerActorHooks() {
    SWSELogger.log("Registering actor hooks");

    // Pre-update actor validation
    HooksRegistry.register('preUpdateActor', handleActorPreUpdate, {
        id: 'actor-pre-update',
        priority: 0,
        description: 'Validate and preprocess actor updates',
        category: 'actor'
    });

    // Actor sheet drop handling
    HooksRegistry.register('dropActorSheetData', handleActorSheetDrop, {
        id: 'actor-sheet-drop',
        priority: 0,
        description: 'Handle items dropped on actor sheets',
        category: 'actor'
    });
}

/**
 * Handle actor pre-update
 * Validates and preprocesses actor data before updates
 *
 * @param {Actor} actor - The actor being updated
 * @param {Object} changes - The changes being applied
 * @param {Object} options - Update options
 * @param {string} userId - The user ID making the change
 */
function handleActorPreUpdate(actor, changes, options, userId) {
    // Prevent negative HP
    if (changes.system?.hitpoints?.current !== undefined) {
        if (changes.system.hitpoints.current < 0) {
            changes.system.hitpoints.current = 0;
        }
    }
}

/**
 * Handle drops on actor sheets
 * Processes items and other entities dropped onto actor sheets
 *
 * @param {Actor} actor - The actor receiving the drop
 * @param {ActorSheet} sheet - The actor sheet
 * @param {Object} data - The dropped data
 */
async function handleActorSheetDrop(actor, sheet, data) {
    // This is handled by the specific actor sheet classes
    // This hook is here for future extensions or global drop handling
    SWSELogger.log(`Item dropped on ${actor.name}`, data);
}

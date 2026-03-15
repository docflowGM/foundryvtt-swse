/**
 * UI and Non-Render Hooks
 * UI utilities that do not interfere with render lifecycle
 *
 * @module ui-hooks
 * @description
 * Manages UI-related hooks that are safe for the render pipeline:
 * - renderChatMessageHTML: Chat message rendering (non-application)
 * - hotbarDrop: Hotbar macro creation
 *
 * REMOVED:
 * - All renderApplication/ApplicationV2 hooks (render cycle interference)
 * - Window positioning logic (now Sentinel responsibility)
 * - HooksRegistry indirection on render hooks
 */

import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { createItemMacro } from "/systems/foundryvtt-swse/scripts/macros/item-macro.js";
import registerLevelUpSheetHooks from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/levelup-sheet-hooks.js";
import registerChargenSheetHooks from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/chargen-sheet-hooks.js";
import registerStoreSheetHooks from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/store-sheet-hooks.js";
import registerMentorSheetHooks from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/mentor-sheet-hooks.js";
import registerActorSidebarControls from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/actor-sidebar-controls.js";

/**
 * Register all UI-related hooks
 * Called during system initialization
 */
export function registerUIHooks() {
    SWSELogger.log('Registering UI hooks');

    // Chat message rendering (non-application, safe)
    HooksRegistry.register('renderChatMessageHTML', handleRenderChatMessage, {
        id: 'render-chat-message',
        priority: 0,
        description: 'Process chat message HTML',
        category: 'ui'
    });

    // Hotbar drop handling (non-render, safe)
    HooksRegistry.register('hotbarDrop', handleHotbarDrop, {
        id: 'hotbar-drop',
        priority: 0,
        description: 'Create macros from hotbar drops',
        category: 'ui'
    });

    // Actor sheet header integration
    registerLevelUpSheetHooks();
    registerChargenSheetHooks();
    registerStoreSheetHooks();
    registerMentorSheetHooks();

    // Actor sidebar controls (Chargen, Store, Templates)
    registerActorSidebarControls();

    SWSELogger.log('SWSE | UI hooks initialized');
}

/**
 * Handle chat message rendering
 * Processes chat message HTML after rendering
 *
 * @param {ChatMessage} message - The chat message
 * @param {jQuery} html - The message HTML
 * @param {Object} data - The message data
 */
function handleRenderChatMessage(message, html, data) {
    // Add any custom chat message processing here
    // Currently handles roll damage buttons, which are managed by the chat system
}

/**
 * Handle hotbar drops
 * Creates macros from items dropped on the hotbar
 *
 * @param {Hotbar} bar - The hotbar
 * @param {Object} data - The dropped data
 * @param {number} slot - The hotbar slot
 * @returns {boolean} False to prevent default handling
 */
async function handleHotbarDrop(bar, data, slot) {
    if (data.type === 'Item') {
        await createItemMacro(data, slot);
        return false;
    }
}

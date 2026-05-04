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
import registerCustomRollSidebarControl from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/custom-roll-sidebar-control.js";
import { registerChatInteractionBridge } from "/systems/foundryvtt-swse/scripts/ui/chat/chat-interaction-bridge.js";

/**
 * Register all UI-related hooks
 * Called during system initialization
 */
export function registerUIHooks() {
    SWSELogger.log('Registering UI hooks');

    registerChatInteractionBridge();

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
    // NOTE: Chargen and LevelUp buttons are defined in the character sheet template (character-sheet.hbs)
    // and wired through character-sheet.js activateListeners with data-action handlers.
    // The chargen-sheet-hooks and levelup-sheet-hooks were creating DUPLICATE header controls.
    // Those hooks are now disabled to avoid confusion and maintain single authority (template + sheet.js).
    // registerLevelUpSheetHooks();  // DISABLED: Template buttons are authoritative
    // registerChargenSheetHooks();  // DISABLED: Template buttons are authoritative
    registerStoreSheetHooks();
    registerMentorSheetHooks();

    // Actor sidebar controls (Chargen, Store, Templates)
    registerActorSidebarControls();

    // Chat sidebar custom roll launcher
    registerCustomRollSidebarControl();

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
    // Central, V2-safe chat binding/enhancement. The bridge only touches SWSE-owned
    // chat card surfaces and delegates roll/damage/reaction work to engines.
    registerChatInteractionBridge();
    // Safe fallback for registries that dispatch this handler directly. The bridge
    // is idempotent, so duplicate render-hook paths do not double-bind controls.
    globalThis.SWSE?.ChatInteractionBridge?.bind?.(message, html, data);
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

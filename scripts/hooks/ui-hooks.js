/**
 * UI and Rendering Hooks
 * All UI-related hook handlers consolidated here
 *
 * @module ui-hooks
 * @description
 * Manages all UI and rendering hooks:
 * - renderApplication: Application rendering
 * - renderChatMessageHTML: Chat message rendering
 * - hotbarDrop: Hotbar macro creation
 */

import { HooksRegistry } from './hooks-registry.js';
import { SWSELogger } from '../utils/logger.js';
import { createItemMacro } from '../macros/item-macro.js';

/**
 * Register all UI-related hooks
 * Called during system initialization
 */
export function registerUIHooks() {
    SWSELogger.log("Registering UI hooks");

    // Application rendering
    HooksRegistry.register('renderApplication', handleRenderApplication, {
        id: 'render-application',
        priority: 0,
        description: 'Adjust application window positions',
        category: 'ui'
    });

    // Chat message rendering
    HooksRegistry.register('renderChatMessageHTML', handleRenderChatMessage, {
        id: 'render-chat-message',
        priority: 0,
        description: 'Process chat message HTML',
        category: 'ui'
    });

    // Hotbar drop handling
    HooksRegistry.register('hotbarDrop', handleHotbarDrop, {
        id: 'hotbar-drop',
        priority: 0,
        description: 'Create macros from hotbar drops',
        category: 'ui'
    });
}

/**
 * Handle application rendering
 * Ensures applications don't render outside the visible viewport
 *
 * @param {Application} app - The application being rendered
 * @param {jQuery} html - The HTML content
 * @param {Object} data - The rendering data
 */
function handleRenderApplication(app, html, data) {
    // Ensure application is within viewport bounds
    const position = app.position;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let updated = false;

    if (position.left + position.width > windowWidth) {
        position.left = Math.max(0, windowWidth - position.width);
        updated = true;
    }

    if (position.top + position.height > windowHeight) {
        position.top = Math.max(0, windowHeight - position.height);
        updated = true;
    }

    if (updated) {
        app.setPosition(position);
    }
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
    if (data.type === "Item") {
        await createItemMacro(data, slot);
        return false;
    }
}

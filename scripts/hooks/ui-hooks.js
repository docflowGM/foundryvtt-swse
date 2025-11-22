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
 * Positions windows on the left side of the screen and ensures they're within viewport
 *
 * @param {Application} app - The application being rendered
 * @param {jQuery} html - The HTML content
 * @param {Object} data - The rendering data
 */
function handleRenderApplication(app, html, data) {
    // Skip positioning for sidebar and UI elements
    if (app.id === 'sidebar' || app.id === 'ui-left' || app.id === 'ui-right') {
        return;
    }

    const position = app.position;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Get sidebar width (default 280px + 40px for tabs)
    const sidebarWidth = 320;
    const leftMargin = 50; // Left margin from screen edge
    const topMargin = 50;  // Top margin from screen edge

    let updated = false;

    // Position on the left side if not explicitly positioned
    // Only set position on first render (when left is null or default centered)
    if (position.left === null || position.left > (windowWidth - sidebarWidth) / 2) {
        position.left = leftMargin;
        updated = true;
    }

    // Set top position if not set
    if (position.top === null || position.top > windowHeight / 2) {
        position.top = topMargin;
        updated = true;
    }

    // Ensure application stays within viewport bounds
    if (position.left + position.width > windowWidth - sidebarWidth) {
        position.left = Math.max(leftMargin, windowWidth - sidebarWidth - position.width - 10);
        updated = true;
    }

    if (position.top + position.height > windowHeight) {
        position.top = Math.max(topMargin, windowHeight - position.height - 10);
        updated = true;
    }

    // Ensure minimum left position
    if (position.left < leftMargin) {
        position.left = leftMargin;
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

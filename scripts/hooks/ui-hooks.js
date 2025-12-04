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
 * Centers windows in the viewport on initial render, avoiding sidebar overlap
 * Allows natural window stacking and cascading for subsequent renders
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

    // Dynamically get sidebar width (Forge may have different dimensions)
    let sidebarWidth = 320; // Default fallback
    try {
        const sidebarElement = document.getElementById('sidebar');
        if (sidebarElement && !sidebarElement.classList.contains('collapsed')) {
            // Get actual sidebar width including tabs
            sidebarWidth = sidebarElement.offsetWidth;
        } else if (sidebarElement && sidebarElement.classList.contains('collapsed')) {
            // Collapsed sidebar is much smaller
            sidebarWidth = 40; // Just the tab width
        }
    } catch (e) {
        console.warn('SWSE | Could not detect sidebar width, using default:', e);
    }

    const leftMargin = 50; // Left margin from screen edge
    const topMargin = 50;  // Top margin from screen edge
    const rightBoundary = windowWidth - sidebarWidth - 20; // Don't overlap sidebar

    let updated = false;

    // Check if this is the first render (Foundry uses default positioning)
    // Center the window in the available space (excluding sidebar)
    const isInitialRender = position.left === null ||
                           position.left === undefined ||
                           (position.left > rightBoundary - 100); // Likely defaulted to right edge

    if (isInitialRender) {
        // Calculate available width (excluding sidebar)
        const availableWidth = rightBoundary - leftMargin;

        // Center horizontally in available space
        position.left = leftMargin + (availableWidth - position.width) / 2;

        // Center vertically
        position.top = (windowHeight - position.height) / 2;

        // Ensure minimum margins
        position.left = Math.max(leftMargin, position.left);
        position.top = Math.max(topMargin, position.top);

        updated = true;
    } else {
        // For already-positioned windows, only adjust if they overlap the sidebar
        if (position.left + position.width > rightBoundary) {
            position.left = Math.max(leftMargin, rightBoundary - position.width);
            updated = true;
        }

        // Ensure window doesn't go off the left edge
        if (position.left < leftMargin) {
            position.left = leftMargin;
            updated = true;
        }

        // Ensure window doesn't go off the top
        if (position.top < topMargin) {
            position.top = topMargin;
            updated = true;
        }

        // Ensure window doesn't go off the bottom
        if (position.top + position.height > windowHeight) {
            position.top = Math.max(topMargin, windowHeight - position.height - 10);
            updated = true;
        }
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

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

    // Application V1 rendering (legacy support)
    HooksRegistry.register('renderApplication', handleRenderApplication, {
        id: 'render-application',
        priority: 0,
        description: 'Adjust application window positions',
        category: 'ui'
    });

    HooksRegistry.register('renderFormApplication', handleRenderApplication, {
        id: 'render-form-application',
        priority: 0,
        description: 'Adjust form application window positions',
        category: 'ui'
    });

    HooksRegistry.register('renderDocumentSheet', handleRenderApplication, {
        id: 'render-document-sheet',
        priority: 0,
        description: 'Adjust document sheet window positions',
        category: 'ui'
    });

    // Application V2 rendering (Foundry V13+)
    HooksRegistry.register('renderApplicationV2', handleRenderApplication, {
        id: 'render-application-v2',
        priority: 0,
        description: 'Adjust V2 application window positions',
        category: 'ui'
    });

    HooksRegistry.register('renderDocumentSheetV2', handleRenderApplication, {
        id: 'render-document-sheet-v2',
        priority: 0,
        description: 'Adjust V2 document sheet window positions',
        category: 'ui'
    });

    // Sidebar state change
    HooksRegistry.register('collapseSidebar', handleSidebarCollapse, {
        id: 'collapse-sidebar',
        priority: 0,
        description: 'Reposition windows when sidebar collapses',
        category: 'ui'
    });

    // Window resize handler
    let resizeTimeout;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            for (const app of Object.values(ui.windows)) {
                if (app.rendered && app.options?.popOut) {
                    handleRenderApplication(app, app.element, {});
                }
            }
        }, 100);
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

    SWSELogger.log("SWSE | UI hooks initialized");
}

/**
 * Calculate available viewport space accounting for UI elements
 * @returns {Object} Boundaries object with min/max coordinates
 */
function getViewportBounds() {
    const sidebar = document.getElementById("sidebar");
    const controls = document.getElementById("controls");
    const navigation = document.getElementById("navigation");
    const hotbar = document.getElementById("hotbar");

    const sidebarCollapsed = sidebar?.classList.contains("collapsed");

    return {
        minX: (controls?.offsetWidth || 80) + 10,
        minY: (navigation?.offsetHeight || 32) + 10,
        maxX: window.innerWidth - (sidebarCollapsed ? 40 : (sidebar?.offsetWidth || 300)) - 10,
        maxY: window.innerHeight - (hotbar?.offsetHeight || 52) - 10,
        sidebarWidth: sidebarCollapsed ? 40 : (sidebar?.offsetWidth || 300),
        controlsWidth: controls?.offsetWidth || 80
    };
}

/**
 * Constrain a position to viewport bounds
 * @param {Object} position - Current position {left, top, width, height}
 * @param {Object} bounds - Viewport bounds from getViewportBounds()
 * @returns {Object} Constrained position
 */
function constrainPosition(position, bounds) {
    const width = position.width || 400;
    const height = position.height || 300;

    return {
        left: Math.max(bounds.minX, Math.min(position.left || bounds.minX, bounds.maxX - width)),
        top: Math.max(bounds.minY, Math.min(position.top || bounds.minY, bounds.maxY - Math.min(height, 100))),
        width: Math.min(width, bounds.maxX - bounds.minX),
        height: position.height
    };
}

/**
 * Handle application rendering
 * Constrains windows to viewport, preventing off-screen rendering
 * Compatible with Foundry V13 ApplicationV2
 *
 * @param {Application} app - The application being rendered
 * @param {jQuery} html - The HTML content
 * @param {Object} data - The rendering data
 */
function handleRenderApplication(app, html, data) {
    // Only process pop-out windows
    if (!app.options?.popOut && !app.options?.window?.frame) return;

    // Skip certain application types that handle their own positioning
    const skipClasses = ['Sidebar', 'Hotbar', 'SceneNavigation', 'MainMenu'];
    if (skipClasses.some(cls => app.constructor.name.includes(cls))) return;

    const bounds = getViewportBounds();
    const currentPos = app.position || {};

    // Check if current position is out of bounds
    const isOutOfBounds =
        currentPos.left < bounds.minX ||
        currentPos.left > bounds.maxX - (currentPos.width || 400) ||
        currentPos.top < bounds.minY;

    if (isOutOfBounds) {
        const constrainedPos = constrainPosition(currentPos, bounds);
        app.setPosition(constrainedPos);
    }
}

/**
 * Handle sidebar collapse/expand - reposition affected windows
 */
function handleSidebarCollapse() {
    // Re-check all open windows when sidebar state changes
    for (const app of Object.values(ui.windows)) {
        if (app.rendered && app.options?.popOut) {
            handleRenderApplication(app, app.element, {});
        }
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

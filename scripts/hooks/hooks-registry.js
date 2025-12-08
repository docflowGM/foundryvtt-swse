/**
 * Centralized Hook Registration System
 * Single source of truth for all FoundryVTT hooks in the SWSE system
 *
 * @module hooks-registry
 * @description
 * This registry provides centralized management of all Foundry VTT hooks with:
 * - Execution order control via priority system
 * - Hook metadata and documentation
 * - Conditional enabling/disabling
 * - Debug utilities for troubleshooting
 *
 * @example
 * // Register a hook
 * HooksRegistry.register('combatTurn', handleCombatTurn, {
 *   id: 'combat-turn-main',
 *   priority: 10,
 *   description: 'Process combat turn events'
 * });
 *
 * // Activate all hooks (call during init)
 * HooksRegistry.activateAll();
 *
 * // Debug in console
 * SWSEHooks.listAll();
 */

export class HooksRegistry {
    static #registered = new Map();
    static #activated = false;

    /**
     * Register a hook with metadata
     *
     * @param {string} hookName - The Foundry hook name (e.g., 'combatTurn', 'updateActor')
     * @param {Function} handler - The handler function to execute
     * @param {Object} options - Registration options
     * @param {string} [options.id] - Unique identifier for this hook registration
     * @param {number} [options.priority=0] - Execution priority (lower numbers execute first)
     * @param {boolean} [options.once=false] - Whether to use Hooks.once instead of Hooks.on
     * @param {boolean} [options.enabled=true] - Whether this hook should be activated
     * @param {string} [options.description=''] - Human-readable description
     * @param {string} [options.category='general'] - Category for organization
     * @returns {string} The registration ID
     */
    static register(hookName, handler, options = {}) {
        const {
            id = `${hookName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            priority = 0,
            once = false,
            enabled = true,
            description = '',
            category = 'general'
        } = options;

        if (this.#registered.has(id)) {
            swseLogger.warn(`[HooksRegistry] Hook ID '${id}' already registered. Overwriting.`);
        }

        const registration = {
            hookName,
            handler,
            id,
            priority,
            once,
            enabled,
            description,
            category,
            registered: false,
            activatedAt: null
        };

        this.#registered.set(id, registration);

        swseLogger.log(`[HooksRegistry] Registered ${hookName} (${id}, priority: ${priority}) - ${description}`);

        // If hooks have already been activated, activate this one immediately
        if (this.#activated && enabled) {
            this.#activateSingle(registration);
        }

        return id;
    }

    /**
     * Activate all registered hooks
     * This should be called once during system initialization
     *
     * @returns {number} Number of hooks activated
     */
    static activateAll() {
        if (this.#activated) {
            swseLogger.warn('[HooksRegistry] Hooks already activated. Skipping duplicate activation.');
            return 0;
        }

        // Get all enabled, non-activated hooks
        const toActivate = Array.from(this.#registered.values())
            .filter(r => r.enabled && !r.registered);

        // Sort by priority (lower numbers first)
        toActivate.sort((a, b) => a.priority - b.priority);

        swseLogger.log(`[HooksRegistry] Activating ${toActivate.length} hooks...`);

        let activated = 0;
        for (const registration of toActivate) {
            this.#activateSingle(registration);
            activated++;
        }

        this.#activated = true;

        swseLogger.log(`[HooksRegistry] Successfully activated ${activated} hooks`);

        return activated;
    }

    /**
     * Activate a single hook registration
     * @private
     */
    static #activateSingle(registration) {
        try {
            const method = registration.once ? 'once' : 'on';
            Hooks[method](registration.hookName, registration.handler);
            registration.registered = true;
            registration.activatedAt = new Date();

            swseLogger.log(
                `[HooksRegistry] ✓ Activated ${registration.hookName} ` +
                `(${registration.id}, priority: ${registration.priority})`
            );
        } catch (error) {
            swseLogger.error(
                `[HooksRegistry] ✗ Failed to activate ${registration.hookName} (${registration.id})`,
                error
            );
        }
    }

    /**
     * Enable a previously disabled hook
     *
     * @param {string} id - The hook registration ID
     * @returns {boolean} Success status
     */
    static enable(id) {
        const registration = this.#registered.get(id);
        if (!registration) {
            swseLogger.warn(`[HooksRegistry] Hook ID '${id}' not found`);
            return false;
        }

        registration.enabled = true;

        // If hooks are already activated and this hook isn't registered yet, activate it now
        if (this.#activated && !registration.registered) {
            this.#activateSingle(registration);
        }

        return true;
    }

    /**
     * Disable a hook (prevents future activation, doesn't deactivate already active hooks)
     *
     * @param {string} id - The hook registration ID
     * @returns {boolean} Success status
     */
    static disable(id) {
        const registration = this.#registered.get(id);
        if (!registration) {
            swseLogger.warn(`[HooksRegistry] Hook ID '${id}' not found`);
            return false;
        }

        registration.enabled = false;
        swseLogger.log(`[HooksRegistry] Disabled ${registration.hookName} (${id})`);

        return true;
    }

    /**
     * Get information about a specific hook registration
     *
     * @param {string} id - The hook registration ID
     * @returns {Object|null} Hook information or null if not found
     */
    static get(id) {
        const registration = this.#registered.get(id);
        if (!registration) return null;

        return {
            id: registration.id,
            hook: registration.hookName,
            priority: registration.priority,
            once: registration.once,
            category: registration.category,
            description: registration.description,
            enabled: registration.enabled,
            active: registration.registered,
            activatedAt: registration.activatedAt
        };
    }

    /**
     * List all registered hooks with their metadata
     *
     * @param {Object} filters - Optional filters
     * @param {string} [filters.category] - Filter by category
     * @param {string} [filters.hookName] - Filter by hook name
     * @param {boolean} [filters.enabled] - Filter by enabled status
     * @returns {Array<Object>} Array of hook information objects
     */
    static listAll(filters = {}) {
        let hooks = Array.from(this.#registered.values());

        // Apply filters
        if (filters.category) {
            hooks = hooks.filter(r => r.category === filters.category);
        }
        if (filters.hookName) {
            hooks = hooks.filter(r => r.hookName === filters.hookName);
        }
        if (filters.enabled !== undefined) {
            hooks = hooks.filter(r => r.enabled === filters.enabled);
        }

        // Sort by priority
        hooks.sort((a, b) => a.priority - b.priority);

        return hooks.map(r => ({
            id: r.id,
            hook: r.hookName,
            priority: r.priority,
            once: r.once,
            category: r.category,
            description: r.description,
            enabled: r.enabled,
            active: r.registered,
            activatedAt: r.activatedAt
        }));
    }

    /**
     * Get hooks grouped by category
     *
     * @returns {Object} Hooks grouped by category
     */
    static listByCategory() {
        const hooks = this.listAll();
        const grouped = {};

        for (const hook of hooks) {
            if (!grouped[hook.category]) {
                grouped[hook.category] = [];
            }
            grouped[hook.category].push(hook);
        }

        return grouped;
    }

    /**
     * Get execution order for a specific hook name
     * Useful for debugging race conditions
     *
     * @param {string} hookName - The hook name to analyze
     * @returns {Array<Object>} Handlers in execution order
     */
    static getExecutionOrder(hookName) {
        return this.listAll({ hookName }).sort((a, b) => a.priority - b.priority);
    }

    /**
     * Clear all registrations (use with caution, mainly for testing)
     */
    static clear() {
        this.#registered.clear();
        this.#activated = false;
        swseLogger.log('[HooksRegistry] All registrations cleared');
    }

    /**
     * Get statistics about registered hooks
     *
     * @returns {Object} Statistics object
     */
    static getStats() {
        const hooks = Array.from(this.#registered.values());

        return {
            total: hooks.length,
            enabled: hooks.filter(h => h.enabled).length,
            disabled: hooks.filter(h => !h.enabled).length,
            active: hooks.filter(h => h.registered).length,
            inactive: hooks.filter(h => !h.registered).length,
            once: hooks.filter(h => h.once).length,
            on: hooks.filter(h => !h.once).length,
            byCategory: Object.entries(
                hooks.reduce((acc, h) => {
                    acc[h.category] = (acc[h.category] || 0) + 1;
                    return acc;
                }, {})
            ).map(([category, count]) => ({ category, count })),
            byHook: Object.entries(
                hooks.reduce((acc, h) => {
                    acc[h.hookName] = (acc[h.hookName] || 0) + 1;
                    return acc;
                }, {})
            ).map(([hookName, count]) => ({ hookName, count }))
        };
    }
}

// Expose to window for debugging in browser console
if (typeof window !== 'undefined') {
    window.SWSEHooks = HooksRegistry;
}

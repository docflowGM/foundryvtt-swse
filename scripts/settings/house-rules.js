/**
 * House Rules Configuration
 * Centralized management of house rule settings and overrides
 */

import { ClassRelationshipRegistry } from '../data/class-relationship-registry.js';

export function registerHouseRuleSettings() {
    // Dark Side Prestige Access House Rule
    game.settings.register('foundryvtt-swse', 'enableDarkSideTreeAccess', {
        name: 'Dark Side Prestige Access to Lightsaber Trees',
        hint: 'If enabled, Sith Apprentice and Sith Lord gain automatic access to Lightsaber Combat and Lightsaber Forms talent trees.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    // Class → Tree Access Override Configuration
    game.settings.registerMenu('foundryvtt-swse', 'classTreeAccessMenu', {
        name: 'Class → Tree Access Overrides',
        label: 'Configure Class Access',
        icon: 'fas fa-sliders-h',
        type: ClassTreeAccessForm,
        restricted: true
    });

    game.settings.register('foundryvtt-swse', 'classTreeOverrides', {
        name: 'Class Tree Access Overrides (JSON)',
        hint: 'Programmatic overrides for class → tree access. Format: { "classId": ["treeId1", "treeId2"] }',
        scope: 'world',
        config: false,
        type: Object,
        default: {}
    });
}

/**
 * Form application for configuring class → tree access overrides
 */
export class ClassTreeAccessForm extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: 'Class → Tree Access Overrides',
            id: 'class-tree-access-form',
            template: 'systems/foundryvtt-swse/templates/apps/class-tree-access-form.html',
            width: 700,
            height: 'auto',
            resizable: true
        });
    }

    async getData(options = {}) {
        const overrides = game.settings.get('foundryvtt-swse', 'classTreeOverrides');
        const allTrees = this._getAvailableTrees();
        const selectedTrees = overrides || {};

        const classes = Array.from(ClassRelationshipRegistry.classToTrees.keys())
            .map(classId => ({
                id: classId,
                name: this._getClassName(classId),
                trees: allTrees.map(tree => ({
                    id: tree.id,
                    name: tree.name,
                    isSelected: (selectedTrees[classId] || []).includes(tree.id)
                }))
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return {
            classes
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        // Custom listeners can be added here if needed
    }

    async _updateObject(event, formData) {
        const overrides = {};

        // Parse form data - handle nested checkbox arrays
        for (const [key, value] of Object.entries(formData)) {
            if (key.startsWith('trees_')) {
                const classId = key.replace('trees_', '');
                const treeIds = Array.isArray(value) ? value : (value ? [value] : []);
                if (treeIds.length > 0) {
                    overrides[classId] = treeIds;
                }
            }
        }

        await game.settings.set('foundryvtt-swse', 'classTreeOverrides', overrides);
    }

    _getClassName(classId) {
        // Try to get from compendium if available
        const normalized = classId.replace(/_/g, ' ').toTitleCase();
        return normalized;
    }

    _getAvailableTrees() {
        return Array.from(ClassRelationshipRegistry.treeToClasses.keys())
            .map(treeId => ({
                id: treeId,
                name: treeId.replace(/_/g, ' ').toTitleCase()
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
}

/**
 * Helper: Get all class → tree overrides
 */
export function getClassTreeOverrides() {
    return game.settings.get('foundryvtt-swse', 'classTreeOverrides') || {};
}

/**
 * Helper: Add tree access to a class
 */
export async function addClassTreeAccess(classId, treeId) {
    const overrides = getClassTreeOverrides();
    if (!overrides[classId]) {
        overrides[classId] = [];
    }
    if (!overrides[classId].includes(treeId)) {
        overrides[classId].push(treeId);
        await game.settings.set('foundryvtt-swse', 'classTreeOverrides', overrides);
    }
}

/**
 * Helper: Remove tree access from a class
 */
export async function removeClassTreeAccess(classId, treeId) {
    const overrides = getClassTreeOverrides();
    if (overrides[classId]) {
        overrides[classId] = overrides[classId].filter(t => t !== treeId);
        if (overrides[classId].length === 0) {
            delete overrides[classId];
        }
        await game.settings.set('foundryvtt-swse', 'classTreeOverrides', overrides);
    }
}

/**
 * Helper: Clear all overrides for a class
 */
export async function clearClassTreeOverrides(classId) {
    const overrides = getClassTreeOverrides();
    delete overrides[classId];
    await game.settings.set('foundryvtt-swse', 'classTreeOverrides', overrides);
}

/**
 * Helper: Check if Dark Side prestige rule is enabled
 */
export function isDarkSidePrestigeRuleEnabled() {
    return game.settings.get('foundryvtt-swse', 'enableDarkSideTreeAccess') === true;
}

/**
 * ENGINE HELPERS
 * Utility functions used by the dispatcher, progression engine, and related systems.
 *
 * Provides:
 * - Safe actor/item updates
 * - Feature normalization
 * - Scaling expression resolution
 * - Item data builders
 */

import { SWSELogger } from '../../utils/logger.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';

export const ProgressionEngineHelpers = {

    /**
     * Safely update an actor with error handling
     */
    async safeActorUpdate(actor, updates) {
        try {
            // PHASE 3: Route through ActorEngine
            return await ActorEngine.updateActor(actor, updates);
        } catch (err) {
            SWSELogger.error('SafeActorUpdate failed:', err);
            ui.notifications?.error('Actor update failed. Check console.');
            return null;
        }
    },

    /**
     * Add item to actor if it doesn't already exist
     */
    async addItemIfMissing(actor, itemData) {
        const exists = actor.items.find(i => i.name === itemData.name && i.type === itemData.type);
        if (exists) {return exists;}

        try {
            // PHASE 3: Route through ActorEngine
            const created = await ActorEngine.createEmbeddedDocuments(actor, 'Item', [itemData]);
            return created[0];
        } catch (err) {
            SWSELogger.error('addItemIfMissing failed:', err);
            ui.notifications?.error('Failed to grant item: ' + itemData.name);
            return null;
        }
    },

    /**
     * Grant a simple item by name
     */
    async grantSimpleItem(actor, name, type = 'feat', description = '') {
        const itemData = {
            name,
            type,
            img: 'icons/svg/upgrade.svg',
            system: { description }
        };
        return this.addItemIfMissing(actor, itemData);
    },

    /**
     * Parse and resolve scaling expressions
     *
     * Examples:
     * - "classLevel * 2"
     * - "5 + characterLevel"
     * - "conMod + 2"
     */
    resolveScaling(feature, engine) {
        const expr = feature.value || feature.formula || null;
        if (!expr) {return 0;}

        const context = {
            classLevel: engine.getSelectedClassLevel ? engine.getSelectedClassLevel() : 1,
            characterLevel: engine.getNewCharacterLevel ? engine.getNewCharacterLevel() : 1,
            conMod: engine.getAbilityMod ? engine.getAbilityMod('con') : 0,
            strMod: engine.getAbilityMod ? engine.getAbilityMod('str') : 0,
            dexMod: engine.getAbilityMod ? engine.getAbilityMod('dex') : 0,
            intMod: engine.getAbilityMod ? engine.getAbilityMod('int') : 0,
            wisMod: engine.getAbilityMod ? engine.getAbilityMod('wis') : 0,
            chaMod: engine.getAbilityMod ? engine.getAbilityMod('cha') : 0
        };

        try {
            const fn = Function(...Object.keys(context), `return ${expr};`);
            const result = fn(...Object.values(context));
            return Number(result) || 0;
        } catch (err) {
            SWSELogger.error('Scaling resolution failed:', feature, err);
            return 0;
        }
    },

    /**
     * Normalize a feature object to standard structure
     */
    normalizeFeature(feature) {
        if (!feature) {return null;}

        return {
            name: feature.name || '',
            type: feature.type || 'class_feature',
            value: feature.value ?? null,
            formula: feature.formula ?? null,
            items: feature.items ?? [],
            description: feature.description ?? '',
            tags: feature.tags ?? []
        };
    },

    /**
     * Normalize a string for comparison
     */
    normalizeString(str) {
        if (!str || typeof str !== 'string') {return '';}
        return str.trim().toLowerCase();
    },

    /**
     * Get feature name from various possible properties
     */
    getFeatureName(feature) {
        if (!feature) {return '';}
        return feature.name || feature.title || feature.label || '';
    },

    /**
     * Remove existing items by name and type
     */
    async removeExistingByName(actor, name, type = null) {
        const matches = actor.items.filter(i => i.name === name && (!type || i.type === type));
        if (matches.length === 0) {return;}

        for (const m of matches) {
            try {
                await m.delete();
            } catch (err) {
                SWSELogger.error('Failed to delete item:', name, err);
            }
        }
    },

    /**
     * Grant or replace an item (deletes existing, then creates new)
     */
    async grantOrReplace(actor, itemData) {
        await this.removeExistingByName(actor, itemData.name, itemData.type);
        return this.addItemIfMissing(actor, itemData);
    },

    /**
     * Safe number conversion with default
     */
    safeNumber(val, def = 0) {
        const num = Number(val);
        return isNaN(num) ? def : num;
    },

    /**
     * Build consistent item data for creation
     */
    makeItemData(name, type, data = {}) {
        return {
            name,
            type,
            img: data.img || 'icons/svg/upgrade.svg',
            system: {
                description: data.description || '',
                ...data
            }
        };
    },

    /**
     * Extract name after colon
     *
     * Examples:
     * - "Talent: Block" → "Block"
     * - "Feat: Mobility" → "Mobility"
     */
    extractNameAfterColon(str) {
        if (!str) {return '';}
        const idx = str.indexOf(':');
        if (idx === -1) {return str.trim();}
        return str.slice(idx + 1).trim();
    },

    /**
     * Parse comma-separated list of items
     */
    parseItemList(str) {
        if (!str) {return [];}
        if (Array.isArray(str)) {return str;}
        return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
    },

    /**
     * Check if an actor has an item
     */
    hasItem(actor, name, type) {
        return actor.items.some(i => i.name === name && (!type || i.type === type));
    },

    /**
     * Get all items of a type
     */
    getItemsByType(actor, type) {
        return actor.items.filter(i => i.type === type);
    },

    /**
     * Count items of a type
     */
    countItemsByType(actor, type) {
        return this.getItemsByType(actor, type).length;
    }
};

export default ProgressionEngineHelpers;

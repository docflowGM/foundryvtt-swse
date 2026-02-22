/**
 * Equipment Engine
 * Centralized system for managing character equipment and starting credits.
 *
 * Handles:
 * - Starting credits from class/background
 * - Class starting equipment packs
 * - Background starting equipment
 * - Species automatic equipment
 * - Prestige class featured items
 * - Equipment grants from feats/talents
 * - Credit allocation and tracking
 */

import { SWSELogger } from '../../utils/logger.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';

export class EquipmentEngine {

    /**
     * Get starting credits for a character
     * Based on class and background
     */
    static async getStartingCredits(actor, className, backgroundName) {
        let credits = 0;

        // Get class starting credits
        if (className) {
            const classPack = game.packs.get('foundryvtt-swse.classes');
            if (classPack) {
                const classIndex = classPack.index.find(c => c.name === className);
                if (classIndex) {
                    const classDoc = await classPack.getDocument(classIndex._id);
                    // NOTE: Compendium may use camelCase 'startingCredits' or snake_case 'starting_credits'
                    const classCredits = classDoc?.system?.startingCredits || classDoc?.system?.starting_credits;
                    if (classCredits) {
                        credits += classCredits;
                    }
                }
            }
        }

        // Get background starting credits
        if (backgroundName) {
            const bgPack = game.packs.get('foundryvtt-swse.backgrounds');
            if (bgPack) {
                const bgIndex = bgPack.index.find(b => b.name === backgroundName);
                if (bgIndex) {
                    const bgDoc = await bgPack.getDocument(bgIndex._id);
                    // NOTE: Compendium may use camelCase 'startingCredits' or snake_case 'starting_credits'
                    const bgCredits = bgDoc?.system?.startingCredits || bgDoc?.system?.starting_credits;
                    if (bgCredits) {
                        credits += bgCredits;
                    }
                }
            }
        }

        SWSELogger.log(`Starting credits calculated: ${credits}`);
        return credits;
    }

    /**
     * Set actor credits
     */
    static async setCredits(actor, amount) {
        await globalThis.SWSE.ActorEngine.updateActor(actor, {
            'system.credits': amount
        }, {
            meta: { guardKey: 'equipment-credits-update' }
        });

        SWSELogger.log(`Credits set to: ${amount}`);
    }

    /**
     * Add credits to actor
     */
    static async addCredits(actor, amount) {
        const current = actor.system.credits || 0;
        const updated = current + amount;

        await this.setCredits(actor, updated);
        return updated;
    }

    /**
     * Get starting equipment from class
     */
    static async getClassStartingEquipment(className) {
        const classPack = game.packs.get('foundryvtt-swse.classes');
        if (!classPack) {return [];}

        const classIndex = classPack.index.find(c => c.name === className);
        if (!classIndex) {return [];}

        const classDoc = await classPack.getDocument(classIndex._id);
        if (!classDoc) {return [];}

        return classDoc.system?.startingEquipment || [];
    }

    /**
     * Get starting equipment from background
     */
    static async getBackgroundStartingEquipment(backgroundName) {
        const bgPack = game.packs.get('foundryvtt-swse.backgrounds');
        if (!bgPack) {return [];}

        const bgIndex = bgPack.index.find(b => b.name === backgroundName);
        if (!bgIndex) {return [];}

        const bgDoc = await bgPack.getDocument(bgIndex._id);
        if (!bgDoc) {return [];}

        return bgDoc.system?.startingEquipment || [];
    }

    /**
     * Grant equipment to actor
     */
    static async grantEquipment(actor, equipmentList) {
        const itemsToCreate = [];

        for (const equipment of equipmentList) {
            // Check if already owned
            const exists = actor.items.some(i =>
                i.type === 'equipment' && i.name === equipment.name
            );

            if (!exists) {
                itemsToCreate.push({
                    name: equipment.name || equipment,
                    type: 'equipment',
                    img: equipment.img || 'icons/commodities/misc/chest-coins.webp',
                    system: {
                        description: equipment.description || 'Starting equipment',
                        quantity: equipment.quantity || 1,
                        weight: equipment.weight || 0,
                        value: equipment.value || 0,
                        equipped: equipment.equipped !== false // Default to equipped
                    }
                });
            }
        }

        if (itemsToCreate.length > 0) {
            // PHASE 3: Route through ActorEngine
            await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
            SWSELogger.log(`Granted ${itemsToCreate.length} equipment items`);
        }

        return itemsToCreate.length;
    }

    /**
     * Grant weapons to actor
     */
    static async grantWeapons(actor, weaponList) {
        const itemsToCreate = [];

        for (const weapon of weaponList) {
            // Check if already owned
            const exists = actor.items.some(i =>
                i.type === 'weapon' && i.name === weapon.name
            );

            if (!exists) {
                itemsToCreate.push({
                    name: weapon.name || weapon,
                    type: 'weapon',
                    img: weapon.img || 'icons/weapons/melee/sword-broad-curved.webp',
                    system: {
                        description: weapon.description || 'Starting weapon',
                        quantity: weapon.quantity || 1,
                        equipped: weapon.equipped !== false
                    }
                });
            }
        }

        if (itemsToCreate.length > 0) {
            // PHASE 3: Route through ActorEngine
            await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
            SWSELogger.log(`Granted ${itemsToCreate.length} weapons`);
        }

        return itemsToCreate.length;
    }

    /**
     * Grant armor to actor
     */
    static async grantArmor(actor, armorList) {
        const itemsToCreate = [];

        for (const armor of armorList) {
            // Check if already owned
            const exists = actor.items.some(i =>
                i.type === 'armor' && i.name === armor.name
            );

            if (!exists) {
                itemsToCreate.push({
                    name: armor.name || armor,
                    type: 'armor',
                    img: armor.img || 'icons/equipment/chest/chestplate-leather-brown.webp',
                    system: {
                        description: armor.description || 'Starting armor',
                        equipped: armor.equipped !== false
                    }
                });
            }
        }

        if (itemsToCreate.length > 0) {
            // PHASE 3: Route through ActorEngine
            await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
            SWSELogger.log(`Granted ${itemsToCreate.length} armor pieces`);
        }

        return itemsToCreate.length;
    }

    /**
     * Create equipment selection dialog
     * Allows player to choose from available starting equipment
     */
    static async createEquipmentSelectionDialog(availableEquipment) {
        return new Promise((resolve) => {
            // This would create a dialog for equipment selection
            SWSELogger.log(`Equipment selection needed: choose from ${availableEquipment.length} items`);
            resolve(availableEquipment);
        });
    }

    /**
     * Finalize all equipment (called at end of level-up/chargen)
     */
    static async finalizeEquipment(actor, className, backgroundName) {
        try {
            // Set starting credits
            const credits = await this.getStartingCredits(actor, className, backgroundName);
            await this.setCredits(actor, credits);

            // Grant class starting equipment
            const classEquipment = await this.getClassStartingEquipment(className);
            await this.grantEquipment(actor, classEquipment);

            // Grant background starting equipment
            const bgEquipment = await this.getBackgroundStartingEquipment(backgroundName);
            await this.grantEquipment(actor, bgEquipment);

            SWSELogger.log('Equipment finalization complete');
            return true;
        } catch (err) {
            SWSELogger.error('Equipment finalization failed:', err);
            return false;
        }
    }

    /**
     * Get total weight carried
     */
    static getTotalWeight(actor) {
        let total = 0;

        actor.items.forEach(item => {
            if (item.system?.weight && item.system?.quantity) {
                total += (item.system.weight * item.system.quantity);
            }
        });

        return total;
    }

    /**
     * Calculate carrying capacity
     * SWSE rule: Strength score * 10 in pounds
     */
    static getCarryingCapacity(actor) {
        const str = actor.system.attributes?.str?.value || 10;
        return str * 10;
    }

    /**
     * Check if over encumbrance limit
     */
    static isOverEncumbered(actor) {
        const weight = this.getTotalWeight(actor);
        const capacity = this.getCarryingCapacity(actor);
        return weight > capacity;
    }
}

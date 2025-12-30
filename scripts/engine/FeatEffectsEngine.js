/**
 * SWSE Feat Effects Engine
 *
 * Parses feat benefits and applies permanent bonuses to character sheets.
 * Handles:
 * - Defense bonuses (Reflex, Fortitude, Will)
 * - Skill bonuses
 * - Attack bonuses
 * - Damage bonuses
 *
 * Unlike FeatActionsMapper (which handles toggleable actions), this engine
 * creates permanent Active Effects that are always applied when the feat is owned.
 */

import { SWSELogger } from '../utils/logger.js';

export class FeatEffectsEngine {

    /**
     * Parse a feat's benefit text and create Active Effects for permanent bonuses
     * @param {Item} featItem - The feat item
     * @returns {Array} Array of Active Effect data objects
     */
    static createEffectsForFeat(featItem) {
        const effects = [];
        const benefit = featItem.system?.benefit || '';
        const featName = featItem.name || 'Unknown Feat';

        if (!benefit) {
            return effects;
        }

        // Parse defense bonuses
        const defenseEffects = this._parseDefenseBonuses(benefit, featName);
        effects.push(...defenseEffects);

        // Parse skill bonuses
        const skillEffects = this._parseSkillBonuses(benefit, featName);
        effects.push(...skillEffects);

        // Parse attack bonuses
        const attackEffects = this._parseAttackBonuses(benefit, featName);
        effects.push(...attackEffects);

        // Parse damage bonuses
        const damageEffects = this._parseDamageBonuses(benefit, featName);
        effects.push(...damageEffects);

        // Parse hit point bonuses
        const hpEffects = this._parseHitPointBonuses(benefit, featName);
        effects.push(...hpEffects);

        return effects;
    }

    /**
     * Parse defense bonuses from benefit text
     * Examples:
     * - "+2 bonus to Reflex Defense"
     * - "gain a +2 bonus on Will Defense"
     * - "+2 to Fortitude Defense"
     * @param {string} benefit - Benefit text
     * @param {string} featName - Feat name for logging
     * @returns {Array} Active Effect data objects
     */
    static _parseDefenseBonuses(benefit, featName) {
        const effects = [];

        // Pattern: +N bonus to/on [Defense Type] Defense
        const defensePattern = /\+(\d+)\s+(?:bonus\s+)?(?:to|on)\s+(reflex|fortitude|will)\s+defense/gi;
        let match;

        while ((match = defensePattern.exec(benefit)) !== null) {
            const bonus = parseInt(match[1]);
            const defenseType = match[2].toLowerCase();

            effects.push({
                name: `${featName} (Defense Bonus)`,
                icon: "icons/svg/upgrade.svg",
                changes: [{
                    key: `system.defenses.${defenseType}.misc`,
                    mode: 2, // ADD
                    value: bonus.toString(),
                    priority: 20
                }],
                disabled: false,
                duration: {},
                transfer: true,
                flags: {
                    swse: {
                        type: 'feat-defense-bonus',
                        source: featName,
                        defenseType: defenseType
                    }
                }
            });

            SWSELogger.log(`FeatEffectsEngine | Found ${defenseType} defense bonus: +${bonus} (${featName})`);
        }

        return effects;
    }

    /**
     * Parse skill bonuses from benefit text
     * Examples:
     * - "+2 bonus on Stealth checks"
     * - "gain a +5 bonus on all Perception checks"
     * - "+2 to Acrobatics"
     * @param {string} benefit - Benefit text
     * @param {string} featName - Feat name for logging
     * @returns {Array} Active Effect data objects
     */
    static _parseSkillBonuses(benefit, featName) {
        const effects = [];

        // Pattern: +N bonus on/to [Skill Name] checks?
        const skillPattern = /\+(\d+)\s+(?:bonus\s+)?(?:on|to)\s+(?:all\s+)?([a-z\s]+?)\s+(?:checks?|skill)/gi;
        let match;

        const skillMap = {
            'acrobatics': 'acrobatics',
            'climb': 'climb',
            'deception': 'deception',
            'endurance': 'endurance',
            'gather information': 'gatherInformation',
            'initiative': 'initiative',
            'jump': 'jump',
            'knowledge': 'knowledge',
            'mechanics': 'mechanics',
            'perception': 'perception',
            'persuasion': 'persuasion',
            'pilot': 'pilot',
            'ride': 'ride',
            'stealth': 'stealth',
            'survival': 'survival',
            'swim': 'swim',
            'treat injury': 'treatInjury',
            'use computer': 'useComputer',
            'use the force': 'useTheForce'
        };

        while ((match = skillPattern.exec(benefit)) !== null) {
            const bonus = parseInt(match[1]);
            const skillNameRaw = match[2].trim().toLowerCase();
            const skillKey = skillMap[skillNameRaw];

            if (skillKey) {
                effects.push({
                    name: `${featName} (Skill Bonus)`,
                    icon: "icons/svg/upgrade.svg",
                    changes: [{
                        key: `system.skills.${skillKey}.miscMod`,
                        mode: 2, // ADD
                        value: bonus.toString(),
                        priority: 20
                    }],
                    disabled: false,
                    duration: {},
                    transfer: true,
                    flags: {
                        swse: {
                            type: 'feat-skill-bonus',
                            source: featName,
                            skillKey: skillKey
                        }
                    }
                });

                SWSELogger.log(`FeatEffectsEngine | Found ${skillNameRaw} skill bonus: +${bonus} (${featName})`);
            }
        }

        return effects;
    }

    /**
     * Parse attack bonuses from benefit text
     * Examples:
     * - "+2 bonus on melee attack rolls"
     * - "+1 to all attack rolls"
     * - "+2 on ranged attacks"
     * @param {string} benefit - Benefit text
     * @param {string} featName - Feat name for logging
     * @returns {Array} Active Effect data objects
     */
    static _parseAttackBonuses(benefit, featName) {
        const effects = [];

        // Pattern: +N bonus on/to [attack type] attack rolls?
        const attackPattern = /\+(\d+)\s+(?:bonus\s+)?(?:on|to)\s+(?:all\s+)?(melee|ranged|unarmed)?\s*attack\s*rolls?/gi;
        let match;

        while ((match = attackPattern.exec(benefit)) !== null) {
            const bonus = parseInt(match[1]);
            const attackType = match[2]?.toLowerCase() || 'all';

            let changeKey;
            if (attackType === 'all' || !match[2]) {
                changeKey = 'system.attackBonus';
            } else {
                changeKey = `system.attackBonus.${attackType}`;
            }

            effects.push({
                name: `${featName} (Attack Bonus)`,
                icon: "icons/svg/upgrade.svg",
                changes: [{
                    key: changeKey,
                    mode: 2, // ADD
                    value: bonus.toString(),
                    priority: 20
                }],
                disabled: false,
                duration: {},
                transfer: true,
                flags: {
                    swse: {
                        type: 'feat-attack-bonus',
                        source: featName,
                        attackType: attackType
                    }
                }
            });

            SWSELogger.log(`FeatEffectsEngine | Found ${attackType} attack bonus: +${bonus} (${featName})`);
        }

        return effects;
    }

    /**
     * Parse damage bonuses from benefit text
     * Examples:
     * - "+2 bonus on damage rolls"
     * - "+1 to all damage"
     * - "deals +1 die of damage"
     * @param {string} benefit - Benefit text
     * @param {string} featName - Feat name for logging
     * @returns {Array} Active Effect data objects
     */
    static _parseDamageBonuses(benefit, featName) {
        const effects = [];

        // Pattern: +N bonus on/to [damage type] damage rolls?
        const damagePattern = /\+(\d+)\s+(?:bonus\s+)?(?:on|to)\s+(?:all\s+)?(melee|ranged|unarmed)?\s*damage\s*rolls?/gi;
        let match;

        while ((match = damagePattern.exec(benefit)) !== null) {
            const bonus = parseInt(match[1]);
            const damageType = match[2]?.toLowerCase() || 'all';

            let changeKey;
            if (damageType === 'all' || !match[2]) {
                changeKey = 'system.damageBonus';
            } else {
                changeKey = `system.damageBonus.${damageType}`;
            }

            effects.push({
                name: `${featName} (Damage Bonus)`,
                icon: "icons/svg/upgrade.svg",
                changes: [{
                    key: changeKey,
                    mode: 2, // ADD
                    value: bonus.toString(),
                    priority: 20
                }],
                disabled: false,
                duration: {},
                transfer: true,
                flags: {
                    swse: {
                        type: 'feat-damage-bonus',
                        source: featName,
                        damageType: damageType
                    }
                }
            });

            SWSELogger.log(`FeatEffectsEngine | Found ${damageType} damage bonus: +${bonus} (${featName})`);
        }

        return effects;
    }

    /**
     * Parse hit point bonuses from benefit text
     * Examples:
     * - "+5 hit points"
     * - "gain +10 HP"
     * @param {string} benefit - Benefit text
     * @param {string} featName - Feat name for logging
     * @returns {Array} Active Effect data objects
     */
    static _parseHitPointBonuses(benefit, featName) {
        const effects = [];

        // Pattern: +N hit points or HP
        const hpPattern = /\+(\d+)\s+(?:hit\s+points?|hp)/gi;
        let match;

        while ((match = hpPattern.exec(benefit)) !== null) {
            const bonus = parseInt(match[1]);

            effects.push({
                name: `${featName} (Hit Points)`,
                icon: "icons/svg/upgrade.svg",
                changes: [{
                    key: 'system.hitPoints.bonusPerLevel',
                    mode: 2, // ADD
                    value: bonus.toString(),
                    priority: 20
                }],
                disabled: false,
                duration: {},
                transfer: true,
                flags: {
                    swse: {
                        type: 'feat-hp-bonus',
                        source: featName,
                        perLevel: false
                    }
                }
            });

            SWSELogger.log(`FeatEffectsEngine | Found hit point bonus: +${bonus} (${featName})`);
        }

        return effects;
    }

    /**
     * Apply feat effects to a feat item
     * This should be called when a feat is added to an actor
     * @param {Item} featItem - The feat item
     * @returns {Promise<void>}
     */
    static async applyEffectsToFeat(featItem) {
        if (featItem.type !== 'feat') {
            return;
        }

        // Don't auto-create effects if they already exist
        if (featItem.effects.size > 0) {
            SWSELogger.log(`FeatEffectsEngine | Feat ${featItem.name} already has effects, skipping auto-generation`);
            return;
        }

        const effectsData = this.createEffectsForFeat(featItem);

        if (effectsData.length > 0) {
            try {
                await featItem.createEmbeddedDocuments('ActiveEffect', effectsData);
                SWSELogger.log(`FeatEffectsEngine | Created ${effectsData.length} effects for ${featItem.name}`);
            } catch (err) {
                SWSELogger.error(`FeatEffectsEngine | Failed to create effects for ${featItem.name}:`, err);
            }
        }
    }

    /**
     * Scan all feats on an actor and create missing effects
     * Useful for migrating existing characters
     * @param {Actor} actor - The actor
     * @returns {Promise<void>}
     */
    static async scanAndApplyEffects(actor) {
        const feats = actor.items.filter(i => i.type === 'feat');
        let created = 0;

        for (const feat of feats) {
            const before = feat.effects.size;
            await this.applyEffectsToFeat(feat);
            const after = feat.effects.size;

            if (after > before) {
                created += (after - before);
            }
        }

        if (created > 0) {
            ui.notifications.info(`Created ${created} feat effect(s) for ${actor.name}`);
        }

        return created;
    }
}

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
import { createEffectOnActor } from '../core/document-api-v13.js';
import { ActorEngine } from '../actors/engine/actor-engine.js';

export class FeatEffectsEngine {

    /**
     * Parse a feat's benefit text and create Active Effects for permanent bonuses
     * @param {Item} featItem - The feat item
     * @param {Object} options - Options for effect creation
     * @param {boolean} options.includeConditional - Include conditional/toggleable effects
     * @returns {Array} Array of Active Effect data objects
     */
    static createEffectsForFeat(featItem, options = {}) {
        const effects = [];
        const benefit = featItem.system?.benefit || '';
        const featName = featItem.name || 'Unknown Feat';

        if (!benefit) {
            return effects;
        }

        const includeConditional = options.includeConditional ?? true;

        // Parse defense bonuses (permanent only)
        const defenseEffects = this._parseDefenseBonuses(benefit, featName, false);
        effects.push(...defenseEffects);

        // Parse conditional defense bonuses (toggleable)
        if (includeConditional) {
            const conditionalDefenseEffects = this._parseConditionalDefenseBonuses(benefit, featName);
            effects.push(...conditionalDefenseEffects);
        }

        // Parse skill bonuses (permanent only)
        const skillEffects = this._parseSkillBonuses(benefit, featName, false);
        effects.push(...skillEffects);

        // Parse conditional skill bonuses (toggleable)
        if (includeConditional) {
            const conditionalSkillEffects = this._parseConditionalSkillBonuses(benefit, featName);
            effects.push(...conditionalSkillEffects);
        }

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
     *
     * @param {string} benefit - Benefit text
     * @param {string} featName - Feat name for logging
     * @param {boolean} skipConditional - Skip conditional bonuses if true
     * @returns {Array} Active Effect data objects
     */
    static _parseDefenseBonuses(benefit, featName, skipConditional = true) {
        const effects = [];

        // Pattern: +N bonus to/on [Defense Type] Defense
        // But check for conditional phrases that indicate this shouldn't be permanent
        const conditionalPhrases = [
            'against',
            'while',
            'when',
            'if you',
            'during',
            'once per',
            'until'
        ];

        const defensePattern = /\+(\d+)\s+(?:bonus\s+)?(?:to|on)\s+(reflex|fortitude|will)\s+defense/gi;
        let match;

        while ((match = defensePattern.exec(benefit)) !== null) {
            const bonus = parseInt(match[1], 10);
            const defenseType = match[2].toLowerCase();

            // Check if this is a conditional bonus
            const matchStart = match.index;
            const contextWindow = benefit.substring(matchStart, matchStart + 100).toLowerCase();
            const isConditional = conditionalPhrases.some(phrase => contextWindow.includes(phrase));

            if (isConditional && skipConditional) {
                SWSELogger.log(`FeatEffectsEngine | Skipping conditional defense bonus: ${defenseType} (${featName})`);
                continue;
            }

            if (isConditional && !skipConditional) {
                // This is a conditional bonus but we're not skipping it - skip it here, it will be handled by _parseConditionalDefenseBonuses
                continue;
            }

            effects.push({
                name: `${featName} (Defense Bonus)`,
                icon: 'icons/svg/upgrade.svg',
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
     * Parse CONDITIONAL defense bonuses that should be toggleable
     * Examples:
     * - "+2 bonus to Will Defense against mind-affecting effects"
     * - "+2 to Reflex Defense while moving"
     *
     * @param {string} benefit - Benefit text
     * @param {string} featName - Feat name for logging
     * @returns {Array} Active Effect data objects (disabled by default)
     */
    static _parseConditionalDefenseBonuses(benefit, featName) {
        const effects = [];

        const conditionalPhrases = [
            { phrase: 'against', label: 'vs' },
            { phrase: 'while', label: 'while' },
            { phrase: 'when', label: 'when' },
            { phrase: 'during', label: 'during' }
        ];

        const defensePattern = /\+(\d+)\s+(?:bonus\s+)?(?:to|on)\s+(reflex|fortitude|will)\s+defense\s+(.{0,50})/gi;
        let match;

        while ((match = defensePattern.exec(benefit)) !== null) {
            const bonus = parseInt(match[1], 10);
            const defenseType = match[2].toLowerCase();
            const context = match[3].toLowerCase();

            // Check if this is a conditional bonus
            const conditionalInfo = conditionalPhrases.find(cp => context.includes(cp.phrase));

            if (conditionalInfo) {
                // Extract the condition
                const conditionMatch = context.match(new RegExp(`${conditionalInfo.phrase}\\s+([^.,;]+)`));
                const condition = conditionMatch ? conditionMatch[1].trim() : 'certain conditions';

                effects.push({
                    name: `${featName} (${conditionalInfo.label} ${condition})`,
                    icon: 'icons/svg/upgrade.svg',
                    changes: [{
                        key: `system.defenses.${defenseType}.misc`,
                        mode: 2, // ADD
                        value: bonus.toString(),
                        priority: 20
                    }],
                    disabled: true, // Start disabled - player toggles on when condition applies
                    duration: {},
                    transfer: true,
                    flags: {
                        swse: {
                            type: 'feat-conditional-defense',
                            source: featName,
                            defenseType: defenseType,
                            condition: condition,
                            toggleable: true
                        }
                    }
                });

                SWSELogger.log(`FeatEffectsEngine | Found conditional defense bonus: ${defenseType} +${bonus} (${condition}) (${featName})`);
            }
        }

        return effects;
    }

    /**
     * Parse skill bonuses from benefit text
     * Examples:
     * - "+2 bonus on Stealth checks"
     * - "gain a +5 bonus on all Perception checks"
     * - "+2 to Acrobatics"
     *
     * @param {string} benefit - Benefit text
     * @param {string} featName - Feat name for logging
     * @param {boolean} skipConditional - Skip conditional bonuses if true
     * @returns {Array} Active Effect data objects
     */
    static _parseSkillBonuses(benefit, featName, skipConditional = true) {
        const effects = [];

        // Check for conditional phrases that indicate this is for specific uses only
        const conditionalPhrases = [
            'made to',
            'to activate',
            'made for',
            'when making',
            'when you make'
        ];

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
            const bonus = parseInt(match[1], 10);
            const skillNameRaw = match[2].trim().toLowerCase();
            const skillKey = skillMap[skillNameRaw];

            if (!skillKey) {
                continue;
            }

            // Check if this is a conditional bonus
            const matchStart = match.index;
            const contextWindow = benefit.substring(matchStart, matchStart + 150).toLowerCase();
            const isConditional = conditionalPhrases.some(phrase => contextWindow.includes(phrase));

            if (isConditional && skipConditional) {
                SWSELogger.log(`FeatEffectsEngine | Skipping conditional skill bonus: ${skillNameRaw} (${featName})`);
                continue;
            }

            if (isConditional && !skipConditional) {
                // This is a conditional bonus but we're not skipping it - skip it here, it will be handled by _parseConditionalSkillBonuses
                continue;
            }

            effects.push({
                name: `${featName} (Skill Bonus)`,
                icon: 'icons/svg/upgrade.svg',
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

        return effects;
    }

    /**
     * Parse CONDITIONAL skill bonuses that should be toggleable
     * Examples:
     * - "+2 bonus on Use the Force checks made to activate Move Object"
     *
     * @param {string} benefit - Benefit text
     * @param {string} featName - Feat name for logging
     * @returns {Array} Active Effect data objects (disabled by default)
     */
    static _parseConditionalSkillBonuses(benefit, featName) {
        const effects = [];

        const conditionalPhrases = [
            { phrase: 'made to', label: 'for' },
            { phrase: 'to activate', label: 'to activate' },
            { phrase: 'made for', label: 'for' },
            { phrase: 'when making', label: 'when' },
            { phrase: 'when you make', label: 'when' }
        ];

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

        const skillPattern = /\+(\d+)\s+(?:bonus\s+)?(?:on|to)\s+(?:all\s+)?([a-z\s]+?)\s+(?:checks?)\s+(.{0,80})/gi;
        let match;

        while ((match = skillPattern.exec(benefit)) !== null) {
            const bonus = parseInt(match[1], 10);
            const skillNameRaw = match[2].trim().toLowerCase();
            const context = match[3].toLowerCase();
            const skillKey = skillMap[skillNameRaw];

            if (!skillKey) {
                continue;
            }

            // Check if this is a conditional bonus
            const conditionalInfo = conditionalPhrases.find(cp => context.includes(cp.phrase));

            if (conditionalInfo) {
                // Extract the condition
                const conditionMatch = context.match(new RegExp(`${conditionalInfo.phrase}\\s+([^.,;]+)`));
                const condition = conditionMatch ? conditionMatch[1].trim() : 'certain conditions';

                effects.push({
                    name: `${featName} (${conditionalInfo.label} ${condition})`,
                    icon: 'icons/svg/upgrade.svg',
                    changes: [{
                        key: `system.skills.${skillKey}.miscMod`,
                        mode: 2, // ADD
                        value: bonus.toString(),
                        priority: 20
                    }],
                    disabled: true, // Start disabled - player toggles on when using for that purpose
                    duration: {},
                    transfer: true,
                    flags: {
                        swse: {
                            type: 'feat-conditional-skill',
                            source: featName,
                            skillKey: skillKey,
                            condition: condition,
                            toggleable: true
                        }
                    }
                });

                SWSELogger.log(`FeatEffectsEngine | Found conditional skill bonus: ${skillNameRaw} +${bonus} (${condition}) (${featName})`);
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
            const bonus = parseInt(match[1], 10);
            const attackType = match[2]?.toLowerCase() || 'all';

            let changeKey;
            if (attackType === 'all' || !match[2]) {
                changeKey = 'system.attackBonus';
            } else {
                changeKey = `system.attackBonus.${attackType}`;
            }

            effects.push({
                name: `${featName} (Attack Bonus)`,
                icon: 'icons/svg/upgrade.svg',
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
            const bonus = parseInt(match[1], 10);
            const damageType = match[2]?.toLowerCase() || 'all';

            let changeKey;
            if (damageType === 'all' || !match[2]) {
                changeKey = 'system.damageBonus';
            } else {
                changeKey = `system.damageBonus.${damageType}`;
            }

            effects.push({
                name: `${featName} (Damage Bonus)`,
                icon: 'icons/svg/upgrade.svg',
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
            const bonus = parseInt(match[1], 10);

            effects.push({
                name: `${featName} (Hit Points)`,
                icon: 'icons/svg/upgrade.svg',
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
                // v13 hardening: Check if feat is owned by an actor and use v13 wrapper if available
                const actor = featItem.actor;
                if (actor && actor.isOwner) {
                    // Use v13 wrapper for ownership-validated effect creation
                    await createEffectOnActor(actor, effectsData);
                    SWSELogger.log(`FeatEffectsEngine | Created ${effectsData.length} effects for ${featItem.name} via actor wrapper`);
                } else if (!actor) {
                    // Fallback for feat items not in an actor (e.g., compendium items)
                    if (!featItem.isOwner) {
                        SWSELogger.warn(`FeatEffectsEngine | Cannot create effects: No ownership on feat ${featItem.name}`);
                        return;
                    }
                    await ActorEngine.createEmbeddedDocuments(featItem.actor, 'ActiveEffect', effectsData);
                    SWSELogger.log(`FeatEffectsEngine | Created ${effectsData.length} effects for ${featItem.name}`);
                } else {
                    SWSELogger.warn(`FeatEffectsEngine | Cannot create effects: Non-owner attempting to modify ${featItem.name}`);
                }
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

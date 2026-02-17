/**
 * SWSE Talent Abilities Engine
 *
 * Processes talents to extract and display their special abilities as UI cards.
 * Handles:
 * - Loading talent ability definitions
 * - Matching actor talents to ability definitions
 * - Handling modifier talents that enhance base abilities
 * - Calculating uses (per-encounter, per-day)
 * - Providing roll data for ability cards
 * - Active Effects integration for toggleable abilities
 * - Combat hooks for reaction abilities (Block/Deflect)
 * - Damage bonus integration (Sneak Attack, etc.)
 * - Condition track automation
 */

import { SWSELogger } from '../utils/logger.js';
import { SWSEActiveEffectsManager } from '../combat/active-effects-manager.js';
// eslint-disable-next-line
import talentAbilitiesData from '../../data/talent-granted-abilities.json' with { type: 'json' };
import { createChatMessage } from '../core/document-api-v13.js';

import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';
/**
 * Active Effect definitions for toggleable talent abilities
 */
const TALENT_ABILITY_EFFECTS = {
    'ataru': {
        name: 'Ataru Form',
        icon: 'fa-solid fa-wind',
        duration: { rounds: 1 },
        updates: {
            'system.attackBonus': { mode: 'ADD', value: 2 },
            'system.defenses.reflex.misc': { mode: 'ADD', value: -2 }
        },
        flags: { talentAbility: 'ataru', lightsaberForm: true }
    },
    'juyo': {
        name: 'Juyo Form',
        icon: 'fa-solid fa-skull',
        duration: { rounds: 1 },
        updates: {
            'system.damageBonus': { mode: 'ADD', value: 2 },
            'system.defenses.reflex.misc': { mode: 'ADD', value: -2 },
            'system.defenses.fortitude.misc': { mode: 'ADD', value: -2 },
            'system.defenses.will.misc': { mode: 'ADD', value: -2 }
        },
        flags: { talentAbility: 'juyo', lightsaberForm: true }
    },
    'lightsaber-defense': {
        name: 'Lightsaber Defense',
        icon: 'fa-solid fa-shield-alt',
        updates: {
            'system.defenses.reflex.misc': { mode: 'ADD', value: 1 }
        },
        flags: { talentAbility: 'lightsaber-defense', passive: true, condition: 'wieldingLightsaber' }
    },
    'armored-defense': {
        name: 'Armored Defense',
        icon: 'fa-solid fa-shield-alt',
        updates: {
            'system.defenses.reflex.misc': { mode: 'ADD', value: 1 }
        },
        flags: { talentAbility: 'armored-defense', passive: true, condition: 'wearingArmor' }
    },
    'improved-armored-defense': {
        name: 'Improved Armored Defense',
        icon: 'fa-solid fa-shield-alt',
        updates: {
            'system.defenses.reflex.misc': { mode: 'ADD', value: 2 }
        },
        flags: { talentAbility: 'improved-armored-defense', passive: true, condition: 'wearingArmor' }
    },
    'elusive-target': {
        name: 'Elusive Target',
        icon: 'fa-solid fa-wind',
        updates: {
            'system.defenses.reflex.misc': { mode: 'ADD', value: 2 }
        },
        flags: { talentAbility: 'elusive-target', condition: 'fightingDefensively' }
    }
};

/**
 * Damage bonus talents - these add extra damage under certain conditions
 */
const DAMAGE_BONUS_TALENTS = {
    'sneak-attack': {
        bonus: '1d6',
        stackable: true,
        condition: 'targetDeniedDex',
        perRound: true
    },
    'skirmisher': {
        bonus: '1d6',
        condition: 'differentTargetLastTurn'
    },
    'devastating-attack': {
        bonus: '+1die',
        perEncounter: true,
        condition: 'focusedWeapon'
    },
    'melee-smash': {
        bonus: 'halfLevel',
        condition: 'oneHandedOrUnarmed'
    }
};

/**
 * Condition track effect talents
 */
const CONDITION_TRACK_TALENTS = {
    'dastardly-strike': { steps: -1, condition: 'targetDeniedDex' },
    'hunters-mark': { steps: -1, condition: 'afterAim' },
    'debilitating-shot': { steps: -1, condition: 'afterAim' },
    'stunning-strike': { steps: -1, condition: 'exceedsDamageThreshold' },
    'knockdown-shot': { effect: 'prone', condition: 'afterAim' },
    'vaapad': { steps: -1, condition: 'criticalHit' }
};

export class TalentAbilitiesEngine {

    /**
     * Get all ability definitions
     * @returns {Object} All ability definitions
     */
    static getAllAbilities() {
        return talentAbilitiesData.abilities || {};
    }

    /**
     * Get ability by ID
     * @param {string} abilityId - The ability ID
     * @returns {Object|null} Ability definition or null
     */
    static getAbility(abilityId) {
        return talentAbilitiesData.abilities?.[abilityId] || null;
    }

    /**
     * Get ability by talent name (returns first match)
     * @param {string} talentName - The talent name
     * @returns {Object|null} Ability definition or null
     */
    static getAbilityByTalentName(talentName) {
        const normalized = talentName.toLowerCase().trim();
        const abilities = this.getAllAbilities();

        for (const [id, ability] of Object.entries(abilities)) {
            if (ability.talentName?.toLowerCase().trim() === normalized) {
                return { ...ability, id };
            }
        }
        return null;
    }

    /**
     * Get ALL abilities for a talent name (for multi-option talents)
     * @param {string} talentName - The talent name
     * @returns {Array} Array of ability definitions
     */
    static getAbilitiesByTalentName(talentName) {
        const normalized = talentName.toLowerCase().trim();
        const abilities = this.getAllAbilities();
        const matches = [];

        for (const [id, ability] of Object.entries(abilities)) {
            if (ability.talentName?.toLowerCase().trim() === normalized) {
                matches.push({ ...ability, id });
            }
        }
        return matches;
    }

    /**
     * Get all abilities for an actor based on their talents
     * @param {Actor} actor - The actor
     * @returns {Object} Categorized abilities object
     */
    static getAbilitiesForActor(actor) {
        if (!actor?.items) {
            return this._createEmptyResult();
        }

        const talents = actor.items.filter(i => i.type === 'talent');
        const talentNames = new Set(talents.map(t => t.name.toLowerCase().trim()));

        const result = {
            all: [],
            byType: {
                reaction: [],
                standard: [],
                swift: [],
                fullRound: [],
                free: [],
                passive: [],
                modifier: []
            },
            byTree: {},
            modifiers: []
        };

        // First pass: collect all base abilities and group by talent name
        const abilitiesByTalent = new Map(); // Map<talentName, Array<ability>>

        for (const talent of talents) {
            const matchingAbilities = this.getAbilitiesByTalentName(talent.name);
            if (!matchingAbilities || matchingAbilities.length === 0) continue;

            for (const ability of matchingAbilities) {
                // Check if this is a modifier ability
                if (ability.actionType === 'modifier' && ability.modifies) {
                    result.modifiers.push({
                        ...ability,
                        sourceTalent: talent,
                        sourceTalentId: talent.id
                    });
                    continue;
                }

                // Check prerequisites
                const prereqsMet = this._checkPrerequisites(ability, talentNames);
                if (!prereqsMet) continue;

                const enrichedAbility = this._enrichAbility(ability, actor, talent);

                // Group abilities by talent name
                const key = talent.name;
                if (!abilitiesByTalent.has(key)) {
                    abilitiesByTalent.set(key, []);
                }
                abilitiesByTalent.get(key).push(enrichedAbility);
            }
        }

        // Second pass: create parent cards for multi-option talents
        for (const [talentName, abilities] of abilitiesByTalent) {
            if (abilities.length === 1) {
                // Single ability - add directly
                const ability = abilities[0];
                result.all.push(ability);

                const typeKey = this._getTypeKey(ability.actionType);
                if (result.byType[typeKey]) {
                    result.byType[typeKey].push(ability);
                }

                const tree = ability.talentTree || 'Other';
                if (!result.byTree[tree]) {
                    result.byTree[tree] = [];
                }
                result.byTree[tree].push(ability);
            } else {
                // Multiple abilities - create parent card with sub-options
                const parentAbility = this._createMultiOptionParent(talentName, abilities, actor);
                result.all.push(parentAbility);

                const typeKey = this._getTypeKey(parentAbility.actionType);
                if (result.byType[typeKey]) {
                    result.byType[typeKey].push(parentAbility);
                }

                const tree = parentAbility.talentTree || 'Other';
                if (!result.byTree[tree]) {
                    result.byTree[tree] = [];
                }
                result.byTree[tree].push(parentAbility);
            }
        }

        // Second pass: apply modifiers to base abilities
        for (const modifier of result.modifiers) {
            const targetAbility = result.all.find(a => a.id === modifier.modifies);
            if (targetAbility) {
                targetAbility.modifiers = targetAbility.modifiers || [];
                targetAbility.modifiers.push(modifier);
                targetAbility.isModified = true;
            }
        }

        // Sort abilities by name within each category
        result.all.sort((a, b) => a.name.localeCompare(b.name));
        for (const type of Object.keys(result.byType)) {
            result.byType[type].sort((a, b) => a.name.localeCompare(b.name));
        }

        return result;
    }

    /**
     * Check if ability prerequisites are met
     * @param {Object} ability - The ability definition
     * @param {Set} talentNames - Set of actor's talent names (lowercase)
     * @returns {boolean}
     */
    static _checkPrerequisites(ability, talentNames) {
        if (!ability.prerequisites || ability.prerequisites.length === 0) {
            return true;
        }

        for (const prereq of ability.prerequisites) {
            // Get the prerequisite ability to find its talent name
            const prereqAbility = this.getAbility(prereq);
            if (prereqAbility) {
                const prereqTalentName = prereqAbility.talentName?.toLowerCase().trim();
                if (!talentNames.has(prereqTalentName)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Enrich ability with actor-specific data
     * @param {Object} ability - Base ability definition
     * @param {Actor} actor - The actor
     * @param {Item} talent - The source talent item
     * @returns {Object} Enriched ability
     */
    static _enrichAbility(ability, actor, talent) {
        const enriched = {
            ...ability,
            sourceTalent: talent,
            sourceTalentId: talent.id,
            sourceTalentName: talent.name,
            icon: ability.icon || 'fa-solid fa-star',
            typeLabel: this._getTypeLabel(ability.actionType),
            typeBadgeClass: this._getTypeBadgeClass(ability.actionType)
        };

        // Calculate roll data if present
        if (ability.roll) {
            enriched.rollData = this._calculateRollData(ability.roll, actor);
        }

        // Calculate uses if limited
        if (ability.uses) {
            enriched.usesData = this._calculateUsesData(ability.uses, actor, talent);
        }

        // Handle choices for multi-option abilities
        if (ability.choices) {
            enriched.hasChoices = true;
            enriched.choiceCount = ability.choices.length;
        }

        // Handle alternative actions
        if (ability.alternativeAction) {
            enriched.hasAlternative = true;
        }

        // Handle special actions (like Force Focus recharge)
        if (ability.specialAction) {
            enriched.hasSpecialAction = true;
            enriched.specialActionData = {
                ...ability.specialAction,
                typeLabel: this._getTypeLabel(ability.specialAction.actionType)
            };
        }

        // Handle toggleable abilities
        if (ability.toggleable) {
            enriched.isToggleable = true;
            enriched.isToggled = this._getToggleState(actor, ability.id);
        }

        // Handle Force Point costs
        if (ability.cost?.forcePoints) {
            enriched.costData = {
                forcePoints: ability.cost.forcePoints,
                hasEnough: actor.hasForcePoints?.(ability.cost.forcePoints) ?? true,
                currentFP: actor.system?.forcePoints?.value ?? 0
            };
        }

        return enriched;
    }

    /**
     * Create a parent ability card for multi-option talents
     * @param {string} talentName - The talent name
     * @param {Array} subAbilities - Array of sub-abilities
     * @param {Actor} actor - The actor
     * @returns {Object} Parent ability card
     */
    static _createMultiOptionParent(talentName, subAbilities, actor) {
        // Use first sub-ability as template for shared properties
        const template = subAbilities[0];

        return {
            id: `multi-${talentName.toLowerCase().replace(/\s+/g, '-')}`,
            name: talentName,
            talentName: talentName,
            talentTree: template.talentTree,
            description: `Choose one of ${subAbilities.length} options`,
            actionType: 'multi-option',
            icon: template.icon || 'fa-solid fa-list',
            typeLabel: 'Multi-Option',
            typeBadgeClass: 'multi-option',
            sourceTalent: template.sourceTalent,
            sourceTalentId: template.sourceTalentId,
            sourceTalentName: talentName,

            // Multi-option specific properties
            isMultiOption: true,
            hasMultipleOptions: true,
            subAbilities: subAbilities,
            subAbilityCount: subAbilities.length,

            // For display purposes
            hasChoices: false,  // Don't use the old choices system
            usesData: {
                isLimited: false
            },
            rollData: {
                canRoll: false
            }
        };
    }

    /**
     * Calculate roll data for an ability
     * @param {Object} rollDef - Roll definition from ability
     * @param {Actor} actor - The actor
     * @returns {Object} Calculated roll data
     */
    static _calculateRollData(rollDef, actor) {
        const data = {
            label: rollDef.label || 'Roll',
            canRoll: false
        };

        if (rollDef.skillKey) {
            const skill = actor.system?.skills?.[rollDef.skillKey];
            if (skill) {
                data.canRoll = true;
                data.skillKey = rollDef.skillKey;
                data.skillName = this._formatSkillName(rollDef.skillKey);
                data.modifier = skill.total || 0;
                data.formula = `1d20 + ${data.modifier}`;
            }
        }

        if (rollDef.vsDefense) {
            data.vsDefense = rollDef.vsDefense;
            data.vsLabel = `vs ${this._formatDefenseName(rollDef.vsDefense)}`;
        }

        if (rollDef.dc) {
            data.dc = rollDef.dc;
            data.dcLabel = `DC ${rollDef.dc}`;
        }

        if (rollDef.conditionalBonus) {
            data.hasConditionalBonus = true;
            data.conditionalBonus = rollDef.conditionalBonus;
        }

        return data;
    }

    /**
     * Calculate uses data for limited abilities
     * @param {Object} usesDef - Uses definition from ability
     * @param {Actor} actor - The actor
     * @param {Item} talent - The source talent
     * @returns {Object} Uses data
     */
    static _calculateUsesData(usesDef, actor, talent) {
        const data = {
            max: usesDef.max,
            isLimited: usesDef.max !== null,
            perEncounter: usesDef.perEncounter || false,
            perDay: usesDef.perDay || false,
            perRound: usesDef.perRound || false
        };

        if (data.isLimited) {
            // Get current uses from actor flags or talent system
            const flagKey = `ability-uses-${talent.id}`;
            data.current = actor.getFlag('foundryvtt-swse', flagKey) ?? data.max;
            data.canUse = data.current > 0;

            if (data.perEncounter) {
                data.refreshLabel = 'per encounter';
            } else if (data.perDay) {
                data.refreshLabel = 'per day';
            } else if (data.perRound) {
                data.refreshLabel = 'per round';
            }
        } else {
            data.canUse = true;
            data.refreshLabel = 'at will';
        }

        return data;
    }

    /**
     * Get toggle state for a toggleable ability
     * @param {Actor} actor - The actor
     * @param {string} abilityId - The ability ID
     * @returns {boolean}
     */
    static _getToggleState(actor, abilityId) {
        return actor.getFlag('foundryvtt-swse', `ability-toggled-${abilityId}`) || false;
    }

    /**
     * Toggle an ability on/off with Active Effects
     * @param {Actor} actor - The actor
     * @param {string} abilityId - The ability ID
     * @returns {Promise<boolean>} New toggle state
     */
    static async toggleAbility(actor, abilityId) {
        const currentState = this._getToggleState(actor, abilityId);
        const newState = !currentState;
        await actor.setFlag('foundryvtt-swse', `ability-toggled-${abilityId}`, newState);

        // Apply or remove Active Effect
        await this._updateActiveEffect(actor, abilityId, newState);

        return newState;
    }

    /**
     * Apply or remove an Active Effect for a toggleable ability
     * @param {Actor} actor - The actor
     * @param {string} abilityId - The ability ID
     * @param {boolean} active - Whether to activate or deactivate
     */
    static async _updateActiveEffect(actor, abilityId, active) {
        const effectData = TALENT_ABILITY_EFFECTS[abilityId];
        if (!effectData) return;

        // Remove existing effect for this ability
        const existing = actor.effects.find(e => e.flags?.swse?.talentAbility === abilityId);
        if (existing) {
            await existing.delete();
        }

        // Create new effect if activating
        if (active) {
            try {
                await SWSEActiveEffectsManager.createCustomEffect(actor, effectData);
                SWSELogger.log(`TalentAbilitiesEngine | Applied ${effectData.name} effect to ${actor.name}`);
            } catch (err) {
                SWSELogger.warn(`TalentAbilitiesEngine | Failed to apply effect: ${err.message}`);
            }
        }
    }

    /**
     * Check if actor meets condition for a talent effect
     * @param {Actor} actor - The actor
     * @param {string} condition - The condition to check
     * @param {Object} context - Additional context (target, weapon, etc.)
     * @returns {boolean}
     */
    static checkCondition(actor, condition, context = {}) {
        switch (condition) {
            case 'wieldingLightsaber':
                return actor.items.some(i =>
                    i.type === 'weapon' &&
                    i.system?.equipped &&
                    i.system?.type?.toLowerCase().includes('lightsaber')
                );

            case 'wearingArmor':
                return actor.items.some(i =>
                    i.type === 'armor' && i.system?.equipped
                );

            case 'fightingDefensively':
                return actor.effects.some(e =>
                    e.flags?.swse?.combatAction === 'fighting-defensively'
                );

            case 'targetDeniedDex':
                return context.target?.system?.isDeniedDex ||
                       context.target?.effects?.some(e => e.flags?.swse?.deniedDex);

            case 'afterAim':
                return context.aimedThisTurn === true;

            case 'differentTargetLastTurn':
                const lastTarget = actor.getFlag('foundryvtt-swse', 'lastAttackTarget');
                return lastTarget !== context.target?.id;

            case 'exceedsDamageThreshold':
                return context.damageDealt >= (context.target?.system?.damageThreshold || 0);

            case 'criticalHit':
                return context.isCritical === true;

            case 'focusedWeapon':
                // Note: focus property not in current weapon data model
                return false;

            case 'oneHandedOrUnarmed':
                // Note: hands property not in current weapon data model
                return false;

            default:
                return true;
        }
    }

    /**
     * Use a limited ability (decrement uses)
     * @param {Actor} actor - The actor
     * @param {string} talentId - The talent ID
     * @returns {Promise<number>} Remaining uses
     */
    static async useAbility(actor, talentId) {
        const flagKey = `ability-uses-${talentId}`;
        const current = actor.getFlag('foundryvtt-swse', flagKey) ?? 1;
        const newValue = Math.max(0, current - 1);
        await actor.setFlag('foundryvtt-swse', flagKey, newValue);
        return newValue;
    }

    /**
     * Reset ability uses (for encounter/day reset)
     * @param {Actor} actor - The actor
     * @param {string} resetType - 'encounter' or 'day'
     * @returns {Promise<void>}
     */
    static async resetAbilityUses(actor, resetType = 'encounter') {
        const abilities = this.getAbilitiesForActor(actor);

        for (const ability of abilities.all) {
            if (!ability.usesData?.isLimited) continue;

            const shouldReset =
                (resetType === 'encounter' && ability.usesData.perEncounter) ||
                (resetType === 'day' && (ability.usesData.perDay || ability.usesData.perEncounter));

            if (shouldReset) {
                const flagKey = `ability-uses-${ability.sourceTalentId}`;
                await actor.setFlag('foundryvtt-swse', flagKey, ability.usesData.max);
            }
        }

        SWSELogger.log(`TalentAbilitiesEngine | Reset ${resetType} ability uses for ${actor.name}`);
    }

    /**
     * Roll an ability check
     * @param {Actor} actor - The actor
     * @param {Object} ability - The ability definition
     * @param {Object} options - Roll options
     * @returns {Promise<Roll>}
     */
    static async rollAbility(actor, ability, options = {}) {
        if (!ability.rollData?.canRoll) {
            ui.notifications.warn(`Cannot roll ${ability.name} - no valid roll defined`);
            return null;
        }

        // Check and spend Force Points if required
        if (ability.cost?.forcePoints && !options.freeUse) {
            const fpCost = ability.cost.forcePoints;
            const canAfford = await this._checkAndSpendForcePoints(actor, ability, fpCost);
            if (!canAfford) {
                return null; // Abort if can't afford
            }
        }

        const rollData = ability.rollData;
        let formula = rollData.formula;

        // Apply conditional bonus if checkbox is checked
        if (options.applyConditionalBonus && rollData.conditionalBonus) {
            formula = `${formula} + ${rollData.conditionalBonus.bonus}`;
        }

        const roll = new Roll(formula, actor.getRollData());
        await roll.evaluate({ async: true });

        // Build chat message content
        const content = await this._buildAbilityRollMessage(ability, roll, rollData, options);

        await createChatMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            content,
            rolls: [roll],
            style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });

        // Decrement uses if limited
        if (ability.usesData?.isLimited && !options.freeUse) {
            await this.useAbility(actor, ability.sourceTalentId);
        }

        return roll;
    }

    /**
     * Check if actor can afford Force Point cost and spend it
     * @param {Actor} actor - The actor
     * @param {Object} ability - The ability being used
     * @param {number} cost - Force Point cost
     * @returns {Promise<boolean>} Whether the cost was paid
     */
    static async _checkAndSpendForcePoints(actor, ability, cost) {
        // Check if actor has enough Force Points
        if (!actor.hasForcePoints || !actor.hasForcePoints(cost)) {
            ui.notifications.warn(`${actor.name} doesn't have enough Force Points for ${ability.name}! (Need ${cost})`);
            return false;
        }

        // Spend the Force Points
        const spent = await actor.spendForcePoint(`${ability.name}`, cost, { silent: false });
        return spent;
    }

    /**
     * Build chat message HTML for ability roll
     * @param {Object} ability - The ability
     * @param {Roll} roll - The roll result
     * @param {Object} rollData - Roll data
     * @param {Object} options - Options
     * @returns {Promise<string>}
     */
    static async _buildAbilityRollMessage(ability, roll, rollData, options) {
        const total = roll.total;

        let resultHtml = '';
        if (rollData.dc) {
            const success = total >= rollData.dc;
            resultHtml = `<p class="roll-result ${success ? 'success' : 'failure'}">
                <strong>${success ? 'Success!' : 'Failure'}</strong> (${rollData.dcLabel})
            </p>`;
        } else if (rollData.vsDefense) {
            resultHtml = `<p class="roll-target">
                <strong>${rollData.vsLabel}</strong>
            </p>`;
        }

        return `
            <div class="swse-ability-roll">
                <div class="ability-roll-header">
                    <i class="${ability.icon}"></i>
                    <h3>${ability.name}</h3>
                    <span class="ability-type-badge ${ability.typeBadgeClass}">${ability.typeLabel}</span>
                </div>
                <div class="ability-roll-body">
                    <p class="ability-description">${ability.description}</p>
                    <div class="dice-roll">
                        <span class="roll-label">${rollData.label}:</span>
                        <span class="roll-formula">${roll.formula}</span>
                        <span class="roll-result-value">${total}</span>
                    </div>
                    ${resultHtml}
                </div>
            </div>
        `;
    }

    /**
     * Post ability to chat (for passive/non-rolling abilities)
     * @param {Actor} actor - The actor
     * @param {Object} ability - The ability
     * @param {Object} options - Options {freeUse: boolean}
     * @returns {Promise<ChatMessage>}
     */
    static async postAbilityToChat(actor, ability, options = {}) {
        // Check and spend Force Points if required
        if (ability.cost?.forcePoints && !options.freeUse) {
            const fpCost = ability.cost.forcePoints;
            const canAfford = await this._checkAndSpendForcePoints(actor, ability, fpCost);
            if (!canAfford) {
                return null; // Abort if can't afford
            }
        }

        const modifierHtml = ability.modifiers?.length > 0 ?
            `<div class="ability-modifiers">
                <h4>Enhanced by:</h4>
                <ul>
                    ${ability.modifiers.map(m => `<li><strong>${m.name}</strong>: ${m.description}</li>`).join('')}
                </ul>
            </div>` : '';

        const usesHtml = ability.usesData?.isLimited ?
            `<p class="ability-uses">Uses: ${ability.usesData.current}/${ability.usesData.max} (${ability.usesData.refreshLabel})</p>` : '';

        const effectsHtml = ability.effects?.length > 0 ?
            `<div class="ability-effects">
                <h4>Effects:</h4>
                <ul>
                    ${ability.effects.map(e => `<li>${this._formatEffect(e)}</li>`).join('')}
                </ul>
            </div>` : '';

        const content = `
            <div class="swse-ability-card">
                <div class="ability-card-header">
                    <i class="${ability.icon}"></i>
                    <h3>${ability.name}</h3>
                    <span class="ability-type-badge ${ability.typeBadgeClass}">${ability.typeLabel}</span>
                </div>
                <div class="ability-card-body">
                    <p class="ability-source"><em>From: ${ability.sourceTalentName} (${ability.talentTree})</em></p>
                    <p class="ability-description">${ability.description}</p>
                    ${ability.trigger ? `<p class="ability-trigger"><strong>Trigger:</strong> ${ability.trigger}</p>` : ''}
                    ${ability.condition ? `<p class="ability-condition"><strong>Condition:</strong> ${ability.condition}</p>` : ''}
                    ${effectsHtml}
                    ${modifierHtml}
                    ${usesHtml}
                </div>
            </div>
        `;

        return createChatMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            content
        });
    }

    /**
     * Format an effect for display
     * @param {Object} effect - The effect object
     * @returns {string}
     */
    static _formatEffect(effect) {
        switch (effect.type) {
            case 'conditionTrack':
                const direction = effect.value > 0 ? 'up' : 'down';
                return `Move ${effect.target} ${Math.abs(effect.value)} step ${direction} on condition track`;
            case 'defenseBonus':
                return `+${effect.value} ${effect.bonusType || ''} bonus to ${effect.defense} Defense`;
            case 'attackBonus':
                return `+${effect.value} ${effect.bonusType || ''} bonus to attack rolls`;
            case 'damageBonus':
                return `+${effect.value} bonus to damage`;
            case 'skillBonus':
                return `+${effect.value} ${effect.bonusType || ''} bonus to ${effect.skillKey || 'skill'} checks`;
            case 'bonusDamage':
                return `Deal ${effect.value} extra damage`;
            case 'immunity':
                return `Immune to ${effect.to}`;
            default:
                return JSON.stringify(effect);
        }
    }

    /**
     * Get type key for categorization
     * @param {string} actionType - The action type
     * @returns {string}
     */
    static _getTypeKey(actionType) {
        const typeMap = {
            'reaction': 'reaction',
            'standard': 'standard',
            'swift': 'swift',
            'full-round': 'fullRound',
            'free': 'free',
            'passive': 'passive',
            'modifier': 'modifier'
        };
        return typeMap[actionType] || 'passive';
    }

    /**
     * Get human-readable type label
     * @param {string} actionType - The action type
     * @returns {string}
     */
    static _getTypeLabel(actionType) {
        const labelMap = {
            'reaction': 'Reaction',
            'standard': 'Standard',
            'swift': 'Swift',
            'full-round': 'Full-Round',
            'free': 'Free',
            'passive': 'Passive',
            'modifier': 'Modifier'
        };
        return labelMap[actionType] || 'Special';
    }

    /**
     * Get CSS class for type badge
     * @param {string} actionType - The action type
     * @returns {string}
     */
    static _getTypeBadgeClass(actionType) {
        return `type-${actionType || 'passive'}`;
    }

    /**
     * Format skill name for display
     * @param {string} skillKey - The skill key
     * @returns {string}
     */
    static _formatSkillName(skillKey) {
        const nameMap = {
            'useTheForce': 'Use the Force',
            'treatInjury': 'Treat Injury',
            'useComputer': 'Use Computer',
            'gatherInformation': 'Gather Information'
        };
        return nameMap[skillKey] || skillKey.charAt(0).toUpperCase() + skillKey.slice(1);
    }

    /**
     * Format defense name for display
     * @param {string} defenseKey - The defense key
     * @returns {string}
     */
    static _formatDefenseName(defenseKey) {
        return defenseKey.charAt(0).toUpperCase() + defenseKey.slice(1) + ' Defense';
    }

    /**
     * Create empty result object
     * @returns {Object}
     */
    static _createEmptyResult() {
        return {
            all: [],
            byType: {
                reaction: [],
                standard: [],
                swift: [],
                fullRound: [],
                free: [],
                passive: [],
                modifier: []
            },
            byTree: {},
            modifiers: []
        };
    }

    // =========================================================================
    // COMBAT INTEGRATION - Damage Bonuses
    // =========================================================================

    /**
     * Calculate total damage bonus from talent abilities
     * @param {Actor} actor - The attacking actor
     * @param {Object} context - Attack context {target, weapon, isCritical, aimedThisTurn}
     * @returns {Object} {formula: string, breakdown: Array, notifications: Array}
     */
    static calculateDamageBonus(actor, context = {}) {
        const result = {
            formula: '',
            bonusDice: [],
            flatBonus: 0,
            breakdown: [],
            notifications: []
        };

        const abilities = this.getAbilitiesForActor(actor);
        const talentNames = new Set(abilities.all.map(a => a.id));

        // Check Sneak Attack
        if (talentNames.has('sneak-attack') &&
            this.checkCondition(actor, 'targetDeniedDex', context)) {

            // Count how many Sneak Attack talents actor has
            const sneakCount = actor.items.filter(i =>
                i.type === 'talent' &&
                i.name.toLowerCase().includes('sneak attack')
            ).length;

            // Check if already used this round
            const usedThisRound = actor.getFlag('foundryvtt-swse', 'sneakAttackUsedThisRound');
            if (!usedThisRound) {
                result.bonusDice.push(`${sneakCount}d6`);
                result.breakdown.push(`Sneak Attack: +${sneakCount}d6`);
                result.notifications.push(`Sneak Attack! +${sneakCount}d6 damage`);
            }
        }

        // Check Skirmisher
        if (talentNames.has('skirmisher') &&
            this.checkCondition(actor, 'differentTargetLastTurn', context)) {
            result.bonusDice.push('1d6');
            result.breakdown.push('Skirmisher: +1d6');
            result.notifications.push('Skirmisher bonus +1d6');
        }

        // Check Melee Smash
        if (talentNames.has('melee-smash') &&
            this.checkCondition(actor, 'oneHandedOrUnarmed', context)) {
            const bonus = getEffectiveHalfLevel(actor);
            if (bonus > 0) {
                result.flatBonus += bonus;
                result.breakdown.push(`Melee Smash: +${bonus}`);
            }
        }

        // Check Devastating Attack (once per encounter)
        if (talentNames.has('devastating-attack') &&
            this.checkCondition(actor, 'focusedWeapon', context)) {
            const used = actor.getFlag('foundryvtt-swse', 'devastatingAttackUsed');
            if (!used) {
                // Add one extra die of weapon damage
                const weaponDie = context.weapon?.system?.damage?.match(/\d+d(\d+)/)?.[0] || '1d6';
                result.bonusDice.push(weaponDie);
                result.breakdown.push(`Devastating Attack: +${weaponDie}`);
                result.notifications.push(`Devastating Attack! +${weaponDie}`);
            }
        }

        // Build formula
        const parts = [...result.bonusDice];
        if (result.flatBonus !== 0) {
            parts.push(result.flatBonus.toString());
        }
        result.formula = parts.join(' + ');

        return result;
    }

    /**
     * Apply post-damage talent effects (condition track, prone, etc.)
     * @param {Actor} attacker - The attacking actor
     * @param {Actor} target - The target actor
     * @param {Object} context - {damageDealt, isCritical, aimedThisTurn, weapon}
     * @returns {Promise<Array>} Array of applied effects
     */
    static async applyPostDamageEffects(attacker, target, context = {}) {
        const appliedEffects = [];
        const abilities = this.getAbilitiesForActor(attacker);
        const talentNames = new Set(abilities.all.map(a => a.id));

        // Dastardly Strike: -1 CT if target denied Dex
        if (talentNames.has('dastardly-strike') &&
            this.checkCondition(attacker, 'targetDeniedDex', context)) {
            await this._moveConditionTrack(target, -1);
            appliedEffects.push({ name: 'Dastardly Strike', effect: '-1 condition track' });
        }

        // Hunter's Mark: -1 CT after aim
        if (talentNames.has('hunters-mark') &&
            this.checkCondition(attacker, 'afterAim', context)) {
            await this._moveConditionTrack(target, -1);
            appliedEffects.push({ name: "Hunter's Mark", effect: '-1 condition track' });
        }

        // Debilitating Shot: -1 CT after aim (ranged)
        if (talentNames.has('debilitating-shot') &&
            this.checkCondition(attacker, 'afterAim', context)) {
            await this._moveConditionTrack(target, -1);
            appliedEffects.push({ name: 'Debilitating Shot', effect: '-1 condition track' });
        }

        // Stunning Strike: -1 CT if exceeds damage threshold
        if (talentNames.has('stunning-strike') &&
            this.checkCondition(attacker, 'exceedsDamageThreshold', context)) {
            await this._moveConditionTrack(target, -1);
            appliedEffects.push({ name: 'Stunning Strike', effect: '-1 condition track' });
        }

        // Knockdown Shot: prone after aim
        if (talentNames.has('knockdown-shot') &&
            this.checkCondition(attacker, 'afterAim', context)) {
            await this._applyProne(target);
            appliedEffects.push({ name: 'Knockdown Shot', effect: 'target knocked prone' });
        }

        // Vaapad: -1 CT on critical hit
        if (talentNames.has('vaapad') &&
            this.checkCondition(attacker, 'criticalHit', context)) {
            await this._moveConditionTrack(target, -1);
            appliedEffects.push({ name: 'Vaapad', effect: '-1 condition track' });
        }

        // Notify about applied effects
        if (appliedEffects.length > 0) {
            const effectList = appliedEffects.map(e => `${e.name}: ${e.effect}`).join(', ');
            ui.notifications.info(`Applied: ${effectList}`);

            // Post to chat
            await this._postDamageEffectsToChat(attacker, target, appliedEffects);
        }

        return appliedEffects;
    }

    /**
     * Move target on condition track
     * @param {Actor} target - The target actor
     * @param {number} steps - Steps to move (negative = down)
     */
    static async _moveConditionTrack(target, steps) {
        if (!target?.system?.conditionTrack) return;

        const current = target.system.conditionTrack.current || 0;
        const newValue = Math.max(0, Math.min(5, current - steps)); // 0=normal, 5=helpless

        await target.update({ 'system.conditionTrack.current': newValue });
        SWSELogger.log(`TalentAbilitiesEngine | Moved ${target.name} to CT step ${newValue}`);
    }

    /**
     * Apply prone condition to target
     * @param {Actor} target - The target actor
     */
    static async _applyProne(target) {
        // Check for existing prone effect
        const hasProne = target.effects.some(e =>
            e.flags?.swse?.statusId === 'prone' ||
            e.name?.toLowerCase() === 'prone'
        );

        if (!hasProne) {
            await target.createEmbeddedDocuments('ActiveEffect', [{
                name: 'Prone',
                icon: 'icons/svg/falling.svg',
                flags: { swse: { statusId: 'prone' } }
            }]);
        }
    }

    /**
     * Post damage effects to chat
     */
    static async _postDamageEffectsToChat(attacker, target, effects) {
        const content = `
            <div class="swse-talent-effects-message">
                <h4><i class="fa-solid fa-bolt"></i> Talent Effects Applied</h4>
                <p><strong>${attacker.name}</strong> affects <strong>${target.name}</strong>:</p>
                <ul>
                    ${effects.map(e => `<li><strong>${e.name}:</strong> ${e.effect}</li>`).join('')}
                </ul>
            </div>
        `;

        await createChatMessage({
            speaker: ChatMessage.getSpeaker({ actor: attacker }),
            content
        });
    }

    // =========================================================================
    // COMBAT INTEGRATION - Reaction Abilities (Block/Deflect)
    // =========================================================================

    /**
     * Get available reaction abilities for defending against an attack
     * @param {Actor} defender - The defending actor
     * @param {string} attackType - 'melee' or 'ranged'
     * @returns {Array} Available reaction abilities
     */
    static getAvailableReactions(defender, attackType) {
        const abilities = this.getAbilitiesForActor(defender);
        const reactions = [];

        // Check for Block (melee only)
        if (attackType === 'melee') {
            const block = abilities.all.find(a => a.id === 'block');
            if (block && this.checkCondition(defender, 'wieldingLightsaber')) {
                reactions.push({
                    ...block,
                    type: 'block',
                    label: 'Block (Use the Force vs Attack Roll)'
                });
            }
        }

        // Check for Deflect (ranged only)
        if (attackType === 'ranged') {
            const deflect = abilities.all.find(a => a.id === 'deflect');
            if (deflect && this.checkCondition(defender, 'wieldingLightsaber')) {
                reactions.push({
                    ...deflect,
                    type: 'deflect',
                    label: 'Deflect (Use the Force vs Attack Roll)'
                });

                // Check for Redirect Shot
                const redirect = abilities.all.find(a => a.id === 'redirect-shot');
                if (redirect) {
                    reactions.push({
                        ...redirect,
                        type: 'redirect',
                        label: 'Redirect Shot (after successful Deflect)',
                        requiresDeflect: true
                    });
                }
            }
        }

        return reactions;
    }

    /**
     * Prompt for reaction ability use
     * @param {Actor} defender - The defending actor
     * @param {number} attackRoll - The attack roll total
     * @param {string} attackType - 'melee' or 'ranged'
     * @param {Actor} attacker - The attacking actor
     * @returns {Promise<Object|null>} Result of reaction or null if declined
     */
    static async promptForReaction(defender, attackRoll, attackType, attacker) {
        const reactions = this.getAvailableReactions(defender, attackType);
        if (reactions.length === 0) return null;

        // Build dialog content
        const content = `
            <div class="swse-reaction-prompt">
                <p><strong>${attacker?.name || 'Enemy'}</strong> attacks with roll: <strong>${attackRoll}</strong></p>
                <p>Available reactions:</p>
                <div class="reaction-options">
                    ${reactions.map(r => `
                        <div class="reaction-option" data-ability="${r.type}">
                            <label>
                                <input type="radio" name="reaction" value="${r.type}">
                                <i class="${r.icon}"></i> ${r.label}
                            </label>
                        </div>
                    `).join('')}
                    <div class="reaction-option">
                        <label>
                            <input type="radio" name="reaction" value="none" checked>
                            <i class="fa-solid fa-times"></i> No reaction
                        </label>
                    </div>
                </div>
            </div>
        `;

        return new Promise((resolve) => {
            new SWSEDialogV2({
                title: `Reaction - ${defender.name}`,
                content,
                buttons: {
                    confirm: {
                        icon: '<i class="fa-solid fa-check"></i>',
                        label: 'Confirm',
                        callback: async (html) => {
                            const root = html instanceof HTMLElement ? html : html?.[0];
                            const selected = root?.querySelector?.('input[name="reaction"]:checked')?.value;
                            if (selected === 'none') {
                                resolve(null);
                                return;
                            }

                            const reaction = reactions.find(r => r.type === selected);
                            if (reaction) {
                                const result = await this.executeReaction(defender, reaction, attackRoll, attacker);
                                resolve(result);
                            } else {
                                resolve(null);
                            }
                        }
                    },
                    cancel: {
                        icon: '<i class="fa-solid fa-times"></i>',
                        label: 'Skip',
                        callback: () => resolve(null)
                    }
                },
                default: 'confirm'
            }).render(true);
        });
    }

    /**
     * Execute a reaction ability
     * @param {Actor} defender - The defending actor
     * @param {Object} reaction - The reaction ability
     * @param {number} attackRoll - The attack roll to beat
     * @param {Actor} attacker - The attacker
     * @returns {Promise<Object>} Result {success, roll, canRedirect}
     */
    static async executeReaction(defender, reaction, attackRoll, attacker) {
        // Roll Use the Force
        const utf = defender.system?.skills?.useTheForce;
        const modifier = utf?.total || 0;
        const roll = new Roll(`1d20 + ${modifier}`);
        await roll.evaluate({ async: true });

        const success = roll.total >= attackRoll;

        // Build result message
        let resultText = success
            ? `<span class="success">Success!</span> Attack negated.`
            : `<span class="failure">Failed.</span> Attack hits normally.`;

        let canRedirect = false;
        if (success && reaction.type === 'deflect') {
            const hasRedirect = this.getAbilitiesForActor(defender).all.find(a => a.id === 'redirect-shot');
            if (hasRedirect) {
                canRedirect = true;
                resultText += ` <em>Redirect Shot available!</em>`;
            }
        }

        const content = `
            <div class="swse-reaction-result">
                <div class="ability-roll-header">
                    <i class="${reaction.icon}"></i>
                    <h3>${reaction.name}</h3>
                    <span class="ability-type-badge type-reaction">Reaction</span>
                </div>
                <div class="ability-roll-body">
                    <p>${defender.name} attempts to ${reaction.type} the attack!</p>
                    <div class="dice-roll">
                        <span class="roll-label">Use the Force:</span>
                        <span class="roll-formula">${roll.formula}</span>
                        <span class="roll-result-value">${roll.total}</span>
                        <span class="roll-vs">vs ${attackRoll}</span>
                    </div>
                    <p class="roll-result">${resultText}</p>
                </div>
            </div>
        `;

        await createChatMessage({
            speaker: ChatMessage.getSpeaker({ actor: defender }),
            content,
            rolls: [roll],
            style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });

        return { success, roll, canRedirect, reaction };
    }

    // =========================================================================
    // HOOKS INITIALIZATION
    // =========================================================================

    /**
     * Initialize combat hooks for talent abilities
     * Call this during system initialization
     */
    static initCombatHooks() {
        SWSELogger.log('TalentAbilitiesEngine | Initializing combat hooks');

        // Reset per-round abilities at turn start
        Hooks.on('combatTurn', (combat, updateData, updateOptions) => {
            const actor = combat.combatant?.actor;
            if (!actor) return;

            // Reset per-round flags
            actor.unsetFlag('foundryvtt-swse', 'sneakAttackUsedThisRound');

            SWSELogger.log(`TalentAbilitiesEngine | Reset per-round abilities for ${actor.name}`);
        });

        // Reset per-encounter abilities when combat ends
        Hooks.on('deleteCombat', (combat) => {
            for (const combatant of combat.combatants) {
                const actor = combatant.actor;
                if (!actor) continue;

                // Reset encounter abilities
                this.resetAbilityUses(actor, 'encounter');

                // Clear devastating attack flag
                actor.unsetFlag('foundryvtt-swse', 'devastatingAttackUsed');
            }

            SWSELogger.log('TalentAbilitiesEngine | Reset encounter abilities for all combatants');
        });

        SWSELogger.log('TalentAbilitiesEngine | Combat hooks initialized');
    }

    /**
     * Get summary of active talent effects for an actor
     * @param {Actor} actor - The actor
     * @returns {Object} Summary of active effects
     */
    static getActiveTalentEffects(actor) {
        const activeEffects = actor.effects.filter(e => e.flags?.swse?.talentAbility);

        return {
            count: activeEffects.length,
            effects: activeEffects.map(e => ({
                name: e.name,
                abilityId: e.flags.swse.talentAbility,
                icon: e.icon
            })),
            hasLightsaberForm: activeEffects.some(e => e.flags?.swse?.lightsaberForm)
        };
    }
}

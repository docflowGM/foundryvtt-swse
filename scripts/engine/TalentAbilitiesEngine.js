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
 */

import { SWSELogger } from '../utils/logger.js';
import talentAbilitiesData from '../../data/talent-granted-abilities.json' with { type: 'json' };

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
     * Get ability by talent name
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

        // First pass: collect all base abilities
        for (const talent of talents) {
            const ability = this.getAbilityByTalentName(talent.name);
            if (!ability) continue;

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
            result.all.push(enrichedAbility);

            // Categorize by action type
            const typeKey = this._getTypeKey(ability.actionType);
            if (result.byType[typeKey]) {
                result.byType[typeKey].push(enrichedAbility);
            }

            // Categorize by tree
            const tree = ability.talentTree || 'Other';
            if (!result.byTree[tree]) {
                result.byTree[tree] = [];
            }
            result.byTree[tree].push(enrichedAbility);
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
            icon: ability.icon || 'fas fa-star',
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

        return enriched;
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
     * Toggle an ability on/off
     * @param {Actor} actor - The actor
     * @param {string} abilityId - The ability ID
     * @returns {Promise<boolean>} New toggle state
     */
    static async toggleAbility(actor, abilityId) {
        const currentState = this._getToggleState(actor, abilityId);
        const newState = !currentState;
        await actor.setFlag('foundryvtt-swse', `ability-toggled-${abilityId}`, newState);
        return newState;
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

        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content,
            rolls: [roll],
            type: CONST.CHAT_MESSAGE_TYPES.ROLL
        });

        // Decrement uses if limited
        if (ability.usesData?.isLimited && !options.freeUse) {
            await this.useAbility(actor, ability.sourceTalentId);
        }

        return roll;
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
     * @returns {Promise<ChatMessage>}
     */
    static async postAbilityToChat(actor, ability) {
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

        return ChatMessage.create({
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
}

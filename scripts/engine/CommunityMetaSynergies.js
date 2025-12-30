/**
 * SWSE Community Meta Synergies
 *
 * Defines synergy rules based on community-proven build patterns.
 * These synergies provide high-priority suggestions when the character
 * has specific feats/talents that combo strongly with other options.
 *
 * Synergy Categories:
 * - CT-Killer (Condition Track): Debilitating Shot + Hunter's Mark, etc.
 * - Multi-Attack Chains: Triple Attack → Unrelenting Assault
 * - Grapple Combos: Pin → Crush → Rancor Crush
 * - Force Caster: Force Training + Skill Focus UTF + Force Focus
 * - Leader/Commander: Born Leader → Grand Leader
 * - Stealth/Assassin: Dastardly Strike + flat-footed exploits
 */

import { MetaTuning } from './MetaTuning.js';

// ──────────────────────────────────────────────────────────────
// SYNERGY DEFINITIONS
// ──────────────────────────────────────────────────────────────

/**
 * Community-proven synergy rules
 * Each rule has:
 * - id: Unique identifier
 * - name: Human-readable name
 * - archetype: Build archetype this belongs to
 * - trigger: Function that checks if synergy applies (returns true/false)
 * - suggestions: Array of suggested feats/talents with reasons
 * - priority: 'critical' | 'high' | 'medium' | 'low'
 */
export const COMMUNITY_SYNERGIES = [
    // ═══════════════════════════════════════════════════════════
    // CT-KILLER (CONDITION TRACK) SYNERGIES
    // ═══════════════════════════════════════════════════════════
    {
        id: 'aim_ct_killer',
        name: 'Aim CT-Killer Combo',
        archetype: 'ranged',
        trigger: (state) => state.hasTalent("Hunter's Mark") && !state.hasTalent("Debilitating Shot"),
        suggestions: [{
            name: "Debilitating Shot",
            type: 'talent',
            reason: "Doubles condition track damage on aimed attacks (Hunter's Mark synergy)",
            priority: 'critical'
        }],
        priority: 'critical'
    },
    {
        id: 'aim_setup',
        name: 'Aim Foundation',
        archetype: 'ranged',
        trigger: (state) => state.hasTalent("Debilitating Shot") && !state.hasTalent("Hunter's Mark"),
        suggestions: [{
            name: "Hunter's Mark",
            type: 'talent',
            reason: "Adds +1 CT damage to Debilitating Shot, stacking for 2x effect",
            priority: 'critical'
        }],
        priority: 'critical'
    },
    {
        id: 'ct_sniper_extended',
        name: 'CT Sniper Extension',
        archetype: 'ranged',
        trigger: (state) => state.hasTalent("Hunter's Mark") && state.hasTalent("Debilitating Shot"),
        suggestions: [
            {
                name: "Devastating Attack",
                type: 'talent',
                reason: "Apply additional -1 CT on attacks for triple CT damage",
                priority: 'high'
            },
            {
                name: "Precision",
                type: 'talent',
                reason: "+1 damage on critical = more CT damage potential",
                priority: 'medium'
            }
        ],
        priority: 'high'
    },

    // ═══════════════════════════════════════════════════════════
    // MULTI-ATTACK CHAIN SYNERGIES
    // ═══════════════════════════════════════════════════════════
    {
        id: 'triple_attack_finisher',
        name: 'Triple Attack Finisher',
        archetype: 'melee',
        trigger: (state) => state.hasFeat("Triple Attack") && !state.hasTalent("Unrelenting Assault"),
        suggestions: [{
            name: "Unrelenting Assault",
            type: 'talent',
            reason: "Convert last Triple Attack hit to free attack if you drop target",
            priority: 'critical'
        }],
        priority: 'critical'
    },
    {
        id: 'double_to_triple',
        name: 'Attack Chain Upgrade',
        archetype: 'melee',
        trigger: (state) => state.hasFeat("Double Attack") && !state.hasFeat("Triple Attack"),
        suggestions: [{
            name: "Triple Attack",
            type: 'feat',
            reason: "Third attack at -10 for massive damage potential",
            priority: 'high'
        }],
        priority: 'high'
    },
    {
        id: 'power_attack_multi',
        name: 'Power Multi-Attack',
        archetype: 'melee',
        trigger: (state) => (state.hasFeat("Double Attack") || state.hasFeat("Triple Attack")) && !state.hasFeat("Power Attack"),
        suggestions: [{
            name: "Power Attack",
            type: 'feat',
            reason: "Trade accuracy for damage on multiple attacks",
            priority: 'high'
        }],
        priority: 'high'
    },
    {
        id: 'cleave_chain',
        name: 'Cleave Chain',
        archetype: 'melee',
        trigger: (state) => state.hasFeat("Cleave") && !state.hasFeat("Great Cleave"),
        suggestions: [{
            name: "Great Cleave",
            type: 'feat',
            reason: "Multiple cleave attacks per round instead of one",
            priority: 'medium'
        }],
        priority: 'medium'
    },

    // ═══════════════════════════════════════════════════════════
    // GRAPPLE COMBO SYNERGIES
    // ═══════════════════════════════════════════════════════════
    {
        id: 'pin_to_crush',
        name: 'Pin to Crush Combo',
        archetype: 'melee',
        trigger: (state) => state.hasFeat("Pin") && !state.hasTalent("Crush"),
        suggestions: [{
            name: "Crush",
            type: 'talent',
            reason: "Deal 1d6+STR damage per round when pinning",
            priority: 'critical'
        }],
        priority: 'critical'
    },
    {
        id: 'crush_upgrade',
        name: 'Crush Upgrade',
        archetype: 'melee',
        trigger: (state) => state.hasTalent("Crush") && !state.hasTalent("Rancor Crush"),
        suggestions: [{
            name: "Rancor Crush",
            type: 'talent',
            reason: "Upgrade Crush to 2d6+STR damage",
            priority: 'high'
        }],
        priority: 'high'
    },
    {
        id: 'grapple_foundation',
        name: 'Grapple Foundation',
        archetype: 'melee',
        trigger: (state) => state.hasTalent("Crush") && !state.hasFeat("Pin"),
        suggestions: [{
            name: "Pin",
            type: 'feat',
            reason: "Required to use Crush damage (grapple prerequisite)",
            priority: 'critical'
        }],
        priority: 'critical'
    },

    // ═══════════════════════════════════════════════════════════
    // STEALTH/ASSASSIN SYNERGIES
    // ═══════════════════════════════════════════════════════════
    {
        id: 'dastardly_setup',
        name: 'Dastardly Strike Setup',
        archetype: 'stealth',
        trigger: (state) => state.hasTalent("Dastardly Strike") && !state.hasFeat("Steadying Position"),
        suggestions: [{
            name: "Steadying Position",
            type: 'feat',
            reason: "Guarantees flat-footed target for Dastardly Strike damage",
            priority: 'critical'
        }],
        priority: 'critical'
    },
    {
        id: 'sneak_attack_chain',
        name: 'Sneak Attack Chain',
        archetype: 'stealth',
        trigger: (state) => state.hasTalent("Sneak Attack") && !state.hasTalent("Dastardly Strike"),
        suggestions: [{
            name: "Dastardly Strike",
            type: 'talent',
            reason: "Add +1 CT damage to sneak attacks against flat-footed targets",
            priority: 'high'
        }],
        priority: 'high'
    },
    {
        id: 'hidden_strike',
        name: 'Hidden Strike Combo',
        archetype: 'stealth',
        trigger: (state) => state.hasSkill("Stealth") && !state.hasTalent("Hidden Movement"),
        suggestions: [{
            name: "Hidden Movement",
            type: 'talent',
            reason: "Maintain stealth while moving for ambush positioning",
            priority: 'medium'
        }],
        priority: 'medium'
    },

    // ═══════════════════════════════════════════════════════════
    // FORCE CASTER SYNERGIES
    // ═══════════════════════════════════════════════════════════
    {
        id: 'force_training_basics',
        name: 'Force Training Foundation',
        archetype: 'force',
        trigger: (state) => state.hasFeat("Force Sensitivity") && !state.hasFeat("Force Training"),
        suggestions: [{
            name: "Force Training",
            type: 'feat',
            reason: "Core feat for Force users - take multiple times",
            priority: 'critical'
        }],
        priority: 'critical'
    },
    {
        id: 'utf_mastery',
        name: 'UTF Mastery',
        archetype: 'force',
        trigger: (state) => state.hasFeat("Force Training") && !state.hasFeat("Skill Focus (Use the Force)"),
        suggestions: [{
            name: "Skill Focus (Use the Force)",
            type: 'feat',
            reason: "+5 to UTF checks - essential for Force casters",
            priority: 'critical'
        }],
        priority: 'critical'
    },
    {
        id: 'force_focus_combo',
        name: 'Force Focus Combo',
        archetype: 'force',
        trigger: (state) => state.hasFeat("Skill Focus (Use the Force)") && !state.hasTalent("Force Focus"),
        suggestions: [{
            name: "Force Focus",
            type: 'talent',
            reason: "Add half heroic level to UTF for powers - stacks with Skill Focus",
            priority: 'critical'
        }],
        priority: 'critical'
    },
    {
        id: 'enlighten_combo',
        name: 'Enlighten Combo',
        archetype: 'force',
        trigger: (state) => state.hasTalent("Force Focus") && !state.hasTalent("Enlighten"),
        suggestions: [{
            name: "Enlighten",
            type: 'talent',
            reason: "Spend Force Point to add Force Focus bonus again",
            priority: 'high'
        }],
        priority: 'high'
    },
    {
        id: 'lightsaber_form_1',
        name: 'Lightsaber Form Foundation',
        archetype: 'force',
        trigger: (state) => state.hasFeat("Weapon Proficiency (lightsabers)") && !state.hasAnyTalent([
            "Ataru", "Djem So", "Form I", "Form II", "Form III", "Form IV", "Form V", "Form VI", "Form VII",
            "Makashi", "Niman", "Shien", "Shii-Cho", "Soresu", "Juyo", "Vaapad"
        ]),
        suggestions: [{
            name: "Form III (Soresu)",
            type: 'talent',
            reason: "Defensive form - +1 deflect, redirect at -5",
            priority: 'high'
        }],
        priority: 'high'
    },

    // ═══════════════════════════════════════════════════════════
    // LEADER/COMMANDER SYNERGIES
    // ═══════════════════════════════════════════════════════════
    {
        id: 'born_leader_upgrade',
        name: 'Born Leader Upgrade',
        archetype: 'leadership',
        trigger: (state) => state.hasTalent("Born Leader") && !state.hasTalent("Grand Leader"),
        suggestions: [{
            name: "Grand Leader",
            type: 'talent',
            reason: "Upgrade Born Leader to affect all allies in line of sight",
            priority: 'critical'
        }],
        priority: 'critical'
    },
    {
        id: 'draw_fire_combo',
        name: 'Draw Fire Combo',
        archetype: 'leadership',
        trigger: (state) => state.hasTalent("Draw Fire") && !state.hasTalent("Tough as Nails"),
        suggestions: [{
            name: "Tough as Nails",
            type: 'talent',
            reason: "Survive the attacks you draw with damage reduction",
            priority: 'high'
        }],
        priority: 'high'
    },
    {
        id: 'command_foundation',
        name: 'Command Foundation',
        archetype: 'leadership',
        trigger: (state) => state.hasClass("Noble") && !state.hasTalent("Born Leader"),
        suggestions: [{
            name: "Born Leader",
            type: 'talent',
            reason: "Grant allies +1 attack - core commander ability",
            priority: 'high'
        }],
        priority: 'high'
    },
    {
        id: 'coordinate_chain',
        name: 'Coordinate Chain',
        archetype: 'leadership',
        trigger: (state) => state.hasTalent("Coordinate") && !state.hasTalent("Distant Command"),
        suggestions: [{
            name: "Distant Command",
            type: 'talent',
            reason: "Extend Coordinate range to long distance",
            priority: 'medium'
        }],
        priority: 'medium'
    },

    // ═══════════════════════════════════════════════════════════
    // TECH SPECIALIST SYNERGIES
    // ═══════════════════════════════════════════════════════════
    {
        id: 'tech_spec_upgrade',
        name: 'Tech Specialist Upgrade',
        archetype: 'tech',
        trigger: (state) => state.hasFeat("Tech Specialist") && !state.hasTalent("Superior Tech"),
        suggestions: [{
            name: "Superior Tech",
            type: 'talent',
            reason: "Apply Tech Specialist bonus twice for doubled effect",
            priority: 'critical'
        }],
        priority: 'critical'
    },
    {
        id: 'mechanics_foundation',
        name: 'Mechanics Foundation',
        archetype: 'tech',
        trigger: (state) => state.hasSkill("Mechanics") && !state.hasFeat("Tech Specialist"),
        suggestions: [{
            name: "Tech Specialist",
            type: 'feat',
            reason: "Core feat for equipment modifiers - multiple applications",
            priority: 'high'
        }],
        priority: 'high'
    },
    {
        id: 'jury_rig_combo',
        name: 'Jury Rig Combo',
        archetype: 'tech',
        trigger: (state) => state.hasFeat("Tech Specialist") && !state.hasTalent("Quick Fix"),
        suggestions: [{
            name: "Quick Fix",
            type: 'talent',
            reason: "Faster repairs and modifications in the field",
            priority: 'medium'
        }],
        priority: 'medium'
    },

    // ═══════════════════════════════════════════════════════════
    // DEFENSIVE SYNERGIES
    // ═══════════════════════════════════════════════════════════
    {
        id: 'armor_proficiency_chain',
        name: 'Armor Proficiency Chain',
        archetype: 'defense',
        trigger: (state) => state.hasFeat("Armor Proficiency (light)") && !state.hasFeat("Armor Proficiency (medium)"),
        suggestions: [{
            name: "Armor Proficiency (medium)",
            type: 'feat',
            reason: "Unlock medium armor for better defense",
            priority: 'medium'
        }],
        priority: 'medium'
    },
    {
        id: 'dodge_chain',
        name: 'Dodge Chain',
        archetype: 'defense',
        trigger: (state) => state.hasFeat("Dodge") && !state.hasFeat("Mobility"),
        suggestions: [{
            name: "Mobility",
            type: 'feat',
            reason: "+5 Reflex vs attacks of opportunity when moving",
            priority: 'medium'
        }],
        priority: 'medium'
    },

    // ═══════════════════════════════════════════════════════════
    // VEHICLE COMBAT SYNERGIES
    // ═══════════════════════════════════════════════════════════
    {
        id: 'vehicular_combat_chain',
        name: 'Vehicular Combat Chain',
        archetype: 'vehicle',
        trigger: (state) => state.hasFeat("Vehicular Combat") && !state.hasFeat("Starship Tactics"),
        suggestions: [{
            name: "Starship Tactics",
            type: 'feat',
            reason: "Apply combat maneuvers to starship combat",
            priority: 'high'
        }],
        priority: 'high'
    },
    {
        id: 'pilot_ace',
        name: 'Pilot Ace Build',
        archetype: 'vehicle',
        trigger: (state) => state.hasSkill("Pilot") && state.hasFeat("Skill Focus (Pilot)") && !state.hasTalent("Ace Pilot"),
        suggestions: [{
            name: "Ace Pilot",
            type: 'talent',
            reason: "Adds +5 to Pilot checks in vehicles",
            priority: 'high'
        }],
        priority: 'high'
    }
];

// ──────────────────────────────────────────────────────────────
// SYNERGY STATE BUILDER
// ──────────────────────────────────────────────────────────────

/**
 * Build a normalized state object for synergy checking
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Object} State with helper methods
 */
export function buildSynergyState(actor, pendingData = {}) {
    // Get owned feats
    const ownedFeats = new Set(
        actor.items
            .filter(i => i.type === 'feat')
            .map(f => f.name.toLowerCase())
    );
    (pendingData.selectedFeats || []).forEach(f => {
        ownedFeats.add((f.name || f).toLowerCase());
    });

    // Get owned talents
    const ownedTalents = new Set(
        actor.items
            .filter(i => i.type === 'talent')
            .map(t => t.name.toLowerCase())
    );
    (pendingData.selectedTalents || []).forEach(t => {
        ownedTalents.add((t.name || t).toLowerCase());
    });

    // Get trained skills
    const trainedSkills = new Set();
    const skills = actor.system?.skills || {};
    for (const [skillKey, skillData] of Object.entries(skills)) {
        if (skillData?.trained) {
            trainedSkills.add(skillKey.toLowerCase());
        }
    }
    (pendingData.selectedSkills || []).forEach(s => {
        trainedSkills.add((s.key || s).toLowerCase());
    });

    // Get classes
    const classes = new Set(
        actor.items
            .filter(i => i.type === 'class')
            .map(c => c.name.toLowerCase())
    );
    if (pendingData.selectedClass?.name) {
        classes.add(pendingData.selectedClass.name.toLowerCase());
    }

    return {
        ownedFeats,
        ownedTalents,
        trainedSkills,
        classes,

        hasFeat(name) {
            return this.ownedFeats.has(name.toLowerCase());
        },

        hasTalent(name) {
            return this.ownedTalents.has(name.toLowerCase());
        },

        hasAnyFeat(names) {
            return names.some(n => this.hasFeat(n));
        },

        hasAnyTalent(names) {
            return names.some(n => this.hasTalent(n));
        },

        hasSkill(name) {
            const normalized = name.toLowerCase().replace(/\s+/g, '');
            return this.trainedSkills.has(normalized);
        },

        hasClass(name) {
            return this.classes.has(name.toLowerCase());
        }
    };
}

// ──────────────────────────────────────────────────────────────
// SYNERGY MATCHER
// ──────────────────────────────────────────────────────────────

/**
 * Find active synergies for an actor
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Array} Active synergy rules with suggestions
 */
export function findActiveSynergies(actor, pendingData = {}) {
    const state = buildSynergyState(actor, pendingData);
    const config = MetaTuning.getConfig();
    const activeSynergies = [];

    for (const synergy of COMMUNITY_SYNERGIES) {
        try {
            // Check if synergy trigger matches
            if (synergy.trigger(state)) {
                // Apply theme emphasis from config
                const themeWeight = config.themeEmphasis[synergy.archetype] || 1.0;

                activeSynergies.push({
                    ...synergy,
                    weight: themeWeight,
                    suggestions: synergy.suggestions.map(s => ({
                        ...s,
                        synergyId: synergy.id,
                        synergyName: synergy.name,
                        archetype: synergy.archetype
                    }))
                });
            }
        } catch (err) {
            // Skip synergies that fail to evaluate
            console.warn(`Synergy ${synergy.id} failed to evaluate:`, err);
        }
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    activeSynergies.sort((a, b) => {
        const pA = priorityOrder[a.priority] || 3;
        const pB = priorityOrder[b.priority] || 3;
        if (pA !== pB) return pA - pB;
        return (b.weight || 1) - (a.weight || 1);
    });

    return activeSynergies;
}

/**
 * Get synergy-based suggestions for a specific item
 * @param {string} itemName - Name of the feat/talent
 * @param {string} itemType - 'feat' or 'talent'
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Object|null} Synergy suggestion if found
 */
export function getSynergyForItem(itemName, itemType, actor, pendingData = {}) {
    const activeSynergies = findActiveSynergies(actor, pendingData);
    const normalizedName = itemName.toLowerCase();

    for (const synergy of activeSynergies) {
        for (const suggestion of synergy.suggestions) {
            if (suggestion.name.toLowerCase() === normalizedName &&
                suggestion.type === itemType) {
                return {
                    tier: suggestion.priority === 'critical' ? 5 : 4,
                    reason: suggestion.reason,
                    synergyId: synergy.id,
                    synergyName: synergy.name,
                    archetype: synergy.archetype,
                    icon: 'fa-fire',
                    cssClass: 'suggestion-tier-synergy'
                };
            }
        }
    }

    return null;
}

/**
 * Get all synergy suggestions for the current state
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Array} All suggested items from active synergies
 */
export function getAllSynergySuggestions(actor, pendingData = {}) {
    const activeSynergies = findActiveSynergies(actor, pendingData);
    const suggestions = [];

    for (const synergy of activeSynergies) {
        for (const suggestion of synergy.suggestions) {
            suggestions.push({
                ...suggestion,
                synergyWeight: synergy.weight
            });
        }
    }

    return suggestions;
}

export default {
    COMMUNITY_SYNERGIES,
    buildSynergyState,
    findActiveSynergies,
    getSynergyForItem,
    getAllSynergySuggestions
};

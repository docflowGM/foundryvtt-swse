import { ProgressionEngine } from '../engines/progression/engine/progression-engine.js';
/**
 * Actor Lifecycle Hooks
 * All actor-related hook handlers consolidated here
 *
 * @module actor-hooks
 * @description
 * Manages all actor lifecycle hooks:
 * - preUpdateActor: Validation and pre-processing
 * - updateActor: Post-update processing
 * - dropActorSheetData: Drag-and-drop handling
 */

import { HooksRegistry } from './hooks-registry.js';
import { SWSELogger } from '../utils/logger.js';
import { FeatEffectsEngine } from '../engine/FeatEffectsEngine.js';
import { initializeStarshipManeuverHooks } from './starship-maneuver-hooks.js';
import { initializeForcePowerHooks } from './force-power-hooks.js';
import { qs, qsa, setVisible, isVisible, text } from '../utils/dom-utils.js';

/**
 * Register all actor-related hooks
 * Called during system initialization
 */
export function registerActorHooks() {
    SWSELogger.log('Registering actor hooks');

    // Pre-update actor validation
    HooksRegistry.register('preUpdateActor', handleActorPreUpdate, {
        id: 'actor-pre-update',
        priority: 0,
        description: 'Validate and preprocess actor updates',
        category: 'actor'
    });

    // Actor sheet drop handling
    HooksRegistry.register('dropActorSheetData', handleActorSheetDrop, {
        id: 'actor-sheet-drop',
        priority: 0,
        description: 'Handle items dropped on actor sheets',
        category: 'actor'
    });

    // Handle item creation for special feats like Skill Focus
    HooksRegistry.register('createItem', handleItemCreate, {
        id: 'item-create-handler',
        priority: 0,
        description: 'Handle special item creation like Skill Focus feat',
        category: 'actor'
    });

    // Handle item deletion for special feats like Skill Focus
    HooksRegistry.register('deleteItem', handleItemDelete, {
        id: 'item-delete-handler',
        priority: 0,
        description: 'Handle special item deletion like Skill Focus feat',
        category: 'actor'
    });

    // Handle INT increase skill selection
    HooksRegistry.register('swse:intelligenceIncreased', handleIntelligenceIncrease, {
        id: 'int-increase-handler',
        priority: 0,
        description: 'Show skill selection dialog when INT modifier increases',
        category: 'actor'
    });

    // Initialize special progression hooks
    SWSELogger.log('Initializing Force Power hooks');
    initializeForcePowerHooks();

    SWSELogger.log('Initializing Starship Maneuver hooks');
    initializeStarshipManeuverHooks();
}

/**
 * Handle actor pre-update
 * Validates and preprocesses actor data before updates
 *
 * @param {Actor} actor - The actor being updated
 * @param {Object} changes - The changes being applied
 * @param {Object} options - Update options
 * @param {string} userId - The user ID making the change
 */
function handleActorPreUpdate(actor, changes, options, userId) {
    // Prevent negative HP
    if (changes.system?.hitpoints?.current !== undefined) {
        if (changes.system.hitpoints.current < 0) {
            changes.system.hitpoints.current = 0;
        }
    }
}

/**
 * Handle drops on actor sheets
 * Processes items and other entities dropped onto actor sheets
 *
 * @param {Actor} actor - The actor receiving the drop
 * @param {ActorSheet} sheet - The actor sheet
 * @param {Object} data - The dropped data
 */
async function handleActorSheetDrop(actor, sheet, data) {
    // This is handled by the specific actor sheet classes
    // This hook is here for future extensions or global drop handling
    SWSELogger.log(`Item dropped on ${actor.name}`, data);
}

/**
 * Handle item creation for special items
 * Handles Skill Focus feat selection and Shield Generator installation
 *
 * @param {Item} item - The item being created
 * @param {Object} options - Creation options
 * @param {string} userId - The user ID creating the item
 */
async function handleItemCreate(item, options, userId) {
    // Only process for the current user's actions
    if (game.user.id !== userId) {return;}

    const actor = item.parent;
    if (!actor) {return;}

    // =========================================================================
    // SHIELD GENERATOR INSTALLATION (For Droids)
    // =========================================================================
    if (item.type === 'shieldGenerator' && actor.type === 'droid') {
        const sr = item.system?.sr ?? 0;
        if (sr > 0) {
            // PHASE 10: Route through ActorEngine with guard key
            await globalThis.SWSE.ActorEngine.updateActor(actor, {
                'system.shields': {
                    value: sr,      // Current shield rating
                    max: sr,        // Maximum shield rating
                    rating: sr      // Display rating
                }
            }, {
                meta: { guardKey: 'shield-install' }
            });
            SWSELogger.log(`Shield Generator installed on ${actor.name}: SR ${sr}`);
        }
    }

    // =========================================================================
    // SKILL FOCUS FEAT HANDLING (Character-only)
    // =========================================================================
    // Only process feats on character actors
    if (item.type !== 'feat' || actor.type !== 'character') {return;}

    // Apply automatic feat effects for permanent bonuses
    await FeatEffectsEngine.applyEffectsToFeat(item);

    // Check if this is a Skill Focus feat (or Greater Skill Focus)
    const featName = item.name.toLowerCase();
    if (!featName.includes('skill focus')) {return;}

    SWSELogger.log('SWSE | Skill Focus feat detected, prompting for skill selection');

    // Get trained skills
    const trainedSkills = {};
    for (const [key, skill] of Object.entries(actor.system.skills || {})) {
        if (skill.trained) {
            trainedSkills[key] = skill;
        }
    }

    if (Object.keys(trainedSkills).length === 0) {
        ui.notifications.warn('You must have at least one trained skill to select Skill Focus. Please train a skill first.');
        // Delete the feat since requirements aren't met
        await item.delete();
        return;
    }

    // Build skill list for dialog
    const skillNames = {
        acrobatics: 'Acrobatics',
        climb: 'Climb',
        deception: 'Deception',
        endurance: 'Endurance',
        gatherInfo: 'Gather Information',
        initiative: 'Initiative',
        jump: 'Jump',
        mechanics: 'Mechanics',
        perception: 'Perception',
        persuasion: 'Persuasion',
        pilot: 'Pilot',
        stealth: 'Stealth',
        survival: 'Survival',
        swim: 'Swim',
        treatInjury: 'Treat Injury',
        useComputer: 'Use Computer',
        useTheForce: 'Use the Force'
    };

    // Create options HTML
    const skillOptions = Object.keys(trainedSkills)
        .map(key => `<option value="${key}">${skillNames[key] || key}</option>`)
        .join('');

    // Show dialog to select skill
    new SWSEDialogV2({
        title: `${item.name} - Select Skill`,
        content: `
            <div class="form-group">
                <label>Choose a trained skill to focus:</label>
                <select id="skill-focus-selection" style="width: 100%; padding: 5px;">
                    ${skillOptions}
                </select>
                <p class="hint-text" style="margin-top: 10px;">
                    <i class="fas fa-circle-info"></i>
                    Skill Focus grants a +5 bonus to the selected skill.
                </p>
            </div>
        `,
        buttons: {
            select: {
                icon: '<i class="fas fa-check"></i>',
                label: 'Select',
                callback: async (html) => {
                    const selectedSkill = (root?.querySelector?.('#skill-focus-selection')?.value ?? null);

                    // Update the skill to be focused
                    const updateData = {
                        [`system.skills.${selectedSkill}.focused`]: true
                    };
                    await globalThis.SWSE.ActorEngine.updateActor(actor, updateData);

                    // Update the feat description to note which skill
                    const skillName = skillNames[selectedSkill] || selectedSkill;
                    const updatedDescription = `${item.system.description || ''}\n\n<strong>Focused Skill:</strong> ${skillName}`;
                    await (actor.updateOwnedItem ? actor.updateOwnedItem(item, { 'system.description': updatedDescription }) : item.update({ 'system.description': updatedDescription }));

                    ui.notifications.info(`${item.name} applied to ${skillName}. You gain +5 to this skill.`);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: 'Cancel',
                callback: async () => {
                    // Delete the feat if cancelled
                    await item.delete();
                    ui.notifications.warn('Skill Focus feat removed. Select a skill to apply the feat.');
                }
            }
        },
        default: 'select',
        close: async () => {
            // If dialog is closed without selection, delete the feat
            if (!actor.system.skills) {return;}

            let hasFocusedSkill = false;
            for (const skill of Object.values(actor.system.skills)) {
                if (skill.focused) {
                    hasFocusedSkill = true;
                    break;
                }
            }

            if (!hasFocusedSkill) {
                await item.delete();
            }
        }
    }, {
        width: 400
    }).render(true);
}

/**
 * Handle item deletion for special items
 * Removes Skill Focus when feat is deleted or Shield Rating when Shield Generator is deleted
 *
 * @param {Item} item - The item being deleted
 * @param {Object} options - Deletion options
 * @param {string} userId - The user ID deleting the item
 */
async function handleItemDelete(item, options, userId) {
    // Only process for the current user's actions
    if (game.user.id !== userId) {return;}

    const actor = item.parent;
    if (!actor) {return;}

    // =========================================================================
    // SHIELD GENERATOR REMOVAL (For Droids)
    // =========================================================================
    if (item.type === 'shieldGenerator' && actor.type === 'droid') {
        // PHASE 10: Route through ActorEngine with guard key
        // Clear shield rating when shield is removed
        await globalThis.SWSE.ActorEngine.updateActor(actor, {
            'system.shields': {
                value: 0,
                max: 0,
                rating: 0
            }
        }, {
            meta: { guardKey: 'shield-removal' }
        });
        SWSELogger.log(`Shield Generator removed from ${actor.name}`);
        return;
    }

    // =========================================================================
    // SKILL FOCUS FEAT HANDLING (Character-only)
    // =========================================================================
    // Only process feats on character actors
    if (item.type !== 'feat' || actor.type !== 'character') {return;}

    // Check if this is a Skill Focus feat
    const featName = item.name.toLowerCase();
    if (!featName.includes('skill focus')) {return;}

    SWSELogger.log('SWSE | Skill Focus feat deleted, removing focus from skill');

    // Try to find which skill was focused from the description
    const descMatch = item.system?.description?.match(/<strong>Focused Skill:<\/strong>\s*(.+?)(?:<|$)/);
    if (descMatch) {
        const focusedSkillName = descMatch[1].trim();

        // Find the skill key by name
        const skillNames = {
            'Acrobatics': 'acrobatics',
            'Climb': 'climb',
            'Deception': 'deception',
            'Endurance': 'endurance',
            'Gather Information': 'gatherInfo',
            'Initiative': 'initiative',
            'Jump': 'jump',
            'Mechanics': 'mechanics',
            'Perception': 'perception',
            'Persuasion': 'persuasion',
            'Pilot': 'pilot',
            'Stealth': 'stealth',
            'Survival': 'survival',
            'Swim': 'swim',
            'Treat Injury': 'treatInjury',
            'Use Computer': 'useComputer',
            'Use the Force': 'useTheForce'
        };

        const skillKey = skillNames[focusedSkillName];
        if (skillKey && actor.system.skills[skillKey]) {
            // PHASE 10: Route through ActorEngine with guard key and await
            await globalThis.SWSE.ActorEngine.updateActor(actor, {
                [`system.skills.${skillKey}.focused`]: false
            }, {
                meta: { guardKey: 'skill-focus-removal' }
            });

            ui.notifications.info(`Removed Skill Focus from ${focusedSkillName}`);
        }
    }
}

/**
 * Handle INT modifier increase
 * Shows skill selection dialog for bonus trained skills
 *
 * @param {Object} data - Event data from swse:intelligenceIncreased hook
 * @param {Actor} data.actor - The actor whose INT increased
 * @param {number} data.skillsToGain - Number of skills to train
 * @param {number} data.languagesToGain - Number of languages to add
 */
async function handleIntelligenceIncrease({ actor, skillsToGain, languagesToGain }) {
    // Only process if there are skills to select
    if (skillsToGain <= 0) {return;}

    // Only process for the owning user
    if (!actor.isOwner) {return;}

    SWSELogger.log(`SWSE | INT increase: Showing skill selection for ${actor.name} (${skillsToGain} skills)`);

    // Get all available skills that aren't already trained
    const skillNames = {
        acrobatics: 'Acrobatics',
        climb: 'Climb',
        deception: 'Deception',
        endurance: 'Endurance',
        gatherInformation: 'Gather Information',
        initiative: 'Initiative',
        jump: 'Jump',
        knowledgeBureaucracy: 'Knowledge (Bureaucracy)',
        knowledgeGalacticLore: 'Knowledge (Galactic Lore)',
        knowledgeLifeSciences: 'Knowledge (Life Sciences)',
        knowledgePhysicalSciences: 'Knowledge (Physical Sciences)',
        knowledgeSocialSciences: 'Knowledge (Social Sciences)',
        knowledgeTactics: 'Knowledge (Tactics)',
        knowledgeTechnology: 'Knowledge (Technology)',
        mechanics: 'Mechanics',
        perception: 'Perception',
        persuasion: 'Persuasion',
        pilot: 'Pilot',
        ride: 'Ride',
        stealth: 'Stealth',
        survival: 'Survival',
        swim: 'Swim',
        treatInjury: 'Treat Injury',
        useComputer: 'Use Computer',
        useTheForce: 'Use the Force'
    };

    // Filter to untrained skills only
    const untrainedSkills = {};
    for (const [key, name] of Object.entries(skillNames)) {
        const skill = actor.system.skills?.[key];
        if (!skill?.trained) {
            untrainedSkills[key] = name;
        }
    }

    if (Object.keys(untrainedSkills).length === 0) {
        ui.notifications.info('All skills are already trained! No additional skills to select.');
        // Clear pending gains
        const { AttributeIncreaseHandler } = await import('../progression/engine/attribute-increase-handler.js');
        await AttributeIncreaseHandler.clearPendingGains(actor, 'trainedSkills');
        return;
    }

    // Create checkboxes for skill selection
    const skillCheckboxes = Object.entries(untrainedSkills)
        .map(([key, name]) => `
            <label class="skill-checkbox-label" style="display: block; margin: 4px 0;">
                <input type="checkbox" name="skill-selection" value="${key}">
                <span>${name}</span>
            </label>
        `)
        .join('');

    // Show dialog for skill selection
    new SWSEDialogV2({
        title: `Intelligence Increase - Select ${skillsToGain} Skill${skillsToGain > 1 ? 's' : ''} to Train`,
        content: `
            <div class="int-increase-skill-dialog">
                <p><strong>Your Intelligence modifier has increased!</strong></p>
                <p>Select ${skillsToGain} skill${skillsToGain > 1 ? 's' : ''} to become trained in:</p>
                <div class="skill-selection-container" style="max-height: 300px; overflow-y: auto; margin: 10px 0; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                    ${skillCheckboxes}
                </div>
                <p class="hint-text"><i class="fas fa-circle-info"></i> Trained skills gain a +5 bonus to checks.</p>
            </div>
        `,
        buttons: {
            confirm: {
                icon: '<i class="fas fa-check"></i>',
                label: 'Confirm Selection',
                callback: async (html) => {
                    const root = html instanceof HTMLElement ? html : html?.[0];
        const selected = root?.querySelectorAll?.('input[name="skill-selection"]:checked') ?? [];

                    if (selected.length !== skillsToGain) {
                        ui.notifications.warn(`Please select exactly ${skillsToGain} skill${skillsToGain > 1 ? 's' : ''}.`);
                        return false;
                    }

                    // Apply training to selected skills
                    const updates = {};
                    const trainedNames = [];

                    for (const el of selected) {
                        const skillKey = el.value;
                        updates[`system.skills.${skillKey}.trained`] = true;
                        trainedNames.push(skillNames[skillKey] || skillKey);
                    }

                    await globalThis.SWSE.ActorEngine.updateActor(actor, updates, {
                        meta: { guardKey: 'hook-skill-selection' }
                    });

                    // Clear pending gains
                    const { AttributeIncreaseHandler } = await import('../progression/engine/attribute-increase-handler.js');
                    await AttributeIncreaseHandler.clearPendingGains(actor, 'trainedSkills');

                    ui.notifications.info(`Trained in: ${trainedNames.join(', ')}`);
                }
            }
        },
        default: 'confirm',
        render: (html) => {
            // Limit checkbox selection to skillsToGain
            const root = html instanceof HTMLElement ? html : html?.[0];
            if (!(root instanceof HTMLElement)) {return;}
            for (const input of root.querySelectorAll('input[name="skill-selection"]')) {
                input.addEventListener('change', () => {
                    const checked = root.querySelectorAll('input[name="skill-selection"]:checked');
                    if (checked.length >= skillsToGain) {
                        qsa(root, 'input[name="skill-selection"]:not(:checked)').forEach(b => { b.disabled = true; });
                    } else {
                        qsa(root, 'input[name="skill-selection"]').forEach(b => { b.disabled = false; });
                    }
                });
            }
        }
    }, {
        width: 400,
        classes: ['swse', 'int-increase-dialog']
    }).render(true);
}

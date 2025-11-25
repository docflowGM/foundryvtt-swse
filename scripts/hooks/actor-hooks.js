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

/**
 * Register all actor-related hooks
 * Called during system initialization
 */
export function registerActorHooks() {
    SWSELogger.log("Registering actor hooks");

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
 * Handle item creation for special feats
 * Handles Skill Focus feat selection
 *
 * @param {Item} item - The item being created
 * @param {Object} options - Creation options
 * @param {string} userId - The user ID creating the item
 */
async function handleItemCreate(item, options, userId) {
    // Only process for the current user's actions
    if (game.user.id !== userId) return;

    // Only process feats on character actors
    if (item.type !== 'feat' || !item.parent || item.parent.type !== 'character') return;

    // Check if this is a Skill Focus feat (or Greater Skill Focus)
    const featName = item.name.toLowerCase();
    if (!featName.includes('skill focus')) return;

    SWSELogger.log('SWSE | Skill Focus feat detected, prompting for skill selection');

    // Get actor
    const actor = item.parent;

    // Get trained skills
    const trainedSkills = {};
    for (const [key, skill] of Object.entries(actor.system.skills || {})) {
        if (skill.trained) {
            trainedSkills[key] = skill;
        }
    }

    if (Object.keys(trainedSkills).length === 0) {
        ui.notifications.warn("You must have at least one trained skill to select Skill Focus. Please train a skill first.");
        // Delete the feat since requirements aren't met
        await item.delete();
        return;
    }

    // Build skill list for dialog
    const skillNames = {
        acrobatics: "Acrobatics",
        climb: "Climb",
        deception: "Deception",
        endurance: "Endurance",
        gatherInfo: "Gather Information",
        initiative: "Initiative",
        jump: "Jump",
        mechanics: "Mechanics",
        perception: "Perception",
        persuasion: "Persuasion",
        pilot: "Pilot",
        stealth: "Stealth",
        survival: "Survival",
        swim: "Swim",
        treatInjury: "Treat Injury",
        useComputer: "Use Computer",
        useTheForce: "Use the Force"
    };

    // Create options HTML
    const skillOptions = Object.keys(trainedSkills)
        .map(key => `<option value="${key}">${skillNames[key] || key}</option>`)
        .join('');

    // Show dialog to select skill
    new Dialog({
        title: `${item.name} - Select Skill`,
        content: `
            <div class="form-group">
                <label>Choose a trained skill to focus:</label>
                <select id="skill-focus-selection" style="width: 100%; padding: 5px;">
                    ${skillOptions}
                </select>
                <p class="hint-text" style="margin-top: 10px;">
                    <i class="fas fa-info-circle"></i>
                    Skill Focus grants a +5 bonus to the selected skill.
                </p>
            </div>
        `,
        buttons: {
            select: {
                icon: '<i class="fas fa-check"></i>',
                label: "Select",
                callback: async (html) => {
                    const selectedSkill = html.find('#skill-focus-selection').val();

                    // Update the skill to be focused
                    const updateData = {
                        [`system.skills.${selectedSkill}.focused`]: true
                    };
                    await actor.update(updateData);

                    // Update the feat description to note which skill
                    const skillName = skillNames[selectedSkill] || selectedSkill;
                    const updatedDescription = `${item.system.description || ''}\n\n<strong>Focused Skill:</strong> ${skillName}`;
                    await item.update({
                        'system.description': updatedDescription
                    });

                    ui.notifications.info(`${item.name} applied to ${skillName}. You gain +5 to this skill.`);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
                callback: async () => {
                    // Delete the feat if cancelled
                    await item.delete();
                    ui.notifications.warn("Skill Focus feat removed. Select a skill to apply the feat.");
                }
            }
        },
        default: "select",
        close: async () => {
            // If dialog is closed without selection, delete the feat
            if (!actor.system.skills) return;

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
 * Handle item deletion for special feats
 * Removes Skill Focus when feat is deleted
 *
 * @param {Item} item - The item being deleted
 * @param {Object} options - Deletion options
 * @param {string} userId - The user ID deleting the item
 */
async function handleItemDelete(item, options, userId) {
    // Only process for the current user's actions
    if (game.user.id !== userId) return;

    // Only process feats on character actors
    if (item.type !== 'feat' || !item.parent || item.parent.type !== 'character') return;

    // Check if this is a Skill Focus feat
    const featName = item.name.toLowerCase();
    if (!featName.includes('skill focus')) return;

    SWSELogger.log('SWSE | Skill Focus feat deleted, removing focus from skill');

    const actor = item.parent;

    // Try to find which skill was focused from the description
    const descMatch = item.system?.description?.match(/<strong>Focused Skill:<\/strong>\s*(.+?)(?:<|$)/);
    if (descMatch) {
        const focusedSkillName = descMatch[1].trim();

        // Find the skill key by name
        const skillNames = {
            "Acrobatics": "acrobatics",
            "Climb": "climb",
            "Deception": "deception",
            "Endurance": "endurance",
            "Gather Information": "gatherInfo",
            "Initiative": "initiative",
            "Jump": "jump",
            "Mechanics": "mechanics",
            "Perception": "perception",
            "Persuasion": "persuasion",
            "Pilot": "pilot",
            "Stealth": "stealth",
            "Survival": "survival",
            "Swim": "swim",
            "Treat Injury": "treatInjury",
            "Use Computer": "useComputer",
            "Use the Force": "useTheForce"
        };

        const skillKey = skillNames[focusedSkillName];
        if (skillKey && actor.system.skills[skillKey]) {
            await actor.update({
                [`system.skills.${skillKey}.focused`]: false
            });
            ui.notifications.info(`Removed Skill Focus from ${focusedSkillName}`);
        }
    }
}

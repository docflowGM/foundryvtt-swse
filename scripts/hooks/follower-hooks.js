import { FollowerCreator } from '../apps/follower-creator.js';
import { FollowerManager } from '../apps/follower-manager.js';

/**
 * Follower System Hooks
 * Handles automatic follower creation when talents are granted
 */

/**
 * Talent configurations for followers
 */
const FOLLOWER_TALENTS = {
    'Reconnaissance Team Leader': {
        templateChoices: ['aggressive', 'defensive', 'utility'],
        maxCount: 3,
        additionalFeats: ['Skill Training (Perception)', 'Skill Training (Stealth)'],
        description: 'This talent grants you a follower trained in Perception and Stealth.'
    },
    'Inspire Loyalty': {
        templateChoices: ['aggressive', 'defensive', 'utility'],
        maxCount: 3,
        additionalSkills: ['Perception'],
        armorProficiencyChoice: true,
        description: 'This talent grants you a follower with an Armor Proficiency feat of your choice and trained in Perception.'
    }
};

/**
 * Initialize follower hooks
 */
export function initializeFollowerHooks() {

    /**
     * Hook: When an item is created on an actor (talent added)
     */
    Hooks.on('createItem', async (item, options, userId) => {
        // Only process for the user who created the item
        if (game.user.id !== userId) {return;}

        // Only process talents
        if (item.type !== 'talent') {return;}

        // Get the actor
        const actor = item.actor;
        if (!actor) {return;}

        // Check if this is a follower-granting talent
        const talentConfig = FOLLOWER_TALENTS[item.name];
        if (talentConfig) {
            // Check how many followers this talent has already granted
            const currentFollowers = actor.getFlag('swse', 'followers') || [];
            const followersFromThisTalent = currentFollowers.filter(f => f.talent === item.name);

            if (followersFromThisTalent.length >= talentConfig.maxCount) {
                ui.notifications.warn(`You have already reached the maximum number of followers for ${item.name}.`);
                return;
            }

            // Ask user if they want to create a follower now
            const shouldCreate = await Dialog.confirm({
                title: `Create Follower for ${item.name}?`,
                content: `<p>${talentConfig.description}</p><p>Would you like to create a follower now?</p><p><em>You can create followers later from the character sheet.</em></p>`,
                yes: () => true,
                no: () => false
            });

            if (shouldCreate) {
                // Show template selection dialog
                await showFollowerTemplateSelection(actor, item, talentConfig);
            }
        }

        // Check if this is an enhancement talent
        const enhancement = FollowerManager.ENHANCEMENT_TALENTS[item.name];
        if (enhancement) {
            await FollowerManager.applyEnhancement(actor, item);
        }
    });

    /**
     * Hook: When an item is deleted from an actor (talent removed)
     */
    Hooks.on('deleteItem', async (item, options, userId) => {
        // Only process for the user who deleted the item
        if (game.user.id !== userId) {return;}

        // Only process talents
        if (item.type !== 'talent') {return;}

        // Get the actor
        const actor = item.actor;
        if (!actor) {return;}

        // Check if this is an enhancement talent
        const enhancement = FollowerManager.ENHANCEMENT_TALENTS[item.name];
        if (enhancement) {
            await FollowerManager.removeEnhancement(actor, item);
        }

        // If it's a follower-granting talent, warn the user
        const talentConfig = FOLLOWER_TALENTS[item.name];
        if (talentConfig) {
            const followersFromTalent = (actor.getFlag('swse', 'followers') || [])
                .filter(f => f.talent === item.name);

            if (followersFromTalent.length > 0) {
                ui.notifications.warn(`You have ${followersFromTalent.length} follower(s) from ${item.name}. You may want to remove them manually.`);
            }
        }
    });

    /**
     * Hook: When actor is updated (level changes)
     */

    /**
     * AppV2: Add follower manager header control (no DOM injection).
     */
    Hooks.on('getHeaderControlsApplicationV2', (app, controls) => {
        const actor = app?.actor ?? app?.document;
        if (!actor || actor.type !== 'character') {return;}

        const followerTalents = actor.items.filter(i => i.type === 'talent' && FOLLOWER_TALENTS[i.name]);
        if (!followerTalents.length) {return;}

        if (controls.some(c => c?.action === 'swse-followers')) {return;}

        controls.push({
            action: 'swse-followers',
            icon: 'fa-solid fa-users',
            label: 'Followers',
            visible: () => true,
            onClick: () => new FollowerManager(actor).render(true)
        });
    });


    Hooks.on('updateActor', async (actor, changes, options, userId) => {
        // Only process for the user who updated the actor
        if (game.user.id !== userId) {return;}

        // Check if level changed
        if (changes.system?.level) {
            await FollowerManager.updateFollowerStats(actor);
        }
    });
}

/**
 * Show template selection dialog for follower
 */
async function showFollowerTemplateSelection(actor, grantingTalent, talentConfig) {
    const templates = await FollowerCreator.getFollowerTemplates();

    // Build template choice HTML
    const templateChoices = talentConfig.templateChoices.map(type => {
        const template = templates[type];
        return `
            <div class="follower-template-option">
                <input type="radio" name="templateType" value="${type}" id="template-${type}" required>
                <label for="template-${type}">
                    <strong>${template.name}</strong>
                    <p>${template.description}</p>
                </label>
            </div>
        `;
    }).join('');

    const html = `
        <form>
            <div class="form-group">
                <h3>Choose Follower Template</h3>
                ${templateChoices}
            </div>
        </form>
        <style>
            .follower-template-option {
                margin: 10px 0;
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }
            .follower-template-option input[type="radio"] {
                margin-right: 10px;
            }
            .follower-template-option label {
                cursor: pointer;
                display: block;
            }
            .follower-template-option p {
                margin: 5px 0 0 24px;
                font-size: 0.9em;
                color: #666;
            }
            .follower-template-option:has(input:checked) {
                background: #e8f4f8;
                border-color: #2c5f7c;
            }
        </style>
    `;

    return new Promise((resolve) => {
        new Dialog({
            title: `Choose Follower Template - ${grantingTalent.name}`,
            content: html,
            buttons: {
                create: {
                    icon: '<i class="fas fa-check"></i>',
                    label: 'Continue',
                    callback: async (html) => {
                        const root = html instanceof HTMLElement ? html : html?.[0];
                        const formData = new FormData(root.querySelector('form'));
                        const templateType = formData.get('templateType');

                        if (!templateType) {
                            ui.notifications.error('Please select a follower template.');
                            resolve(null);
                            return;
                        }

                        // Create the follower
                        const follower = await FollowerCreator.createFollower(
                            actor,
                            templateType,
                            grantingTalent
                        );

                        resolve(follower);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancel',
                    callback: () => resolve(null)
                }
            },
            default: 'create'
        }, {
            width: 600,
            classes: ['swse-dialog', 'follower-template-selection-dialog']
        }).render(true);
    });
}

/**
 * Add follower management UI to character sheet
 */
function addFollowerManagementUI(html, actor, followerTalents) {
    // Find talents tab or a suitable location
    const root = html?.[0] ?? html;
    const talentsTab = root?.querySelector?.('.tab[data-tab="talents"]');
    if (!talentsTab.length) {return;}

    // Get current followers
    const currentFollowers = FollowerCreator.getFollowers(actor);

    // Build follower UI
    const followerHTML = `
        <div class="follower-management-section">
            <h3>
                <i class="fas fa-users"></i> Followers
                <button type="button" class="create-follower-btn" title="Create New Follower">
                    <i class="fas fa-plus"></i> Add Follower
                </button>
            </h3>
            <div class="followers-list">
                ${currentFollowers.length === 0 ? '<p class="no-followers">No followers yet.</p>' : ''}
                ${currentFollowers.map(follower => `
                    <div class="follower-item" data-follower-id="${follower.id}">
                        <img src="${follower.img}" alt="${follower.name}">
                        <div class="follower-info">
                            <strong>${follower.name}</strong>
                            <span class="follower-meta">Level ${follower.system.level} • ${follower.system.followerType}</span>
                        </div>
                        <div class="follower-actions">
                            <button type="button" class="open-follower-sheet" title="Open Sheet">
                                <i class="fas fa-file-alt"></i>
                            </button>
                            <button type="button" class="remove-follower" title="Remove Follower">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        <style>
            .follower-management-section {
                margin: 15px 0;
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background: #f9f9f9;
            }
            .follower-management-section h3 {
                margin: 0 0 10px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .create-follower-btn {
                padding: 4px 8px;
                font-size: 0.85em;
            }
            .followers-list {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .follower-item {
                display: flex;
                align-items: center;
                padding: 8px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 3px;
            }
            .follower-item img {
                width: 40px;
                height: 40px;
                border-radius: 3px;
                margin-right: 10px;
            }
            .follower-info {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            .follower-meta {
                font-size: 0.85em;
                color: #666;
            }
            .follower-actions {
                display: flex;
                gap: 5px;
            }
            .follower-actions button {
                padding: 4px 8px;
            }
            .no-followers {
                color: #666;
                font-style: italic;
                text-align: center;
                padding: 10px;
            }
        </style>
    `;

    // Insert before talents list
    talentsTab.prepend(followerHTML);

    // Add event listeners
    root.querySelector('.create-follower-btn').on('click', async (event) => {
        event.preventDefault();

        // Show talent selection if multiple talents grant followers
        let selectedTalent = followerTalents[0];

        if (followerTalents.length > 1) {
            selectedTalent = await selectFollowerTalent(followerTalents);
            if (!selectedTalent) {return;}
        }

        const talentConfig = FOLLOWER_TALENTS[selectedTalent.name];
        await showFollowerTemplateSelection(actor, selectedTalent, talentConfig);

        // Re-render sheet
        actor.sheet.render(false);
    });

    root.querySelector('.open-follower-sheet').on('click', async (event) => {
        event.preventDefault();
        const followerId = $(event.currentTarget).closest('.follower-item').data('follower-id');
        const follower = game.actors.get(followerId);
        if (follower) {
            follower.sheet.render(true);
        }
    });

    root.querySelector('.remove-follower').on('click', async (event) => {
        event.preventDefault();
        const followerId = $(event.currentTarget).closest('.follower-item').data('follower-id');
        const follower = game.actors.get(followerId);
        if (follower) {
            await FollowerCreator.removeFollower(actor, follower);
            actor.sheet.render(false);
        }
    });
}

/**
 * Select which talent to use for creating a follower
 */
async function selectFollowerTalent(talents) {
    const html = `
        <form>
            <div class="form-group">
                <label>Which talent do you want to use to create this follower?</label>
                <select name="talentId" required>
                    ${talents.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
            </div>
        </form>
    `;

    return new Promise((resolve) => {
        new Dialog({
            title: 'Select Talent',
            content: html,
            buttons: {
                select: {
                    icon: '<i class="fas fa-check"></i>',
                    label: 'Select',
                    callback: (html) => {
                        const root = html instanceof HTMLElement ? html : html?.[0];
                        const formData = new FormData(root.querySelector('form'));
                        const talentId = formData.get('talentId');
                        const talent = talents.find(t => t.id === talentId);
                        resolve(talent);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancel',
                    callback: () => resolve(null)
                }
            },
            default: 'select'
        }).render(true);
    });
}

export default initializeFollowerHooks;

/**
 * Follower Creator - Handles creation and management of follower characters
 *
 * Followers have special rules that differ from standard character creation:
 * - HP = 10 + owner level (not class hit die)
 * - BAB from template progression tables
 * - Defenses = 10 + ability mod + owner level
 *
 * This module uses shared progression utilities for item creation (species, feats, skills)
 * but maintains follower-specific stat calculations.
 */

import { swseLogger } from '../utils/logger.js';
import { resolveSkillKey } from '../utils/skill-resolver.js';
import { createActor } from '../core/document-api-v13.js';

export class FollowerCreator {

    /**
     * Load follower template data
     * @returns {Promise<Object>} Follower template data
     */
    static async getFollowerTemplates() {
        const response = await fetch('systems/foundryvtt-swse/data/follower-templates.json');
        return await response.json();
    }

    /**
     * Create a new follower for an owner actor
     * @param {Actor} owner - The actor who owns this follower
     * @param {string} templateType - The follower template type (aggressive, defensive, utility)
     * @param {Object} grantingTalent - The talent that granted this follower
     * @returns {Promise<Actor>} The created follower actor
     */
    static async createFollower(owner, templateType, grantingTalent = null) {
        const templates = await this.getFollowerTemplates();
        const template = templates[templateType];

        if (!template) {
            ui.notifications.error(`Invalid follower template: ${templateType}`);
            return null;
        }

        // Show dialog for follower customization
        const followerData = await this._showFollowerCreationDialog(owner, template, templateType, grantingTalent);

        if (!followerData) {
            return null; // User cancelled
        }

        // Create the follower actor
        const follower = await this._buildFollowerActor(owner, template, followerData, grantingTalent);

        // Link follower to owner
        await this._linkFollowerToOwner(owner, follower, grantingTalent);

        // Fire completion hook for consistency with main progression system
        try {
            Hooks.callAll('swse:progression:completed', {
                actor: follower,
                mode: 'follower',
                level: follower.system.level,
                owner: owner.id,
                template: templateType
            });
        } catch (e) {
            swseLogger.warn('FollowerCreator: Completion hook threw:', e);
        }

        ui.notifications.info(`Follower "${follower.name}" created successfully!`);
        return follower;
    }

    /**
     * Show dialog for follower creation choices
     * @private
     */
    static async _showFollowerCreationDialog(owner, template, templateType, grantingTalent) {
        // Get available species
        const speciesPack = game.packs.get('foundryvtt-swse.species');
        if (!speciesPack) {
            ui.notifications.error('Species compendium not found! Cannot create follower.');
            return null;
        }

        const speciesIndex = await speciesPack.getIndex();
        const speciesList = speciesIndex.map(s => ({ id: s._id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name));

        const dialogData = {
            template,
            templateType,
            speciesList,
            owner,
            grantingTalent
        };

        const html = await renderTemplate('systems/foundryvtt-swse/templates/apps/follower-creator-dialog.html', dialogData);

        return new Promise((resolve) => {
            new Dialog({
                title: `Create ${template.name}`,
                content: html,
                buttons: {
                    create: {
                        icon: '<i class="fas fa-check"></i>',
                        label: 'Create Follower',
                        callback: async (html) => {
                            const formData = new FormData(html[0].querySelector('form'));
                            const data = {
                                name: formData.get('name'),
                                species: formData.get('species'),
                                abilityChoice: formData.get('abilityChoice'),
                                skillChoice: formData.get('skillChoice'),
                                featChoice: formData.get('featChoice'),
                                humanBonus: formData.get('humanBonus'),
                                templateType: templateType
                            };
                            resolve(data);
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                        callback: () => resolve(null)
                    }
                },
                default: 'create',
                render: (html) => {
                    // Add event listeners for dynamic updates
                    const speciesSelect = root.querySelector('[name="species"]');
                    const humanBonusDiv = root.querySelector('.human-bonus-section');

                    speciesSelect?.addEventListener('change', (event) => {
                        const selectedSpeciesName = event.target.options[event.target.selectedIndex].text;
                        if (selectedSpeciesName === 'Human') {
                            if (humanBonusDiv) {humanBonusDiv.style.display = '';}
                        } else {
                            if (humanBonusDiv) {humanBonusDiv.style.display = 'none';}
                        }
                    });

                    // Trigger initial check
                    speciesSelect.trigger('change');
                }
            }, {
                width: 500,
                classes: ['swse-dialog', 'follower-creator-dialog']
            }).render(true);
        });
    }

    /**
     * Build follower actor with all stats and features
     * Uses progression-style data storage for consistency
     * @private
     */
    static async _buildFollowerActor(owner, template, followerData, grantingTalent) {
        const ownerLevel = owner.system.level || 1;
        const followerLevel = ownerLevel; // Followers are same level as owner

        // Get species data
        const speciesPack = game.packs.get('foundryvtt-swse.species');
        const speciesDoc = await speciesPack.getDocument(followerData.species);

        // Calculate base abilities (all start at 10)
        const abilities = {
            str: { base: 10 },
            dex: { base: 10 },
            con: { base: 10 },
            int: { base: 10 },
            wis: { base: 10 },
            cha: { base: 10 }
        };

        // Apply template ability bonus
        if (followerData.abilityChoice && template.abilityBonus) {
            abilities[followerData.abilityChoice].base += template.abilityBonus;
        }

        // Calculate defenses (10 + ability mod + owner level) - FOLLOWER SPECIFIC
        const defenses = await this._calculateFollowerDefenses(abilities, ownerLevel, template);

        // Calculate HP (10 + owner level) - FOLLOWER SPECIFIC
        const hp = {
            max: 10 + ownerLevel,
            value: 10 + ownerLevel
        };

        // Get BAB from template - FOLLOWER SPECIFIC
        const bab = template.babProgression[Math.min(followerLevel - 1, 19)] || 0;

        // Build progression data for consistency with main system
        const progressionData = {
            species: speciesDoc?.name || null,
            classLevels: [], // Followers don't have normal class levels
            feats: [],
            talents: [],
            trainedSkills: [],
            isFollower: true,
            followerTemplate: template.name
        };

        // Create actor data
        const actorData = {
            name: followerData.name || `${owner.name}'s Follower`,
            type: 'character',
            system: {
                level: followerLevel,
                isFollower: true,
                followerType: template.name,
                race: speciesDoc?.name || '',
                abilities: abilities,
                hp: hp,
                baseAttackBonus: bab,
                attributes: {
                    damageThreshold: 0 // Will be calculated on prepare
                },
                progression: progressionData
            },
            flags: {
                swse: {
                    follower: {
                        ownerId: owner.id,
                        templateType: followerData.templateType,
                        grantingTalent: grantingTalent?.name || null
                    }
                }
            }
        };

        // Create the actor using v13-safe wrapper
        const follower = await createActor(actorData);

        // Apply species (creates species item)
        if (speciesDoc) {
            await this._applySpecies(follower, speciesDoc, followerData);
            // Update progression data
            progressionData.species = speciesDoc.name;
        }

        // Apply template feats (creates feat items)
        const appliedFeats = await this._applyTemplateFeats(follower, template, followerData);
        progressionData.feats = appliedFeats;

        // Apply template skills
        const appliedSkills = await this._applyTemplateSkills(follower, template, followerData);
        progressionData.trainedSkills = appliedSkills;

        // Apply talent-specific bonuses
        if (grantingTalent) {
            await this._applyTalentBonuses(follower, grantingTalent);
        }

        // Apply template defense bonuses
        await this._applyDefenseBonuses(follower, template);

        // Update progression data on actor
        await follower.update({
            'system.progression': progressionData
        });

        swseLogger.log(`FollowerCreator: Created follower "${follower.name}" for ${owner.name}`);

        return follower;
    }

    /**
     * Calculate follower defenses - FOLLOWER SPECIFIC FORMULA
     * @private
     */
    static async _calculateFollowerDefenses(abilities, ownerLevel, template) {
        // Helper to calculate ability modifier
        const getMod = (score) => Math.floor((score - 10) / 2);

        // Base defense = 10 + ability mod + owner level
        const defenses = {
            fortitude: {
                base: 10 + Math.max(getMod(abilities.str.base), getMod(abilities.con.base)) + ownerLevel
            },
            reflex: {
                base: 10 + getMod(abilities.dex.base) + ownerLevel
            },
            will: {
                base: 10 + getMod(abilities.wis.base) + ownerLevel
            }
        };

        return defenses;
    }

    /**
     * Apply species to follower
     * @private
     */
    static async _applySpecies(follower, speciesDoc, followerData) {
        // Add species as an item to the follower
        const speciesData = speciesDoc.toObject();
        await follower.createEmbeddedDocuments('Item', [speciesData]);

        // Handle Human special case
        if (speciesDoc.name === 'Human' && followerData.humanBonus) {
            await this._applyHumanBonus(follower, followerData.humanBonus);
        }

        // Handle Droid special case
        if (speciesDoc.name.toLowerCase().includes('droid')) {
            await this._applyDroidTraits(follower);
        }
    }

    /**
     * Apply Human follower bonus (choose one benefit from another template)
     * @private
     */
    static async _applyHumanBonus(follower, bonusChoice) {
        const templates = await this.getFollowerTemplates();

        // Parse bonus choice (format: "templateType:bonusType")
        const [templateType, bonusType] = bonusChoice.split(':');
        const template = templates[templateType];

        if (!template) {return;}

        switch (bonusType) {
            case 'defense':
                await this._applyDefenseBonuses(follower, template);
                break;
            case 'ability':
                // Human gets to choose an ability from another template
                // This would need additional dialog, for now just apply the first choice
                const abilityChoice = template.abilityChoices[0];
                const currentAbility = follower.system.attributes[abilityChoice].base;
                await follower.update({
                    [`system.attributes.${abilityChoice}.base`]: currentAbility + template.abilityBonus
                });
                break;
            case 'feat': {
                const feats = template.feats || template.featChoices || [];
                if (feats.length > 0) {
                    await this._addFeatByName(follower, feats[0]);
                }
                break;
            }
            case 'skill': {
                const skills = template.trainedSkills || [];
                if (skills.length > 0) {
                    await this._trainSkill(follower, skills[0]);
                }
                break;
            }
        }
    }

    /**
     * Apply Droid special traits
     * @private
     */
    static async _applyDroidTraits(follower) {
        // Droids have special traits that should be handled by the species item
        // But we can add any additional droid-specific flags here
        await follower.setFlag('swse', 'isDroid', true);
    }

    /**
     * Apply feats from template
     * @private
     * @returns {Array<string>} Names of applied feats
     */
    static async _applyTemplateFeats(follower, template, followerData) {
        const appliedFeats = [];

        // All followers get Weapon Proficiency (Simple Weapons)
        const baseFeat = 'Weapon Proficiency (Simple Weapons)';
        if (await this._addFeatByName(follower, baseFeat)) {
            appliedFeats.push(baseFeat);
        }

        // Add template-specific feats
        if (template.feats) {
            for (const featName of template.feats) {
                if (await this._addFeatByName(follower, featName)) {
                    appliedFeats.push(featName);
                }
            }
        }

        // Handle feat choices (e.g., Utility template)
        if (template.featChoices && followerData.featChoice) {
            if (await this._addFeatByName(follower, followerData.featChoice)) {
                appliedFeats.push(followerData.featChoice);
            }
        }

        return appliedFeats;
    }

    /**
     * Add a feat to follower by name
     * @private
     * @returns {boolean} True if feat was added successfully
     */
    static async _addFeatByName(follower, featName) {
        const featsPack = game.packs.get('foundryvtt-swse.feats');
        if (!featsPack) {
            swseLogger.warn('FollowerCreator: Feats compendium not found');
            return false;
        }

        try {
            const featIndex = await featsPack.getIndex({ fields: ['name'] });
            const featEntry = featIndex.find(f => f.name === featName);

            if (featEntry) {
                const featDoc = await featsPack.getDocument(featEntry._id);
                const featData = featDoc.toObject();
                await follower.createEmbeddedDocuments('Item', [featData]);
                return true;
            } else {
                swseLogger.warn(`FollowerCreator: Feat not found: ${featName}`);
                return false;
            }
        } catch (e) {
            swseLogger.warn(`FollowerCreator: Error adding feat "${featName}":`, e);
            return false;
        }
    }

    /**
     * Apply skills from template
     * @private
     * @returns {Array<string>} Names of trained skills
     */
    static async _applyTemplateSkills(follower, template, followerData) {
        const trainedSkills = [];

        // Apply trained skills from template
        if (template.trainedSkills) {
            for (const skillName of template.trainedSkills) {
                if (await this._trainSkill(follower, skillName)) {
                    trainedSkills.push(skillName);
                }
            }
        }

        // Handle skill choice (e.g., Utility template)
        if (template.skillChoice && followerData.skillChoice) {
            if (await this._trainSkill(follower, followerData.skillChoice)) {
                trainedSkills.push(followerData.skillChoice);
            }
        }

        return trainedSkills;
    }

    /**
     * Train a skill for follower
     * @private
     * @returns {boolean} True if skill was trained successfully
     */
    static async _trainSkill(follower, skillName) {
        const skillKey = await resolveSkillKey(skillName);
        if (skillKey && follower.system.skills?.[skillKey]) {
            await follower.update({
                [`system.skills.${skillKey}.trained`]: true
            });
            return true;
        }
        return false;
    }

    /**
     * Apply talent-specific bonuses
     * @private
     */
    static async _applyTalentBonuses(follower, grantingTalent) {
        const talentName = grantingTalent.name;

        // Handle Reconnaissance Team Leader
        if (talentName === 'Reconnaissance Team Leader') {
            await this._addFeatByName(follower, 'Skill Training (Perception)');
            await this._addFeatByName(follower, 'Skill Training (Stealth)');
        }

        // Handle Inspire Loyalty
        if (talentName === 'Inspire Loyalty') {
            await this._trainSkill(follower, 'Perception');
            // Armor proficiency will be chosen in dialog
        }
    }

    /**
     * Apply defense bonuses from template
     * @private
     */
    static async _applyDefenseBonuses(follower, template) {
        if (!template.defenseBonus) {return;}

        const updates = {};

        for (const [defense, bonus] of Object.entries(template.defenseBonus)) {
            updates[`system.defenses.${defense}.misc`] = bonus;
        }

        if (Object.keys(updates).length > 0) {
            await follower.update(updates);
        }
    }

    /**
     * Link follower to owner
     * @private
     */
    static async _linkFollowerToOwner(owner, follower, grantingTalent) {
        // Add follower to owner's flags
        const currentFollowers = owner.getFlag('swse', 'followers') || [];
        currentFollowers.push({
            id: follower.id,
            name: follower.name,
            talent: grantingTalent?.name || null
        });

        await owner.setFlag('swse', 'followers', currentFollowers);

        // Set ownership permissions to match owner
        const ownerUser = game.users.find(u => u.character?.id === owner.id);
        if (ownerUser) {
            await follower.update({
                ownership: {
                    [ownerUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
                }
            });
        }
    }

    /**
     * Get all followers for an actor
     * @param {Actor} actor - The owner actor
     * @returns {Array<Actor>} Array of follower actors
     */
    static getFollowers(actor) {
        const followerData = actor.getFlag('swse', 'followers') || [];
        return followerData.map(f => game.actors.get(f.id)).filter(f => f);
    }

    /**
     * Remove a follower
     * @param {Actor} owner - The owner actor
     * @param {Actor} follower - The follower to remove
     */
    static async removeFollower(owner, follower) {
        const currentFollowers = owner.getFlag('swse', 'followers') || [];
        const updatedFollowers = currentFollowers.filter(f => f.id !== follower.id);

        await owner.setFlag('swse', 'followers', updatedFollowers);

        // Optionally delete the follower actor
        const shouldDelete = await Dialog.confirm({
            title: 'Delete Follower?',
            content: `<p>Do you want to permanently delete ${follower.name}?</p>`,
            yes: () => true,
            no: () => false
        });

        if (shouldDelete) {
            await follower.delete();
        }
    }

    /**
     * Update follower when owner levels up
     * Called from level-up hooks to sync follower stats
     * @param {Actor} owner - The owner actor
     */
    static async updateFollowersForLevelUp(owner) {
        const followers = this.getFollowers(owner);
        const ownerLevel = owner.system.level || 1;

        for (const follower of followers) {
            if (!follower.system.isFollower) {continue;}

            // Get follower's template for BAB progression
            const templateType = follower.flags?.swse?.follower?.templateType;
            const templates = await this.getFollowerTemplates();
            const template = templates[templateType];

            if (!template) {
                swseLogger.warn(`FollowerCreator: Unknown template "${templateType}" for follower ${follower.name}`);
                continue;
            }

            // Update follower stats based on owner's new level
            const newBAB = template.babProgression[Math.min(ownerLevel - 1, 19)] || 0;
            const newHP = 10 + ownerLevel;

            // Recalculate defenses
            const abilities = follower.system.attributes;
            const getMod = (ability) => Math.floor(((abilities[ability]?.base || 10) - 10) / 2);

            await follower.update({
                'system.level': ownerLevel,
                'system.baseAttackBonus': newBAB,
                'system.hp.max': newHP,
                'system.hp.value': Math.min(follower.system.hp.value, newHP),
                'system.defenses.fortitude.base': 10 + Math.max(getMod('str'), getMod('con')) + ownerLevel,
                'system.defenses.reflex.base': 10 + getMod('dex') + ownerLevel,
                'system.defenses.will.base': 10 + getMod('wis') + ownerLevel
            });

            swseLogger.log(`FollowerCreator: Updated follower "${follower.name}" to level ${ownerLevel}`);
        }
    }
}

// Register hook to update followers when owner levels up
Hooks.on('swse:progression:completed', async (data) => {
    if (data.mode === 'levelup' && data.actor) {
        await FollowerCreator.updateFollowersForLevelUp(data.actor);
    }
});

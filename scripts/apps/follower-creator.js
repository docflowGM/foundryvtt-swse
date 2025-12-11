/**
 * Follower Creator - Handles creation and management of follower characters
 */
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

        ui.notifications.info(`Follower "${follower.name}" created successfully!`);
        return follower;
    }

    /**
     * Show dialog for follower creation choices
     * @private
     */
    static async _showFollowerCreationDialog(owner, template, templateType, grantingTalent) {
        // Get available species
        const speciesPack = game.packs.get('swse.species');
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
                        label: "Create Follower",
                        callback: async (html) => {
                            const formData = new FormData(html[0].querySelector('form'));
                            const data = {
                                name: formData.get('name'),
                                species: formData.get('species'),
                                abilityChoice: formData.get('abilityChoice'),
                                skillChoice: formData.get('skillChoice'),
                                featChoice: formData.get('featChoice'),
                                humanBonus: formData.get('humanBonus')
                            };
                            resolve(data);
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => resolve(null)
                    }
                },
                default: "create",
                render: (html) => {
                    // Add event listeners for dynamic updates
                    const speciesSelect = html.find('[name="species"]');
                    const humanBonusDiv = html.find('.human-bonus-section');

                    speciesSelect.on('change', (event) => {
                        const selectedSpeciesName = event.target.options[event.target.selectedIndex].text;
                        if (selectedSpeciesName === 'Human') {
                            humanBonusDiv.show();
                        } else {
                            humanBonusDiv.hide();
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
     * @private
     */
    static async _buildFollowerActor(owner, template, followerData, grantingTalent) {
        const ownerLevel = owner.system.level || 1;
        const followerLevel = ownerLevel; // Followers are same level as owner

        // Get species data
        const speciesPack = game.packs.get('swse.species');
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

        // Calculate defenses (10 + ability mod + owner level)
        const defenses = await this._calculateFollowerDefenses(abilities, ownerLevel, template);

        // Calculate HP (10 + owner level)
        const hp = {
            max: 10 + ownerLevel,
            value: 10 + ownerLevel
        };

        // Get BAB from template
        const bab = template.babProgression[Math.min(followerLevel - 1, 19)] || 0;

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
                }
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

        // Create the actor
        const follower = await Actor.create(actorData);

        // Apply species
        if (speciesDoc) {
            await this._applySpecies(follower, speciesDoc, followerData);
        }

        // Apply template feats
        await this._applyTemplateFeats(follower, template, followerData);

        // Apply template skills
        await this._applyTemplateSkills(follower, template, followerData);

        // Apply talent-specific bonuses
        if (grantingTalent) {
            await this._applyTalentBonuses(follower, grantingTalent);
        }

        // Apply template defense bonuses
        await this._applyDefenseBonuses(follower, template);

        return follower;
    }

    /**
     * Calculate follower defenses
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

        if (!template) return;

        switch (bonusType) {
            case 'defense':
                await this._applyDefenseBonuses(follower, template);
                break;
            case 'ability':
                // Human gets to choose an ability from another template
                // This would need additional dialog, for now just apply the first choice
                const abilityChoice = template.abilityChoices[0];
                const currentAbility = follower.system.abilities[abilityChoice].base;
                await follower.update({
                    [`system.abilities.${abilityChoice}.base`]: currentAbility + template.abilityBonus
                });
                break;
            case 'feat':
                const feats = template.feats || template.featChoices || [];
                if (feats.length > 0) {
                    await this._addFeatByName(follower, feats[0]);
                }
                break;
            case 'skill':
                const skills = template.trainedSkills || [];
                if (skills.length > 0) {
                    await this._trainSkill(follower, skills[0]);
                }
                break;
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
     */
    static async _applyTemplateFeats(follower, template, followerData) {
        // All followers get Weapon Proficiency (Simple Weapons)
        await this._addFeatByName(follower, 'Weapon Proficiency (Simple Weapons)');

        // Add template-specific feats
        if (template.feats) {
            for (const featName of template.feats) {
                await this._addFeatByName(follower, featName);
            }
        }

        // Handle feat choices (e.g., Utility template)
        if (template.featChoices && followerData.featChoice) {
            await this._addFeatByName(follower, followerData.featChoice);
        }
    }

    /**
     * Add a feat to follower by name
     * @private
     */
    static async _addFeatByName(follower, featName) {
        const featsPack = game.packs.get('swse.feats');
        const featIndex = await featsPack.getIndex({ fields: ['name'] });
        const featEntry = featIndex.find(f => f.name === featName);

        if (featEntry) {
            const featDoc = await featsPack.getDocument(featEntry._id);
            const featData = featDoc.toObject();
            await follower.createEmbeddedDocuments('Item', [featData]);
        } else {
            swseLogger.warn(`Feat not found: ${featName}`);
        }
    }

    /**
     * Apply skills from template
     * @private
     */
    static async _applyTemplateSkills(follower, template, followerData) {
        // Apply trained skills from template
        if (template.trainedSkills) {
            for (const skillName of template.trainedSkills) {
                await this._trainSkill(follower, skillName);
            }
        }

        // Handle skill choice (e.g., Utility template)
        if (template.skillChoice && followerData.skillChoice) {
            await this._trainSkill(follower, followerData.skillChoice);
        }
    }

    /**
     * Train a skill for follower
     * @private
     */
    static async _trainSkill(follower, skillName) {
        const skillKey = this._getSkillKey(skillName);
        if (skillKey && follower.system.skills[skillKey]) {
            await follower.update({
                [`system.skills.${skillKey}.trained`]: true
            });
        }
    }

    /**
     * Get skill key from skill name
     * @private
     */
    static _getSkillKey(skillName) {
        const skillMap = {
            'Acrobatics': 'acrobatics',
            'Climb': 'climb',
            'Deception': 'deception',
            'Endurance': 'endurance',
            'Gather Information': 'gatherInformation',
            'Initiative': 'initiative',
            'Jump': 'jump',
            'Knowledge (Bureaucracy)': 'knowledgeBureaucracy',
            'Knowledge (Galactic Lore)': 'knowledgeGalacticLore',
            'Knowledge (Life Sciences)': 'knowledgeLifeSciences',
            'Knowledge (Physical Sciences)': 'knowledgePhysicalSciences',
            'Knowledge (Social Sciences)': 'knowledgeSocialSciences',
            'Knowledge (Tactics)': 'knowledgeTactics',
            'Knowledge (Technology)': 'knowledgeTechnology',
            'Mechanics': 'mechanics',
            'Perception': 'perception',
            'Persuasion': 'persuasion',
            'Pilot': 'pilot',
            'Ride': 'ride',
            'Stealth': 'stealth',
            'Survival': 'survival',
            'Swim': 'swim',
            'Treat Injury': 'treatInjury',
            'Use Computer': 'useComputer',
            'Use the Force': 'useTheForce'
        };

        return skillMap[skillName] || null;
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
        if (!template.defenseBonus) return;

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
            title: "Delete Follower?",
            content: `<p>Do you want to permanently delete ${follower.name}?</p>`,
            yes: () => true,
            no: () => false
        });

        if (shouldDelete) {
            await follower.delete();
        }
    }
}

/**
 * Follower Creator - Handles creation and management of follower characters
 *
 * Followers have special rules that differ from standard character creation:
 * - HP = 10 + owner heroic level (not class hit die)
 * - BAB from template progression tables
 * - Defenses = 10 + ability mod + owner heroic level
 * - Followers are tied to owner's HEROIC LEVEL specifically (not total level if mixed heroic/nonheroic)
 *
 * This module uses shared progression utilities for item creation (species, feats, skills)
 * but maintains follower-specific stat calculations.
 *
 * Phase 3: Integrated as a DEPENDENT participant through the progression spine.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { resolveSkillKey, resolveSkillName } from "/systems/foundryvtt-swse/scripts/utils/skill-resolver.js";
import { createActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { getHeroicLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { SpeciesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { getFollowerTalentConfig } from "/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js";

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
    /**
 * Build creation context for an inline (in-sheet) follower builder.
 * This does NOT render dialogs or create windows.
 *
 * @param {Actor} owner
 * @param {string[]|null} templateChoices
 * @param {object|null} grantingTalent
 * @returns {Promise<object|null>}
 */
static async getInlineCreationContext(owner, templateChoices = null, grantingTalent = null) {
  const templates = await this.getFollowerTemplates();
  const allowed = templateChoices?.length
    ? templateChoices.filter(k => templates[k])
    : Object.keys(templates);

  await SpeciesRegistry.initialize?.();
  const speciesList = (SpeciesRegistry.getAll?.() || [])
    .map(s => ({ id: s.id || s._id, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (speciesList.length === 0) {
    ui.notifications.error('Species registry not found! Cannot create follower.');
    return null;
  }

  const templateTypes = allowed.map(key => ({
    key,
    name: templates[key]?.name ?? key
  }));

  return { owner, grantingTalent, templateTypes, speciesList, templates };
}

/**
 * Create follower directly from form data (no dialogs).
 *
 * @param {Actor} owner
 * @param {string} templateType
 * @param {object} followerData
 * @param {object|null} grantingTalent
 * @returns {Promise<Actor|null>}
 */
static async createFollowerFromData(owner, templateType, followerData, grantingTalent = null) {
  const templates = await this.getFollowerTemplates();
  const template = templates[templateType];

  if (!template) {
    ui.notifications.error(`Invalid follower template: ${templateType}`);
    return null;
  }

  const follower = await this._buildFollowerActor(owner, template, followerData, grantingTalent);
  if (!follower) return null;

  await this._linkFollowerToOwner(owner, follower, grantingTalent);

  try {
    Hooks.callAll('swse:progression:completed', {
      actor: follower,
      mode: 'follower',
      level: follower.system.level,
      owner: owner.id,
      template: templateType
    });
  } catch (e) {
    console.warn('SWSE | FollowerCreator completion hook threw:', e);
  }

  ui.notifications.info(`Follower "${follower.name}" created successfully!`);
  return follower;
}

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

        const follower = await this.createFollowerFromData(owner, templateType, followerData, grantingTalent);
        if (!follower) {return null;}

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
        await SpeciesRegistry.initialize?.();
        const speciesList = (SpeciesRegistry.getAll?.() || []).map(s => ({ id: s.id || s._id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name));
        if (speciesList.length === 0) {
            ui.notifications.error('Species registry not found! Cannot create follower.');
            return null;
        }

        const dialogData = {
            template,
            templateType,
            speciesList,
            owner,
            grantingTalent
        };

        const html = await renderTemplate('systems/foundryvtt-swse/templates/apps/follower-creator-dialog.html', dialogData);

        return new Promise((resolve) => {
            new SWSEDialogV2({
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
        const ownerHeroicLevel = getHeroicLevel(owner) || 1;
        const followerLevel = ownerHeroicLevel; // Followers are same HEROIC level as owner

        // Get species data
        const speciesDoc = await SpeciesRegistry.getDocumentByRef?.(followerData.species);

        // Calculate base abilities (all start at 10)
        const abilities = {
            str: { base: 10 },
            dex: { base: 10 },
            con: { base: 10 },
            int: { base: 10 },
            wis: { base: 10 },
            cha: { base: 10 }
        };

        // Apply follower template ability bonus. Current follower chargen lets
        // organic followers choose between the two legal template abilities.
        const templateAbilityOptions = { aggressive: ['str', 'con'], defensive: ['dex', 'wis'], utility: ['int', 'cha'] };
        const allowedTemplateAbilities = templateAbilityOptions[followerData.templateType] || [];
        const abilityKey = allowedTemplateAbilities.includes(followerData.abilityChoice)
            ? followerData.abilityChoice
            : allowedTemplateAbilities[0];
        if (abilityKey && template.abilityBonus && abilities[abilityKey]) {
            abilities[abilityKey].base += template.abilityBonus;
        }

        // Calculate defenses (10 + ability mod + owner heroic level) - FOLLOWER SPECIFIC
        const defenses = await this._calculateFollowerDefenses(abilities, ownerHeroicLevel, template);

        // Calculate HP (10 + owner heroic level + CON modifier) - FOLLOWER SPECIFIC
        const conMod = Math.floor((Number(abilities.con?.base || 10) - 10) / 2);
        const hp = {
            max: Math.max(1, 10 + ownerHeroicLevel + conMod),
            value: Math.max(1, 10 + ownerHeroicLevel + conMod)
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
            type: 'npc',
            system: {
                level: followerLevel,
                isFollower: true,
                followerType: template.name,
                race: speciesDoc?.name || '',
                // system.attributes is canonical ability storage. Keep the
                // legacy system.abilities mirror populated for old consumers,
                // but do not put non-ability fields under attributes.
                attributes: abilities,
                abilities: abilities,
                hp: hp,
                baseAttackBonus: bab,
                damageThreshold: 0, // Will be calculated on prepare
                progression: progressionData,
                npcProfile: {
                    kind: 'follower',
                    owner: {
                        actorId: owner.id,
                        talent: grantingTalent ? { id: grantingTalent.id, name: grantingTalent.name } : null
                    },
                    template: template.name
                }
            },
            flags: {
                swse: {
                    follower: {
                        ownerId: owner.id,
                        templateType: followerData.templateType,
                        grantingTalent: grantingTalent?.name || null
                    }
                },
                'foundryvtt-swse': {
                    npcLevelUp: {
                        mode: 'statblock'
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
        await ActorEngine.updateActor(follower, {
            'system.progression': progressionData
        }, { source: 'FollowerCreator.createFollower' });

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
        // PHASE 8: Use ActorEngine
        await ActorEngine.createEmbeddedDocuments(follower, 'Item', [speciesData]);

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
                await ActorEngine.updateActor(follower, {
                    [`system.attributes.${abilityChoice}.base`]: currentAbility + template.abilityBonus
                }, { source: 'FollowerCreator.applyHumanBonus' });
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
        await follower.setFlag('foundryvtt-swse', 'isDroid', true);
    }

    /**
     * Apply feats from template
     * @private
     * @returns {Array<string>} Names of applied feats
     */
    static async _applyTemplateFeats(follower, template, followerData) {
        const appliedFeats = [];

        // All standard followers get Weapon Proficiency (Simple Weapons).
        // Fixed-profile followers such as Akk Dogs can suppress this base humanoid grant.
        const fixedProfile = this._getFixedFollowerProfileFromChoices(followerData || {}, { persistentChoices: followerData || {} });
        if (fixedProfile?.suppressBaseFollowerFeat !== true) {
            const baseFeat = 'Weapon Proficiency (Simple Weapons)';
            if (await this._addFeatByName(follower, baseFeat)) {
                appliedFeats.push(baseFeat);
            }
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
    static async _addFeatByName(follower, featName, grantMetadata = null) {
        try {
            if (!follower || !featName) return false;
            const normalizedName = String(featName).trim();
            const hasFeat = Array.from(follower.items || []).some(item => item.type === 'feat' && item.name === normalizedName);
            if (hasFeat) return false;

            const featDoc = await FeatRegistry.getDocumentByName?.(normalizedName);
            if (featDoc) {
                const featData = featDoc.toObject();
                if (grantMetadata) {
                    featData.flags = {
                        ...(featData.flags || {}),
                        swse: {
                            ...(featData.flags?.swse || {}),
                            grantedByTalent: grantMetadata,
                            followerMaterializedGrant: true
                        }
                    };
                }
                await ActorEngine.createEmbeddedDocuments(follower, 'Item', [featData]);
                return true;
            }
            swseLogger.warn(`FollowerCreator: Feat not found: ${normalizedName}`);
            return false;
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
            await ActorEngine.updateActor(follower, {
                [`system.skills.${skillKey}.trained`]: true
            }, { source: 'FollowerCreator.trainSkill' });
            return true;
        }
        return false;
    }

    /**
     * Apply talent-specific bonuses
     * @private
     */
    static async _applyTalentBonuses(follower, grantingTalent) {
        const talentName = typeof grantingTalent === 'string' ? grantingTalent : grantingTalent?.name;
        const cfg = getFollowerTalentConfig(talentName);
        if (!cfg) return;

        const grantMetadata = {
            source: 'follower-granting-talent',
            talentName,
            talentItemId: typeof grantingTalent === 'object' ? grantingTalent?.id ?? null : null,
            grantedAt: Date.now()
        };

        for (const featName of cfg.additionalFeats || []) {
            await this._addFeatByName(follower, featName, grantMetadata);
        }

        for (const skillName of cfg.additionalSkills || []) {
            await this._trainSkill(follower, skillName);
        }
    }

    static _choiceArray(value) {
        if (Array.isArray(value)) return value.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
        if (value === null || value === undefined || value === '') return [];
        return [String(value).trim()].filter(Boolean);
    }

    static _uniqueList(values) {
        return Array.from(new Set((values || []).filter(Boolean).map(v => String(v).trim()).filter(Boolean)));
    }

    static _getGrantingTalentNameFromMutation(followerMutation = {}) {
        return followerMutation.grantingTalentName
            || followerMutation.slotTalentName
            || followerMutation.persistentChoices?.grantingTalentName
            || null;
    }

    static _getGrantingTalentItemIdFromMutation(followerMutation = {}) {
        return followerMutation.grantingTalentItemId
            || followerMutation.slotTalentItemId
            || followerMutation.persistentChoices?.grantingTalentItemId
            || null;
    }

    static _getGrantingTalentTreeIdFromMutation(followerMutation = {}) {
        return followerMutation.talentTreeId
            || followerMutation.slotTalentTreeId
            || followerMutation.grantingTalentTreeId
            || followerMutation.persistentChoices?.talentTreeId
            || followerMutation.persistentChoices?.slotTalentTreeId
            || followerMutation.persistentChoices?.grantingTalentTreeId
            || null;
    }

    static _clonePlain(value) {
        if (value === null || value === undefined) return value;
        try {
            return structuredClone(value);
        } catch (_err) {
            try {
                return JSON.parse(JSON.stringify(value));
            } catch (_jsonErr) {
                return value;
            }
        }
    }

    static _getFollowerGrantConfig(followerMutation = {}, persistentChoices = {}) {
        const grantingTalentName = this._getGrantingTalentNameFromMutation(followerMutation)
            || persistentChoices?.grantingTalentName
            || null;
        if (!grantingTalentName) return null;
        const treeId = this._getGrantingTalentTreeIdFromMutation(followerMutation)
            || persistentChoices?.slotTalentTreeId
            || persistentChoices?.talentTreeId
            || persistentChoices?.grantingTalentTreeId
            || null;
        return getFollowerTalentConfig(grantingTalentName, { treeId })
            || getFollowerTalentConfig(grantingTalentName, persistentChoices)
            || null;
    }

    static _getFixedFollowerProfileFromChoices(persistentChoices = {}, followerMutation = {}) {
        const profile = persistentChoices?.fixedFollowerProfile
            || followerMutation?.followerState?.fixedFollowerProfile
            || followerMutation?.fixedFollowerProfile
            || this._getFollowerGrantConfig(followerMutation, persistentChoices)?.fixedFollowerProfile
            || null;
        return profile && typeof profile === 'object' ? profile : null;
    }

    static _usesNoStartingCredits(persistentChoices = {}, followerMutation = {}) {
        const profile = this._getFixedFollowerProfileFromChoices(persistentChoices, followerMutation);
        const cfg = this._getFollowerGrantConfig(followerMutation, persistentChoices);
        return profile?.noStartingCredits === true || cfg?.noStartingCredits === true;
    }

    static _resolveProfileAbilityModifier(follower, profile = null, abilityKey = 'str') {
        const key = String(abilityKey || 'str').toLowerCase().slice(0, 3);
        const ability = follower?.system?.attributes?.[key] || follower?.system?.abilities?.[key] || null;
        const score = Number(
            ability?.base
            ?? ability?.score
            ?? ability?.value
            ?? profile?.abilityScores?.[key]
            ?? 10
        );
        return Math.floor(((Number.isFinite(score) ? score : 10) - 10) / 2);
    }

    static _buildNaturalWeaponItemData(weapon = {}, profile = null, follower = null, grantMetadata = null) {
        const attackAbility = String(weapon.attackAttribute || weapon.ability || 'str').toLowerCase().slice(0, 3);
        const damageDice = String(weapon.damage || weapon.damageDice || '1d6').trim() || '1d6';
        const damageMod = this._resolveProfileAbilityModifier(follower, profile, weapon.damageAbility || attackAbility);
        const damageFormula = `${damageDice}${damageMod >= 0 ? '+' : ''}${damageMod}`;
        const profileId = profile?.id || null;
        const description = String(weapon.description || 'Natural weapon attack granted by follower template.');

        return {
            name: String(weapon.name || 'Natural Weapons'),
            type: 'weapon',
            img: weapon.img || 'icons/creatures/claws/claw-bear-paw-swipe-brown.webp',
            system: {
                damage: damageFormula,
                damageBonus: `${damageMod >= 0 ? '+' : ''}${damageMod}`,
                damageType: String(weapon.damageType || 'slashing').toLowerCase(),
                attackBonus: Number(weapon.attackBonus || 0),
                attackAttribute: attackAbility,
                range: weapon.range || 'melee',
                meleeOrRanged: 'melee',
                ranged: false,
                weight: Number(weapon.weight || 0),
                cost: Number(weapon.cost || 0),
                equipped: true,
                proficient: true,
                description: description.startsWith('<') ? description : `<p>${description}</p>`,
                properties: this._uniqueList([...this._choiceArray(weapon.properties), 'Natural']),
                weaponProperties: { isLight: false, isTwoHanded: false },
                ammunition: { type: 'none', current: 0, max: 0 },
                weaponCategory: weapon.weaponCategory || 'natural',
                proficiency: weapon.proficiency || 'natural',
                subcategory: weapon.subcategory || 'natural',
                specialEffects: weapon.specialEffects || '',
                rangeProfile: weapon.rangeProfile || 'melee',
                combat: {
                    attack: { ability: attackAbility, bonus: Number(weapon.attackBonus || 0) },
                    damage: {
                        dice: damageDice,
                        bonus: damageMod,
                        formula: damageFormula,
                        type: String(weapon.damageType || 'slashing').toLowerCase(),
                        ability: String(weapon.damageAbility || attackAbility).toLowerCase().slice(0, 3)
                    }
                }
            },
            flags: {
                swse: {
                    followerNaturalWeapon: true,
                    sourceFixedFollowerProfile: profileId,
                    grantedByTalent: grantMetadata || null
                }
            }
        };
    }

    static async _upsertFixedProfileNaturalWeapons(follower, profile = null, grantMetadata = null) {
        const weapons = Array.isArray(profile?.naturalWeapons) ? profile.naturalWeapons : [];
        if (!follower || !weapons.length) return [];

        const applied = [];
        for (const weapon of weapons) {
            const itemData = this._buildNaturalWeaponItemData(weapon, profile, follower, grantMetadata);
            const existing = Array.from(follower.items || []).find(item => item?.type === 'weapon' && (
                item.flags?.swse?.followerNaturalWeapon === true
                || item.flags?.swse?.sourceFixedFollowerProfile === profile?.id
                || item.name === itemData.name
            ));

            try {
                if (existing?.id) {
                    await ActorEngine.updateEmbeddedDocuments(follower, 'Item', [{ _id: existing.id, ...itemData }], {
                        source: 'FollowerCreator.upsertNaturalWeapon'
                    });
                } else {
                    await ActorEngine.createEmbeddedDocuments(follower, 'Item', [itemData], {
                        source: 'FollowerCreator.upsertNaturalWeapon'
                    });
                }
                applied.push(itemData.name);
            } catch (err) {
                swseLogger.warn('[FollowerCreator] Failed to apply fixed-profile natural weapon:', err);
            }
        }
        return applied;
    }

    static _applyFixedProfileActorUpdates(materialUpdates, profile = null) {
        if (!profile) return;
        materialUpdates['system.race'] = profile.speciesName || materialUpdates['system.race'];
        materialUpdates['system.size'] = profile.size || materialUpdates['system.size'];
        if (profile.speed !== undefined && profile.speed !== null) materialUpdates['system.speed'] = Number(profile.speed);
        if (profile.movement) materialUpdates['system.movement'] = this._clonePlain(profile.movement);
        materialUpdates['system.npcProfile.creatureKind'] = profile.creatureKind || null;
        materialUpdates['system.npcProfile.speciesType'] = profile.speciesType || null;
        materialUpdates['system.npcProfile.fixedProfileId'] = profile.id || null;
        materialUpdates['system.npcProfile.traitNotes'] = Array.isArray(profile.ruleNotes) ? Array.from(profile.ruleNotes) : [];
        materialUpdates['system.progression.fixedFollowerProfile'] = this._clonePlain(profile);
        materialUpdates['system.progression.creatureKind'] = profile.creatureKind || null;
        materialUpdates['system.progression.naturalWeapons'] = this._clonePlain(profile.naturalWeapons || []);
        materialUpdates['system.progression.skillPenalties'] = this._clonePlain(profile.skillPenalties || {});
        materialUpdates['system.progression.ruleNotes'] = Array.isArray(profile.ruleNotes) ? Array.from(profile.ruleNotes) : [];
        materialUpdates['system.progression.carryCapacityMultiplier'] = profile.carryCapacityMultiplier ?? null;
        materialUpdates['flags.swse.follower.fixedFollowerProfileId'] = profile.id || null;
        materialUpdates['flags.swse.follower.fixedSpeciesName'] = profile.speciesName || null;
        materialUpdates['flags.swse.follower.creatureKind'] = profile.creatureKind || null;
        materialUpdates['flags.swse.follower.noStartingCredits'] = profile.noStartingCredits === true;
        materialUpdates['flags.swse.fixedFollowerProfile'] = this._clonePlain(profile);
    }

    static _resolveFollowerName(owner, templateType, persistentChoices = {}) {
        const explicitName = String(persistentChoices?.followerName || '').trim();
        if (explicitName) return explicitName.replace(/\s+/g, ' ');

        const ownerName = String(owner?.name || 'Owner').trim().replace(/\s+/g, ' ') || 'Owner';
        const templateKey = String(templateType || 'follower').trim().toLowerCase();
        const templateLabels = {
            aggressive: 'Aggressive Follower',
            defensive: 'Defensive Follower',
            utility: 'Utility Follower'
        };
        const fallbackTemplateLabel = templateKey
            ? `${templateKey.charAt(0).toUpperCase()}${templateKey.slice(1)} Follower`
            : 'Follower';
        return `${ownerName}'s ${templateLabels[templateKey] || fallbackTemplateLabel}`;
    }

    static async _applyFollowerProgressionMaterial(owner, follower, templateType, persistentChoices = {}, followerMutation = {}) {
        if (!follower || !templateType) return { feats: [], trainedSkills: [], languages: [] };

        const templates = await this.getFollowerTemplates();
        const template = templates[templateType] || {};
        const grantingTalentName = this._getGrantingTalentNameFromMutation(followerMutation);
        const grantingTalentItemId = this._getGrantingTalentItemIdFromMutation(followerMutation);
        const grantingTalentConfig = this._getFollowerGrantConfig(followerMutation, persistentChoices);
        const fixedProfile = this._getFixedFollowerProfileFromChoices(persistentChoices, followerMutation);
        const noStartingCredits = this._usesNoStartingCredits(persistentChoices, followerMutation);
        const skipLanguages = fixedProfile?.skipLanguages === true || grantingTalentConfig?.skipLanguages === true;
        const skipBackground = fixedProfile?.skipBackground === true || grantingTalentConfig?.skipBackground === true;
        const suppressBaseFollowerFeat = fixedProfile?.suppressBaseFollowerFeat === true || grantingTalentConfig?.suppressBaseFollowerFeat === true;
        const grantMetadata = grantingTalentName ? {
            source: 'follower-granting-talent',
            ownerId: owner?.id ?? null,
            ownerName: owner?.name ?? null,
            talentName: grantingTalentName,
            talentItemId: grantingTalentItemId,
            grantedAt: Date.now()
        } : null;

        const humanBonus = persistentChoices.humanTemplateBonus || null;
        const humanBonusFeat = humanBonus?.bonusType === 'feat' ? humanBonus.value : null;
        const humanBonusSkill = humanBonus?.bonusType === 'skill' ? humanBonus.value : null;

        const featChoices = this._choiceArray(persistentChoices.featChoices)
            .concat(this._choiceArray(persistentChoices.featChoice))
            .concat(this._choiceArray(persistentChoices.armorProficiencyChoice))
            .concat(this._choiceArray(persistentChoices.armorFeatChoice))
            .concat(this._choiceArray(persistentChoices.armorChoice))
            .concat(this._choiceArray(humanBonusFeat));

        const featsToApply = this._uniqueList([
            ...(suppressBaseFollowerFeat ? [] : ['Weapon Proficiency (Simple Weapons)']),
            ...(template.feats || []),
            ...featChoices,
            ...(grantingTalentConfig?.additionalFeats || [])
        ]);

        const appliedFeats = [];
        for (const featName of featsToApply) {
            const added = await this._addFeatByName(follower, featName, grantMetadata);
            if (added || Array.from(follower.items || []).some(item => item.type === 'feat' && item.name === featName)) {
                appliedFeats.push(featName);
            }
        }

        const skillChoices = this._choiceArray(persistentChoices.skillChoices)
            .concat(this._choiceArray(persistentChoices.skillChoice))
            .concat(this._choiceArray(humanBonusSkill));
        const skillsToTrain = this._uniqueList([
            ...(template.trainedSkills || []),
            ...skillChoices,
            ...(grantingTalentConfig?.additionalSkills || [])
        ]);

        const trainedSkills = [];
        for (const skillRef of skillsToTrain) {
            const trained = await this._trainSkill(follower, skillRef);
            if (trained) {
                trainedSkills.push(await resolveSkillName(skillRef) || skillRef);
            }
        }

        const languageChoices = skipLanguages ? [] : this._uniqueList(persistentChoices.languageChoices || []);
        if (languageChoices.length) {
            const existingLanguages = Array.isArray(follower.system?.languages) ? follower.system.languages : [];
            await ActorEngine.updateActor(follower, {
                'system.languages': this._uniqueList([...existingLanguages, ...languageChoices])
            }, { source: 'FollowerCreator.materializeFollowerLanguages' });
        }

        const backgroundChoice = skipBackground ? null : (
            persistentChoices.backgroundSelection?.name
            || persistentChoices.backgroundSelection?.id
            || persistentChoices.backgroundChoice
            || null
        );

        const materialUpdates = {
            'system.progression.feats': appliedFeats,
            'system.progression.trainedSkills': trainedSkills,
            'system.progression.languages': languageChoices,
            'system.progression.background': backgroundChoice,
            'system.background': backgroundChoice,
            'system.progression.grantingTalentName': grantingTalentName,
            'system.progression.humanTemplateBonus': humanBonus,
            'system.progression.droidConfig': persistentChoices.droidConfig || null,
            'system.npcProfile.owner.talent': grantingTalentName ? { id: grantingTalentItemId, name: grantingTalentName } : follower.system?.npcProfile?.owner?.talent ?? null,
            'flags.swse.follower.grantingTalent': grantingTalentName,
            'flags.swse.follower.grantingTalentItemId': grantingTalentItemId
        };

        this._applyFixedProfileActorUpdates(materialUpdates, fixedProfile);

        if (persistentChoices.droidConfig?.isDroid) {
            const droidConfig = persistentChoices.droidConfig;
            const droidSystems = this._resolveFollowerDroidSystems(droidConfig);
            const droidCredits = this._resolveFollowerDroidCredits(persistentChoices, droidConfig);
            materialUpdates['system.isDroid'] = true;
            materialUpdates['system.noConstitution'] = true;
            materialUpdates['system.droidSize'] = droidConfig.size || 'medium';
            materialUpdates['system.size'] = droidConfig.size || 'medium';
            materialUpdates['system.speed'] = droidConfig.speed || 6;
            materialUpdates['system.movement.walk'] = droidConfig.speed || 6;
            materialUpdates['system.droidSystems'] = droidSystems;
            materialUpdates['system.droidCredits'] = droidCredits;
            materialUpdates['system.progression.droidConfig.droidSystems'] = droidSystems;
            materialUpdates['system.progression.droidConfig.droidCredits'] = droidCredits;
            materialUpdates['system.progression.droidConfig.spentCredits'] = droidCredits.spent;
            materialUpdates['system.progression.droidConfig.lostCredits'] = droidCredits.lost;
            materialUpdates['system.credits'] = 0;
            materialUpdates['flags.foundryvtt-swse.isDroid'] = true;
        } else if (noStartingCredits) {
            materialUpdates['system.credits'] = 0;
            materialUpdates['system.progression.startingCredits'] = 0;
            materialUpdates['system.progression.startingCreditMode'] = 'none';
        } else if (persistentChoices.startingCredits !== undefined && persistentChoices.startingCredits !== null) {
            materialUpdates['system.credits'] = Number(persistentChoices.startingCredits || 0);
        }

        await ActorEngine.updateActor(follower, materialUpdates, { source: 'FollowerCreator.materializeFollowerProgression' });
        const naturalWeapons = await this._upsertFixedProfileNaturalWeapons(follower, fixedProfile, grantMetadata);

        return { feats: appliedFeats, trainedSkills, languages: languageChoices, naturalWeapons };
    }

    /**
     * Apply defense bonuses from template
     * @private
     */
    static async _applyDefenseBonuses(follower, template) {
        if (!template.defenseBonus) {return;}

        // Defense bonuses are now applied via ModifierEngine
        // Remove direct defense mutations - let DerivedCalculator handle recalculation
    }

    /**
     * Link follower to owner
     * @private
     */
    static async _linkFollowerToOwner(owner, follower, grantingTalent) {
        // Add/update follower link on the owner's canonical follower flag.
        const currentFollowers = owner.getFlag('foundryvtt-swse', 'followers') || [];
        const followerLink = {
            id: follower.id,
            name: follower.name,
            type: follower.type,
            img: follower.img,
            talent: grantingTalent?.name || follower.system?.npcProfile?.owner?.talent || null,
            templateType: follower.system?.progression?.followerTemplate || follower.flags?.swse?.follower?.templateType || null
        };
        const nextFollowers = currentFollowers.filter(entry => entry.id !== follower.id);
        nextFollowers.push(followerLink);
        await owner.setFlag('foundryvtt-swse', 'followers', nextFollowers);

        // Keep the general ownedActors display list in sync for sheet relationship panels.
        const ownedActors = Array.isArray(owner.system?.ownedActors) ? owner.system.ownedActors.filter(entry => entry.id !== follower.id) : [];
        ownedActors.push(followerLink);
        await ActorEngine.updateActor(owner, { 'system.ownedActors': ownedActors }, { source: 'FollowerCreator.linkFollowerToOwner.ownedActors' });

        // Set ownership permissions to match owner
        const ownerUser = game.users.find(u => u.character?.id === owner.id);
        if (ownerUser) {
            await ActorEngine.updateActor(follower, {
                ownership: {
                    [ownerUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
                }
            }, { source: 'FollowerCreator.linkFollowerToOwner' });
        }

        try {
            const { FollowerManager } = await import("/systems/foundryvtt-swse/scripts/apps/follower-manager.js");
            await FollowerManager.applyExistingEnhancementsToFollower(owner, follower, { silent: true });
        } catch (err) {
            swseLogger.warn('[FollowerCreator] Could not apply owner follower enhancements:', err);
        }
    }

    /**
     * Get all followers for an actor
     * @param {Actor} actor - The owner actor
     * @returns {Array<Actor>} Array of follower actors
     */
    static getFollowers(actor) {
        if (!actor) return [];
        const ids = new Set();

        for (const entry of actor.getFlag('foundryvtt-swse', 'followers') || []) {
            if (entry?.id) ids.add(entry.id);
        }
        for (const slot of actor.getFlag('foundryvtt-swse', 'followerSlots') || []) {
            if (slot?.createdActorId) ids.add(slot.createdActorId);
        }
        for (const entry of actor.system?.ownedActors || []) {
            const kind = entry?.kind || entry?.dependentKind || entry?.npcKind;
            if (kind && kind !== 'follower') continue;
            if (entry?.id) ids.add(entry.id);
        }

        if (game?.actors) {
            for (const candidate of game.actors) {
                const kind = candidate?.system?.npcProfile?.kind || candidate?.flags?.swse?.follower?.kind || null;
                if (kind && kind !== 'follower') continue;
                const ownerId = candidate?.flags?.swse?.follower?.ownerId || candidate?.system?.npcProfile?.owner?.actorId;
                const isFollower = candidate?.system?.isFollower === true
                    || candidate?.system?.progression?.isFollower === true
                    || candidate?.flags?.swse?.follower?.isFollower === true
                    || candidate?.getFlag?.('foundryvtt-swse', 'isFollower') === true;
                if (ownerId === actor.id && isFollower) ids.add(candidate.id);
            }
        }

        return Array.from(ids)
            .map(id => game.actors.get(id))
            .filter(Boolean)
            .filter(follower => follower.getFlag?.('foundryvtt-swse', 'dismissedAlly') !== true && follower.flags?.swse?.follower?.active !== false);
    }

    /**
     * Remove a follower
     * @param {Actor} owner - The owner actor
     * @param {Actor} follower - The follower to remove
     */
    static async removeFollower(owner, follower) {
        const currentFollowers = owner.getFlag('foundryvtt-swse', 'followers') || [];
        const updatedFollowers = currentFollowers.filter(f => f.id !== follower.id);

        await owner.setFlag('foundryvtt-swse', 'followers', updatedFollowers);

        // Optionally delete the follower actor
        const shouldDelete = await SWSEDialogV2.confirm({
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
     * Normalize the shared droid-builder payload for follower actor writes.
     * Droid followers use the normal DroidBuilderStep state shape, not a
     * follower-only optional-system list.  These helpers preserve that payload
     * while still filling the older baseSystems/optionalSystems compatibility
     * fields consumed by existing sheet/deriver code.
     * @private
     */
    static _resolveFollowerDroidSystems(droidConfig = {}) {
        const systems = droidConfig.droidSystems && typeof droidConfig.droidSystems === 'object'
            ? structuredClone(droidConfig.droidSystems)
            : null;

        const baseSystems = Array.isArray(droidConfig.baseSystems) ? structuredClone(droidConfig.baseSystems) : [];
        const optionalSystems = Array.isArray(droidConfig.optionalSystems) ? structuredClone(droidConfig.optionalSystems) : [];
        const allowedOptionalCategories = Array.isArray(droidConfig.allowedOptionalCategories)
            ? Array.from(droidConfig.allowedOptionalCategories)
            : [];

        if (systems) {
            systems.baseSystems = Array.isArray(systems.baseSystems) ? systems.baseSystems : baseSystems;
            systems.optionalSystems = Array.isArray(systems.optionalSystems) ? systems.optionalSystems : optionalSystems;
            systems.allowedOptionalCategories = Array.isArray(systems.allowedOptionalCategories)
                ? systems.allowedOptionalCategories
                : allowedOptionalCategories;
            return systems;
        }

        return { baseSystems, optionalSystems, allowedOptionalCategories };
    }

    /** @private */
    static _resolveFollowerDroidCredits(persistentChoices = {}, droidConfig = {}) {
        const builderCredits = droidConfig.droidCredits && typeof droidConfig.droidCredits === 'object'
            ? structuredClone(droidConfig.droidCredits)
            : {};
        const base = Number(
            builderCredits.base
            ?? builderCredits.budget
            ?? persistentChoices.startingCredits
            ?? 0
        );
        const spent = Number(builderCredits.spent ?? droidConfig.spentCredits ?? 0);
        const remaining = Number.isFinite(Number(builderCredits.remaining))
            ? Number(builderCredits.remaining)
            : Math.max(0, base - spent);
        const lost = Number(builderCredits.lost ?? droidConfig.lostCredits ?? Math.max(0, base - spent));

        return {
            ...builderCredits,
            base,
            budget: Number(builderCredits.budget ?? base),
            spent,
            remaining,
            lost,
            unspentCreditsLost: true,
            allowOverflow: false
        };
    }

    /**
     * Create a follower from a mutation bundle (from the progression spine).
     * Phase 3: Called by FollowerShell after progression completes.
     *
     * @param {Actor} owner - The owner actor
     * @param {Object} followerMutation - Mutation bundle from FollowerSubtypeAdapter
     * @returns {Promise<Actor|null>} Created follower actor or null on error
     */
    static async createFollowerFromMutation(owner, followerMutation) {
        let follower = null;
        try {
            const {
                speciesName,
                templateType,
                persistentChoices,
                followerState,
                targetHeroicLevel
            } = followerMutation;
            const grantingTalentName = this._getGrantingTalentNameFromMutation(followerMutation);
            const grantingTalentItemId = this._getGrantingTalentItemIdFromMutation(followerMutation);
            const fixedProfile = this._getFixedFollowerProfileFromChoices(persistentChoices, followerMutation);
            const noStartingCredits = this._usesNoStartingCredits(persistentChoices, followerMutation);
            const resolvedSpeciesName = fixedProfile?.speciesName || speciesName;
            const droidConfig = persistentChoices?.droidConfig?.isDroid ? persistentChoices.droidConfig : null;
            const isDroidFollower = !!droidConfig;
            const droidSystems = isDroidFollower ? this._resolveFollowerDroidSystems(droidConfig) : undefined;
            const droidCredits = isDroidFollower ? this._resolveFollowerDroidCredits(persistentChoices, droidConfig) : undefined;
            const followerName = this._resolveFollowerName(owner, templateType, persistentChoices);

            // Create actor from derived state
            const actorData = {
                name: followerName,
                type: 'npc',
                system: {
                    level: targetHeroicLevel ?? followerState.level,
                    race: resolvedSpeciesName,
                    isFollower: true,
                    isDroid: isDroidFollower,
                    noConstitution: isDroidFollower,
                    droidSize: droidConfig?.size || null,
                    size: droidConfig?.size || fixedProfile?.size || followerState.size || undefined,
                    speed: droidConfig?.speed || fixedProfile?.speed || followerState.speed || undefined,
                    movement: isDroidFollower ? { walk: droidConfig?.speed || 6 } : (fixedProfile?.movement || followerState.movement || undefined),
                    attributes: followerState.abilities,
                    abilities: followerState.abilities,
                    hp: followerState.hp,
                    credits: (isDroidFollower || noStartingCredits) ? 0 : Number(persistentChoices?.startingCredits || 0),
                    droidSystems,
                    droidCredits,
                    baseAttackBonus: followerState.baseAttackBonus ?? followerState.bab,
                    progression: {
                        followerChoices: persistentChoices,
                        followerTemplate: templateType,
                        followerName,
                        fixedFollowerProfile: fixedProfile ? this._clonePlain(fixedProfile) : null,
                        creatureKind: fixedProfile?.creatureKind || null,
                        noStartingCredits,
                        isFollower: true
                    },
                    npcProfile: {
                        kind: 'follower',
                        creatureKind: fixedProfile?.creatureKind || null,
                        speciesType: fixedProfile?.speciesType || null,
                        fixedProfileId: fixedProfile?.id || null,
                        traitNotes: Array.isArray(fixedProfile?.ruleNotes) ? Array.from(fixedProfile.ruleNotes) : [],
                        owner: {
                            actorId: owner.id,
                            talent: grantingTalentName ? { id: grantingTalentItemId, name: grantingTalentName } : null
                        },
                        template: templateType,
                        displayName: followerName
                    }
                },
                flags: {
                    swse: {
                        follower: {
                            ownerId: owner.id,
                            templateType: templateType,
                            followerName,
                            grantingTalent: grantingTalentName,
                            grantingTalentItemId,
                            isFollower: true,
                            fixedFollowerProfileId: fixedProfile?.id || null,
                            fixedSpeciesName: fixedProfile?.speciesName || null,
                            creatureKind: fixedProfile?.creatureKind || null,
                            noStartingCredits
                        }
                    },
                    'foundryvtt-swse': {
                        isFollower: true,
                        isDroid: isDroidFollower,
                        fixedFollowerProfile: fixedProfile ? this._clonePlain(fixedProfile) : null,
                        npcLevelUp: {
                            mode: 'statblock'
                        }
                    }
                }
            };

            // Create the actor
            follower = await createActor(actorData);
            if (!follower) {
                swseLogger.error('[FollowerCreator] Failed to create follower actor from mutation');
                return null;
            }

            // Apply species (if needed)
            if (speciesName && !fixedProfile?.noSpeciesSelection) {
                try {
                    const speciesDoc = await SpeciesRegistry.getDocumentByRef?.(speciesName);
                    if (speciesDoc) {
                        await ActorEngine.createEmbeddedDocuments(follower, 'Item', [speciesDoc.toObject()]);
                    }
                } catch (err) {
                    swseLogger.warn('[FollowerCreator] Could not apply species:', err);
                    // Non-fatal — continue even if species application fails
                }
            }

            // Materialize template/granting-talent feats, trained skills, and languages.
            await this._applyFollowerProgressionMaterial(owner, follower, templateType, persistentChoices, followerMutation);

            // Apply defenses from derived state
            if (followerState.defenses) {
                const defenseUpdates = {};
                const defenseKeyMap = { fort: 'fortitude', fortitude: 'fortitude', ref: 'reflex', reflex: 'reflex', will: 'will' };
                for (const [defType, defData] of Object.entries(followerState.defenses)) {
                    const defenseKey = defenseKeyMap[defType] || defType;
                    defenseUpdates[`system.defenses.${defenseKey}.total`] = defData.total;
                }
                await ActorEngine.updateActor(follower, defenseUpdates, { source: 'FollowerCreator.createFromMutation.defenses' });
            }

            // Link to owner
            await this._linkFollowerToOwner(owner, follower, null);

            swseLogger.log('[FollowerCreator] Follower created from mutation:', {
                followerId: follower.id,
                ownerId: owner.id,
                templateType: templateType,
                level: targetHeroicLevel ?? followerState.level
            });

            return follower;
        } catch (err) {
            swseLogger.error('[FollowerCreator] Error creating follower from mutation:', err);
            if (follower?.id) {
                const partialFollowerId = follower.id;
                try {
                    await follower.delete();
                    swseLogger.warn('[FollowerCreator] Rolled back partially created follower after failed mutation apply', {
                        followerId: partialFollowerId,
                        ownerId: owner?.id ?? null
                    });
                } catch (cleanupErr) {
                    swseLogger.warn('[FollowerCreator] Failed to delete partially created follower after mutation error:', cleanupErr);
                }
            }
            return null;
        }
    }

    /**
     * Update an existing follower from a mutation bundle (for level advancement).
     * Phase 3: Called by FollowerShell after progression completes.
     *
     * @param {Actor} follower - The existing follower actor
     * @param {Object} followerMutation - Mutation bundle from FollowerSubtypeAdapter
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    static async updateFollowerFromMutation(follower, followerMutation) {
        try {
            const {
                speciesName,
                templateType,
                persistentChoices,
                followerState,
                targetHeroicLevel
            } = followerMutation;

            const fixedProfile = this._getFixedFollowerProfileFromChoices(persistentChoices, followerMutation);
            const noStartingCredits = this._usesNoStartingCredits(persistentChoices, followerMutation);
            const resolvedSpeciesName = fixedProfile?.speciesName || speciesName;

            // Update follower state with canonical paths and explicit dot paths.
            // system.attributes is canonical ability storage (system.abilities is a read-only mirror).
            // system.hp.max requires isRecomputeHPCall; split object to avoid broad replacement.
            const updateData = {
                'system.level': targetHeroicLevel,
                'system.attributes': followerState.abilities,
                'system.hp.max': followerState.hp?.max,
                'system.hp.value': followerState.hp?.value,
                'system.isFollower': true,
                'system.race': resolvedSpeciesName,
                'system.baseAttackBonus': followerState.baseAttackBonus ?? followerState.bab,
                'system.progression.followerChoices': persistentChoices,
                'system.progression.followerTemplate': templateType,
                'system.progression.isFollower': true,
                'system.progression.fixedFollowerProfile': fixedProfile ? this._clonePlain(fixedProfile) : null,
                'system.progression.creatureKind': fixedProfile?.creatureKind || null,
                'system.progression.noStartingCredits': noStartingCredits,
                'system.npcProfile.creatureKind': fixedProfile?.creatureKind || null,
                'system.npcProfile.speciesType': fixedProfile?.speciesType || null,
                'system.npcProfile.fixedProfileId': fixedProfile?.id || null,
                'system.npcProfile.traitNotes': Array.isArray(fixedProfile?.ruleNotes) ? Array.from(fixedProfile.ruleNotes) : [],
                ...(String(persistentChoices?.followerName || '').trim() ? {
                    name: String(persistentChoices.followerName).trim(),
                    'system.progression.followerName': String(persistentChoices.followerName).trim(),
                    'system.npcProfile.displayName': String(persistentChoices.followerName).trim(),
                    'flags.swse.follower.followerName': String(persistentChoices.followerName).trim()
                } : {}),
                'flags.swse.follower.ownerId': follower.flags?.swse?.follower?.ownerId || followerMutation.ownerActorId,
                'flags.swse.follower.templateType': templateType,
                'flags.swse.follower.isFollower': true,
                'flags.swse.follower.fixedFollowerProfileId': fixedProfile?.id || null,
                'flags.swse.follower.fixedSpeciesName': fixedProfile?.speciesName || null,
                'flags.swse.follower.creatureKind': fixedProfile?.creatureKind || null,
                'flags.swse.follower.noStartingCredits': noStartingCredits,
                'flags.swse.fixedFollowerProfile': fixedProfile ? this._clonePlain(fixedProfile) : null,
                'flags.foundryvtt-swse.isFollower': true,
                'flags.foundryvtt-swse.fixedFollowerProfile': fixedProfile ? this._clonePlain(fixedProfile) : null
            };
            // Remove undefined hp fields to avoid writing null into schema
            if (updateData['system.hp.max'] === undefined) delete updateData['system.hp.max'];
            if (updateData['system.hp.value'] === undefined) delete updateData['system.hp.value'];

            if (persistentChoices?.droidConfig?.isDroid) {
                const droidConfig = persistentChoices.droidConfig;
                const droidSystems = this._resolveFollowerDroidSystems(droidConfig);
                const droidCredits = this._resolveFollowerDroidCredits(persistentChoices, droidConfig);
                updateData['system.isDroid'] = true;
                updateData['system.noConstitution'] = true;
                updateData['system.droidSize'] = droidConfig.size || 'medium';
                updateData['system.size'] = droidConfig.size || 'medium';
                updateData['system.speed'] = droidConfig.speed || 6;
                updateData['system.movement.walk'] = droidConfig.speed || 6;
                updateData['system.droidSystems'] = droidSystems;
                updateData['system.droidCredits'] = droidCredits;
                updateData['system.progression.droidConfig'] = {
                    ...droidConfig,
                    droidSystems,
                    droidCredits,
                    spentCredits: droidCredits.spent,
                    lostCredits: droidCredits.lost
                };
                updateData['system.credits'] = 0;
                updateData['flags.foundryvtt-swse.isDroid'] = true;
            } else {
                if (fixedProfile?.size || followerState.size) updateData['system.size'] = fixedProfile?.size || followerState.size;
                if (fixedProfile?.speed || followerState.speed) updateData['system.speed'] = Number(fixedProfile?.speed || followerState.speed);
                if (fixedProfile?.movement || followerState.movement) updateData['system.movement'] = this._clonePlain(fixedProfile?.movement || followerState.movement);
                if (noStartingCredits) updateData['system.credits'] = 0;
            }

            // Apply defense updates
            if (followerState.defenses) {
                const defenseKeyMap = { fort: 'fortitude', fortitude: 'fortitude', ref: 'reflex', reflex: 'reflex', will: 'will' };
                for (const [defType, defData] of Object.entries(followerState.defenses)) {
                    const defenseKey = defenseKeyMap[defType] || defType;
                    updateData[`system.defenses.${defenseKey}.total`] = defData.total;
                }
            }

            await ActorEngine.updateActor(follower, updateData, {
                source: 'FollowerCreator.updateFromMutation.progression',
                isRecomputeHPCall: true
            });

            const owner = game.actors.get(followerMutation.ownerActorId || follower.flags?.swse?.follower?.ownerId);
            await this._applyFollowerProgressionMaterial(owner, follower, templateType, persistentChoices, followerMutation);

            swseLogger.log('[FollowerCreator] Follower updated from mutation:', {
                followerId: follower.id,
                templateType: templateType,
                level: targetHeroicLevel ?? followerState.level
            });

            return true;
        } catch (err) {
            swseLogger.error('[FollowerCreator] Error updating follower from mutation:', err);
            return false;
        }
    }

    /**
     * Update follower when owner levels up
     * Called from level-up hooks to sync follower stats
     * @param {Actor} owner - The owner actor
     */
    static async updateFollowerForOwnerLevel(owner, follower) {
        if (!owner || !follower) return false;
        if (follower.getFlag?.('foundryvtt-swse', 'dismissedAlly') === true || follower.flags?.swse?.follower?.active === false) return false;

        const { deriveFollowerStateForApply } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-deriver.js');
        const ownerLevel = getHeroicLevel(owner) || 1;
        const isFollower = follower.system?.isFollower === true
            || follower.system?.progression?.isFollower === true
            || follower.flags?.swse?.follower?.isFollower === true
            || follower.getFlag?.('foundryvtt-swse', 'isFollower') === true;
        if (!isFollower) return false;

        const templateType = follower.system?.progression?.followerTemplate || follower.flags?.swse?.follower?.templateType;
        const speciesName = follower.system?.race || follower.system?.species?.name || follower.name;
        const persistentChoices = follower.system?.progression?.followerChoices || {};
        const followerState = await deriveFollowerStateForApply(ownerLevel, speciesName, templateType, persistentChoices);
        await this.updateFollowerFromMutation(follower, {
            ownerActorId: owner.id,
            speciesName,
            templateType,
            persistentChoices,
            followerState,
            targetHeroicLevel: ownerLevel
        });
        swseLogger.log(`FollowerCreator: Updated follower "${follower.name}" to owner heroic level ${ownerLevel}`);
        return true;
    }

    static async updateFollowersForLevelUp(owner) {
        const followers = this.getFollowers(owner);
        for (const follower of followers) {
            try {
                await this.updateFollowerForOwnerLevel(owner, follower);
            } catch (err) {
                swseLogger.warn(`FollowerCreator: Could not update follower "${follower.name}" for level-up:`, err);
            }
        }
    }
}

// Register hook to update followers when owner levels up
Hooks.on('swse:progression:completed', async (data) => {
    if (data.mode === 'levelup' && data.actor) {
        await FollowerCreator.updateFollowersForLevelUp(data.actor);
    }
});

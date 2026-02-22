import { FollowerCreator } from './follower-creator.js';
import { ActorEngine } from '../governance/actor-engine/actor-engine.js';

/**
 * Follower Manager - Handles follower enhancements and bonuses
 */
export class FollowerManager {

    /**
     * Enhancement talent configurations
     */
    static ENHANCEMENT_TALENTS = {
        'Close-Combat Assault': {
            prerequisite: 'Reconnaissance Team Leader',
            benefit: 'point-blank-shot',
            description: 'Each of your followers gains the Point-Blank Shot feat.'
        },
        'Get Into Position': {
            prerequisite: 'Reconnaissance Team Leader',
            benefit: 'speed-bonus',
            speedBonus: 2,
            description: 'As a Move Action, you can cause one of your Followers to move up to their speed +2 squares.'
        },
        'Reconnaissance Actions': {
            prerequisite: 'Reconnaissance Team Leader',
            benefit: 'reconnaissance-actions',
            description: 'You and your reconnaissance team have learned to work together as a cohesive unit.'
        },
        'Undying Loyalty': {
            prerequisite: 'Inspire Loyalty',
            benefit: 'toughness-feat',
            description: 'Each of your Followers gains the Toughness feat.'
        },
        'Punishing Protection': {
            prerequisite: 'Inspire Loyalty',
            benefit: 'punishing-protection',
            description: 'As a Reaction to you being damaged, one of your followers can make an immediate attack against the attacker.'
        },
        'Protector Actions': {
            prerequisite: 'Inspire Loyalty',
            benefit: 'protector-actions',
            description: 'You and your Followers have learned to work together to ensure your safety.'
        },
        'Bodyguard I': {
            prerequisite: 'Attract Minion',
            benefit: 'bodyguard-redirect',
            description: 'Once per turn, redirect an attack to an adjacent minion.'
        },
        'Bodyguard II': {
            prerequisite: 'Bodyguard I',
            benefit: 'bodyguard-defense',
            description: 'Minion gains +half class level to defense when redirecting.'
        },
        'Bodyguard III': {
            prerequisite: 'Bodyguard II',
            benefit: 'bodyguard-counterattack',
            description: 'Minion can counterattack after being hit, defense bonus increases to full class level.'
        },
        'Shelter': {
            prerequisite: 'Attract Minion',
            benefit: 'shelter',
            description: 'Cover bonus to Reflex Defense increased by +2 when adjacent to minion.'
        }
    };

    /**
     * Apply enhancement talent to followers
     * @param {Actor} owner - The owner of the followers
     * @param {Item} talent - The enhancement talent being added
     */
    static async applyEnhancement(owner, talent) {
        const enhancement = this.ENHANCEMENT_TALENTS[talent.name];
        if (!enhancement) {return;}

        // Get all followers
        const followers = FollowerCreator.getFollowers(owner);

        if (followers.length === 0) {
            ui.notifications.warn(`You don't have any followers to enhance with ${talent.name}.`);
            return;
        }

        // Apply benefit based on type
        switch (enhancement.benefit) {
            case 'point-blank-shot':
                await this.addFeatToAllFollowers(followers, 'Point-Blank Shot');
                ui.notifications.info(`All followers gained Point-Blank Shot feat!`);
                break;

            case 'speed-bonus':
                await this.addSpeedBonusToFollowers(owner, followers, enhancement.speedBonus);
                break;

            case 'toughness-feat':
                await this.addFeatToAllFollowers(followers, 'Toughness');
                ui.notifications.info(`All followers gained Toughness feat!`);
                break;

            case 'reconnaissance-actions':
            case 'protector-actions':
            case 'punishing-protection':
            case 'bodyguard-redirect':
            case 'bodyguard-defense':
            case 'bodyguard-counterattack':
            case 'shelter':
                // These are tactical abilities that don't modify follower stats directly
                // They should be handled through active effects or combat actions
                await this.addTacticalAbility(owner, talent, enhancement);
                break;
        }
    }

    /**
     * Add a feat to all followers
     * @private
     */
    static async addFeatToAllFollowers(followers, featName) {
        const featsPack = game.packs.get('foundryvtt-swse.feats');
        const featIndex = await featsPack.getIndex({ fields: ['name'] });
        const featEntry = featIndex.find(f => f.name === featName);

        if (!featEntry) {
            swseLogger.warn(`Feat not found: ${featName}`);
            return;
        }

        const featDoc = await featsPack.getDocument(featEntry._id);
        const featData = featDoc.toObject();

        for (const follower of followers) {
            // Check if follower already has this feat
            const hasFeat = follower.items.find(i => i.name === featName && i.type === 'feat');
            if (!hasFeat) {
                // PHASE 8: Use ActorEngine
                await ActorEngine.createEmbeddedDocuments(follower, 'Item', [featData]);
            }
        }
    }

    /**
     * Add speed bonus to followers
     * @private
     */
    static async addSpeedBonusToFollowers(owner, followers, bonus) {
        // Store the bonus in the owner's flags for use during combat
        const currentBonuses = owner.getFlag('foundryvtt-swse', 'followerSpeedBonuses') || {};
        currentBonuses['Get Into Position'] = bonus;
        await owner.setFlag('foundryvtt-swse', 'followerSpeedBonuses', currentBonuses);

        ui.notifications.info(`You can now use a Move Action to move a follower +${bonus} squares!`);
    }

    /**
     * Add tactical ability to owner
     * @private
     */
    static async addTacticalAbility(owner, talent, enhancement) {
        // Store tactical abilities in owner's flags
        const tacticalAbilities = owner.getFlag('foundryvtt-swse', 'followerTacticalAbilities') || [];

        if (!tacticalAbilities.includes(talent.name)) {
            tacticalAbilities.push(talent.name);
            await owner.setFlag('foundryvtt-swse', 'followerTacticalAbilities', tacticalAbilities);
        }

        ui.notifications.info(`Gained tactical ability: ${talent.name}!`);
    }

    /**
     * Remove enhancement when talent is removed
     * @param {Actor} owner - The owner of the followers
     * @param {Item} talent - The enhancement talent being removed
     */
    static async removeEnhancement(owner, talent) {
        const enhancement = this.ENHANCEMENT_TALENTS[talent.name];
        if (!enhancement) {return;}

        // Get all followers
        const followers = FollowerCreator.getFollowers(owner);

        // Remove benefit based on type
        switch (enhancement.benefit) {
            case 'point-blank-shot':
                await this.removeFeatFromAllFollowers(followers, 'Point-Blank Shot');
                break;

            case 'toughness-feat':
                await this.removeFeatFromAllFollowers(followers, 'Toughness');
                break;

            case 'speed-bonus': {
                const currentBonuses = owner.getFlag('foundryvtt-swse', 'followerSpeedBonuses') || {};
                delete currentBonuses['Get Into Position'];
                await owner.setFlag('foundryvtt-swse', 'followerSpeedBonuses', currentBonuses);
                break;
            }

            case 'reconnaissance-actions':
            case 'protector-actions':
            case 'punishing-protection':
            case 'bodyguard-redirect':
            case 'bodyguard-defense':
            case 'bodyguard-counterattack':
            case 'shelter': {
                const tacticalAbilities = owner.getFlag('foundryvtt-swse', 'followerTacticalAbilities') || [];
                const index = tacticalAbilities.indexOf(talent.name);
                if (index > -1) {
                    tacticalAbilities.splice(index, 1);
                    await owner.setFlag('foundryvtt-swse', 'followerTacticalAbilities', tacticalAbilities);
                }
                break;
            }
        }
    }

    /**
     * Remove a feat from all followers
     * @private
     */
    static async removeFeatFromAllFollowers(followers, featName) {
        for (const follower of followers) {
            const feat = follower.items.find(i => i.name === featName && i.type === 'feat');
            if (feat) {
                // PHASE 8: Use ActorEngine
                await ActorEngine.deleteEmbeddedDocuments(follower, 'Item', [feat.id]);
            }
        }
    }

    /**
     * Update follower stats when owner levels up
     * @param {Actor} owner - The owner actor
     */
    static async updateFollowerStats(owner) {
        const followers = FollowerCreator.getFollowers(owner);
        const ownerLevel = owner.system.level;

        for (const follower of followers) {
            const followerFlags = follower.flags?.swse?.follower;
            if (!followerFlags) {continue;}

            // Update level
            await follower.update({
                'system.level': ownerLevel
            });

            // Update HP (10 + owner level)
            await follower.update({
                'system.hp.max': 10 + ownerLevel,
                'system.hp.value': Math.min(follower.system.hp.value, 10 + ownerLevel)
            });

            // Update BAB based on template
            const templates = await FollowerCreator.getFollowerTemplates();
            const templateType = followerFlags.templateType;
            const template = templates[templateType];

            if (template && template.babProgression) {
                const bab = template.babProgression[Math.min(ownerLevel - 1, 19)] || 0;
                await follower.update({
                    'system.baseAttackBonus': bab
                });
            }

            ui.notifications.info(`Updated ${follower.name} to level ${ownerLevel}!`);
        }
    }

    /**
     * Get follower count for a specific talent
     * @param {Actor} owner - The owner actor
     * @param {string} talentName - The name of the talent
     * @returns {number} Number of followers from this talent
     */
    static getFollowerCountForTalent(owner, talentName) {
        const followers = owner.getFlag('foundryvtt-swse', 'followers') || [];
        return followers.filter(f => f.talent === talentName).length;
    }

    /**
     * Check if actor can create more followers with a talent
     * @param {Actor} owner - The owner actor
     * @param {string} talentName - The name of the talent
     * @param {number} maxCount - Maximum followers allowed
     * @returns {boolean} True if can create more followers
     */
    static canCreateMoreFollowers(owner, talentName, maxCount) {
        const currentCount = this.getFollowerCountForTalent(owner, talentName);
        return currentCount < maxCount;
    }

    /**
     * Get all enhancement talents that affect a follower
     * @param {Actor} follower - The follower actor
     * @returns {Array<Item>} Array of enhancement talents
     */
    static getFollowerEnhancements(follower) {
        const ownerFlags = follower.flags?.swse?.follower;
        if (!ownerFlags) {return [];}

        const owner = game.actors.get(ownerFlags.ownerId);
        if (!owner) {return [];}

        const enhancements = [];
        for (const talent of owner.items.filter(i => i.type === 'talent')) {
            if (this.ENHANCEMENT_TALENTS[talent.name]) {
                enhancements.push(talent);
            }
        }

        return enhancements;
    }
}

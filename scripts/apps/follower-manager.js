import { FollowerCreator } from "/systems/foundryvtt-swse/scripts/apps/follower-creator.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Follower Manager - Handles follower enhancements and bonuses.
 *
 * This manager is intentionally owner-driven:
 * - owner talents are the source of truth
 * - follower feat grants are written to follower actors with provenance
 * - removal only deletes feats that this manager granted
 */
export class FollowerManager {

    /**
     * Enhancement talent configurations.
     */
    static ENHANCEMENT_TALENTS = {
        'Close-Combat Assault': {
            prerequisite: 'Reconnaissance Team Leader',
            benefit: 'point-blank-shot',
            featName: 'Point-Blank Shot',
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
            featName: 'Toughness',
            description: 'Each of your Followers gains the Toughness feat.'
        },
        'Coordinated Tactics': {
            prerequisite: 'Commanding Officer',
            benefit: 'coordinated-attack-feat',
            featName: 'Coordinated Attack',
            description: 'Each of your followers gains the Coordinated Attack feat when eligible.'
        },
        'Fire at Will': {
            prerequisite: 'Commanding Officer',
            benefit: 'fire-at-will',
            description: 'As a Full-Round Action, you and one follower can each make a ranged attack at -5.'
        },
        'Squad Actions': {
            prerequisite: 'Commanding Officer',
            benefit: 'squad-actions',
            description: 'Enables the Soldier squad action cards for eligible ranged followers.'
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
        },
        'Wealth of Allies': {
            prerequisite: 'Attract Minion',
            benefit: 'wealth-of-allies',
            description: 'If a minion is killed, it is replaced by one of the same level after 24 hours.'
        },
        'Shared Notoriety': {
            prerequisite: 'Notorious',
            benefit: 'shared-notoriety',
            description: 'Your minions may reroll Persuasion checks made to intimidate.'
        },
        'Frighten': {
            prerequisite: 'Inspire Fear I',
            benefit: 'frighten',
            description: 'Once per encounter, force enemies to move 1 square away from one minion.'
        },
        'Fear Me': {
            prerequisite: 'Inspire Fear II',
            benefit: 'fear-me',
            description: 'Once per encounter, reduce a minion by 1 condition step and heal them by owner heroic level.'
        }
    };

    static isEnhancementTalent(talentName) {
        return !!this.ENHANCEMENT_TALENTS[talentName];
    }

    static getEnhancementTalents(owner) {
        return Array.from(owner?.items || [])
            .filter(item => item?.type === 'talent' && this.isEnhancementTalent(item.name));
    }

    /**
     * Reconcile owner talent state into current followers and owner flags.
     * Used on world ready to repair actors that gained these talents before hooks were wired.
     *
     * @param {Actor} owner
     * @returns {Promise<void>}
     */
    static async reconcileEnhancementsForOwner(owner) {
        if (!owner || owner.type !== 'character') return;

        const ownedEnhancementTalents = this.getEnhancementTalents(owner);
        const ownedNames = new Set(ownedEnhancementTalents.map(talent => talent.name));

        for (const talent of ownedEnhancementTalents) {
            await this.applyEnhancement(owner, talent, { silent: true });
        }

        await this._removeStaleOwnerEnhancementFlags(owner, ownedNames);
    }

    /**
     * Apply all owner follower-enhancement talents to a newly created follower.
     * This is the critical future-follower path: talents chosen before follower creation
     * still affect followers created later.
     *
     * @param {Actor} owner
     * @param {Actor} follower
     * @param {Object} options
     * @returns {Promise<void>}
     */
    static async applyExistingEnhancementsToFollower(owner, follower, options = {}) {
        if (!owner || !follower) return;

        for (const talent of this.getEnhancementTalents(owner)) {
            await this.applyEnhancement(owner, talent, {
                ...options,
                targetFollower: follower,
                silent: options.silent ?? true
            });
        }
    }

    /**
     * Apply enhancement talent to followers.
     *
     * @param {Actor} owner - The owner of the followers
     * @param {Item} talent - The enhancement talent being added
     * @param {Object} options
     */
    static async applyEnhancement(owner, talent, options = {}) {
        const enhancement = this.ENHANCEMENT_TALENTS[talent?.name];
        if (!owner || !enhancement) return;

        const followers = options.targetFollower
            ? [options.targetFollower].filter(Boolean)
            : FollowerCreator.getFollowers(owner);

        switch (enhancement.benefit) {
            case 'point-blank-shot':
            case 'toughness-feat':
            case 'coordinated-attack-feat':
                await this.addFeatToAllFollowers(followers, enhancement.featName, talent, owner, options);
                if (!options.silent && followers.length > 0) {
                    ui.notifications.info(`All followers gained ${enhancement.featName}!`);
                }
                break;

            case 'speed-bonus':
                await this.addSpeedBonusToFollowers(owner, followers, enhancement.speedBonus, talent, options);
                break;

            case 'reconnaissance-actions':
            case 'protector-actions':
            case 'punishing-protection':
            case 'fire-at-will':
            case 'squad-actions':
            case 'bodyguard-redirect':
            case 'bodyguard-defense':
            case 'bodyguard-counterattack':
            case 'shelter':
            case 'wealth-of-allies':
            case 'shared-notoriety':
            case 'frighten':
            case 'fear-me':
                // These are tactical abilities that don't directly mutate follower stats.
                await this.addTacticalAbility(owner, talent, enhancement, options);
                break;
        }
    }

    /**
     * Add a feat to all target followers.
     * @private
     */
    static async addFeatToAllFollowers(followers, featName, sourceTalent = null, owner = null, options = {}) {
        for (const follower of followers || []) {
            await this.addFeatToFollower(follower, featName, sourceTalent, owner, options);
        }
    }

    /**
     * Add a feat to one follower with provenance.
     * Existing feats are never duplicated; if the follower already has the feat from
     * another source, that natural/progression feat is left untouched.
     *
     * @private
     */
    static async addFeatToFollower(follower, featName, sourceTalent = null, owner = null, options = {}) {
        if (!follower || !featName) return false;

        const hasFeat = Array.from(follower.items || []).some(item => item.type === 'feat' && item.name === featName);
        if (hasFeat) return false;

        const featDoc = await FeatRegistry.getDocumentByName?.(featName);
        if (!featDoc) {
            swseLogger.warn(`[FollowerManager] Feat not found for follower enhancement: ${featName}`);
            return false;
        }

        const featData = featDoc.toObject();
        const grantPayload = {
            source: 'follower-enhancement',
            ownerId: owner?.id ?? null,
            ownerName: owner?.name ?? null,
            followerId: follower.id,
            talentName: sourceTalent?.name ?? null,
            talentItemId: sourceTalent?.id ?? null,
            grantedAt: Date.now()
        };

        featData.flags = {
            ...(featData.flags || {}),
            swse: {
                ...(featData.flags?.swse || {}),
                grantedByTalent: grantPayload,
                followerEnhancement: true
            }
        };

        await ActorEngine.createEmbeddedDocuments(follower, 'Item', [featData], {
            source: 'FollowerManager.addFeatToFollower',
            meta: { guardKey: 'follower-enhancement-feat-grant' }
        });

        if (!options.silent) {
            ui.notifications.info(`${follower.name} gained ${featName} from ${sourceTalent?.name ?? 'a follower enhancement'}.`);
        }

        return true;
    }

    /**
     * Add speed bonus to owner flags for use by combat/action UI.
     * @private
     */
    static async addSpeedBonusToFollowers(owner, followers, bonus, talent = null, options = {}) {
        const currentBonuses = owner.getFlag('foundryvtt-swse', 'followerSpeedBonuses') || {};
        const key = talent?.name || 'Get Into Position';
        currentBonuses[key] = bonus;
        await owner.setFlag('foundryvtt-swse', 'followerSpeedBonuses', currentBonuses);

        if (!options.silent) {
            ui.notifications.info(`You can now use ${key} to move a follower +${bonus} squares.`);
        }
    }

    /**
     * Add tactical ability to owner flags.
     * @private
     */
    static async addTacticalAbility(owner, talent, enhancement, options = {}) {
        const tacticalAbilities = owner.getFlag('foundryvtt-swse', 'followerTacticalAbilities') || [];

        if (!tacticalAbilities.includes(talent.name)) {
            tacticalAbilities.push(talent.name);
            await owner.setFlag('foundryvtt-swse', 'followerTacticalAbilities', tacticalAbilities);
        }

        if (!options.silent) {
            ui.notifications.info(`Gained tactical ability: ${talent.name}!`);
        }
    }

    /**
     * Remove enhancement when talent is removed.
     * Only removes manager-granted feats; natural/progression feats stay intact.
     *
     * @param {Actor} owner - The owner of the followers
     * @param {Item} talent - The enhancement talent being removed
     */
    static async removeEnhancement(owner, talent) {
        const enhancement = this.ENHANCEMENT_TALENTS[talent?.name];
        if (!owner || !enhancement) return;

        const followers = FollowerCreator.getFollowers(owner);

        switch (enhancement.benefit) {
            case 'point-blank-shot':
            case 'toughness-feat':
            case 'coordinated-attack-feat':
                await this.removeFeatFromAllFollowers(followers, enhancement.featName, talent, owner);
                break;

            case 'speed-bonus': {
                const currentBonuses = owner.getFlag('foundryvtt-swse', 'followerSpeedBonuses') || {};
                delete currentBonuses[talent.name];
                await owner.setFlag('foundryvtt-swse', 'followerSpeedBonuses', currentBonuses);
                break;
            }

            case 'reconnaissance-actions':
            case 'protector-actions':
            case 'punishing-protection':
            case 'fire-at-will':
            case 'squad-actions':
            case 'bodyguard-redirect':
            case 'bodyguard-defense':
            case 'bodyguard-counterattack':
            case 'shelter':
            case 'wealth-of-allies':
            case 'shared-notoriety':
            case 'frighten':
            case 'fear-me': {
                const tacticalAbilities = owner.getFlag('foundryvtt-swse', 'followerTacticalAbilities') || [];
                const nextAbilities = tacticalAbilities.filter(name => name !== talent.name);
                await owner.setFlag('foundryvtt-swse', 'followerTacticalAbilities', nextAbilities);
                break;
            }
        }
    }

    /**
     * Remove manager-granted feats from all followers.
     * @private
     */
    static async removeFeatFromAllFollowers(followers, featName, sourceTalent = null, owner = null) {
        for (const follower of followers || []) {
            const toDelete = Array.from(follower.items || [])
                .filter(item => item.type === 'feat' && item.name === featName)
                .filter(item => this._wasGrantedByEnhancement(item, sourceTalent, owner))
                .map(item => item.id);

            if (toDelete.length) {
                await ActorEngine.deleteEmbeddedDocuments(follower, 'Item', toDelete, {
                    source: 'FollowerManager.removeFeatFromAllFollowers',
                    meta: { guardKey: 'follower-enhancement-feat-removal' }
                });
            }
        }
    }

    static _wasGrantedByEnhancement(item, sourceTalent = null, owner = null) {
        const grant = item?.flags?.swse?.grantedByTalent;
        if (!grant || grant.source !== 'follower-enhancement') return false;

        if (sourceTalent?.id && grant.talentItemId && grant.talentItemId !== sourceTalent.id) return false;
        if (sourceTalent?.name && grant.talentName && grant.talentName !== sourceTalent.name) return false;
        if (owner?.id && grant.ownerId && grant.ownerId !== owner.id) return false;

        return true;
    }

    static async _removeStaleOwnerEnhancementFlags(owner, ownedNames) {
        const speedBonuses = owner.getFlag('foundryvtt-swse', 'followerSpeedBonuses') || {};
        let speedChanged = false;
        for (const key of Object.keys(speedBonuses)) {
            if (this.isEnhancementTalent(key) && !ownedNames.has(key)) {
                delete speedBonuses[key];
                speedChanged = true;
            }
        }
        if (speedChanged) {
            await owner.setFlag('foundryvtt-swse', 'followerSpeedBonuses', speedBonuses);
        }

        const tacticalAbilities = owner.getFlag('foundryvtt-swse', 'followerTacticalAbilities') || [];
        const nextTacticalAbilities = tacticalAbilities.filter(name => !this.isEnhancementTalent(name) || ownedNames.has(name));
        if (nextTacticalAbilities.length !== tacticalAbilities.length) {
            await owner.setFlag('foundryvtt-swse', 'followerTacticalAbilities', nextTacticalAbilities);
        }
    }

    /**
     * Update follower stats when owner levels up.
     * Kept for legacy callers; the main level-up path uses FollowerCreator.updateFollowersForLevelUp.
     *
     * @param {Actor} owner - The owner actor
     */
    static async updateFollowerStats(owner) {
        await FollowerCreator.updateFollowersForLevelUp(owner);
    }

    /**
     * Get follower count for a specific talent.
     *
     * @param {Actor} owner - The owner actor
     * @param {string} talentName - The name of the talent
     * @returns {number} Number of followers from this talent
     */
    static getFollowerCountForTalent(owner, talentName) {
        const followers = owner.getFlag('foundryvtt-swse', 'followers') || [];
        return followers.filter(f => f.talent === talentName).length;
    }

    /**
     * Check if actor can create more followers with a talent.
     *
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
     * Get all enhancement talents that affect a follower.
     *
     * @param {Actor} follower - The follower actor
     * @returns {Array<Item>} Array of enhancement talents
     */
    static getFollowerEnhancements(follower) {
        const ownerFlags = follower.flags?.swse?.follower;
        if (!ownerFlags) return [];

        const owner = game.actors.get(ownerFlags.ownerId);
        if (!owner) return [];

        return this.getEnhancementTalents(owner);
    }
}

/**
 * Minion Manager
 *
 * Handles Crime Lord / Master Privateer minion talents. These talents mostly
 * create tactical permissions or action cards instead of directly mutating stats.
 */

import { MinionCreator } from "/systems/foundryvtt-swse/scripts/apps/minion-creator.js";

export class MinionManager {
  static MINION_TALENTS = {
    'Wealth of Allies': {
      prerequisite: 'Attract Minion',
      benefit: 'wealth-of-allies',
      description: 'If a minion is killed, a replacement of the same level appears after 24 hours.'
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
      description: 'Once per encounter, punish a minion down the track and heal them by owner heroic level.'
    },
    'Bodyguard I': {
      prerequisite: 'Attract Minion',
      benefit: 'bodyguard-i',
      description: 'Once per turn, redirect an attack to an attracted minion.'
    },
    'Bodyguard II': {
      prerequisite: 'Bodyguard I',
      benefit: 'bodyguard-ii',
      description: 'Redirected minion gains Reflex Defense equal to half your class level.'
    },
    'Bodyguard III': {
      prerequisite: 'Bodyguard II',
      benefit: 'bodyguard-iii',
      description: 'Defense bonus improves to full class level and minion can counterattack.'
    },
    'Shelter': {
      prerequisite: 'Attract Minion',
      benefit: 'shelter',
      description: 'Cover bonus to your Reflex Defense increases by +2 while adjacent to a minion.'
    }
  };

  static isMinionTalent(talentName) {
    return !!this.MINION_TALENTS[talentName];
  }

  static getMinionTalents(owner) {
    return Array.from(owner?.items || []).filter(item => item?.type === 'talent' && this.isMinionTalent(item.name));
  }

  static async reconcileTalentsForOwner(owner) {
    if (!owner || owner.type !== 'character') return;
    const talents = this.getMinionTalents(owner);
    const ownedNames = new Set(talents.map(t => t.name));
    for (const talent of talents) {
      await this.applyTalent(owner, talent, { silent: true });
    }
    await this._removeStaleFlags(owner, ownedNames);
  }

  static async applyExistingEnhancementsToMinion(owner, minion, options = {}) {
    if (!owner || !minion) return;
    for (const talent of this.getMinionTalents(owner)) {
      await this.applyTalent(owner, talent, { ...options, targetMinion: minion, silent: options.silent ?? true });
    }
  }

  static async applyTalent(owner, talent, options = {}) {
    const config = this.MINION_TALENTS[talent?.name];
    if (!owner || !config) return;

    const flags = owner.getFlag('foundryvtt-swse', 'minionTacticalAbilities') || [];
    if (!flags.includes(talent.name)) {
      flags.push(talent.name);
      await owner.setFlag('foundryvtt-swse', 'minionTacticalAbilities', flags);
    }

    const registry = owner.getFlag('foundryvtt-swse', 'minionTalentRegistry') || {};
    registry[talent.name] = {
      benefit: config.benefit,
      description: config.description,
      talentItemId: talent.id,
      updatedAt: Date.now()
    };
    await owner.setFlag('foundryvtt-swse', 'minionTalentRegistry', registry);

    const minions = options.targetMinion ? [options.targetMinion] : MinionCreator.getMinions(owner);
    for (const minion of minions) {
      await minion.setFlag('swse', `minionTalentBenefits.${talent.name}`, {
        ownerId: owner.id,
        talentItemId: talent.id,
        benefit: config.benefit
      });
    }

    if (!options.silent) {
      ui?.notifications?.info?.(`Minion tactical ability active: ${talent.name}`);
    }
  }

  static async removeTalent(owner, talent) {
    if (!owner || !this.isMinionTalent(talent?.name)) return;

    const abilities = owner.getFlag('foundryvtt-swse', 'minionTacticalAbilities') || [];
    await owner.setFlag('foundryvtt-swse', 'minionTacticalAbilities', abilities.filter(name => name !== talent.name));

    const registry = owner.getFlag('foundryvtt-swse', 'minionTalentRegistry') || {};
    delete registry[talent.name];
    await owner.setFlag('foundryvtt-swse', 'minionTalentRegistry', registry);

    for (const minion of MinionCreator.getMinions(owner)) {
      await minion.unsetFlag?.('swse', `minionTalentBenefits.${talent.name}`);
    }
  }

  static async _removeStaleFlags(owner, ownedNames) {
    const abilities = owner.getFlag('foundryvtt-swse', 'minionTacticalAbilities') || [];
    const next = abilities.filter(name => !this.isMinionTalent(name) || ownedNames.has(name));
    if (next.length !== abilities.length) {
      await owner.setFlag('foundryvtt-swse', 'minionTacticalAbilities', next);
    }

    const registry = owner.getFlag('foundryvtt-swse', 'minionTalentRegistry') || {};
    let changed = false;
    for (const key of Object.keys(registry)) {
      if (this.isMinionTalent(key) && !ownedNames.has(key)) {
        delete registry[key];
        changed = true;
      }
    }
    if (changed) await owner.setFlag('foundryvtt-swse', 'minionTalentRegistry', registry);
  }
}

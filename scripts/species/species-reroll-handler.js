/**
 * Species Reroll Handler
 * Handles species-granted reroll abilities (like Duros Expert Pilot, Bothan Spy Network)
 *
 * PHASE 4: Now consumes durable species reroll state from Phase 3
 * Reads from: flags.swse.speciesRerolls array
 * Structure: [{scope, target, frequency, outcome, sourceTraitName, sourceTraitId}]
 */

import { SPECIES_TRAIT_TYPES, FREQUENCIES, SKILL_DISPLAY_NAMES } from "/systems/foundryvtt-swse/scripts/species/species-trait-types.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { registerChatInteractionBridge } from "/systems/foundryvtt-swse/scripts/ui/chat/chat-interaction-bridge.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

/**
 * Handler for species reroll abilities
 */
const REROLL_GRANT_CACHE_LIMIT = 300;
const ITEM_REROLL_GRANT_CACHE = new Map();
const SKILL_NAME_TO_KEY = (() => {
  const map = new Map();
  for (const [key, label] of Object.entries(SKILL_DISPLAY_NAMES ?? {})) {
    map.set(String(key).toLowerCase(), key);
    map.set(String(label).toLowerCase(), key);
    map.set(String(label).toLowerCase().replace(/[^a-z0-9]/g, ''), key);
  }
  // Common source-text aliases.
  map.set('knowledge life science', 'knowledgeLifeSciences');
  map.set('knowledge lifescience', 'knowledgeLifeSciences');
  map.set('knowledgelifescience', 'knowledgeLifeSciences');
  map.set('knowledge physical science', 'knowledgePhysicalSciences');
  map.set('knowledge physicalscience', 'knowledgePhysicalSciences');
  map.set('knowledgephysicalscience', 'knowledgePhysicalSciences');
  map.set('knowledge social science', 'knowledgeSocialSciences');
  map.set('knowledge socialscience', 'knowledgeSocialSciences');
  map.set('knowledgesocialscience', 'knowledgeSocialSciences');
  return map;
})();

function boundedSet(map, key, value, limit) {
  if (!key) return;
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > limit) {
    const firstKey = map.keys().next().value;
    if (firstKey === undefined) break;
    map.delete(firstKey);
  }
}

function cloneRerollGrants(grants = []) {
  return grants.map(grant => ({ ...grant }));
}

export class SpeciesRerollHandler {

  /**
   * Check if an actor has reroll traits that apply to a given skill
   * PHASE 4: Reads from canonical Phase 3 actor state
   * @param {Actor} actor - The actor to check
   * @param {string} skillKey - The skill key to check rerolls for
   * @returns {Array} Array of applicable reroll traits
   */
  static getApplicableRerolls(actor, skillKey) {
    const speciesRerolls = [
      ...(actor.flags?.swse?.speciesRerolls || []),
      ...this._getItemGrantedRerolls(actor)
    ];
    return speciesRerolls.filter(reroll => {
      if (this._isRerollGrantUsed(actor, reroll)) {
        return false;
      }
      // Check if this reroll applies to the skill or 'any' roll
      if (reroll.scope !== 'skill' && reroll.scope !== 'any') {
        return false;
      }
      // Check if target matches skill name or 'any'
      if (reroll.target !== skillKey && reroll.target !== 'any') {
        return false;
      }
      return true;
    });
  }

  /**
   * Check if an actor has any reroll available (for any roll type)
   * PHASE 4: Reads from canonical Phase 3 actor state
   * @param {Actor} actor - The actor
   * @param {string} rollType - 'skill', 'attack', or 'any'
   * @returns {Array} Array of applicable reroll traits
   */
  static getAvailableRerolls(actor, rollType = 'any') {
    const speciesRerolls = [
      ...(actor.flags?.swse?.speciesRerolls || []),
      ...this._getItemGrantedRerolls(actor)
    ];

    return speciesRerolls.filter(reroll => {
      if (this._isRerollGrantUsed(actor, reroll)) {
        return false;
      }
      // Check scope matches
      if (reroll.scope === 'any') {return true;}
      if (reroll.scope === rollType) {return true;}
      if (rollType === 'any') {return true;}
      return false;
    });
  }

  /**
   * Offer a reroll after a skill check
   * PHASE 4: Consumes Phase 3 canonical reroll metadata
   * @param {Actor} actor - The actor who made the roll
   * @param {string} skillKey - The skill that was rolled
   * @param {Roll} originalRoll - The original roll result
   * @param {object} options - Additional options
   * @returns {Promise<Roll|null>} The new roll if rerolled, null otherwise
   */
  static async offerReroll(actor, skillKey, originalRoll, options = {}) {
    const rerollTraits = this.getApplicableRerolls(actor, skillKey);

    if (rerollTraits.length === 0) {
      return null;
    }

    // Use first applicable reroll
    const reroll = rerollTraits[0];
    const traitName = reroll.sourceTraitName || 'Species Ability';

    // Phase 3 outcome semantics: 'keep_better' or 'must_accept'
    const mustAcceptWorse = reroll.outcome === 'must_accept';

    const content = `
      <div class="species-reroll-dialog">
        <p><strong>${traitName}</strong></p>
        <p>You may reroll this ${skillKey} check.</p>
        ${mustAcceptWorse ? '<p class="warning"><em>You must accept the new result, even if it is worse.</em></p>' : '<p><em>You keep the better result.</em></p>'}
        <p>Original roll: <strong>${originalRoll.total}</strong></p>
      </div>
    `;

    const useReroll = await SWSEDialogV2.confirm({
      title: `Reroll ${skillKey}?`,
      content: content,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });

    if (!useReroll) {
      return null;
    }

    // Perform the reroll
    const newRoll = await this._performReroll(actor, originalRoll, options);

    if (newRoll) {
      // Determine which roll to use based on outcome semantics
      let finalRoll = newRoll;
      if (reroll.outcome === 'keep_better' && newRoll.total < originalRoll.total) {
        finalRoll = originalRoll;
      }

      // Send reroll notification to chat
      await this._sendRerollMessage(actor, skillKey, originalRoll, newRoll, finalRoll, traitName, mustAcceptWorse);

      return finalRoll;
    }

    return null;
  }

  /**
   * Perform the actual reroll
   * @private
   */
  static async _performReroll(actor, originalRoll, options) {
    try {
      // Extract the formula from the original roll
      const formula = originalRoll.formula || '1d20';

      // Create and evaluate a new roll
      const newRoll = await RollEngine.safeRoll(formula);
      if (!newRoll) {
        SWSELogger.warn('SpeciesRerollHandler | Failed to perform reroll');
        return null;
      }

      return newRoll;
    } catch (err) {
      SWSELogger.error('SpeciesRerollHandler | Error performing reroll:', err);
      return null;
    }
  }

  /**
   * Mark a once-per-encounter trait as used
   * @private
   */
  static async _markTraitUsed(actor, traitId) {
    if (!actor || !traitId) return;

    // Store used traits in actor flags. Route through ActorEngine so the reroll
    // lifecycle does not bypass the system mutation boundary.
    const usedTraits = Array.isArray(actor.getFlag?.('foundryvtt-swse', 'usedSpeciesTraits'))
      ? [...actor.getFlag('foundryvtt-swse', 'usedSpeciesTraits')]
      : [];
    if (!usedTraits.includes(traitId)) {
      usedTraits.push(traitId);
      if (ActorEngine?.updateActorFlags) {
        await ActorEngine.updateActorFlags(actor, 'foundryvtt-swse', 'usedSpeciesTraits', usedTraits, {
          meta: { guardKey: 'species-reroll-used' }
        });
      } else {
        // mutation-exception fallback-only: ActorEngine should exist in normal runtime.
        await actor.setFlag?.('foundryvtt-swse', 'usedSpeciesTraits', usedTraits);
      }
    }
  }

  /**
   * Reset all once-per-encounter species traits (call on encounter end)
   * @param {Actor} actor - The actor to reset traits for
   */
  static async resetEncounterTraits(actor) {
    if (!actor) return;
    if (ActorEngine?.unsetActorFlag) {
      await ActorEngine.unsetActorFlag(actor, 'foundryvtt-swse', 'usedSpeciesTraits', {
        meta: { guardKey: 'species-reroll-reset' }
      });
      return;
    }
    // mutation-exception fallback-only: ActorEngine should exist in normal runtime.
    await actor.unsetFlag?.('foundryvtt-swse', 'usedSpeciesTraits');
  }

  /**
   * Send a chat message about the reroll
   * @private
   */
  static async _sendRerollMessage(actor, skillKey, originalRoll, newRoll, finalRoll, traitName, acceptWorse) {
    const usedNew = finalRoll === newRoll;
    const skillName = this._getSkillDisplayName(skillKey);

    const content = `
      <div class="swse-species-reroll-card">
        <div class="swse-holo-header">
          <i class="fa-solid fa-dice"></i> ${traitName} - Reroll
        </div>
        <table class="swse-holo-breakdown">
          <tr><td>Skill</td><td>${skillName}</td></tr>
          <tr><td>Original Roll</td><td>${originalRoll.total}</td></tr>
          <tr><td>Reroll</td><td>${newRoll.total}</td></tr>
          <tr><td>Result</td><td><strong>${finalRoll.total}</strong> ${acceptWorse ? '(must accept)' : usedNew ? '(chose reroll)' : '(kept original)'}</td></tr>
        </table>
      </div>
    `;

    await createChatMessage({
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: content,
      flavor: `Species Reroll: ${skillName}`
    });
  }

  /**
   * Get display name for a skill key
   * @private
   */
  static _getSkillDisplayName(skillKey) {
    const displayNames = {
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

    return displayNames[skillKey] || skillKey;
  }

  /**
   * Add reroll button to chat card if applicable
   * This is called when creating skill check chat messages
   * @param {string} content - The chat message content
   * @param {Actor} actor - The actor who made the roll
   * @param {string} skillKey - The skill that was rolled
   * @param {Roll} roll - The roll result
   * @returns {string} Modified content with reroll button if applicable
   */
  static addRerollButton(content, actor, skillKey, roll) {
    const rerollTraits = this.getApplicableRerolls(actor, skillKey);

    if (rerollTraits.length === 0) {
      return content;
    }

    const trait = rerollTraits[0];
    const traitName = trait.name || 'Species Ability';

    // Add a reroll button to the content
    const buttonHtml = `
      <div class="species-reroll-section">
        <button class="species-reroll-btn"
                data-actor-id="${actor.id}"
                data-skill="${skillKey}"
                data-trait-id="${trait.id}"
                data-roll-total="${roll.total}">
          <i class="fa-solid fa-dice"></i> ${traitName}: Reroll
        </button>
      </div>
    `;

    // Append button before closing div
    return content + buttonHtml;
  }

  /**
   * Resolve a species reroll chat button. Chat bridge delegates here so the
   * render hook remains UI-only and this domain helper owns reroll behavior.
   */
  static async resolveChatRerollButton(button, { message = null } = {}) {
    if (!(button instanceof HTMLElement)) return null;

    const actorId = button.dataset.actorId;
    const skillKey = button.dataset.skill;
    const traitId = button.dataset.traitId;
    const originalTotal = Number.parseInt(button.dataset.rollTotal, 10);

    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error('Actor not found');
      return null;
    }

    if (!actor.isOwner) {
      ui.notifications.warn('You do not control this actor');
      return null;
    }

    const rerollTraits = this.getApplicableRerolls(actor, skillKey);
    const trait = rerollTraits.find(t => t.id === traitId);

    if (!trait) {
      ui.notifications.warn('Reroll ability no longer available');
      return null;
    }

    const mod = actor.system.skills?.[skillKey]?.total || 0;
    const fullFormula = `1d20 + ${mod}`;
    const newRoll = await RollEngine.safeRoll(fullFormula);
    if (!newRoll) {
      ui.notifications.error('Reroll failed');
      return null;
    }

    const acceptWorse = trait.acceptWorse !== false;
    let finalRoll = newRoll;
    if (!acceptWorse && newRoll.total < originalTotal) {
      finalRoll = { total: originalTotal };
    }

    if (trait.type === SPECIES_TRAIT_TYPES.ONCE_PER_ENCOUNTER) {
      await this._markTraitUsed(actor, trait.id);
    }

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-check"></i> Reroll Used';

    await this._sendRerollMessage(
      actor,
      skillKey,
      { total: originalTotal },
      newRoll,
      finalRoll,
      trait.name || 'Species Ability',
      acceptWorse
    );

    return { actor, skillKey, trait, message, originalTotal, newRoll, finalRoll };
  }

  /**
   * Collect reroll grants from embedded items (species special abilities, feats,
   * talents, or GM-dropped passive ability items). This closes the Phase 8
   * backlog hook that previously returned an empty array even though the
   * Special Abilities compendium already carries grantsReroll metadata.
   *
   * @private
   */
  static _getItemGrantedRerolls(actor) {
    if (!actor?.items) return [];

    const cacheKey = this._itemRerollGrantCacheKey(actor);
    const cached = cacheKey ? ITEM_REROLL_GRANT_CACHE.get(cacheKey) : null;
    if (cached) return cloneRerollGrants(cached);

    const grants = [];
    for (const item of actor.items ?? []) {
      const sources = this._collectRerollGrantSources(item);
      if (!sources.length) continue;

      sources.forEach((grant, index) => {
        grants.push(...this._normalizeRerollGrant(grant, item, index));
      });
    }

    if (cacheKey) boundedSet(ITEM_REROLL_GRANT_CACHE, cacheKey, cloneRerollGrants(grants), REROLL_GRANT_CACHE_LIMIT);
    return grants;
  }

  static clearCaches() {
    ITEM_REROLL_GRANT_CACHE.clear();
  }

  static _collectRerollGrantSources(item) {
    const scopes = [
      item?.flags?.swse,
      item?.flags?.['foundryvtt-swse'],
      item?.system,
      item?.system?.abilityMeta,
      item?.system?.specialAbility
    ].filter(Boolean);

    const grants = [];
    for (const scope of scopes) {
      for (const key of ['grantsReroll', 'grantReroll', 'rerollGrants', 'rerolls']) {
        const value = scope?.[key];
        if (Array.isArray(value)) grants.push(...value);
        else if (value && typeof value === 'object') grants.push(value);
      }
    }
    return grants;
  }

  static _normalizeRerollGrant(grant, item, index = 0) {
    if (!grant || typeof grant !== 'object') return [];

    const rawTargets = Array.isArray(grant.target ?? grant.targets)
      ? (grant.target ?? grant.targets)
      : [grant.target ?? grant.targets ?? 'any'];

    return rawTargets.map((target, targetIndex) => {
      const normalizedTarget = this._normalizeRerollTarget(target);
      const scope = this._normalizeRerollScope(grant.scope, normalizedTarget);
      const frequency = this._normalizeRerollFrequency(grant.frequency ?? grant.uses ?? grant.limit ?? grant.limitedUse);
      const outcome = this._normalizeRerollOutcome(grant.outcome ?? grant.result ?? grant.keepResult ?? grant.acceptWorse);
      const sourceTraitId = String(grant.sourceTraitId ?? grant.id ?? `${item.id ?? item._id ?? item.name}:${index}:${targetIndex}`);
      const sourceTraitName = String(grant.sourceTraitName ?? grant.name ?? item.name ?? 'Reroll');
      const limited = frequency === FREQUENCIES.ONCE_PER_ENCOUNTER || grant.type === SPECIES_TRAIT_TYPES.ONCE_PER_ENCOUNTER;

      return {
        ...grant,
        id: sourceTraitId,
        name: sourceTraitName,
        scope,
        target: normalizedTarget,
        frequency,
        outcome,
        acceptWorse: outcome !== 'keep_better',
        type: limited ? SPECIES_TRAIT_TYPES.ONCE_PER_ENCOUNTER : (grant.type ?? SPECIES_TRAIT_TYPES.REROLL),
        sourceTraitId,
        sourceTraitName,
        sourceItemId: item.id ?? item._id ?? null,
        sourceItemName: item.name ?? null
      };
    });
  }

  static _normalizeRerollScope(scope, target) {
    const raw = String(scope ?? '').trim().toLowerCase();
    if (raw.includes('attack')) return 'attack';
    if (raw.includes('any') || target === 'any') return 'any';
    if (raw.includes('skill') || SKILL_NAME_TO_KEY.has(String(target ?? '').toLowerCase())) return 'skill';
    return 'skill';
  }

  static _normalizeRerollTarget(target) {
    if (target === null || target === undefined || target === '') return 'any';
    const raw = String(target).trim();
    const lowered = raw.toLowerCase();
    if (['any', 'all', '*'].includes(lowered)) return 'any';
    const compact = lowered.replace(/[^a-z0-9]/g, '');
    return SKILL_NAME_TO_KEY.get(lowered) ?? SKILL_NAME_TO_KEY.get(compact) ?? raw;
  }

  static _normalizeRerollFrequency(frequency) {
    const raw = String(frequency ?? FREQUENCIES.AT_WILL).trim().toLowerCase();
    if (raw.includes('encounter')) return FREQUENCIES.ONCE_PER_ENCOUNTER;
    if (raw.includes('day')) return FREQUENCIES.ONCE_PER_DAY;
    if (raw.includes('round')) return FREQUENCIES.ONCE_PER_ROUND;
    return FREQUENCIES.AT_WILL;
  }

  static _normalizeRerollOutcome(outcome) {
    if (outcome === false) return 'keep_better';
    if (outcome === true) return 'must_accept';
    const raw = String(outcome ?? 'must_accept').trim().toLowerCase().replace(/[-\s]+/g, '_');
    if (raw.includes('better') || raw.includes('keep_best') || raw.includes('keep_high')) return 'keep_better';
    return 'must_accept';
  }

  static _isRerollGrantUsed(actor, reroll) {
    if (!actor || !reroll) return false;
    const limited = reroll.type === SPECIES_TRAIT_TYPES.ONCE_PER_ENCOUNTER
      || reroll.frequency === FREQUENCIES.ONCE_PER_ENCOUNTER;
    if (!limited) return false;

    const used = actor.getFlag?.('foundryvtt-swse', 'usedSpeciesTraits');
    return Array.isArray(used) && used.includes(reroll.id ?? reroll.sourceTraitId);
  }

  static _itemRerollGrantCacheKey(actor) {
    const itemSig = Array.from(actor.items ?? [])
      .map(item => [
        item.id ?? item._id ?? '',
        item.type ?? '',
        item.name ?? '',
        item._stats?.modifiedTime ?? item._stats?.lastModified ?? item.system?._revision ?? item.system?.version ?? ''
      ].join(':'))
      .sort()
      .join('|');
    return `${actor.id ?? actor._id ?? 'actor'}::${itemSig}`;
  }

}

/**
 * Register chat message listeners for reroll buttons
 * Call this in system init
 */
export function registerRerollListeners() {
  // Centralized in ChatInteractionBridge. Keep this function as the public
  // compatibility entry point used by init hooks/species index.
  return registerChatInteractionBridge();
}

export default SpeciesRerollHandler;

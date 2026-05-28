/**
 * Minion Creator / Manager
 *
 * Crime Lord and Master Privateer minions are dependent NPC actors, but they are
 * not followers. This module reuses the same owner slot/linkage contract used by
 * followers while tagging created actors as kind "minion" or "privateer".
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { createActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { getHeroicLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { SpeciesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { getFollowerTalentConfig } from "/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js";

const SYSTEM_ID = 'foundryvtt-swse';

function _uniqueById(entries = []) {
  const seen = new Set();
  const out = [];
  for (const entry of entries || []) {
    const id = entry?.id || entry?.actorId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(entry);
  }
  return out;
}

function _isMinionKind(kind) {
  return ['minion', 'privateer'].includes(String(kind || '').toLowerCase());
}

function _minionKindFromSlot(slot = {}) {
  const cfg = getFollowerTalentConfig(slot.talentName) || {};
  return slot.dependentKind || cfg.dependentKind || 'minion';
}

function _minionDisplay(kind) {
  return kind === 'privateer' ? 'Privateer' : 'Minion';
}

function _ownerHeroicLevel(owner) {
  return Math.max(1, Number(getHeroicLevel(owner)) || Number(owner?.system?.level) || 1);
}

function _computeMinionLevel(owner, slot = {}) {
  const cfg = getFollowerTalentConfig(slot.talentName) || {};
  const ratio = Number(slot.minionLevelRatio ?? cfg.minionLevelRatio ?? 0.75) || 0.75;
  const ownerLevel = _ownerHeroicLevel(owner);
  return Math.max(1, Math.floor(ownerLevel * ratio));
}

export class MinionCreator {
  static isMinionSlot(slot) {
    const kind = _minionKindFromSlot(slot);
    return _isMinionKind(kind);
  }

  static getAvailableMinionSlots(ownerActor, kindFilter = null) {
    if (!ownerActor) return [];
    const slots = ownerActor.getFlag(SYSTEM_ID, 'followerSlots') || [];
    return slots.filter(slot => {
      if (slot.createdActorId) return false;
      const kind = _minionKindFromSlot(slot);
      if (!_isMinionKind(kind)) return false;
      return !kindFilter || kind === kindFilter;
    });
  }

  static getMinions(ownerActor, kindFilter = null) {
    if (!ownerActor) return [];
    const ids = new Set();

    for (const entry of ownerActor.getFlag(SYSTEM_ID, 'minions') || []) {
      if (entry?.id) ids.add(entry.id);
    }
    for (const slot of ownerActor.getFlag(SYSTEM_ID, 'followerSlots') || []) {
      if (slot?.createdActorId && this.isMinionSlot(slot)) ids.add(slot.createdActorId);
    }
    for (const entry of ownerActor.system?.ownedActors || []) {
      const kind = entry?.kind || entry?.dependentKind || entry?.npcKind || entry?.typeLabel;
      if (entry?.id && _isMinionKind(kind)) ids.add(entry.id);
    }

    if (game?.actors) {
      for (const candidate of game.actors) {
        const ownerId = candidate?.flags?.swse?.minion?.ownerId || candidate?.system?.npcProfile?.owner?.actorId;
        const kind = candidate?.system?.npcProfile?.kind || candidate?.flags?.swse?.minion?.kind;
        const isMinion = candidate?.system?.isMinion === true
          || candidate?.system?.progression?.isMinion === true
          || candidate?.flags?.swse?.minion?.isMinion === true
          || candidate?.getFlag?.(SYSTEM_ID, 'isMinion') === true;
        if (ownerId === ownerActor.id && isMinion && _isMinionKind(kind)) ids.add(candidate.id);
      }
    }

    return Array.from(ids)
      .map(id => game.actors.get(id))
      .filter(Boolean)
      .filter(actor => !kindFilter || (actor.system?.npcProfile?.kind || actor.flags?.swse?.minion?.kind) === kindFilter);
  }

  static async launchMinionCreation(ownerActor, options = {}) {
    if (!ownerActor || ownerActor.type !== 'character') {
      ui?.notifications?.error?.('Minions can only be created for character actors.');
      return null;
    }

    const allSlots = ownerActor.getFlag(SYSTEM_ID, 'followerSlots') || [];
    const targetSlot = options.slotId
      ? allSlots.find(slot => slot.id === options.slotId && this.isMinionSlot(slot))
      : this.getAvailableMinionSlots(ownerActor, options.kind)[0];

    if (!targetSlot || targetSlot.createdActorId) {
      ui?.notifications?.warn?.(`${ownerActor.name} has no available minion/privateer slots. Gain Attract Minion or Attract Privateer first.`);
      return null;
    }

    const data = await this._showMinionCreationDialog(ownerActor, targetSlot);
    if (!data) return null;

    return this.createMinionFromSlot(ownerActor, targetSlot, data);
  }

  static async _showMinionCreationDialog(ownerActor, slot) {
    await SpeciesRegistry.initialize?.();
    const species = (SpeciesRegistry.getAll?.() || [])
      .map(s => ({ id: s.id || s._id || s.name, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const kind = _minionKindFromSlot(slot);
    const label = _minionDisplay(kind);
    const level = _computeMinionLevel(ownerActor, slot);
    const speciesOptions = species.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    const content = `
      <form class="swse-minion-create-form">
        <p><strong>${slot.talentName}</strong> grants a ${label.toLowerCase()} dependent NPC.</p>
        <p><em>Level will be set to ${level} (${slot.minionLevelLabel || 'three-quarters of owner heroic level'}).</em></p>
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value="${ownerActor.name}'s ${label}" />
        </div>
        <div class="form-group">
          <label>Species</label>
          <select name="speciesRef">
            <option value="">No species item</option>
            ${speciesOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Role / Notes</label>
          <input type="text" name="notes" placeholder="Bodyguard, enforcer, lookout, deckhand..." />
        </div>
      </form>
    `;

    return SWSEDialogV2.prompt({
      title: `Create ${label}`,
      content,
      label: `Create ${label}`,
      callback: html => {
        const root = html?.[0] || html?.element || html;
        const form = root?.querySelector?.('form');
        if (!form) return null;
        const formData = new FormData(form);
        return {
          name: String(formData.get('name') || '').trim(),
          speciesRef: String(formData.get('speciesRef') || '').trim(),
          notes: String(formData.get('notes') || '').trim()
        };
      },
      options: { width: 520, classes: ['swse-dialog', 'swse-minion-create-dialog'] }
    });
  }

  static async createMinionFromSlot(ownerActor, slot, data = {}) {
    if (!ownerActor || !slot) return null;

    const kind = _minionKindFromSlot(slot);
    const label = _minionDisplay(kind);
    const level = _computeMinionLevel(ownerActor, slot);
    const cfg = getFollowerTalentConfig(slot.talentName) || {};
    let speciesDoc = null;

    if (data.speciesRef) {
      try {
        speciesDoc = await SpeciesRegistry.getDocumentByRef?.(data.speciesRef);
      } catch (err) {
        swseLogger.warn('[MinionCreator] Could not resolve species for minion:', err);
      }
    }

    const actorData = {
      name: data.name || `${ownerActor.name}'s ${label}`,
      type: 'npc',
      system: {
        level,
        isMinion: true,
        race: speciesDoc?.name || '',
        hp: { value: Math.max(1, 8 + level), max: Math.max(1, 8 + level) },
        baseAttackBonus: Math.max(0, Math.floor(level * 0.75)),
        progression: {
          isMinion: true,
          minionKind: kind,
          minionChoices: { speciesRef: data.speciesRef || null, notes: data.notes || null },
          grantingTalentName: slot.talentName,
          grantingTalentItemId: slot.talentItemId,
          levelFormula: cfg.minionLevelLabel || 'three-quarters-owner-heroic-level'
        },
        npcProfile: {
          kind,
          mode: 'statblock',
          owner: {
            actorId: ownerActor.id,
            talent: { id: slot.talentItemId || null, name: slot.talentName || null }
          },
          minion: {
            sourceTalent: slot.talentName || null,
            levelRatio: Number(slot.minionLevelRatio ?? cfg.minionLevelRatio ?? 0.75) || 0.75,
            notes: data.notes || null,
            replaceableAfterHours: 24
          },
          notes: data.notes || null
        }
      },
      flags: {
        swse: {
          minion: {
            ownerId: ownerActor.id,
            ownerName: ownerActor.name,
            talentName: slot.talentName || null,
            talentItemId: slot.talentItemId || null,
            kind,
            isMinion: true,
            createdAt: Date.now()
          }
        },
        [SYSTEM_ID]: {
          isMinion: true,
          npcLevelUp: { mode: 'statblock' }
        }
      }
    };

    const minion = await createActor(actorData);
    if (!minion) return null;

    if (speciesDoc) {
      try {
        await ActorEngine.createEmbeddedDocuments(minion, 'Item', [speciesDoc.toObject()], {
          source: 'MinionCreator.applySpecies'
        });
      } catch (err) {
        swseLogger.warn('[MinionCreator] Could not create minion species item:', err);
      }
    }

    await this._applyBaselineMinionMaterial(minion, slot);
    await this._linkMinionToOwner(ownerActor, minion, slot);

    try {
      const { MinionManager } = await import('/systems/foundryvtt-swse/scripts/apps/minion-manager.js');
      await MinionManager.applyExistingEnhancementsToMinion(ownerActor, minion, { silent: true });
    } catch (err) {
      swseLogger.warn('[MinionCreator] Could not apply owner minion enhancements:', err);
    }

    ui?.notifications?.info?.(`${label} "${minion.name}" created.`);
    return minion;
  }

  static async _applyBaselineMinionMaterial(minion, slot) {
    const grantMetadata = {
      source: 'minion-granting-talent',
      talentName: slot.talentName || null,
      talentItemId: slot.talentItemId || null,
      grantedAt: Date.now()
    };
    for (const featName of ['Weapon Proficiency (Simple Weapons)']) {
      await this._addFeatByName(minion, featName, grantMetadata);
    }
  }

  static async _addFeatByName(actor, featName, grantMetadata = null) {
    if (!actor || !featName) return false;
    if (Array.from(actor.items || []).some(i => i.type === 'feat' && i.name === featName)) return false;
    const featDoc = await FeatRegistry.getDocumentByName?.(featName);
    if (!featDoc) return false;
    const featData = featDoc.toObject();
    if (grantMetadata) {
      featData.flags = {
        ...(featData.flags || {}),
        swse: {
          ...(featData.flags?.swse || {}),
          grantedByTalent: grantMetadata,
          minionMaterializedGrant: true
        }
      };
    }
    await ActorEngine.createEmbeddedDocuments(actor, 'Item', [featData], {
      source: 'MinionCreator.addFeatByName'
    });
    return true;
  }

  static async _linkMinionToOwner(ownerActor, minion, slot) {
    const kind = _minionKindFromSlot(slot);
    const link = {
      id: minion.id,
      uuid: minion.uuid,
      name: minion.name,
      type: minion.type,
      kind,
      dependentKind: kind,
      img: minion.img,
      talent: slot.talentName || null,
      notes: minion.system?.npcProfile?.notes || null
    };

    const minions = _uniqueById([...(ownerActor.getFlag(SYSTEM_ID, 'minions') || []), link]);
    await ownerActor.setFlag(SYSTEM_ID, 'minions', minions);

    const ownedActors = _uniqueById([...(ownerActor.system?.ownedActors || []), link]);
    await ActorEngine.updateActor(ownerActor, { 'system.ownedActors': ownedActors }, {
      source: 'MinionCreator.linkMinionToOwner.ownedActors'
    });

    const slots = (ownerActor.getFlag(SYSTEM_ID, 'followerSlots') || []).map(existing => {
      if (existing.id !== slot.id) return existing;
      return { ...existing, createdActorId: minion.id, createdAt: existing.createdAt || Date.now(), filledAt: Date.now() };
    });
    await ownerActor.setFlag(SYSTEM_ID, 'followerSlots', slots);

    const ownerUser = game.users.find(u => u.character?.id === ownerActor.id);
    if (ownerUser) {
      await ActorEngine.updateActor(minion, {
        ownership: { [ownerUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
      }, { source: 'MinionCreator.linkMinionToOwner.ownership' });
    }
  }

  static async updateMinionsForOwnerLevel(ownerActor) {
    const minions = this.getMinions(ownerActor);
    for (const minion of minions) {
      const slot = (ownerActor.getFlag(SYSTEM_ID, 'followerSlots') || [])
        .find(s => s.createdActorId === minion.id);
      if (!slot) continue;
      const level = _computeMinionLevel(ownerActor, slot);
      await ActorEngine.updateActor(minion, {
        'system.level': level,
        'system.hp.max': Math.max(1, 8 + level),
        'system.hp.value': Math.min(Number(minion.system?.hp?.value) || Math.max(1, 8 + level), Math.max(1, 8 + level)),
        'system.baseAttackBonus': Math.max(0, Math.floor(level * 0.75)),
        'system.progression.minionKind': _minionKindFromSlot(slot),
        'system.progression.isMinion': true,
        'system.isMinion': true,
        'flags.swse.minion.isMinion': true,
        [`flags.${SYSTEM_ID}.isMinion`]: true
      }, { source: 'MinionCreator.updateMinionsForOwnerLevel', isRecomputeHPCall: true });
    }
  }
}

Hooks.on('swse:progression:completed', async (data) => {
  if (data?.mode === 'levelup' && data.actor) {
    await MinionCreator.updateMinionsForOwnerLevel(data.actor);
  }
});

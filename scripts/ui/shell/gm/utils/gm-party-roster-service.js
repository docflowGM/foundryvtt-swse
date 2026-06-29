/**
 * GMPartyRosterService
 *
 * Shared authority for the GM-defined party roster. Player-linked characters
 * are treated as party members by default, but the GM may explicitly include or
 * exclude any actor with the foundryvtt-swse.gmPartyMember flag. This lets NPCs,
 * followers, beasts, droids, or temporary guides count as party members without
 * making player ownership the only source of truth.
 */

const SYSTEM_ID = 'foundryvtt-swse';
const PARTY_FLAG = 'gmPartyMember';
const MANAGED_TYPES = new Set(['character', 'npc', 'droid', 'vehicle', 'beast']);

async function actorEngine() {
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  if (!ActorEngine) throw new Error('ActorEngine unavailable for GM party roster mutation.');
  return ActorEngine;
}

function safeCollection(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (collection.contents) return Array.from(collection.contents);
  if (collection.values) return Array.from(collection.values());
  try { return Array.from(collection); } catch (_err) { return []; }
}

function getActorFlag(actor) {
  try {
    return actor?.getFlag?.(SYSTEM_ID, PARTY_FLAG);
  } catch (_err) {
    return undefined;
  }
}

export class GMPartyRosterService {
  static get systemId() { return SYSTEM_ID; }
  static get partyFlag() { return PARTY_FLAG; }

  static getPlayerLinkedActorIds() {
    return new Set(safeCollection(game.users)
      .filter((user) => !user?.isGM)
      .map((user) => user?.character?.id)
      .filter(Boolean));
  }

  static isManagedActor(actor) {
    if (!actor) return false;
    return MANAGED_TYPES.has(actor.type) || actor.system?.isDroid === true || actor.system?.isVehicle === true;
  }

  static isPlayerLinked(actor) {
    if (!actor?.id) return false;
    return this.getPlayerLinkedActorIds().has(actor.id);
  }

  static getOverride(actor) {
    const value = getActorFlag(actor);
    if (value === true) return true;
    if (value === false) return false;
    return null;
  }

  static isPartyMember(actor) {
    if (!actor || !this.isManagedActor(actor)) return false;
    const override = this.getOverride(actor);
    if (override === true) return true;
    if (override === false) return false;
    return this.isPlayerLinked(actor);
  }

  static membershipMeta(actor) {
    const override = this.getOverride(actor);
    const playerLinked = this.isPlayerLinked(actor);
    const inParty = this.isPartyMember(actor);
    let source = 'available';
    let label = 'Available';
    let detail = 'Not currently part of the GM party roster.';

    if (override === true) {
      source = playerLinked ? 'explicit-player' : 'explicit';
      label = playerLinked ? 'GM Included · Player' : 'GM Included';
      detail = playerLinked
        ? 'Player-linked actor explicitly confirmed for the party roster.'
        : 'NPC, follower, droid, beast, or vehicle explicitly added by the GM.';
    } else if (override === false) {
      source = playerLinked ? 'excluded-player' : 'excluded';
      label = playerLinked ? 'Excluded Player' : 'Excluded';
      detail = playerLinked
        ? 'Player-linked actor explicitly removed from the current party roster.'
        : 'Actor explicitly removed from the current party roster.';
    } else if (playerLinked) {
      source = 'player-linked';
      label = 'Player-linked';
      detail = 'Included by default because this actor is assigned to a non-GM user.';
    }

    return {
      inParty,
      playerLinked,
      override,
      source,
      label,
      detail,
      explicit: override !== null,
      explicitlyIncluded: override === true,
      explicitlyExcluded: override === false
    };
  }

  static getManagedActors({ ownedOnly = false } = {}) {
    return safeCollection(game.actors)
      .filter((actor) => this.isManagedActor(actor))
      .filter((actor) => !ownedOnly || actor.isOwner)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }

  static getPartyActors(options = {}) {
    return this.getManagedActors(options).filter((actor) => this.isPartyMember(actor));
  }

  static getAvailableActors(options = {}) {
    return this.getManagedActors(options).filter((actor) => !this.isPartyMember(actor));
  }

  static async setPartyMember(actor, included) {
    if (!actor) throw new Error('Actor does not support flag updates.');
    const ActorEngine = await actorEngine();
    return ActorEngine.updateActorFlags(actor, SYSTEM_ID, PARTY_FLAG, included === true, {
      meta: { guardKey: 'gm-party-roster' }
    });
  }

  static async addMember(actor) {
    return this.setPartyMember(actor, true);
  }

  static async removeMember(actor) {
    return this.setPartyMember(actor, false);
  }

  static async clearOverride(actor) {
    if (!actor) throw new Error('Actor does not support flag updates.');
    const ActorEngine = await actorEngine();
    return ActorEngine.unsetActorFlag(actor, SYSTEM_ID, PARTY_FLAG, {
      meta: { guardKey: 'gm-party-roster' }
    });
  }

  static summarizeActors(actorCards = []) {
    const members = actorCards.filter((card) => card?.inParty);
    return {
      total: members.length,
      playerLinked: members.filter((card) => card.partySource === 'player-linked' || card.partySource === 'explicit-player').length,
      gmAdded: members.filter((card) => card.partySource === 'explicit').length,
      npcs: members.filter((card) => ['npc', 'beast'].includes(card.type)).length,
      droids: members.filter((card) => card.type === 'droid').length,
      vehicles: members.filter((card) => card.type === 'vehicle').length
    };
  }
}

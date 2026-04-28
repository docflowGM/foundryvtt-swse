/**
 * Bulletin State Service
 *
 * Canonical boundary for per-player and party current state.
 * Separate from communication records (Events/Messages) which use Holonet.
 * Stores location, objective, situation for players and party.
 */

export class BulletinStateService {
  static NS = 'foundryvtt-swse';
  static PLAYER_STATE_FLAG = 'bulletin_player_state'; // per-actor flag
  static PARTY_STATE_KEY = 'bulletin_party_state'; // world setting

  /**
   * Get state for a player/character
   */
  static async getPlayerState(actorId) {
    const actor = game.actors?.get(actorId);
    if (!actor) return null;

    const state = actor.getFlag(this.NS, this.PLAYER_STATE_FLAG);
    return state ?? {
      actorId,
      actorName: actor.name,
      location: null,
      objective: null,
      situation: null,
      updatedAt: null
    };
  }

  /**
   * Save state for a player/character
   */
  static async setPlayerState(actorId, stateUpdate) {
    const actor = game.actors?.get(actorId);
    if (!actor) return false;

    const current = await this.getPlayerState(actorId);
    const updated = {
      ...current,
      ...stateUpdate,
      updatedAt: new Date().toISOString()
    };

    await actor.setFlag(this.NS, this.PLAYER_STATE_FLAG, updated);
    return true;
  }

  /**
   * Get party/current state
   */
  static async getPartyState() {
    try {
      const state = await game.settings.get(this.NS, this.PARTY_STATE_KEY);
      return state ?? {
        location: null,
        objective: null,
        situation: null,
        updatedAt: null
      };
    } catch (err) {
      return {
        location: null,
        objective: null,
        situation: null,
        updatedAt: null
      };
    }
  }

  /**
   * Save party/current state
   */
  static async setPartyState(stateUpdate) {
    if (!game.user?.isGM) return false;

    const current = await this.getPartyState();
    const updated = {
      ...current,
      ...stateUpdate,
      updatedAt: new Date().toISOString()
    };

    await game.settings.set(this.NS, this.PARTY_STATE_KEY, updated);
    return true;
  }

  /**
   * Get all player states
   */
  static async getAllPlayerStates() {
    const states = [];
    for (const actor of game.actors?.filter(a => a.type === 'character') ?? []) {
      const state = await this.getPlayerState(actor.id);
      if (state) states.push(state);
    }
    return states;
  }

  /**
   * Initialize Bulletin state settings
   */
  static registerSettings() {
    game.settings.register(this.NS, this.PARTY_STATE_KEY, {
      name: 'Bulletin Party State (internal)',
      scope: 'world',
      config: false,
      type: Object,
      default: {
        location: null,
        objective: null,
        situation: null,
        updatedAt: null
      }
    });
  }
}

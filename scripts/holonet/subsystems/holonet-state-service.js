/**
 * Holonet State Service
 *
 * Canonical state boundary for featured player and party current-state surfaces.
 * These are not disposable message records.
 */

export class HolonetStateService {
  static NS = 'foundryvtt-swse';
  static PLAYER_STATE_KEY = 'holonet_player_state';
  static PARTY_STATE_KEY = 'holonet_party_state';

  static async getAllPlayerState() {
    return game.settings.get(this.NS, this.PLAYER_STATE_KEY) ?? {};
  }

  static async getPlayerState(actorId) {
    const all = await this.getAllPlayerState();
    return all[actorId] ?? {
      actorId,
      location: '',
      objective: '',
      situation: '',
      updatedAt: null,
      updatedBy: null
    };
  }

  static async savePlayerState(actorId, data = {}) {
    if (!game.user?.isGM) return false;
    const all = await this.getAllPlayerState();
    all[actorId] = {
      actorId,
      location: data.location ?? '',
      objective: data.objective ?? '',
      situation: data.situation ?? '',
      updatedAt: new Date().toISOString(),
      updatedBy: game.user?.name ?? 'GM'
    };
    await game.settings.set(this.NS, this.PLAYER_STATE_KEY, all);
    return true;
  }

  static async getPartyState() {
    return game.settings.get(this.NS, this.PARTY_STATE_KEY) ?? {
      location: '',
      objective: '',
      situation: '',
      updatedAt: null,
      updatedBy: null
    };
  }

  static async savePartyState(data = {}) {
    if (!game.user?.isGM) return false;
    const partyState = {
      location: data.location ?? '',
      objective: data.objective ?? '',
      situation: data.situation ?? '',
      updatedAt: new Date().toISOString(),
      updatedBy: game.user?.name ?? 'GM'
    };
    await game.settings.set(this.NS, this.PARTY_STATE_KEY, partyState);
    return true;
  }
}

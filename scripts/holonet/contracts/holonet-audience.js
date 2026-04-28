/**
 * Holonet Audience Contract
 *
 * Defines the audience/recipients for a record
 */

import { AUDIENCE_TYPE } from './enums.js';

export class HolonetAudience {
  constructor(data = {}) {
    this.type = data.type ?? AUDIENCE_TYPE.ALL_PLAYERS;
    this.playerIds = data.playerIds ?? []; // For specific players
    this.threadParticipantIds = data.threadParticipantIds ?? []; // For thread participants
    this.metadata = data.metadata ?? {};
  }

  /**
   * Create all-players audience
   */
  static allPlayers() {
    return new HolonetAudience({
      type: AUDIENCE_TYPE.ALL_PLAYERS
    });
  }

  /**
   * Create single-player audience
   */
  static singlePlayer(playerId) {
    return new HolonetAudience({
      type: AUDIENCE_TYPE.ONE_PLAYER,
      playerIds: [playerId]
    });
  }

  /**
   * Create selected-players audience
   */
  static selectedPlayers(playerIds) {
    return new HolonetAudience({
      type: AUDIENCE_TYPE.SELECTED_PLAYERS,
      playerIds
    });
  }

  /**
   * Create GM-only audience
   */
  static gmOnly() {
    return new HolonetAudience({
      type: AUDIENCE_TYPE.GM_ONLY
    });
  }

  toJSON() {
    return {
      type: this.type,
      playerIds: this.playerIds,
      threadParticipantIds: this.threadParticipantIds,
      metadata: this.metadata
    };
  }
}

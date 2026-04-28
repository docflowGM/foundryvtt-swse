/**
 * Holonet Audience Contract
 *
 * Defines the audience/recipients for a record.
 */

import { AUDIENCE_TYPE } from './enums.js';

export class HolonetAudience {
  constructor(data = {}) {
    this.type = data.type ?? AUDIENCE_TYPE.ALL_PLAYERS;
    this.playerIds = data.playerIds ?? [];
    this.threadParticipantIds = data.threadParticipantIds ?? [];
    this.metadata = data.metadata ?? {};
  }

  static allPlayers() {
    return new HolonetAudience({ type: AUDIENCE_TYPE.ALL_PLAYERS });
  }

  static singlePlayer(playerId) {
    return new HolonetAudience({ type: AUDIENCE_TYPE.ONE_PLAYER, playerIds: [playerId] });
  }

  static selectedPlayers(playerIds) {
    return new HolonetAudience({ type: AUDIENCE_TYPE.SELECTED_PLAYERS, playerIds });
  }

  static gmOnly() {
    return new HolonetAudience({ type: AUDIENCE_TYPE.GM_ONLY });
  }

  static threadParticipants(participantIds) {
    return new HolonetAudience({
      type: AUDIENCE_TYPE.THREAD_PARTICIPANTS,
      threadParticipantIds: participantIds
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

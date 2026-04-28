/**
 * Progression Source Adapter
 *
 * Export seam for progression/leveling events into Holonet
 * Does NOT modify progression system logic.
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetEvent } from '../contracts/holonet-event.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class ProgressionSource {
  static sourceFamily = SOURCE_FAMILY.PROGRESSION;

  /**
   * Create a level-available event
   *
   * @param {Object} data
   * @returns {HolonetEvent}
   */
  static createLevelAvailableEvent(data) {
    const event = new HolonetEvent({
      sourceFamily: this.sourceFamily,
      sourceId: data.actorId,
      intent: INTENT_TYPE.SYSTEM_LEVEL_AVAILABLE,
      sender: HolonetSender.system('Progression'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `Level ${data.newLevel} Available`,
      body: data.body ?? `Your character is ready to advance to level ${data.newLevel}!`,
      priority: 'high',
      metadata: {
        newLevel: data.newLevel,
        previousLevel: data.previousLevel,
        actorId: data.actorId,
        actorName: data.actorName
      }
    });

    return event;
  }

  /**
   * Create a level-completed event
   */
  static createLevelCompletedEvent(data) {
    const event = new HolonetEvent({
      sourceFamily: this.sourceFamily,
      sourceId: data.actorId,
      intent: INTENT_TYPE.SYSTEM_LEVEL_COMPLETED,
      sender: HolonetSender.system('Progression'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `Reached Level ${data.newLevel}`,
      body: data.body ?? `Congratulations! Your character is now level ${data.newLevel}.`,
      priority: 'high',
      metadata: {
        newLevel: data.newLevel,
        previousLevel: data.previousLevel,
        actorId: data.actorId,
        actorName: data.actorName
      }
    });

    return event;
  }

  /**
   * Initialize progression source
   */
  static async initialize() {
    console.log('[Holonet] Progression source initialized (skeleton)');
    // Future: hook into level-up notifications from progression engine
  }
}

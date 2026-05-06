/**
 * Follower Source Adapter
 *
 * Export seam for follower creation and level-up events into Holonet
 * Does NOT modify follower system logic.
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetNotification } from '../contracts/holonet-notification.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class FollowerSource {
  static sourceFamily = SOURCE_FAMILY.FOLLOWER;

  /**
   * Create a follower created notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createFollowerCreatedNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.followerId,
      intent: INTENT_TYPE.FOLLOWER_CREATED,
      sender: HolonetSender.system('Companions'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.followerName || 'A Follower'} Has Joined You`,
      body: data.body ?? `${data.followerName || 'A new companion'} has begun following you.`,
      level: 'success',
      metadata: {
        followerId: data.followerId,
        followerName: data.followerName,
        ownerActorId: data.ownerActorId,
        ownerName: data.ownerName,
        reason: 'created'
      }
    });

    return notification;
  }

  /**
   * Create a follower leveled up notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createFollowerLeveledNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.followerId,
      intent: INTENT_TYPE.FOLLOWER_LEVELED,
      sender: HolonetSender.system('Companions'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.followerName || 'Your Follower'} Has Leveled Up`,
      body: data.body ?? `${data.followerName || 'Your follower'} has reached level ${data.newLevel}.`,
      level: 'success',
      metadata: {
        followerId: data.followerId,
        followerName: data.followerName,
        ownerActorId: data.ownerActorId,
        ownerName: data.ownerName,
        previousLevel: data.previousLevel,
        newLevel: data.newLevel,
        reason: 'level-up'
      }
    });

    return notification;
  }

  /**
   * Initialize follower source
   */
  static async initialize() {
    console.log('[Holonet] Follower source initialized');
  }
}

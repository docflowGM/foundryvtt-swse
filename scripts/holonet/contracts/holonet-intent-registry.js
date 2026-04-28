/**
 * Holonet Intent Registry
 *
 * Canonical mapping of intents to their metadata
 * (display labels, default surfaces, automation rules, etc.)
 */

import { INTENT_TYPE, SURFACE_TYPE } from './enums.js';

export class HolonetIntentRegistry {
  static INTENTS = {
    // Mentor intents
    [INTENT_TYPE.MENTOR_LEVEL_AVAILABLE]: {
      label: 'Mentor: Level Available',
      category: 'mentor',
      defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high',
      icon: 'fas fa-star'
    },
    [INTENT_TYPE.MENTOR_LEVEL_COMPLETED]: {
      label: 'Mentor: Level Completed',
      category: 'mentor',
      defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE],
      priority: 'high'
    },
    [INTENT_TYPE.MENTOR_CHOICE_REVIEW]: {
      label: 'Mentor: Choice Review',
      category: 'mentor',
      defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE],
      priority: 'normal'
    },
    [INTENT_TYPE.MENTOR_BUILD_AFFIRMATION]: {
      label: 'Mentor: Build Affirmation',
      category: 'mentor',
      defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE],
      priority: 'low'
    },
    [INTENT_TYPE.MENTOR_BUILD_WARNING]: {
      label: 'Mentor: Build Warning',
      category: 'mentor',
      defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high'
    },

    // System intents
    [INTENT_TYPE.SYSTEM_TRANSACTION_APPROVED]: {
      label: 'Transaction Approved',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.STORE_NOTICE, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal'
    },
    [INTENT_TYPE.SYSTEM_TRANSACTION_DENIED]: {
      label: 'Transaction Denied',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.STORE_NOTICE, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal'
    },
    [INTENT_TYPE.SYSTEM_LEVEL_AVAILABLE]: {
      label: 'Level Available',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high'
    },
    [INTENT_TYPE.SYSTEM_LEVEL_COMPLETED]: {
      label: 'Level Completed',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
      priority: 'high'
    },
    [INTENT_TYPE.SYSTEM_NEW_MESSAGE]: {
      label: 'New Message',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.MESSENGER_THREAD, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal'
    },

    // Authored intents
    [INTENT_TYPE.BULLETIN_EVENT]: {
      label: 'Bulletin Event',
      category: 'authored',
      defaultSurfaces: [SURFACE_TYPE.BULLETIN_FEATURED, SURFACE_TYPE.HOME_FEED],
      priority: 'high'
    },
    [INTENT_TYPE.BULLETIN_MESSAGE]: {
      label: 'Bulletin Message',
      category: 'authored',
      defaultSurfaces: [SURFACE_TYPE.BULLETIN_FEATURED],
      priority: 'normal'
    },
    [INTENT_TYPE.PLAYER_MESSAGE]: {
      label: 'Player Message',
      category: 'authored',
      defaultSurfaces: [SURFACE_TYPE.MESSENGER_THREAD],
      priority: 'normal'
    },
    [INTENT_TYPE.GM_MESSAGE]: {
      label: 'GM Message',
      category: 'authored',
      defaultSurfaces: [SURFACE_TYPE.MESSENGER_THREAD],
      priority: 'normal'
    }
  };

  /**
   * Get metadata for an intent
   */
  static getIntent(intentType) {
    return this.INTENTS[intentType] ?? null;
  }

  /**
   * Get default surfaces for an intent
   */
  static getDefaultSurfaces(intentType) {
    const intent = this.getIntent(intentType);
    return intent?.defaultSurfaces ?? [];
  }

  /**
   * Get all intents for a category
   */
  static getIntentsByCategory(category) {
    return Object.entries(this.INTENTS)
      .filter(([, meta]) => meta.category === category)
      .map(([key, meta]) => ({ intent: key, ...meta }));
  }

  /**
   * Register custom intent
   */
  static register(intentType, metadata) {
    this.INTENTS[intentType] = metadata;
  }
}

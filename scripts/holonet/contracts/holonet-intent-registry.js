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

    // Additional system intents not previously registered
    [INTENT_TYPE.SYSTEM_TRANSACTION_CLEARED]: {
      label: 'Transaction Cleared',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.STORE_NOTICE],
      priority: 'low'
    },
    [INTENT_TYPE.SYSTEM_ORDER_READY]: {
      label: 'Order Ready',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.STORE_NOTICE, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal'
    },
    [INTENT_TYPE.SYSTEM_NEW_EVENT]: {
      label: 'New Event',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
      priority: 'normal'
    },
    [INTENT_TYPE.SYSTEM_OBJECTIVE_UPDATED]: {
      label: 'Objective Updated',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
      priority: 'normal'
    },
    [INTENT_TYPE.SYSTEM_LOCATION_UPDATED]: {
      label: 'Location Updated',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
      priority: 'low'
    },
    [INTENT_TYPE.SYSTEM_BULLETIN_UPDATED]: {
      label: 'Bulletin Updated',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.BULLETIN_FEATURED, SURFACE_TYPE.HOME_FEED],
      priority: 'normal'
    },
    [INTENT_TYPE.SYSTEM_APPROVAL_RESOLVED]: {
      label: 'Approval Resolved',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal'
    },
    [INTENT_TYPE.SYSTEM_CREDITS_DEPOSITED]: {
      label: 'Credits Deposited',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.STORE_NOTICE, SURFACE_TYPE.HOME_FEED],
      priority: 'normal'
    },

    // Additional mentor intents
    [INTENT_TYPE.MENTOR_OPTION_REVEALED]: {
      label: 'Mentor: Option Revealed',
      category: 'mentor',
      defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE],
      priority: 'normal',
      icon: 'fas fa-eye'
    },
    [INTENT_TYPE.MENTOR_STORY_UNLOCKED]: {
      label: 'Mentor: Story Unlocked',
      category: 'mentor',
      defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE, SURFACE_TYPE.HOME_FEED],
      priority: 'normal',
      icon: 'fas fa-book-open'
    },
    [INTENT_TYPE.MENTOR_STORY_BLOCKED]: {
      label: 'Mentor: Story Blocked',
      category: 'mentor',
      defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE],
      priority: 'low',
      icon: 'fas fa-lock'
    },
    [INTENT_TYPE.MENTOR_CHECK_IN]: {
      label: 'Mentor: Check In',
      category: 'mentor',
      defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE, SURFACE_TYPE.HOME_FEED],
      priority: 'normal',
      icon: 'fas fa-comments'
    },
    [INTENT_TYPE.MENTOR_TRAINING_REMINDER]: {
      label: 'Mentor: Training Reminder',
      category: 'mentor',
      defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE],
      priority: 'low',
      icon: 'fas fa-dumbbell'
    },

    // Additional authored intents
    [INTENT_TYPE.NPC_MESSAGE]: {
      label: 'NPC Message',
      category: 'authored',
      defaultSurfaces: [SURFACE_TYPE.MESSENGER_THREAD],
      priority: 'normal'
    },
    [INTENT_TYPE.PARTY_UPDATE]: {
      label: 'Party Update',
      category: 'authored',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
      priority: 'normal'
    },
    [INTENT_TYPE.PLAYER_UPDATE]: {
      label: 'Player Update',
      category: 'authored',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
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
    },

    // Ship notifications
    [INTENT_TYPE.SHIP_REPAIRED]: {
      label: 'Ship Repaired',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal',
      icon: 'fas fa-wrench'
    },
    [INTENT_TYPE.SHIP_DAMAGED]: {
      label: 'Ship Damaged',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high',
      icon: 'fas fa-explosion'
    },
    [INTENT_TYPE.SHIP_ENGINE_DAMAGED]: {
      label: 'Ship Engine Damaged',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high',
      icon: 'fas fa-triangle-exclamation'
    },
    [INTENT_TYPE.SHIP_SHIELDS_DAMAGED]: {
      label: 'Ship Shields Damaged',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high',
      icon: 'fas fa-shield-halved'
    },
    [INTENT_TYPE.SHIP_SHIELDS_RESTORED]: {
      label: 'Ship Shields Restored',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal',
      icon: 'fas fa-shield'
    },
    [INTENT_TYPE.SHIP_HYPERDRIVE_DAMAGED]: {
      label: 'Ship Hyperdrive Damaged',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'critical',
      icon: 'fas fa-bolt'
    },
    [INTENT_TYPE.SHIP_HYPERDRIVE_REPAIRED]: {
      label: 'Ship Hyperdrive Repaired',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal',
      icon: 'fas fa-wrench'
    },
    [INTENT_TYPE.SHIP_CONDITION_WORSENED]: {
      label: 'Ship Condition Worsened',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high',
      icon: 'fas fa-triangle-exclamation'
    },
    [INTENT_TYPE.SHIP_CONDITION_IMPROVED]: {
      label: 'Ship Condition Improved',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
      priority: 'normal',
      icon: 'fas fa-hand-sparkles'
    },
    [INTENT_TYPE.SHIP_SYSTEM_DAMAGED]: {
      label: 'Ship System Damaged',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high',
      icon: 'fas fa-gears'
    },
    [INTENT_TYPE.SHIP_SYSTEM_REPAIRED]: {
      label: 'Ship System Repaired',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
      priority: 'normal',
      icon: 'fas fa-wrench'
    },
    [INTENT_TYPE.SHIP_STATUS_CHANGED]: {
      label: 'Ship Status Changed',
      category: 'ship',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
      priority: 'normal',
      icon: 'fas fa-ship'
    },

    // Healing/Rest notifications
    [INTENT_TYPE.HEALING_NATURAL_REST]: {
      label: 'Natural Rest Recovery',
      category: 'healing',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal',
      icon: 'fas fa-bed'
    },
    [INTENT_TYPE.HEALING_REST_RESET]: {
      label: 'Rest Reset Recovery',
      category: 'healing',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal',
      icon: 'fas fa-heart-pulse'
    },

    // Store state notifications
    [INTENT_TYPE.STORE_OPENED]: {
      label: 'Store Opened',
      category: 'store',
      defaultSurfaces: [SURFACE_TYPE.STORE_NOTICE, SURFACE_TYPE.HOME_FEED],
      priority: 'normal',
      icon: 'fas fa-door-open'
    },
    [INTENT_TYPE.STORE_CLOSED]: {
      label: 'Store Closed',
      category: 'store',
      defaultSurfaces: [SURFACE_TYPE.STORE_NOTICE],
      priority: 'low',
      icon: 'fas fa-door-closed'
    },
    [INTENT_TYPE.STORE_SALE_STARTED]: {
      label: 'Store Sale',
      category: 'store',
      defaultSurfaces: [SURFACE_TYPE.STORE_NOTICE, SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high',
      icon: 'fas fa-tag'
    },
    [INTENT_TYPE.STORE_TAXED]: {
      label: 'Store Prices Increased',
      category: 'store',
      defaultSurfaces: [SURFACE_TYPE.STORE_NOTICE, SURFACE_TYPE.HOME_FEED],
      priority: 'normal',
      icon: 'fas fa-up-trend'
    },
    [INTENT_TYPE.STORE_PRICES_CHANGED]: {
      label: 'Store Prices Changed',
      category: 'store',
      defaultSurfaces: [SURFACE_TYPE.STORE_NOTICE, SURFACE_TYPE.HOME_FEED],
      priority: 'low',
      icon: 'fas fa-sliders'
    },

    // Droid notifications
    [INTENT_TYPE.DROID_REPAIRED]: {
      label: 'Droid Repaired',
      category: 'droid',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal',
      icon: 'fas fa-screwdriver-wrench'
    },
    [INTENT_TYPE.DROID_DAMAGED]: {
      label: 'Droid Damaged',
      category: 'droid',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high',
      icon: 'fas fa-bolt'
    },
    [INTENT_TYPE.DROID_DISABLED]: {
      label: 'Droid Disabled',
      category: 'droid',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'high',
      icon: 'fas fa-power-off'
    },
    [INTENT_TYPE.DROID_STATUS_CHANGED]: {
      label: 'Droid Status Changed',
      category: 'droid',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
      priority: 'normal',
      icon: 'fas fa-robot'
    },

    // Follower notifications
    [INTENT_TYPE.FOLLOWER_CREATED]: {
      label: 'Follower Created',
      category: 'follower',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal',
      icon: 'fas fa-user-plus'
    },
    [INTENT_TYPE.FOLLOWER_LEVELED]: {
      label: 'Follower Leveled',
      category: 'follower',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED, SURFACE_TYPE.NOTIFICATION_BUBBLE],
      priority: 'normal',
      icon: 'fas fa-person-hiking'
    }
  };

  /**
   * Get metadata for an intent (returns null if not registered; use getIntentMeta for fallback).
   */
  static getIntent(intentType) {
    return this.INTENTS[intentType] ?? null;
  }

  /**
   * Get intent metadata with a safe fallback so no record projects to zero surfaces.
   * Returns registered metadata if present, otherwise infers defaults from the intent string prefix.
   *
   * @param {string} intentType
   * @returns {Object}
   */
  static getIntentMeta(intentType) {
    const registered = this.INTENTS[intentType];
    if (registered) return { ...registered };

    const str = String(intentType ?? '');

    if (str.startsWith('mentor.')) {
      return {
        label: str.replace('mentor.', '').replace(/_/g, ' '),
        category: 'mentor',
        defaultSurfaces: [SURFACE_TYPE.MENTOR_NOTICE, SURFACE_TYPE.HOME_FEED],
        priority: 'normal',
        icon: 'fas fa-user-graduate'
      };
    }
    if (str.startsWith('system.')) {
      return {
        label: str.replace('system.', '').replace(/_/g, ' '),
        category: 'system',
        defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
        priority: 'normal',
        icon: 'fas fa-bell'
      };
    }
    if (str.startsWith('authored.')) {
      return {
        label: str.replace('authored.', '').replace(/_/g, ' '),
        category: 'authored',
        defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
        priority: 'normal',
        icon: 'fas fa-message'
      };
    }
    // Complete unknown — safe fallback
    return {
      label: str || 'Update',
      category: 'system',
      defaultSurfaces: [SURFACE_TYPE.HOME_FEED],
      priority: 'normal',
      icon: 'fas fa-circle-info'
    };
  }

  /**
   * Get default surfaces for an intent (uses getIntentMeta for fallback safety).
   */
  static getDefaultSurfaces(intentType) {
    return this.getIntentMeta(intentType).defaultSurfaces ?? [SURFACE_TYPE.HOME_FEED];
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

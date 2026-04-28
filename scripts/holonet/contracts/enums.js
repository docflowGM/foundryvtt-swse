/**
 * Holonet Canonical Enums
 */

export const RECORD_TYPE = {
  MESSAGE: 'message',
  EVENT: 'event',
  NOTIFICATION: 'notification',
  REQUEST: 'request'
};

export const INTENT_TYPE = {
  // Mentor intents
  MENTOR_LEVEL_AVAILABLE: 'mentor.level_available',
  MENTOR_LEVEL_COMPLETED: 'mentor.level_completed',
  MENTOR_CHOICE_REVIEW: 'mentor.choice_review',
  MENTOR_BUILD_AFFIRMATION: 'mentor.build_affirmation',
  MENTOR_BUILD_WARNING: 'mentor.build_warning',
  MENTOR_OPTION_REVEALED: 'mentor.option_revealed',
  MENTOR_STORY_UNLOCKED: 'mentor.story_unlocked',
  MENTOR_STORY_BLOCKED: 'mentor.story_blocked',
  MENTOR_CHECK_IN: 'mentor.check_in',
  MENTOR_TRAINING_REMINDER: 'mentor.training_reminder',

  // System/notification intents
  SYSTEM_TRANSACTION_APPROVED: 'system.transaction_approved',
  SYSTEM_TRANSACTION_DENIED: 'system.transaction_denied',
  SYSTEM_TRANSACTION_CLEARED: 'system.transaction_cleared',
  SYSTEM_ORDER_READY: 'system.order_ready',
  SYSTEM_LEVEL_AVAILABLE: 'system.level_available',
  SYSTEM_LEVEL_COMPLETED: 'system.level_completed',
  SYSTEM_NEW_MESSAGE: 'system.new_message_received',
  SYSTEM_NEW_EVENT: 'system.new_event_published',
  SYSTEM_OBJECTIVE_UPDATED: 'system.objective_updated',
  SYSTEM_LOCATION_UPDATED: 'system.location_updated',
  SYSTEM_BULLETIN_UPDATED: 'system.bulletin_updated',
  SYSTEM_APPROVAL_RESOLVED: 'system.approval_resolved',
  SYSTEM_CREDITS_DEPOSITED: 'system.credits_deposited',

  // Authored communication
  BULLETIN_EVENT: 'authored.bulletin_event',
  BULLETIN_MESSAGE: 'authored.bulletin_message',
  PLAYER_MESSAGE: 'authored.player_message',
  GM_MESSAGE: 'authored.gm_message',
  NPC_MESSAGE: 'authored.npc_message',
  PARTY_UPDATE: 'authored.party_update',
  PLAYER_UPDATE: 'authored.player_update'
};

export const DELIVERY_STATE = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  ARCHIVED: 'archived'
};

export const LIFECYCLE_STATE = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  PENDING: 'pending',
  DELIVERED: 'delivered',
  READ: 'read',
  UNREAD: 'unread',
  DISMISSED: 'dismissed',
  APPROVED: 'approved',
  DENIED: 'denied'
};

export const RECIPIENT_TYPE = {
  PLAYER: 'player',
  GM: 'gm',
  PERSONA: 'persona'
};

// Personas (future extensibility)
export const PERSONA_TYPE = {
  NPC: 'npc',
  MENTOR: 'mentor',
  VENDOR: 'vendor',
  FACTION_CONTACT: 'faction_contact',
  SHIP_AI: 'ship_ai',
  DROID_CONTACT: 'droid_contact'
};

export const SURFACE_TYPE = {
  HOME_FEED: 'home_feed',
  BULLETIN_FEATURED: 'bulletin_featured',
  NOTIFICATION_BUBBLE: 'notification_bubble',
  MESSENGER_THREAD: 'messenger_thread',
  GM_DATAPAD_BULLETIN: 'gm_datapad_bulletin',
  GM_DATAPAD_APPROVALS: 'gm_datapad_approvals',
  STORE_NOTICE: 'store_notice',
  MENTOR_NOTICE: 'mentor_notice'
};

export const SOURCE_FAMILY = {
  MENTOR: 'mentor',
  STORE: 'store',
  APPROVALS: 'approvals',
  PROGRESSION: 'progression',
  BULLETIN: 'bulletin',
  MESSENGER: 'messenger',
  SYSTEM: 'system',
  GM_AUTHORED: 'gm_authored'
};

export const AUDIENCE_TYPE = {
  ALL_PLAYERS: 'all_players',
  ONE_PLAYER: 'one_player',
  SELECTED_PLAYERS: 'selected_players',
  PARTY: 'party',
  GM_ONLY: 'gm_only',
  GM_AND_PARTY: 'gm_and_party',
  THREAD_PARTICIPANTS: 'thread_participants'
};

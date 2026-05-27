/**
 * Holonet Boundary Helpers
 *
 * Canonical demarcation between Bulletin and Messenger spheres.
 * - Bulletin is GM/system-authored, one-way information for players.
 * - Messenger is conversational/threaded communication between players, GMs,
 *   personas, and system envelopes such as transfer offers.
 * - Notice Center may aggregate both, but it must treat them as separate source
 *   families instead of converting one into the other.
 */

import { RECORD_TYPE, SOURCE_FAMILY } from './enums.js';

export const HOLONET_SPHERE = Object.freeze({
  BULLETIN: 'bulletin',
  MESSENGER: 'messenger',
  NOTICE: 'notice',
  SYSTEM: 'system'
});

export function getHolonetSphere(record = {}) {
  if (record?.sourceFamily === SOURCE_FAMILY.BULLETIN) return HOLONET_SPHERE.BULLETIN;
  if (record?.sourceFamily === SOURCE_FAMILY.MESSENGER || record?.threadId) return HOLONET_SPHERE.MESSENGER;
  if (record?.type === RECORD_TYPE.NOTIFICATION) return HOLONET_SPHERE.NOTICE;
  return HOLONET_SPHERE.SYSTEM;
}

export function isBulletinRecord(record = {}) {
  return getHolonetSphere(record) === HOLONET_SPHERE.BULLETIN;
}

export function isMessengerRecord(record = {}) {
  return getHolonetSphere(record) === HOLONET_SPHERE.MESSENGER;
}

export function normalizeBulletinRecord(record) {
  if (!record) return record;
  record.sourceFamily = SOURCE_FAMILY.BULLETIN;
  record.threadId = null;
  record.parentRecordId = null;
  record.threadContext = null;
  record.metadata = {
    ...(record.metadata ?? {}),
    sphere: HOLONET_SPHERE.BULLETIN,
    oneWay: true,
    replyEnabled: false,
    conversationAllowed: false
  };
  return record;
}

export function normalizeMessengerRecord(record) {
  if (!record) return record;
  record.sourceFamily = SOURCE_FAMILY.MESSENGER;
  record.type = RECORD_TYPE.MESSAGE;
  record.metadata = {
    ...(record.metadata ?? {}),
    sphere: HOLONET_SPHERE.MESSENGER,
    oneWay: false,
    replyEnabled: true,
    conversationAllowed: true
  };
  return record;
}

export function assertHolonetBoundary(record) {
  const sphere = getHolonetSphere(record);
  if (sphere === HOLONET_SPHERE.BULLETIN) {
    normalizeBulletinRecord(record);
    if (record.type === RECORD_TYPE.MESSAGE) {
      throw new Error('Bulletin records must not be conversational message records. Use event/notification records for GM-to-player one-way bulletins.');
    }
  }
  if (sphere === HOLONET_SPHERE.MESSENGER) {
    normalizeMessengerRecord(record);
    if (!record.threadId && record.audience?.type === 'thread_participants') {
      throw new Error('Messenger thread-participant records require a threadId.');
    }
  }
  return record;
}

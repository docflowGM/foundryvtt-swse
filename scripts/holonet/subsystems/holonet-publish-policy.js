/**
 * Holonet Publish Policy
 *
 * Correctness checks the GM runs on player-originated `publish-record` socket
 * requests before persisting them. This is a reliability guard, not a security
 * boundary: the project's players and GMs are trusted, so it deliberately does
 * not restrict who may notify whom (emitters legitimately address the owner of
 * an affected actor from whichever client fired the hook).
 *
 * A request is rejected only when persisting it would be wrong:
 *  - the claimed requester is not a real user (malformed request);
 *  - the record id already exists (a request must never overwrite a record);
 *  - the record resolves to no recipients (it would be saved undeliverable —
 *    the original Home feed defect).
 */

import { HolonetDeliveryRouter } from './holonet-delivery-router.js';
import { HolonetStorage } from './holonet-storage.js';

function deny(reason) {
  return { ok: false, reason };
}

export class HolonetPublishPolicy {
  /**
   * @param {object} record      Hydrated HolonetRecord from the request.
   * @param {string} requesterId Requesting user id.
   * @returns {Promise<{ok:boolean, reason?:string}>}
   */
  static async authorizePlayerPublish(record, requesterId) {
    if (!record) return deny('no_record');
    if (!requesterId || !game.users?.get(requesterId)) return deny('unknown_requester');
    if (record.id && await HolonetStorage.getRecordById(record.id)) return deny('record_id_exists');
    if (!HolonetDeliveryRouter.resolveRecipients(record).length) return deny('no_recipients');
    return { ok: true };
  }

  /** Strip fields a requesting client should not pre-set. Mutates and returns the record. */
  static sanitize(record) {
    record.deliveryStates = new Map();
    record.archivedAt = null;
    return record;
  }
}

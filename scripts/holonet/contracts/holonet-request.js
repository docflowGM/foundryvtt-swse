/**
 * Holonet Request Contract
 *
 * Represents a request/approval-style communication
 * (custom droid approval, custom item approval, etc.)
 */

import { HolonetRecord } from './holonet-record.js';
import { RECORD_TYPE } from './enums.js';

export class HolonetRequest extends HolonetRecord {
  constructor(data = {}) {
    data.type = RECORD_TYPE.REQUEST;
    super(data);

    // Request-specific
    this.requestType = data.requestType ?? null; // 'approval', 'review', 'decision'
    this.requester = data.requester ?? null; // Who is asking
    this.reviewer = data.reviewer ?? null; // Who will review
    this.requestedAction = data.requestedAction ?? null; // 'approve', 'deny', 'review'
    this.deadline = data.deadline ?? null;
    this.decision = data.decision ?? null; // 'approved', 'denied', null
    this.decidedBy = data.decidedBy ?? null;
    this.decidedAt = data.decidedAt ?? null;
    this.decisionNotes = data.decisionNotes ?? null;
  }

  /**
   * Approve this request
   */
  approve(decidedBy, notes = null) {
    this.decision = 'approved';
    this.decidedBy = decidedBy;
    this.decidedAt = new Date().toISOString();
    this.decisionNotes = notes;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Deny this request
   */
  deny(decidedBy, notes = null) {
    this.decision = 'denied';
    this.decidedBy = decidedBy;
    this.decidedAt = new Date().toISOString();
    this.decisionNotes = notes;
    this.updatedAt = new Date().toISOString();
    return this;
  }
}

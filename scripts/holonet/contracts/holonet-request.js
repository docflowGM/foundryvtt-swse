/**
 * Holonet Request Contract
 */

import { HolonetRecord } from './holonet-record.js';
import { RECORD_TYPE } from './enums.js';

export class HolonetRequest extends HolonetRecord {
  constructor(data = {}) {
    data.type = RECORD_TYPE.REQUEST;
    super(data);
    this.requestType = data.requestType ?? null;
    this.requester = data.requester ?? null;
    this.reviewer = data.reviewer ?? null;
    this.requestedAction = data.requestedAction ?? null;
    this.deadline = data.deadline ?? null;
    this.decision = data.decision ?? null;
    this.decidedBy = data.decidedBy ?? null;
    this.decidedAt = data.decidedAt ?? null;
    this.decisionNotes = data.decisionNotes ?? null;
  }

  approve(decidedBy, notes = null) {
    this.decision = 'approved';
    this.decidedBy = decidedBy;
    this.decidedAt = new Date().toISOString();
    this.decisionNotes = notes;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  deny(decidedBy, notes = null) {
    this.decision = 'denied';
    this.decidedBy = decidedBy;
    this.decidedAt = new Date().toISOString();
    this.decisionNotes = notes;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      requestType: this.requestType,
      requester: this.requester,
      reviewer: this.reviewer,
      requestedAction: this.requestedAction,
      deadline: this.deadline,
      decision: this.decision,
      decidedBy: this.decidedBy,
      decidedAt: this.decidedAt,
      decisionNotes: this.decisionNotes
    };
  }
}

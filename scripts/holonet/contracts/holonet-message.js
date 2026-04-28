/**
 * Holonet Message Contract
 */

import { HolonetRecord } from './holonet-record.js';
import { RECORD_TYPE } from './enums.js';

export class HolonetMessage extends HolonetRecord {
  constructor(data = {}) {
    data.type = RECORD_TYPE.MESSAGE;
    super(data);
    this.quotedRecordId = data.quotedRecordId ?? null;
    this.mentions = data.mentions ?? [];
    this.tags = data.tags ?? [];
    this.attachments = data.attachments ?? [];
  }

  toJSON() {
    return {
      ...super.toJSON(),
      quotedRecordId: this.quotedRecordId,
      mentions: this.mentions,
      tags: this.tags,
      attachments: this.attachments
    };
  }
}

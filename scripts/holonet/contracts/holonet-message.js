/**
 * Holonet Message Contract
 *
 * Represents a single message record (player to GM, GM to player, persona, etc.)
 */

import { HolonetRecord } from './holonet-record.js';
import { RECORD_TYPE } from './enums.js';

export class HolonetMessage extends HolonetRecord {
  constructor(data = {}) {
    data.type = RECORD_TYPE.MESSAGE;
    super(data);

    // Message-specific fields
    this.quotedRecordId = data.quotedRecordId ?? null; // For replies
    this.mentions = data.mentions ?? []; // @mentions in message
    this.tags = data.tags ?? []; // #tags in message
    this.attachments = data.attachments ?? []; // References to items, etc.
  }
}

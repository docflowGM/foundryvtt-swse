/**
 * Holonet Projection Surface Contract
 *
 * Represents a surface where a record is projected/displayed
 */

import { SURFACE_TYPE } from './enums.js';

export class HolonetProjectionSurface {
  constructor(data = {}) {
    this.id = data.id ?? foundry.utils.randomID();
    this.surfaceType = data.surfaceType ?? SURFACE_TYPE.HOME_FEED;
    this.recordId = data.recordId ?? null;
    this.projectedAt = data.projectedAt ?? new Date().toISOString();
    this.isPinned = data.isPinned ?? false;
    this.metadata = data.metadata ?? {};
  }

  toJSON() {
    return {
      id: this.id,
      surfaceType: this.surfaceType,
      recordId: this.recordId,
      projectedAt: this.projectedAt,
      isPinned: this.isPinned,
      metadata: this.metadata
    };
  }
}

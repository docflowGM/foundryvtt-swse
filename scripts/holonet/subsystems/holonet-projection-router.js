/**
 * Holonet Projection Router
 *
 * Routes records to their target surfaces (Home feed, Bulletin, Messenger, etc.)
 */

import { SURFACE_TYPE } from '../contracts/enums.js';
import { HolonetIntentRegistry } from '../contracts/holonet-intent-registry.js';
import { HolonetProjectionSurface } from '../contracts/holonet-projection-surface.js';

export class HolonetProjectionRouter {
  /**
   * Determine surfaces for a record based on its intent
   *
   * @param {HolonetRecord} record
   * @returns {HolonetProjectionSurface[]}
   */
  static resolveSurfaces(record) {
    const surfaces = [];
    const defaultSurfaces = HolonetIntentRegistry.getDefaultSurfaces(record.intent);

    for (const surfaceType of defaultSurfaces) {
      surfaces.push(new HolonetProjectionSurface({
        surfaceType,
        recordId: record.id
      }));
    }

    return surfaces;
  }

  /**
   * Check if a record should be projected to a specific surface
   */
  static shouldProject(record, surfaceType) {
    const surfaces = this.resolveSurfaces(record);
    return surfaces.some(s => s.surfaceType === surfaceType);
  }

  /**
   * Add a record to a specific surface
   */
  static addToSurface(record, surfaceType) {
    if (!record.projections) {
      record.projections = [];
    }

    const exists = record.projections.some(p => p.surfaceType === surfaceType);
    if (!exists) {
      record.projections.push(new HolonetProjectionSurface({
        surfaceType,
        recordId: record.id
      }));
    }
  }

  /**
   * Remove a record from a specific surface
   */
  static removeFromSurface(record, surfaceType) {
    if (!record.projections) return;
    record.projections = record.projections.filter(p => p.surfaceType !== surfaceType);
  }

  /**
   * Pin/unpin a record on a surface
   */
  static setPinned(record, surfaceType, isPinned) {
    const projection = record.projections?.find(p => p.surfaceType === surfaceType);
    if (projection) {
      projection.isPinned = isPinned;
    }
  }
}

/**
 * Equipment lifecycle diagnostics.
 *
 * One structured debug line per lifecycle step (intent, plan, execute, route, reconcile, ...), through the existing SWSELogger: it is silent
 * unless the system's `debugMode` setting is on, so normal sessions are not flooded. Each line names the actor, item, request id, the requested
 * operation and the outcome; `verified`/`finalized` distinguish what was persisted and checked from what was only intended. No actor data beyond
 * identifiers and equipment fields is logged.
 */
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export function logEquipmentEvent(stage, data = {}) {
  try {
    if (!SWSELogger.isDev()) return;
    SWSELogger.debug(`[Equipment:${stage}]`, data);
  } catch (_err) { /* diagnostics never affect the operation */ }
}

export default { logEquipmentEvent };

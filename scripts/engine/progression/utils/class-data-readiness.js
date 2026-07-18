import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ClassesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js";

let readinessPromise = null;
let warnedFailure = false;

function getClassesPack() {
  const systemId = globalThis.game?.system?.id || 'foundryvtt-swse';
  return globalThis.game?.packs?.get?.(`${systemId}.classes`)
    || globalThis.game?.packs?.get?.('foundryvtt-swse.classes')
    || null;
}

/**
 * Foundry prepares actors during initializeDocuments, before compendium
 * collections are guaranteed to be available. An unavailable class authority at
 * that point is a startup timing state, not an unknown-class configuration error.
 */
export function isClassDataAuthorityReady() {
  return ClassesRegistry.isInitialized() || !!getClassesPack();
}

/**
 * Wait for the canonical progression registries to finish their ready-phase
 * initialization. All actor calculations share this one promise/hook.
 *
 * @param {object} options
 * @param {number} options.timeoutMs
 * @returns {Promise<boolean>}
 */
export function waitForClassDataAuthority({ timeoutMs = 30000 } = {}) {
  if (isClassDataAuthorityReady()) return Promise.resolve(true);
  if (readinessPromise) return readinessPromise;

  readinessPromise = new Promise((resolve) => {
    let settled = false;
    let timeoutId = null;

    const finish = (ready, reason = '') => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);

      if (!ready && !warnedFailure) {
        warnedFailure = true;
        swseLogger.error(
          `[CLASS-DATA-READINESS] Class authority did not become available${reason ? ` (${reason})` : ''}`
        );
      }

      resolve(ready);
    };

    if (!globalThis.Hooks?.once) {
      finish(false, 'Hooks API unavailable');
      return;
    }

    Hooks.once('swse:progression:initialized', () => {
      finish(
        isClassDataAuthorityReady(),
        'progression initialization completed without ClassesRegistry or the classes pack'
      );
    });

    timeoutId = setTimeout(() => {
      finish(isClassDataAuthorityReady(), `timed out after ${timeoutMs}ms`);
    }, Math.max(1000, Number(timeoutMs) || 30000));
  });

  return readinessPromise;
}

/**
 * SWSE Mutation Trace — Temporary Diagnostic Boundary Logger
 *
 * ⚠️  TEMPORARY — remove once root cause is confirmed. Do NOT leave enabled in prod.
 *
 * ENABLE (browser console):
 *   globalThis.SWSE_DEBUG_MUTATION_TRACE = true
 *   // or:
 *   SWSE.debug.trace.enable()
 *
 * DISABLE:
 *   SWSE.debug.trace.disable()
 *   // or just refresh without setting the flag
 *
 * Provides:
 *   - Feature gate  (isMutationTraceEnabled)
 *   - Actor identity summary  (actorSummary)
 *   - Payload shape summary   (payloadSummary)
 *   - Mutation depth / re-entry tracker  (MutationDepth)
 *   - Structured trace emitter  (traceLog)
 */

// ---------------------------------------------------------------------------
// Feature gate
// ---------------------------------------------------------------------------

/** @returns {boolean} True when trace mode is active */
export function isMutationTraceEnabled() {
  return globalThis.SWSE_DEBUG_MUTATION_TRACE === true;
}

// ---------------------------------------------------------------------------
// Mutation depth — detects re-entrant / concurrent actor updates
// ---------------------------------------------------------------------------

let _depth = 0;
let _traceIdSeed = 0;

export const MutationDepth = {
  /**
   * Call at the top of every updateActor invocation.
   * @returns {number} A unique trace ID for this update.
   */
  enter() {
    _depth++;
    return ++_traceIdSeed;
  },

  /** Call in the finally of every updateActor invocation. */
  exit() {
    if (_depth > 0) _depth--;
  },

  /** Current nesting depth (0 = no update in flight). */
  current() { return _depth; },

  /** True when a second updateActor started before the first one finished. */
  isNested() { return _depth > 1; }
};

// ---------------------------------------------------------------------------
// Actor identity summarizer
// ---------------------------------------------------------------------------

/**
 * Returns a compact, safe description of an actor reference.
 * Never dumps the full actor object.
 *
 * @param {Actor|null|undefined} actor
 * @returns {object}
 */
export function actorSummary(actor) {
  if (!actor) return { error: 'null/undefined actor' };
  try {
    const worldActor = game.actors?.get?.(actor.id);
    return {
      id:           actor.id,
      name:         actor.name,
      type:         actor.type,
      ctor:         actor.constructor?.name ?? '?',
      isActorClass: actor instanceof Actor,
      isWorldRef:   actor === worldActor,
      collection:   actor.collection?.constructor?.name
                      ?? (actor.collection ? 'unknown' : 'null'),
      isToken:      actor.isToken ?? false
    };
  } catch (err) {
    return { error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Payload shape summarizer
// ---------------------------------------------------------------------------

/**
 * Returns a compact description of an update payload.
 * Flags any non-plain values (Actor/Item instances, collections, proxies).
 * Never dumps raw data for large payloads.
 *
 * @param {object|null|undefined} data
 * @returns {object}
 */
export function payloadSummary(data) {
  if (!data || typeof data !== 'object') {
    return { error: `payload is ${typeof data}` };
  }
  try {
    const flat = foundry.utils.flattenObject(data);
    const topLevelKeys = Object.keys(data);
    const suspicious = [];

    for (const [k, v] of Object.entries(flat)) {
      if (v === null || v === undefined) continue;

      // Actor / Item instances are always wrong in a plain update payload
      if (typeof Actor !== 'undefined' && v instanceof Actor) {
        suspicious.push({ key: k, issue: 'Actor instance' });
        continue;
      }
      if (typeof Item !== 'undefined' && v instanceof Item) {
        suspicious.push({ key: k, issue: 'Item instance' });
        continue;
      }

      // Array containing document instances
      if (Array.isArray(v)) {
        const badEl = v.find(el =>
          (typeof Actor !== 'undefined' && el instanceof Actor) ||
          (typeof Item  !== 'undefined' && el instanceof Item)
        );
        if (badEl) {
          suspicious.push({ key: k, issue: `array contains ${badEl.constructor?.name} instance` });
          continue;
        }
      }

      // Document-like: has .update() + .id + .collection
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (typeof v.update === 'function' && v.id && v.collection) {
          suspicious.push({ key: k, issue: `document-like (ctor: ${v.constructor?.name ?? '?'})` });
          continue;
        }
        // Collection-like: constructor name contains "Collection"
        if (v.constructor && /Collection/i.test(v.constructor.name)) {
          suspicious.push({ key: k, issue: `collection-like (${v.constructor.name})` });
          continue;
        }
      }
    }

    return {
      keyCount:      Object.keys(flat).length,
      topLevelKeys,
      hasSuspicious: suspicious.length > 0,
      suspicious
    };
  } catch (err) {
    return { error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Structured trace emitter
// ---------------------------------------------------------------------------

/**
 * Emit a labelled trace log if trace mode is active.
 *
 * Label format: [MUTATION TRACE][STAGE] message
 *
 * @param {string} stage   — e.g. 'SHEET', 'ENGINE', 'ATOMIC', 'HOOK:updateActor'
 * @param {string} msg
 * @param {object} [data]  — extra structured fields
 */
export function traceLog(stage, msg, data = {}) {
  if (!isMutationTraceEnabled()) return;
  console.log(
    `[MUTATION TRACE][${stage}] ${msg}`,
    { _depth: MutationDepth.current(), ...data }
  );
}

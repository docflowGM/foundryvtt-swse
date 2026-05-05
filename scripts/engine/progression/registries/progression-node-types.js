// Extracted from scripts/engine/progression/registries/progression-node-registry.js.

/**
 * Node activation policy enum
 * How does a node become active?
 */
export const ActivationPolicy = Object.freeze({
  /** Node is always owed in these modes/subtypes */
  CANONICAL: 'canonical',

  /** Node appears if prerequisites are met (force, starship) */
  PREREQUISITE: 'prerequisite',

  /** Node appears only on specific level events (level-up only) */
  LEVEL_EVENT: 'level-event',

  /** Node appears only if conditional state exists (e.g., deferred droid build) */
  CONDITIONAL: 'conditional',
});

/**
 * Invalidation behavior enum
 * What happens to downstream selections when this node changes?
 */
export const InvalidationBehavior = Object.freeze({
  /** Remove downstream selection if no longer legal */
  PURGE: 'purge',

  /** Keep but mark dirty/requiring re-validation */
  DIRTY: 'dirty',

  /** Rebuild owed entitlements and recompute active steps */
  RECOMPUTE: 'recompute',

  /** Preserve but surface warning until resolved */
  WARN: 'warn',
});

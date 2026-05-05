/**
 * DEPRECATED COMPATIBILITY SHIM
 *
 * The canonical PROGRESSION_NODE_REGISTRY has been moved to:
 * scripts/engine/progression/registries/progression-node-registry.js
 *
 * This file re-exports all definitions for backward compatibility with legacy
 * apps-layer imports. Apps code should preferentially import from the engine layer.
 *
 * Do not expand this dependency. Extract any new logic into the engine layer
 * instead and import it from there.
 */

// Re-export all registry definitions and helpers from engine layer
export {
  ActivationPolicy,
  InvalidationBehavior,
  PROGRESSION_NODE_REGISTRY,
  getNode,
  getNodesForModeAndSubtype,
  getDownstreamDependents,
  getUpstreamDependencies,
} from "/systems/foundryvtt-swse/scripts/engine/progression/registries/progression-node-registry.js";

/**
 * CurrentConditionResolver
 *
 * Phase 1: Compatibility wrapper for ActorEffectsAggregator.
 * Preserves the public API and behavior while redirecting to the new aggregator.
 *
 * See: scripts/engine/effects/actor-effects-aggregator.js for the actual implementation.
 */

import { ActorEffectsAggregator } from "./actor-effects-aggregator.js";

export class CurrentConditionResolver {
  static build(actor, options = {}) {
    return ActorEffectsAggregator.collect(actor, options);
  }
}

export default CurrentConditionResolver;

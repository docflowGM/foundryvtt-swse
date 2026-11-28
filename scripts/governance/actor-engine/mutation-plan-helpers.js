/**
 * Mutation-plan helpers (3N-AE.1, extracted verbatim from ActorEngine): plan-shape validation, temporary-id rewrite, recovery-snapshot
 * completeness and the derived-state view model. Pure: no document writes. ActorEngine keeps the same-named methods as thin delegates and
 * remains the only mutation gateway. Characterized by tests/actor-engine-plan-helpers.test.mjs.
 */
import { MutationApplicationError } from "/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export function buildDerivedStateViewModel(actor) {

    const abilityKeys = ["str","dex","con","int","wis","cha"];

    const abilities = abilityKeys.map(key => {
      // Canonical total: derived (pre-computed) → attributes base → abilities mirror fallback
      const total = actor.system?.derived?.attributes?.[key]?.total
        ?? actor.system?.attributes?.[key]?.base
        ?? actor.system?.abilities?.[key]?.total
        ?? 10;
      return {
        key,
        label: key.toUpperCase(),
        total,
        mod: Math.floor((total - 10) / 2)
      };
    });

    const currentStep = actor.system?.conditionTrack?.current ?? 0;

    const conditionSteps = Array.from({ length: 5 }).map((_, i) => ({
      index: i,
      active: i <= currentStep
    }));

    return {
      abilities,
      conditionSteps
    };
  }

export function validateRecoverySnapshot(snapshot) {
    const problems = [];
    if (snapshot === null || typeof snapshot !== 'object') return { complete: false, problems: ['snapshot is not an object'] };
    const scope = snapshot.scope ?? 'full-actor';
    const needs = { items: scope !== 'system-and-flags', effects: scope === 'full-actor' || scope === 'transaction-rollback' };
    for (const key of ['items', 'effects']) {
      const docs = snapshot[key];
      if (docs === undefined && !needs[key]) continue;
      if (!Array.isArray(docs)) { problems.push(`${key} is ${docs === undefined ? 'missing' : 'not an array'}`); continue; }
      const ids = docs.map((d) => d?._id);
      if (!ids.every((id) => typeof id === 'string' && id !== '')) problems.push(`${key} has a document without a valid _id`);
      else if (new Set(ids).size !== ids.length) problems.push(`${key} has duplicate _id values`);
    }
    return { complete: problems.length === 0, problems };
  }

export function validateMutationPlan(plan) {
    // Validate create bucket (PHASE 2)
    if (plan.create && typeof plan.create !== 'object') {
      throw new MutationApplicationError('create bucket must be an object', { operation: 'create' });
    }
    if (plan.create && plan.create.actors) {
      if (!Array.isArray(plan.create.actors)) {
        throw new MutationApplicationError(
          'create.actors must be an array',
          { operation: 'create' }
        );
      }
      for (const spec of plan.create.actors) {
        if (!spec.temporaryId || typeof spec.temporaryId !== 'string') {
          throw new MutationApplicationError(
            'create actor spec must have temporaryId (string)',
            { operation: 'create' }
          );
        }
        if (!spec.data || typeof spec.data !== 'object') {
          throw new MutationApplicationError(
            'create actor spec must have data (object)',
            { operation: 'create', temporaryId: spec.temporaryId }
          );
        }
      }
    }

    // Validate set bucket
    if (plan.set && typeof plan.set !== 'object') {
      throw new MutationApplicationError('set bucket must be an object', { operation: 'set' });
    }

    // Validate update bucket
    if (plan.update && typeof plan.update !== 'object') {
      throw new MutationApplicationError('update bucket must be an object', { operation: 'update' });
    }
    if (plan.update) {
      for (const [collection, updates] of Object.entries(plan.update)) {
        if (!Array.isArray(updates)) {
          throw new MutationApplicationError(
            `update bucket "${collection}" must be an array`,
            { operation: 'update', collection }
          );
        }
        for (const update of updates) {
          if (!update || typeof update !== 'object') {
            throw new MutationApplicationError(
              `update bucket "${collection}" entries must be objects`,
              { operation: 'update', collection }
            );
          }
          if (!update._id && !update.id) {
            throw new MutationApplicationError(
              `update bucket "${collection}" entries must include _id or id`,
              { operation: 'update', collection }
            );
          }
        }
      }
    }

    // Validate add bucket
    if (plan.add && typeof plan.add !== 'object') {
      throw new MutationApplicationError('add bucket must be an object', { operation: 'add' });
    }
    if (plan.add) {
      for (const [collection, ids] of Object.entries(plan.add)) {
        if (!Array.isArray(ids)) {
          throw new MutationApplicationError(
            `add bucket "${collection}" must be an array`,
            { operation: 'add', collection }
          );
        }
      }
    }

    // Validate delete bucket
    if (plan.delete && typeof plan.delete !== 'object') {
      throw new MutationApplicationError('delete bucket must be an object', { operation: 'delete' });
    }
    if (plan.delete) {
      for (const [collection, ids] of Object.entries(plan.delete)) {
        if (!Array.isArray(ids)) {
          throw new MutationApplicationError(
            `delete bucket "${collection}" must be an array`,
            { operation: 'delete', collection }
          );
        }
      }
    }
  }

export function rewriteTemporaryIds(targetBucket, tempIdMap) {
    if (!targetBucket || typeof targetBucket !== 'object') {
      return;
    }

    const rewriteValue = (value) => {
      if (typeof value === 'string') {
        if (tempIdMap[value]) {
          const realId = tempIdMap[value];
          SWSELogger.debug('ActorEngine: Rewrote temp ID', {
            temporaryId: value,
            realId
          });
          return realId;
        }

        // Support UUID-like references staged before CREATE, such as
        // Actor.temp_vehicle_x. This is needed for store-acquired assets that
        // are linked into relationship panels in the same atomic mutation.
        for (const [tempId, realId] of Object.entries(tempIdMap)) {
          const tempUuid = `Actor.${tempId}`;
          if (value === tempUuid) return `Actor.${realId}`;
        }
        return value;
      }

      if (Array.isArray(value)) {
        return value.map(entry => rewriteValue(entry));
      }

      if (value && typeof value === 'object') {
        for (const [key, nested] of Object.entries(value)) {
          value[key] = rewriteValue(nested);
        }
        return value;
      }

      return value;
    };

    try {
      for (const [key, value] of Object.entries(targetBucket)) {
        targetBucket[key] = rewriteValue(value);
      }
    } catch (error) {
      throw new MutationApplicationError(
        `Failed to rewrite temporary IDs: ${error.message}`,
        {}
      );
    }
  }

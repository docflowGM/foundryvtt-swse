/**
 * Mutation Merge Logic
 *
 * Combines multiple single-step MutationPlans into one atomic mutation.
 *
 * Architecture:
 * - Each step produces a MutationPlan: { create, set, update, add, delete }
 * - Merge combines N plans in sequence order
 * - Detects conflicts: same path modified twice, add+delete same item, etc.
 * - Result is a single MutationPlan with guaranteed semantics
 *
 * Merge order:
 * 1. DELETE: Union all IDs to delete (can delete same ID multiple times, no conflict)
 * 2. SET: Merge all path→value, detect conflicts (same path, different values)
 * 3. ADD: Union all IDs to add, detect add+delete conflicts
 *
 * Conflict examples:
 * - Step 1 sets system.abilities.str = 15
 * - Step 2 sets system.abilities.str = 18
 * → DeltaConflictError: Conflicting values for same path
 *
 * - Step 1 deletes Item "feat-1"
 * - Step 2 adds Item "feat-1"
 * → DeltaConflictError: Cannot delete and add same item
 */

import {
  DeltaConflictError,
  MutationApplicationError
} from "/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Merge multiple MutationPlans into a single atomic plan.
 *
 * @param {Array<Object>} plans - Array of MutationPlans, in order
 * @param {Object} options
 * @param {boolean} options.detectConflicts - Throw on conflicts (default: true)
 * @returns {Object} Merged MutationPlan: { create, set, update, add, delete }
 * @throws {DeltaConflictError} If conflicts detected and options.detectConflicts=true
 */
export function mergeMutationPlans(...args) {
  let plans = [];
  let options = {};

  if (args.length === 0) {
    return { set: {}, add: {}, delete: {} };
  }

  // Backward compatibility:
  //   mergeMutationPlans([planA, planB], options)
  //   mergeMutationPlans(planA, planB, planC)
  //   mergeMutationPlans(plan)
  if (Array.isArray(args[0])) {
    plans = args[0];
    options = args[1] || {};
  } else {
    const last = args[args.length - 1];
    const lastLooksLikeOptions = last
      && typeof last === 'object'
      && !('set' in last)
      && !('add' in last)
      && !('delete' in last)
      && !('create' in last)
      && !('update' in last)
      && ('detectConflicts' in last);
    options = lastLooksLikeOptions ? last : {};
    plans = lastLooksLikeOptions ? args.slice(0, -1) : args;
  }

  const { detectConflicts = true } = options;
  const planArray = plans.filter(plan => plan && typeof plan === 'object' && Object.keys(plan).length > 0);

  if (!Array.isArray(planArray) || planArray.length === 0) {
    return { set: {}, add: {}, delete: {} };
  }

  swseLogger.debug('mergeMutationPlans', {
    count: planArray.length,
    detectConflicts
  });

  try {
    const merged = {
      create: {},
      set: {},
      update: {},
      add: {},
      delete: {}
    };

    const createConflicts = [];
    const setConflicts = [];
    const updateConflicts = [];
    const addDeleteConflicts = [];
    const updateDeleteConflicts = [];

    for (let i = 0; i < planArray.length; i++) {
      const plan = planArray[i];
      if (!plan || typeof plan !== 'object') continue;

      if (plan.create && plan.create.actors && Array.isArray(plan.create.actors)) {
        merged.create.actors = merged.create.actors || [];
        for (const spec of plan.create.actors) {
          if (!spec || !spec.temporaryId) continue;
          const exists = merged.create.actors.some(s => s.temporaryId === spec.temporaryId);
          if (exists) {
            createConflicts.push({ temporaryId: spec.temporaryId, stepIndex: i, conflictType: 'duplicate_create' });
          }
          merged.create.actors.push(spec);
        }
      }

      if (plan.delete && typeof plan.delete === 'object') {
        for (const [collection, ids] of Object.entries(plan.delete)) {
          if (!Array.isArray(ids)) continue;
          merged.delete[collection] = merged.delete[collection] || [];
          for (const id of ids) {
            if (!merged.delete[collection].includes(id)) merged.delete[collection].push(id);
          }
        }
      }

      if (plan.set && typeof plan.set === 'object') {
        for (const [path, value] of Object.entries(plan.set)) {
          if (merged.set[path] !== undefined && JSON.stringify(merged.set[path]) !== JSON.stringify(value)) {
            setConflicts.push({ path, stepIndex: i, newValue: value, existingValue: merged.set[path] });
          }
          merged.set[path] = value;
        }
      }

      if (plan.update && typeof plan.update === 'object') {
        for (const [collection, updates] of Object.entries(plan.update)) {
          if (!Array.isArray(updates)) continue;
          merged.update[collection] = merged.update[collection] || [];
          for (const update of updates) {
            if (!update || typeof update !== 'object') continue;
            const id = update._id || update.id;
            if (!id) {
              merged.update[collection].push(update);
              continue;
            }
            const existingIndex = merged.update[collection].findIndex(entry => (entry?._id || entry?.id) === id);
            if (existingIndex >= 0) {
              const existing = merged.update[collection][existingIndex];
              for (const [key, value] of Object.entries(update)) {
                if (key === 'id') continue;
                if (key in existing && JSON.stringify(existing[key]) !== JSON.stringify(value)) {
                  updateConflicts.push({ collection, id, field: key, stepIndex: i, existingValue: existing[key], incomingValue: value });
                }
                existing[key] = value;
              }
            } else {
              merged.update[collection].push(update);
            }
          }
        }
      }

      if (plan.add && typeof plan.add === 'object') {
        for (const [collection, docs] of Object.entries(plan.add)) {
          if (!Array.isArray(docs)) continue;
          merged.add[collection] = merged.add[collection] || [];
          for (const doc of docs) {
            if (!merged.add[collection].includes(doc)) merged.add[collection].push(doc);
          }
        }
      }
    }

    for (const [collection, addDocs] of Object.entries(merged.add)) {
      const deleteIds = merged.delete[collection] || [];
      for (const doc of addDocs) {
        const id = typeof doc === 'string' ? doc : (doc?._id || doc?.id);
        if (id && deleteIds.includes(id)) addDeleteConflicts.push({ collection, id, conflictType: 'add_delete' });
      }
    }

    for (const [collection, updates] of Object.entries(merged.update)) {
      const deleteIds = merged.delete[collection] || [];
      for (const update of updates) {
        const id = update?._id || update?.id;
        if (id && deleteIds.includes(id)) updateDeleteConflicts.push({ collection, id, conflictType: 'update_delete' });
      }
    }

    if (detectConflicts) {
      if (createConflicts.length > 0) {
        const first = createConflicts[0];
        throw new DeltaConflictError(`CREATE conflict: duplicate temporaryId "${first.temporaryId}"`, { ...first, allConflicts: createConflicts });
      }
      if (setConflicts.length > 0) {
        const first = setConflicts[0];
        throw new DeltaConflictError(`Multiple steps modify "${first.path}" with conflicting values`, { ...first, allConflicts: setConflicts });
      }
      if (updateConflicts.length > 0) {
        const first = updateConflicts[0];
        throw new DeltaConflictError(`Multiple steps update ${first.collection}.${first.id}.${first.field} with conflicting values`, { ...first, allConflicts: updateConflicts });
      }
      if (addDeleteConflicts.length > 0) {
        const first = addDeleteConflicts[0];
        throw new DeltaConflictError(`Cannot add and delete same document from "${first.collection}"`, { ...first, allConflicts: addDeleteConflicts });
      }
      if (updateDeleteConflicts.length > 0) {
        const first = updateDeleteConflicts[0];
        throw new DeltaConflictError(`Cannot update and delete same document from "${first.collection}"`, { ...first, allConflicts: updateDeleteConflicts });
      }
    }

    if (!merged.create?.actors?.length) delete merged.create;
    if (Object.keys(merged.delete).length === 0) delete merged.delete;
    if (Object.keys(merged.set).length === 0) delete merged.set;
    if (Object.keys(merged.update).length === 0) delete merged.update;
    if (Object.keys(merged.add).length === 0) delete merged.add;

    swseLogger.debug('mergeMutationPlans: Complete', {
      hasCreates: !!merged.create,
      hasSets: !!merged.set,
      hasUpdates: !!merged.update,
      hasAdds: !!merged.add,
      hasDeletes: !!merged.delete,
      conflicts: {
        createConflicts: createConflicts.length,
        setConflicts: setConflicts.length,
        updateConflicts: updateConflicts.length,
        addDeleteConflicts: addDeleteConflicts.length,
        updateDeleteConflicts: updateDeleteConflicts.length
      }
    });

    return merged;
  } catch (error) {
    swseLogger.error('mergeMutationPlans failed:', {
      error: error.message,
      planCount: planArray.length
    });
    throw error;
  }
}

/**
 * Validate a merged plan before applying
 *
 * Checks:
 * - Each bucket is well-formed
 * - No obvious structural issues
 * - No orphaned operations
 *
 * @param {Object} plan - MutationPlan to validate
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateMutationPlan(plan = {}) {
  const errors = [];

  // Validate delete
  if (plan.delete) {
    if (typeof plan.delete !== 'object') {
      errors.push('delete bucket must be an object');
    } else {
      for (const [collection, ids] of Object.entries(plan.delete)) {
        if (!Array.isArray(ids)) {
          errors.push(`delete["${collection}"] must be an array`);
        }
        if (ids.length === 0) {
          errors.push(`delete["${collection}"] is empty (should be removed)`);
        }
      }
    }
  }

  // Validate set
  if (plan.set) {
    if (typeof plan.set !== 'object') {
      errors.push('set bucket must be an object');
    } else {
      for (const [path, value] of Object.entries(plan.set)) {
        if (typeof path !== 'string' || path.length === 0) {
          errors.push('set path must be non-empty string');
        }
        if (value === undefined) {
          errors.push(`set["${path}"] is undefined (use delete instead)`);
        }
      }
    }
  }

  // Validate update
  if (plan.update) {
    if (typeof plan.update !== 'object') {
      errors.push('update bucket must be an object');
    } else {
      for (const [collection, updates] of Object.entries(plan.update)) {
        if (!Array.isArray(updates)) {
          errors.push(`update["${collection}"] must be an array`);
        } else if (updates.length === 0) {
          errors.push(`update["${collection}"] is empty (should be removed)`);
        } else {
          for (const update of updates) {
            if (!update || typeof update !== 'object') {
              errors.push(`update["${collection}"] entries must be objects`);
            } else if (!update._id && !update.id) {
              errors.push(`update["${collection}"] entries must include _id or id`);
            }
          }
        }
      }
    }
  }

  // Validate add
  if (plan.add) {
    if (typeof plan.add !== 'object') {
      errors.push('add bucket must be an object');
    } else {
      for (const [collection, ids] of Object.entries(plan.add)) {
        if (!Array.isArray(ids)) {
          errors.push(`add["${collection}"] must be an array`);
        }
        if (ids.length === 0) {
          errors.push(`add["${collection}"] is empty (should be removed)`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Simulate merging to detect conflicts without applying
 *
 * Useful for validation before committing.
 *
 * @param {Array<Object>} plans - MutationPlans to simulate
 * @returns {Object} { success: boolean, conflicts: Array, merged?: Object }
 */
export function simulateMerge(plans = []) {
  try {
    const merged = mergeMutationPlans(plans, { detectConflicts: true });
    return {
      success: true,
      conflicts: [],
      merged
    };
  } catch (error) {
    if (error instanceof DeltaConflictError) {
      return {
        success: false,
        conflicts: [error.details],
        error: error.message
      };
    }
    throw error;
  }
}

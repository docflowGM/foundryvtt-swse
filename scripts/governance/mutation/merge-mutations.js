/**
 * Mutation Merge Logic
 *
 * Combines multiple single-step MutationPlans into one atomic mutation.
 *
 * Architecture:
 * - Each step produces a MutationPlan: { set, add, delete }
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
} from './mutation-errors.js';
import { swseLogger } from '../../utils/logger.js';

/**
 * Merge multiple MutationPlans into a single atomic plan.
 *
 * @param {Array<Object>} plans - Array of MutationPlans, in order
 * @param {Object} options
 * @param {boolean} options.detectConflicts - Throw on conflicts (default: true)
 * @returns {Object} Merged MutationPlan: { set, add, delete }
 * @throws {DeltaConflictError} If conflicts detected and options.detectConflicts=true
 */
export function mergeMutationPlans(plans = [], options = {}) {
  const { detectConflicts = true } = options;

  if (!Array.isArray(plans) || plans.length === 0) {
    return { set: {}, add: {}, delete: {} };
  }

  swseLogger.debug('mergeMutationPlans', {
    count: plans.length,
    detectConflicts
  });

  try {
    // Phase 1: Merge DELETE buckets
    const merged = {
      set: {},
      add: {},
      delete: {}
    };

    const deleteConflicts = [];
    const setConflicts = [];
    const addDeleteConflicts = [];

    // Collect all operations
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      if (!plan || typeof plan !== 'object') {
        continue;
      }

      // Process DELETE
      if (plan.delete && typeof plan.delete === 'object') {
        for (const [collection, ids] of Object.entries(plan.delete)) {
          if (!Array.isArray(ids)) {
            continue;
          }

          merged.delete[collection] = merged.delete[collection] || [];
          for (const id of ids) {
            // Deleting same thing twice is fine (idempotent)
            if (!merged.delete[collection].includes(id)) {
              merged.delete[collection].push(id);
            }
          }
        }
      }

      // Process SET
      if (plan.set && typeof plan.set === 'object') {
        for (const [path, value] of Object.entries(plan.set)) {
          if (merged.set[path] !== undefined && merged.set[path] !== value) {
            // Conflict: same path, different value
            setConflicts.push({
              path,
              stepIndex: i,
              newValue: value,
              existingValue: merged.set[path]
            });
          }
          merged.set[path] = value;
        }
      }

      // Process ADD
      if (plan.add && typeof plan.add === 'object') {
        for (const [collection, ids] of Object.entries(plan.add)) {
          if (!Array.isArray(ids)) {
            continue;
          }

          merged.add[collection] = merged.add[collection] || [];
          for (const id of ids) {
            // Adding same thing twice is fine (idempotent)
            if (!merged.add[collection].includes(id)) {
              merged.add[collection].push(id);
            }
          }
        }
      }
    }

    // Phase 2: Detect add+delete conflicts
    for (const [collection, addIds] of Object.entries(merged.add)) {
      const deleteIds = merged.delete[collection] || [];
      for (const id of addIds) {
        if (deleteIds.includes(id)) {
          addDeleteConflicts.push({
            collection,
            id,
            conflictType: 'add_delete'
          });
        }
      }
    }

    // Phase 3: Report conflicts if detected
    if (detectConflicts) {
      if (setConflicts.length > 0) {
        const first = setConflicts[0];
        throw new DeltaConflictError(
          `Multiple steps modify "${first.path}" with conflicting values`,
          {
            path: first.path,
            existingValue: first.existingValue,
            incomingValue: first.newValue,
            stepIndex: first.stepIndex,
            allConflicts: setConflicts
          }
        );
      }

      if (addDeleteConflicts.length > 0) {
        const first = addDeleteConflicts[0];
        throw new DeltaConflictError(
          `Cannot add and delete same item from "${first.collection}"`,
          {
            collection: first.collection,
            id: first.id,
            allConflicts: addDeleteConflicts
          }
        );
      }
    }

    // Clean empty buckets
    if (Object.keys(merged.delete).length === 0) {
      delete merged.delete;
    }
    if (Object.keys(merged.set).length === 0) {
      delete merged.set;
    }
    if (Object.keys(merged.add).length === 0) {
      delete merged.add;
    }

    swseLogger.debug('mergeMutationPlans: Complete', {
      hasSets: !!merged.set && Object.keys(merged.set).length > 0,
      hasAdds: !!merged.add && Object.keys(merged.add).length > 0,
      hasDeletes: !!merged.delete && Object.keys(merged.delete).length > 0,
      conflicts: {
        setConflicts: setConflicts.length,
        addDeleteConflicts: addDeleteConflicts.length
      }
    });

    return merged;

  } catch (error) {
    swseLogger.error('mergeMutationPlans failed:', {
      error: error.message,
      planCount: plans.length
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

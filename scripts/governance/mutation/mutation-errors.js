/**
 * Mutation Error Hierarchy
 *
 * Structured error types for the progression mutation pipeline.
 * These enforce clear error boundaries between layers:
 * - Compiler/Merge errors (domain logic)
 * - ActorEngine errors (application logic)
 */

/**
 * Base error for all mutation-related errors
 * Provides structured context for debugging
 */
export class MutationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    this.timestamp = Date.now();
  }

  /**
   * Serialize error for logging/UI
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Format error for user display
   */
  getUserMessage() {
    return this.message;
  }
}

/**
 * Domain Errors (Compiler/Merge Layer)
 *
 * Thrown when progression rules or merge semantics are violated.
 * These indicate invalid user input or step configuration.
 */

/**
 * Thrown when step validation fails
 * Example: Missing required ability choice, invalid class selection
 */
export class ProgressionValidationError extends MutationError {
  constructor(message, details = {}) {
    super(message, {
      layer: 'compiler',
      ...details
    });
  }

  getUserMessage() {
    const { field, reason } = this.details;
    if (field && reason) {
      return `Invalid progression choice: ${field} (${reason})`;
    }
    return `Progression validation failed: ${this.message}`;
  }
}

/**
 * Thrown when merge logic detects a conflict
 * Example: Two steps trying to set same ability to different values
 * Example: Step tries to add and delete same item
 */
export class DeltaConflictError extends MutationError {
  constructor(message, details = {}) {
    super(message, {
      layer: 'merge',
      ...details
    });
  }

  getUserMessage() {
    const { path, collection, existingValue, incomingValue } = this.details;

    if (path) {
      return `Conflict: Cannot modify "${path}" in multiple steps with different values`;
    }

    if (collection) {
      return `Conflict: Cannot add and remove same items from "${collection}"`;
    }

    return `Merge conflict: ${this.message}`;
  }
}

/**
 * Application Errors (ActorEngine Layer)
 *
 * Thrown when actor.update() or embedded document operations fail.
 * These indicate Foundry API issues or actor state problems.
 */

/**
 * Thrown when ActorEngine fails to apply a valid delta
 * Example: actor.update() rejects the mutation
 * Example: embedded document creation fails
 */
export class MutationApplicationError extends MutationError {
  constructor(message, details = {}) {
    super(message, {
      layer: 'engine',
      recoverable: details.recoverable !== false, // default true
      ...details
    });
  }

  getUserMessage() {
    const { operation, path, collection, underlyingError } = this.details;

    if (operation && (path || collection)) {
      const target = path || collection;
      return `Failed to apply change to "${target}": ${underlyingError?.message || this.message}`;
    }

    return `Mutation failed: ${this.message}`;
  }

  /**
   * Check if this error is recoverable
   * Non-recoverable errors indicate serious actor state corruption
   */
  isRecoverable() {
    return this.details.recoverable !== false;
  }
}

/**
 * Error utilities
 */

/**
 * Check if an error is a mutation error
 */
export function isMutationError(error) {
  return error instanceof MutationError;
}

/**
 * Check if error is from a specific layer
 */
export function isFromLayer(error, layer) {
  return error instanceof MutationError && error.details.layer === layer;
}

/**
 * Categorize error for UI display
 */
export function categorizeError(error) {
  if (error instanceof ProgressionValidationError) {
    return 'validation';
  }
  if (error instanceof DeltaConflictError) {
    return 'conflict';
  }
  if (error instanceof MutationApplicationError) {
    return 'application';
  }
  return 'unknown';
}

/**
 * Get appropriate error message for UI
 */
export function getErrorMessage(error) {
  if (error instanceof MutationError) {
    return error.getUserMessage();
  }
  return error?.message || 'An unknown error occurred';
}

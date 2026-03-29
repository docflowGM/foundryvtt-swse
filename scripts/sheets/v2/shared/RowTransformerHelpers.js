/**
 * ROW TRANSFORMER HELPERS
 *
 * Utility functions to help ensure row transformers follow the partial contract:
 * - Idempotent (same input → same output)
 * - Produce standardized row shape
 * - Handle edge cases gracefully
 * - Never reach into actor.system directly
 */

/**
 * Create a standardized row object with all required fields
 *
 * Use this in all row transformers to ensure consistent shape.
 *
 * @param {object} sourceObject - The source item/entry (from actor data)
 * @param {object} config - Configuration with required fields
 * @returns {object} Standardized row object
 *
 * @example
 * function transformInventoryItemRow(item, actor) {
 *   return createStandardRow(item, {
 *     id: item._id,
 *     uuid: item.uuid,
 *     name: item.name,
 *     img: item.img,
 *     type: item.type,
 *     cssClass: `row--${item.type}`,
 *     canEdit: true,
 *     canDelete: item.type !== 'equipped-armor',
 *     tags: item.getFlag('swse', 'tags') || [],
 *     display: {
 *       qty: item.system.quantity,
 *       weight: item.system.weight || 0,
 *       cost: item.system.cost || 0
 *     }
 *   });
 * }
 */
export function createStandardRow(sourceObject, config) {
  // Required fields (must be provided)
  const required = {
    id: config.id ?? sourceObject._id ?? sourceObject.id ?? null,
    uuid: config.uuid ?? sourceObject.uuid ?? null,
    name: config.name ?? sourceObject.name ?? '[Unnamed]',
    img: config.img ?? sourceObject.img ?? 'icons/svg/mystery-man.svg',
    type: config.type ?? sourceObject.type ?? 'miscellaneous',
    cssClass: config.cssClass ?? `row--${config.type ?? sourceObject.type ?? 'default'}`,
    canEdit: config.canEdit !== undefined ? config.canEdit : true,
    canDelete: config.canDelete !== undefined ? config.canDelete : true
  };

  // Optional but common fields
  const row = {
    ...required,
    tags: config.tags ?? [],
    rarity: config.rarity ?? null,
    display: config.display ?? {},
    flags: config.flags ?? {}
  };

  return row;
}

/**
 * Validate that a row transformer is idempotent
 *
 * Call this during development/testing to verify the transformer
 * produces the same output for the same input.
 *
 * @param {function} transformer - The row transformer function
 * @param {object} testData - Sample data to test with
 * @returns {boolean} True if idempotent, false otherwise
 *
 * @example
 * const testItem = actor.items[0];
 * const isIdempotent = validateTransformerIdempotence(
 *   transformInventoryItemRow,
 *   testItem,
 *   actor
 * );
 * if (!isIdempotent) {
 *   console.error('Transformer is not idempotent!');
 * }
 */
export function validateTransformerIdempotence(transformer, testData, ...args) {
  const run1 = transformer(testData, ...args);
  const run2 = transformer(testData, ...args);

  // Deep equality check
  return JSON.stringify(run1) === JSON.stringify(run2);
}

/**
 * Safe fallback function for missing properties
 *
 * Use this when accessing nested properties that might be undefined.
 *
 * @param {object} obj - Object to access
 * @param {string} path - Dot-separated path (e.g., 'system.health.value')
 * @param {*} fallback - Fallback value if path not found
 * @returns {*} Value at path or fallback
 *
 * @example
 * const qty = safeGet(item, 'system.quantity', 1);
 * const weight = safeGet(item, 'system.weight', 0);
 */
export function safeGet(obj, path, fallback = null) {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return fallback;
    }
  }

  return current ?? fallback;
}

/**
 * Create a CSS class based on row type/properties
 *
 * Standardized CSS class generation for rows.
 *
 * @param {object} row - The row object
 * @param {object} options - Options for class generation
 * @returns {string} CSS class string
 *
 * @example
 * const cssClass = createRowCssClass(row, {
 *   baseClass: 'inventory-row',
 *   includeType: true,
 *   includeStatus: true
 * });
 * // → 'inventory-row row--weapon equipped'
 */
export function createRowCssClass(row, options = {}) {
  const classes = [options.baseClass || 'row'];

  // Add type class
  if (options.includeType && row.type) {
    classes.push(`row--${row.type}`);
  }

  // Add status classes
  if (options.includeStatus && row.tags) {
    for (const tag of row.tags) {
      classes.push(`row-status--${tag}`);
    }
  }

  // Add rarity class
  if (options.includeRarity && row.rarity) {
    classes.push(`row-rarity--${row.rarity}`);
  }

  return classes.join(' ');
}

/**
 * Validate row shape matches transformer contract
 *
 * Check that a row has all required fields before returning it.
 *
 * @param {object} row - The row object to validate
 * @param {object} schema - Schema defining required fields
 * @returns {object} {valid: boolean, errors: string[]}
 *
 * @example
 * const validation = validateRowShape(row, {
 *   required: ['id', 'name', 'qty'],
 *   optional: ['rarity', 'tags'],
 *   types: {id: 'string', name: 'string', qty: 'number'}
 * });
 * if (!validation.valid) {
 *   console.error('Row shape invalid:', validation.errors);
 * }
 */
export function validateRowShape(row, schema) {
  const errors = [];

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in row) || row[field] === undefined) {
        errors.push(`Row missing required field: ${field}`);
      }
    }
  }

  // Check types if specified
  if (schema.types) {
    for (const [field, expectedType] of Object.entries(schema.types)) {
      if (field in row && row[field] !== null) {
        const actualType = typeof row[field];
        if (actualType !== expectedType) {
          errors.push(
            `Row.${field} has wrong type: expected ${expectedType}, got ${actualType}`
          );
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
 * Create a transformer wrapper that validates output
 *
 * Wraps a transformer function to verify it produces valid rows.
 * Use during development to catch transformer bugs early.
 *
 * @param {function} transformer - The transformer function
 * @param {object} schema - Row schema for validation
 * @returns {function} Wrapped transformer that validates output
 *
 * @example
 * const safeTransform = createValidatedTransformer(
 *   transformInventoryItemRow,
 *   {required: ['id', 'name', 'qty'], types: {qty: 'number'}}
 * );
 * const row = safeTransform(item, actor);
 * // Throws error if row doesn't match schema
 */
export function createValidatedTransformer(transformer, schema) {
  return function validatedTransformer(...args) {
    const row = transformer(...args);
    const validation = validateRowShape(row, schema);

    if (!validation.valid) {
      throw new Error(
        `Transformer produced invalid row: ${validation.errors.join('; ')}`
      );
    }

    return row;
  };
}

/**
 * Batch-transform entries array with validation
 *
 * Transform an array of items to an array of rows with error handling.
 *
 * @param {array} items - Array of source items
 * @param {function} transformer - Transformer function
 * @param {object} transformContext - Additional context (e.g., actor)
 * @param {boolean} strict - If true, throw on first error; if false, log and continue
 * @returns {object} {rows: [], errors: []}
 *
 * @example
 * const result = transformBatch(
 *   actor.items,
 *   transformInventoryItemRow,
 *   {actor},
 *   false
 * );
 * const validRows = result.rows;
 * if (result.errors.length > 0) {
 *   console.warn(`${result.errors.length} items failed to transform`);
 * }
 */
export function transformBatch(items, transformer, transformContext = {}, strict = false) {
  const rows = [];
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const row = transformer(items[i], transformContext);
      rows.push(row);
    } catch (error) {
      const errorMsg = `Item ${i} failed: ${error.message}`;
      if (strict) {
        throw new Error(errorMsg);
      } else {
        errors.push(errorMsg);
      }
    }
  }

  return {rows, errors};
}

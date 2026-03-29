/**
 * PARTIAL AND SUBPARTIAL CONTRACT VALIDATOR
 *
 * Runtime validation of partial/subpartial context contracts.
 * Ensures panel contexts match declared requirements before rendering.
 */

import { partialRegistry } from './PartialRegistry.js';

class PartialValidator {
  /**
   * Validate a panel context against its contract
   * @param {string} sheetType - 'character' | 'npc' | 'droid'
   * @param {string} panelName - Panel name (healthPanel, inventoryPanel, etc.)
   * @param {object} panelContext - The actual panel context object
   * @returns {object} {valid: boolean, errors: string[]}
   */
  static validatePanelContext(sheetType, panelName, panelContext) {
    const errors = [];
    const metadata = partialRegistry.getPanel(sheetType, panelName);

    if (!metadata) {
      return {
        valid: false,
        errors: [`Panel "${panelName}" not registered for sheet "${sheetType}"`]
      };
    }

    // Check required keys from context contract
    if (metadata.contextContract?.required) {
      for (const requiredKey of metadata.contextContract.required) {
        if (!(requiredKey in panelContext) || panelContext[requiredKey] === undefined) {
          errors.push(`Panel context missing required key: "${requiredKey}"`);
        }
      }
    }

    // Type-specific validation
    switch (metadata.type) {
      case 'ledger':
        this._validateLedgerPanel(panelContext, metadata, errors);
        break;
      case 'svg':
        this._validateSvgPanel(panelContext, metadata, errors);
        break;
      case 'display':
        // Display panels just need required keys checked above
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a row object against its transformer's contract
   * @param {object} row - The row object
   * @param {string} transformerName - Name of row transformer
   * @returns {object} {valid: boolean, errors: string[]}
   */
  static validateRow(row, transformerName) {
    const errors = [];
    const transformerConfig = partialRegistry.getRowTransformer(transformerName);

    if (!transformerConfig) {
      return {
        valid: false,
        errors: [`Row transformer "${transformerName}" not registered`]
      };
    }

    const requiredFields = transformerConfig.outputShape.required;

    // Check all required fields
    for (const field of requiredFields) {
      if (!(field in row) || row[field] === undefined) {
        errors.push(`Row missing required field: "${field}"`);
      }
    }

    // Type validation for common fields
    if ('id' in row && typeof row.id !== 'string') {
      errors.push('Row.id must be string');
    }
    if ('uuid' in row && typeof row.uuid !== 'string') {
      errors.push('Row.uuid must be string');
    }
    if ('name' in row && typeof row.name !== 'string') {
      errors.push('Row.name must be string');
    }
    if ('canEdit' in row && typeof row.canEdit !== 'boolean') {
      errors.push('Row.canEdit must be boolean');
    }
    if ('canDelete' in row && typeof row.canDelete !== 'boolean') {
      errors.push('Row.canDelete must be boolean');
    }

    // Check display object if required
    if (transformerConfig.outputShape.displayFields?.length > 0) {
      if (!row.display || typeof row.display !== 'object') {
        errors.push('Row.display must be object');
      } else {
        for (const field of transformerConfig.outputShape.displayFields) {
          if (!(field in row.display)) {
            errors.push(`Row.display missing field: "${field}"`);
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
   * Validate a ledger panel (entries array)
   * @private
   */
  static _validateLedgerPanel(panelContext, metadata, errors) {
    // Check entries is array
    if (!Array.isArray(panelContext.entries)) {
      errors.push('Ledger panel must have entries as array');
      return; // Can't validate row shapes if entries not array
    }

    if (panelContext.entries.length === 0) {
      // Empty ledger is OK if hasEntries is false
      if (panelContext.hasEntries !== false) {
        errors.push('Empty ledger panel must have hasEntries === false');
      }
      return;
    }

    // Validate hasEntries flag
    if (typeof panelContext.hasEntries !== 'boolean') {
      errors.push('Ledger panel must have hasEntries as boolean');
    }

    // Check emptyState
    if (typeof panelContext.emptyState !== 'string') {
      errors.push('Ledger panel must have emptyState as string');
    }

    // Validate row shapes (sample first row)
    if (metadata.rowTransformer) {
      const firstRow = panelContext.entries[0];
      const rowValidation = this.validateRow(firstRow, metadata.rowTransformer);
      if (!rowValidation.valid) {
        errors.push(`Row validation failed: ${rowValidation.errors[0]}`);
      }
    }

    // Check grouped structure if used
    if (panelContext.grouped) {
      if (typeof panelContext.grouped !== 'object' || Array.isArray(panelContext.grouped)) {
        errors.push('Ledger panel.grouped must be object (not array)');
      }

      if (panelContext.groupBy && typeof panelContext.groupBy !== 'string') {
        errors.push('Ledger panel.groupBy must be string');
      }
    }

    // Check stats if present
    if (panelContext.stats) {
      if (typeof panelContext.stats !== 'object') {
        errors.push('Ledger panel.stats must be object');
      }
    }

    // Check controls if present
    if (panelContext.controls) {
      if (typeof panelContext.controls !== 'object') {
        errors.push('Ledger panel.controls must be object');
      }
    }
  }

  /**
   * Validate an SVG-backed panel
   * @private
   */
  static _validateSvgPanel(panelContext, metadata, errors) {
    // Check required SVG metadata
    if (!panelContext.imagePath) {
      errors.push('SVG panel missing imagePath');
    }

    if (!panelContext.dimensions) {
      errors.push('SVG panel missing dimensions');
    } else {
      if (typeof panelContext.dimensions.width !== 'number') {
        errors.push('SVG panel.dimensions.width must be number');
      }
      if (typeof panelContext.dimensions.height !== 'number') {
        errors.push('SVG panel.dimensions.height must be number');
      }
    }

    // Check safe area
    if (!panelContext.safeArea) {
      errors.push('SVG panel missing safeArea definition');
    } else {
      const {x, y, width, height} = panelContext.safeArea;
      if (typeof x !== 'number' || typeof y !== 'number') {
        errors.push('SVG panel.safeArea must have x, y as numbers');
      }
      if (typeof width !== 'number' || typeof height !== 'number') {
        errors.push('SVG panel.safeArea must have width, height as numbers');
      }
    }

    // Check anchors
    if (panelContext.anchors && typeof panelContext.anchors === 'object') {
      for (const [anchorName, anchor] of Object.entries(panelContext.anchors)) {
        if (typeof anchor.x !== 'number' || typeof anchor.y !== 'number') {
          errors.push(`SVG anchor "${anchorName}" missing x/y coordinates`);
        }
        if (!anchor.size) {
          errors.push(`SVG anchor "${anchorName}" missing size`);
        }
      }
    }
  }

  /**
   * Validate subpartial data
   * @param {object} data - Data passed to subpartial
   * @param {string} subpartialName - Name of subpartial
   * @returns {object} {valid: boolean, errors: string[]}
   */
  static validateSubpartialData(data, subpartialName) {
    const errors = [];
    const subpartialConfig = partialRegistry.getSubpartial(subpartialName);

    if (!subpartialConfig) {
      return {
        valid: false,
        errors: [`Subpartial "${subpartialName}" not registered in manifest`]
      };
    }

    // Validate based on data source
    switch (subpartialConfig.dataSource) {
      case 'row':
        // Subpartial receives a row, validate it
        if (subpartialConfig.panel) {
          const panelMetadata = partialRegistry.getPanel(subpartialConfig.sheet, subpartialConfig.panel);
          if (panelMetadata?.rowTransformer) {
            const rowValidation = this.validateRow(data, panelMetadata.rowTransformer);
            if (!rowValidation.valid) {
              errors.push(...rowValidation.errors);
            }
          }
        }
        break;

      case 'parent-property':
        // Subpartial receives nested property from parent
        if (subpartialConfig.requiredParentProperties?.length > 0) {
          for (const prop of subpartialConfig.requiredParentProperties) {
            if (!(prop in data)) {
              errors.push(`Subpartial data missing property: "${prop}"`);
            }
          }
        }
        break;

      case 'nested-context':
        // Subpartial receives dedicated sub-view-model
        // Just check it's an object
        if (!data || typeof data !== 'object') {
          errors.push('Subpartial nested-context must be object');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a panel context likely has forbidden direct actor.system access
   * This is a heuristic check, not perfect
   * @param {object} panelContext - The panel context
   * @returns {string[]} Array of suspected issues
   */
  static detectForbiddenPatterns(panelContext) {
    const issues = [];

    // Check for suspicious key names that suggest actor.system copies
    const suspiciousKeys = ['system', 'actor', 'derived', 'legacy'];
    for (const key of Object.keys(panelContext)) {
      if (suspiciousKeys.includes(key)) {
        issues.push(`Panel context has suspicious key: "${key}" (likely copied from actor)`);
      }
    }

    // Check for nested structures that look like unfiltered actor.system
    if (panelContext.items && Array.isArray(panelContext.items)) {
      const firstItem = panelContext.items[0];
      if (firstItem?.system) {
        issues.push('Panel.items contains raw actor items (expected transformed rows)');
      }
    }

    return issues;
  }
}

export { PartialValidator };

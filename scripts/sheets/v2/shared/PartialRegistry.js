/**
 * PARTIAL AND SUBPARTIAL REGISTRY
 *
 * Centralized registry and manifest for all panel partials and subpartials.
 * Provides discovery, validation, and contract enforcement.
 *
 * This system ensures:
 * - Every partial has declared metadata
 * - Subpartials are discoverable and validated
 * - Registry/code alignment is verifiable
 * - Context contracts are documented
 * - Reusability across sheets is visible
 */

class PartialRegistry {
  constructor() {
    /**
     * Master list of all partial metadata by sheet type
     * Structure: {sheetType: {panelName: metadata}}
     */
    this.panels = {};

    /**
     * Manifest for rapid subpartial discovery
     * Structure: {subpartialName: {panel, sheet, template, ...}}
     */
    this.subpartialManifest = {};

    /**
     * Row transformer catalog
     * Structure: {transformerName: {sourceType, outputShape, validator}}
     */
    this.rowTransformers = {};
  }

  /**
   * Register a panel partial with its full metadata
   * @param {string} sheetType - 'character' | 'npc' | 'droid' | etc.
   * @param {string} panelName - camelCase panel name (healthPanel, inventoryPanel, etc.)
   * @param {object} metadata - Panel metadata (see structure below)
   */
  registerPanel(sheetType, panelName, metadata) {
    if (!this.panels[sheetType]) {
      this.panels[sheetType] = {};
    }

    // Validate metadata structure
    this._validatePanelMetadata(panelName, metadata);

    this.panels[sheetType][panelName] = {
      // Identity
      name: panelName,
      sheet: sheetType,
      type: metadata.type, // 'display' | 'ledger' | 'svg'

      // Implementation
      builderName: metadata.builderName,
      validatorName: metadata.validatorName,
      templatePath: metadata.templatePath,

      // Data contract
      contextContract: metadata.contextContract,

      // Row transformer (if ledger-style)
      rowTransformer: metadata.rowTransformer || null,
      rowContract: metadata.rowContract || null,

      // Subpartials used by this panel
      subpartials: metadata.subpartials || [],

      // Post-render assertions
      postRenderAssertions: metadata.postRenderAssertions || [],

      // Reusability
      reusableBy: metadata.reusableBy || [],
      reusability: metadata.reusability || 'none',

      // Notes
      notes: metadata.notes || ''
    };

    // Register subpartials in manifest
    if (metadata.subpartials && metadata.subpartials.length > 0) {
      for (const subpartial of metadata.subpartials) {
        this._registerSubpartialInManifest(panelName, sheetType, subpartial);
      }
    }
  }

  /**
   * Register a row transformer with its contract
   * @param {string} transformerName - e.g., 'transformInventoryItemRow'
   * @param {object} config - Transformer config
   */
  registerRowTransformer(transformerName, config) {
    this.rowTransformers[transformerName] = {
      name: transformerName,
      sourceType: config.sourceType, // 'item' | 'talent' | 'protocol' | etc.
      outputShape: {
        required: config.requiredFields || ['id', 'uuid', 'name', 'img', 'type', 'cssClass', 'canEdit', 'canDelete'],
        optional: config.optionalFields || ['tags', 'rarity', 'flags'],
        displayFields: config.displayFields || []
      },
      validatorName: config.validatorName || null,
      idempotent: config.idempotent !== false, // Transformers should be idempotent by default
      notes: config.notes || ''
    };
  }

  /**
   * Get panel metadata by sheet and panel name
   */
  getPanel(sheetType, panelName) {
    return this.panels[sheetType]?.[panelName] || null;
  }

  /**
   * Get all panels for a sheet type
   */
  getPanelsForSheet(sheetType) {
    return this.panels[sheetType] || {};
  }

  /**
   * Get all reusable panels (panels that can be used by multiple sheets)
   */
  getReusablePanels() {
    const reusable = {};
    for (const [sheetType, panels] of Object.entries(this.panels)) {
      for (const [panelName, metadata] of Object.entries(panels)) {
        if (metadata.reusability === 'full' || metadata.reusability === 'partial') {
          reusable[panelName] = metadata;
        }
      }
    }
    return reusable;
  }

  /**
   * Get subpartial metadata by name
   */
  getSubpartial(subpartialName) {
    return this.subpartialManifest[subpartialName] || null;
  }

  /**
   * Get all subpartials for a panel
   */
  getSubpartialsForPanel(sheetType, panelName) {
    const panel = this.getPanel(sheetType, panelName);
    return panel?.subpartials || [];
  }

  /**
   * Get row transformer metadata
   */
  getRowTransformer(transformerName) {
    return this.rowTransformers[transformerName] || null;
  }

  /**
   * Query: Can a panel be reused by this sheet type?
   */
  canReusePanel(panelName, targetSheetType) {
    for (const [sheetType, panels] of Object.entries(this.panels)) {
      if (panelName in panels) {
        const metadata = panels[panelName];
        return metadata.reusableBy.includes(targetSheetType) || sheetType === targetSheetType;
      }
    }
    return false;
  }

  /**
   * Verify registry consistency
   * Checks for:
   * - Builder names match panel names
   * - Validator names are declared
   * - Template paths are valid structure
   * - Subpartials are properly documented
   */
  auditConsistency() {
    const issues = [];

    for (const [sheetType, panels] of Object.entries(this.panels)) {
      for (const [panelName, metadata] of Object.entries(panels)) {
        const panelKey = `${sheetType}.${panelName}`;

        // Check builder/validator naming
        if (!metadata.builderName?.match(/^build[A-Z]/)) {
          issues.push({
            severity: 'error',
            panel: panelKey,
            issue: `Invalid builder name: ${metadata.builderName}`,
            expected: 'build<PanelName>Panel()'
          });
        }

        if (!metadata.validatorName?.match(/^validate[A-Z]/)) {
          issues.push({
            severity: 'error',
            panel: panelKey,
            issue: `Invalid validator name: ${metadata.validatorName}`,
            expected: 'validate<PanelName>Panel()'
          });
        }

        // Check template path
        if (!metadata.templatePath?.endsWith('.hbs')) {
          issues.push({
            severity: 'error',
            panel: panelKey,
            issue: `Invalid template path: ${metadata.templatePath}`,
            expected: 'Path ending in .hbs'
          });
        }

        // Check context contract
        if (!metadata.contextContract) {
          issues.push({
            severity: 'warn',
            panel: panelKey,
            issue: 'Missing contextContract documentation'
          });
        }

        // Validate subpartials
        if (metadata.subpartials?.length > 0) {
          for (const sub of metadata.subpartials) {
            if (!sub.name || !sub.templatePath) {
              issues.push({
                severity: 'error',
                panel: panelKey,
                issue: `Subpartial missing required fields: ${JSON.stringify(sub)}`
              });
            }

            if (!sub.dataSource) {
              issues.push({
                severity: 'error',
                panel: panelKey,
                issue: `Subpartial "${sub.name}" missing dataSource declaration`
              });
            }
          }
        }
      }
    }

    return issues;
  }

  // ===== Private Methods =====

  _validatePanelMetadata(panelName, metadata) {
    if (!metadata.type) throw new Error(`Panel "${panelName}" missing type`);
    if (!metadata.builderName) throw new Error(`Panel "${panelName}" missing builderName`);
    if (!metadata.validatorName) throw new Error(`Panel "${panelName}" missing validatorName`);
    if (!metadata.templatePath) throw new Error(`Panel "${panelName}" missing templatePath`);
  }

  _registerSubpartialInManifest(panelName, sheetType, subpartialConfig) {
    const subpartialName = subpartialConfig.name;

    this.subpartialManifest[subpartialName] = {
      name: subpartialName,
      panel: panelName,
      sheet: sheetType,
      template: subpartialConfig.template,
      dataSource: subpartialConfig.dataSource, // 'row' | 'parent-property' | 'nested-context'
      dataSourcePath: subpartialConfig.dataSourcePath || null,
      validatorName: subpartialConfig.validatorName || null,
      requiredParentProperties: subpartialConfig.requiredParentProperties || [],
      description: subpartialConfig.description || '',
      postRenderAssertions: subpartialConfig.postRenderAssertions || []
    };
  }
}

// Export singleton instance
export const partialRegistry = new PartialRegistry();

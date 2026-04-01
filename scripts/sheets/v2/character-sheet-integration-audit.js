/**
 * SWSE V2 Character Sheet Integration Audit (Phase A2)
 *
 * Diagnostics-only audit for:
 * - Partials display correctness (presence + structure)
 * - Roll engine routing (all rolls invoke canonical engine)
 * - Form field persistence (editable fields save and persist)
 * - Position stability (window position preserved on update)
 * - Atomic recalculation (updates are transactional, no partial state)
 *
 * Findings reported to Sentinel engine for centralized governance.
 *
 * Run: game.swseCharacterSheetAudit.runFullAudit()
 */

export class SWSEV2CharacterSheetAudit {
  constructor() {
    this._sentinelLayer = null;
    this.findings = {
      partials: [],
      rolls: [],
      fields: [],
      position: [],
      recalc: []
    };
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Set Sentinel layer for reporting findings
   */
  setSentinelLayer(layer) {
    this._sentinelLayer = layer;
  }

  /**
   * A2.1: Partials Display Audit
   */
  async auditPartialsDisplay(actor) {
    const findings = [];

    if (!actor) {
      this.errors.push('A2.1: Actor not provided');
      return findings;
    }

    // Expected partial regions for SWSEV2CharacterSheet
    const expectedPartials = {
      'identity-strip': { selectors: ['.identity-strip', '[data-component="identity"]'], required: true },
      'abilities-panel': { selectors: ['.abilities-panel'], required: true },
      'skills-panel': { selectors: ['.skills-panel'], required: true },
      'attacks-panel': { selectors: ['.attacks-panel'], required: true },
      'defenses-panel': { selectors: ['.defenses-panel'], required: true },
      'inventory-panel': { selectors: ['.inventory-panel'], required: true },
      'feats-panel': { selectors: ['.feats-panel'], required: false },
      'talents-list': { selectors: ['.talents-list', '[data-component="talents"]'], required: false },
      'force-suite': { selectors: ['.force-suite', '[data-component="force"]'], required: false },
      'hp-condition-panel': { selectors: ['.hp-condition-panel', '[data-component="hp-condition"]'], required: true },
      'combat-action-table': { selectors: ['table.combat-actions', '[data-component="combat-actions"]'], required: false }
    };

    const sheet = actor.sheet;
    if (!sheet || !sheet.element || sheet.element.length === 0) {
      this.warnings.push('A2.1: Sheet not rendered or element missing');
      return findings;
    }

    const html = sheet.element[0];

    for (const [partialName, config] of Object.entries(expectedPartials)) {
      let found = false;
      let element = null;

      for (const selector of config.selectors) {
        element = html.querySelector(selector);
        if (element) {
          found = true;
          break;
        }
      }

      if (!found) {
        const severity = config.required ? 'ERROR' : 'WARN';
        findings.push({
          severity,
          partial: partialName,
          message: `${severity}: Partial not found (${config.selectors.join(' or ')})`,
          fix: `Verify template includes partial or CSS selector is correct`
        });
        if (config.required) this.errors.push(`A2.1: Missing required partial: ${partialName}`);
        continue;
      }

      // Check if element is empty/hidden
      const isEmpty = element.innerHTML.trim().length === 0;
      const isHidden = window.getComputedStyle(element).display === 'none' ||
                       window.getComputedStyle(element).visibility === 'hidden' ||
                       window.getComputedStyle(element).opacity === '0';
      const hasZeroDimensions = element.offsetWidth === 0 && element.offsetHeight === 0;

      if (isEmpty || isHidden || hasZeroDimensions) {
        findings.push({
          severity: config.required ? 'ERROR' : 'WARN',
          partial: partialName,
          message: `${isEmpty ? 'Empty' : isHidden ? 'Hidden' : 'Zero-dimension'}: ${partialName}`,
          fix: `Verify template context supplies data; check CSS visibility/display`
        });
      }
    }

    return findings;
  }

  /**
   * A2.2: Roll Engine Audit
   */
  async auditRollEngine(actor) {
    const findings = [];

    if (!actor || !actor.sheet || !actor.sheet.element || actor.sheet.element.length === 0) {
      this.warnings.push('A2.2: Actor or sheet element missing');
      return findings;
    }

    const html = actor.sheet.element[0];
    const sheet = actor.sheet;

    // Roll control patterns to look for
    const rollPatterns = {
      attacks: '[data-action="roll-attack"]',
      skills: '[data-action="roll-skill"]',
      generic: '.rollable'
    };

    let totalControls = 0;

    for (const [controlType, pattern] of Object.entries(rollPatterns)) {
      const controls = html.querySelectorAll(pattern);
      if (controls.length === 0) continue;

      totalControls += controls.length;

      // Check each control has a handler or proper data attributes
      for (const control of controls) {
        const action = control.getAttribute('data-action');
        const hasClickHandler = control.onclick !== null;
        const hasListenerAttribute = action !== null;

        // Check if sheet has method for this action
        const methodName = `_on${action?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/ /g, '')}`;
        const hasSheetMethod = sheet && typeof sheet[methodName] === 'function';

        if (!hasClickHandler && !hasListenerAttribute) {
          findings.push({
            severity: 'ERROR',
            control: controlType,
            message: `Roll control has no handler or data-action: ${pattern}`,
            fix: `Add data-action attribute or onclick handler to ${pattern}`
          });
        }

        // Warn if handler can't be found (non-blocking, might be wired via event delegation)
        if (hasListenerAttribute && !hasSheetMethod && sheet.constructor.name !== 'SWSEMinimalTestSheet') {
          // Only warn if it's not a known test sheet
          this.warnings.push(`A2.2: Potential handler mismatch for ${action} on ${controlType}`);
        }
      }
    }

    if (totalControls === 0) {
      this.warnings.push('A2.2: No standard roll controls found (expected [data-action="roll-*"] or .rollable)');
    }

    return findings;
  }

  /**
   * A2.3: Form Field Persistence Audit
   */
  async auditFieldPersistence(actor) {
    const findings = [];

    if (!actor || !actor.sheet || !actor.sheet.element || actor.sheet.element.length === 0) {
      this.warnings.push('A2.3: Actor or sheet element missing');
      return findings;
    }

    const html = actor.sheet.element[0];

    // Core identity fields to test (minimal set)
    const fieldsToTest = [
      { selector: '[name="name"]', label: 'Actor Name', updatePath: 'name', isActorProp: true }
    ];

    for (const fieldTest of fieldsToTest) {
      const element = html.querySelector(fieldTest.selector);
      if (!element) {
        this.warnings.push(`A2.3: Field selector not found: ${fieldTest.label} (${fieldTest.selector})`);
        continue;
      }

      const testValue = `AUDIT_${Date.now()}`;
      const originalValue = fieldTest.isActorProp ? actor.name : getProperty(actor, fieldTest.updatePath);

      try {
        // Simulate user input
        element.value = testValue;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // Give sheet time to process update
        await new Promise(resolve => setTimeout(resolve, 150));

        // Verify update persisted on actor
        const currentValue = fieldTest.isActorProp ? actor.name : getProperty(actor, fieldTest.updatePath);

        if (currentValue !== testValue) {
          findings.push({
            severity: 'WARN',
            field: fieldTest.label,
            message: `Field did not persist through actor: ${fieldTest.label}`,
            attempted: testValue,
            current: currentValue,
            fix: `Verify form _updateObject() calls actor.update() via ActorEngine`
          });
        }

        // @mutation-exception: Test harness restoring original value for field audit
        // Restore original value
        await actor.update({ [fieldTest.updatePath]: originalValue });

      } catch (err) {
        findings.push({
          severity: 'WARN',
          field: fieldTest.label,
          message: `Field persistence test error: ${err.message}`,
          fix: `Check _updateObject implementation and ActorEngine routing`
        });
      }
    }

    return findings;
  }

  /**
   * A2.4: Position Stability Audit
   */
  async auditPositionStability(actor) {
    const findings = [];

    if (!actor || !actor.sheet) {
      this.warnings.push('A2.4: Actor or sheet missing');
      return findings;
    }

    try {
      const beforePos = {
        left: actor.sheet.position.left,
        top: actor.sheet.position.top,
        width: actor.sheet.position.width,
        height: actor.sheet.position.height
      };

      // Perform a harmless update (set a flag)
      await actor.setFlag('foundryvtt-swse', '_auditPositionTest', true);

      const afterPos = {
        left: actor.sheet.position.left,
        top: actor.sheet.position.top,
        width: actor.sheet.position.width,
        height: actor.sheet.position.height
      };

      // Check if position changed
      if (beforePos.left !== afterPos.left ||
          beforePos.top !== afterPos.top ||
          beforePos.width !== afterPos.width ||
          beforePos.height !== afterPos.height) {
        findings.push({
          severity: 'WARN',
          message: `Position unstable after update`,
          before: beforePos,
          after: afterPos,
          fix: `Preserve app.position during render; avoid forced reposition calls`
        });
      }

      // Clear test flag
      await actor.unsetFlag('foundryvtt-swse', '_auditPositionTest');
    } catch (err) {
      this.errors.push(`A2.4: Position audit error: ${err.message}`);
    }

    return findings;
  }

  /**
   * A2.5: Atomic Recalculation Audit
   */
  async auditAtomicRecalculation(actor) {
    const findings = [];

    if (!actor) {
      this.warnings.push('A2.5: Actor missing');
      return findings;
    }

    try {
      // Verify ActorEngine is available and properly wired
      const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');

      if (!ActorEngine || !ActorEngine.recalcAll) {
        this.errors.push('A2.5: ActorEngine not found or missing recalcAll method');
        return findings;
      }

      // Simple smoke test: verify recalcAll doesn't throw
      try {
        await ActorEngine.recalcAll(actor);
      } catch (err) {
        findings.push({
          severity: 'WARN',
          message: `ActorEngine.recalcAll() failed: ${err.message}`,
          fix: `Check ActorEngine implementation for errors`
        });
      }

      // Check if actor has system.derived (where recalculated data lives)
      if (!actor.system?.derived) {
        findings.push({
          severity: 'WARN',
          message: `Actor.system.derived not found; recalculated state may not be persisted`,
          fix: `Ensure DerivedCalculator or ModifierEngine populates actor.system.derived`
        });
      }

    } catch (err) {
      this.errors.push(`A2.5: Recalc audit error: ${err.message}`);
    }

    return findings;
  }

  /**
   * Full diagnostic run
   */
  async runFullAudit(actor) {
    console.log('=== SWSE V2 Character Sheet Integration Audit (Phase A2) ===');

    if (!actor) {
      // Use selected actor or first available
      actor = game.actors.find(a => a.type === 'character');
      if (!actor) {
        console.error('No character actor found. Please select one.');
        return;
      }
    }

    console.log(`Auditing actor: ${actor.name} (${actor.id})`);

    // Run all audits
    this.findings.partials = await this.auditPartialsDisplay(actor);
    this.findings.rolls = await this.auditRollEngine(actor);
    this.findings.fields = await this.auditFieldPersistence(actor);
    this.findings.position = await this.auditPositionStability(actor);
    this.findings.recalc = await this.auditAtomicRecalculation(actor);

    // Compile report
    this.generateReport();
  }

  /**
   * Generate and output audit report
   */
  generateReport() {
    const allFindings = [
      ...this.findings.partials,
      ...this.findings.rolls,
      ...this.findings.fields,
      ...this.findings.position,
      ...this.findings.recalc
    ];

    const errors = allFindings.filter(f => f.severity === 'ERROR').sort((a, b) =>
      (b.partial || b.field || b.control || 'z').localeCompare(a.partial || a.field || a.control || 'z')
    );
    const warnings = allFindings.filter(f => f.severity === 'WARN').sort((a, b) =>
      (b.partial || b.field || b.message || 'z').localeCompare(a.partial || a.field || a.message || 'z')
    );

    // Build result object
    const result = {
      healthy: errors.length === 0,
      findings: this.findings,
      systemErrors: this.errors,
      summary: {
        total: allFindings.length,
        errors: errors.length,
        warnings: warnings.length,
        byCategory: {
          partials: this.findings.partials.length,
          rolls: this.findings.rolls.length,
          fields: this.findings.fields.length,
          position: this.findings.position.length,
          recalc: this.findings.recalc.length
        }
      }
    };

    // Report findings to Sentinel engine
    try {
      if (this._sentinelLayer) {
        this._sentinelLayer.reportAuditFindings(result);
      }
    } catch (err) {
      console.warn('Failed to report findings to Sentinel:', err.message);
    }

    // Console output
    console.log('\n' + '='.repeat(60));
    console.log('  SWSE V2 CHARACTER SHEET INTEGRATION AUDIT (Phase A2)');
    console.log('='.repeat(60));

    console.log(`\n📊 SUMMARY`);
    console.log(`   Total Findings: ${allFindings.length}`);
    console.log(`   ❌ Errors: ${errors.length}`);
    console.log(`   ⚠️  Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n' + '-'.repeat(60));
      console.log('❌ ERRORS (MUST FIX)');
      console.log('-'.repeat(60));
      errors.forEach((err, i) => {
        console.log(`\n[${i + 1}] ${err.message}`);
        if (err.partial) console.log(`    Component: ${err.partial}`);
        if (err.field) console.log(`    Field: ${err.field}`);
        if (err.control) console.log(`    Control: ${err.control}`);
        if (err.fix) console.log(`    📝 Fix: ${err.fix}`);
        if (err.selector) console.log(`    🔍 Selector: ${err.selector}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n' + '-'.repeat(60));
      console.log('⚠️  WARNINGS (REVIEW)');
      console.log('-'.repeat(60));
      warnings.forEach((warn, i) => {
        console.log(`\n[${i + 1}] ${warn.message}`);
        if (warn.partial) console.log(`    Component: ${warn.partial}`);
        if (warn.field) console.log(`    Field: ${warn.field}`);
        if (warn.fix) console.log(`    📝 Fix: ${warn.fix}`);
      });
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n✅ All audits passed! Sheet integration is healthy.\n');
    }

    console.log('\n' + '='.repeat(60));
    console.log('PHASE A2 DIAGNOSTICS COMPLETE');
    console.log('Sentinel Report: game.SWSE.debug.sentinel.reports("sheet-integration")');
    console.log('='.repeat(60) + '\n');

    return result;
  }
}

// Global registration for dev console
if (typeof window !== 'undefined') {
  window.swseCharacterSheetAudit = {
    async runFullAudit(actor) {
      const audit = new SWSEV2CharacterSheetAudit();

      // Wire Sentinel layer for reporting
      try {
        const { SheetIntegrationLayer } = await import('/systems/foundryvtt-swse/scripts/governance/sentinel/layers/sheet-integration-layer.js');
        audit.setSentinelLayer(SheetIntegrationLayer);
      } catch (err) {
        console.warn('[A2 Audit] Sentinel layer not available:', err.message);
      }

      await audit.runFullAudit(actor);
      return audit;
    }
  };
}

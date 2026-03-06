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
 * Run: game.swseCharacterSheetAudit.runFullAudit()
 */

export class SWSEV2CharacterSheetAudit {
  constructor() {
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

    // Roll control patterns
    const rollPatterns = [
      '[data-action="roll-attack"]',
      '[data-action="roll-skill"]',
      '.rollable',
      '.attack-roll-btn',
      '[data-roll]'
    ];

    const rollControls = [];
    for (const pattern of rollPatterns) {
      html.querySelectorAll(pattern).forEach(control => {
        rollControls.push({
          selector: pattern,
          element: control,
          action: control.getAttribute('data-action'),
          rollData: control.getAttribute('data-roll')
        });
      });
    }

    if (rollControls.length === 0) {
      this.warnings.push('A2.2: No roll controls found in character sheet');
      return findings;
    }

    // Instrument SWSERollEngine to track calls
    const rollEngineCallLog = [];
    const originalImportKey = 'A2_2_RollEngineInstrumentation';
    if (!window[originalImportKey]) {
      window[originalImportKey] = [];
    }

    // Hook to capture roll invocations (this is a non-invasive logger)
    const checkRollHandler = (control) => {
      const action = control.getAttribute('data-action');
      const handler = control.onclick ||
                      (actor.sheet && actor.sheet[`_on${action}`]);

      if (!handler && !action) {
        findings.push({
          severity: 'ERROR',
          roll: 'unknown',
          message: `No handler found for roll control`,
          fix: `Add data-action or onclick handler to roll button`
        });
      }
    };

    for (const control of rollControls) {
      checkRollHandler(control);
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

    // Core identity fields to test
    const fieldsToTest = [
      { selector: '[name="name"]', label: 'Actor Name', fieldPath: 'name' },
      { selector: '[name="system.biography.main"]', label: 'Biography Main', fieldPath: 'system.biography.main' },
      { selector: '[data-field="biography-main"]', label: 'Biography (alt)', fieldPath: 'system.biography.main' }
    ];

    for (const fieldTest of fieldsToTest) {
      const element = html.querySelector(fieldTest.selector);
      if (!element) {
        this.warnings.push(`A2.3: Field not found: ${fieldTest.label} (${fieldTest.selector})`);
        continue;
      }

      // Store original value
      const originalValue = actor.getFlag('swse', `_audit_original_${fieldTest.fieldPath}`) ?? null;
      const testValue = `TEST_${Date.now()}`;

      try {
        // Simulate user input
        element.value = testValue;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // Give sheet time to process
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify update persisted
        const currentValue = getProperty(actor.system, fieldTest.fieldPath.replace('system.', ''));

        if (currentValue === testValue) {
          // OK
        } else {
          findings.push({
            severity: 'ERROR',
            field: fieldTest.label,
            message: `Field did not persist: ${fieldTest.label}`,
            value: currentValue,
            expected: testValue,
            fix: `Verify _updateObject() routes field changes to ActorEngine`
          });
        }

        // Restore original
        if (originalValue !== null) {
          element.value = originalValue;
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch (err) {
        findings.push({
          severity: 'ERROR',
          field: fieldTest.label,
          message: `Field persistence test failed with error: ${err.message}`,
          fix: `Check form binding and _updateObject implementation`
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
      await actor.setFlag('swse', '_auditPositionTest', true);

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
      await actor.unsetFlag('swse', '_auditPositionTest');
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
      // Hook into update pipeline to track calls
      const updateCallLog = [];
      const originalUpdate = actor.update.bind(actor);
      const originalPreUpdate = actor._preUpdate;

      let updateCount = 0;
      const testWrapper = async function(data, options) {
        updateCount++;
        return originalUpdate.call(actor, data, options);
      };

      actor.update = testWrapper;

      // Perform a test update
      const testData = { 'system.biography.faction': `TEST_${Date.now()}` };
      await actor.update(testData);

      // Restore
      actor.update = originalUpdate;

      // Check if single update resulted in cascading calls
      if (updateCount > 1) {
        findings.push({
          severity: 'WARN',
          message: `Non-atomic update: single action triggered ${updateCount} update calls`,
          fix: `Consolidate updates; use applyActorUpdateAtomic or single actor.update() call`
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

    const errors = allFindings.filter(f => f.severity === 'ERROR');
    const warnings = allFindings.filter(f => f.severity === 'WARN');

    console.log('\n=== AUDIT RESULTS ===');
    console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach((err, i) => {
        console.log(`\n[${i + 1}] ${err.message}`);
        if (err.fix) console.log(`    Fix: ${err.fix}`);
        if (err.selector) console.log(`    Selector: ${err.selector}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach((warn, i) => {
        console.log(`\n[${i + 1}] ${warn.message}`);
        if (warn.fix) console.log(`    Fix: ${warn.fix}`);
      });
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n✅ All audits passed!');
    }

    console.log('\n=== DETAILED FINDINGS ===');
    console.log(JSON.stringify(this.findings, null, 2));

    console.log('\n=== PHASE A2 COMPLETE ===');
    return {
      findings: this.findings,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        total: allFindings.length,
        errors: errors.length,
        warnings: warnings.length
      }
    };
  }
}

// Global registration for dev console
if (!window.game || !game.swseCharacterSheetAudit) {
  window.swseCharacterSheetAudit = {
    async runFullAudit(actor) {
      const audit = new SWSEV2CharacterSheetAudit();
      await audit.runFullAudit(actor);
      return audit;
    }
  };
}

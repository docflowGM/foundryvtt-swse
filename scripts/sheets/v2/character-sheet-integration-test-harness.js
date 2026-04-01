/**
 * SWSE V2 Character Sheet Integration Test Harness
 *
 * Phase B: After-fix validation
 *
 * Quick tests for:
 * - Character sheet renders without errors
 * - Roll buttons are clickable and wired
 * - Form fields persist changes
 * - Sheet position stays stable
 *
 * Usage:
 *   game.SWSE.debug.auditors.characterSheetA2.harness()
 */

export class CharacterSheetIntegrationTestHarness {
  constructor(actor = null) {
    this.actor = actor;
    this.results = {
      pass: [],
      fail: [],
      skip: []
    };
  }

  /**
   * Test: Sheet renders without console errors
   */
  async testSheetRenders() {
    const testName = 'Sheet Renders Without Errors';

    if (!this.actor || !this.actor.sheet) {
      this.results.skip.push(`${testName}: No actor sheet`);
      return;
    }

    try {
      const html = this.actor.sheet.element?.[0];
      if (!html) throw new Error('Sheet element not found');

      // Check for common error patterns
      const hasContent = html.innerHTML.length > 0;
      const visible = html.style.display !== 'none';

      if (hasContent && visible) {
        this.results.pass.push(testName);
      } else {
        this.results.fail.push(`${testName}: Sheet empty or hidden`);
      }
    } catch (err) {
      this.results.fail.push(`${testName}: ${err.message}`);
    }
  }

  /**
   * Test: Attack roll button is clickable
   */
  async testAttackRollButton() {
    const testName = 'Attack Roll Button Exists';

    try {
      const html = this.actor.sheet?.element?.[0];
      if (!html) {
        this.results.skip.push(`${testName}: No sheet`);
        return;
      }

      const btn = html.querySelector('[data-action="roll-attack"]');
      if (btn && !btn.disabled && btn.offsetParent !== null) {
        this.results.pass.push(testName);
      } else {
        this.results.fail.push(`${testName}: Button missing, disabled, or hidden`);
      }
    } catch (err) {
      this.results.fail.push(`${testName}: ${err.message}`);
    }
  }

  /**
   * Test: Skill roll button is clickable
   */
  async testSkillRollButton() {
    const testName = 'Skill Roll Button Exists';

    try {
      const html = this.actor.sheet?.element?.[0];
      if (!html) {
        this.results.skip.push(`${testName}: No sheet`);
        return;
      }

      const btn = html.querySelector('[data-action="roll-skill"]');
      if (btn && !btn.disabled && btn.offsetParent !== null) {
        this.results.pass.push(testName);
      } else {
        this.results.fail.push(`${testName}: Button missing, disabled, or hidden`);
      }
    } catch (err) {
      this.results.fail.push(`${testName}: ${err.message}`);
    }
  }

  /**
   * Test: Core panels are visible
   */
  async testCorePanelsVisible() {
    const testName = 'Core Panels Visible';

    try {
      const html = this.actor.sheet?.element?.[0];
      if (!html) {
        this.results.skip.push(`${testName}: No sheet`);
        return;
      }

      const panelSelectors = [
        '.abilities-panel',
        '.skills-panel',
        '.hp-condition-panel'
      ];

      let visiblePanels = 0;
      for (const selector of panelSelectors) {
        const panel = html.querySelector(selector);
        if (panel && window.getComputedStyle(panel).display !== 'none') {
          visiblePanels++;
        }
      }

      if (visiblePanels >= 2) {
        this.results.pass.push(testName);
      } else {
        this.results.fail.push(`${testName}: Only ${visiblePanels} of 3 core panels visible`);
      }
    } catch (err) {
      this.results.fail.push(`${testName}: ${err.message}`);
    }
  }

  /**
   * Test: Actor name field persists
   */
  async testActorNamePersistence() {
    const testName = 'Actor Name Persists';

    if (!this.actor) {
      this.results.skip.push(`${testName}: No actor`);
      return;
    }

    try {
      const originalName = this.actor.name;
      const testName_ = `TEST_${Date.now()}`;

      // @mutation-exception: Test harness testing actor.update functionality
      // Use actor.update (proper path, not field input)
      await this.actor.update({ name: testName_ });  // @mutation-exception: Test harness - widget functionality test
      const updated = this.actor.name;

      if (updated === testName_) {
        // @mutation-exception: Test harness restoring original value
        // Restore
        await this.actor.update({ name: originalName });  // @mutation-exception: Test harness - widget restoration
        this.results.pass.push(testName);
      } else {
        this.results.fail.push(`${testName}: Value not persisted (got ${updated}, expected ${testName_})`);
      }
    } catch (err) {
      this.results.fail.push(`${testName}: ${err.message}`);
    }
  }

  /**
   * Test: Window position is stable
   */
  async testWindowPositionStable() {
    const testName = 'Window Position Stable After Update';

    if (!this.actor || !this.actor.sheet) {
      this.results.skip.push(`${testName}: No actor sheet`);
      return;
    }

    try {
      const before = {
        left: this.actor.sheet.position.left,
        top: this.actor.sheet.position.top
      };

      // Small update
      await this.actor.setFlag('foundryvtt-swse', '_testPositionStable', true);

      const after = {
        left: this.actor.sheet.position.left,
        top: this.actor.sheet.position.top
      };

      // Clean up
      await this.actor.unsetFlag('foundryvtt-swse', '_testPositionStable');

      if (before.left === after.left && before.top === after.top) {
        this.results.pass.push(testName);
      } else {
        this.results.fail.push(`${testName}: Position moved from (${before.left},${before.top}) to (${after.left},${after.top})`);
      }
    } catch (err) {
      this.results.fail.push(`${testName}: ${err.message}`);
    }
  }

  /**
   * Run all tests
   */
  async runAll() {
    if (!this.actor) {
      // Auto-select first character if not provided
      this.actor = game.actors.find(a => a.type === 'character');
      if (!this.actor) {
        console.error('No character actor found.');
        return;
      }
    }

    console.log(`\n🧪 Character Sheet Integration Test Harness`);
    console.log(`   Actor: ${this.actor.name}`);
    console.log(`   Sheet: ${this.actor.sheet?.constructor.name || 'none'}\n`);

    await this.testSheetRenders();
    await this.testAttackRollButton();
    await this.testSkillRollButton();
    await this.testCorePanelsVisible();
    await this.testActorNamePersistence();
    await this.testWindowPositionStable();

    return this.printResults();
  }

  /**
   * Print results
   */
  printResults() {
    const totalPass = this.results.pass.length;
    const totalFail = this.results.fail.length;
    const totalSkip = this.results.skip.length;
    const totalTests = totalPass + totalFail + totalSkip;

    console.log('─'.repeat(60));
    console.log(`✅ PASSED: ${totalPass}  |  ❌ FAILED: ${totalFail}  |  ⏭️  SKIPPED: ${totalSkip}`);
    console.log('─'.repeat(60));

    if (this.results.pass.length > 0) {
      console.log('\n✅ PASSES:');
      this.results.pass.forEach(t => console.log(`   • ${t}`));
    }

    if (this.results.fail.length > 0) {
      console.log('\n❌ FAILURES:');
      this.results.fail.forEach(t => console.log(`   ✗ ${t}`));
    }

    if (this.results.skip.length > 0) {
      console.log('\n⏭️  SKIPPED:');
      this.results.skip.forEach(t => console.log(`   ○ ${t}`));
    }

    console.log(`\n📊 Total: ${totalTests} tests`);
    console.log(`   Passed Rate: ${totalPass > 0 ? Math.round((totalPass / (totalPass + totalFail)) * 100) : 0}%\n`);

    return {
      passed: totalPass,
      failed: totalFail,
      skipped: totalSkip,
      results: this.results
    };
  }
}

// Global registration
if (!window.SWSE) window.SWSE = { debug: { auditors: {} } };
if (!window.SWSE.debug) window.SWSE.debug = { auditors: {} };
if (!window.SWSE.debug.auditors) window.SWSE.debug.auditors = {};
if (!window.SWSE.debug.auditors.characterSheetA2) window.SWSE.debug.auditors.characterSheetA2 = {};

window.SWSE.debug.auditors.characterSheetA2.harness = async (actor) => {
  const harness = new CharacterSheetIntegrationTestHarness(actor);
  return await harness.runAll();
};

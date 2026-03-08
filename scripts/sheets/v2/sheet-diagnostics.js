/**
 * V2 Sheet Diagnostics Utility
 * Comprehensive context + rendering verification for character sheets
 * Integrates with Sentinel for unified reporting
 *
 * Usage: SWSEV2SheetDiagnostics.runDiagnostics()
 */

export class SWSEV2SheetDiagnostics {
  /**
   * Run all diagnostics and return formatted report
   * @param {Actor} actor - Actor to diagnose (defaults to current user's character)
   * @returns {string} Formatted diagnostic report
   */
  static async runDiagnostics(actor = null) {
    // Use default actor if not provided
    if (!actor) {
      actor = game.user.character ?? (await game.actors.getName("ceci"));
    }

    if (!actor) {
      return "❌ ERROR: No actor found. Please select a character first.";
    }

    const lines = [];
    const timestamp = new Date().toISOString();

    // Header
    lines.push('═'.repeat(100));
    lines.push('V2 SHEET DIAGNOSTICS REPORT');
    lines.push('═'.repeat(100));
    lines.push(`Timestamp: ${timestamp}`);
    lines.push(`Actor: ${actor.name} (${actor.type})`);
    lines.push(`System: SWSE (Foundry VTT v13)`);
    lines.push('');

    // Render the sheet to ensure context is fresh
    try {
      await actor.sheet.render(true);
    } catch (e) {
      lines.push(`⚠️  Warning: Sheet render had issues: ${e.message}`);
    }

    // Get fresh context
    let context = {};
    try {
      context = await actor.sheet._prepareContext?.({}) || {};
    } catch (e) {
      lines.push(`❌ CRITICAL: Cannot prepare context: ${e.message}`);
      return lines.join('\n');
    }

    // SECTION 1: Context Hydration
    lines.push('┌' + '─'.repeat(98) + '┐');
    lines.push('│ SECTION 1: CONTEXT HYDRATION (Phase 1 + Phase 2 Fixes)');
    lines.push('└' + '─'.repeat(98) + '┘');

    const checks = {
      // Phase 1 Fixes
      'derived.talents.groups': context.derived?.talents?.groups,
      'derived.skills': context.derived?.skills,
      'forcePoints': context.forcePoints,
      'derived.attacks.list': context.derived?.attacks?.list,
      'derived.identity.halfLevel': context.derived?.identity?.halfLevel,
      'derived.encumbrance': context.derived?.encumbrance,

      // Phase 2 Fixes
      'abilities (array)': context.abilities,
      'headerDefenses (array)': context.headerDefenses,
      'forceSensitive (bool)': context.forceSensitive,
      'identityGlowColor (string)': context.identityGlowColor,

      // Other critical roots
      'actor': context.actor,
      'system': context.system,
      'inventory': context.inventory,
      'combat': context.combat,
      'biography': context.biography,
    };

    let contextHealth = 'HEALTHY';
    const missingRoots = [];

    for (const [key, value] of Object.entries(checks)) {
      const isDefined = value !== undefined && value !== null;
      const isArrayLike = Array.isArray(value);
      const isObject = typeof value === 'object' && !isArrayLike;
      const type = isArrayLike ? `array[${value.length}]` : typeof value;

      const status = isDefined ? '✅' : '❌';
      lines.push(`${status} ${key.padEnd(40)} | ${type.padEnd(20)}`);

      if (!isDefined) {
        missingRoots.push(key);
        contextHealth = 'DEGRADED';
      }
    }
    lines.push('');

    // SECTION 2: Array Contents (Sample Data)
    lines.push('┌' + '─'.repeat(98) + '┐');
    lines.push('│ SECTION 2: ARRAY CONTENTS (Sample Data)');
    lines.push('└' + '─'.repeat(98) + '┘');

    const arrayChecks = {
      'abilities': context.abilities,
      'headerDefenses': context.headerDefenses,
      'derived.skills': context.derived?.skills,
      'derived.talents.groups': context.derived?.talents?.groups,
      'forcePoints': context.forcePoints,
    };

    for (const [key, arr] of Object.entries(arrayChecks)) {
      if (Array.isArray(arr) && arr.length > 0) {
        lines.push(`✅ ${key}: ${arr.length} items`);
        lines.push(`   [0]: ${JSON.stringify(arr[0]).substring(0, 80)}...`);
      } else if (Array.isArray(arr)) {
        lines.push(`⚠️  ${key}: Empty array (0 items) - check if data exists`);
      } else {
        lines.push(`❌ ${key}: Not an array`);
      }
    }
    lines.push('');

    // SECTION 3: DOM Rendering (Element Presence)
    lines.push('┌' + '─'.repeat(98) + '┐');
    lines.push('│ SECTION 3: DOM RENDERING (Element Presence)');
    lines.push('└' + '─'.repeat(98) + '┘');

    const sheet = actor.sheet;
    const element = sheet?.element;

    if (!element) {
      lines.push('❌ CRITICAL: Sheet element not found');
    } else {
      const domChecks = {
        'Ability rows (.ability-row)': element.querySelectorAll('.ability-row').length,
        'Defense rows (.defense-row)': element.querySelectorAll('.defense-row').length,
        'Talent cards (.talent-card)': element.querySelectorAll('.talent-card').length,
        'Skill rows (.skill-row-container)': element.querySelectorAll('.skill-row-container').length,
        'FP dots (.fp-dot)': element.querySelectorAll('.fp-dot').length,
        'Attack cards (.swse-attack-card)': element.querySelectorAll('.swse-attack-card').length,
        'Tab panels (.tab)': element.querySelectorAll('.tab').length,
        'Tab buttons ([data-tab])': element.querySelectorAll('[data-tab]').length,
      };

      let domHealth = 'HEALTHY';
      for (const [selector, count] of Object.entries(domChecks)) {
        const status = count > 0 ? '✅' : '⚠️ ';
        lines.push(`${status} ${selector.padEnd(50)} | Count: ${count}`);
        if (count === 0 && selector.includes('row') || selector.includes('card')) {
          domHealth = 'DEGRADED';
        }
      }
    }
    lines.push('');

    // SECTION 4: Tab Structure
    lines.push('┌' + '─'.repeat(98) + '┐');
    lines.push('│ SECTION 4: TAB STRUCTURE');
    lines.push('└' + '─'.repeat(98) + '┘');

    if (element) {
      const tabs = element.querySelectorAll('[data-tab]');
      lines.push(`Total tab buttons: ${tabs.length}`);
      tabs.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        const isActive = tab.classList.contains('active');
        const status = isActive ? '▶' : ' ';
        lines.push(`  ${status} data-tab="${tabName}"`);
      });
    }
    lines.push('');

    // SECTION 5: Data Persistence (Test)
    lines.push('┌' + '─'.repeat(98) + '┐');
    lines.push('│ SECTION 5: DATA PERSISTENCE (Form Field Test)');
    lines.push('└' + '─'.repeat(98) + '┘');

    try {
      const nameField = element?.querySelector('input[name="name"]');
      if (nameField) {
        const originalValue = nameField.value;
        lines.push(`✅ Name field found: "${originalValue}"`);
        lines.push(`   (Would persist if changed)`);
      } else {
        lines.push(`⚠️  Name field not found`);
      }

      const bioField = element?.querySelector('textarea[name="system.biography.text"]');
      if (bioField) {
        const length = bioField.value?.length || 0;
        lines.push(`✅ Biography field found (${length} chars)`);
      }
    } catch (e) {
      lines.push(`⚠️  Persistence test inconclusive: ${e.message}`);
    }
    lines.push('');

    // SECTION 6: Summary & Recommendations
    lines.push('┌' + '─'.repeat(98) + '┐');
    lines.push('│ SECTION 6: SUMMARY & RECOMMENDATIONS');
    lines.push('└' + '─'.repeat(98) + '┘');

    const summary = {
      'Context Health': contextHealth,
      'Sheet Renderable': element ? 'YES' : 'NO',
      'Missing Roots': missingRoots.length > 0 ? missingRoots.join(', ') : 'NONE',
    };

    for (const [key, value] of Object.entries(summary)) {
      lines.push(`${key.padEnd(30)}: ${value}`);
    }

    lines.push('');
    lines.push('RECOMMENDATIONS:');

    if (missingRoots.length > 0) {
      lines.push(`  1. ❌ Missing context roots: ${missingRoots.join(', ')}`);
      lines.push(`     → Verify _prepareContext() returns these keys`);
      lines.push(`     → Check character-sheet.js Phase 1 & 2 fixes`);
    } else {
      lines.push(`  ✅ All context roots hydrated correctly`);
    }

    if (element?.querySelectorAll('.ability-row').length === 0) {
      lines.push(`  2. ⚠️  No ability rows rendered`);
      lines.push(`     → Check if abilities array is populated`);
      lines.push(`     → Verify abilities-panel.hbs partial loads`);
    } else {
      lines.push(`  ✅ Abilities rendering correctly`);
    }

    if (element?.querySelectorAll('.defense-row').length === 0) {
      lines.push(`  3. ⚠️  No defense rows rendered`);
      lines.push(`     → Check if headerDefenses array is populated`);
      lines.push(`     → Verify defenses-panel.hbs partial loads`);
    } else {
      lines.push(`  ✅ Defenses rendering correctly`);
    }

    lines.push('');
    lines.push('═'.repeat(100));
    lines.push('END OF REPORT');
    lines.push('═'.repeat(100));

    return lines.join('\n');
  }

  /**
   * Run diagnostics and copy report to clipboard + log to console
   */
  static async runAndCopy() {
    const report = await this.runDiagnostics();

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(report);
      console.log(report);
      console.log('\n✅ Report copied to clipboard!');
      return report;
    } catch (e) {
      console.log(report);
      console.log(`⚠️  Could not copy to clipboard: ${e.message}`);
      return report;
    }
  }
}

// Note: This class is registered in Sentinel at window.sentinel.sheetaudit
// For direct access (if needed): window.SWSEV2SheetDiagnostics

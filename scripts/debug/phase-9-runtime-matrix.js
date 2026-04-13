/**
 * Phase 9: Runtime Proof and Gap Closure
 *
 * Automated runtime testing matrix to verify contract cleanup
 * Run in Foundry console after loading a world
 *
 * Usage:
 * 1. Load this script in Foundry console
 * 2. Run: runPhase9Matrix()
 * 3. Check console for PHASE-9-RUNTIME-MATRIX results
 */

export async function runPhase9Matrix() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('[PHASE 9] Runtime Proof and Gap Closure Matrix');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Enable observability
  CONFIG.SWSE = CONFIG.SWSE || {};
  CONFIG.SWSE.debug = CONFIG.SWSE.debug || {};
  CONFIG.SWSE.debug.contractObservability = true;

  const results = {
    scenario1: null,
    scenario2: null,
    scenario3: null,
    scenario4: null,
    scenario5: null,
    metadata: {
      timestamp: new Date().toISOString(),
      worldName: game.world.title,
      systemVersion: game.system.version
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // SCENARIO 1: Inspect existing actors for contract health
  // ═════════════════════════════════════════════════════════════════

  console.log('[SCENARIO 1] Actor Contract Health Scan');
  console.log('─────────────────────────────────────────\n');

  const { inspectActorContract } = await import(
    '/systems/foundryvtt-swse/scripts/debug/actor-contract-inspector.js'
  );

  const actorHealthResults = [];
  for (const actor of game.actors.filter(a => a.type === 'character')) {
    const report = inspectActorContract(actor);
    actorHealthResults.push({
      name: actor.name,
      id: actor.id,
      health: report.health,
      storedOk: Object.values(report.checks.stored).filter(c => c.status === 'OK').length,
      derivedOk: Object.values(report.checks.derived).filter(c => c.status === 'OK').length,
      risks: Object.values(report.checks.risks)
        .flatMap(r => Array.isArray(r) ? r : (r.risk ? [r] : []))
        .length
    });
    console.log(`  ${actor.name}: ${report.health}`);
  }

  results.scenario1 = {
    name: 'Actor Contract Health Scan',
    timestamp: new Date().toISOString(),
    actorsScanned: actorHealthResults.length,
    healthResults: actorHealthResults,
    warnings: window.SWSE_CONTRACT_WARNINGS ? [...window.SWSE_CONTRACT_WARNINGS] : []
  };

  console.log(`\n  Actors scanned: ${actorHealthResults.length}`);
  console.log(`  Contract warnings collected: ${results.scenario1.warnings.length}\n`);

  // ═════════════════════════════════════════════════════════════════
  // SCENARIO 2: Sheet render fallback detection
  // ═════════════════════════════════════════════════════════════════

  console.log('[SCENARIO 2] Sheet Render Fallback Detection');
  console.log('─────────────────────────────────────────\n');

  clearWarnings();
  let fallbacksTriggered = [];

  // Hook into sheet renders
  const origSheetRender = game.actors.contents[0]?.sheet?._prepareContext;
  if (origSheetRender && game.actors.contents[0]?.type === 'character') {
    const actor = game.actors.contents[0];
    console.log(`  Testing sheet render for: ${actor.name}`);

    try {
      const warningsBefore = window.SWSE_CONTRACT_WARNINGS?.length || 0;
      // Trigger a sheet context build
      if (actor.sheet?._prepareContext) {
        await actor.sheet._prepareContext();
      }
      const warningsAfter = window.SWSE_CONTRACT_WARNINGS?.length || 0;

      if (warningsAfter > warningsBefore) {
        const newWarnings = window.SWSE_CONTRACT_WARNINGS.slice(warningsBefore);
        fallbacksTriggered = newWarnings.filter(w => w.category === 'SheetFallback');
      }

      console.log(`  Fallback warnings triggered: ${fallbacksTriggered.length}`);
      if (fallbacksTriggered.length > 0) {
        fallbacksTriggered.forEach(w => {
          console.log(`    - [${w.domain}] ${w.message}`);
        });
      }
    } catch (err) {
      console.warn('  Error during sheet render test:', err);
    }
  }

  results.scenario2 = {
    name: 'Sheet Render Fallback Detection',
    timestamp: new Date().toISOString(),
    fallbacksTriggered: fallbacksTriggered.length,
    fallbackWarnings: fallbacksTriggered,
    allWarnings: window.SWSE_CONTRACT_WARNINGS ? [...window.SWSE_CONTRACT_WARNINGS] : []
  };

  console.log();

  // ═════════════════════════════════════════════════════════════════
  // SCENARIO 3: Repeated concept sync check
  // ═════════════════════════════════════════════════════════════════

  console.log('[SCENARIO 3] Repeated Concept Consistency Check');
  console.log('─────────────────────────────────────────\n');

  clearWarnings();
  const syncResults = {
    hp: { consistent: false, message: '' },
    defenses: { consistent: false, message: '' },
    identity: { consistent: false, message: '' },
    resources: { consistent: false, message: '' }
  };

  const testActor = game.actors.find(a => a.type === 'character');
  if (testActor) {
    const system = testActor.system;
    const derived = system?.derived ?? {};

    // Check HP consistency
    if (derived.hp?.value !== undefined && system.hp?.value !== undefined) {
      syncResults.hp.consistent = derived.hp.value === system.hp.value;
      syncResults.hp.message = `Derived: ${derived.hp.value}, System: ${system.hp.value}`;
    }

    // Check Defenses consistency
    const defenseOk =
      derived.defenses?.fortitude?.total !== undefined &&
      derived.defenses?.reflex?.total !== undefined &&
      derived.defenses?.will?.total !== undefined;
    syncResults.defenses.consistent = defenseOk;
    syncResults.defenses.message = defenseOk ? 'All defenses in derived' : 'Missing derived defenses';

    // Check Identity consistency
    const identityOk =
      derived.identity?.className !== undefined &&
      derived.identity?.classDisplay !== undefined &&
      derived.identity?.level !== undefined;
    syncResults.identity.consistent = identityOk;
    syncResults.identity.message = identityOk ? 'Identity bundle complete' : 'Incomplete identity bundle';

    // Check Resources consistency
    const resourcesOk =
      system.forcePoints?.value !== undefined &&
      system.destinyPoints?.value !== undefined;
    syncResults.resources.consistent = resourcesOk;
    syncResults.resources.message = resourcesOk ? 'Resources canonical' : 'Missing resource fields';

    console.log(`  Testing actor: ${testActor.name}`);
    for (const [concept, check] of Object.entries(syncResults)) {
      const status = check.consistent ? '✓' : '✗';
      console.log(`  ${status} ${concept.padEnd(12)} — ${check.message}`);
    }
  }

  results.scenario3 = {
    name: 'Repeated Concept Consistency Check',
    timestamp: new Date().toISOString(),
    syncResults,
    allConsistent: Object.values(syncResults).every(r => r.consistent),
    warnings: window.SWSE_CONTRACT_WARNINGS ? [...window.SWSE_CONTRACT_WARNINGS] : []
  };

  console.log();

  // ═════════════════════════════════════════════════════════════════
  // SCENARIO 4: Legacy path detection
  // ═════════════════════════════════════════════════════════════════

  console.log('[SCENARIO 4] Legacy Path Detection');
  console.log('─────────────────────────────────────────\n');

  const legacyPathsFound = [];
  for (const actor of game.actors.filter(a => a.type === 'character')) {
    const system = actor.system;

    // Check for legacy ability paths
    for (const [abilityKey, ability] of Object.entries(system.abilities || {})) {
      if (ability.value !== undefined && !ability.base) {
        legacyPathsFound.push({
          actor: actor.name,
          type: 'legacy_ability_path',
          detail: `${abilityKey}: has .value but no .base`
        });
      }
    }

    // Check for legacy XP path
    if (system.experience !== undefined && !system.xp?.total) {
      legacyPathsFound.push({
        actor: actor.name,
        type: 'legacy_xp_path',
        detail: 'Using system.experience instead of system.xp.total'
      });
    }
  }

  console.log(`  Legacy paths found: ${legacyPathsFound.length}`);
  if (legacyPathsFound.length > 0) {
    legacyPathsFound.forEach(lp => {
      console.log(`    - ${lp.actor}: ${lp.detail}`);
    });
  }

  results.scenario4 = {
    name: 'Legacy Path Detection',
    timestamp: new Date().toISOString(),
    legacyPathsFound,
    totalLegacyPaths: legacyPathsFound.length
  };

  console.log();

  // ═════════════════════════════════════════════════════════════════
  // SCENARIO 5: Derived computation verification
  // ═════════════════════════════════════════════════════════════════

  console.log('[SCENARIO 5] Derived Computation Verification');
  console.log('─────────────────────────────────────────\n');

  clearWarnings();
  const derivedVerification = [];

  for (const actor of game.actors.filter(a => a.type === 'character').slice(0, 3)) {
    const system = actor.system;
    const derived = system?.derived ?? {};

    const checks = {
      actor: actor.name,
      attributes: Object.keys(derived.attributes || {}).length > 0,
      skills: Object.keys(derived.skills || {}).length > 0,
      defenses: Object.keys(derived.defenses || {}).length > 0,
      identity: Object.keys(derived.identity || {}).length > 0,
      attacks: derived.attacks?.list?.length > 0 || false,
      encumbrance: derived.encumbrance?.state !== undefined
    };

    derivedVerification.push(checks);
    console.log(`  ${actor.name}:`);
    console.log(`    attributes: ${checks.attributes ? '✓' : '✗'}`);
    console.log(`    skills: ${checks.skills ? '✓' : '✗'}`);
    console.log(`    defenses: ${checks.defenses ? '✓' : '✗'}`);
    console.log(`    identity: ${checks.identity ? '✓' : '✗'}`);
    console.log(`    attacks: ${checks.attacks ? '✓' : '✗'}`);
    console.log(`    encumbrance: ${checks.encumbrance ? '✓' : '✗'}`);
  }

  results.scenario5 = {
    name: 'Derived Computation Verification',
    timestamp: new Date().toISOString(),
    derivedVerification,
    warnings: window.SWSE_CONTRACT_WARNINGS ? [...window.SWSE_CONTRACT_WARNINGS] : []
  };

  console.log();

  // ═════════════════════════════════════════════════════════════════
  // FINAL REPORT
  // ═════════════════════════════════════════════════════════════════

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[PHASE 9] Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const totalWarnings = Object.values(results).reduce((sum, scenario) => {
    if (scenario?.warnings?.length) return sum + scenario.warnings.length;
    return sum;
  }, 0);

  console.log(`Total contract warnings collected: ${totalWarnings}`);
  console.log(`Scenarios completed: 5`);
  console.log(`\nDetailed results available at: window.PHASE_9_RESULTS\n`);

  // Store full results for analysis
  window.PHASE_9_RESULTS = results;

  return results;
}

function clearWarnings() {
  delete window.SWSE_CONTRACT_WARNINGS;
}

// Auto-export for console
window.runPhase9Matrix = runPhase9Matrix;

console.log('[PHASE 9] Runtime matrix ready. Run: runPhase9Matrix()');

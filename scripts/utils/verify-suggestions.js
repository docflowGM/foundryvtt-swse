/**
 * SWSE Suggestion Engine Wiring Verification Utility
 *
 * Run in browser console to verify the suggestion engine installation:
 * await ui.notifications?.info("Checking suggestions..."); verifySuggestions();
 *
 * Or directly: verifySuggestions()
 */

export function verifySuggestions() {
  console.log('=== SWSE Suggestion Engine Wiring Verification ===\n');

  const results = {
    coordinatorExists: false,
    gameApiExists: false,
    apiEndpoints: {},
    statusMessage: ''
  };

  // Check 1: Coordinator exists
  console.log('CHECK 1: Coordinator Availability');
  console.log('Expected: game.swse.suggestions.coordinator exists');
  results.coordinatorExists = !!game?.swse?.suggestions?.coordinator;
  console.log('Result: ' + (results.coordinatorExists ? '✅ PASS' : '❌ FAIL'));
  console.log('');

  // Check 2: All API endpoints exist
  console.log('CHECK 2: game.swse.suggestions API Endpoints');
  const expectedEndpoints = [
    'suggestFeats',
    'suggestTalents',
    'suggestClasses',
    'suggestForceOptions',
    'suggestLevel1Skills',
    'suggestAttributeIncreases',
    'analyzeBuildIntent',
    'deriveAttributeBuildIntent',
    'applyAttributeWeight',
    'getActiveSynergies',
    'generatePathPreviews',
    'getForceOptionCatalog',
    'getAbilityIcon',
    'getAbilityName',
    'clearBuildIntentCache'
  ];

  let endpointsOk = 0;
  expectedEndpoints.forEach(endpoint => {
    const exists = typeof game?.swse?.suggestions?.[endpoint] === 'function';
    if (exists) {endpointsOk++;}
    results.apiEndpoints[endpoint] = exists;
    console.log(`  ${endpoint}: ${exists ? '✅' : '❌'}`);
  });
  console.log('');

  // Check 3: Sample API calls
  console.log('CHECK 3: API Functionality');
  try {
    const catalog = game?.swse?.suggestions?.getForceOptionCatalog?.();
    console.log(`  Force Option Catalog: ${catalog ? '✅ Available' : '❌ Not found'}`);
  } catch (err) {
    console.log(`  Force Option Catalog: ❌ Error - ${err.message}`);
  }
  console.log('');

  // Summary
  console.log('=== SUMMARY ===');
  const coordinatorOk = results.coordinatorExists;
  const apiOk = endpointsOk === expectedEndpoints.length;
  const allChecks = coordinatorOk && apiOk;

  console.log(`Coordinator Status: ${coordinatorOk ? '✅ OK' : '❌ MISSING'}`);
  console.log(`API Endpoints: ${endpointsOk}/${expectedEndpoints.length} available`);
  console.log(`Overall Status: ${allChecks ? '✅ ALL SYSTEMS OPERATIONAL' : '❌ ISSUES DETECTED'}`);
  console.log('');

  if (allChecks) {
    console.log('✅ SUCCESS: All suggestion engines are properly wired and accessible!');
    console.log('');
    console.log('Available at 3 levels:');
    console.log('  1. game.swse.suggestions.* - Direct coordinator access');
    console.log('  2. progressionEngine.getSuggested* - Instance methods (recommended for UI)');
    console.log('  3. Direct engine imports - Advanced usage');
    console.log('');
    console.log('Example usage in UI components:');
    console.log('  const feats = await SuggestionService.getSuggestions(actor, \'verify\', { domain: \'feats\', available: feats, pendingData: pendingData, persist: false });');
    console.log('  const attrs = await SuggestionService.getSuggestions(actor, \'verify\', { domain: \'attributes\', pendingData: pendingData, persist: false });');
    results.statusMessage = 'SUCCESS';
  } else {
    console.log('❌ FAILURE: Some endpoints are missing or unavailable.');
    console.log('');
    console.log('Missing components:');
    if (!coordinatorOk) {console.log('  - SuggestionEngineCoordinator not initialized');}
    if (!apiOk) {
      const missing = expectedEndpoints.filter(ep => !results.apiEndpoints[ep]);
      missing.forEach(ep => console.log(`  - ${ep}`));
    }
    console.log('');
    console.log('Check browser console for initialization errors.');
    results.statusMessage = 'FAILURE';
  }

  return results;
}

// Export for console access
window.verifySuggestions = verifySuggestions;

export default verifySuggestions;

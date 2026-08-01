import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 3 — real behavioral coverage for the extracted panel-context
// helper (segments, current-marker, contract validity) and the
// PanelVisibilityManager vehicle exclusion, plus static terminology
// guards where a source-text check is the appropriate tool (template
// strings, not interaction/authorization semantics).

registerFoundryPathLoader();

const { buildDarkSideSegments, buildDarkSidePanelContext } = await import(
  '/systems/foundryvtt-swse/scripts/sheets/v2/context/dark-side-panel-context.js'
);
const { validateDarkSidePanel } = await import(
  '/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelValidators.js'
);

function settingsShim(policy = 'gmOnly') {
  return {
    game: {
      user: { isGM: true },
      settings: {
        get: (_ns, key) => (key === 'darkSideScoreEditPolicy' ? policy : undefined),
        set: async () => {},
        settings: { has: (fullKey) => fullKey === 'foundryvtt-swse.darkSideScoreEditPolicy' }
      }
    }
  };
}

// ── buildDarkSideSegments: 0..max inclusive, exact current segment marked ──
{
  const segments = buildDarkSideSegments(3, 10);
  assert.equal(segments.length, 11, '0..10 inclusive is 11 entries');
  assert.equal(segments[0].index, 0);
  assert.equal(segments[10].index, 10);
  segments.forEach((s, i) => {
    assert.equal(s.filled, i <= 3);
    assert.equal(s.current, i === 3, `only index 3 should be marked current, got current=${s.current} at index ${i}`);
  });
}

// ── max=100 produces 101 segments, validates cleanly through the real validator ──
{
  installFoundryShimGlobals(settingsShim());
  const actor = { id: 'a1', name: 'Big Actor', isOwner: true };
  const panel = buildDarkSidePanelContext(actor, { sheetEditable: true, user: { isGM: true } });
  // Force a max=100 scenario directly via buildDarkSideSegments since
  // DSPEngine.getMax() depends on Wisdom/settings not relevant here.
  const bigSegments = buildDarkSideSegments(42, 100);
  const bigPanel = { ...panel, max: 100, value: 42, segments: bigSegments };
  const result = validateDarkSidePanel(bigPanel);
  assert.equal(result.valid, true, `expected valid, got errors: ${JSON.stringify(result.errors)}`);
  assert.equal(bigSegments.length, 101);
  resetFoundryShimGlobals();
}

// ── buildDarkSidePanelContext: readOnlyReason always a string, canEdit wired to policy ──
{
  installFoundryShimGlobals(settingsShim('gmOnly'));
  const nonOwnerActor = { id: 'a2', name: 'Someone else\'s actor', isOwner: false };
  const panel = buildDarkSidePanelContext(nonOwnerActor, { sheetEditable: true, user: { isGM: false } });
  assert.equal(panel.canEdit, false);
  assert.equal(typeof panel.readOnlyReason, 'string');
  assert.equal(panel.readOnlyReason.length > 0, true);
  const validation = validateDarkSidePanel(panel);
  assert.equal(validation.valid, true, `expected valid, got errors: ${JSON.stringify(validation.errors)}`);
  resetFoundryShimGlobals();
}

// ── PanelVisibilityManager: darkSidePanel condition excludes vehicles, not Force-sensitivity ──
{
  const src = await readFile(
    new URL('../scripts/sheets/v2/PanelVisibilityManager.js', import.meta.url),
    'utf8'
  );
  // Extract and evaluate the condition function directly rather than
  // instantiating the full manager (which needs a real sheet instance) —
  // the predicate itself is what's under test.
  const match = src.match(/darkSidePanel:\s*\{\s*condition:\s*(\(actor\)\s*=>[^,]+),\s*reason:\s*'[^']*'\s*\}/);
  assert.ok(match, 'darkSidePanel conditionalPanels entry found');
  // eslint-disable-next-line no-new-func
  const condition = new Function(`return ${match[1]}`)();
  assert.equal(condition({ type: 'character' }), true);
  assert.equal(condition({ type: 'npc' }), true);
  assert.equal(condition({ type: 'droid' }), true);
  assert.equal(condition({ type: 'vehicle' }), false);
  assert.equal(condition({ type: 'character', system: { isVehicle: true } }), false, 'isVehicle flag also excludes, matching starshipManeuversPanel\'s own predicate shape');
  assert.doesNotMatch(match[0], /forceSensitive/, 'no Force-sensitivity gate should exist in the darkSidePanel entry specifically');
}

// ── Terminology static guards ──
{
  const template = await readFile(
    new URL('../templates/actors/character/v2-concept/partials/panels/dark-side-panel.hbs', import.meta.url),
    'utf8'
  );
  assert.match(template, /Dark Side Score/);
  assert.doesNotMatch(template, /Dark Side Points/, 'no mixed terminology in the live panel template');

  const settingsSrc = await readFile(new URL('../scripts/core/settings.js', import.meta.url), 'utf8');
  const policyBlockMatch = settingsSrc.match(/darkSideScoreEditPolicy[\s\S]{0,500}?\}\);/);
  assert.ok(policyBlockMatch, 'darkSideScoreEditPolicy registration found');
  assert.match(policyBlockMatch[0], /Dark Side Score/);

  const sithApprenticeMatch = settingsSrc.match(/sithApprenticeMinimumDSP[\s\S]{0,600}?\}\);/);
  assert.ok(sithApprenticeMatch, 'sithApprenticeMinimumDSP registration found');
  assert.match(sithApprenticeMatch[0], /name:\s*"Sith Apprentice Dark Side Score Requirement"/);
  assert.doesNotMatch(sithApprenticeMatch[0], /name:\s*"[^"]*\bDSP\b[^"]*"/, 'the visible name must not say bare DSP');

  const sithLordMatch = settingsSrc.match(/sithLordMinimumDSP[\s\S]{0,600}?\}\);/);
  assert.ok(sithLordMatch, 'sithLordMinimumDSP registration found');
  assert.match(sithLordMatch[0], /name:\s*"Sith Lord Dark Side Score Requirement"/);
}

console.log('DSP panel-context/visibility/terminology tests passed.');

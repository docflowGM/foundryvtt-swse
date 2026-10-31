import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';

installSystemsResolver(); installFoundryStubs();
const { buildDesignerFormHtml, summarizePreview } = await import('../scripts/ui/shell/construction-designer-ui.js');

test('designer form: frames, every Crew Quality, certified systems; authorship choice only for a GM', () => {
  const frames = JSON.parse(readFileSync('data/canonical/vehicles/construction/stock-frames.json', 'utf8')).frames;
  const systems = [{ id: 'shields-10', name: 'Starship Shields, SR 10', emplacementPoints: 1 }];
  const player = buildDesignerFormHtml({ frames, systems, isGM: false });
  assert.equal((player.match(/<option value="[a-z-]+">[A-Z]/g) ?? []).length >= frames.length, true);
  for (const q of ['untrained', 'normal', 'skilled', 'expert', 'ace']) assert.match(player, new RegExp(`<option value="${q}">`));
  assert.match(player, /value="shields-10"/);
  assert.doesNotMatch(player, /authorshipKind/);
  assert.match(buildDesignerFormHtml({ frames, systems, isGM: true }), /authorshipKind[^]*gm-homebrew/);
});

test('preview text shows unresolved values as unresolved and lists blocks', () => {
  const t = summarizePreview({ status: 'PREVIEWABLE', totalCredits: undefined, reasons: ['FRAME_NOT_SOURCE_VERIFIED'], unresolved: ['CREW_QUALITY_NOT_CHOSEN'], preview: { ok: false } });
  assert.match(t, /Total cost: unresolved cr/);
  assert.match(t, /Blocked: FRAME_NOT_SOURCE_VERIFIED/);
  assert.match(t, /Unresolved: CREW_QUALITY_NOT_CHOSEN/);
  const ok = summarizePreview({ status: 'RULES_VALIDATED', totalCredits: 50000, design: { days: 30, mechanicsDC: 25 }, reasons: [], unresolved: [], preview: { ok: true, derived: { reflexDefense: 20, fortitudeDefense: 18, damageThreshold: 30, hitPoints: 60, damageReduction: 10 } } });
  assert.match(ok, /Reflex 20 · Fortitude 18/);
  assert.match(ok, /Design time 30 days, Mechanics DC 25/);
});

test('Asset Bay exposes the designer entry points; review is GM-only', () => {
  const t = readFileSync('templates/shell/partials/surface-asset-bay.hbs', 'utf8');
  assert.match(t, /data-asset-bay-action="design-ship"/);
  assert.match(t, /data-asset-bay-action="ship-projects"/);
  assert.match(t, /\{\{#if vm\.isGM\}\}<button[^>]*review-designs/);
  assert.match(readFileSync('scripts/ui/shell/ShellHost.js', 'utf8'), /action === 'design-ship' \|\| action === 'review-designs' \|\| action === 'ship-projects'/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// GM Datapad ecosystem redesign — Phase 5: static proof that intel.hbs's
// campaign-relationship markup actually carries the exact data-attributes
// GMIntelSurfaceController._wireRelationshipButtons() queries for
// (tests/gm-intel-context-navigation-controller.test.mjs proves the
// controller side against synthetic buttons; this proves the real template
// emits matching real ones) — the two must never drift apart silently.

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('templates/apps/gm-datapad/surfaces/intel.hbs', root), 'utf8');
const controller = await readFile(new URL('scripts/ui/shell/gm/controllers/GMIntelSurfaceController.js', root), 'utf8');

const wiredAttrs = [
  'data-intel-open-location',
  'data-intel-open-faction',
  'data-intel-open-contact',
  'data-intel-open-job',
  'data-intel-open-scene',
  'data-intel-open-actor'
];

for (const attr of wiredAttrs) {
  assert.ok(controller.includes(`querySelectorAll('[${attr}]')`), `controller must wire ${attr}`);
  assert.ok(template.includes(attr), `intel.hbs must render ${attr} so the controller's wiring has a real button to attach to`);
}

assert.match(template, /data-intel-open-location data-location-id="\{\{intelManager\.selectedCard\.relationships\.location\.id\}\}"/);
assert.match(template, /data-intel-open-faction data-faction-id="\{\{intelManager\.selectedCard\.relationships\.faction\.id\}\}"/);
assert.match(template, /data-intel-open-contact data-faction-id="\{\{intelManager\.selectedCard\.relationships\.faction\.id\}\}" data-contact-id="\{\{intelManager\.selectedCard\.relationships\.contact\.id\}\}"/);
assert.match(template, /data-intel-open-job data-job-id="\{\{intelManager\.selectedCard\.relationships\.job\.id\}\}"/);
assert.match(template, /data-intel-open-scene data-scene-uuid="\{\{intelManager\.selectedCard\.relationships\.scene\.uuid\}\}"/);
assert.match(template, /data-intel-open-actor data-actor-uuid="\{\{intelManager\.selectedCard\.relationships\.actor\.uuid\}\}"/);

console.log('Intel relationship template<->controller wiring passed (every data-intel-open-* the controller queries is actually rendered by intel.hbs against the real ecosystem VM fields).');

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dir = 'templates/actors/vehicle/v2/partials/';
const sub = readFileSync(dir + 'vehicle-subsystem-detail-panel.hbs', 'utf8');
// UI-13: list items live in a list element
assert.match(sub, /<ul class="swse-vehicle-subsystem-details">[\s\S]*?<li>\{\{line\}\}<\/li>[\s\S]*?<\/ul>/);
assert.doesNotMatch(sub, /<div class="swse-vehicle-subsystem-details">/);
// every icon-only button (arrow glyph) in the station editor has an accessible name
const ed = readFileSync(dir + 'vehicle-custom-station-editor-panel.hbs', 'utf8');
for (const glyph of ['↑', '↓']) {
  const btn = ed.match(new RegExp(`<button[^>]*>${glyph}</button>`, 's'))[0];
  assert.match(btn, /aria-label="[^"]+"/, `button ${glyph} has aria-label`);
}
// resource bars expose progressbar semantics with a name and bounds (UI-08/13)
const content = readFileSync(dir + 'vehicle-sheet-content.hbs', 'utf8');
assert.match(content, /role="progressbar" aria-label="\{\{resource\.label\}\}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="\{\{resource\.bar\}\}"/);
console.log('vehicle sheet accessibility: ok');

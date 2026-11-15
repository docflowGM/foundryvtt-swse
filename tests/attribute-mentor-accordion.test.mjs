import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Visual/interaction contract: show all three mentor builds as selectable tabs
// while rendering only one build's detailed effects at a time.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const template = read('templates/apps/progression-framework/dialogs/attribute-mentor-dialog.hbs');
const js = read('scripts/apps/progression-framework/dialogs/attribute-mentor-dialog.js');
const css = read('styles/progression-framework/steps/attribute-mentor-dialog.css');

assert.match(template, /\{\{#each builds\}\}/);
assert.match(template, /data-build-toggle/);
assert.match(template, /aria-expanded="false"/);
assert.match(template, /aria-controls="attr-mentor-build-panel-\{\{@index\}\}"/);
assert.match(template, /data-build-panel[^>]+role="region"/);
assert.match(template, /data-build-panel[^>]+hidden>/);
assert.match(template, /data-build-apply="\{\{id\}\}"/);
for (const field of ['displayRows', 'reasons', 'cautions', 'forecasts']) {
  assert.ok(template.includes(field), 'Expanded build must keep: ' + field);
}

assert.match(js, /const showBuild = \(selected\) =>/);
assert.match(js, /const open = toggle === selected/);
assert.match(js, /toggle\.setAttribute\('aria-expanded', String\(open\)\)/);
assert.match(js, /panel\.hidden = !open/);
assert.match(js, /showBuild\(recommended \|\| toggles\[0\]\)/);
assert.match(js, /await this\.onApply\(build\)/);

assert.match(css, /\.attr-mentor-dialog__cards\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
for (const index of [1, 2, 3]) {
  assert.ok(css.includes('.attr-mentor-card:nth-child(' + index + ') > .attr-mentor-card__head'),
    'Tab ' + index + ' must be anchored into the visible top row');
}
assert.match(css, /\.attr-mentor-card__body\s*\{[^}]*grid-row:\s*2;/s);
assert.match(css, /\.attr-mentor-card__body\[hidden\]\s*\{[^}]*display:\s*none !important/s);

// Preserve the already-certified single scroll owner and viewport limit.
assert.match(css, /\.attr-mentor-dialog__cards\s*\{[^}]*overflow-y:\s*auto/s);
assert.match(css, /\.swse-attribute-mentor-dialog\s*\{[^}]*max-height:\s*calc\(100vh - 32px\)/s);

console.log('attribute-mentor-accordion: all assertions passed');

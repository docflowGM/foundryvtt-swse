import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// All builds expose their titles, stat previews and Apply buttons at all times.
// Only one full-text explanation panel (reasons/cautions/forecast) is expanded.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const template = read('templates/apps/progression-framework/dialogs/attribute-mentor-dialog.hbs');
const js = read('scripts/apps/progression-framework/dialogs/attribute-mentor-dialog.js');
const css = read('styles/progression-framework/steps/attribute-mentor-dialog.css');

assert.match(template, /{{#each builds}}/);
assert.match(template, /data-build-card/);
assert.match(template, /attr-mentor-card__recommended/);
assert.match(template, /attr-mentor-card__stats/);
assert.match(template, /{{#each displayRows}}/);
assert.match(template, /class="attr-mentor-stat__compact"/);
assert.match(template, /class="attr-mentor-stat__breakdown"/);
assert.match(template, /class="attr-mentor-stat__compact-values"/);
assert.match(template, /class="attr-mentor-stat__breakdown-values"/);
assert.match(template, /class="attr-mentor-stat__compact-labels"/);
assert.match(template, /class="attr-mentor-stat__breakdown-labels"/);
assert.match(template, /\(\{\{modifier\}\}\)/,
  'Collapsed build previews must show the signed modifier in parentheses');
assert.match(template, /<span>Base<\/span><span>Species<\/span><span>Total<\/span><span>Mod<\/span>/,
  'Expanded breakdown must label all four columns directly beneath their values');
assert.match(template, /<span>Total<\/span><span>Mod<\/span>/,
  'Compact preview must label the final score and modifier');
assert.doesNotMatch(template, /attr-mentor-card__legend/,
  'Global detached legends must not be rendered below the stat grid');
assert.match(template, /data-build-apply="{{id}}"/);
assert.match(template, /data-build-toggle/);
assert.match(template, /aria-expanded="false"/);
assert.match(template, /aria-controls="attr-mentor-build-panel-{{@index}}"/);
assert.match(template, /data-build-panel\s+id="attr-mentor-build-panel-{{@index}}"\s+role="region"/);
assert.match(template, /aria-labelledby="attr-mentor-build-tab-{{@index}}"\s+hidden/);

// All the decision essentials precede the explanation container, so they
// cannot be accidentally hidden by collapsing a build's detailed advice.
const overviewIndex = template.indexOf('<section class="attr-mentor-card');
const scoreIndex = template.indexOf('class="attr-mentor-card__stats"');
const applyIndex = template.indexOf('data-build-apply="{{id}}"');
const toggleIndex = template.indexOf('data-build-toggle');
const explanationIndex = template.indexOf('class="attr-mentor-dialog__explanations"');
const panelIndex = template.indexOf('data-build-panel');
assert.ok(overviewIndex >= 0 && scoreIndex > overviewIndex);
assert.ok(applyIndex > overviewIndex && applyIndex < explanationIndex);
assert.ok(toggleIndex > scoreIndex && toggleIndex < explanationIndex);
assert.ok(panelIndex > explanationIndex && explanationIndex > scoreIndex);

for (const field of ['reasons', 'cautions', 'forecasts']) {
  assert.ok(template.includes('{{#each ' + field + '}}'), 'Full-text panel must show ' + field);
}
assert.doesNotMatch(template, /Hover for|attr-mentor-hover-anchor|attr-mentor-hover-panel/,
  'Cautions and forecasts must never require hovering');
assert.equal((template.match(/data-build-apply="{{id}}"/g) || []).length, 1,
  'One Apply Build control is rendered per preview; none is hidden in the explanation');

assert.match(js, /const showBuild = \(selected\) =>/);
assert.match(js, /const open = toggle === selected/);
assert.match(js, /toggle\.setAttribute\('aria-expanded', String\(open\)\)/);
assert.match(js, /panel\.hidden = !open/);
assert.match(js, /showBuild\(recommended \|\| toggles\[0\]\)/);
assert.match(js, /await this\.onApply\(build\)/);

assert.match(css, /\.attr-mentor-dialog__cards\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
assert.match(css, /\.attr-mentor-card__stats\s*{[^}]*repeat\(6, minmax\(0, 1fr\)\)/s);
assert.match(css, /\.attr-mentor-card__body\[hidden\]\s*{[^}]*display:\s*none !important/s);
assert.match(css, /\.attr-mentor-stat__breakdown\s*{[^}]*display:\s*none;/s,
  'Full breakdown must be hidden by default');
assert.match(css, /\.attr-mentor-card\.is-expanded \.attr-mentor-stat__compact\s*{[^}]*display:\s*none;/s,
  'Expanded card must hide its compact preview');
assert.match(css, /\.attr-mentor-card\.is-expanded \.attr-mentor-stat__breakdown\s*{[^}]*display:\s*block;/s,
  'Expanded card must display the four-column breakdown');
assert.match(css, /\.attr-mentor-stat__breakdown-labels\s*{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/s,
  'Expanded labels must align with all four numbers');
assert.match(css, /\.attr-mentor-stat__compact-labels\s*{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s,
  'Compact labels must align with total and modifier');
assert.doesNotMatch(css, /\.attr-mentor-hover-(anchor|panel)\b/);

// Preserve the one-scrolling-region and viewport containment contracts.
assert.match(css, /\.attr-mentor-dialog__cards\s*{[^}]*overflow-y:\s*auto/s);
assert.match(css, /\.swse-attribute-mentor-dialog\s*{[^}]*max-height:\s*calc\(100vh - 32px\)/s);
assert.match(css, /@media \(max-width: 650px\)/, 'Smaller windows must adapt the score preview');

console.log('attribute-mentor-accordion: all assertions passed');

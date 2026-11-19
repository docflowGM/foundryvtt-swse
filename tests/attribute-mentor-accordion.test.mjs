import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Final contract of the mentor build accordion (the branch's last design: the ORIGINAL expanded card is preserved untouched;
// a minimized card shows only the title toggle, final score + modifier with labels, and Apply Build). Exactly one card is
// expanded; the recommended build opens by default. This test was brought up to that final contract during consolidation
// (issue #1166): its earlier revision asserted an intermediate "breakdown" design that the later commits removed.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const template = read('templates/apps/progression-framework/dialogs/attribute-mentor-dialog.hbs');
const js = read('scripts/apps/progression-framework/dialogs/attribute-mentor-dialog.js');
const css = read('styles/progression-framework/steps/attribute-mentor-dialog.css');

// Template: original structure kept, accordion hooks added.
assert.match(template, /{{#each builds}}/);
assert.match(template, /data-build-card/);
assert.match(template, /attr-mentor-card__recommended/);
assert.match(template, /attr-mentor-card__stats/);
assert.match(template, /{{#each displayRows}}/);
assert.match(template, /class="attr-mentor-stat__compact"/, 'minimized readout exists');
assert.match(template, /\(\{\{modifier\}\}\)/, 'minimized readout shows the signed modifier in parentheses');
assert.match(template, /attr-mentor-stat__compact-caption">Total<\/span>/);
assert.match(template, /attr-mentor-stat__compact-caption">Mod<\/span>/);
assert.match(template, /attr-mentor-card__legend/, 'the original expanded legend is preserved');
assert.match(template, /data-build-apply="{{id}}"/);
assert.match(template, /data-build-toggle/);
assert.match(template, /aria-expanded="false"/);
assert.match(template, /aria-controls="attr-mentor-build-panel-{{@index}}"/);
assert.match(template, /data-build-panel\s+id="attr-mentor-build-panel-{{@index}}"\s+role="region"/);
assert.match(template, /aria-labelledby="attr-mentor-build-tab-{{@index}}"\s+hidden/);
assert.equal((template.match(/data-build-apply="{{id}}"/g) || []).length, 1, 'one Apply Build per card');
// Apply Build stays outside the collapsible panel so a minimized card can still be applied.
assert.ok(template.indexOf('data-build-apply="{{id}}"') < template.indexOf('data-build-panel'));
for (const field of ['reasons', 'cautions', 'forecasts']) {
  assert.ok(template.includes('{{#each ' + field + '}}'), 'the expanded details show ' + field);
}

// Script: exclusive expansion, recommended build opens first, clicking the open title minimizes it, Apply still works.
assert.match(js, /const showBuild = \(selected, \{ allowCollapse = true \} = \{\}\) =>/);
assert.match(js, /const open = toggle === selected && !collapseSelected/);
assert.match(js, /toggle\.setAttribute\('aria-expanded', String\(open\)\)/);
assert.match(js, /panel\.hidden = !open/);
assert.match(js, /showBuild\(recommended \|\| toggles\[0\], \{ allowCollapse: false \}\)/);
assert.match(js, /await this\.onApply\(build\)/);

// Style: minimized cards swap the four-column display for the compact one; the expanded layout is not restyled.
assert.match(css, /\.attr-mentor-stat__compact\s*{[^}]*display:\s*none;/s);
assert.match(css, /\.attr-mentor-card:not\(\.is-expanded\) \.attr-mentor-stat__numbers,[^{]*\.attr-mentor-card__details-grid\s*{[^}]*display:\s*none;/s);
assert.match(css, /\.attr-mentor-card:not\(\.is-expanded\) \.attr-mentor-stat__compact\s*{[^}]*display:\s*grid;/s);
assert.match(css, /\.attr-mentor-card__details-grid\[hidden\]\s*{[^}]*display:\s*none !important/s);
assert.match(css, /\.attr-mentor-card__toggle:focus-visible/);
assert.match(css, /prefers-reduced-motion: reduce/);

console.log('attribute-mentor-accordion: all assertions passed');

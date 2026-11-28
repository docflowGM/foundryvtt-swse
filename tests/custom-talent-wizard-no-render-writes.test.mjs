import assert from 'node:assert/strict';
import fs from 'node:fs';
// Finding F-TAL-005 (3F): the effect-wizard _onRender integration must not persist an "already presented" flag on every first render
// (an owned-item flag write re-renders the sheet). Presented state is per session; only the one-shot request flag is consumed.
const src = fs.readFileSync('scripts/apps/talent-tree-workbench/custom-talent-effect-wizard-integration.js', 'utf8');
assert.ok(!/\.setFlag\(/.test(src), 'no setFlag during the render integration');
assert.ok(/PRESENTED_THIS_SESSION/.test(src), 'presented state is tracked in session memory');
console.log('custom-talent-wizard-no-render-writes: ok');

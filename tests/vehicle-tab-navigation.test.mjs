import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tabKeyAfter, tabStates, applyVehicleTabSemantics } from '../scripts/sheets/v2/vehicle-sheet/vehicle-tab-navigation.js';
const keys = ['overview', 'stats', 'crew', 'cargo'];
assert.equal(tabKeyAfter(keys, 'overview', 'ArrowRight'), 'stats'); assert.equal(tabKeyAfter(keys, 'cargo', 'ArrowRight'), 'overview', 'wraps');
assert.equal(tabKeyAfter(keys, 'overview', 'ArrowLeft'), 'cargo'); assert.equal(tabKeyAfter(keys, 'crew', 'Home'), 'overview'); assert.equal(tabKeyAfter(keys, 'crew', 'End'), 'cargo');
assert.equal(tabKeyAfter(keys, 'crew', 'a'), null); assert.equal(tabKeyAfter([], 'x', 'Home'), null);
const st = tabStates(keys, 'crew');
assert.equal(st.filter((s) => s.selected).length, 1); assert.equal(st.filter((s) => s.tabindex === 0).length, 1, 'roving tabindex: one tab stop'); assert.equal(st.find((s) => s.key === 'crew').tabindex, 0);
// DOM glue against a minimal fake DOM
const el = (data) => { const attrs = {}; return { dataset: data, id: '', attrs, setAttribute(k, v) { attrs[k] = v; } }; };
const items = keys.map((k) => el({ tab: k })), panels = keys.map((k) => el({ tab: k }));
const nav = el({}); nav.querySelectorAll = () => items;
const root = { querySelector: (s) => (s === '.sheet-tabs' ? nav : null), querySelectorAll: (s) => (s === '.sheet-content .tab' ? panels : []) };
applyVehicleTabSemantics(root, 'stats', 'u1');
assert.equal(nav.attrs.role, 'tablist'); assert.equal(items[1].attrs['aria-selected'], 'true'); assert.equal(items[0].attrs['aria-selected'], 'false'); assert.equal(items[1].attrs.tabindex, '0'); assert.equal(items[0].attrs.tabindex, '-1');
assert.equal(items[1].attrs['aria-controls'], panels[1].id); assert.equal(panels[1].attrs['aria-labelledby'], items[1].id); assert.equal(panels[1].attrs.role, 'tabpanel');
applyVehicleTabSemantics(root, 'stats', 'u2'); assert.notEqual(items[1].id, 'swse-vehicle-tab-u1-stats', 'ids are unique per open sheet');
// wiring
const sheet = readFileSync('scripts/sheets/v2/vehicle-actor-sheet.js', 'utf8');
assert.match(sheet, /applyVehicleTabSemantics\(root, target, this\._vehicleTabUid\)/); assert.match(sheet, /tabBtn\.addEventListener\('keydown'/);
console.log('vehicle tab navigation: ok');

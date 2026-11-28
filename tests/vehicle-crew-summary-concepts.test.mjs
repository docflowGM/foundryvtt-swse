import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// UI-03: staffed stations and the printed crew complement are different facts and are never shown as a fraction of each other.
const hbs = readFileSync('templates/actors/vehicle/v2/partials/vehicle-crew-summary-panel.hbs', 'utf8');
assert.match(hbs, /Stations staffed/); assert.match(hbs, /Crew complement/); assert.match(hbs, /not stated/);
assert.doesNotMatch(hbs, /\{\{panel\.filledSlots\}\}\/\{\{#if panel\.totalKnown\}\}/, 'no filled/total fraction');
const src = readFileSync('scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', 'utf8');
const strip = src.match(/\{ key: 'crew', label: 'Crew',[^\n]*/)[0];
assert.match(strip, /staffed · /); assert.match(strip, /bar: null/, 'no ratio bar between unlike quantities'); assert.doesNotMatch(strip, /Math\.round/);
console.log('vehicle crew summary concepts: ok');

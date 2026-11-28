import assert from 'node:assert/strict';
import fs from 'node:fs';
// F-HRL / F-ABL (3F, 3D): hooks that write (condition status effects, effect-duration flags, initial training flags) fire on EVERY client; each must act only
// on the originating client (hook argument userId).
const gate = /userId !== undefined && userId !== game\.user\?\.id\) return;/;
const cases = [
  ['scripts/combat/active-effects-manager.js', /Hooks\.on\('updateActor', \(actor, changes, _options, userId\) => \{\s*if \(userId/],
  ['scripts/houserules/houserule-status-effects.js', /Hooks\.on\('updateActor', \(actor, data, _options, userId\) => \{\s*if \(userId/],
  ['scripts/houserules/houserule-skill-training.js', /Hooks\.on\('createActor', \(actor, _options, userId\) => \{\s*if \(userId/],
];
for (const [file, shape] of cases) { const src = fs.readFileSync(file, 'utf8'); assert.match(src, shape, `${file}: listener takes userId and gates first`); assert.match(src, gate, `${file}: originating-client gate present`); }
console.log('houserule-and-effect-hooks-originating-client: ok');

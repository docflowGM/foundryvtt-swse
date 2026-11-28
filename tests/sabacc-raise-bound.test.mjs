import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Sabacc: a raise costs toCall + raiseBy (sabacc-engine), so the raise input must be bounded by credits - toCall, not by the bet maximum.
const vm = readFileSync('scripts/games/games/sabacc/sabacc-view-model.js', 'utf8');
const hbs = readFileSync('templates/shell/partials/games/surface-games-sabacc-table.hbs', 'utf8');
const eng = readFileSync('scripts/games/games/sabacc/sabacc-engine.js', 'utf8');
assert.match(eng, /const total = toCall \+ raiseBy;/, 'engine cost rule this bound is derived from');
assert.match(vm, /maxRaise: Math\.max\(0, Number\(viewerPlayer\?\.tableCredits \|\| 0\) - /);
assert.match(hbs, /min="\{\{vm\.activeTable\.sabacc\.betting\.minRaise\}\}" max="\{\{vm\.activeTable\.sabacc\.betting\.maxRaise\}\}"/);
assert.doesNotMatch(hbs, /name="amount" min="\{\{vm\.activeTable\.sabacc\.betting\.minRaise\}\}" max="\{\{vm\.activeTable\.sabacc\.betting\.maxBet\}\}"/);
// arithmetic of the bound
const maxRaise = (credits, toCall) => Math.max(0, credits - toCall);
assert.equal(maxRaise(50, 20) + 20, 50); assert.equal(maxRaise(10, 20), 0);
console.log('sabacc raise bound: ok');

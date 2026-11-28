import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader(); installFoundryShimGlobals();
const { buildBettingVm } = await import('../scripts/games/games/hintaro/hintaro-view-model.js');
const st = (currentBet, paid = 0) => ({ ante: 5, betting: { currentBet, minBet: 10, minRaise: 10, contributions: { me: paid } } });

// no live wager: bet is affordable only with at least the minimum
let b = buildBettingVm(st(0), 'me', 100);
assert.equal(b.canBet, true); assert.equal(b.maxBet, 100); assert.equal(b.canRaise, false); assert.equal(b.canCheck, true); assert.equal(b.cannotAffordMessage, '');
b = buildBettingVm(st(0), 'me', 5);
assert.equal(b.canBet, false, 'never offers a bet the table credits cannot cover'); assert.match(b.cannotAffordMessage, /not enough to bet/);
// live wager of 20: engine cost of a raise is toCall + raiseBy
b = buildBettingVm(st(20), 'me', 50);
assert.equal(b.toCall, 20); assert.equal(b.canCall, true); assert.equal(b.canRaise, true); assert.equal(b.maxRaise, 30);
assert.equal(b.toCall + b.maxRaise, 50, 'maximum raise spends exactly the credits held');
assert.equal(b.suggestedRaise, 10, 'suggests the minimum raise BY (not toCall + minRaise)');
assert(b.suggestedRaise >= b.minRaise && b.suggestedRaise <= b.maxRaise);
b = buildBettingVm(st(20), 'me', 25);
assert.equal(b.canCall, true); assert.equal(b.canRaise, false, '5 left over is below the minimum raise');
b = buildBettingVm(st(20), 'me', 15);
assert.equal(b.canCall, false); assert.equal(b.canRaise, false); assert.match(b.cannotAffordMessage, /not enough to call/);
// credits already contributed reduce what must be called
b = buildBettingVm(st(20, 10), 'me', 12);
assert.equal(b.toCall, 10); assert.equal(b.canCall, true);
// min is never above max for an offered action
for (const credits of [0, 3, 9, 10, 25, 100]) { const v = buildBettingVm(st(0), 'me', credits); if (v.canBet) assert(v.minBet <= v.maxBet); }
// template: raise input is bounded by maxRaise, and the affordability note exists
const hbs = readFileSync('templates/shell/partials/games/surface-games-hintaro-table.hbs', 'utf8');
assert.match(hbs, /min="\{\{vm\.activeTable\.hintaro\.betting\.minRaise\}\}" max="\{\{vm\.activeTable\.hintaro\.betting\.maxRaise\}\}"/);
assert.match(hbs, /cannotAffordMessage/);
console.log('hintaro betting affordability: ok');

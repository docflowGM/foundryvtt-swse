import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = name => readFileSync(new URL('../'+name, import.meta.url),'utf8');
const darkSidePowers = source('scripts/talents/DarkSidePowers.js');
const devotee = source('scripts/engine/talent/dark-side-devotee-mechanics.js');

function section(body, begin, end) {
 const a=body.indexOf(begin);
 const b=body.indexOf(end,a+begin.length);
 assert.ok(a>=0 && b>a, 'Missing method boundaries: '+begin);
 return body.slice(a,b);
}

test('all five live DarkSidePowers class-talent FP costs call one paid helper',()=>{
 const methods=[
   ['static async triggerChannelAggression(', 'static hasChannelAnger('],
   ['static async triggerChannelAnger(', 'static async endChannelAnger('],
   ['static async triggerCripplingStrike(', 'static hasDarkSideTalisman('],
   ['static async createDarkSideTalisman(', 'static async destroyDarkSideTalisman('],
   ['static async activateSithAlchemicalBonus(', 'static async clearSithAlchemicalBonus('],
 ];
 for(const [begin,end] of methods) {
   // Some following method names may change; ensure this check still covers
   // the real action method rather than an unrelated legacy example.
   const method=section(darkSidePowers,begin,end);
   assert.match(method,/const payment = await _spendFP\(actor, 1\)/,begin);
   assert.match(method,/if \(!payment\.ok\) return \{ success: false, message: payment\.message \}/,begin);
   assert.doesNotMatch(method,/['"]system\.forcePoints\.value['"]\s*:/,begin);
 }
});

test('Sith crafting/weapon bonus consumers use the same paid _spendFP path',()=>{
 const start=darkSidePowers.indexOf('export async function _spendFP(');
 const end=darkSidePowers.indexOf('export function _getDSP(',start);
 const method=darkSidePowers.slice(start,end);
 assert.match(method,/ActorEngine\.spendForcePoints\(actor, amount/);
 assert.match(method,/receipt\?\.spent !== amount/);
 assert.match(method,/return \{ ok: true, before, after: receipt\.remaining, spent: receipt\.spent \}/);
 assert.doesNotMatch(method,/ActorEngine\.updateActor/);
 assert.ok((darkSidePowers.match(/await _spendFP\(actor, 1\)/g)||[]).length>=9,
   'Four craft/weapon consumers plus five talented direct actions should use paid helper');
});

test('alternate DarkSideDevoteeMechanics macro has a real receipt and fail-closed check',()=>{
 const method=section(devotee,'static async createDarkSideTalisman(',
   'static async destroyDarkSideTalisman(');
 assert.match(method,/ActorEngine\.spendForcePoints\(actor, 1/);
 assert.match(method,/receipt\?\.spent !== 1/);
 assert.doesNotMatch(method,/['"]system\.forcePoints\.value['"]\s*:/);
});

test('Dark Side macro registration is active in both legacy UI entrypoints',()=>{
 const modern=source('scripts/talents/dark-side-powers-init.js');
 const alternate=source('scripts/talents/dark-side-devotee-init.js');
 assert.match(modern,/DarkSidePowers\.createDarkSideTalisman\(/);
 assert.match(alternate,/DarkSideDevoteeMacros\.createDarkSideTalismanMacro/);
});

test('committed-spend authority is the existing typed ActorEngine receipt, not delta watchers',()=>{
 const ae=source('scripts/governance/actor-engine/actor-engine.js');
 const method=section(ae,'async spendForcePoints(', 'async spendDestinyPoints(');
 assert.match(method,/await this\.updateActor\(actor, update\)/);
 assert.match(method,/swse\.resourceSpent/);
 assert.match(method,/committed: true/);
 assert.doesNotMatch(darkSidePowers,/['"]system\.forcePoints\.value['"]\s*:\s*(?:currentFP|fp)\s*-/);
 assert.doesNotMatch(devotee,/['"]system\.forcePoints\.value['"]\s*:\s*(?:currentFP|fp)\s*-/);
});

// Clean V2 cutover (owner directive 2026-11-24): the legacy Dark Side / Light Side talent execution graph is RETIRED, not shimmed.
// Published talents stay as Items in packs/talents.db; only their obsolete execution code and macro entry points are gone. This guard
// fails if any of it returns. Offline; not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const walk = (d, out = []) => { for (const e of readdirSync(d)) { if (e === 'node_modules' || e === '.git') continue; const p = join(d, e); const s = statSync(p); if (s.isDirectory()) walk(p, out); else if (/\.(js|mjs|hbs|json)$/.test(p)) out.push(p); } return out; };
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };

const RETIRED_FILES = [
  'scripts/talents/DarkSidePowers.js', 'scripts/talents/dark-side-powers-init.js',
  'scripts/engine/talent/dark-side-devotee-mechanics.js', 'scripts/talents/dark-side-devotee-macros.js', 'scripts/talents/dark-side-devotee-init.js',
  'scripts/engine/talent/light-side-talent-mechanics.js', 'scripts/talents/light-side-talent-macros.js', 'scripts/talents/light-side-init.js',
  'scripts/engine/talent/dark-side-talent-mechanics.js', 'scripts/talents/dark-side-talent-macros.js', 'scripts/talents/dark-side-init.js',
  // non-Force macro wrappers (owner-approved sweep, 2026-11-24)
  'scripts/talents/noble-talent-macros.js', 'scripts/talents/scoundrel-talent-macros.js', 'scripts/talents/scout-talent-macros.js',
  'scripts/talents/soldier-talent-macros.js', 'scripts/talents/prestige-talent-macros.js',
  // their mechanics modules (batch 1 of the dead talent-engine chain)
  'scripts/engine/talent/noble-talent-mechanics.js', 'scripts/engine/talent/scoundrel-talent-mechanics.js', 'scripts/engine/talent/scout-talent-mechanics.js',
  'scripts/engine/talent/soldier-talent-mechanics.js', 'scripts/engine/talent/prestige-talent-mechanics.js'
];
{
  for (const f of RETIRED_FILES) assert.ok(!existsSync(join(root, f)), `${f} must stay retired`);
  ok('the 21 retired legacy files (11 Dark/Light Side + 5 non-Force macro wrappers + 5 mechanics modules) stay deleted');
}
{
  const names = RETIRED_FILES.map((f) => f.split('/').pop().replace(/\.js$/, ''));
  const hits = [];
  for (const f of [...walk(join(root, 'scripts')), join(root, 'index.js'), ...walk(join(root, 'templates')), ...walk(join(root, 'tests')).filter((t) => !t.endsWith('class-force-v2-legacy-talent-retirement.test.mjs'))]) {
    const src = readFileSync(f, 'utf8');
    for (const name of names) if (new RegExp(`(?:/|['"])${name.replace(/[-.]/g, '\\$&')}(?:\\.js)?['"]`).test(src)) hits.push(`${relative(root, f)} -> ${name}`);
  }
  assert.deepEqual(hits, [], `production or test code still imports a retired module: ${hits.join('; ')}`);
  ok('no production file, template or test imports a retired module');
}
{
  const hits = [];
  for (const f of walk(join(root, 'scripts'))) { const src = readFileSync(f, 'utf8'); if (/SWSE\.talents\.darkSidePowers|SWSE\.macros\.swiftPower|window\.SWSE\.macros\s*=/.test(src)) hits.push(relative(root, f)); }
  assert.deepEqual(hits.filter((h) => !/squad-actions-init|minion-actions-init/.test(h)), [], 'the legacy world-macro globals are not installed by any production file');
  ok('the legacy window.SWSE.talents.darkSidePowers / swiftPower macro globals are not installed');
}
{
  // The planner engine and its compatibility shims are gone (batches 2-3 of the dead talent-engine chain).
  assert.ok(!existsSync(join(root, 'scripts/engine/talent/talent-effect-engine.js')), 'TalentEffectEngine stays deleted (no empty facade)');
  const hits = [];
  for (const f of [...walk(join(root, 'scripts')), join(root, 'index.js')]) { const src = readFileSync(f, 'utf8'); if (/TalentEffectEngine|talent-effect-engine|installTalentEffectDamageCompatibility|applyPostDamageEffects/.test(src)) hits.push(relative(root, f)); }
  assert.deepEqual(hits.filter((h) => !h.endsWith('damage-talent-contributions.js')), [], `production code still references the retired talent engine: ${hits.join(', ')}`);
  const ae = readFileSync(join(root, 'scripts/governance/actor-engine/actor-engine.js'), 'utf8');
  assert.doesNotMatch(ae, /applyTalentEffect/, 'ActorEngine.applyTalentEffect (the orphaned plan executor) stays deleted');
  assert.match(ae, /async spendForcePoints\(/); assert.match(ae, /async applyMutationPlan\(/); assert.match(ae, /async updateActor\(/); // primitives intact
  ok('TalentEffectEngine, its damage call, its hotfix shim and ActorEngine.applyTalentEffect stay deleted; ActorEngine primitives intact');
}
{
  // Published content is untouched: the talents themselves remain canonical Items.
  const packs = readFileSync(join(root, 'packs/talents.db'), 'utf8');
  for (const name of ['Channel Aggression', 'Channel Anger', 'Wicked Strike', 'Drain Force', 'Dark Healing']) assert.ok(packs.includes(`"name":"${name}"`) || packs.includes(`"name": "${name}"`), `${name} remains a canonical published talent`);
  ok('published Dark Side talents remain canonical pack Items (only obsolete execution code was retired)');
}
console.log(`class-force-v2-legacy-talent-retirement: ${n} checks passed`);

// Data-quality guard for data/talent-granted-abilities.json (Class/Force x Force V2 audit, 2026-11-23).
// The combat-card metadata must not carry Force Point costs/effects that the canonical records do not support.
// Offline; reads the shipped data and pack records. Not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const data = JSON.parse(read('data/talent-granted-abilities.json'));
const strip = (h) => String(h).replace(/<\/p><p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const packText = (file, name) => {
  for (const line of read(file).split('\n')) {
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.name === name) { const d = o.system?.description; return strip(typeof d === 'object' ? d?.value ?? '' : d ?? ''); }
  }
  return null;
};
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };

// SOURCE_VERIFIED_SPEND_CANDIDATE allow-list: entries whose metadata MAY carry a Force Point cost. Empty until an owner-approved
// canonical implementation exists (Core p.96 generic regain and Force Haze are candidates, but not wired from this file).
const ALLOW = new Set();
const walk = (o, path, out) => {
  if (o && typeof o === 'object') {
    if (Number(o.cost?.forcePoints) > 0) out.push(path);
    for (const [k, v] of Object.entries(o)) walk(v, `${path}/${k}`, out);
  }
  return out;
};
{
  const offenders = [];
  for (const [id, a] of Object.entries(data.abilities)) if (!ALLOW.has(id)) offenders.push(...walk(a, id, []));
  assert.deepEqual(offenders, [], 'no combat-card metadata carries an unapproved Force Point cost');
  ok('no entry in talent-granted-abilities.json carries a Force Point cost outside the (empty) allow-list');
}
{
  const spec = {
    'force-focus': ['packs/talents.db', 'Force Focus'], 'acrobatic-recovery': ['packs/talents.db', 'Acrobatic Recovery'],
    'force-haze': ['packs/talents.db', 'Force Haze'], 'severing-strike': ['packs/talents.db', 'Severing Strike'], 'shien': ['packs/talents.db', 'Shien']
  };
  for (const [id, [file, name]] of Object.entries(spec)) {
    const a = data.abilities[id]; const canon = packText(file, name);
    assert.ok(canon, `${name} has a canonical record`);
    assert.equal(a.description, canon, `${id}: card text equals the canonical record`);
    assert.deepEqual(a.effects, [], `${id}: no invented effects`);
    for (const f of ['trigger', 'alternativeAction', 'specialAction', 'uses', 'roll']) assert.equal(a[f], undefined, `${id}: no invented ${f}`);
    assert.equal(a.metadataAudit?.state, 'CORRECTED_FROM_CANONICAL');
  }
  ok('five talent cards match their canonical pack records and carry no invented trigger/effect/cost');
}
{
  // Force techniques are not talents; the talent-only catalog (TalentActionLinker filters item.type === 'talent') must not carry them.
  const names = new Set(Object.values(data.abilities).map((a) => a.talentName ?? a.name));
  for (const [id, name] of [['force-point-recovery', 'Force Point Recovery'], ['improved-dark-rage', 'Improved Dark Rage']]) {
    assert.equal(data.abilities[id], undefined, `${id} is not a talent card`); assert.ok(!names.has(name), `${name} is not in the talent catalog`);
    assert.ok(packText('packs/forcetechniques.db', name), `${name} keeps its canonical Force technique record`);
    assert.equal(packText('packs/talents.db', name), null, `${name} is not duplicated as a canonical talent`);
  }
  ok('Force Point Recovery and Improved Dark Rage are Force techniques only (canonical record kept, no talent card)');
}
{
  const names = new Set(Object.values(data.abilities).map((a) => a.talentName ?? a.name));
  assert.equal(data.abilities['surge-of-power'], undefined); assert.ok(!names.has('Surge of Power'));
  assert.equal(data._meta.totalAbilities, Object.keys(data.abilities).length, '_meta count matches the catalog');
  ok('Surge of Power cannot reappear without an explicit source/owner decision (and the catalog count is consistent)');
}
{
  const links = JSON.parse(read('data/talent-action-links.json'));
  assert.equal(links.talentToAction['Force Haze'], undefined, 'Force Haze is not associated with melee-attack');
  for (const [action, list] of Object.entries(links.actionToTalents)) assert.ok(!list.includes('Force Haze'), `Force Haze not listed under ${action}`);
  assert.ok(links.unmappedTalents.includes('Force Haze'));
  assert.equal(links.totalTalents, Object.keys(links.talentToAction).length); assert.equal(links.unmapped, links.unmappedTalents.length);
  ok('Force Haze has no unsupported action association; link-file counts are consistent');
}
console.log(`talent-granted-abilities-metadata-guard: ${n} checks passed`);

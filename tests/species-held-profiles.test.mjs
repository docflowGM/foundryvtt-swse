import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { observeSpecies } from './helpers/species-trait-observer.mjs';

// Closeout guard for the explicitly deferred audited profiles and the deferred outside-inventory records.
// Each of them must stay correctly contained: no invented rules, no organic-species implementation for droid shells.
const recs = Object.fromEntries(readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean)
  .map(l => JSON.parse(l)).map(r => [r.name, r.system]));
const register = readFileSync(new URL('../docs/audits/swse-rules-decisions-pending.md', import.meta.url), 'utf8');
const { DISPLAY_ONLY_UNTYPED_NATURAL_ATTACKS } = await import('../tools/lib/species-profile-hydrator.mjs');

// ---- Lugubraa (RD-015): profile hydrated, the disputed natural attacks stay unautomated, no damage type is invented ----
{
  const snap = recs.Lugubraa.variants.find(v => v.completeSnapshot);
  assert.equal(snap.sourceProfileId, 'UR-2B-13');
  assert.deepEqual(snap.naturalWeapons, [], 'no natural-weapon data without a printed damage type');
  const o = await observeSpecies('Lugubraa');
  assert.deepEqual(o.ctx.ledger.naturalWeapons, []);
  assert.deepEqual(o.items.filter(n => /tentacle|teeth|bite/i.test(n)), [], 'no natural-weapon item is created');
  const naturalText = snap.traits.filter(t => /^natural-weapons/.test(t.id));
  assert.equal(naturalText.length, 2, 'both printed natural attacks remain as text');
  for (const t of naturalText) assert.doesNotMatch(t.description, /piercing|slashing|bludgeoning|energy|sonic/i, `${t.id}: no invented damage type`);
  assert.deepEqual(o.fixedFeatGrants, ['Improved Damage Threshold'], 'the unambiguous fixed feat is still granted');
  assert.deepEqual([...DISPLAY_ONLY_UNTYPED_NATURAL_ATTACKS.entries()], [['UR-2B-13', 'SPECIES-RD-015']], 'the display-only exception is limited to this profile');
  assert.match(register, /SPECIES-RD-015/);
}

// ---- Dashade (RD-016): legacy record only; no Basic is invented and no snapshot claims the language question is settled ----
{
  assert.ok(!(recs.Dashade.variants ?? []).some(v => v.completeSnapshot), 'Dashade has no verified snapshot');
  const o = await observeSpecies('Dashade');
  assert.deepEqual(o.ctx.ledger.languages.automatic, ['Dashadi'], 'only the legacy record language; never Basic');
  assert.match(register, /SPECIES-RD-016/);
}

// ---- Shard: droid shell, never organic creation ----
{
  assert.ok(!(recs.Shard.variants ?? []).some(v => v.completeSnapshot), 'Shard has no snapshot until the V2 droid framework supports a retains-Constitution shell');
  const o = await observeSpecies('Shard');
  const d = o.actor.flags.swse.droidBuilderSpecies;
  assert.equal(d.required, true, 'selecting Shard requires the droid builder step');
  assert.equal(d.mode, 'species-droid-shell');
  assert.equal(d.speciesActsAsDroid, true);
  assert.equal(d.retainsConstitution, true);
  assert.equal(o.ctx.ledger.rules.noConstitution, false, 'Constitution is retained inside the shell');
  assert.deepEqual(o.ctx.ledger.naturalWeapons, []);
  assert.match(readFileSync(new URL('../docs/audits/swse-species-shard-droid-integration.md', import.meta.url), 'utf8'), /Gaps to close before hydrating Shard/);
}

// ---- Replica Droid (outside inventory): droid chassis required; the pack/book language difference is documented, not silently changed ----
{
  const o = await observeSpecies('Replica Droid');
  const d = o.actor.flags.swse.droidBuilderSpecies;
  assert.equal(d.required, true);
  assert.equal(d.mode, 'replica-droid');
  assert.equal(o.ctx.ledger.rules.noConstitution, true);
  assert.deepEqual(o.ctx.ledger.languages.automatic, ['Binary', 'Replicated species native language']);
  const prov = JSON.parse(readFileSync(new URL('../tools/data/species-outside-provenance.json', import.meta.url), 'utf8'));
  assert.match(prov['Replica Droid'].note, /Basic and the native language/);
}

// ---- O'reenian (RD-020) stays a plain record ----
assert.ok(!(recs["O'reenian"].variants ?? []).some(v => v.completeSnapshot));
assert.match(register, /SPECIES-RD-020/);
console.log('species-held-profiles: ok');

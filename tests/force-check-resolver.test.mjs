import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveForceCheck, readTargetDefense } from '../scripts/engine/force/force-check-resolver.js';
const defs = new Map(JSON.parse(readFileSync('data/force-v2/definitions.json', 'utf8')).definitions.map((d) => [d.definitionId, d]));
const D = (id) => defs.get(id);

// Force Blast: DC tier AND strictly greater than Reflex (explicit comparator in the certified definition)
const blast = D('fucg/force-power/force-blast');
let r = resolveForceCheck(blast, { total: 21, defenseValue: 21 });
assert.equal(r.outcome, 'tier-met-defense-failed', 'equal does NOT beat Reflex for a strictly-greater power'); assert.equal(r.meetsDefense, false);
assert.equal(r.tier.dc, 20, 'highest qualifying tier');
r = resolveForceCheck(blast, { total: 21, defenseValue: 20 });
assert.equal(r.outcome, 'tier-and-defense-met'); assert.equal(r.operations[0].dice, '3d6');
assert.equal(resolveForceCheck(blast, { total: 14, defenseValue: 5 }).outcome, 'below-minimum-dc', 'DC floor still applies');

// at-least comparator (Malacia): equal meets
const malacia = D('cwcg/force-power/malacia');
assert.equal(resolveForceCheck(malacia, { total: 17, defenseValue: 17 }).outcome, 'defense-met');
assert.equal(resolveForceCheck(malacia, { total: 16, defenseValue: 17 }).outcome, 'defense-failed');

// conditional defense bonus (Resist Force / Valor, FP-RD-012) and target size adjustment raise the effective defense
r = resolveForceCheck(malacia, { total: 17, defenseValue: 15, defenseBonuses: [2] });
assert.equal(r.effectiveDefense, 17); assert.equal(r.meetsDefense, true);
assert.equal(resolveForceCheck(malacia, { total: 17, defenseValue: 15, defenseBonuses: [3] }).meetsDefense, false, 'bonus can turn a hit into a miss');

// unspecified comparator is NOT defaulted (FP-RD-016): reported, no success claimed
const grip = D('core/force-power/force-grip');
r = resolveForceCheck(grip, { total: 22, defenseValue: 18, targetSize: 'large' });
assert.equal(r.status, 'comparator-unspecified'); assert.equal(r.meetsDefense, null); assert.equal(r.outcome, 'comparator-unspecified');
assert.equal(r.effectiveDefense, 23, 'printed large-target Fortitude bonus (+5) is applied');
assert.equal(r.tier.dc, 20);
// unknown defense is never assumed
r = resolveForceCheck(blast, { total: 25, defenseValue: null });
assert.equal(r.outcome, 'needs-target-defense'); assert.equal(r.meetsDefense, null);
// fixed-dc only power: tier selection, no defense
const fixed = [...defs.values()].find((d) => d.domain === 'force-power' && d.activation.check.mode === 'fixed-dc' && (d.resolution.dcTiers ?? []).length >= 2);
r = resolveForceCheck(fixed, { total: fixed.resolution.dcTiers[1].dc });
assert.equal(r.outcome, 'tier-met'); assert.equal(r.tier.dc, fixed.resolution.dcTiers[1].dc);
// modes without a complete typed contract stay unresolved
const margin = D('core/force-power/force-stun');
r = resolveForceCheck(margin, { total: 30, defenseValue: 10 });
assert.equal(r.status, 'unresolved'); assert.match(r.notes.join(' '), /adjudicate/);
// defensive input
assert.equal(resolveForceCheck(null, { total: 10 }).status, 'unresolved');
assert.equal(resolveForceCheck(blast, { total: 'x' }).status, 'unresolved');
// defense reader
assert.equal(readTargetDefense({ system: { derived: { defenses: { will: { total: 17 } } } } }, 'will'), 17);
assert.equal(readTargetDefense({ system: {} }, 'will'), null, 'no invented 10');
assert.equal(readTargetDefense({ system: { derived: { defenses: { will: { total: 17 } } } } }, 'bogus'), null);

// census: how many powers each comparator state covers (documents FP-RD-016 scope)
const defended = [...defs.values()].filter((d) => d.domain === 'force-power' && ['defense', 'fixed-dc-and-defense', 'defense-per-target'].includes(d.activation.check.mode));
const explicit = defended.filter((d) => ['at-least', 'strictly-greater-than'].includes(d.powerRules?.defenseComparator));
assert.equal(defended.length, 28, 'defense-gated powers in the corpus'); assert.equal(explicit.length, 9, 'with an explicit printed comparator');
console.log('force check resolver: ok');

// Post-certification canonical amendments (Phase 5D-D DATA_DEFECT correction).
// The certified Phase 3B/4H audits are frozen historical evidence (their pins, the 3C ledger, the 3D freeze and the 4E census
// verify those frozen inputs and are NOT rewritten to match later rulings). A source-proven correction to the operational
// canonical corpus is instead recorded here as a controlled amendment: every entry asserts its pre-condition (a source shift
// fails the build), is applied to the audit-derived record by tools/build-canonical-weapons.mjs, is re-verified by `--check`,
// is logged in the corpus (`postCertificationAmendments`) and stamped on the amended record's provenance.
const clone = (x) => JSON.parse(JSON.stringify(x));
const need = (cond, msg) => { if (!cond) throw new Error(`canonical amendment pre-condition failed: ${msg}`); };

export const POST_CERTIFICATION_AMENDMENT_IDS = ['5D-D-thrown-profile-ranged-branch'];

const THROWN_RANGED = [
  {
    identityKey: 'unmapped::Darkstick', weaponLevelProficiency: 'exotic', weaponGroup: 'Exotic Weapon',
    source: { book: 'Galaxy at War', page: '36', evidence: 'The darkstick can be thrown; its table entry marks it throwable.' },
  },
  {
    identityKey: 'unmapped::Static Pike', weaponLevelProficiency: 'advanced-melee', weaponGroup: 'Advanced Melee Weapon',
    source: { book: 'Galaxy at War', page: '36 (table), 37 (description)', evidence: 'The static pike is balanced so it can be thrown like a spear.' },
  },
];
const CORE_RULE = 'Core Rulebook: throwing a weapon is a ranged attack (attack roll uses Dexterity); thrown-weapon damage still uses Strength.';

/**
 * Apply the amendments to ONE derived canonical record (audit-derived fields, production excluded). Returns the (possibly
 * amended) record; `log` receives one entry per amendment actually applied.
 */
export function applyPostCertificationAmendments(rec, log = []) {
  const spec = THROWN_RANGED.find((x) => x.identityKey === rec.identityKey);
  if (!spec) return rec;
  const out = clone(rec);
  const thrown = out.canonicalStats.attackProfiles.find((p) => p.id === 'thrown');
  const melee = out.canonicalStats.attackProfiles.find((p) => p.id === 'melee');
  need(out.canonicalStats.attackProfiles.map((p) => p.id).join() === 'melee,thrown', `${spec.identityKey} has melee+thrown profiles`);
  need(out.weaponGroup === spec.weaponGroup && out.schemaFamily.branch === 'melee' && out.schemaFamily.proficiency === spec.weaponLevelProficiency, `${spec.identityKey} weapon-level identity is ${spec.weaponGroup} / melee / ${spec.weaponLevelProficiency} and stays unchanged`);
  need(melee.schemaFamily.branch === 'melee' && melee.range.mode === 'melee', `${spec.identityKey} melee profile is a melee attack`);
  need(thrown.schemaFamily.branch === 'melee' && thrown.range.mode === 'ranged' && thrown.range.profileId === 'thrown-weapons' && thrown.qualities.thrown === true,
    `${spec.identityKey} thrown profile currently contradicts itself (branch melee + ranged thrown-weapons range)`);
  need(thrown.schemaFamily.proficiency === spec.weaponLevelProficiency, `${spec.identityKey} thrown profile proficiency is the weapon's (${spec.weaponLevelProficiency}) and does not change`);
  thrown.schemaFamily = { ...thrown.schemaFamily, branch: 'ranged' };
  out.provenance = { ...out.provenance, postCertificationAmendments: [...(out.provenance.postCertificationAmendments ?? []), POST_CERTIFICATION_AMENDMENT_IDS[0]] };
  log.push({
    id: POST_CERTIFICATION_AMENDMENT_IDS[0], classification: 'DATA_DEFECT', phase: '5D-D', identityKey: spec.identityKey,
    field: 'canonicalStats.attackProfiles[id=thrown].schemaFamily.branch', from: 'melee', to: 'ranged',
    unchanged: ['weaponGroup', 'schemaFamily (weapon level)', 'attackProfiles[thrown].schemaFamily.proficiency', 'attackProfiles[thrown].range', 'attackProfiles[thrown].damage', 'attackProfiles[thrown].damageType', 'attackProfiles[melee]'],
    source: spec.source, rule: CORE_RULE,
    reason: 'The weapon stays a melee weapon (group/proficiency unchanged); the SELECTED thrown attack is a ranged attack and already carried the global thrown-weapons ranged range block.',
  });
  return out;
}

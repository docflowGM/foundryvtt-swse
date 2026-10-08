// Post-certification canonical amendments (Phase 5D-D DATA_DEFECT correction).
// The certified Phase 3B/4H audits are frozen historical evidence (their pins, the 3C ledger, the 3D freeze and the 4E census
// verify those frozen inputs and are NOT rewritten to match later rulings). A source-proven correction to the operational
// canonical corpus is instead recorded here as a controlled amendment: every entry asserts its pre-condition (a source shift
// fails the build), is applied to the audit-derived record by tools/build-canonical-weapons.mjs, is re-verified by `--check`,
// is logged in the corpus (`postCertificationAmendments`) and stamped on the amended record's provenance.
const clone = (x) => JSON.parse(JSON.stringify(x));
const need = (cond, msg) => { if (!cond) throw new Error(`canonical amendment pre-condition failed: ${msg}`); };

export const POST_CERTIFICATION_AMENDMENT_IDS = ['5D-D-thrown-profile-ranged-branch'];
export const AREA_GEOMETRY_AMENDMENT_ID = '5D-H-area-geometry-backfill';

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
  return applyGrenadeFamily(applyAreaGeometryBackfill(applyThrownRanged(rec, log), log), log);
}

function applyThrownRanged(rec, log) {
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

// ---- Phase 5D-H: source-backed area geometry backfill --------------------------------------------------------------------------
// The certified profile `area` block of these forms said "geometry and miss rule are not captured ... until a source-backed backfill"
// while the SAME certified record already carried the published numbers in `operation.area` / the player text. Core Rulebook Area
// Attacks (p.155): one attack roll against every target's Reflex Defense; creatures you hit take full damage, creatures you miss take half.
const AREA_GENERAL = 'Core Rulebook, Area Attacks (p.155): single attack roll vs the Reflex Defense of every target in the area; hit = full damage, miss = half damage.';
const AREA_BACKFILL = [
  { identityKey: 'weapon-frag-grenade', area: { shape: 'burst', radiusSquares: 2 }, onMiss: 'half-damage', source: { book: 'Core Rulebook', page: '128', evidence: 'A fragmentation grenade ... affects a 2-square burst radius. Targets hit take full damage and targets missed take half damage.' } },
  { identityKey: 'weapon-ion-grenade', area: { shape: 'burst', radiusSquares: 2 }, onMiss: 'target-dependent-half-or-none', source: { book: 'Core Rulebook', page: '128', evidence: 'An ion grenade ... affects a 2-square burst radius. Droids/vehicles/electronics/cybernetic creatures missed take half; creatures without cybernetics take none on a miss.' } },
  { identityKey: 'weapon-stun-grenade', area: { shape: 'burst', radiusSquares: 2 }, onMiss: 'half-damage', source: { book: 'Core Rulebook', page: '128', evidence: 'A stun grenade ... affects a 2-square burst radius. Targets hit take full stun damage and targets missed take half stun damage.' } },
  { identityKey: 'weapon-thermal-detonator', area: { shape: 'burst', radiusSquares: 4 }, onMiss: 'half-damage', source: { book: 'Core Rulebook', page: '129', evidence: 'compare it to the Reflex Defense of every target in its 4-square burst radius. Targets hit take full damage and targets missed take half damage.' } },
  { identityKey: 'weapon-flamethrower', area: { shape: 'cone', lengthSquares: 6, widthAtEndSquares: 6 }, onMiss: 'half-damage', source: { book: 'Core Rulebook', page: '127 (description), 155 (Area Attacks miss rule)', evidence: 'shoots a cone of burning chemicals 6 squares long and 6 squares wide at the terminus; the description states no separate miss rule, so the general area-attack rule (miss = half) applies.' } },
  { identityKey: 'weapon-blaster-cannon', area: { shape: 'primary-target-plus-adjacent', radiusSquares: 1 }, onMiss: 'half-damage', source: { book: 'Core Rulebook', page: '125 (description), 126 (table)', evidence: 'full damage to the target on a hit and half on a miss; every creature or object adjacent to the target takes half damage on a hit and none on a miss. (Same encoding as the certified Heavy Blaster Cannon.)' } },
];

function applyAreaGeometryBackfill(rec, log) {
  const spec = AREA_BACKFILL.find((x) => x.identityKey === rec.identityKey);
  if (!spec) return rec;
  const out = clone(rec);
  const profile = out.canonicalStats.attackProfiles[0];
  need(out.canonicalStats.attackProfiles.length === 1 && profile.id === 'primary', `${spec.identityKey} has exactly the primary profile`);
  need(profile.area?.enabled === true && profile.area.shape === null, `${spec.identityKey} area is enabled without geometry`);
  need(profile.attackResolution?.onMiss === 'unspecified', `${spec.identityKey} miss rule is unspecified`);
  const before = { area: clone(profile.area), onMiss: profile.attackResolution.onMiss };
  profile.area = { ...profile.area, ...spec.area, notes: [`Source-backed geometry backfill (${AREA_GEOMETRY_AMENDMENT_ID}): ${spec.source.book} p.${spec.source.page}.`] };
  profile.attackResolution = { ...profile.attackResolution, onMiss: spec.onMiss };
  out.provenance = { ...out.provenance, postCertificationAmendments: [...(out.provenance.postCertificationAmendments ?? []), AREA_GEOMETRY_AMENDMENT_ID] };
  log.push({
    id: AREA_GEOMETRY_AMENDMENT_ID, classification: 'DATA_DEFECT', phase: '5D-H', identityKey: spec.identityKey,
    field: 'canonicalStats.attackProfiles[id=primary].area + attackResolution.onMiss',
    from: { shape: before.area.shape, onMiss: before.onMiss }, to: { ...spec.area, onMiss: spec.onMiss },
    source: spec.source, rule: AREA_GENERAL,
    reason: 'Published area geometry/miss rule was present in the certified player text and operation block but missing from the executable profile area record.',
  });
  return out;
}

// ---- Phase 5D-H: canonical `grenade` weapon family ---------------------------------------------------------------------------------
// Angled Throw, Forceful Blast, Higher Yield, Mighty Throw, Flash and Clear and Artillery Shot all scope themselves to "Grenades"
// (Core Rulebook p.127-129 grenade stat table; KOTOR Campaign Guide p.68 / p.180 grenade rows). The certified selectors carried no grenade
// family (these records had families: []), so a canonical grenade could only be recognised by its display name. The family is added
// to exactly the twelve grenade-table identities; the weapon-level group/proficiency (simple weapons) is unchanged.
export const GRENADE_FAMILY_AMENDMENT_ID = '5D-H-grenade-family';
const GRENADE_IDENTITIES = ['weapon-adhesive-grenade', 'weapon-concussion-grenade', 'weapon-cryoban-grenade', 'weapon-emp-grenade', 'weapon-frag-grenade', 'weapon-gas-grenade',
  'weapon-ion-grenade', 'weapon-radiation-grenade', 'weapon-remote-grenade', 'weapon-smoke-grenade', 'weapon-stun-grenade', 'weapon-thermal-detonator'];
function applyGrenadeFamily(rec, log) {
  if (!GRENADE_IDENTITIES.includes(rec.identityKey)) return rec;
  const out = clone(rec);
  need(out.schemaFamily.branch === 'ranged' && out.schemaFamily.proficiency === 'simple', `${rec.identityKey} is a ranged simple weapon`);
  need(Array.isArray(out.selectors?.families) && !out.selectors.families.includes('weapon-family:grenade'), `${rec.identityKey} has no grenade family yet`);
  out.selectors = { ...out.selectors, families: [...out.selectors.families, 'weapon-family:grenade'].sort() };
  out.provenance = { ...out.provenance, postCertificationAmendments: [...(out.provenance.postCertificationAmendments ?? []), GRENADE_FAMILY_AMENDMENT_ID] };
  log.push({
    id: GRENADE_FAMILY_AMENDMENT_ID, classification: 'DATA_COMPLETENESS', phase: '5D-H', identityKey: rec.identityKey, field: 'selectors.families',
    from: rec.selectors.families, to: out.selectors.families,
    source: { book: 'Core Rulebook / Knights of the Old Republic Campaign Guide', page: '127-129 / 68, 180', evidence: 'Listed under the Grenades heading of the ranged-weapons tables; abilities (Angled Throw, Forceful Blast, Higher Yield, Mighty Throw) scope themselves to Grenades.' },
    rule: 'Weapons declare what they are: a grenade is declared structurally so abilities need not match a display name.',
    reason: 'The certified selectors had no grenade family, forcing name matching for every Grenade-scoped ability.',
  });
  return out;
}

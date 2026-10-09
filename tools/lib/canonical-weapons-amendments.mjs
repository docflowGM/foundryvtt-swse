// Post-certification canonical amendments (Phase 5D-D DATA_DEFECT correction).
// The certified Phase 3B/4H audits are frozen historical evidence (their pins, the 3C ledger, the 3D freeze and the 4E census
// verify those frozen inputs and are NOT rewritten to match later rulings). A source-proven correction to the operational
// canonical corpus is instead recorded here as a controlled amendment: every entry asserts its pre-condition (a source shift
// fails the build), is applied to the audit-derived record by tools/build-canonical-weapons.mjs, is re-verified by `--check`,
// is logged in the corpus (`postCertificationAmendments`) and stamped on the amended record's provenance.
const clone = (x) => JSON.parse(JSON.stringify(x));
const same = (a, b) => { const k = (v) => (v && typeof v === 'object' ? (Array.isArray(v) ? v.map(k) : Object.fromEntries(Object.keys(v).sort().map((x) => [x, k(v[x])]))) : v); return JSON.stringify(k(a)) === JSON.stringify(k(b)); };
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
  return applyICAStructure(applyIBStructure(applyOperationStructureBackfill(applyGrenadeFamily(applyAreaGeometryBackfill(applyThrownRanged(rec, log), log), log), log), log), log);
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

// ---- Phase 5D-I-A: structured action cost for a published operation rule ----------------------------------------------------------------
// operation.rangeStepReductionPreparation published its action cost only as free text ("two swift actions in same round immediately before
// attack"); the runtime must not parse prose. The same certified source sentence is carried as a structured requiredActions list.
export const OPERATION_STRUCTURE_AMENDMENT_ID = '5D-I-A-operation-structure-backfill';
const OPERATION_STRUCTURE = [
  {
    identityKey: 'weapon-e-web-missile-launcher', key: 'rangeStepReductionPreparation', prose: 'two swift actions in same round immediately before attack',
    add: { requiredActions: [{ action: 'swift', count: 2 }] },
    source: { book: 'Force Unleashed Campaign Guide', page: '198', evidence: 'The wielder can spend two swift actions before an attack to treat the target\'s range as one step shorter.' },
  },
];
function applyOperationStructureBackfill(rec, log) {
  const spec = OPERATION_STRUCTURE.find((x) => x.identityKey === rec.identityKey);
  if (!spec) return rec;
  const out = clone(rec);
  need(out.operation?.[spec.key]?.actions === spec.prose, `${spec.identityKey} operation.${spec.key}.actions is the published prose`);
  need(out.operation[spec.key].requiredActions === undefined, `${spec.identityKey} operation.${spec.key} has no structured requiredActions yet`);
  const before = clone(out.operation[spec.key]);
  out.operation[spec.key] = { ...before, ...spec.add };
  out.provenance = { ...out.provenance, postCertificationAmendments: [...(out.provenance.postCertificationAmendments ?? []), OPERATION_STRUCTURE_AMENDMENT_ID] };
  log.push({
    id: OPERATION_STRUCTURE_AMENDMENT_ID, classification: 'DATA_COMPLETENESS', phase: '5D-I-A', identityKey: spec.identityKey, field: `operation.${spec.key}.requiredActions`,
    from: before, to: out.operation[spec.key], source: spec.source,
    rule: 'The runtime reads structured fields only; prose action costs are never parsed.',
    reason: 'The certified action cost was present only as a prose string; a structured copy of the same sentence lets the existing action-economy pipeline pay it.',
  });
  return out;
}

// ---- Phase 5D-I-B: structure for rules the source states in prose only -----------------------------------------------------------------
// 1. Siang Lance attacks of opportunity: the weapon states that its wielder chooses a ranged shot OR the bayonet; the choice ids already
//    exist (operation.attackOfOpportunityChoices) but nothing said WHICH attack profile each makes. A structured map is added.
// 2. Long Haft Form identity: the Lightsaber Pike / Long-Handle Lightsaber entries (Jedi Academy Training Manual) name a "Long Haft Form
//    feat (see page 23)". Page 23 prints one feat -- "Long Haft Strike", prerequisite "Proficient with weapon used", benefit "When you use a
//    lightsaber pike or a long-handle lightsaber, you can attack with both ends of the weapon, treating it as a double weapon" -- which is
//    exactly the cited rule; no other page-23 feat exists and the corpus has no feat named "Long Haft Form". The weapon entries therefore use
//    a printed-name VARIANT of the page-23 feat. The relationship is stored explicitly (canonical feat identity + printed name); combat
//    execution never substitutes by display name.
// 3. Bayonet: "A bayonet detached from a rifle is treated as a knife" (Core Rulebook p.121). The Vibrobayonet already carries this as
//    configuration states + operation.configurationResolution (detached -> Vibrodagger); the Bayonet carried only operation.detachedTreatAs
//    prose. The same structure is added, resolving the detached configuration as the canonical Knife.
export const IB_STRUCTURE_AMENDMENT_ID = '5D-I-B-structure-backfill';
export const LONG_HAFT_FEAT_IDENTITY = 'feat::jedi-academy-training-manual::p23::long-haft-strike';
const SIANG = { identityKey: 'weapon-siang-lance', map: { 'ranged-shot': 'ranged', 'affixed-bayonet': 'bayonet-aao' }, source: { book: 'Rebellion Era Campaign Guide', page: '50', evidence: 'A siang lance can be used to make attacks of opportunity. When you [make one], you can choose to fire the siang lance as a ranged weapon or to use the weapon\'s bayonet [as a melee weapon].' } };
const HAFT = [
  { identityKey: 'lightsaber-chassis-longhandle', profileId: 'haft-end', source: { book: 'Jedi Academy Training Manual', page: '53 (weapon entry citing "Long Haft Form feat (see page 23)"); 23 (feat "Long Haft Strike")', evidence: 'weapon entry: "a character with the Long Haft Form feat (see page 23) can use the long-handle lightsaber as a double weapon"; page 23 feat Long Haft Strike: "When you use a lightsaber pike or a long-handle lightsaber, you can attack with both ends of the weapon, treating it as a double weapon."' } },
  { identityKey: 'lightsaber-chassis-pike', profileId: 'haft-end', source: { book: 'Jedi Academy Training Manual', page: '53 (weapon entry citing "Long Haft Form feat (see page 23)"); 23 (feat "Long Haft Strike")', evidence: 'weapon entry: "a character with the Long Haft Form feat (see page 23) can use the lightsaber pike as a double weapon"; page 23 feat Long Haft Strike: same benefit text.' } },
];
const BAYONET = { identityKey: 'unmapped::Bayonet', source: { book: 'Core Rulebook', page: '121', evidence: 'A bayonet detached from a rifle is treated as a knife; a mounted bayonet deals more damage than the knife because of the added leverage and bulk.' } };

function applyIBStructure(rec, log) {
  let out = rec;
  const stamp = (r) => ({ ...r.provenance, postCertificationAmendments: [...(r.provenance.postCertificationAmendments ?? []), IB_STRUCTURE_AMENDMENT_ID] });
  if (rec.identityKey === SIANG.identityKey) {
    out = clone(rec);
    need(JSON.stringify(out.operation.attackOfOpportunityChoices) === JSON.stringify(['ranged-shot', 'affixed-bayonet']), 'siang lance declares the two attack-of-opportunity choices');
    need(out.operation.attackOfOpportunityProfiles === undefined, 'siang lance has no choice->profile map yet');
    need(['ranged', 'bayonet-aao'].every((id) => out.canonicalStats.attackProfiles.some((p) => p.id === id)), 'siang lance has the ranged and bayonet-aao profiles');
    out.operation.attackOfOpportunityProfiles = clone(SIANG.map);
    out.provenance = stamp(out);
    log.push({ id: IB_STRUCTURE_AMENDMENT_ID, classification: 'DATA_COMPLETENESS', phase: '5D-I-B', identityKey: rec.identityKey, field: 'operation.attackOfOpportunityProfiles', from: null, to: SIANG.map, source: SIANG.source,
      rule: 'The runtime reads structured fields only: each declared attack-of-opportunity choice names the attack profile it makes.', reason: 'The choices were declared by id only; nothing said which profile each one resolves to.' });
    return out;
  }
  const haft = HAFT.find((h) => h.identityKey === rec.identityKey);
  if (haft) {
    out = clone(rec);
    const profile = out.canonicalStats.attackProfiles.find((p) => p.id === haft.profileId);
    const req = profile?.activationRequirements?.find((r) => r.type === 'feat');
    need(req && req.id === 'Long Haft Form' && req.identityKey === undefined, `${haft.identityKey}/${haft.profileId} requires the printed feat name "Long Haft Form"`);
    const before = clone(req);
    Object.assign(req, { identityKey: LONG_HAFT_FEAT_IDENTITY, printedAs: 'Long Haft Form', identityRuling: 'PRINTED_NAME_VARIANT_OF_PAGE_23_FEAT' });
    out.provenance = stamp(out);
    log.push({ id: IB_STRUCTURE_AMENDMENT_ID, classification: 'DATA_COMPLETENESS', phase: '5D-I-B', identityKey: rec.identityKey, field: `canonicalStats.attackProfiles[id=${haft.profileId}].activationRequirements[type=feat]`, from: before, to: clone(req), source: haft.source,
      rule: 'Execution joins on the canonical feat identity; the printed name is recorded as provenance only and is never matched.', reason: 'The weapon cites "Long Haft Form (see page 23)"; the page-23 feat is the canonical "Long Haft Strike" -- the relationship is now explicit.' });
    return out;
  }
  if (rec.identityKey === BAYONET.identityKey) {
    out = clone(rec);
    need(out.operation.detachedTreatAs === 'Knife' && out.operation.configurationResolution === undefined, 'bayonet carries only the detachedTreatAs prose');
    need((out.canonicalStats.configurationStates ?? []).length === 0 && out.canonicalStats.attackProfiles.length === 1 && out.canonicalStats.attackProfiles[0].id === 'primary', 'bayonet has a single primary profile and no configuration states');
    need((out.selectors.modes ?? []).length === 0, 'bayonet selectors carry no modes');
    out.canonicalStats.configurationStates = [
      { attackUsable: true, default: true, id: 'mounted-on-rifle', label: 'Mounted on a rifle' },
      { attackUsable: true, default: false, id: 'detached', label: 'Detached (treated as a Knife)' },
    ];
    out.canonicalStats.attackProfiles[0].activationRequirements = [{ id: 'mounted-on-rifle', type: 'configuration' }];
    out.operation.configurationResolution = { detached: { resolveAsIdentityKey: 'unmapped::Knife', resolveAsProfileId: 'primary' } };
    out.selectors = { ...out.selectors, modes: [{ condition: 'rifle stock not folded; two-handed use', effect: 'mounted bayonet: Core bayonet damage', profile: 'mounted-on-rifle' }, { effect: 'treated as a Knife', profile: 'detached' }] };
    out.provenance = stamp(out);
    log.push({ id: IB_STRUCTURE_AMENDMENT_ID, classification: 'DATA_COMPLETENESS', phase: '5D-I-B', identityKey: rec.identityKey, field: 'canonicalStats.configurationStates + operation.configurationResolution + attackProfiles[primary].activationRequirements + selectors.modes',
      from: { detachedTreatAs: 'Knife' }, to: { configurations: ['mounted-on-rifle', 'detached'], configurationResolution: out.operation.configurationResolution }, source: BAYONET.source,
      rule: 'A detached weapon resolves as the referenced canonical weapon (no values are copied).', reason: 'The detached rule was prose only; the Vibrobayonet already uses this exact structure.' });
    return out;
  }
  if (rec.identityKey === 'unmapped::Wan-Shen') {
    out = clone(rec);
    const assembled = out.canonicalStats.configurationStates.find((c) => c.id === 'assembled');
    const disassembled = out.canonicalStats.configurationStates.find((c) => c.id === 'disassembled');
    need(assembled && assembled.transitionAction === undefined && disassembled?.transitionAction === 'full-round', 'wan-shen prices only the disassembled state');
    assembled.transitionAction = 'full-round';
    out.provenance = stamp(out);
    log.push({ id: IB_STRUCTURE_AMENDMENT_ID, classification: 'DATA_COMPLETENESS', phase: '5D-I-B', identityKey: rec.identityKey, field: 'canonicalStats.configurationStates[id=assembled].transitionAction', from: null, to: 'full-round',
      source: { book: 'Jedi Academy Training Manual', page: '54', evidence: 'Assembling or disassembling a wan-shen is a full-round action.' },
      rule: 'Each configuration states the action that enters it.', reason: 'The disassemble action was structured; the identical, source-stated assemble action was only in operation.assemblyAction.' });
    return out;
  }
  return rec;
}

// ---- Phase 5D-I-C-A: structure for outcome riders the source states in prose only ------------------------------------------------------
// The certified operation riders / payload effects below carry their trigger, status and duration only as prose sentences. The runtime
// reads structured fields and never parses prose, so the SAME source sentence is added as a `structure` object beside the untouched
// prose. Comparison words follow the source: "exceeds" / "beats" is a strict comparison; "equals or exceeds" (not used here) is >=.
export const ICA_STRUCTURE_AMENDMENT_ID = '5D-I-C-A-outcome-structure-backfill';
const ICA_OPERATION_STRUCTURE = [
  {
    identityKey: 'weapon-carbonite-rifle', key: 'conditionTrackRider',
    prose: { effect: 'target is immobilized until end of its next turn', trigger: 'target is moved down condition track by this weapon' },
    structure: { trigger: 'target-moved-down-condition-track-by-this-damage', status: 'immobilized', duration: { owner: 'target', through: 'end-of-next-turn' } },
    source: { book: 'Knights of the Old Republic Campaign Guide', page: '69 (description; stat table p.68)', evidence: 'A target moved down the condition track by a carbonite rifle is also immobilized until the end of its next turn.' },
  },
  {
    identityKey: 'weapon-aurial-blaster', key: 'fortitudeRider',
    prose: { effect: '-5 penalty to Perception checks until end of attacker next turn', trigger: 'attack hits and attack roll also exceeds target Fortitude Defense' },
    structure: { trigger: 'hit-and-attack-total-exceeds-defense', defense: 'fortitude', comparison: 'exceeds', skillPenalty: { skill: 'perception', amount: 5 }, duration: { owner: 'attacker', through: 'end-of-next-turn' } },
    source: { book: 'Knights of the Old Republic Campaign Guide', page: '67 (description; stat table p.68)', evidence: 'If an aurial blaster hits and the attack roll also exceeds the target\'s Fortitude Defense, the target takes a -5 penalty on Perception checks until the end of the attacker\'s next turn.' },
  },
  {
    identityKey: 'weapon-cryoban-grenade', key: 'fortitudeRider',
    prose: { effect: 'target speed becomes 2 squares until end of its next turn', trigger: 'grenade attack roll also beats target Fortitude Defense' },
    structure: { trigger: 'hit-and-attack-total-exceeds-defense', defense: 'fortitude', comparison: 'exceeds', speedSetSquares: 2, duration: { owner: 'target', through: 'end-of-next-turn' } },
    source: { book: 'Knights of the Old Republic Campaign Guide', page: '69 (description; stat table p.68)', evidence: 'If a CryoBan grenade\'s attack roll also beats a target\'s Fortitude Defense, that target\'s speed is reduced to 2 squares until the end of its next turn.' },
  },
  {
    identityKey: 'weapon-ripper', key: 'embeddedShrapnel',
    prose: { timing: 'immediate', trigger: 'damage exceeds target damage threshold and moves target at least 1 step down condition track' },
    structure: { trigger: 'damage-exceeds-threshold-and-moves-target-down-condition-track', minimumConditionSteps: 1, damageEvent: 'separate-immediate' },
    source: { book: 'Knights of the Old Republic Campaign Guide', page: '69 (description; stat table p.68)', evidence: 'If its damage exceeds a target\'s damage threshold and moves that target at least 1 step down the condition track, embedded shrapnel immediately deals an additional 1d4 damage.' },
  },
  {
    identityKey: 'weapon-emp-grenade', key: 'targetRules',
    prose: {
      droidVehicleElectronicCybernetic: { hit: 'full ion damage', miss: 'half ion damage', zeroHpPreHalving: 'move -5 CT and disabled' },
      nonCyberneticCreature: { hit: 'half ion damage', miss: 'no ion damage', otherIonEffects: false },
    },
    structure: {
      electronic: { categories: ['droid', 'vehicle', 'device', 'object'], includesCyberneticallyEnhancedCreatures: true, hitMultiplier: 1, missMultiplier: 0.5, zeroHpPreHalving: { conditionTrackSteps: -5, disabled: true } },
      nonCybernetic: { hitMultiplier: 0.5, missMultiplier: 0, otherIonEffects: false },
    },
    source: { book: 'Clone Wars Campaign Guide', page: '62 (description; stat table p.61)', evidence: 'Droids, vehicles, electronic devices, and cybernetically enhanced creatures take normal ion damage on a hit or half on a miss. If the pre-halving ion damage would reduce such a target to 0 hit points, the target moves -5 steps on the condition track and is disabled. Creatures without cybernetics take half ion damage on a hit and none on a miss, with no other ion effect. Evasion modifies the area attack normally.' },
  },
];
const ICA_PAYLOAD_STRUCTURE = [
  {
    identityKey: 'weapon-wrist-rocket-launcher', payloadId: 'flash', effect: 'blinded',
    prose: { duration: '1d4 rounds', effect: 'blinded', trigger: 'attack roll beats target Reflex Defense' },
    structure: { trigger: 'area-attack-hit', defense: 'reflex', status: 'blinded', duration: { dice: '1d4', unit: 'rounds', owner: 'target' } },
    source: { book: 'Clone Wars Campaign Guide', page: '63 (description; stat table p.61)', evidence: 'Flash rocket: targets whose Reflex Defense is beaten are blinded for 1d4 rounds (3-square burst).' },
  },
  {
    identityKey: 'weapon-wrist-rocket-launcher', payloadId: 'hollow-tip-nerve-toxin', effect: 'nerve-agent-injection',
    prose: { conditionTrackSteps: -2, effect: 'nerve-agent-injection', trigger: 'successful hit then secondary attack vs Fortitude Defense succeeds' },
    structure: { trigger: 'hit-then-secondary-attack', secondaryDefense: 'fortitude', onSecondarySuccess: { conditionTrackSteps: -2 }, secondaryAttackBonus: null, secondaryAttackBonusStatus: 'NOT_CARRIED_BY_CANONICAL_CORPUS' },
    source: { book: 'Clone Wars Campaign Guide', page: '63 (description; stat table p.61)', evidence: 'Nerve toxin hollow-tip rocket: a hit is followed by a secondary attack against Fortitude Defense; success moves the target -2 steps on the condition track. The corpus prints no secondary attack bonus.' },
  },
];
const ICA_MICRO = {
  identityKey: 'weapon-micro-grenade-launcher',
  source: { book: 'Scum and Villainy', page: '50 (description; stat table p.51)', evidence: 'Micro grenades use the normal rules for their grenade type but deal two fewer dice of damage on a successful hit.' },
};

function applyICAStructure(rec, log) {
  const opSpec = ICA_OPERATION_STRUCTURE.find((x) => x.identityKey === rec.identityKey);
  const plSpecs = ICA_PAYLOAD_STRUCTURE.filter((x) => x.identityKey === rec.identityKey);
  const isMicro = rec.identityKey === ICA_MICRO.identityKey;
  if (!opSpec && !plSpecs.length && !isMicro) return rec;
  const out = clone(rec);
  const stampIt = () => { out.provenance = { ...out.provenance, postCertificationAmendments: [...(out.provenance.postCertificationAmendments ?? []), ICA_STRUCTURE_AMENDMENT_ID] }; };
  if (opSpec) {
    const cur = out.operation?.[opSpec.key];
    need(cur && Object.entries(opSpec.prose).every(([k, v]) => same(cur[k], v)), `${opSpec.identityKey} operation.${opSpec.key} is the published prose`);
    need(cur.structure === undefined, `${opSpec.identityKey} operation.${opSpec.key} has no structure yet`);
    out.operation[opSpec.key] = { ...cur, structure: clone(opSpec.structure) };
    stampIt();
    log.push({ id: ICA_STRUCTURE_AMENDMENT_ID, classification: 'DATA_COMPLETENESS', phase: '5D-I-C-A', identityKey: rec.identityKey, field: `operation.${opSpec.key}.structure`, from: cur, to: out.operation[opSpec.key], source: opSpec.source,
      rule: 'The runtime reads structured fields only; prose triggers and durations are never parsed.', reason: 'The trigger, status and duration were present only as prose; a structured copy of the same sentence lets the Apply Damage pipeline execute it.' });
  }
  for (const spec of plSpecs) {
    const payload = out.canonicalStats.payloadProfiles.find((x) => x.id === spec.payloadId);
    const effect = payload?.specialEffects?.find((e) => e && typeof e === 'object' && e.effect === spec.effect);
    need(effect && same(effect, spec.prose), `${spec.identityKey} payload ${spec.payloadId} carries the published prose effect (found ${JSON.stringify(payload?.specialEffects)})`);
    need(effect.structure === undefined, `${spec.identityKey} payload ${spec.payloadId} effect has no structure yet`);
    effect.structure = clone(spec.structure);
    stampIt();
    log.push({ id: ICA_STRUCTURE_AMENDMENT_ID, classification: 'DATA_COMPLETENESS', phase: '5D-I-C-A', identityKey: rec.identityKey, field: `canonicalStats.payloadProfiles[id=${spec.payloadId}].specialEffects[effect=${spec.effect}].structure`, from: spec.prose, to: effect, source: spec.source,
      rule: 'The runtime reads structured fields only; prose triggers and durations are never parsed.', reason: 'The payload effect carried its trigger and duration only as prose.' });
  }
  if (isMicro) {
    need(out.operation.damageTypeAndBurstDeterminedByGrenade === undefined && out.operation.payloadDamageDiceAdjustment === undefined, 'micro grenade launcher declares no payload delegation yet');
    need(out.canonicalStats.ammo.acceptedPayloadFamily === 'micro-grenade' && out.canonicalStats.ammo.damageSource === 'loaded-ammo-modified-by-weapon', 'micro grenade launcher accepts the (empty) micro-grenade family and modifies loaded damage');
    const before = { acceptedPayloadFamily: out.canonicalStats.ammo.acceptedPayloadFamily };
    out.operation.damageTypeAndBurstDeterminedByGrenade = true;
    out.operation.payloadDamageDiceAdjustment = -2;
    out.canonicalStats.ammo.acceptedPayloadFamily = 'grenade';
    stampIt();
    log.push({ id: ICA_STRUCTURE_AMENDMENT_ID, classification: 'DATA_COMPLETENESS', phase: '5D-I-C-A', identityKey: rec.identityKey, field: 'operation.damageTypeAndBurstDeterminedByGrenade + operation.payloadDamageDiceAdjustment + canonicalStats.ammo.acceptedPayloadFamily',
      from: before, to: { damageTypeAndBurstDeterminedByGrenade: true, payloadDamageDiceAdjustment: -2, acceptedPayloadFamily: 'grenade' }, source: ICA_MICRO.source,
      rule: 'A launcher delegates its payload to the loaded canonical grenade and applies only its own source-defined adjustment (no grenade rules are cloned).', reason: 'The launcher accepted a family no certified identity carries; micro grenades are the ordinary grenade types with two fewer dice.' });
  }
  return out;
}

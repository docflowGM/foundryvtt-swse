// Phase 5C-11/12 -- deterministic projection of a canonical weapon record onto the LEGACY Foundry weapon item shape that the
// current combat/sheet/store consumers still read. Pure function of the canonical record (its audit-derived fields plus the
// canonical-owned `production` section). The legacy fields are generated compatibility output; they are never authority.
//
// Every compatibility limitation (a rich canonical fact the legacy shape cannot carry) is recorded in LIMITATIONS and surfaced
// per record by `projectionNotes()`. Rich structure is never flattened INTO the canonical file to suit the legacy shape; the
// pack additionally carries flags.swse.canonicalWeapon.identityKey so the runtime resolver recovers the full record.
import { sha, stable, sortKeys, clone } from './canonical-weapons-shared.mjs';

export const PROJECTION_TABLE = Object.freeze([
  { legacy: 'name', canonical: 'canonicalName', consumers: 'sheet, store, name-based lookups', retire: '5G' },
  { legacy: 'system.description', canonical: 'canonicalPlayerText', consumers: 'item sheet, store card', retire: '5G' },
  { legacy: 'system.cost / costNumeric / economics.cost', canonical: 'canonicalStats.costCredits', consumers: 'store, chargen', retire: '5G' },
  { legacy: 'system.weight / economics.weight', canonical: 'canonicalStats.weightKg', consumers: 'EncumbranceEngine, store', retire: '5G' },
  { legacy: 'system.damage', canonical: 'default attack profile damage.formula (stun.damage for native-stun-only; payload damage for payload-only launchers)', consumers: 'combat-roll-math, damage.js', retire: '5D' },
  { legacy: 'system.damageType', canonical: 'default attack profile damageType.types[0] mapped to the legacy vocabulary', consumers: 'damage-type-rules, mitigation', retire: '5D' },
  { legacy: 'system.weaponCategory', canonical: 'default attack profile schemaFamily.branch', consumers: 'weapon-branch-resolver, roll-config', retire: '5C-runtime' },
  { legacy: 'system.proficiency / subcategory', canonical: 'default attack profile schemaFamily.proficiency / subcategory (lightsabers -> exotic legacy vocabulary)', consumers: 'weapon-branch-resolver, store categorizer', retire: '5C-runtime' },
  { legacy: 'system.ammunition.{type,current,max}', canonical: 'canonicalStats.ammo (type, capacityShots); current starts at max', consumers: 'AmmoSystem', retire: '5D' },
  { legacy: 'system.autofire / properties[Autofire]', canonical: 'default attack profile rateOfFire includes A', consumers: 'CombatOptionResolver', retire: '5D' },
  { legacy: 'system.attackAttribute / attackBonus / range / rangeProfile / weaponType / traits / properties / combat.* / equippable', canonical: '(carry-over of the captured production value; canonical default when none)', consumers: 'roll-config, range resolver, sheet', retire: '5D' },
  { legacy: 'system.{subtype,chassisId,constructible,baseBuildDc,baseCost,upgradeSlots,installedUpgrades}', canonical: 'production.legacySystemCapture + merged chassis overlay', consumers: 'lightsaber construction workbench', retire: 'lightsaber workbench migration' },
  { legacy: 'flags.swse.canonicalWeapon', canonical: 'identityKey + record hash', consumers: 'WeaponRuntimeResolver, parity verifiers', retire: 'permanent' },
]);

export const LIMITATIONS = Object.freeze({
  multiProfile: 'Legacy carries ONE attack; weapons with several attack profiles project only the default profile. Other profiles remain canonical-only.',
  payloadDamage: 'Payload-dependent damage projects the default payload (or the weapon\'s own default profile); loaded-payload damage is not representable in legacy fields.',
  damageTypeRelation: 'AND/OR multi-type damage projects only the first type; the simultaneous/alternative relation is canonical-only.',
  nonDice: 'Non-dice damage models (none/special/modifier/conditional/inherited) project the nearest dice string or "0"; the real model is canonical-only.',
  configuration: 'Configuration-driven attacks and operating modes are canonical-only.',
  conditional: 'Conditional modifiers, triggered effects, critical effects and attack-resolution overrides are canonical-only.',
});

const LEGACY_TYPE = { bludgeoning: 'kinetic', piercing: 'kinetic', slashing: 'kinetic', physical: 'kinetic', ballistic: 'kinetic', energy: 'energy', fire: 'fire', cold: 'cold', sonic: 'sonic', ion: 'ion', stun: 'stun', electricity: 'electricity', acid: 'acid' };
const profileConfigIds = (p) => (p.activationRequirements ?? []).filter((r) => r?.type === 'configuration').map((r) => r.id);

/** Default attack profile = first profile available in the default configuration (operatingModes.default preferred). Mirrors the runtime resolver. */
export function defaultProfile(rec) {
  const cs = rec.canonicalStats, ps = cs.attackProfiles;
  const cfg = (cs.configurationStates ?? []).find((c) => c.default === true)?.id ?? cs.stateMachine?.initialState ?? null;
  const usable = ps.filter((p) => { const ids = profileConfigIds(p); return !ids.length || (cfg !== null && ids.includes(cfg)); });
  return usable.find((p) => p.id === cs.operatingModes?.default) ?? usable[0] ?? ps[0];
}

const dice = (d) => (d && (d.mode === 'dice' || d.mode === 'fixed') && typeof d.formula === 'string' && /\d/.test(d.formula) ? d.formula : null);

export function projectDamage(rec, prof = defaultProfile(rec)) {
  const cs = rec.canonicalStats;
  const notes = [];
  let formula = dice(prof.damage), types = prof.damageType?.types ?? [];
  if (!formula && prof.stun?.capability === 'native-stun' && dice(prof.stun.damage)) { formula = dice(prof.stun.damage); types = ['stun']; notes.push('nonDice'); }
  if (!formula) {
    const pay = (cs.payloadProfiles ?? []).find((p) => p.default === true) ?? (cs.payloadProfiles ?? [])[0];
    if (pay && dice(pay.damage)) { formula = dice(pay.damage); types = pay.damageType?.types ?? types; notes.push('payloadDamage'); }
  }
  if (!formula && dice(cs.baseDamage)) formula = dice(cs.baseDamage);
  if (!formula) { formula = '0'; notes.push('nonDice'); }
  if ((prof.damageType?.mode === 'and' || prof.damageType?.mode === 'or') && (prof.damageType.types ?? []).length > 1) notes.push('damageTypeRelation');
  if ((cs.attackProfiles?.length ?? 0) > 1 || (cs.modeProfiles?.length ?? 0) > 0) notes.push('multiProfile');
  const mapped = types.map((t) => LEGACY_TYPE[t] ?? 'kinetic');
  if (rec.operation?.sonicDamageIsEnergy && types.includes('energy')) mapped.push('sonic'); // certified ruling: sonic damage is energy damage
  if (prof.stun && prof.stun.capability && prof.stun.capability !== 'none') mapped.push('stun'); // stun-capable weapons may keep the legacy 'stun' type
  const legacyType = mapped.length ? mapped[0] : null;
  return { formula, legacyType, mappedTypes: mapped, notes };
}

const grp = (rec) => rec.weaponGroup;
const rofHasAuto = (prof) => (prof.rateOfFire ?? []).includes('A');
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = (text) => String(text ?? '').split(/\n+/).filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');

function rangeString(prof) {
  const r = prof.range ?? {};
  if (r.mode === 'melee') return 'Melee';
  const pb = r.bands?.pointBlank?.[1] ?? r.bands?.long?.[1] ?? r.maxSquares ?? null;
  return pb ? `${pb} squares` : 'Melee';
}
function legacyRangeProfile(prof, proficiency) {
  if (prof.range?.mode === 'melee') return proficiency === 'advanced-melee' ? 'advanced-melee' : proficiency === 'simple' ? 'simple-weapons' : 'melee';
  return prof.range?.profileId ?? ({ pistols: 'pistols', rifles: 'rifles', 'heavy-weapons': 'heavy-weapons', simple: 'simple-weapons' }[proficiency] ?? 'simple-weapons');
}
function derivedTraits(rec, prof) {
  const t = [], q = prof.qualities ?? {};
  if (rofHasAuto(prof)) t.push('Autofire');
  if (q.accurate) t.push('Accurate');
  if (q.inaccurate) t.push('Inaccurate');
  if (q.thrown) t.push('Thrown');
  if (q.reach) t.push('Reach');
  if (q.doubleWeapon) t.push('Double Weapon');
  if (q.areaEffect) t.push('Area Effect');
  if (q.ignoresDR) t.push('Ignores DR');
  return t;
}

/** Returns { system, notes } for the legacy item system object. */
export function projectSystem(rec) {
  const cs = rec.canonicalStats, prod = rec.production;
  const prof = defaultProfile(rec);
  const cap = prod.legacySystemCapture ? clone(prod.legacySystemCapture) : null;
  const sys = cap ?? {};
  for (const m of prod.mergedFrom ?? []) Object.assign(sys, clone(m.systemOverlay));
  const notes = new Set();
  const dmg = projectDamage(rec, prof);
  dmg.notes.forEach((n) => notes.add(n));
  const sf = prof.schemaFamily ?? rec.schemaFamily;
  const proficiency = sf.proficiency === 'lightsabers' ? 'exotic' : sf.proficiency;
  const branch = sf.branch === 'ranged' ? 'ranged' : 'melee';

  // ---- canonical-owned projections ----
  const cost = cs.costCredits ?? sys.cost ?? 0;
  const weight = cs.weightKg ?? sys.weight ?? 0;
  const ammoCap = cs.ammo?.capacityShots ?? cs.resource?.capacityShots ?? null;
  sys.description = html(rec.canonicalPlayerText);
  sys.cost = cost; sys.costNumeric = cost; sys.weight = weight; sys.economics = { weight, cost };
  sys.damage = dmg.formula === '0' && cap?.damage ? cap.damage : dmg.formula; // no canonical dice model: keep the existing legacy sentinel
  // keep the existing legacy damage type when it is one of the canonical types (vocabulary-compatible); otherwise the first canonical type
  sys.damageType = (cap?.damageType && dmg.mappedTypes.includes(cap.damageType)) ? cap.damageType : (dmg.legacyType ?? sys.damageType ?? 'kinetic');
  sys.weaponCategory = branch;
  sys.proficiency = proficiency;
  sys.ammunition = ammoCap && ammoCap > 0 ? { type: cs.ammo?.type ?? cs.resource?.kind ?? 'ammunition', current: ammoCap, max: ammoCap } : { type: 'none', current: 0, max: 0 };
  if (rofHasAuto(prof)) sys.autofire = true; else if ('autofire' in sys) sys.autofire = false;
  if ((cs.attackProfiles.length > 1 || cs.modeProfiles?.length) ) notes.add('multiProfile');
  if ((rec.conditionalQualities ?? []).length || (cs.triggeredEffects ?? []).length || prof.conditionalModifiers?.length || prof.criticalEffects?.length) notes.add('conditional');
  if ((cs.configurationStates ?? []).length || (cs.stateMachine?.states ?? []).length) notes.add('configuration');

  // ---- carry-over with canonical defaults (legacy-only classification vocabulary). Existing production records keep exactly the
  // legacy keys they had; only identities with no production history receive generated defaults. ----
  const fresh = !cap;
  const fill = (k, v, always = false) => { if (!(k in sys) && (always || fresh)) sys[k] = typeof v === 'function' ? v() : v; };
  fill('attackBonus', 0, true);
  fill('attackAttribute', () => (branch === 'ranged' ? 'dex' : 'str'), true);
  fill('range', () => rangeString(prof), true);
  fill('rangeProfile', () => legacyRangeProfile(prof, proficiency), true);
  fill('weaponType', () => sys.rangeProfile, true);
  fill('subcategory', () => ({ lightsabers: 'lightsaber' }[sf.proficiency] ?? sf.subcategory));
  fill('category', 'weapon');
  fill('schemaVersion', 2);
  fill('properties', () => derivedTraits(rec, prof), true);
  fill('traits', () => clone(sys.properties), true);
  fill('equipped', false, true);
  fill('equippable', { equipped: false, slot: 'hand' }, true);
  sys.combat = sys.combat ?? { attack: { ability: sys.attackAttribute, bonus: 0 }, damage: { dice: sys.damage, bonus: 0, type: sys.damageType, ability: sys.attackAttribute } };
  sys.combat.damage = { ...sys.combat.damage, dice: sys.damage, type: sys.damageType };
  return { system: sortKeys(sys), notes: [...notes].sort() };
}

export const canonicalRecordHash = (rec) => sha(stable(rec)).slice(0, 16);

/** The full generated Foundry document for one canonical weapon. */
export function projectDocument(rec, corpusVersion) {
  const { system } = projectSystem(rec);
  const flags = clone(rec.production.flags ?? {});
  for (const m of rec.production.mergedFrom ?? []) for (const [ns, v] of Object.entries(m.flags ?? {})) flags[ns] = { ...(flags[ns] ?? {}), ...v };
  flags.swse = { ...(flags.swse ?? {}), canonicalWeapon: { identityKey: rec.identityKey, recordSha256: canonicalRecordHash(rec), corpusVersion } };
  return {
    _id: rec.production.id, name: rec.canonicalName, type: 'weapon', img: rec.production.img, system,
    effects: clone(rec.production.effects ?? []), folder: rec.production.folder ?? null, sort: rec.production.sort ?? 0,
    ownership: { default: rec.production.ownershipDefault ?? 0 }, flags: sortKeys(flags),
  };
}

/** Category pack bucket for a generated weapon (canonical weapon group first; legacy grenade classification preserved). */
export function categoryPackFor(rec, doc) {
  if (rec.production?.categoryPack) return rec.production.categoryPack; // stable pack membership (compendium UUIDs embed the pack name)
  if (rec.weaponGroup === 'Lightsaber' || doc.system?.subtype === 'lightsaber') return 'lightsabers';
  if (doc.system?.subcategory === 'grenade') return 'grenades';
  const sub = rec.schemaFamily?.subcategory;
  return ({ rifle: 'rifles', pistol: 'pistols', heavy: 'heavy', exotic: 'exotic', simple: 'simple', advanced: 'simple', lightsaber: 'lightsabers' })[sub] ?? 'simple';
}

/**
 * WeaponBranchResolver
 *
 * Math Integrity Freeze, Batch 2B ("Bluebolt" defect). Canonical single
 * authority for a weapon's persistent base branch (melee/ranged), its
 * weapon/proficiency family, and light-weapon/natural-weapon/unarmed
 * classification. Repository-wide search found 8+ independent branch
 * classifiers and 4+ near-duplicate natural/unarmed classifiers, most of
 * them trusting `system.meleeOrRanged` as their first-priority signal.
 *
 * A full scan of every shipped weapon pack record (744 total) found
 * `system.weaponCategory` holds a literal "melee"/"ranged" branch value on
 * 100% of records (604 ranged, 140 melee), while `system.meleeOrRanged` is
 * absent on all 744 -- it is never authored anywhere in this repository's
 * real data. `template.json`'s own weapon schema defaults `meleeOrRanged`
 * to "melee" for any weapon document whose source omits it, so the field
 * is schema-defaulted, not authored, the moment a weapon is materialized
 * (purchased, dropped, or even just read as a live Document). This is the
 * confirmed root cause of Gar'ee's real Bluebolt Blaster Pistol showing
 * `meleeOrRanged:"melee"` alongside `weaponCategory:"ranged"`,
 * `proficiency:"pistols"` -- and of the identical latent contradiction on
 * 302 other shipped ranged-categorized weapon records that simply haven't
 * been materialized onto a player actor yet.
 *
 * Precedence here is therefore the REVERSE of every previous consumer's:
 * `weaponCategory`'s literal branch value (the one field proven reliable in
 * real data) outranks `meleeOrRanged` (the one field proven unreliable).
 *
 * Branch/family schema-coherence invariant: once a weapon's base branch is
 * melee or ranged, every family-identifying field (proficiency,
 * subcategory/category, weapon group) must agree with it. `melee` +
 * `pistols`/`rifles`/`heavy-weapons`/`ranged-exotic`, or `ranged` +
 * `lightsaber`/`natural`/`melee-exotic`/`advanced-melee`, are invalid
 * persistent combinations, not just misreads -- see
 * resolveWeaponBranchFamily()'s `coherent`/`issues` output.
 *
 * Attack ability (`system.attackAttribute`) is deliberately OUT of this
 * coherence contract. SWSE has feats/talents/species rules that legitimately
 * change which ability a weapon uses, and this engine does not have
 * complete coverage to infer all of them safely -- `attackAttribute` is
 * player/data-owned configuration once set. This module only supplies a
 * branch-based DEFAULT for brand-new items that don't have one yet
 * (defaultAttackAttributeForBranch()), and never uses attackAttribute as
 * evidence of branch.
 *
 * Base weapon identity (this module) is also deliberately distinct from
 * ATTACK CONTEXT (a thrown melee weapon resolving as a ranged attack for
 * that one roll). Nothing here mutates or infers persistent branch from a
 * roll-time `context.attackType`/`context.rangeType` -- those stay the
 * attack-context resolver's job.
 */

const MELEE_FAMILIES = Object.freeze(new Set(['advanced', 'advanced-melee', 'lightsaber', 'natural', 'melee-exotic']));
const RANGED_FAMILIES = Object.freeze(new Set(['heavy', 'heavy-weapons', 'pistols', 'rifles', 'ranged-exotic']));
// Branch-ambiguous families: valid proficiency/category values on EITHER
// branch. Never used alone to decide or contradict a branch.
const AMBIGUOUS_FAMILIES = Object.freeze(new Set(['simple', 'exotic', '']));

const RANGED_TEXT_RE = /\b(blaster|rifle|pistol|carbine|bowcaster|repeating|launcher|grenade|missile|ranged|slugthrower|rocket)\b/i;
const MELEE_TEXT_RE = /\b(melee|unarmed|lightsaber|vibro|staff|pike|sword|knife|blade|club|claw|bite|dagger)\b/i;

const NATURAL_TEXT_RE = /natural-weapon|claw|bite|talon|tusk|horn|tail|slam|gore/i;
const UNARMED_TEXT_RE = /unarmed/i;

// Deliberately narrow: bare "knife" is excluded -- it is a generic weapon
// -type word that also appears in real non-light weapon names (e.g. "Combat
// Knife"), unlike these more specific light-weapon-coded terms.
const LIGHT_NAME_FALLBACK = [
  'dagger', 'vibrodagger', 'shiv', 'stiletto',
  'hold-out', 'holdout', 'derringer', 'pocket pistol'
];

function systemOf(itemOrSystem = {}) {
  return itemOrSystem?.system ?? itemOrSystem ?? {};
}

function normKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function familyKey(value) {
  const key = normKey(value).replace(/\s+/g, '-');
  if (key === 'heavy') return 'heavy-weapons';
  return key;
}

function familyOf(family) {
  if (MELEE_FAMILIES.has(family)) return 'melee';
  if (RANGED_FAMILIES.has(family)) return 'ranged';
  return null;
}

function collectFamilyCandidates(system) {
  return [system.proficiency, system.subcategory, system.category, system.weaponGroup, system.group]
    .map(familyKey)
    .filter(Boolean);
}

function textHaystack(itemOrSystem, system) {
  return [
    itemOrSystem?.name,
    system.name,
    system.weaponType,
    system.weaponGroup,
    system.rangeProfile,
    system.rangeProfileName,
    system.range,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.proficiency
  ].map((value) => String(value ?? '')).join(' ');
}

/**
 * Canonical branch + family resolver. Precedence:
 *   1. system.weaponCategory literal "melee"/"ranged" value.
 *   2. proficiency/subcategory/category/weaponGroup/group membership in an
 *      unambiguous melee- or ranged-only family set.
 *   3. explicit meleeOrRanged/weaponRangeType/rangeType (demoted: proven
 *      unreliable in real data -- always schema-defaulted, never authored).
 *   4. range/name text heuristics.
 *   5. default "melee".
 *
 * @returns {{branch: 'melee'|'ranged', family: string|null, source: string, coherent: boolean, issues: string[]}}
 */
export function resolveWeaponBranchFamily(itemOrSystem = {}) {
  const system = systemOf(itemOrSystem);
  const issues = [];

  const categoryLiteral = normKey(system.weaponCategory);
  const familyCandidates = collectFamilyCandidates(system);
  const familyBranches = familyCandidates.map(familyOf).filter(Boolean);
  const family = familyCandidates.find((candidate) => familyOf(candidate)) ?? familyCandidates[0] ?? null;

  let branch = null;
  let source = 'default';

  if (categoryLiteral === 'melee' || categoryLiteral === 'ranged') {
    branch = categoryLiteral;
    source = 'weaponCategory';
  } else if (familyBranches.length) {
    branch = familyBranches[0];
    source = 'family';
  } else {
    const explicit = normKey(system.meleeOrRanged ?? system.weaponRangeType ?? system.rangeType);
    if (explicit === 'ranged' || explicit.includes('ranged')) {
      branch = 'ranged';
      source = 'meleeOrRanged';
    } else if (explicit === 'melee' || explicit.includes('melee')) {
      branch = 'melee';
      source = 'meleeOrRanged';
    }
  }

  if (!branch) {
    const text = textHaystack(itemOrSystem, system);
    if (RANGED_TEXT_RE.test(text)) { branch = 'ranged'; source = 'text'; }
    else if (MELEE_TEXT_RE.test(text)) { branch = 'melee'; source = 'text'; }
  }

  if (!branch) { branch = 'melee'; source = 'default'; }

  // Coherence: does an unambiguous family signal disagree with the resolved branch?
  let coherent = true;
  if (familyBranches.length && familyBranches.some((fb) => fb !== branch)) {
    coherent = false;
    issues.push(`base branch "${branch}" (from ${source}) disagrees with weapon family "${family}" (implies ${familyOf(family)})`);
  }
  const storedBranch = normKey(system.meleeOrRanged);
  if (storedBranch && (storedBranch === 'melee' || storedBranch === 'ranged') && storedBranch !== branch) {
    coherent = false;
    issues.push(`stored meleeOrRanged:"${storedBranch}" disagrees with resolved branch "${branch}"`);
  }

  return { branch, family, source, coherent, issues };
}

export function getWeaponBranch(itemOrSystem = {}) {
  return resolveWeaponBranchFamily(itemOrSystem).branch;
}

export function isRangedWeapon(itemOrSystem = {}) {
  return getWeaponBranch(itemOrSystem) === 'ranged';
}

export function isMeleeWeapon(itemOrSystem = {}) {
  return getWeaponBranch(itemOrSystem) === 'melee';
}

/**
 * Canonical Light Weapon predicate: wielder-size-relative, the real SWSE
 * rule (a weapon is Light for a wielder when the weapon's size category is
 * smaller than the wielder's). Ported verbatim from combat-utils.js, which
 * a prior audit round confirmed was the one already-correct implementation
 * among three independent ones (the other two: a dead `traits` array check
 * in weapons-engine.js, and a near-duplicate size/quality/text heuristic in
 * dual-wield-combat-shape-resolver.js / core-attack-option-runtime-patches.js).
 */
export function isLightWeaponForActor(weapon = {}, actor = {}) {
  const system = weapon?.system ?? {};
  if (system.isLight === true || system.light === true || system.isLightWeapon === true) return true;

  const traits = Array.isArray(system.traits) ? system.traits : [];
  const properties = Array.isArray(system.properties) ? system.properties : [];
  if ([...traits, ...properties].some((value) => normKey(value) === 'light')) return true;

  const weaponSize = normKey(system.size);
  const actorSize = normKey(actor?.system?.size) || 'medium';
  const sizeOrder = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
  const actorSizeIndex = sizeOrder.indexOf(actorSize);
  const weaponSizeIndex = sizeOrder.indexOf(weaponSize);
  if (weaponSizeIndex !== -1 && actorSizeIndex !== -1) return weaponSizeIndex < actorSizeIndex;

  // Name fallback is a last resort, and deliberately narrow: only terms
  // that are themselves specific light-weapon names, never a bare generic
  // word like "knife" that also appears in real non-light weapon names
  // (e.g. "Combat Knife" is not Light without size or flag evidence).
  const name = normKey(weapon?.name);
  return LIGHT_NAME_FALLBACK.some((lw) => name.includes(lw));
}

/**
 * Canonical natural-weapon-ONLY predicate (claws/bite/talon/etc., excludes
 * a generic unarmed strike). Structured fields first, free text last.
 */
export function isNaturalWeaponOnly(itemOrSystem = {}) {
  const item = itemOrSystem ?? {};
  const system = item.system ?? item;
  const flags = item.flags?.swse ?? {};

  if (flags.isNaturalWeapon === true || flags.naturalWeapon === true) return true;
  if (system.naturalWeapon === true || system.isNaturalWeapon === true) return true;
  if (normKey(system.source) === 'species-natural-weapon') return true;

  const text = [item.name, system.weaponType, system.weaponGroup, system.group, system.category,
    system.subcategory, system.naturalWeaponType, system.source,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits
  ].map((value) => String(value ?? '')).join(' ');

  return NATURAL_TEXT_RE.test(text);
}

/**
 * Canonical natural-weapon / unarmed-strike predicate (natural-only OR
 * plain unarmed-strike text/flag). Consolidates 4+ near-duplicate
 * implementations (dual-wield-combat-shape-resolver.js,
 * core-attack-option-runtime-patches.js, reaction-registry.js,
 * damage-reduction-resolver.js).
 */
export function isNaturalOrUnarmedWeapon(itemOrSystem = {}) {
  const item = itemOrSystem ?? {};
  const system = item.system ?? item;
  const flags = item.flags?.swse ?? {};

  if (isNaturalWeaponOnly(item)) return true;
  if (flags.unarmed === true) return true;
  if (system.isUnarmed === true || system.unarmed === true) return true;

  const text = [item.name, system.weaponType, system.weaponGroup, system.group, system.category,
    system.subcategory, system.source,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits
  ].map((value) => String(value ?? '')).join(' ');

  return UNARMED_TEXT_RE.test(text);
}

export function defaultAttackAttributeForBranch(branch) {
  return branch === 'ranged' ? 'dex' : 'str';
}

/**
 * Write-time coherence enforcer. Corrects ONLY the low-trust,
 * schema-defaultable fields (meleeOrRanged, the legacy `ranged` boolean) to
 * agree with the resolved branch -- it never rewrites weaponCategory,
 * proficiency, subcategory, or category (the high-trust, deliberately-
 * authored evidence those corrections are based on). attackAttribute is
 * filled from the branch default ONLY when entirely absent; an explicit
 * value (including one that intentionally differs from the branch default)
 * is always preserved verbatim.
 *
 * Returns the same object, mutated in place, for convenient use in a
 * preCreateItem/preUpdateItem hook or a normalizeItemSystem() merge step.
 */
export function normalizeWeaponBranchFamily(system = {}) {
  if (!system || typeof system !== 'object') return system;
  const resolved = resolveWeaponBranchFamily(system);
  system.meleeOrRanged = resolved.branch;
  if ('ranged' in system) system.ranged = resolved.branch === 'ranged';
  if (system.attackAttribute === undefined || system.attackAttribute === null || system.attackAttribute === '') {
    system.attackAttribute = defaultAttackAttributeForBranch(resolved.branch);
  }
  return system;
}

export default {
  resolveWeaponBranchFamily,
  getWeaponBranch,
  isRangedWeapon,
  isMeleeWeapon,
  isLightWeaponForActor,
  isNaturalWeaponOnly,
  isNaturalOrUnarmedWeapon,
  defaultAttackAttributeForBranch,
  normalizeWeaponBranchFamily
};

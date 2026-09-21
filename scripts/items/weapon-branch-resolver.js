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
 * A full scan of every weapon-type record in this repository -- 193 unique
 * standalone weapon-catalog records across packs/weapons*.db (151 ranged,
 * 42 melee, deduplicated by _id; every category-specific pack file's
 * records are ALSO duplicated into the aggregate packs/weapons.db, a
 * pre-existing structural duplication matching the armor.db/
 * armor-shields.db pattern noted elsewhere), plus 5,766 actor-embedded
 * weapon items across the NPC/heroic/nonheroic/droid packs -- 5,959 total
 * weapon-type records -- found `system.weaponCategory` holds a literal
 * "melee"/"ranged" branch value on 100% of the standalone catalog records,
 * while `system.meleeOrRanged` is absent on all 5,959 -- it is never
 * authored anywhere in this repository's real data. `template.json`'s own
 * weapon schema defaults `meleeOrRanged` to "melee" for any weapon document
 * whose source omits it, so the field is schema-defaulted, not authored,
 * the moment a weapon is materialized (purchased, dropped, or even just
 * read as a live Document). This is the confirmed root cause of Gar'ee's
 * real Bluebolt Blaster Pistol showing `meleeOrRanged:"melee"` alongside
 * `weaponCategory:"ranged"`, `proficiency:"pistols"` -- and of the
 * identical latent contradiction on every other shipped ranged-categorized
 * weapon record that simply hasn't been materialized onto a player actor
 * yet.
 *
 * (An earlier scan of this codebase reported "744 total, 604 ranged, 140
 * melee" and "302 other" ranged records; those figures were an artifact of
 * an overlapping glob scan -- `weapons*.db` + `melee*.db` + `*weapon*.db`
 * -- where the third, broader pattern re-matched every file the first
 * pattern already matched, double-counting each record, and also pulled in
 * out-of-scope vehicle-weapon packs. The 193/5,766/5,959 figures above are
 * from a corrected, deduplicated, properly-scoped scan and supersede those
 * numbers.)
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
 * Attack ability (`system.attackAttribute`) is deliberately OUT of the
 * branch/family coherence contract. SWSE has feats/talents/species rules
 * that legitimately use any of the six abilities (str/dex/con/int/wis/cha)
 * with a weapon, and this engine does not have complete coverage to infer
 * all of them safely -- `attackAttribute` is player/data-owned configuration
 * once set. This module only supplies a branch-based DEFAULT for brand-new
 * items that don't have one yet (defaultAttackAttributeForBranch()), never
 * overwrites an explicit value of any of the six abilities, and never uses
 * attackAttribute as evidence of branch. (item-defaults.js's save-path
 * validation gate accepts all six ability keys for this same reason -- it
 * must not silently coerce a real CON/INT/WIS/CHA player choice back to
 * STR just because it isn't STR or DEX.)
 *
 * Base weapon identity (this module) is also deliberately distinct from
 * ATTACK CONTEXT (a thrown melee weapon resolving as a ranged attack for
 * that one roll). Nothing here mutates or infers persistent branch from a
 * roll-time `context.attackType`/`context.rangeType` -- those stay the
 * attack-context resolver's job.
 */

// Real shipped pack data uses BOTH plural family names (system.proficiency:
// "pistols"/"rifles"/"heavy-weapons"/"advanced-melee") AND singular ones
// (system.subcategory/system.category: "pistol"/"rifle"/"heavy"/"advanced")
// for the same weapon record -- both forms must be recognized, or the
// write-time coherence check below silently misses half of a real record's
// family-bearing fields (confirmed: Gar'ee's real Bluebolt has
// proficiency:"pistols" alongside subcategory:"pistol", category:"pistol").
const MELEE_FAMILIES = Object.freeze(new Set([
  'advanced', 'advanced-melee', 'lightsaber', 'natural', 'melee-exotic'
]));
const RANGED_FAMILIES = Object.freeze(new Set([
  'heavy', 'heavy-weapons', 'pistol', 'pistols', 'rifle', 'rifles', 'carbine', 'carbines',
  'ranged-exotic', 'grenade', 'grenades'
]));
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
 * Canonical BASE/INTRINSIC Light Weapon predicate: wielder-size-relative,
 * the real SWSE rule (a weapon is Light for a wielder when the weapon's
 * size category is smaller than the wielder's), plus explicit static
 * flags/traits. Ported verbatim from combat-utils.js, which a prior audit
 * round confirmed was the one already-correct implementation among three
 * independent ones (the other two: a dead `traits` array check in
 * weapons-engine.js, and a near-duplicate size/quality/text heuristic in
 * dual-wield-combat-shape-resolver.js / core-attack-option-runtime-patches.js).
 *
 * SCOPE, STATED EXPLICITLY: this function answers "is this weapon
 * intrinsically Light" -- it does NOT implement SWSE's contextual "treat
 * as Light" rules, most notably the Weapon Finesse + Weapon Focus combined
 * rule ("when wielding a single one-handed weapon for which you have
 * Weapon Focus, you can treat that weapon as a Light Weapon").
 *
 * CORRECTION to an earlier claim in this same batch: that combined rule is
 * NOT entirely unimplemented -- combat-option-resolver.js's
 * collectCombinedFeatModifiers() already grants its ATTACK-ABILITY
 * consequence (substituting the better of Dex/Str on the attack roll, via
 * Weapon Finesse) for a matching one-handed non-heavy/non-two-handed weapon
 * with Weapon Focus, entirely independently of this function or any
 * "isLightWeaponForActor" call. What is genuinely absent is a shared
 * EFFECTIVE-lightness layer: every OTHER mechanic that keys off "is this
 * weapon Light" (Flurry of Blows eligibility, Two-Weapon Fighting/dual-wield
 * shape, the grapple natural/light exemption) still asks only this
 * BASE/INTRINSIC predicate, so a weapon "treated as Light" solely via the
 * combined feat is invisible to those three consumers. That is the actual,
 * narrower gap this batch declines to close (see the per-consumer audit
 * immediately below); consolidating every consumer onto this one base-only
 * predicate does not regress any of them relative to pre-Batch-2B behavior
 * (each independently lacked the same effective-lightness awareness
 * before), it just makes the gap consistent and visible in one place
 * instead of silently absent from 3+ separate implementations.
 *
 * PER-CONSUMER AUDIT (required before certifying this scope):
 *   - combat-utils.js `isLightWeapon(weapon, actor)`: exported, but has no
 *     live caller anywhere in the repo today (repository-wide search found
 *     none). BASE is sufficient as shipped; re-audit if/when a consumer is
 *     added.
 *   - weapons-engine.js `isLightWeapon` (gates the Two-Handed Strength
 *     Bonus: applies to a two-handed melee weapon that is NOT light): the
 *     combined feat's own precondition is "a single ONE-HANDED weapon", so
 *     a weapon eligible to be "treated as Light" is by definition never
 *     two-handed -- this consumer's BASE/EFFECTIVE choice cannot change its
 *     output for that scenario. BASE is correct here, not merely expedient.
 *   - core-attack-option-runtime-patches.js `isLightOrLightsaberWeapon`
 *     (Flurry of Blows eligibility -- requires unarmed/natural/light/
 *     lightsaber in each hand): the sharpest real gap. A one-handed weapon
 *     "treated as Light" via Weapon Focus + Weapon Finesse should qualify
 *     for Flurry and currently does not. EFFECTIVE lightness is needed;
 *     NOT implemented. Documented, not silently absent.
 *   - dual-wield-combat-shape-resolver.js `isLightWeapon` (feeds each
 *     hand's `isLightWeapon` slot flag into combined-full-attack-planner.js,
 *     which Two-Weapon Fighting penalty math reads): same gap as Flurry --
 *     EFFECTIVE lightness is needed; NOT implemented.
 *   - grapple-state-engine.js (natural/unarmed/light exemption from grapple
 *     attack restrictions): same gap -- EFFECTIVE lightness is needed; NOT
 *     implemented.
 *
 * EFFECTIVE/CONTEXTUAL TREAT-AS-LIGHT CLASSIFICATION IS NOT CERTIFIED by
 * this batch for the three consumers above (Flurry, dual-wield shape,
 * grapple exemption); see the "Base vs. effective light-weapon scope"
 * ledger section for the queued follow-up.
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

// The one category value valid on BOTH branches in the item editor's own
// vocabulary (weapon-data-resolver.js's MELEE_WEAPON_CATEGORY_OPTIONS and
// RANGED_WEAPON_CATEGORY_OPTIONS both include it) -- the deterministic,
// safe reset target for a family-bearing field that no longer agrees with
// the resolved branch, since it implies nothing more specific than "this
// branch, unspecified family" rather than guessing a wrong specific one.
const BRANCH_NEUTRAL_FAMILY = 'simple';

// Family-bearing fields: proficiency-category identifiers. A value here
// that unambiguously names the OTHER branch's family cannot survive
// persistence once the branch itself is authoritative-resolved.
//
// WRITE_FAMILY_PRIORITY orders these for detecting an EXPLICIT, deliberate
// family submission (see normalizeWeaponForWrite() below): subcategory is
// listed first because it is the field the V2 item editor's Category
// selector actually writes (Batch 2B correction #2 -- see the field
// contract note above normalizeWeaponForWrite). FAMILY_FIELDS keeps its
// original order for the unrelated (and unchanged) read-time coherence
// scan below.
const FAMILY_FIELDS = ['proficiency', 'subcategory', 'category', 'weaponGroup', 'group'];
const WRITE_FAMILY_PRIORITY = ['subcategory', 'proficiency', 'category', 'weaponGroup', 'group'];

// Real shipped `subcategory`/`category` vocabulary uses singular, often
// bare-word spellings (pistol, rifle, heavy, exotic, grenade) that differ
// from the V2 editor's historical option values (pistols, rifles,
// ranged-exotic, melee-exotic, advanced-melee) and from `proficiency`'s own
// compound spellings (pistols, rifles, heavy-weapons, advanced-melee).
// canonicalSubcategory() reconciles any of these onto the real-data
// singular spelling, which is what is now persisted to subcategory/category
// going forward, so this field never accumulates a fourth parallel
// vocabulary. familyKey()/familyOf() (branch-detection only, unchanged)
// still separately normalize "heavy" -> "heavy-weapons" purely to look it
// up in MELEE_FAMILIES/RANGED_FAMILIES -- that internal detection key is
// never itself persisted anywhere.
const SUBCATEGORY_CANONICAL_ALIASES = Object.freeze({
  pistols: 'pistol',
  rifles: 'rifle',
  'heavy-weapons': 'heavy',
  'melee-exotic': 'exotic',
  'ranged-exotic': 'exotic',
  'advanced-melee': 'advanced',
  grenades: 'grenade'
});

function canonicalSubcategory(rawValue) {
  const key = normKey(rawValue).replace(/\s+/g, '-');
  return SUBCATEGORY_CANONICAL_ALIASES[key] ?? key;
}

// Derives the real shipped `proficiency` spelling from a canonical
// subcategory value, per branch -- confirmed against a full pack scan of
// packs/weapons*.db's real proficiency vocabulary (melee: exotic,
// advanced-melee, simple; ranged: exotic, simple, heavy-weapons, pistols,
// rifles) plus embedded natural-weapon items (proficiency:"natural"). Any
// subcategory not listed (a value this batch's editor vocabulary does not
// expose) falls back to BRANCH_NEUTRAL_FAMILY rather than guessing.
const PROFICIENCY_ALIAS_FOR_SUBCATEGORY = Object.freeze({
  melee: {
    advanced: 'advanced-melee',
    lightsaber: 'exotic',
    exotic: 'exotic',
    natural: 'natural',
    simple: 'simple'
  },
  ranged: {
    heavy: 'heavy-weapons',
    pistol: 'pistols',
    exotic: 'exotic',
    rifle: 'rifles',
    grenade: 'simple',
    simple: 'simple'
  }
});

function proficiencyAliasFor(branch, subcategory) {
  return PROFICIENCY_ALIAS_FOR_SUBCATEGORY[branch]?.[subcategory] ?? BRANCH_NEUTRAL_FAMILY;
}

// Range-band/weapon-type descriptor fields: branch-specific range-profile
// identifiers (e.g. "pistols"/"rifles"/"heavy-weapons"/"thrown-weapons").
// These are cleared, not reset to a family name, since they describe a
// range-band lookup key, not a proficiency category.
const RANGE_DESCRIPTOR_FIELDS = ['rangeProfile', 'weaponType'];

function impliedBranchOfDescriptor(value) {
  const key = familyKey(value);
  const family = familyOf(key);
  if (family) return family;
  const text = String(value ?? '');
  if (RANGED_TEXT_RE.test(text)) return 'ranged';
  if (MELEE_TEXT_RE.test(text)) return 'melee';
  return null;
}

/**
 * FIELD CONTRACT (Batch 2B correction #2). An independent review found that
 * `system.weaponCategory` had been carrying two INCOMPATIBLE meanings at
 * once: 100% of shipped pack data authors it as the literal BASE BRANCH
 * ("melee"/"ranged"), but the V2 item editor's own Category <select> was
 * writing FAMILY values into that same field (advanced, lightsaber,
 * melee-exotic, natural, simple / heavy, pistols, ranged-exotic, rifles,
 * simple). Because those family values are never a literal "melee"/"ranged"
 * string, an explicit editor branch change fell through resolveWeaponBranchFamily()'s
 * tier-1 check to tier-2 family evidence -- read from proficiency/
 * subcategory/category, none of which were live editor form fields and so
 * were silently carried over UNCHANGED from the item's prior (other-branch)
 * state -- which could outvote and silently revert the player's own
 * just-submitted Branch selection. Confirmed and reproduced exactly in
 * tests/weapon-branch-family-schema-authority.test.mjs section 15.
 *
 * The field contract going forward, chosen to require zero pack-data
 * migration (preserving the convention already authored in all 5,959
 * shipped weapon-type records):
 *
 *   system.meleeOrRanged -- canonical, player-facing BASE BRANCH. The
 *     editor's Branch <select> writes here; this is the field every
 *     consumer should ultimately trust.
 *   system.weaponCategory -- LEGACY/COMPATIBILITY MIRROR of the branch
 *     only ("melee"/"ranged"), matching every shipped pack record's
 *     existing convention. No longer independently editable in the V2
 *     editor; always kept in sync with the resolved branch at write time.
 *   system.subcategory -- canonical, player-facing WEAPON FAMILY. The
 *     editor's Category <select> is now bound here (Batch 2B correction
 *     #2), using the real shipped singular vocabulary (pistol, rifle,
 *     heavy, exotic, advanced, lightsaber, natural, simple, grenade) via
 *     canonicalSubcategory().
 *   system.category -- pure alias, always mirrored from `subcategory`.
 *   system.proficiency -- pure alias, DERIVED from `subcategory` via
 *     proficiencyAliasFor(), matching the real proficiency vocabulary every
 *     other consumer (feat prerequisites, etc.) already expects.
 *   system.weaponGroup / system.group -- untouched, read-time-only
 *     evidence; the write-time normalizer never assigns these.
 *
 * `resolveWeaponBranchFamily()` (read-time, tolerant, unchanged) still
 * treats a literal weaponCategory:"melee"/"ranged" as tier-1 evidence --
 * correct and safe both for un-migrated legacy pack data (where it always
 * holds branch) and for anything saved through the fixed write boundary
 * below (where it is now GUARANTEED to always hold branch, never family).
 */

/**
 * Write-time, explicit-submission-aware persistence boundary.
 * `currentSystem` is the item's existing persisted state; `submittedSystem`
 * is ONLY the keys THIS update actually included (a real form submission's
 * FormData, or an API/macro caller's explicit delta) -- never a pre-merged
 * blob. This is what lets the normalizer tell "the player just explicitly
 * changed the Branch selector" apart from "the branch/family fields are
 * merely being carried forward unchanged from the item's prior state" --
 * `resolveWeaponBranchFamily()` alone cannot make that distinction once the
 * two states have already been flattened into one object, because a
 * genuinely-authored value and a merely-carried-over one are indistinguishable
 * by that point (this was the exact defect: see the field contract above).
 *
 * Precedence:
 *   BRANCH: a literal "melee"/"ranged" explicitly submitted as `weaponCategory`
 *     wins first, matching resolveWeaponBranchFamily()'s own tier-1 authority
 *     (the pack-authored mirror field, reliable on 100% of shipped data);
 *     otherwise an explicitly submitted `meleeOrRanged` (the editor's own
 *     live Branch selector) wins. Checking weaponCategory first is what
 *     keeps materialization/self-heal correct for legacy pack-shaped data,
 *     where BOTH fields are simultaneously present in the single-object
 *     entry point below (see normalizeWeaponBranchFamily()) but only
 *     weaponCategory is trustworthy there -- meleeOrRanged is always absent/
 *     schema-defaulted garbage in real, never-edited pack data. This does
 *     NOT reintroduce the original defect for a real two-argument editor
 *     submission: the V2 editor's Category selector no longer submits
 *     `weaponCategory` at all (Batch 2B correction #2 repoints it to
 *     `subcategory`), so a real Branch-only change's `submittedSystem` never
 *     has both keys competing -- only `meleeOrRanged` is present, and it
 *     wins by simply being the only literal branch value submitted. Absent
 *     both, falls back to the tolerant `resolveWeaponBranchFamily()` read
 *     against the full merged state (materialization, or an update that
 *     never touches branch at all -- the exact same fallback this function
 *     always used).
 *   FAMILY: an explicitly submitted `subcategory` (the editor's own live
 *     Category selector, per the field contract above) -- or, for API/macro
 *     callers, any other explicitly submitted family-bearing field -- is
 *     equally deliberate intent for the new family, canonicalized and
 *     propagated to subcategory/category/proficiency together. Absent any
 *     explicit family submission, the EXISTING family fields are preserved
 *     VERBATIM, untouched, if they already agree with the resolved branch
 *     (an unrelated-field-only edit must disturb nothing); only reset to
 *     the branch-neutral fallback when they disagree (legacy corruption, or
 *     a branch-only update that leaves a stranded other-branch family).
 *
 * `meleeOrRanged`/the legacy `ranged` boolean/range-descriptor fields/
 * `attackAttribute` are all handled exactly as before (attackAttribute is
 * filled from the branch default ONLY when entirely absent; an explicit
 * value, any of the six ability keys, is always preserved verbatim).
 *
 * `target`, if supplied, is the object actually mutated and returned
 * (letting a caller like normalizeItemSystem() apply this decision onto its
 * own already-defaults-merged working object without losing those
 * defaults); it defaults to a fresh `{...currentSystem, ...submittedSystem}`
 * when omitted.
 */
export function normalizeWeaponForWrite(currentSystem = {}, submittedSystem = {}, target = null) {
  currentSystem = (currentSystem && typeof currentSystem === 'object') ? currentSystem : {};
  submittedSystem = (submittedSystem && typeof submittedSystem === 'object') ? submittedSystem : {};
  const merged = target && typeof target === 'object' ? target : { ...currentSystem, ...submittedSystem };
  const provenanceState = { ...currentSystem, ...submittedSystem };

  // BRANCH -- weaponCategory literal checked FIRST (see precedence note
  // above: this keeps single-object materialization/self-heal correct,
  // and is harmless for a real two-arg editor submission because the
  // editor no longer submits weaponCategory at all).
  const submittedCatLiteral = normKey(submittedSystem.weaponCategory);
  const submittedMor = normKey(submittedSystem.meleeOrRanged);
  let branch;
  if (submittedCatLiteral === 'melee' || submittedCatLiteral === 'ranged') {
    branch = submittedCatLiteral;
  } else if (submittedMor === 'melee' || submittedMor === 'ranged') {
    branch = submittedMor;
  } else {
    branch = resolveWeaponBranchFamily(provenanceState).branch;
  }

  merged.meleeOrRanged = branch;
  merged.weaponCategory = branch; // legacy/pack-convention branch mirror only -- never family again
  if ('ranged' in merged) merged.ranged = branch === 'ranged';

  // FAMILY
  const explicitFamilyField = WRITE_FAMILY_PRIORITY.find((field) => field in submittedSystem);
  if (explicitFamilyField) {
    const canonical = canonicalSubcategory(submittedSystem[explicitFamilyField]);
    const impliedBranch = familyOf(familyKey(canonical));
    const resolvedFamily = (impliedBranch && impliedBranch !== branch) ? BRANCH_NEUTRAL_FAMILY : (canonical || BRANCH_NEUTRAL_FAMILY);
    merged.subcategory = resolvedFamily;
    merged.category = resolvedFamily;
    merged.proficiency = proficiencyAliasFor(branch, resolvedFamily);
  } else {
    for (const field of FAMILY_FIELDS) {
      if (!(field in merged)) continue;
      const impliedBranch = familyOf(familyKey(merged[field]));
      if (impliedBranch && impliedBranch !== branch) {
        merged[field] = BRANCH_NEUTRAL_FAMILY;
      }
    }
  }

  for (const field of RANGE_DESCRIPTOR_FIELDS) {
    if (!merged[field]) continue;
    const impliedBranch = impliedBranchOfDescriptor(merged[field]);
    if (impliedBranch && impliedBranch !== branch) {
      merged[field] = '';
    }
  }

  if (merged.attackAttribute === undefined || merged.attackAttribute === null || merged.attackAttribute === '') {
    merged.attackAttribute = defaultAttackAttributeForBranch(branch);
  }

  return merged;
}

/**
 * Backward-compatible single-object entry point: treats the WHOLE object as
 * both current and submitted, so every field it contains counts as
 * deliberately present. This preserves the exact prior external contract
 * (mutates and returns the same object) for every caller that never had a
 * current-vs-submitted distinction to make in the first place --
 * materialization/preCreateItem-style full-object normalization and simple
 * API-level full-object updates.
 */
export function normalizeWeaponBranchFamily(system = {}) {
  if (!system || typeof system !== 'object') return system;
  return normalizeWeaponForWrite(system, system, system);
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

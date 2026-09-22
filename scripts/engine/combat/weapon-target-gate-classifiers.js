/**
 * weapon-target-gate-classifiers.js — neutral, pure classification helpers
 * for weapon/target/context gate evaluation, shared between the certified
 * live authority (CombatOptionResolver.optionAllowedForWeapon()) and the
 * groundwork Action Authority (ActionAvailabilityEngine).
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 4):
 * extracted verbatim from combat-option-resolver.js's own private helpers
 * -- a pure move, not a rewrite. combat-option-resolver.js now imports
 * these instead of defining local copies, so there is exactly one
 * implementation of "does this weapon match group X" / "does this target
 * own item Y" / etc. in the codebase, not two independently-maintained
 * ones. No behavior change: the full existing test suite (attack-bonus-
 * math-integrity, weapons-engine-modifier-source-authority, attack-dialog-
 * context-authority, ...) re-passes unchanged, proving this.
 */
import {
  isRangedWeapon as canonicalIsRangedWeapon,
  isNaturalOrUnarmedWeapon as canonicalIsNaturalOrUnarmedWeapon
} from "/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js";

export function normalizeKey(value) {
  return String(value ?? "").trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
}

// Math Integrity Freeze, Batch 2B: the weapon-identity fallback is
// delegated to the canonical branch authority (previously an independent
// text-heuristic list here never checked weaponCategory -- the one field
// proven 100% reliable in real data -- and got Bluebolt-shaped weapons
// right only by the accident of "pistol" appearing in system.category text).
export function getAttackType(weapon, context = {}) {
  const explicit = context.attackType ?? context.rangeType ?? context.weaponType;
  if (explicit) {
    const normalized = normalizeKey(explicit);
    if (normalized.includes("ranged")) return "ranged";
    if (normalized.includes("melee")) return "melee";
  }
  if (!weapon) return "unknown";
  return canonicalIsRangedWeapon(weapon) ? "ranged" : "melee";
}

export function normalizeRangeBand(value) {
  const key = normalizeKey(value);
  if (key === "pointblank" || key === "point-blank" || key === "close") return "point-blank";
  if (["short", "medium", "long"].includes(key)) return key;
  return key || "";
}

export function getRangeBand(context = {}) {
  return normalizeRangeBand(context.rangeBand ?? context.rangeCategory ?? context.range ?? "");
}

export function contextManeuver(context = {}) {
  return normalizeKey(context.maneuver ?? context.attackManeuver ?? context.combatManeuver ?? context.actionId ?? context.actionType ?? "");
}

export function weaponText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [weapon?.name, system.weaponType, system.weaponGroup, system.group, system.category, system.type, system.subtype, system.itemType, system.sourceType, system.traits?.join?.(" "), system.properties?.join?.(" ")];
  return fields.map(value => normalizeKey(value)).filter(Boolean).join(" ");
}

export function weaponDamageText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [system.damageType, system.damage?.type, system.damageTypes, system.traits, system.properties, weapon?.name];
  const flat = [];
  for (const field of fields) {
    if (Array.isArray(field)) flat.push(...field);
    else if (field && typeof field === "object") flat.push(...Object.values(field));
    else if (field !== undefined && field !== null) flat.push(field);
  }
  return flat.map(value => normalizeKey(value)).filter(Boolean).join(" ");
}

export function isVehicleWeapon(weapon, context = {}) {
  if (context.vehicleWeapon === true || context.starshipWeapon === true || context.weaponSystem === true) return true;
  const system = weapon?.system ?? {};
  if (system.vehicleWeapon === true || system.starshipWeapon === true || system.weaponSystem === true) return true;
  const text = weaponText(weapon);
  return text.includes('vehicle-weapon') || text.includes('starship-weapon') || text.includes('weapon-system') || text.includes('turbolaser') || text.includes('laser-cannon') || text.includes('ion-cannon') || text.includes('proton-torpedo') || text.includes('concussion-missile');
}

// Math Integrity Freeze, Batch 2B: delegated to the canonical natural/
// unarmed authority (scripts/items/weapon-branch-resolver.js).
export function isUnarmedWeapon(weapon, context = {}) {
  if (context.unarmed === true || context.attackFamily === "unarmed" || context.naturalWeapon === true) return true;
  return canonicalIsNaturalOrUnarmedWeapon(weapon);
}

export function weaponMatchesGroup(weapon, groups = [], context = {}) {
  const wanted = (Array.isArray(groups) ? groups : [groups]).map(normalizeKey).filter(Boolean);
  if (!wanted.length) return false;
  const haystack = weaponText(weapon);
  const attackType = getAttackType(weapon, context);
  return wanted.some(group => {
    if (!group) return false;
    if (haystack.includes(group)) return true;
    if ((group.includes("simple") && group.includes("melee")) && haystack.includes("simple") && attackType === "melee") return true;
    if ((group.includes("simple") && group.includes("ranged")) && haystack.includes("simple") && attackType === "ranged") return true;
    if (group.includes("lightsaber") && haystack.includes("lightsaber")) return true;
    if (group.includes("unarmed") && isUnarmedWeapon(weapon, context)) return true;
    return false;
  });
}

export function textMatchesAny(haystack, values = []) {
  const wanted = (Array.isArray(values) ? values : [values]).map(normalizeKey).filter(Boolean);
  if (!wanted.length) return false;
  const text = String(haystack || "");
  return wanted.some(value => text.includes(value));
}

export function isAreaAttackContext(weapon, context = {}) {
  if (context.areaAttack === true || context.isAreaAttack === true || context.attackMode === "area") return true;
  const system = weapon?.system ?? {};
  if (system.areaAttack === true || system.isAreaAttack === true || system.burst === true || system.splash === true) return true;
  const text = [weaponText(weapon), system.attackType, system.area, system.damageType, system.damage?.type, system.traits?.join?.(" "), system.properties?.join?.(" ")].map(value => normalizeKey(value)).filter(Boolean).join(" ");
  return /area|burst|splash|cone|line|radius|explosive|grenade/.test(text);
}

export function targetText(context = {}) {
  const target = context?.target ?? context?.targetActor ?? null;
  const system = target?.system ?? {};
  const itemNames = [];
  try {
    for (const item of Array.from(target?.items ?? [])) {
      if (item?.name) itemNames.push(item.name);
      if (item?.system?.slug) itemNames.push(item.system.slug);
      if (item?.flags?.swse?.id) itemNames.push(item.flags.swse.id);
    }
  } catch (_err) {}
  const fields = [target?.type, target?.name, system.species, system.species?.name, system.species?.value, system.details?.species, system.details?.creatureType, system.actorType, system.vehicleType, ...(Array.isArray(system.traits) ? system.traits : []), ...itemNames];
  return fields.map(value => normalizeKey(value)).filter(Boolean).join(" ");
}

export function targetHasOwnedItem(context = {}, names = [], types = []) {
  const target = context?.target ?? context?.targetActor ?? null;
  const wanted = (Array.isArray(names) ? names : [names]).map(normalizeKey).filter(Boolean);
  if (!target || !wanted.length) return false;
  const allowedTypes = (Array.isArray(types) ? types : [types]).map(normalizeKey).filter(Boolean);
  try {
    return Array.from(target.items ?? []).some(item => {
      if (!item) return false;
      if (allowedTypes.length && !allowedTypes.includes(normalizeKey(item.type))) return false;
      const itemText = [item.name, item.system?.slug, item.flags?.swse?.id].map(normalizeKey).join(" ");
      return wanted.some(value => itemText.includes(value));
    });
  } catch (_err) { return false; }
}

export function weaponSupportsAutofire(weapon, context = {}) {
  if (context.autofire === true || context.attackMode === "autofire") return true;
  const system = weapon?.system ?? {};
  if (system.autofire === true || system.properties?.autofire === true) return true;
  const text = [system.fireMode, system.properties?.join?.(" "), system.traits?.join?.(" "), weapon?.name].map(value => String(value ?? "").toLowerCase()).join(" ");
  return text.includes("autofire");
}

export function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); } catch { return []; }
}

function flattenChoiceValues(value, results = []) {
  if (!value) return results;
  if (Array.isArray(value)) { for (const entry of value) flattenChoiceValues(entry, results); return results; }
  if (typeof value === "string") { results.push(value); return results; }
  if (typeof value === "object") {
    for (const key of ["value", "id", "group", "weapon", "weaponGroup", "label", "name", "choice", "selected"]) if (value[key]) flattenChoiceValues(value[key], results);
    if (Array.isArray(value.targets)) flattenChoiceValues(value.targets, results);
  }
  return results;
}

export function getSelectedChoiceValues(item, context = {}) {
  const values = [];
  flattenChoiceValues(context.selectedChoice, values);
  flattenChoiceValues(context.selectedChoices, values);
  flattenChoiceValues(item?.system?.selectedChoice, values);
  flattenChoiceValues(item?.system?.selectedChoices, values);
  flattenChoiceValues(item?.system?.choiceMeta?.selectedChoice, values);
  return [...new Set(values.map(String).map(v => v.trim()).filter(Boolean))];
}

export function weaponMatchesSelectedChoice(item, weapon, context = {}) {
  const choices = getSelectedChoiceValues(item, context);
  if (!choices.length) return false;
  return choices.some(choice => weaponMatchesGroup(weapon, choice, context));
}

export function actorHasFeatSelectedChoiceMatchingWeapon(actor, featNames = [], weapon, context = {}) {
  const wanted = (Array.isArray(featNames) ? featNames : [featNames]).map(normalizeKey).filter(Boolean);
  if (!wanted.length) return false;
  for (const item of actorItems(actor)) {
    if (!wanted.includes(normalizeKey(item?.name))) continue;
    if (weaponMatchesSelectedChoice(item, weapon, context)) return true;
  }
  return false;
}

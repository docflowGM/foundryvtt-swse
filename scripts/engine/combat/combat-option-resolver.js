import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

const ATTACK_OPTION_RULE = "ATTACK_OPTION";

const DEFAULT_ATTACK_OPTIONS = {
  powerAttack: {
    id: "powerAttack",
    label: "Power Attack",
    control: "slider",
    max: 5,
    resource: "baseAttackBonus",
    requiresAttackType: "melee",
    attackModifierFormula: "-value",
    damageModifierFormula: "value",
    summary: "Trade attack bonus for bonus melee damage."
  },
  meleeDefense: {
    id: "meleeDefense",
    label: "Melee Defense",
    control: "slider",
    max: 5,
    resource: "baseAttackBonus",
    requiresAttackType: "melee",
    attackModifierFormula: "-value",
    defenseModifier: {
      target: "defense.reflex",
      type: "dodge",
      valueFormula: "value",
      duration: "untilStartOfNextTurn"
    },
    summary: "Trade attack bonus for a dodge bonus to Reflex Defense until your next turn."
  },
  rapidShot: {
    id: "rapidShot",
    label: "Rapid Shot",
    control: "toggle",
    requiresAttackType: "ranged",
    attackModifier: -2,
    damageDiceStepBonus: 1,
    summary: "Take -2 on a ranged attack to deal +1 die of damage."
  },
  rapidStrike: {
    id: "rapidStrike",
    label: "Rapid Strike",
    control: "toggle",
    requiresAttackType: "melee",
    attackModifier: -2,
    damageDiceStepBonus: 1,
    summary: "Take -2 on a melee attack to deal +1 die of damage."
  },
  carefulShot: {
    id: "carefulShot",
    label: "Careful Shot",
    control: "toggle",
    requiresAttackType: "ranged",
    requiresAim: true,
    attackModifier: 1,
    summary: "When aiming with a ranged weapon, gain +1 on the attack roll."
  },
  deadeye: {
    id: "deadeye",
    label: "Deadeye",
    control: "toggle",
    requiresAttackType: "ranged",
    requiresAim: true,
    damageExtraWeaponDice: 1,
    summary: "When aiming with a ranged weapon, deal +1 weapon die of damage."
  },
  burstFire: {
    id: "burstFire",
    label: "Burst Fire",
    control: "toggle",
    requiresAttackType: "ranged",
    requiresAutofire: true,
    attackModifier: -5,
    damageExtraWeaponDice: 2,
    ammunitionCost: 5,
    summary: "Use autofire against one target: -5 attack, +2 weapon dice, spend five shots."
  },
  farShot: {
    id: "farShot",
    label: "Far Shot",
    control: "passive",
    requiresAttackType: "ranged",
    rangePenaltyAdjustment: "oneStepCloser",
    summary: "Treat short, medium, and long range as one range band closer."
  },
  preciseShot: {
    id: "preciseShot",
    label: "Precise Shot",
    control: "flag",
    requiresAttackType: "ranged",
    suppresses: ["firingIntoMeleePenalty"],
    summary: "Ignore the attack penalty for firing into melee where that penalty is applied."
  },
  runningAttack: {
    id: "runningAttack",
    label: "Running Attack",
    control: "flag",
    summary: "Movement-dependent attack option. Exposed as a combat flag; movement validation is not automated yet."
  },
  powerfulCharge: {
    id: "powerfulCharge",
    label: "Powerful Charge",
    control: "toggle",
    requiresAttackType: "melee",
    requiresCharge: true,
    attackModifier: 2,
    damageModifierFormula: "halfLevel",
    summary: "When charging with a melee attack, gain +2 attack and add half level to damage."
  },
  chargingFire: {
    id: "chargingFire",
    label: "Charging Fire",
    control: "flag",
    requiresAttackType: "ranged",
    requiresCharge: true,
    suppresses: ["chargeAttackBonus"],
    defenseModifier: {
      target: "defense.reflex",
      type: "untyped",
      value: -2,
      duration: "untilStartOfNextTurn"
    },
    summary: "Make a ranged attack at the end of a charge without the normal charge attack bonus."
  },
  improvedDisarm: {
    id: "improvedDisarm",
    label: "Improved Disarm",
    control: "toggle",
    requiresAttackType: "melee",
    requiresManeuver: "disarm",
    attackModifier: 5,
    suppresses: ["failedDisarmCounterattack"],
    summary: "Gain +5 on melee attacks made specifically to disarm."
  },
  mightySwing: {
    id: "mightySwing",
    label: "Mighty Swing",
    control: "toggle",
    requiresAttackType: "melee",
    requiresSwiftActions: 2,
    damageExtraWeaponDice: 1,
    summary: "Spend two swift actions to add one weapon die to your next melee attack."
  }
};

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
}

function scalarText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    for (const key of ["value", "id", "key", "slug", "name", "label", "type"]) {
      if (value[key] != null && value[key] !== value) return scalarText(value[key]);
    }
  }
  return "";
}

function lowerScalar(value) {
  return scalarText(value).trim().toLowerCase();
}

function camelize(value) {
  const key = normalizeKey(value);
  return key.replace(/-([a-z0-9])/g, (_m, c) => c.toUpperCase());
}

function getAttackType(weapon, context = {}) {
  const explicit = context.attackType ?? context.rangeType ?? context.weaponType;
  if (explicit) {
    const normalized = normalizeKey(explicit);
    if (normalized.includes("ranged")) return "ranged";
    if (normalized.includes("melee")) return "melee";
  }

  const candidates = [
    weapon?.system?.combat?.range,
    weapon?.system?.range,
    weapon?.system?.weaponType,
    weapon?.system?.weaponGroup,
    weapon?.system?.category,
    weapon?.system?.type,
    weapon?.name
  ].map(v => normalizeKey(v));

  if (candidates.some(v => v.includes("ranged") || v.includes("pistol") || v.includes("rifle") || v.includes("bowcaster") || v.includes("blaster"))) {
    return "ranged";
  }
  if (candidates.some(v => v.includes("melee") || v.includes("lightsaber") || v.includes("unarmed") || v.includes("blade"))) {
    return "melee";
  }
  return "unknown";
}

function getFeatRules(item) {
  const meta = item?.system?.abilityMeta ?? {};
  const rules = [];
  const pushRule = (rule) => {
    if (!rule || typeof rule !== "object") return;
    if (rule.type === ATTACK_OPTION_RULE || rule.option || rule.id) rules.push(rule);
  };

  if (Array.isArray(meta.rules)) meta.rules.forEach(pushRule);
  if (Array.isArray(meta.primitives)) {
    for (const primitive of meta.primitives) {
      if (primitive?.type === ATTACK_OPTION_RULE) pushRule(primitive.data ?? primitive);
      if (primitive?.data?.option || primitive?.data?.id) pushRule(primitive.data);
    }
  }
  if (meta.attackOption) pushRule(meta.attackOption);
  return rules;
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch {
    return [];
  }
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function actorBAB(actor) {
  const value = Number(SchemaAdapters.getBAB(actor) ?? actor?.system?.attributes?.bab?.value ?? actor?.system?.bab ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function actorLevel(actor) {
  const candidates = [
    actor?.system?.details?.level,
    actor?.system?.level,
    actor?.system?.attributes?.level,
    actor?.system?.progression?.level,
    actor?.system?.progression?.characterLevel
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 1;
}

function actorAbilityMod(actor, ability) {
  const key = String(ability || '').toLowerCase().slice(0, 3);
  if (!key) return 0;
  const value = SchemaAdapters.getAbilityMod?.(actor, key)
    ?? actor?.system?.derived?.attributes?.[key]?.mod
    ?? actor?.system?.abilities?.[key]?.mod
    ?? actor?.system?.attributes?.[key]?.mod
    ?? 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeRangeBand(value) {
  const key = normalizeKey(value);
  if (key === "pointblank" || key === "point-blank" || key === "close") return "point-blank";
  if (key === "short") return "short";
  if (key === "medium") return "medium";
  if (key === "long") return "long";
  return key || "";
}

function getRangeBand(context = {}) {
  return normalizeRangeBand(context.rangeBand ?? context.rangeCategory ?? context.range ?? "");
}

function getRangePenaltyAdjustment(option, context = {}) {
  if (option.rangePenaltyAdjustment !== "oneStepCloser") return 0;
  const band = getRangeBand(context);
  if (band === "short") return 2;
  if (band === "medium") return 3;
  if (band === "long") return 5;
  return 0;
}

function contextManeuver(context = {}) {
  return normalizeKey(context.maneuver ?? context.attackManeuver ?? context.combatManeuver ?? context.actionId ?? context.actionType ?? "");
}

function weaponText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.category,
    system.type,
    system.subtype,
    system.itemType,
    system.sourceType,
    system.traits?.join?.(" "),
    system.properties?.join?.(" ")
  ];
  return fields.map(value => normalizeKey(value)).filter(Boolean).join(" ");
}

function isVehicleWeapon(weapon, context = {}) {
  if (context.vehicleWeapon === true || context.starshipWeapon === true || context.weaponSystem === true) return true;
  const system = weapon?.system ?? {};
  if (system.vehicleWeapon === true || system.starshipWeapon === true || system.weaponSystem === true) return true;
  const text = weaponText(weapon);
  return text.includes('vehicle-weapon')
    || text.includes('starship-weapon')
    || text.includes('weapon-system')
    || text.includes('turbolaser')
    || text.includes('laser-cannon')
    || text.includes('ion-cannon')
    || text.includes('proton-torpedo')
    || text.includes('concussion-missile');
}

function weaponDamageText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [
    system.damageType,
    system.damage?.type,
    system.damageTypes,
    system.traits,
    system.properties,
    weapon?.name
  ];
  const flat = [];
  for (const field of fields) {
    if (Array.isArray(field)) flat.push(...field);
    else if (field && typeof field === "object") flat.push(...Object.values(field));
    else if (field !== undefined && field !== null) flat.push(field);
  }
  return flat.map(value => normalizeKey(value)).filter(Boolean).join(" ");
}

function targetText(context = {}) {
  const target = context?.target ?? context?.targetActor ?? null;
  const system = target?.system ?? {};
  const itemNames = [];
  try {
    for (const item of Array.from(target?.items ?? [])) {
      if (item?.name) itemNames.push(item.name);
      if (item?.system?.slug) itemNames.push(item.system.slug);
      if (item?.flags?.swse?.id) itemNames.push(item.flags.swse.id);
    }
  } catch (_err) {
    // Target item data is optional in preroll contexts.
  }
  const fields = [
    target?.type,
    target?.name,
    system.species,
    system.species?.name,
    system.species?.value,
    system.details?.species,
    system.details?.creatureType,
    system.actorType,
    system.vehicleType,
    ...(Array.isArray(system.traits) ? system.traits : []),
    ...itemNames
  ];
  return fields.map(value => normalizeKey(value)).filter(Boolean).join(" ");
}

function targetHasOwnedItem(context = {}, names = [], types = []) {
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
  } catch (_err) {
    return false;
  }
}
function weaponMatchesGroup(weapon, groups = [], context = {}) {
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

function textMatchesAny(haystack, values = []) {
  const wanted = (Array.isArray(values) ? values : [values]).map(normalizeKey).filter(Boolean);
  if (!wanted.length) return false;
  const text = String(haystack || "");
  return wanted.some(value => text.includes(value));
}

function isNaturalWeapon(weapon) {
  if (!weapon) return false;
  if (weapon?.flags?.swse?.isNaturalWeapon === true || weapon?.flags?.swse?.naturalWeapon === true) return true;
  const system = weapon?.system ?? {};
  if (system.naturalWeapon === true || system.isNaturalWeapon === true) return true;
  if (normalizeKey(system.source) === "species-natural-weapon") return true;
  if (system.properties?.naturalWeapon === true || system.properties?.["natural-weapon"] === true) return true;
  const text = [
    weaponText(weapon),
    system.source,
    system.sourceType,
    system.weaponFamily,
    system.naturalWeaponType,
    weapon?.name
  ].map(value => normalizeKey(value)).filter(Boolean).join(" " );
  return /natural-weapon|claw|bite|talon|tusk|horn|tail|slam|gore/.test(text);
}

function isUnarmedWeapon(weapon, context = {}) {
  if (context.unarmed === true || context.attackFamily === "unarmed" || context.naturalWeapon === true) return true;
  if (isNaturalWeapon(weapon)) return true;
  const text = weaponText(weapon);
  return text.includes("unarmed") || text.includes("natural-weapon") || normalizeKey(weapon?.name).includes("unarmed");
}

function isAreaAttackContext(weapon, context = {}) {
  if (context.areaAttack === true || context.isAreaAttack === true || context.attackMode === "area") return true;
  const system = weapon?.system ?? {};
  if (system.areaAttack === true || system.isAreaAttack === true || system.burst === true || system.splash === true) return true;
  const text = [
    weaponText(weapon),
    system.attackType,
    system.area,
    system.damageType,
    system.damage?.type,
    system.traits?.join?.(" "),
    system.properties?.join?.(" ")
  ].map(value => normalizeKey(value)).filter(Boolean).join(" ");
  return /area|burst|splash|cone|line|radius|explosive|grenade/.test(text);
}

function flattenChoiceValues(value, results = []) {
  if (!value) return results;
  if (Array.isArray(value)) {
    for (const entry of value) flattenChoiceValues(entry, results);
    return results;
  }
  if (typeof value === "string") {
    results.push(value);
    return results;
  }
  if (typeof value === "object") {
    for (const key of ["value", "id", "group", "weapon", "weaponGroup", "label", "name", "choice", "selected"]) {
      if (value[key]) flattenChoiceValues(value[key], results);
    }
    if (Array.isArray(value.targets)) flattenChoiceValues(value.targets, results);
  }
  return results;
}

function getSelectedChoiceValues(item, context = {}) {
  const values = [];
  flattenChoiceValues(context.selectedChoice, values);
  flattenChoiceValues(context.selectedChoices, values);
  flattenChoiceValues(item?.system?.selectedChoice, values);
  flattenChoiceValues(item?.system?.selectedChoices, values);
  flattenChoiceValues(item?.system?.choiceMeta?.selectedChoice, values);
  return [...new Set(values.map(String).map(v => v.trim()).filter(Boolean))];
}

function weaponMatchesSelectedChoice(item, weapon, context = {}) {
  const choices = getSelectedChoiceValues(item, context);
  if (!choices.length) return false;
  return choices.some(choice => weaponMatchesGroup(weapon, choice, context));
}

function actorHasFeatSelectedChoiceMatchingWeapon(actor, featNames = [], weapon, context = {}) {
  const wanted = (Array.isArray(featNames) ? featNames : [featNames]).map(normalizeKey).filter(Boolean);
  if (!wanted.length) return false;
  for (const item of actorItems(actor)) {
    if (!wanted.includes(normalizeKey(item?.name))) continue;
    if (weaponMatchesSelectedChoice(item, weapon, context)) return true;
  }
  return false;
}

function isPointBlankContext(context = {}) {
  return context.pointBlankRange === true || context.isPointBlank === true || getRangeBand(context) === "point-blank";
}

function modifierAppliesToWeaponRoll(item, modifier, weapon, context = {}) {
  if (!modifier || modifier.enabled === false) return false;
  const predicates = Array.isArray(modifier.predicates) ? modifier.predicates : [];
  for (const predicate of predicates) {
    switch (predicate) {
      case "attack.weapon-matches-selected-choice":
        if (!weaponMatchesSelectedChoice(item, weapon, context)) return false;
        break;
      case "attack.with-ranged":
        if (getAttackType(weapon, context) !== "ranged") return false;
        break;
      case "attack.with-melee":
        if (getAttackType(weapon, context) !== "melee") return false;
        break;
      case "range.within-point-blank":
        if (!isPointBlankContext(context)) return false;
        break;
      default:
        // Post-roll/target/defense/turn predicates cannot safely be evaluated
        // while building an attack or damage formula. They belong to explicit
        // combat options, rider rules, or reaction hooks.
        return false;
    }
  }
  return true;
}

function collectModifierRollBonuses(item, weapon, context = {}) {
  const result = { attackBonus: 0, damageBonus: 0, breakdown: [] };
  const modifiers = item?.system?.abilityMeta?.modifiers;
  if (!Array.isArray(modifiers)) return result;

  for (const modifier of modifiers) {
    if (!modifierAppliesToWeaponRoll(item, modifier, weapon, context)) continue;
    const value = Number(modifier.value ?? 0);
    if (!Number.isFinite(value) || value === 0) continue;
    const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target];
    for (const target of targets.map(t => String(t || ""))) {
      if (target === "attack" || target === "attack.bonus") {
        // The generic PASSIVE/STATE attack path cannot see item.selectedChoice,
        // so selected-weapon attack bonuses are handled here. Non-choice
        // attack predicates are left to explicit attack options or legacy state
        // evaluation to avoid double-counting Point-Blank Shot.
        const selectedChoiceOnly = (modifier.predicates || []).includes("attack.weapon-matches-selected-choice");
        if (!selectedChoiceOnly) continue;
        result.attackBonus += value;
        result.breakdown.push({ label: modifier.description || item.name, value, type: "attack" });
      } else if (target === "damage" || target === "damage.weapon" || target === "damage.ranged" || target === "damage.melee") {
        result.damageBonus += value;
        result.breakdown.push({ label: modifier.description || item.name, value, type: "damage" });
      }
    }
  }

  return result;
}

function collectWeaponRuleModifiers(actor, weapon, context = {}) {
  const result = {
    attackBonus: 0,
    attackAbilityBonus: 0,
    damageBonus: 0,
    damageExtraWeaponDice: 0,
    damageDiceStepBonus: 0,
    damageDieStepIncreases: 0,
    criticalDamageDieStepBonus: 0,
    criticalThreatNaturalMin: null,
    criticalMultiplierMin: null,
    targetEffectsOnHit: [],
    targetEffectsOnCritical: [],
    flags: {},
    breakdown: []
  };

  const appliedStackingKeys = new Set();

  for (const item of actorItems(actor)) {
    const rules = item?.system?.abilityMeta?.rules;
    if (Array.isArray(rules)) {
      for (const rule of rules) {
        switch (rule?.type) {
        case "WEAPON_DAMAGE_DIE_STEP": {
          if (!weaponMatchesGroup(weapon, rule.weaponGroups ?? rule.groups ?? [], context)) continue;
          const value = Number(rule.value ?? 0);
          if (!Number.isFinite(value) || value === 0) continue;
          result.damageExtraWeaponDice += value;
          result.breakdown.push({ label: item.name, value, type: "damageExtraWeaponDice" });
          break;
        }
        case "UNARMED_DAMAGE_STEP": {
          if (!isUnarmedWeapon(weapon, context)) continue;
          if (weapon?.flags?.swse?.martialArtsDamageApplied === true) continue;
          const value = Number(rule.value ?? rule.steps ?? rule.params?.steps ?? 0);
          if (!Number.isFinite(value) || value === 0) continue;
          result.damageDieStepIncreases += value;
          result.breakdown.push({ label: item.name, value, type: "damageDieStepIncrease" });
          break;
        }
        case "UNARMED_EXTRA_WEAPON_DICE": {
          if (!isUnarmedWeapon(weapon, context)) continue;
          if (weapon?.flags?.swse?.unarmedExtraWeaponDiceApplied === true) continue;
          const stackingKey = String(rule.stackingKey || rule.stackKey || rule.id || "");
          if (stackingKey && rule.stacking === "highest" && appliedStackingKeys.has(stackingKey)) continue;
          const value = Number(rule.value ?? rule.dice ?? rule.extraDice ?? rule.params?.dice ?? 0);
          if (!Number.isFinite(value) || value === 0) continue;
          if (stackingKey && rule.stacking === "highest") appliedStackingKeys.add(stackingKey);
          result.damageExtraWeaponDice += value;
          result.damageDiceStepBonus += value;
          result.breakdown.push({ label: rule.label || item.name, value, type: "damageExtraWeaponDice" });
          break;
        }
        case "UNARMED_DOES_NOT_PROVOKE_AOO": {
          if (!isUnarmedWeapon(weapon, context)) continue;
          result.flags.unarmedDoesNotProvokeAoO = true;
          break;
        }
        case "ATTACK_ABILITY_SUBSTITUTION": {
          if (!weaponMatchesGroup(weapon, rule.weaponGroups ?? rule.groups ?? [], context)) continue;
          const from = String(rule.fromAbility || "str").toLowerCase().slice(0, 3);
          const to = String(rule.toAbility || "dex").toLowerCase().slice(0, 3);
          const fromMod = actorAbilityMod(actor, from);
          const toMod = actorAbilityMod(actor, to);
          const value = rule.useBetter === false ? (toMod - fromMod) : Math.max(0, toMod - fromMod);
          if (!value) continue;
          // Multiple ability-substitution feats can apply to the same weapon family
          // (for example Weapon Finesse and Noble Fencing Style). Only the best
          // substitution should change the base attack ability; stacking each
          // delta would double-count the original Strength modifier.
          const previous = Number(result.flags._attackAbilitySubstitutionValue || 0);
          if (value <= previous) continue;
          const delta = value - previous;
          result.attackAbilityBonus += delta;
          result.flags._attackAbilitySubstitutionValue = value;
          result.flags._attackAbilitySubstitutionSource = item.name;
          result.breakdown.push({ label: item.name, value: delta, type: "attackAbilitySubstitution" });
          break;
        }
        case "ATTACK_ABILITY_BONUS": {
          if (!weaponMatchesGroup(weapon, rule.weaponGroups ?? rule.groups ?? [], context)) continue;
          const ability = String(rule.ability || "str").toLowerCase().slice(0, 3);
          const value = actorAbilityMod(actor, ability);
          if (!value) continue;
          result.attackAbilityBonus += value;
          result.breakdown.push({ label: item.name, value, type: "attackAbilityBonus" });
          break;
        }
        case "CRITICAL_DAMAGE_DIE_STEP": {
          if (rule.requiresUnarmed && !isUnarmedWeapon(weapon, context)) continue;
          if (rule.selectedChoice === true && !weaponMatchesSelectedChoice(item, weapon, context)) continue;
          if (rule.weaponGroups && !weaponMatchesGroup(weapon, rule.weaponGroups, context)) continue;
          const value = Number(rule.value ?? rule.steps ?? 0);
          if (!Number.isFinite(value) || value === 0) continue;
          result.criticalDamageDieStepBonus += value;
          result.breakdown.push({ label: item.name, value, type: "criticalDamageDieStepBonus" });
          break;
        }
        case "EXTEND_CRITICAL_RANGE": {
          const params = rule.params ?? {};
          const rawGroups = [
            ...(Array.isArray(rule.weaponGroups) ? rule.weaponGroups : asArray(rule.weaponGroups)),
            ...(Array.isArray(rule.groups) ? rule.groups : asArray(rule.groups)),
            params.proficiency,
            params.weaponGroup
          ].filter(Boolean);
          const expandedGroups = [];
          for (const group of rawGroups) {
            const key = normalizeKey(group);
            if (!key) continue;
            expandedGroups.push(key);
            if (key.endsWith("-weapons")) expandedGroups.push(key.replace(/-weapons$/, ""));
            if (key.endsWith("-weapon")) expandedGroups.push(key.replace(/-weapon$/, ""));
          }
          if (rule.selectedChoice === true && !weaponMatchesSelectedChoice(item, weapon, context)) continue;
          if (expandedGroups.length && !weaponMatchesGroup(weapon, expandedGroups, context)) continue;
          const by = Number(rule.by ?? rule.value ?? params.by ?? 1);
          if (!Number.isFinite(by) || by <= 0) continue;
          const threshold = Math.max(2, 20 - by);
          result.criticalThreatNaturalMin = result.criticalThreatNaturalMin
            ? Math.min(result.criticalThreatNaturalMin, threshold)
            : threshold;
          result.breakdown.push({ label: rule.label || item.name, value: threshold, type: "criticalThreatNaturalMin" });
          break;
        }
        case "CRITICAL_RIDER": {
          if (rule.selectedChoice === true && !weaponMatchesSelectedChoice(item, weapon, context)) continue;
          if (rule.weaponGroups && !weaponMatchesGroup(weapon, rule.weaponGroups, context)) continue;
          if (rule.requiresAttackType && getAttackType(weapon, context) !== rule.requiresAttackType) continue;
          const effects = Array.isArray(rule.targetEffectsOnCritical)
            ? rule.targetEffectsOnCritical
            : Array.isArray(rule.effects)
              ? rule.effects
              : [];
          if (!effects.length) continue;
          result.targetEffectsOnCritical.push(...effects.map(effect => ({ ...effect, sourceName: item.name, sourceRule: rule.id || rule.type })));
          result.breakdown.push({ label: rule.label || item.name, value: 0, type: "criticalRider" });
          break;
        }
        case "HIT_RIDER": {
          if (rule.selectedChoice === true && !weaponMatchesSelectedChoice(item, weapon, context)) continue;
          if (rule.weaponGroups && !weaponMatchesGroup(weapon, rule.weaponGroups, context)) continue;
          if (rule.requiresAttackType && getAttackType(weapon, context) !== rule.requiresAttackType) continue;
          const effects = Array.isArray(rule.targetEffectsOnHit)
            ? rule.targetEffectsOnHit
            : Array.isArray(rule.effects)
              ? rule.effects
              : [];
          if (!effects.length) continue;
          result.targetEffectsOnHit.push(...effects.map(effect => ({ ...effect, sourceName: item.name, sourceRule: rule.id || rule.type })));
          result.breakdown.push({ label: rule.label || item.name, value: 0, type: "hitRider" });
          break;
        }
        case "WEAPON_CRITICAL_MULTIPLIER_MIN": {
          if (rule.selectedChoice === true && !weaponMatchesSelectedChoice(item, weapon, context)) continue;
          if (rule.weaponGroups && !weaponMatchesGroup(weapon, rule.weaponGroups, context)) continue;
          const value = Number(rule.value ?? rule.multiplier ?? rule.minimum ?? 0);
          if (!Number.isFinite(value) || value <= 0) continue;
          result.criticalMultiplierMin = Math.max(result.criticalMultiplierMin || 0, value);
          if (Array.isArray(rule.targetEffectsOnCritical)) result.targetEffectsOnCritical.push(...rule.targetEffectsOnCritical.map(effect => ({ ...effect, sourceName: item.name })));
          result.breakdown.push({ label: item.name, value, type: "criticalMultiplierMin" });
          break;
        }
          default:
            break;
        }
      }
    }

    const modifierRollBonuses = collectModifierRollBonuses(item, weapon, context);
    result.attackBonus += modifierRollBonuses.attackBonus || 0;
    result.damageBonus += modifierRollBonuses.damageBonus || 0;
    result.breakdown.push(...(modifierRollBonuses.breakdown || []));
  }

  return result;
}

function collectCombinedFeatModifiers(actor, weapon, context = {}) {
  const result = { attackAbilityBonus: 0, breakdown: [], flags: {} };
  if (!actor || !weapon) return result;

  const weaponGroup = lowerScalar(weapon?.system?.weaponCategory ?? weapon?.system?.type ?? '');
  const alreadyCoveredByWF =
    weaponGroup === 'light' || weaponGroup === 'light-melee' || weaponGroup === 'lightsaber' ||
    weaponMatchesGroup(weapon, ['light', 'light-melee', 'lightsaber'], context);
  if (alreadyCoveredByWF) return result;

  const hasWF = actorItems(actor).some(
    i => String(i?.type ?? '').toLowerCase() === 'feat' &&
         String(i?.name ?? '').trim().toLowerCase() === 'weapon finesse'
  );
  if (!hasWF) return result;

  if (!actorHasFeatSelectedChoiceMatchingWeapon(actor, ['weapon focus'], weapon, context)) return result;

  const traits = Array.isArray(weapon?.system?.traits)
    ? weapon.system.traits.map(t => String(t?.name ?? t ?? '').toLowerCase()) : [];
  if (traits.includes('two-handed') || traits.includes('twohanded')) return result;
  if (weaponGroup === 'heavy' || weaponGroup === 'vehicle') return result;

  const delta = Math.max(0, actorAbilityMod(actor, 'dex') - actorAbilityMod(actor, 'str'));
  if (!delta) return result;

  result.attackAbilityBonus = delta;
  result.flags._attackAbilitySubstitutionValue = delta;
  result.flags._attackAbilitySubstitutionSource = 'Weapon Focus + Weapon Finesse (combined feat)';
  result.breakdown.push({ label: 'Weapon Focus + Weapon Finesse (combined feat)', value: delta, type: 'attackAbilitySubstitution' });
  return result;
}

function weaponSupportsAutofire(weapon, context = {}) {
  if (context.autofire === true || context.attackMode === "autofire") return true;
  const system = weapon?.system ?? {};
  if (system.autofire === true || system.properties?.autofire === true) return true;
  const text = [system.fireMode, system.properties?.join?.(" "), system.traits?.join?.(" "), weapon?.name]
    .map(value => String(value ?? "").toLowerCase())
    .join(" ");
  return text.includes("autofire");
}

function optionAllowedForWeapon(option, actor, weapon, context = {}) {
  const attackType = getAttackType(weapon, context);
  if (option.requiresAttackType && option.requiresAttackType !== "any" && attackType !== "unknown" && attackType !== option.requiresAttackType) {
    return false;
  }

  if (option.requiresManeuver && contextManeuver(context) !== normalizeKey(option.requiresManeuver)) {
    return false;
  }

  if (option.requiresAim && context.aim !== true) {
    return false;
  }

  if (option.requiresCharge && context.charge !== true) {
    return false;
  }

  if (option.requiresAutofire && !weaponSupportsAutofire(weapon, context)) {
    return false;
  }

  if (option.requiresUnarmed && !isUnarmedWeapon(weapon, context)) {
    return false;
  }

  if (option.requiresWeaponGroups && !weaponMatchesGroup(weapon, option.requiresWeaponGroups, context)) {
    return false;
  }

  if (option.requiresWeaponText && !textMatchesAny(weaponText(weapon), option.requiresWeaponText)) {
    return false;
  }

  if (option.requiresVehicleWeapon && !isVehicleWeapon(weapon, context)) {
    return false;
  }

  if (option.requiresFeatSelectedChoiceMatch && !actorHasFeatSelectedChoiceMatchingWeapon(actor, option.requiresFeatSelectedChoiceMatch, weapon, context)) {
    return false;
  }

  if (option.requiresDamageType && !textMatchesAny(weaponDamageText(weapon), option.requiresDamageType)) {
    return false;
  }

  if (option.excludesDamageType && textMatchesAny(weaponDamageText(weapon), option.excludesDamageType)) {
    return false;
  }

  if (option.requiresTargetType && !textMatchesAny(targetText(context), option.requiresTargetType)) {
    return false;
  }

  if (option.requiresTargetFeat && !targetHasOwnedItem(context, option.requiresTargetFeat, ['feat'])) {
    return false;
  }

  if (option.requiresTargetTalent && !targetHasOwnedItem(context, option.requiresTargetTalent, ['talent'])) {
    return false;
  }

  if (option.requiresTargetItem && !targetHasOwnedItem(context, option.requiresTargetItem)) {
    return false;
  }

  if (option.requiresTargetText && !textMatchesAny(targetText(context), option.requiresTargetText)) {
    return false;
  }

  if (option.requiresOption) {
    const combat = context?.combatOptions ?? context?.attackOptions ?? {};
    if (!combat?.[option.requiresOption]) return false;
  }

  if (option.requiresRangeBand) {
    const allowed = Array.isArray(option.requiresRangeBand) ? option.requiresRangeBand : [option.requiresRangeBand];
    const band = getRangeBand(context);
    if (!allowed.map(normalizeRangeBand).includes(band)) return false;
  }

  if (option.requiresContextFlags) {
    const required = Array.isArray(option.requiresContextFlags) ? option.requiresContextFlags : [option.requiresContextFlags];
    const flags = new Set([
      ...(Array.isArray(context.flags) ? context.flags : []),
      ...(Array.isArray(context.contextFlags) ? context.contextFlags : [])
    ].map(String));
    for (const flag of required.map(String)) {
      if (context[flag] !== true && !flags.has(flag)) return false;
    }
  }

  if (option.requiresTargetFlatFooted) {
    const target = context?.target;
    const flatFooted = context.targetFlatFooted === true || context.flatFootedTarget === true || target?.system?.derived?.isFlatFooted === true;
    if (!flatFooted) return false;
  }

  if (option.requiresTargetDeniedDexBonus) {
    const target = context?.target;
    const deniedDex = context.targetDeniedDexBonus === true || context.deniedDexBonus === true || context.targetFlatFooted === true || target?.system?.derived?.deniedDexBonus === true || target?.system?.derived?.isFlatFooted === true;
    if (!deniedDex) return false;
  }

  if (option.requiresOpportunityAttack && context.opportunityAttack !== true && context.attackOfOpportunity !== true && context.isAttackOfOpportunity !== true) {
    return false;
  }

  if (option.requiresAreaAttack && !isAreaAttackContext(weapon, context)) {
    return false;
  }

  if (option.excludesWeaponGroups && weaponMatchesGroup(weapon, option.excludesWeaponGroups, context)) {
    return false;
  }

  if (option.excludesAreaAttack && (context.isAreaAttack === true || context.areaAttack === true || weapon?.system?.areaAttack === true || weapon?.system?.isAreaAttack === true)) {
    return false;
  }

  return true;
}

function hydrateOption(raw, actor, weapon, context = {}) {
  const id = camelize(raw.option ?? raw.id ?? raw.key ?? raw.name);
  const defaults = DEFAULT_ATTACK_OPTIONS[id] ?? {};
  const merged = foundry?.utils?.mergeObject
    ? foundry.utils.mergeObject(foundry.utils.deepClone(defaults), raw, { inplace: false })
    : { ...defaults, ...raw };

  merged.id = id;
  merged.label = merged.label ?? raw.label ?? id;
  merged.control = merged.control ?? merged.inputType ?? "toggle";
  merged.attackType = getAttackType(weapon, context);

  if (merged.control === "slider") {
    const bab = actorBAB(actor);
    const ruleMax = Number(merged.max ?? merged.maximum ?? 5);
    merged.min = Number(merged.min ?? 0);
    merged.max = Math.max(0, Math.min(bab, Number.isFinite(ruleMax) ? ruleMax : bab));
    merged.step = Number(merged.step ?? 1);
    merged.value = Math.max(merged.min, Math.min(Number(context?.combatOptions?.[id] ?? context?.attackOptions?.[id] ?? 0), merged.max));
    merged.disabled = merged.max <= 0;
  } else if (merged.control === "toggle") {
    merged.checked = Boolean(context?.combatOptions?.[id] ?? context?.attackOptions?.[id]);
  }

  if (merged.requiresAim && !context?.aim) {
    merged.warning = merged.warning ?? "Requires Aim.";
  }
  if (merged.requiresCharge && !context?.charge) {
    merged.warning = merged.warning ?? "Requires a charge context.";
  }
  if (merged.requiresManeuver && contextManeuver(context) !== normalizeKey(merged.requiresManeuver)) {
    merged.warning = merged.warning ?? `Requires ${merged.requiresManeuver}.`;
  }
  if (merged.requiresAutofire && !weaponSupportsAutofire(weapon, context)) {
    merged.warning = merged.warning ?? "Requires an autofire-capable weapon or autofire attack mode.";
  }

  if (merged.control === "passive") {
    merged.checked = true;
    merged.value = 1;
  }

  return merged;
}

function selectedValue(options, id) {
  const combat = options?.combatOptions ?? options?.attackOptions ?? {};
  const value = combat?.[id];
  if (value === undefined || value === null || value === false || value === "") return 0;
  if (value === true) return 1;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export class CombatOptionResolver {
  static getAvailableAttackOptions(actor, weapon, context = {}) {
    const options = [];
    for (const item of actorItems(actor)) {
      for (const rule of getFeatRules(item)) {
        const option = hydrateOption(rule, actor, weapon, context);
        if (!option?.id) continue;
        if (!optionAllowedForWeapon(option, actor, weapon, context)) continue;
        option.sourceItemId = item.id;
        option.sourceName = item.name;
        if (!options.some(existing => existing.id === option.id)) options.push(option);
      }
    }
    return options.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }

  static summarizeAttackOptions(actor, weapon, options = {}) {
    const available = this.getAvailableAttackOptions(actor, weapon, options);
    return available.map(option => {
      const value = option.control === "passive" ? 1 : selectedValue(options, option.id);
      return { ...option, selectedValue: value, active: option.control === "passive" || value > 0 || (option.control === "flag" && Boolean(options?.combatOptions?.[option.id])) };
    });
  }

  static collectAttackModifiers(actor, weapon, options = {}) {
    const active = this.summarizeAttackOptions(actor, weapon, options);
    const result = {
      attackBonus: 0,
      attackAbilityBonus: 0,
      damageBonus: 0,
      damageDiceStepBonus: 0,
      damageExtraWeaponDice: 0,
      damageDieStepIncreases: 0,
      ammunitionCost: 0,
      defenseModifiers: [],
      targetEffectsOnHit: [],
      criticalThreatNaturalMin: null,
      criticalMultiplierMin: null,
      criticalDamageDieStepBonus: 0,
      targetDefenseType: null,
      targetEffectsOnCritical: [],
      flags: {},
      breakdown: []
    };

    for (const option of active) {
      const value = option.control === "passive" ? 1 : option.selectedValue;
      const flagActive = option.control === "flag"
        ? Boolean(options?.combatOptions?.[option.id] ?? options?.attackOptions?.[option.id])
        : true;
      if (option.control === "flag" && !flagActive) continue;
      if (option.control !== "flag" && option.control !== "passive" && value <= 0) continue;

      let attack = 0;
      if (Number.isFinite(Number(option.attackModifier))) attack += Number(option.attackModifier) * value;
      if (option.attackModifierFormula === "-value") attack -= value;
      if (option.attackModifierFormula === "heroicLevel") attack += actorLevel(actor) * value;
      if (option.attackModifierFormula === "halfLevel") attack += Math.floor(actorLevel(actor) / 2) * value;
      if (typeof option.attackModifierFormula === "string" && option.attackModifierFormula.startsWith("context.")) {
        const key = option.attackModifierFormula.slice("context.".length);
        const contextValue = Number(options?.[key] ?? options?.combatOptions?.[key] ?? options?.attackOptions?.[key] ?? 0);
        if (Number.isFinite(contextValue)) {
          const max = Number(option.maxContextValue ?? option.max ?? contextValue);
          const multiplier = Number(option.contextMultiplier ?? 1);
          attack += Math.max(0, Math.min(contextValue, Number.isFinite(max) ? max : contextValue)) * multiplier;
        }
      }
      attack += getRangePenaltyAdjustment(option, options);
      if (option.attackAbilityBonus) {
        const abilityRule = option.attackAbilityBonus;
        const ability = String(abilityRule.ability ?? abilityRule.key ?? 'str').toLowerCase().slice(0, 3);
        const multiplier = Number(abilityRule.multiplier ?? 1) || 1;
        const minimum = Number(abilityRule.minimum ?? 0) || 0;
        const abilityValue = Math.max(minimum, actorAbilityMod(actor, ability) * multiplier);
        if (Number.isFinite(abilityValue) && abilityValue !== 0) attack += abilityValue * value;
      }

      if (attack) {
        result.attackBonus += attack;
        result.breakdown.push({ label: option.label, value: attack, type: "attack" });
      }

      let damage = 0;
      if (Number.isFinite(Number(option.damageModifier))) damage += Number(option.damageModifier) * value;
      if (option.damageModifierFormula === "value") damage += value;
      if (option.damageModifierFormula === "halfLevel") damage += Math.floor(actorLevel(actor) / 2) * value;
      if (option.damageModifierFormula === "halfLevelMinusOne") damage += Math.max(0, Math.floor(actorLevel(actor) / 2) - 1) * value;
      if (["level", "classLevel", "characterLevel", "heroicLevel", "actorLevel"].includes(option.damageModifierFormula)) damage += actorLevel(actor) * value;
      if (typeof option.damageModifierFormula === "string" && option.damageModifierFormula.startsWith("context.")) {
        const key = option.damageModifierFormula.slice("context.".length);
        const contextValue = Number(options?.[key] ?? options?.combatOptions?.[key] ?? options?.attackOptions?.[key] ?? 0);
        if (Number.isFinite(contextValue)) damage += contextValue * value;
      }
      if (option.damageAbilityBonus) {
        const abilityRule = option.damageAbilityBonus;
        const ability = String(abilityRule.ability ?? abilityRule.key ?? 'str').toLowerCase().slice(0, 3);
        const multiplier = Number(abilityRule.multiplier ?? 1) || 1;
        const minimum = Number(abilityRule.minimum ?? 0) || 0;
        const abilityValue = Math.max(minimum, actorAbilityMod(actor, ability) * multiplier);
        if (Number.isFinite(abilityValue) && abilityValue !== 0) damage += abilityValue * value;
      }
      if (damage) {
        result.damageBonus += damage;
        result.breakdown.push({ label: option.label, value: damage, type: "damage" });
      }

      const extraWeaponDice = Number(option.damageExtraWeaponDice ?? option.damageDiceStepBonus ?? 0) * value;
      if (extraWeaponDice) {
        result.damageExtraWeaponDice += extraWeaponDice;
        result.damageDiceStepBonus += extraWeaponDice;
        result.breakdown.push({ label: `${option.label} extra weapon dice`, value: extraWeaponDice, type: "damageExtraWeaponDice" });
      }

      const ammunitionCost = Number(option.ammunitionCost ?? option.ammoCost ?? 0) * value;
      if (Number.isFinite(ammunitionCost) && ammunitionCost > 0) {
        result.ammunitionCost += ammunitionCost;
        result.breakdown.push({ label: `${option.label} ammunition`, value: ammunitionCost, type: "ammunitionCost" });
      }

      if (option.defenseModifier && value > 0) {
        const defenseValue = Number(option.defenseModifier.value ?? value);
        const defense = { ...option.defenseModifier, value: Number.isFinite(defenseValue) ? defenseValue : value };
        result.defenseModifiers.push(defense);
        result.breakdown.push({ label: `${option.label} ${defense.target ?? "defense"}`, value, type: "defense" });
      }

      if (Array.isArray(option.targetEffectsOnHit) && value > 0) {
        for (const effect of option.targetEffectsOnHit) {
          const resolved = { ...effect, sourceOption: option.id, sourceName: option.label };
          if (typeof resolved.valueFormula === "string" && resolved.valueFormula === "selectedValue") resolved.value = value;
          if (typeof resolved.valueFormula === "string" && resolved.valueFormula === "negativeSelectedValue") resolved.value = -Math.abs(value);
          result.targetEffectsOnHit.push(resolved);
        }
      }

      const criticalThreshold = Number(option.criticalThreatNaturalMin ?? option.criticalThreatMin ?? 0);
      if (Number.isFinite(criticalThreshold) && criticalThreshold > 1) {
        result.criticalThreatNaturalMin = result.criticalThreatNaturalMin
          ? Math.min(result.criticalThreatNaturalMin, criticalThreshold)
          : criticalThreshold;
        result.breakdown.push({ label: `${option.label} critical threshold`, value: criticalThreshold, type: "criticalThreatNaturalMin" });
      }

      const criticalMultiplierMin = Number(option.criticalMultiplierMin ?? option.critMultiplierMin ?? 0);
      if (Number.isFinite(criticalMultiplierMin) && criticalMultiplierMin > 0) {
        result.criticalMultiplierMin = Math.max(result.criticalMultiplierMin || 0, criticalMultiplierMin);
      }

      const criticalDamageStep = Number(option.criticalDamageDieStepBonus ?? 0) * value;
      if (Number.isFinite(criticalDamageStep) && criticalDamageStep !== 0) {
        result.criticalDamageDieStepBonus += criticalDamageStep;
      }

      if (Array.isArray(option.targetEffectsOnCritical)) {
        result.targetEffectsOnCritical.push(...option.targetEffectsOnCritical.map(effect => ({ ...effect, sourceOption: option.id, sourceName: option.label })));
      }

      if (option.targetDefenseType) {
        result.targetDefenseType = String(option.targetDefenseType).toLowerCase();
      }

      if (option.suppressDamageAbilityAndLevel === true || option.damageMode === "baseOnly") {
        result.flags.damageBaseOnly = true;
        result.breakdown.push({ label: `${option.label} base damage only`, value: 0, type: "damageMode" });
      }

      if (Array.isArray(option.suppresses)) {
        for (const suppressed of option.suppresses) result.flags[`suppresses.${suppressed}`] = true;
      }
      if (option.control === "flag") result.flags[option.id] = true;
    }

    const ruleModifiers = collectWeaponRuleModifiers(actor, weapon, options);
    result.attackBonus += ruleModifiers.attackBonus || 0;
    result.attackAbilityBonus += ruleModifiers.attackAbilityBonus || 0;
    result.damageBonus += ruleModifiers.damageBonus || 0;
    result.damageExtraWeaponDice += ruleModifiers.damageExtraWeaponDice || 0;
    result.damageDiceStepBonus += ruleModifiers.damageDiceStepBonus || 0;
    result.damageDieStepIncreases += ruleModifiers.damageDieStepIncreases || 0;
    result.criticalDamageDieStepBonus += ruleModifiers.criticalDamageDieStepBonus || 0;
    if (ruleModifiers.criticalThreatNaturalMin) {
      result.criticalThreatNaturalMin = result.criticalThreatNaturalMin
        ? Math.min(result.criticalThreatNaturalMin, ruleModifiers.criticalThreatNaturalMin)
        : ruleModifiers.criticalThreatNaturalMin;
    }
    result.criticalMultiplierMin = Math.max(result.criticalMultiplierMin || 0, ruleModifiers.criticalMultiplierMin || 0) || null;
    result.targetEffectsOnHit.push(...(ruleModifiers.targetEffectsOnHit || []));
    result.targetEffectsOnCritical.push(...(ruleModifiers.targetEffectsOnCritical || []));
    result.breakdown.push(...(ruleModifiers.breakdown || []));
    Object.assign(result.flags, ruleModifiers.flags || {});
    // Combined-feat modifiers (cross-feat awareness; not encodable on a single item).
    const combinedMods = collectCombinedFeatModifiers(actor, weapon, options);
    const alreadySubstituted = Number(result.flags._attackAbilitySubstitutionValue || 0);
    const combinedDelta = combinedMods.attackAbilityBonus || 0;
    if (combinedDelta > alreadySubstituted) {
      result.attackAbilityBonus += combinedDelta - alreadySubstituted;
      result.breakdown.push(...(combinedMods.breakdown || []));
      Object.assign(result.flags, combinedMods.flags || {});
    }

    return result;
  }
}

export default CombatOptionResolver;

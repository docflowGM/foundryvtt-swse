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
    system.traits?.join?.(" "),
    system.properties?.join?.(" ")
  ];
  return fields.map(value => normalizeKey(value)).filter(Boolean).join(" ");
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

function isUnarmedWeapon(weapon, context = {}) {
  if (context.unarmed === true || context.attackFamily === "unarmed") return true;
  const text = weaponText(weapon);
  return text.includes("unarmed") || text.includes("natural-weapon") || normalizeKey(weapon?.name).includes("unarmed");
}

function collectWeaponRuleModifiers(actor, weapon, context = {}) {
  const result = {
    damageBonus: 0,
    damageExtraWeaponDice: 0,
    damageDiceStepBonus: 0,
    damageDieStepIncreases: 0,
    flags: {},
    breakdown: []
  };

  for (const item of actorItems(actor)) {
    const rules = item?.system?.abilityMeta?.rules;
    if (!Array.isArray(rules)) continue;
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
          const value = Number(rule.value ?? rule.steps ?? rule.params?.steps ?? 0);
          if (!Number.isFinite(value) || value === 0) continue;
          result.damageDieStepIncreases += value;
          result.breakdown.push({ label: item.name, value, type: "damageDieStepIncrease" });
          break;
        }
        case "UNARMED_DOES_NOT_PROVOKE_AOO": {
          if (!isUnarmedWeapon(weapon, context)) continue;
          result.flags.unarmedDoesNotProvokeAoO = true;
          break;
        }
        default:
          break;
      }
    }
  }

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

function optionAllowedForWeapon(option, weapon, context = {}) {
  const attackType = getAttackType(weapon, context);
  if (option.requiresAttackType && option.requiresAttackType !== "any" && attackType !== "unknown" && attackType !== option.requiresAttackType) {
    return false;
  }

  if (option.requiresManeuver && contextManeuver(context) !== normalizeKey(option.requiresManeuver)) {
    return false;
  }

  if (option.requiresAutofire && !weaponSupportsAutofire(weapon, context)) {
    return false;
  }

  if (option.requiresWeaponGroups && !weaponMatchesGroup(weapon, option.requiresWeaponGroups, context)) {
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
        if (!optionAllowedForWeapon(option, weapon, context)) continue;
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
      damageBonus: 0,
      damageDiceStepBonus: 0,
      damageExtraWeaponDice: 0,
      damageDieStepIncreases: 0,
      defenseModifiers: [],
      flags: {},
      breakdown: []
    };

    for (const option of active) {
      const value = option.control === "passive" ? 1 : option.selectedValue;
      if (option.control !== "flag" && option.control !== "passive" && value <= 0) continue;

      let attack = 0;
      if (Number.isFinite(Number(option.attackModifier))) attack += Number(option.attackModifier) * value;
      if (option.attackModifierFormula === "-value") attack -= value;
      attack += getRangePenaltyAdjustment(option, options);
      if (attack) {
        result.attackBonus += attack;
        result.breakdown.push({ label: option.label, value: attack, type: "attack" });
      }

      let damage = 0;
      if (Number.isFinite(Number(option.damageModifier))) damage += Number(option.damageModifier) * value;
      if (option.damageModifierFormula === "value") damage += value;
      if (option.damageModifierFormula === "halfLevel") damage += Math.floor(actorLevel(actor) / 2) * value;
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

      if (option.defenseModifier && value > 0) {
        const defenseValue = Number(option.defenseModifier.value ?? value);
        const defense = { ...option.defenseModifier, value: Number.isFinite(defenseValue) ? defenseValue : value };
        result.defenseModifiers.push(defense);
        result.breakdown.push({ label: `${option.label} ${defense.target ?? "defense"}`, value, type: "defense" });
      }

      if (Array.isArray(option.suppresses)) {
        for (const suppressed of option.suppresses) result.flags[`suppresses.${suppressed}`] = true;
      }
      if (option.control === "flag") result.flags[option.id] = true;
    }

    const ruleModifiers = collectWeaponRuleModifiers(actor, weapon, options);
    result.damageBonus += ruleModifiers.damageBonus || 0;
    result.damageExtraWeaponDice += ruleModifiers.damageExtraWeaponDice || 0;
    result.damageDiceStepBonus += ruleModifiers.damageDiceStepBonus || 0;
    result.damageDieStepIncreases += ruleModifiers.damageDieStepIncreases || 0;
    result.breakdown.push(...(ruleModifiers.breakdown || []));
    Object.assign(result.flags, ruleModifiers.flags || {});

    return result;
  }
}

export default CombatOptionResolver;

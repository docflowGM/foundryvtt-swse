/**
 * Combat Context Serializer
 *
 * Phase 1E transport helper. Keeps the workflow context lightweight and safe
 * enough to store in chat flags/data attributes so later damage/state workflows
 * do not have to reconstruct attack intent from scraps.
 */

function asBool(value) {
  return value === true;
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function idOf(doc) {
  return doc?.id ?? doc?._id ?? null;
}

function nameOf(doc) {
  return doc?.name ?? null;
}

function compact(value) {
  if (value === null || value === undefined || value === '') return undefined;
  return value;
}

function pruneObject(value) {
  if (Array.isArray(value)) {
    const arr = value.map(pruneObject).filter(v => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const cleaned = pruneObject(child);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return compact(value);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function uniqueStrings(values = []) {
  return [...new Set(asArray(values).map(value => String(value ?? '').trim()).filter(Boolean))];
}

// Damage SSOT correction (independent review of 4d05a80/1b93e1a,
// "Blocker 1 — attack-option selections are not transported to the later
// Damage roll"): the attack dialog's actual ATTACK_OPTION selection map
// (Deadeye/Burst Fire/Mighty Swing/Rapid Shot/Rapid Strike toggles, Power
// Attack's slider value, ...) was never captured by this serializer at
// all -- only a fixed, hand-enumerated set of high-level booleans (Aim/
// Charge/Autofire/...) was. CombatOptionResolver.collectAttackModifiers()
// needs the ORIGINAL selection map (context.combatOptions[id] /
// context.attackOptions[id]) to know an owned, gate-satisfied option was
// actually toggled on, not merely available -- losing this map between
// the attack roll and a later chat-card-driven Damage roll meant every
// toggle/slider option's damage contribution (Deadeye's extra die, Rapid
// Shot's, Mighty Swing's, Power Attack's slider damage, ...) silently
// evaluated to zero on that path, even after resolveDamageComposition()/
// buildDamageFormula() correctly started reading the fields those options
// populate. combatOptions and attackOptions are treated as one interchangeable
// selection universe by CombatOptionResolver itself (selectedValue() reads
// `options.combatOptions ?? options.attackOptions`), so this serializer merges
// both into one canonical, losslessly round-tripped map instead of tracking two.
// Addendum ("ATTACK-OPTION ACTIVATION CONTEXT MUST SURVIVE LOSSLESSLY"):
// the option snapshot must be plain, workflow-safe primitive data only —
// boolean (toggle/flag controls), finite number (slider controls like
// Power Attack's 0-5 value), or string (for any control that genuinely
// uses one). An object/function/Foundry-document reference is silently
// dropped rather than serialized, so a caller accidentally passing a live
// reference through options.combatOptions can never leak an unsafe value
// into transport-safe (JSON-encodable) workflow context.
function isSerializableOptionValue(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return true;
  return false;
}

function mergeSelectedOptions(...sources) {
  const merged = {};
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const [key, value] of Object.entries(source)) {
      // Inactive/absent entries (false, undefined, null, '') may be
      // omitted — the addendum's own explicit allowance — but every
      // active/value-bearing selection (true, a nonzero or zero slider
      // number, a nonempty string) must survive.
      if (value === undefined || value === null || value === '' || value === false) continue;
      if (!isSerializableOptionValue(value)) continue;
      merged[key] = value;
    }
  }
  return merged;
}

function summarizeRuleData(context = {}, action = {}, extra = {}) {
  const ruleData = {
    ...(context?.ruleData ?? {}),
    ...(action?.ruleData ?? {}),
    ...(extra?.ruleData ?? {})
  };
  return pruneObject(ruleData) ?? {};
}

function summarizeDamageContext(context = {}, extra = {}) {
  const damage = context?.damage ?? {};
  return pruneObject({
    crit: asBool(extra.isCritical ?? damage.crit ?? context.isCritical),
    hit: extra.hit ?? damage.hit ?? context.hit ?? null,
    natural1: asBool(extra.natural1 ?? damage.natural1),
    natural20: asBool(extra.natural20 ?? damage.natural20),
    areaHitState: extra.areaHitState ?? damage.areaHitState ?? null,
    critMultiplier: asNumber(extra.critMultiplier ?? context.critMultiplier ?? damage.critMultiplier, 2),
    damageType: extra.damageType ?? context.damageType ?? damage.damageType ?? null,
    damageTypes: uniqueStrings([
      ...asArray(extra.damageTypes),
      ...asArray(context.damageTypes),
      ...asArray(damage.damageTypes),
      ...asArray(extra.damageType ?? context.damageType ?? damage.damageType)
    ]),
    damageComponents: Array.isArray(extra.damageComponents)
      ? extra.damageComponents
      : Array.isArray(context.damageComponents)
        ? context.damageComponents
        : Array.isArray(damage.damageComponents)
          ? damage.damageComponents
          : Array.isArray(damage.components)
            ? damage.components
            : [],
    packets: Array.isArray(damage.packets) ? damage.packets : []
  }) ?? {};
}

export function summarizeCombatWorkflowContext(context = null, extra = {}) {
  if (!context) return null;

  // Already summarized/transport-safe contexts should still be normalized so
  // old chat buttons and new buttons use the same shape.
  const action = context.action ?? {};
  const attack = context.attack ?? {};
  const resources = context.resources ?? {};
  const economy = context.economy ?? {};
  const ruleData = summarizeRuleData(context, action, extra);
  const target = extra.target ?? context.target ?? null;
  const actor = extra.actor ?? context.actor ?? context.sourceActor ?? null;
  const weapon = extra.weapon ?? context.weapon ?? null;
  const contextTags = uniqueStrings([
    ...asArray(context.contextTags),
    ...asArray(action.contextTags),
    ...asArray(extra.contextTags),
    ...(extra.isArea ?? attack.isArea ?? context.isAreaAttack ?? context.areaAttack ?? ruleData.areaAttack ? ['areaAttack'] : []),
    ...(extra.isAutofire ?? attack.isAutofire ?? context.autofire ? ['autofire'] : []),
    ...(extra.isBurstFire ?? attack.isBurstFire ?? context.burstFire ? ['burstFire'] : []),
    ...(extra.damageMode === 'stun' || context.damageMode === 'stun' || ruleData.damageMode === 'stun' ? ['stun'] : []),
    ...(extra.ion === true || context.ion === true || ruleData.ion === true ? ['ion'] : [])
  ]);

  const summary = {
    schema: 'swse.combat.workflow.v1',
    workflowId: extra.workflowId ?? context.workflowId ?? action.workflowId ?? null,
    actionId: extra.actionId ?? action.id ?? context.actionId ?? null,
    actionName: extra.actionName ?? action.name ?? context.actionName ?? null,
    resolutionMode: extra.resolutionMode ?? action.resolutionMode ?? context.resolutionMode ?? null,
    actionType: extra.actionType ?? action.actionType ?? context.actionType ?? null,
    automationBoundary: extra.automationBoundary ?? context.automationBoundary ?? action.automationBoundary ?? null,
    contextTags,
    actorId: extra.actorId ?? idOf(actor) ?? context.actorId ?? null,
    actorName: extra.actorName ?? nameOf(actor) ?? context.actorName ?? null,
    weaponId: extra.weaponId ?? idOf(weapon) ?? context.weaponId ?? null,
    weaponName: extra.weaponName ?? nameOf(weapon) ?? context.weaponName ?? null,
    targetId: extra.targetId ?? idOf(target) ?? context.targetId ?? null,
    targetName: extra.targetName ?? nameOf(target) ?? context.targetName ?? null,
    attack: {
      mode: extra.attackMode ?? attack.mode ?? context.attackMode ?? null,
      isArea: asBool(extra.isArea ?? attack.isArea ?? context.isAreaAttack ?? context.areaAttack),
      isAutofire: asBool(extra.isAutofire ?? attack.isAutofire ?? context.autofire),
      isBurstFire: asBool(extra.isBurstFire ?? attack.isBurstFire ?? context.burstFire),
      isAiming: asBool(extra.isAiming ?? attack.isAiming ?? context.aim ?? context.aiming),
      isCharging: asBool(extra.isCharging ?? attack.isCharging ?? context.charge ?? context.charging),
      isFiringIntoMelee: asBool(extra.isFiringIntoMelee ?? attack.isFiringIntoMelee ?? context.firingIntoMelee),
      damageMode: extra.damageMode ?? attack.damageMode ?? context.damageMode ?? ruleData.damageMode ?? null,
      isStun: asBool(extra.isStun ?? attack.isStun ?? context.stun ?? ruleData.stun ?? ruleData.damageMode === 'stun'),
      isIon: asBool(extra.isIon ?? attack.isIon ?? context.ion ?? ruleData.ion),
      maneuver: extra.maneuver ?? attack.maneuver ?? context.maneuver ?? null,
      rangeBand: extra.rangeBand ?? attack.rangeBand ?? context.rangeBand ?? context.range ?? null,
      defense: extra.defense ?? attack.defense ?? context.defense ?? null,
      // Round-trips whatever the attack roll actually had selected —
      // already-summarized input (attack.selectedOptions) is preserved
      // across a re-summarize pass, and fresh input (context/extra's own
      // combatOptions/attackOptions) is captured the first time.
      selectedOptions: mergeSelectedOptions(
        attack.selectedOptions,
        context.combatOptions, context.attackOptions,
        extra.combatOptions, extra.attackOptions
      )
    },
    damage: summarizeDamageContext(context, extra),
    resources: {
      ammoCost: asNumber(extra.ammoCost ?? resources.ammoCost ?? context.ammoCost, 0),
      enforceAmmo: asBool(extra.enforceAmmo ?? resources.enforceAmmo ?? context.enforceAmmo),
      reloadAvailable: asBool(extra.reloadAvailable ?? resources.reloadAvailable ?? context.reloadAvailable)
    },
    economy: {
      spendAction: (extra.spendAction ?? economy.spendAction ?? context.spendAction) !== false,
      spent: asBool(extra.economySpent ?? economy.spent ?? context.economySpent)
    },
    ruleData,
    flags: Array.isArray(extra.flags ?? context.flags ?? context.contextFlags)
      ? [...(extra.flags ?? context.flags ?? context.contextFlags)].map(String)
      : []
  };

  return pruneObject(summary) ?? null;
}

export function encodeCombatWorkflowContext(context = null, extra = {}) {
  const summary = summarizeCombatWorkflowContext(context, extra);
  if (!summary) return '';
  try {
    return encodeURIComponent(JSON.stringify(summary));
  } catch (_err) {
    return '';
  }
}

export function decodeCombatWorkflowContext(value = '') {
  if (!value) return null;
  if (typeof value === 'object') return summarizeCombatWorkflowContext(value);
  try {
    return summarizeCombatWorkflowContext(JSON.parse(decodeURIComponent(String(value))));
  } catch (_err) {
    try {
      return summarizeCombatWorkflowContext(JSON.parse(String(value)));
    } catch (_err2) {
      return null;
    }
  }
}

export function mergeCombatWorkflowContextIntoRollOptions(options = {}, context = null) {
  const workflowContext = summarizeCombatWorkflowContext(context ?? options.combatContext ?? options.workflowContext ?? null);
  if (!workflowContext) return { ...options };

  const attack = workflowContext.attack ?? {};
  const damage = workflowContext.damage ?? {};
  const resources = workflowContext.resources ?? {};

  return {
    ...options,
    combatContext: workflowContext,
    workflowContext,
    actionId: options.actionId ?? workflowContext.actionId ?? null,
    workflowId: options.workflowId ?? workflowContext.workflowId ?? null,
    contextTags: options.contextTags ?? workflowContext.contextTags ?? [],
    ruleData: options.ruleData ?? workflowContext.ruleData ?? {},
    attackMode: options.attackMode ?? attack.mode ?? null,
    aim: options.aim ?? attack.isAiming === true,
    charge: options.charge ?? attack.isCharging === true,
    autofire: options.autofire ?? attack.isAutofire === true,
    burstFire: options.burstFire ?? attack.isBurstFire === true,
    areaAttack: options.areaAttack ?? attack.isArea === true,
    isAreaAttack: options.isAreaAttack ?? attack.isArea === true,
    firingIntoMelee: options.firingIntoMelee ?? attack.isFiringIntoMelee === true,
    maneuver: options.maneuver ?? attack.maneuver ?? null,
    rangeBand: options.rangeBand ?? attack.rangeBand ?? null,
    defense: options.defense ?? attack.defense ?? null,
    // Blocker 1 fix: restore the attack roll's actual option-selection map
    // so CombatOptionResolver.collectAttackModifiers() sees the SAME
    // selections at Damage time as it did at Attack time — a caller-
    // supplied options.combatOptions/attackOptions (e.g. the sheet's own
    // fresh Damage-roll dialog submission) always wins over the carried
    // value, never silently overridden by stale attack-time state.
    combatOptions: options.combatOptions ?? attack.selectedOptions ?? {},
    attackOptions: options.attackOptions ?? attack.selectedOptions ?? {},
    damageMode: options.damageMode ?? attack.damageMode ?? null,
    stun: options.stun ?? attack.isStun === true,
    ion: options.ion ?? attack.isIon === true,
    damageType: options.damageType ?? damage.damageType ?? undefined,
    damageTypes: options.damageTypes ?? damage.damageTypes ?? [],
    damageComponents: options.damageComponents ?? damage.damageComponents ?? [],
    isCritical: options.isCritical ?? damage.crit === true,
    critMultiplier: options.critMultiplier ?? damage.critMultiplier ?? undefined,
    ammoCost: options.ammoCost ?? resources.ammoCost ?? 0,
    enforceAmmo: options.enforceAmmo ?? resources.enforceAmmo === true
  };
}

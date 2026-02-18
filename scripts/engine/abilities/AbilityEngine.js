/**
 * AbilityEngine
 * Phase 2: forceModifier support + selectors (NO resolution logic)
 * Single source of truth for ability data.
 * AppV2-safe, sync, deterministic.
 */

import { AbilityTags } from "./ability-tags.js";
import { AbilityUsage } from "./ability-usage.js";
import { AbilityRegistry } from "./ability-registry.js";
import { AbilityModelValidator } from "../../dev/ability-model-validator.js";
import { getFeatAbilitiesForActor } from "./feat-ability-module.js";
import { getTalentAbilitiesForActor } from "./talent-ability-module.js";
import { getForcePowerAbilitiesForActor } from "./forcePower-ability-module.js";
import { getSpeciesAbilitiesForActor } from "./species-ability-module.js";
import { getForceModifierAbilitiesForActor } from "./force-modifier-module.js";
import { getActionAbilitiesForActor } from "./action-ability-module.js";

export const ABILITY_TYPES = Object.freeze([
  "talent",
  "feat",
  "forcePower",
  "forceModifier",
  "starshipManeuver",
  "action", // NEW: unified action schema (combat/skill/ship/force/environmental)
]);

const FORCE_MOD_HOOKS = new Set(["powerUse", "encounterEnd", "roundStart", null]);

export class AbilityEngine {
  /**
   * Sync, AppV2-safe.
   * @param {Actor} actor
   * @param {{pendingData?: object}} [opts]
   */
  static getCardPanelModelForActor(actor, opts = {}) {
    const abilities = this.getAbilitiesForActor(actor, opts);
    const all = abilities.map((a) => this._normalizeAbility(actor, a));

    const panel = {
      all,
      meta: {
        headerLabel: "Abilities",
      },
    };

    if (this._isDev()) AbilityModelValidator.validatePanelModel(panel);
    return panel;
  }

  static getAbilitiesForActor(actor, opts = {}) {
    if (!actor) return [];
    const out = [];

    out.push(...getFeatAbilitiesForActor(actor, opts));
    out.push(...getTalentAbilitiesForActor(actor, opts));
    out.push(...getForcePowerAbilitiesForActor(actor, opts));
    out.push(...getSpeciesAbilitiesForActor(actor, opts));
    out.push(...getForceModifierAbilitiesForActor(actor, opts));
    out.push(...getActionAbilitiesForActor(actor, opts)); // NEW: Actions

    return out;
  }

  static getCanonicalTagsForActor(actor, opts = {}) {
    const panel = this.getCardPanelModelForActor(actor, opts);
    const tags = new Set();
    for (const a of panel.all) {
      for (const t of a.tags ?? []) tags.add(String(t));
    }
    return tags;
  }

  /* ============= Action Selectors (Pure, Non-Mutating) ============= */

  /**
   * Get all action abilities for actor.
   * @param {Actor} actor
   * @param {{pendingData?: object}} [opts]
   * @returns {Array} Normalized action abilities
   */
  static getActions(actor, opts = {}) {
    return this.getAbilitiesForActor(actor, opts)
      .map((a) => this._normalizeAbility(actor, a))
      .filter((a) => a.type === "action");
  }

  /**
   * Get actions filtered by subtype.
   * @param {Actor} actor
   * @param {string} subtype One of: "skill", "ship", "combat", "force", "environmental"
   * @param {{pendingData?: object}} [opts]
   * @returns {Array}
   */
  static getActionsBySubtype(actor, subtype, opts = {}) {
    return this.getActions(actor, opts)
      .filter((a) => a.subtype === subtype);
  }

  /**
   * Get ship actions filtered by crew position.
   * @param {Actor} actor
   * @param {string} crewPosition e.g., "pilot", "gunner", "navigator"
   * @param {{pendingData?: object}} [opts]
   * @returns {Array}
   */
  static getActionsByCrewPosition(actor, crewPosition, opts = {}) {
    return this.getActions(actor, opts)
      .filter((a) => a.crewPosition === crewPosition);
  }

  /**
   * Get actions filtered by action.type (action economy).
   * @param {Actor} actor
   * @param {string} actionType One of: "standard", "move", "swift", "full-round", "reaction", "free", "varies"
   * @param {{pendingData?: object}} [opts]
   * @returns {Array}
   */
  static getActionsByActionType(actor, actionType, opts = {}) {
    return this.getActions(actor, opts)
      .filter((a) => a.action?.type === actionType);
  }

  /**
   * Get starship maneuvers.
   * @param {Actor} actor
   * @param {{pendingData?: object}} [opts]
   * @returns {Array} Normalized shipManeuver actions
   */
  static getShipManeuvers(actor, opts = {}) {
    return this.getActionsBySubtype(actor, "shipManeuver", opts);
  }

  /**
   * Get starship maneuvers by descriptor.
   * @param {Actor} actor
   * @param {string} descriptor One of: "Attack Pattern", "Dogfight", "Force", "Gunner"
   * @param {{pendingData?: object}} [opts]
   * @returns {Array}
   */
  static getShipManeuversByDescriptor(actor, descriptor, opts = {}) {
    return this.getShipManeuvers(actor, opts)
      .filter((m) => m.maneuver?.descriptors?.includes(descriptor));
  }

  /**
   * Get starship maneuvers for a specific crew position.
   * @param {Actor} actor
   * @param {string} crewPosition e.g., "pilot", "gunner", "navigator"
   * @param {{pendingData?: object}} [opts]
   * @returns {Array}
   */
  static getShipManeuversForCrewPosition(actor, crewPosition, opts = {}) {
    return this.getShipManeuvers(actor, opts)
      .filter((m) => !m.crewPosition || m.crewPosition === crewPosition);
  }

  /* ============= Force Modifiers Selectors ============= */

  static getForceModifiers(actor, opts = {}) {
    return this.getAbilitiesForActor(actor, opts)
      .map((a) => this._normalizeAbility(actor, a))
      .filter((a) => a.type === "forceModifier");
  }

  static getForceModifiersByHook(actor, hookType, opts = {}) {
    const hook = hookType ?? null;
    return this.getForceModifiers(actor, opts).filter((a) => a.hookType === hook);
  }

  static getForceModifiersForPower(actor, powerData, opts = {}) {
    const powerId = powerData?.id ?? powerData?._id ?? null;
    const categoryId = powerData?.categoryId ?? powerData?.system?.categoryId ?? null;

    return this.getForceModifiersByHook(actor, "powerUse", opts).filter((m) => {
      const scope = m.scope;
      if (!scope?.appliesTo) return false;

      if (scope.appliesTo === "allForcePowers") return this._passesFilter(scope.filter, powerData);
      if (scope.appliesTo === "specificPower") return scope.powerId && scope.powerId === powerId && this._passesFilter(scope.filter, powerData);
      if (scope.appliesTo === "powerCategory") return scope.categoryId && scope.categoryId === categoryId && this._passesFilter(scope.filter, powerData);
      return false;
    });
  }

  /* ============= Normalization ============= */

  static _normalizeAbility(actor, raw) {
    const base = {
      id: raw?.id ?? raw?._id ?? foundry.utils.randomID(),
      name: raw?.name ?? "Unnamed Ability",
      type: raw?.type ?? "talent",
      icon: raw?.icon ?? "icons/svg/book.svg",
      tags: AbilityTags.canonicalize(raw?.tags ?? []),
      source: raw?.source ?? null,
      actionEconomy: raw?.actionEconomy ?? null, // "free"|"standard"|"reaction"|"fullRound"|...
      rollData: raw?.rollData ?? null,
      usesData: raw?.usesData ?? null,
      description: raw?.description ?? "",
    };

    // Usage (single authority)
    const usage = AbilityUsage.getStateSync(actor, base.id);
    base.usage = usage;

    if (base.type === "forceModifier") {
      return this._normalizeForceModifier(base, raw);
    }

    if (base.type === "action") {
      const normalized = this._normalizeAction(base, raw);

      // Special handling for shipManeuver subtype
      if (normalized.subtype === "shipManeuver") {
        return this._normalizeShipManeuver(normalized, raw);
      }

      return normalized;
    }

    return base;
  }

  static _normalizeForceModifier(base, raw) {
    const subtype = raw?.subtype ?? "secret";
    const hookType = raw?.hookType ?? null;

    const activation = raw?.activation ?? null;
    const scope = raw?.scope ?? null;
    const modifierRules = Array.isArray(raw?.modifierRules) ? raw.modifierRules : [];
    const resolution = raw?.resolution ?? { engine: "force" };

    const out = {
      ...base,
      type: "forceModifier",
      subtype,
      hookType: FORCE_MOD_HOOKS.has(hookType) ? hookType : null,
      activation: activation ? this._normalizeActivation(activation) : null,
      scope: scope ? this._normalizeScope(scope) : null,
      modifierRules,
      resolution: { engine: resolution?.engine ?? "force" },
    };

    // Dev-only warnings
    if (this._isDev()) {
      if (!out.hookType) console.warn("SWSE | forceModifier missing hookType", out);
      if (out.hookType === "powerUse" && !out.scope) console.warn("SWSE | forceModifier powerUse missing scope", out);
      if (!out.modifierRules?.length) console.warn("SWSE | forceModifier has empty modifierRules", out);

      const costKeys = new Set((out.activation?.costOptions ?? []).map((c) => c?.conditionKey).filter(Boolean));
      if (costKeys.size) {
        const used = new Set((out.modifierRules ?? []).map((r) => r?.costCondition).filter(Boolean));
        for (const k of costKeys) if (!used.has(k)) console.warn("SWSE | costOptions.conditionKey unused by modifierRules", { k, out });
      }

      if (out.hookType === "encounterEnd" && out.resolution?.engine !== "force") console.warn("SWSE | encounterEnd forceModifier resolution.engine != force", out);
    }

    return out;
  }

  static _normalizeActivation(a) {
    const optional = Boolean(a?.optional ?? false);
    const costOptions = Array.isArray(a?.costOptions) ? a.costOptions : [];
    return {
      optional,
      costOptions: costOptions.map((c) => ({
        resource: c?.resource === "destinyPoint" ? "destinyPoint" : "forcePoint",
        amount: Number.isFinite(c?.amount) ? c.amount : 1,
        conditionKey: c?.conditionKey ?? null,
      })),
    };
  }

  static _normalizeScope(s) {
    return {
      appliesTo: s?.appliesTo ?? "allForcePowers",
      powerId: s?.powerId ?? null,
      categoryId: s?.categoryId ?? null,
      filter: s?.filter ?? null,
    };
  }

  /* ============= Action Normalization ============= */

  static _normalizeAction(base, raw) {
    const VALID_SUBTYPES = ["skill", "ship", "combat", "force", "environmental"];
    const VALID_ACTION_TYPES = ["standard", "move", "swift", "full-round", "reaction", "free", "varies"];
    const VALID_ENGINES = ["combat", "vehicle", "skill", "force"];

    const subtype = VALID_SUBTYPES.includes(raw?.subtype) ? raw.subtype : "combat";
    const actionType = VALID_ACTION_TYPES.includes(raw?.action?.type) ? raw.action.type : "standard";
    const actionCost = raw?.action?.cost ?? null;

    // Related skills: ensure array of normalized objects
    const relatedSkills = Array.isArray(raw?.relatedSkills)
      ? raw.relatedSkills.map((s) => this._normalizeRelatedSkill(s))
      : [];

    // Resolve engine from subtype
    const engineFromSubtype =
      subtype === "ship" ? "vehicle" :
      subtype === "skill" ? "skill" :
      subtype === "combat" ? "combat" :
      subtype === "force" ? "force" :
      subtype === "environmental" ? "skill" :
      "combat";

    const engine = raw?.resolution?.engine
      ? (VALID_ENGINES.includes(raw.resolution.engine) ? raw.resolution.engine : engineFromSubtype)
      : engineFromSubtype;

    const out = {
      ...base,
      type: "action",
      subtype,
      action: {
        type: actionType,
        cost: actionCost,
      },
      crewPosition: raw?.crewPosition ?? null,
      relatedSkills,
      effect: raw?.effect ?? null,
      prerequisites: Array.isArray(raw?.prerequisites) ? raw.prerequisites : [],
      resolution: { engine },
    };

    // Dev-only validation
    if (this._isDev()) {
      if (!VALID_SUBTYPES.includes(subtype)) console.warn("SWSE | action invalid subtype", { subtype, out });
      if (!VALID_ACTION_TYPES.includes(actionType)) console.warn("SWSE | action invalid action.type", { actionType, out });
      if (!VALID_ENGINES.includes(engine)) console.warn("SWSE | action invalid resolution.engine", { engine, out });
    }

    return out;
  }

  static _normalizeRelatedSkill(s) {
    if (!s) return null;

    const VALID_DC_TYPES = ["flat", "opposed", "expression", "varies"];
    const dcType = VALID_DC_TYPES.includes(s?.dc?.type) ? s.dc.type : "flat";

    return {
      skill: s?.skill ?? "knowledge",
      dc: {
        type: dcType,
        value: s?.dc?.value ?? null,
      },
      when: s?.when ?? null,
      outcome: s?.outcome ?? null,
    };
  }

  /* ============= Starship Maneuver Normalization ============= */

  static _normalizeShipManeuver(base, raw) {
    const VALID_DESCRIPTORS = ["Attack Pattern", "Dogfight", "Force", "Gunner"];

    const maneuver = raw?.maneuver ?? {};

    // Descriptors (tagging)
    const descriptors = Array.isArray(maneuver?.descriptors)
      ? maneuver.descriptors.filter((d) => VALID_DESCRIPTORS.includes(d))
      : [];

    // Suite usage (regain logic for VehicleEngine)
    const suiteUsage = {
      spentOnUse: maneuver?.suiteUsage?.spentOnUse !== false,
      regain: {
        rest: maneuver?.suiteUsage?.regain?.rest !== false,
        natural20Pilot: maneuver?.suiteUsage?.regain?.natural20Pilot !== false,
        forcePoint: maneuver?.suiteUsage?.regain?.forcePoint !== false,
        uniqueAbility: maneuver?.suiteUsage?.regain?.uniqueAbility ?? false,
      },
    };

    // Pilot check (resolution metadata for VehicleEngine)
    const pilotCheck = maneuver?.pilotCheck ?? {};
    const scalingTiers = Array.isArray(pilotCheck?.scalingTiers)
      ? pilotCheck.scalingTiers.map((t) => ({
          minCheck: Number.isFinite(t?.minCheck) ? t.minCheck : 15,
          effect: t?.effect ?? "",
        }))
      : [];

    const normalizedPilotCheck = {
      dc: pilotCheck?.dc ?? null,
      opposed: Boolean(pilotCheck?.opposed),
      allOrNothing: Boolean(pilotCheck?.allOrNothing),
      scalingTiers,
    };

    // Restrictions (enforcement in VehicleEngine)
    const restrictions = maneuver?.restrictions ?? {};
    const normalizedRestrictions = {
      pilotOnly: Boolean(restrictions?.pilotOnly),
      starfightersOnly: Boolean(restrictions?.starfightersOnly),
      dogfightOnly: Boolean(restrictions?.dogfightOnly),
      forceSensitiveOnly: Boolean(restrictions?.forceSensitiveOnly),
    };

    // Tag normalization (filtering semantics)
    let tags = Array.isArray(raw?.tags) ? [...raw.tags] : [];

    // Ensure base tags present
    if (!tags.includes("ship")) tags.push("ship");
    if (!tags.includes("maneuver")) tags.push("maneuver");

    // Derive semantic tags from descriptors
    if (descriptors.includes("Attack Pattern") && !tags.includes("attack-pattern")) {
      tags.push("attack-pattern");
    }
    if (descriptors.includes("Dogfight") && !tags.includes("dogfight")) {
      tags.push("dogfight");
    }
    if (descriptors.includes("Force") && !tags.includes("force")) {
      tags.push("force");
    }

    // Canonicalize tags
    tags = AbilityTags.canonicalize(tags, base.action?.type ?? "passive");

    const out = {
      ...base,
      type: "action",
      subtype: "shipManeuver",
      tags,
      maneuver: {
        descriptors,
        suiteUsage,
        pilotCheck: normalizedPilotCheck,
        restrictions: normalizedRestrictions,
      },
    };

    // Dev-only validation
    if (this._isDev()) {
      if (!suiteUsage.spentOnUse) console.warn("SWSE | shipManeuver spentOnUse false (unusual)", { out });
      if (!suiteUsage.regain.rest) console.warn("SWSE | shipManeuver cannot regain on rest (unusual)", { out });
      if (scalingTiers.length === 0 && !normalizedPilotCheck.allOrNothing && normalizedPilotCheck.dc === null && !normalizedPilotCheck.opposed) {
        console.warn("SWSE | shipManeuver no pilotCheck conditions defined", { out });
      }
      // Validate role tags
      const ns = AbilityTags.getManeuverTagNamespaces();
      const roleTagsInAbility = tags.filter(t => ns.role.includes(t));
      if (roleTagsInAbility.length === 0) {
        console.warn("SWSE | shipManeuver has no role tag (pilot/gunner/etc)", { out });
      }
    }

    return out;
  }

  static _passesFilter(filter, powerData) {
    if (!filter) return true;
    // Keep simple: AND semantics on shallow keys.
    // No resolution logic; only boolean gating.
    for (const [k, v] of Object.entries(filter)) {
      const pv = foundry.utils.getProperty(powerData, k) ?? foundry.utils.getProperty(powerData?.system ?? {}, k);
      if (pv !== v) return false;
    }
    return true;
  }

  static _isDev() {
    return (
      game?.settings?.get?.("foundryvtt-swse", "devMode") === true ||
      game?.settings?.get?.("core", "devMode") === true
    );
  }
}

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

export const ABILITY_TYPES = Object.freeze([
  "talent",
  "feat",
  "forcePower",
  "forceModifier", // NEW
  "starshipManeuver",
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

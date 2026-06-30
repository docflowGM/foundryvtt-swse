/**
 * ImplantRules
 *
 * Small, rules-focused helper for Saga Edition implant side effects.
 *
 * Current scope intentionally covers only the global KOTOR-style implant
 * drawbacks and the Implant Training exception:
 * - an active implant imposes -2 Will Defense
 * - an active implant worsens downward Condition Track movement by 1 extra step
 * - Implant Training suppresses both drawbacks
 *
 * This module does not install implants, spend credits, run Cybernetic Surgery,
 * or treat generic cybernetic prostheses as implants unless they are explicitly
 * tagged/flagged as implants.
 */

import { ImplantEffectRules } from '/systems/foundryvtt-swse/scripts/engine/implants/ImplantEffectRules.js';

const SYSTEM_ID = 'foundryvtt-swse';

const IMPLANT_TAGS = new Set([
  'implant',
  'implants',
  'bio-implant',
  'bioimplant',
  'biotech-implant',
  'biotech_implant'
]);

const IMPLANT_TRAINING_SLUGS = new Set([
  'implant-training',
  'implant_training'
]);

export class ImplantRules {
  static getWillDefensePenalty(actor) {
    const genericImplantPenalty = this.hasActiveImplant(actor) && !this.hasImplantTraining(actor) ? -2 : 0;
    const specificImplantPenalty = ImplantEffectRules.getSpecificWillDefensePenalty(actor);
    // Avoid double-dipping when a specific implant has its own -2 Will penalty.
    // The harsher penalty wins; multiple specific penalties can still stack if
    // future source material explicitly requires it.
    return Math.min(genericImplantPenalty, specificImplantPenalty);
  }

  static shouldApplyExtraConditionStep(actor) {
    return this.hasActiveImplant(actor) && !this.hasImplantTraining(actor);
  }

  static getConditionTrackExtraStep(actor, direction = 0) {
    const numericDirection = Number(direction || 0);
    if (numericDirection <= 0) return 0;
    return this.shouldApplyExtraConditionStep(actor) ? 1 : 0;
  }

  static getImplantState(actor) {
    const activeImplants = this.getActiveImplantItems(actor);
    const actorFlagged = this._actorHasImplantFlag(actor);
    const hasImplant = activeImplants.length > 0 || actorFlagged;
    const hasTraining = this.hasImplantTraining(actor);

    return {
      hasImplant,
      hasImplantTraining: hasTraining,
      willPenalty: this.getWillDefensePenalty(actor),
      extraConditionStep: hasImplant && !hasTraining ? 1 : 0,
      source: activeImplants.length > 0 ? 'item' : actorFlagged ? 'actor-flag' : 'none',
      activeImplants: activeImplants.map(item => ({
        id: item.id ?? item._id ?? '',
        name: item.name ?? 'Unnamed Implant',
        type: item.type ?? 'equipment'
      })),
      effects: ImplantEffectRules.getEffectSummary(actor)
    };
  }

  static getActiveImplantItems(actor) {
    try {
      return Array.from(actor?.items ?? []).filter(item => this.isActiveImplantItem(item));
    } catch (_err) {
      return [];
    }
  }

  static isActiveImplantItem(item) {
    if (!item || item.type !== 'equipment') return false;
    if (!this.isImplantItem(item)) return false;

    const system = item.system ?? {};
    const usage = system.usage ?? {};

    const installedLike = system.installed === true
      || system.integrated === true
      || system.equipped === true
      || usage.installed === true
      || usage.integrated === true
      || usage.equipped === true;

    // New implant rows expose a distinct Active toggle. If that field exists,
    // require both installed/equipped/integrated state and Active=true. Older
    // equipment without the explicit field keeps the prior installed/equipped behavior.
    if (Object.prototype.hasOwnProperty.call(system, 'active') || Object.prototype.hasOwnProperty.call(usage, 'active')) {
      return installedLike && (system.active === true || usage.active === true);
    }

    if (installedLike) return true;

    // If the item explicitly opts into implant rules, assume it counts while owned.
    if (this._truthy(system?.implantRules?.activeByOwnership)) return true;

    return false;
  }

  static isImplantItem(item) {
    const system = item?.system ?? {};
    if (this._truthy(system?.implantRules?.countAsImplant)) return true;
    if (system?.implantRules?.countAsImplant === false) return false;

    const candidates = [
      system.equipmentType,
      system.equipmentBucket,
      system.category,
      system.itemRole,
      system.subType,
      system.kind,
      system.gearTemplate,
      system.gearTemplateSecondary,
      ...(Array.isArray(system.tags) ? system.tags : []),
      ...(Array.isArray(system.properties) ? system.properties : []),
      ...(Array.isArray(item?.flags?.[SYSTEM_ID]?.tags) ? item.flags[SYSTEM_ID].tags : [])
    ];

    return candidates.some(value => this._matchesImplantToken(value));
  }

  static hasImplantTraining(actor) {
    try {
      return Array.from(actor?.items ?? []).some(item => {
        if (item?.type !== 'feat' || item?.system?.disabled === true) return false;
        const slug = this._normalizeSlug(item.system?.slug || item.slug || item.name);
        const flagId = this._normalizeSlug(item.flags?.swse?.id || item.flags?.[SYSTEM_ID]?.id || '');
        return IMPLANT_TRAINING_SLUGS.has(slug) || flagId.endsWith('implant-training') || flagId.endsWith('implant_training');
      });
    } catch (_err) {
      return false;
    }
  }

  static _actorHasImplantFlag(actor) {
    const system = actor?.system ?? {};
    const flags = actor?.flags ?? {};
    const swseFlags = flags.swse ?? flags[SYSTEM_ID] ?? {};

    const candidates = [
      system.hasImplant,
      system.implant,
      system.implants,
      system.bioImplant,
      system.bioimplant,
      system.implantRules?.hasImplant,
      system.implantRules?.active,
      system.traits?.hasImplant,
      system.traits?.implant,
      swseFlags.hasImplant,
      swseFlags.implant,
      swseFlags.implants
    ];

    return candidates.some(value => this._truthy(value));
  }

  static _matchesImplantToken(value) {
    const token = this._normalizeSlug(value);
    if (!token) return false;
    if (IMPLANT_TAGS.has(token)) return true;
    return /(^|[-_])bio[-_]?implant($|[-_])/.test(token) || /(^|[-_])implant($|[-_])/.test(token);
  }

  static _normalizeSlug(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static _truthy(value) {
    if (value === true) return true;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') return /^(true|yes|y|1|active|installed|equipped|integrated)$/i.test(value.trim());
    return false;
  }
}

try {
  globalThis.game ??= {};
  game.swse ??= {};
  game.swse.implants ??= {};
  game.swse.implants.ImplantRules = ImplantRules;
} catch (_err) {
  // Foundry globals unavailable during syntax/audit runs.
}

export default ImplantRules;

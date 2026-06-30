/**
 * ImplantEffectRules
 *
 * Runtime effect helpers for explicit, installed/active implant items.
 * This module intentionally handles only narrow effects that can be modeled
 * safely without automating Cybernetic Surgery or treating generic cybernetics
 * as KOTOR implants.
 */

const SYSTEM_ID = 'foundryvtt-swse';

const EFFECTS_BY_IMPLANT_ID = Object.freeze({
  'implant-bio-stabilizer': {
    id: 'implant-bio-stabilizer',
    label: 'Bio-Stabilizer Implant',
    poisonImmunity: true,
    summary: 'Immune to poison while installed and active.'
  },
  'implant-cardio': {
    id: 'implant-cardio',
    label: 'Cardio Implant',
    maxHpBonus: 5,
    summary: '+5 maximum hit points while installed and active.'
  },
  'implant-combat': {
    id: 'implant-combat',
    label: 'Combat Implant',
    ignoreWeaponProficiencyPenalty: true,
    summary: 'Eliminates weapon nonproficiency penalties while installed and active.'
  },
  'implant-memory': {
    id: 'implant-memory',
    label: 'Memory Implant',
    knowledgeSkillReroll: true,
    summary: 'Allows Knowledge skill reroll handling while installed and active.'
  },
  'implant-nerve-reinforcement': {
    id: 'implant-nerve-reinforcement',
    label: 'Nerve Reinforcement Implant',
    stunDamageThresholdBonus: 5,
    summary: '+5 damage threshold against stun damage while installed and active.'
  },
  'implant-regenerative': {
    id: 'implant-regenerative',
    label: 'Regenerative Implant',
    naturalHealingMultiplier: 2,
    summary: 'Doubles natural healing while installed and active.'
  },
  'implant-sensory': {
    id: 'implant-sensory',
    label: 'Sensory Implant',
    visionModes: ['lowLightVision', 'darkvision'],
    summary: 'Grants low-light vision and darkvision while installed and active.'
  },
  'implant-subelectronic-converter': {
    id: 'implant-subelectronic-converter',
    label: 'Subelectronic Converter',
    subelectronicConverter: true,
    willDefensePenalty: -2,
    metadataOnlyExceptWillPenalty: true,
    summary: 'Mostly metadata/manual. While installed and active, applies -2 Will Defense and enables GM-adjudicated Force interaction with droids.'
  }
});

function normalizeSlug(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function itemEffectId(item) {
  const system = item?.system ?? {};
  const flags = item?.flags ?? {};
  const swseFlags = flags.swse ?? flags[SYSTEM_ID] ?? {};
  const candidates = [
    system.implantEffectId,
    system.implantRules?.effectId,
    system.slug,
    swseFlags.implantEffectId,
    swseFlags.id,
    item?._id,
    item?.id,
    item?.name
  ];
  for (const candidate of candidates) {
    const slug = normalizeSlug(candidate);
    if (!slug) continue;
    if (EFFECTS_BY_IMPLANT_ID[slug]) return slug;
    if (EFFECTS_BY_IMPLANT_ID[`implant-${slug}`]) return `implant-${slug}`;
  }
  return '';
}

function number(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export class ImplantEffectRules {
  static EFFECTS_BY_IMPLANT_ID = EFFECTS_BY_IMPLANT_ID;

  static getActiveImplantEffects(actor) {
    const activeItems = this._getActiveImplantItems(actor);
    return activeItems
      .map(item => {
        const id = itemEffectId(item);
        const base = EFFECTS_BY_IMPLANT_ID[id];
        if (!base) return null;
        return {
          ...base,
          itemId: item.id ?? item._id ?? '',
          itemName: item.name ?? base.label
        };
      })
      .filter(Boolean);
  }

  static getEffectSummary(actor) {
    const effects = this.getActiveImplantEffects(actor);
    const maxHpBonus = effects.reduce((sum, effect) => sum + number(effect.maxHpBonus), 0);
    const stunDamageThresholdBonus = effects.reduce((sum, effect) => sum + number(effect.stunDamageThresholdBonus), 0);
    const naturalHealingMultiplier = effects.some(effect => number(effect.naturalHealingMultiplier, 1) > 1) ? 2 : 1;
    const willDefensePenalty = effects.reduce((sum, effect) => sum + number(effect.willDefensePenalty), 0);
    const poisonImmunity = effects.some(effect => effect.poisonImmunity === true);
    const visionModes = [...new Set(effects.flatMap(effect => Array.isArray(effect.visionModes) ? effect.visionModes : []))];
    const metadataOnly = effects.filter(effect => effect.metadataOnlyExceptWillPenalty === true);

    return {
      activeEffects: effects,
      maxHpBonus,
      ignoreWeaponProficiencyPenalty: effects.some(effect => effect.ignoreWeaponProficiencyPenalty === true),
      knowledgeSkillReroll: effects.some(effect => effect.knowledgeSkillReroll === true),
      poisonImmunity,
      stunDamageThresholdBonus,
      naturalHealingMultiplier,
      visionModes,
      lowLightVision: visionModes.includes('lowLightVision'),
      darkvision: visionModes.includes('darkvision'),
      willDefensePenalty,
      forceAffectsDroids: effects.some(effect => effect.subelectronicConverter === true),
      metadataOnlyImplants: metadataOnly.map(effect => effect.id)
    };
  }

  static getMaxHpBonus(actor) {
    return this.getEffectSummary(actor).maxHpBonus;
  }

  static getPoisonImmunity(actor) {
    return this.getEffectSummary(actor).poisonImmunity === true;
  }

  static getStunDamageThresholdBonus(actor) {
    return this.getEffectSummary(actor).stunDamageThresholdBonus;
  }

  static getNaturalHealingMultiplier(actor) {
    return this.getEffectSummary(actor).naturalHealingMultiplier;
  }

  static getSpecificWillDefensePenalty(actor) {
    return this.getEffectSummary(actor).willDefensePenalty;
  }

  static ignoresWeaponProficiencyPenalty(actor, weapon = null) {
    if (weapon?.type && weapon.type !== 'weapon') return false;
    return this.getEffectSummary(actor).ignoreWeaponProficiencyPenalty === true;
  }

  static buildKnowledgeRerollOptions(actor, skillKey, roll = null) {
    if (!this.getEffectSummary(actor).knowledgeSkillReroll) return [];
    if (!/^knowledge/i.test(String(skillKey ?? ''))) return [];
    return [{
      id: 'implant-memory-knowledge-reroll',
      label: 'Memory Implant',
      source: 'Memory Implant',
      type: 'implant',
      mode: 'reroll_take_better',
      oncePerCheck: true,
      total: roll?.total ?? null,
      note: 'Memory Implant permits a Knowledge reroll; take the better result if your table applies the source rule.'
    }];
  }

  static canAffectDroidsWithMindAffectingForce(actor) {
    return this.getEffectSummary(actor).forceAffectsDroids === true;
  }

  static _getActiveImplantItems(actor) {
    try {
      const ImplantRules = globalThis.game?.swse?.implants?.ImplantRules;
      if (ImplantRules?.getActiveImplantItems) return ImplantRules.getActiveImplantItems(actor);
    } catch (_err) {
      // Fall through to local conservative detection.
    }
    try {
      return Array.from(actor?.items ?? []).filter(item => {
        if (!item || item.type !== 'equipment') return false;
        const system = item.system ?? {};
        const isImplant = system.isImplant === true
          || system.implant === true
          || system.implantRules?.countAsImplant === true
          || String(system.category ?? '').toLowerCase() === 'implant'
          || String(system.equipmentBucket ?? '').toLowerCase() === 'implants';
        if (!isImplant) return false;
        return system.installed === true
          || system.integrated === true
          || system.equipped === true
          || system.active === true
          || system.usage?.installed === true
          || system.usage?.integrated === true
          || system.usage?.equipped === true;
      });
    } catch (_err) {
      return [];
    }
  }
}

try {
  globalThis.game ??= {};
  game.swse ??= {};
  game.swse.implants ??= {};
  game.swse.implants.ImplantEffectRules = ImplantEffectRules;
} catch (_err) {
  // Foundry globals unavailable during syntax/audit runs.
}

export default ImplantEffectRules;

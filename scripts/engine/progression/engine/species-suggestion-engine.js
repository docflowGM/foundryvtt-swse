/**
 * SpeciesSuggestionEngine
 *
 * Species is the first meaningful chargen choice, so this engine supports
 * two modes:
 * 1. Curated opening guidance when no real build signal exists yet.
 * 2. Standard class-aware scoring when class/archetype context is available.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ClassesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js";
import { CLASS_SYNERGY_DATA } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-suggestion-utilities.js";

const SPECIES_CONFIDENCE_TIERS = {
  CURATED_OPENING: 0.92,
  CLASS_SYNERGY_MATCH: 0.85,
  ABILITY_COHERENCE: 0.72,
  TRAIT_UTILITY: 0.66,
  LANGUAGE_BREADTH: 0.60,
  FALLBACK_VALID: 0.50,
};

const CURATED_OPENING_GUIDE = [
  {
    name: 'Human',
    confidence: 0.92,
    reason: 'Human is a strong all-around choice if you want flexibility.',
    reasons: [
      'Human is a strong all-around choice if you want flexibility.',
      'The bonus feat and bonus trained skill make it easier to keep your options open while you learn the system.',
      'This is one of the safest starting species for new players because it stays useful no matter where the build goes.'
    ]
  },
  {
    name: 'Miraluka',
    confidence: 0.89,
    reason: 'Miraluka is worth a look for a Force-attuned path.',
    reasons: [
      'Miraluka is worth a look for a Force-attuned path.',
      'Its profile naturally leans toward awareness, intuition, and Force-oriented play.',
      'This is a strong species if you think you may want a Jedi or other Force-sensitive direction later.'
    ]
  },
  {
    name: 'Wookiee',
    confidence: 0.88,
    reason: 'Wookiee fits a durable front-line fighter.',
    reasons: [
      'Wookiee fits a durable front-line fighter.',
      'Its stat line and species profile reward direct, physical play and survivability.',
      'This is a strong onboarding pick if you want a character who solves problems up close.'
    ]
  },
  {
    name: "Twi'lek",
    confidence: 0.86,
    reason: "Twi'lek suits a social or leadership-focused character.",
    reasons: [
      "Twi'lek suits a social or leadership-focused character.",
      'Its profile points toward diplomacy, presence, and talking your way through problems.',
      'This is a strong fit if you want a face, negotiator, or leader-style character.'
    ]
  },
  {
    name: 'Rodian',
    confidence: 0.85,
    reason: 'Rodian fits scouting, hunting, and ranged pressure.',
    reasons: [
      'Rodian fits scouting, hunting, and ranged pressure.',
      'Its profile naturally supports mobility, pursuit, perception, and precision play.',
      'This is a strong species if you want an alert, opportunistic, or ranged-forward character.'
    ]
  },
  {
    name: 'Yarkora',
    confidence: 0.84,
    reason: 'Yarkora fits cunning, skillful, trickier play.',
    reasons: [
      'Yarkora fits cunning, skillful, trickier play.',
      'Its profile leans toward clever positioning, skills, and indirect problem-solving.',
      'This is a strong species if you want a more technical, slippery, or deceptive direction.'
    ]
  }
];

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeAbilityScores(item) {
  const raw = item?.abilityScores
    || item?.abilityMods
    || item?.system?.abilityMods
    || item?.system?.abilityScores
    || {};
  return {
    str: Number(raw.str ?? raw.STR ?? 0) || 0,
    dex: Number(raw.dex ?? raw.DEX ?? 0) || 0,
    con: Number(raw.con ?? raw.CON ?? 0) || 0,
    int: Number(raw.int ?? raw.INT ?? 0) || 0,
    wis: Number(raw.wis ?? raw.WIS ?? 0) || 0,
    cha: Number(raw.cha ?? raw.CHA ?? 0) || 0,
  };
}

function normalizeSpeciesEntry(item) {
  return {
    id: item?._id || item?.id,
    name: item?.name,
    category: item?.system?.category || item?.category,
    abilityScores: normalizeAbilityScores(item),
    abilities: item?.system?.special || item?.system?.abilities || item?.abilities || [],
    languages: item?.system?.languages || item?.languages || [],
    tags: item?.system?.tags || item?.tags || [],
    attributeForecast: item?.system?.attributeForecast || item?.attributeForecast || { boosts: [], mitigations: [] },
    source: item?.system?.source || item?.source,
    raw: item,
  };
}

export class SpeciesSuggestionEngine {
  static async suggestSpecies(availableSpecies = [], actor, pendingData = {}, options = {}) {
    try {
      if (!actor) return [];
      if (!Array.isArray(availableSpecies) || availableSpecies.length === 0) return [];

      const trace = options.debug ?? false;
      const normalized = availableSpecies.map(normalizeSpeciesEntry).filter((s) => s.id && s.name);
      if (!normalized.length) return [];

      const selectedClass = pendingData.selectedClass || this._getCurrentClass(actor);
      const classId = selectedClass?.classId || selectedClass?.id;
      const className = selectedClass?.name;

      if (!classId && !className) {
        const curated = this._buildCuratedOpeningSuggestions(normalized);
        if (trace) {
          SWSELogger.log('[SpeciesSuggestionEngine] Using curated opening guidance', {
            suggestions: curated.map((s) => s.name)
          });
        }
        return curated;
      }

      const classEntry = classId
        ? ClassesRegistry.getById(classId)
        : ClassesRegistry.getByName(className);

      const scored = normalized.map((species) => {
        const score = this._scoreSpecies(species, classEntry, actor, pendingData, { trace });
        return {
          id: species.id,
          name: species.name,
          suggestion: {
            confidence: score.confidence,
            reason: score.primaryReason,
            reasons: score.reasons,
          },
        };
      });

      return scored
        .filter((s) => s.suggestion.confidence >= 0.45)
        .sort((a, b) => b.suggestion.confidence - a.suggestion.confidence || a.name.localeCompare(b.name))
        .slice(0, 6);
    } catch (err) {
      SWSELogger.error('[SpeciesSuggestionEngine] Error:', err);
      return [];
    }
  }

  static _buildCuratedOpeningSuggestions(normalizedSpecies) {
    const byName = new Map(normalizedSpecies.map((entry) => [normalizeName(entry.name), entry]));
    const suggestions = [];

    for (const profile of CURATED_OPENING_GUIDE) {
      const match = byName.get(normalizeName(profile.name));
      if (!match) continue;
      suggestions.push({
        id: match.id,
        name: match.name,
        suggestion: {
          confidence: profile.confidence,
          reason: profile.reason,
          reasons: profile.reasons,
          curatedOpening: true,
          forecast: match.attributeForecast || { boosts: [], mitigations: [] }
        }
      });
    }

    return suggestions;
  }

  static _scoreSpecies(species, classEntry, actor, pendingData, options = {}) {
    let confidence = SPECIES_CONFIDENCE_TIERS.FALLBACK_VALID;
    const reasons = [];

    if (classEntry) {
      const primaryAbility = this._getPrimaryAbilityForClass(classEntry);
      const speciesAbilityBonus = Number(species.abilityScores?.[primaryAbility] || 0);
      if (speciesAbilityBonus > 0) {
        confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.CLASS_SYNERGY_MATCH);
        reasons.push(`${species.name} boosts ${primaryAbility.toUpperCase()}, which supports ${classEntry.name}.`);
      } else if (speciesAbilityBonus === 0) {
        confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.ABILITY_COHERENCE);
      }
    }

    const roleTags = new Set(species.tags || []);
    if (classEntry && this._classLooksForceFocused(classEntry) && (roleTags.has('force_training') || roleTags.has('force_execution') || roleTags.has('force_power'))) {
      confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.CLASS_SYNERGY_MATCH);
      reasons.push(`${species.name} carries strong Force-facing signals for this path.`);
    }

    if (Array.isArray(species.abilities) && species.abilities.length > 0) {
      confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.TRAIT_UTILITY);
      reasons.push(`${species.name} brings notable species traits that stay relevant after chargen.`);
    }

    if (Array.isArray(species.languages) && species.languages.length > 1) {
      confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.LANGUAGE_BREADTH);
      reasons.push(`${species.name} opens up extra starting language utility.`);
    }

    if (species.category && String(species.category).toLowerCase() === 'humanoid') {
      confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.ABILITY_COHERENCE);
      reasons.push('This species offers a straightforward starting profile.');
    }

    const primaryReason = reasons[0] || `${species.name} is available.`;
    return { confidence, primaryReason, reasons };
  }

  static _classLooksForceFocused(classEntry) {
    const className = String(classEntry?.name || '').toLowerCase();
    return className.includes('jedi') || className.includes('force') || className.includes('sith');
  }

  static _getPrimaryAbilityForClass(classEntry) {
    const classData = CLASS_SYNERGY_DATA[classEntry?.name];
    if (classData?.primaryAbility) {
      return String(classData.primaryAbility).toLowerCase();
    }

    const className = String(classEntry?.name || '').toLowerCase();
    if (className.includes('soldier') || className.includes('officer')) return 'str';
    if (className.includes('scout') || className.includes('scoundrel')) return 'dex';
    if (className.includes('jedi')) return 'wis';
    if (className.includes('noble') || className.includes('diplomat')) return 'cha';
    if (className.includes('tech')) return 'int';
    return 'str';
  }

  static _getCurrentClass(actor) {
    if (!actor) return null;
    const progressionClasses = actor.system?.progression?.classLevels;
    if (Array.isArray(progressionClasses) && progressionClasses.length > 0) return progressionClasses[0];

    const legacyClass = actor.system?.class;
    if (legacyClass) {
      return typeof legacyClass === 'string' ? { name: legacyClass } : legacyClass;
    }

    const classItem = actor.items?.find((item) => item.type === 'class');
    if (classItem) {
      return { id: classItem._id, name: classItem.name, classId: classItem._id };
    }

    return null;
  }
}

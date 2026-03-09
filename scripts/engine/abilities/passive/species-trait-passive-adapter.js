/**
 * SpeciesTraitPassiveAdapter
 *
 * Bridge between the Species Ability Registry (data/species-traits.json)
 * and the PASSIVE execution model.
 *
 * Goal:
 * - Make existing species/racial abilities participate in the Ability Engine
 *   without requiring per-species item edits.
 *
 * Scope (strict PASSIVE invariants):
 * - ONLY unconditional, always-on numeric bonuses that can be expressed as PASSIVE/MODIFIER
 * - ONLY unconditional, always-on senses/boolean capabilities that can be expressed as PASSIVE/RULE
 * - NO conditional/temporal/choice-based/cross-actor/substitution abilities
 */

import speciesTraits from "/systems/foundryvtt-swse/data/species-traits.json" with { type: "json" };
import { PassiveAdapter } from "./passive-adapter.js";
import { PASSIVE_SUBTYPES } from "./passive-types.js";
import { RULES } from "/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-enum.js";

// Pre-index for O(1) lookup by species name (case-insensitive)
const SPECIES_MAP = new Map(
  (Array.isArray(speciesTraits) ? speciesTraits : []).map(s => [String(s?.name ?? "").toLowerCase(), s])
);

// Very small, intentionally conservative mapping. Expand only when certain.
const SKILL_NAME_TO_KEY = Object.freeze({
  "acrobatics": "acrobatics",
  "climb": "climb",
  "deception": "deception",
  "endurance": "endurance",
  "gather information": "gatherInformation",
  "initiative": "initiative", // maps to initiative.total
  "jump": "jump",
  "mechanics": "mechanics",
  "perception": "perception",
  "persuasion": "persuasion",
  "pilot": "pilot",
  "ride": "ride",
  "stealth": "stealth",
  "survival": "survival",
  "swim": "swim",
  "treat injury": "treatInjury",
  "use computer": "useComputer",
  "use the force": "useTheForce",

  // Knowledge skills (common spellings)
  "knowledge (bureaucracy)": "knowledgeBureaucracy",
  "knowledge (galactic lore)": "knowledgeGalacticLore",
  "knowledge (galactic history)": "knowledgeGalacticLore", // alias
  "knowledge (life sciences)": "knowledgeLifeSciences",
  "knowledge (physical sciences)": "knowledgePhysicalSciences",
  "knowledge (social sciences)": "knowledgeSocialSciences",
  "knowledge (tactics)": "knowledgeTactics",
  "knowledge (technology)": "knowledgeTechnology"
});

// Denylist tokens: if present, we refuse to auto-migrate from text.
const DENY_TOKENS = Object.freeze([
  "until",
  "for ",
  "once per",
  "per encounter",
  "per day",
  "this turn",
  "this round",
  "next attack",
  "encounter",
  "when ",
  "while ",
  "if ",
  "may ",
  "choose",
  "instead",
  "in place of",
  "against",
  "target",
  "ally",
  "allies",
  "enemy"
]);

export class SpeciesTraitPassiveAdapter {
  /**
   * Register PASSIVE abilities derived from species-traits.json for the actor.
   *
   * @param {Actor} actor
   * @param {RuleCollector} ruleCollector
   */
  static registerFromActor(actor, ruleCollector) {
    try {
      const raceName = actor?.system?.race ?? actor?.system?.species?.name ?? actor?.system?.species ?? "";
      if (!raceName) return;

      const record = SPECIES_MAP.get(String(raceName).toLowerCase());
      if (!record) return;

      // Only structuralTraits are considered for auto-passive.
      // activatedAbilities and conditionalTraits are out of scope by invariant.
      const traits = Array.isArray(record.structuralTraits) ? record.structuralTraits : [];
      if (traits.length === 0) return;

      for (const trait of traits) {
        const text = String(trait?.description ?? "").trim();
        if (!text) continue;

        // Hard refuse if any deny token appears.
        const lower = text.toLowerCase();
        if (DENY_TOKENS.some(t => lower.includes(t))) {
          continue;
        }

        const pseudoAbilities = this._buildPseudoAbilitiesFromTrait(record.name, trait, text);
        for (const ability of pseudoAbilities) {
          PassiveAdapter.register(actor, ability, ruleCollector);
        }
      }
    } catch (_err) {
      // Intentionally silent. Species registry should never break actor preparation.
      // If desired, wire into SWSE debug logger in a later phase.
    }
  }

  /**
   * Create one or more pseudo PASSIVE abilities from a single trait description.
   * Conservative parsing: only supports a handful of well-formed, unconditional patterns.
   *
   * @private
   */
  static _buildPseudoAbilitiesFromTrait(speciesName, trait, description) {
    const out = [];

    // 1) Senses (boolean)
    // These are treated as PASSIVE/RULE tokens.
    const senseRules = this._extractSenseRules(description);
    if (senseRules.length) {
      out.push(this._makeRuleAbility(speciesName, trait, senseRules));
    }

    // 2) Skill bonuses: "+5 species bonus on Persuasion checks."
    // Also supports multiple sentences by scanning globally.
    const skillMods = this._extractSkillBonuses(description);
    if (skillMods.length) {
      out.push(this._makeModifierAbility(speciesName, trait, skillMods));
    }

    // 3) Defense bonuses: "+1 species bonus to Reflex Defense"
    const defenseMods = this._extractDefenseBonuses(description);
    if (defenseMods.length) {
      out.push(this._makeModifierAbility(speciesName, trait, defenseMods));
    }

    return out;
  }

  static _extractSenseRules(text) {
    const lower = String(text).toLowerCase();
    const rules = [];
    if (lower.includes("darkvision")) rules.push({ type: RULES.DARKVISION });
    if (lower.includes("low-light")) rules.push({ type: RULES.LOW_LIGHT_VISION });
    if (lower.includes("scent")) rules.push({ type: RULES.SCENT });
    return rules;
  }

  static _extractSkillBonuses(text) {
    const mods = [];
    const re = /([+-]\d+)\s+species\s+bonus\s+on\s+([^\.]+?)\s+checks?/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const val = Number(m[1]);
      if (!Number.isFinite(val)) continue;
      const skillNameRaw = String(m[2] ?? "").trim().toLowerCase();
      const skillKey = this._normalizeSkillKey(skillNameRaw);
      if (!skillKey) continue;

      // Initiative is not a skill target in ModifierTypes; it uses initiative.total.
      if (skillKey === "initiative") {
        mods.push({ target: "initiative.total", type: "untyped", value: val });
      } else {
        mods.push({ target: `skill.${skillKey}`, type: "untyped", value: val });
      }
    }
    return mods;
  }

  static _extractDefenseBonuses(text) {
    const mods = [];
    const re = /([+-]\d+)\s+species\s+bonus\s+to\s+(Fortitude|Reflex|Will)\s+Defense/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const val = Number(m[1]);
      if (!Number.isFinite(val)) continue;
      const def = String(m[2]).toLowerCase();
      const key = def === "fortitude" ? "fort" : def === "reflex" ? "reflex" : "will";
      mods.push({ target: `defense.${key}`, type: "untyped", value: val });
    }

    // Damage Threshold
    const dt = /([+-]\d+)\s+species\s+bonus\s+to\s+Damage\s+Threshold/gi;
    while ((m = dt.exec(text)) !== null) {
      const val = Number(m[1]);
      if (!Number.isFinite(val)) continue;
      mods.push({ target: "defense.damageThreshold", type: "untyped", value: val });
    }

    return mods;
  }

  static _normalizeSkillKey(skillNameLower) {
    // Normalize whitespace
    const normalized = String(skillNameLower)
      .replace(/\s+/g, " ")
      .replace(/\s*\(\s*/g, " (")
      .replace(/\s*\)\s*/g, ")")
      .trim();

    // Direct map
    if (normalized in SKILL_NAME_TO_KEY) return SKILL_NAME_TO_KEY[normalized];

    // Try to coerce "Knowledge (X)" variants
    if (normalized.startsWith("knowledge")) {
      const m = normalized.match(/^knowledge\s*\(([^\)]+)\)$/i);
      if (m) {
        const inner = `knowledge (${String(m[1]).trim()})`;
        if (inner in SKILL_NAME_TO_KEY) return SKILL_NAME_TO_KEY[inner];
      }
    }

    return null;
  }

  static _makeModifierAbility(speciesName, trait, rawModifiers) {
    const traitId = trait?.id ?? trait?.name ?? "trait";
    return {
      id: `species:${String(speciesName).toLowerCase()}:${String(traitId)}`,
      name: `${speciesName}: ${trait?.name ?? "Racial Trait"}`,
      type: "species",
      system: {
        executionModel: "PASSIVE",
        subType: PASSIVE_SUBTYPES.MODIFIER,
        abilityMeta: {
          modifiers: rawModifiers.map(m => ({
            target: m.target,
            type: m.type ?? "untyped",
            value: m.value,
            description: `Racial trait: ${trait?.name ?? "trait"}`
          }))
        }
      }
    };
  }

  static _makeRuleAbility(speciesName, trait, rules) {
    const traitId = trait?.id ?? trait?.name ?? "trait";
    return {
      id: `species:${String(speciesName).toLowerCase()}:${String(traitId)}:rules`,
      name: `${speciesName}: ${trait?.name ?? "Racial Trait"}`,
      type: "species",
      system: {
        executionModel: "PASSIVE",
        subType: PASSIVE_SUBTYPES.RULE,
        abilityMeta: {
          rules
        }
      }
    };
  }
}

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SkillUseFilter } from "/systems/foundryvtt-swse/scripts/utils/skill-use-filter.js";

/**
 * ExtraSkillUseRegistry
 *
 * Loads and normalizes extra skill use compendium data for UI consumers.
 * This is the authoritative hydration seam for character sheets and other
 * non-combat surfaces that need extra skill uses grouped by skill.
 */
export class ExtraSkillUseRegistry {
  static _initialized = false;
  static _items = [];
  static _bySkill = new Map();
  static _initPromise = null;

  static async initialize() {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      try {
        let docs = await this._loadCompendiumItems("foundryvtt-swse.extraskilluses");
        if (!docs.length) {
          docs = await this._loadJsonFallback("data/extraskilluses.json");
          SWSELogger.log("SWSE | ExtraSkillUseRegistry loaded JSON fallback extraskilluses");
        }

        const normalized = docs
          .map((doc) => this._normalize(doc))
          .filter((item) => !!item?.skillKey);

        this._items = normalized;
        this._bySkill = this._groupBySkill(normalized);
        this._initialized = true;

        SWSELogger.log(`SWSE | ExtraSkillUseRegistry initialized: ${normalized.length} extra skill uses across ${this._bySkill.size} skills`);
      } catch (err) {
        SWSELogger.error("SWSE | ExtraSkillUseRegistry initialization failed", err);
        this._items = [];
        this._bySkill = new Map();
        this._initialized = true;
      } finally {
        this._initPromise = null;
      }
    })();

    return this._initPromise;
  }

  static async getForSkill(skillKey, { actor = null, includeInaccessible = false } = {}) {
    await this.initialize();

    const items = this._bySkill.get(skillKey) ?? [];
    const hydrated = items.map((item) => {
      const accessible = actor ? SkillUseFilter.canAccessSkillUse(actor, item._source) : true;
      return {
        ...item,
        accessible,
        hidden: !accessible,
      };
    });

    return includeInaccessible ? hydrated : hydrated.filter((item) => item.accessible !== false);
  }

  static async getAllBySkill({ actor = null, includeInaccessible = false } = {}) {
    await this.initialize();

    const result = {};
    for (const skillKey of this._bySkill.keys()) {
      result[skillKey] = await this.getForSkill(skillKey, { actor, includeInaccessible });
    }
    return result;
  }

  static _groupBySkill(items) {
    const bySkill = new Map();
    for (const item of items) {
      const bucket = bySkill.get(item.skillKey) ?? [];
      bucket.push(item);
      bySkill.set(item.skillKey, bucket);
    }

    for (const [skillKey, bucket] of bySkill.entries()) {
      bucket.sort((a, b) => {
        const aDc = this._sortableDc(a.dc);
        const bDc = this._sortableDc(b.dc);
        if (aDc !== bDc) return aDc - bDc;
        return String(a.label).localeCompare(String(b.label));
      });
      bySkill.set(skillKey, bucket);
    }

    return bySkill;
  }

  static _sortableDc(dc) {
    if (typeof dc === "number") return dc;
    if (typeof dc === "string") {
      const match = dc.match(/-?\d+/);
      if (match) return Number(match[0]);
    }
    return Number.POSITIVE_INFINITY;
  }

  static _normalize(raw) {
    const system = raw?.system ?? {};
    const application = system.application ?? raw?.name ?? "Unknown Skill Use";

    // Routing priority for skill key:
    // 1. system.skill (authoritative for regenerated entries with explicit metadata)
    // 2. system.skillKey (legacy fallback)
    // 3. fuzzy name matching (last resort for unclassified entries)
    const skillKey = this._normalizeSkillKey(
      system.skill ?? system.skillKey ?? SkillUseFilter.getSkillKeyForApplication({ application })
    );

    const description = this._firstNonEmpty(
      system.description?.value,
      system.description,
      system.effect,
      system.notes,
      raw?.description,
      ""
    );

    const trainedOnly = Boolean(system.trainedOnly) || /\(trained\)/i.test(application) || /trained only/i.test(description);

    return {
      key: system.key ?? raw?._id ?? foundry.utils.randomID(),
      label: application,
      name: application,
      skillKey,
      dc: system.dc ?? system.DC ?? null,
      time: system.time ?? null,
      description,
      effect: system.effect ?? description,
      trainedOnly,
      sourcePack: raw?.pack ?? null,
      _source: {
        application,
        ...raw,
        system: {
          ...system,
          application,
          skill: skillKey,
          trainedOnly,
          description,
          effect: system.effect ?? description
        }
      }
    };
  }

  static _normalizeSkillKey(value) {
    if (!value) return null;

    const normalized = String(value)
      .trim()
      .replace(/[()]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .toLowerCase();

    const directMap = {
      "acrobatics": "acrobatics",
      "climb": "climb",
      "deception": "deception",
      "endurance": "endurance",
      "gather information": "gatherInformation",
      "gatherinformation": "gatherInformation",
      "initiative": "initiative",
      "jump": "jump",
      "knowledge": "knowledge",
      "knowledge galactic lore": "knowledgeGalacticLore",
      "knowledge life sciences": "knowledgeLifeSciences",
      "knowledge physical sciences": "knowledgePhysicalSciences",
      "knowledge social sciences": "knowledgeSocialSciences",
      "knowledge tactics": "knowledgeTactics",
      "knowledge technology": "knowledgeTechnology",
      "mechanics": "mechanics",
      "perception": "perception",
      "persuasion": "persuasion",
      "pilot": "pilot",
      "ride": "ride",
      "stealth": "stealth",
      "survival": "survival",
      "swim": "swim",
      "treat injury": "treatInjury",
      "treatinjury": "treatInjury",
      "use computer": "useComputer",
      "usecomputer": "useComputer",
      "use the force": "useTheForce",
      "usetheforce": "useTheForce"
    };

    if (directMap[normalized]) return directMap[normalized];

    const squashed = normalized.replace(/\s+/g, "");
    if (directMap[squashed]) return directMap[squashed];

    return value;
  }

  static _firstNonEmpty(...values) {
    return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") ?? "";
  }

  static async _loadCompendiumItems(packId) {
    const pack = game?.packs?.get(packId);
    if (!pack) {
      SWSELogger.warn(`SWSE | Missing compendium: ${packId}`);
      return [];
    }

    try {
      const docs = await pack.getDocuments();
      return docs.map((doc) => doc.toObject());
    } catch (err) {
      SWSELogger.error(`SWSE | Failed to load compendium ${packId}`, err);
      return [];
    }
  }

  static async _loadJsonFallback(path) {
    try {
      const response = await fetch(`systems/foundryvtt-swse/${path}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data.map((item, idx) => ({
        _id: `json-extra-skill-use-${idx}`,
        name: item.name || item.application,
        system: {
          ...item,
          application: item.application || item.name,
          dc: item.dc ?? item.DC ?? null,
          effect: item.effect ?? "",
          time: item.time ?? null,
          description: item.description ?? item.effect ?? "",
          skill: item.skill ?? SkillUseFilter.getSkillKeyForApplication({ application: item.application || item.name })
        }
      })) : [];
    } catch (err) {
      SWSELogger.error(`SWSE | Failed to load JSON fallback ${path}`, err);
      return [];
    }
  }
}

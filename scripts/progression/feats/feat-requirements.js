/**
 * PREREQUISITE REQUIREMENTS ENGINE
 * Unified validator for Feats and Talents.
 *
 * ✔ Backward compatible with string-based prerequisites
 * ✔ Supports structured prerequisites
 * ✔ Supports "any other talent from X tree"
 */

import { SWSELogger } from '../../utils/logger.js';

export const PrerequisiteRequirements = {

  /* ============================================
   * PUBLIC ENTRY POINT
   * ============================================ */

  /**
   * Check if actor meets requirements
   * Works for feats and talents
   *
   * @returns { valid: boolean, reasons: string[] }
   */
  meetsRequirements(actor, doc) {
    const structured = doc.system?.prerequisitesStructured;

    // Prefer structured prerequisites if present
    if (structured) {
      const reasons = [];
      const valid = this._evaluateStructured(actor, structured, reasons, doc);
      return { valid, reasons };
    }

    // Fallback to legacy string-based prerequisites
    return this._meetsLegacyStringRequirements(actor, doc);
  },

  canLearn(actor, doc) {
    return this.meetsRequirements(actor, doc).valid;
  },

  getUnmetRequirements(actor, doc) {
    return this.meetsRequirements(actor, doc).reasons;
  },

  /* ============================================
   * STRUCTURED PREREQUISITE EVALUATION
   * ============================================ */

  _evaluateStructured(actor, prereq, reasons, doc) {
    const mode = prereq.type ?? 'all';
    const results = [];

    for (const condition of prereq.conditions ?? []) {
      const passed = this._checkCondition(actor, condition, reasons, doc);
      results.push(passed);
    }

    return mode === 'any'
      ? results.some(Boolean)
      : results.every(Boolean);
  },

  _checkCondition(actor, condition, reasons, doc) {
    switch (condition.type) {

      /* ---------- FEATS ---------- */
      case 'feat': {
        const hasFeat = actor.items.some(i =>
          i.type === 'feat' &&
          this._normalizeId(i) === condition.id
        );

        if (!hasFeat) {
          reasons.push(`Requires ${condition.name ?? condition.id}`);
        }
        return hasFeat;
      }

      /* ---------- TALENTS ---------- */
      case 'talent': {
        const hasTalent = actor.items.some(i =>
          i.type === 'talent' &&
          this._normalizeId(i) === condition.id
        );

        if (!hasTalent) {
          reasons.push(`Requires ${condition.name ?? condition.id}`);
        }
        return hasTalent;
      }

      case 'talentFromTree': {
        const talents = actor.items.filter(i =>
          i.type === 'talent' &&
          i.system?.tree === condition.tree &&
          i.id !== doc?.id // exclude self
        );

        const count = condition.count ?? 1;
        if (talents.length < count) {
          reasons.push(`Requires any other ${condition.tree} talent`);
          return false;
        }
        return true;
      }

      /* ---------- ATTRIBUTES ---------- */
      case 'attribute': {
        const score = actor.system.attributes?.[condition.ability]?.total ?? 10;
        if (score < condition.min) {
          reasons.push(
            `Requires ${condition.ability.toUpperCase()} ${condition.min} (you have ${score})`
          );
          return false;
        }
        return true;
      }

      /* ---------- SKILLS ---------- */
      case 'skillTrained': {
        const trained = actor.system.skills?.[condition.skill]?.trained ?? false;
        if (!trained) {
          reasons.push(`Requires trained in ${condition.skill}`);
          return false;
        }
        return true;
      }

      /* ---------- BAB ---------- */
      case 'bab': {
        const bab = actor.system.bab ?? 0;
        if (bab < condition.min) {
          reasons.push(`Requires BAB +${condition.min}`);
          return false;
        }
        return true;
      }

      /* ---------- LEVEL ---------- */
      case 'level': {
        const level = actor.system.level ?? 1;
        if (level < condition.min) {
          reasons.push(`Requires Character Level ${condition.min}`);
          return false;
        }
        return true;
      }

      /* ---------- DARK SIDE ---------- */
      case 'darkSideScore': {
        const dsp = actor.system.darkSideScore ?? 0;
        if (dsp < condition.min) {
          reasons.push(`Requires Dark Side Score ${condition.min}`);
          return false;
        }
        return true;
      }

      /* ---------- SPECIES ---------- */
      case 'species': {
        const speciesId = actor.system.species?.id;
        if (speciesId !== condition.id) {
          reasons.push(`Requires ${condition.name ?? condition.id}`);
          return false;
        }
        return true;
      }

      default:
        SWSELogger.warn('Unknown prerequisite condition:', condition);
        return true;
    }
  },

  /* ============================================
   * LEGACY STRING PREREQUISITES (UNCHANGED)
   * ============================================ */

  _meetsLegacyStringRequirements(actor, doc) {
    const prereq = doc.system?.prerequisite ?? '';

    if (!prereq.trim()) {
      return { valid: true, reasons: [] };
    }

    const reasons = [];

    this._checkAbilityRequirements(actor, prereq, reasons);
    this._checkBABRequirements(actor, prereq, reasons);
    this._checkLevelRequirements(actor, prereq, reasons);
    this._checkSkillRequirements(actor, prereq, reasons);
    this._checkOtherFeatRequirements(actor, prereq, reasons);

    return {
      valid: reasons.length === 0,
      reasons
    };
  },

  /* ---------- LEGACY CHECKS (UNCHANGED FROM YOUR FILE) ---------- */

  _checkAbilityRequirements(actor, prereq, reasons) {
    const abilities = ['str','dex','con','int','wis','cha'];
    for (const a of abilities) {
      const match = prereq.match(new RegExp(`${a}\\s*(\\d+)`, 'i'));
      if (match) {
        const need = Number(match[1]);
        const have = actor.system.attributes?.[a]?.total ?? 10;
        if (have < need) {
          reasons.push(`Requires ${a.toUpperCase()} ${need} (you have ${have})`);
        }
      }
    }
  },

  _checkBABRequirements(actor, prereq, reasons) {
    const m = prereq.match(/bab\s*\+?(\d+)/i);
    if (m) {
      const need = Number(m[1]);
      const bab = actor.system.bab ?? 0;
      if (bab < need) {
        reasons.push(`Requires BAB +${need}`);
      }
    }
  },

  _checkLevelRequirements(actor, prereq, reasons) {
    const m = prereq.match(/level\s*(\d+)/i);
    if (m) {
      const need = Number(m[1]);
      const level = actor.system.level ?? 1;
      if (level < need) {
        reasons.push(`Requires Character Level ${need}`);
      }
    }
  },

  _checkSkillRequirements(actor, prereq, reasons) {
    const matches = prereq.match(/trained in ([^,;]+)/gi);
    if (!matches) return;

    for (const m of matches) {
      const skill = m.replace(/trained in/i,'').trim().toLowerCase();
      const trained = actor.system.skills?.[skill]?.trained ?? false;
      if (!trained) {
        reasons.push(`Requires trained in ${skill}`);
      }
    }
  },

  _checkOtherFeatRequirements(actor, prereq, reasons) {
    const matches = prereq.match(/requires ([^,;]+)/gi);
    if (!matches) return;

    for (const m of matches) {
      const name = m.replace(/requires/i,'').trim();
      const has = actor.items.some(i =>
        i.type === 'feat' &&
        i.name.toLowerCase() === name.toLowerCase()
      );
      if (!has) {
        reasons.push(`Requires ${name}`);
      }
    }
  },

  /* ============================================
   * UTIL
   * ============================================ */

  _normalizeId(doc) {
    return doc.flags?.swse?.id ?? doc.id;
  }
};

export default PrerequisiteRequirements;

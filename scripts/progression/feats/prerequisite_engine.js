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
    return this.checkFeature(actor, doc);
  },

  /**
   * Unified check for any feature (feat, talent, etc)
   * @returns { valid: boolean, reasons: string[] }
   */
  checkFeature(actor, doc) {
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

  /**
   * Check talent prerequisites (alias for checkFeature)
   * @returns { valid: boolean, reasons: string[] }
   */
  checkTalentPrerequisites(actor, talent, pending = {}) {
    return this.checkFeature(actor, talent);
  },

  /**
   * Check feat prerequisites (alias for checkFeature)
   * @returns { valid: boolean, reasons: string[] }
   */
  checkFeatPrerequisites(actor, feat, pending = {}) {
    return this.checkFeature(actor, feat);
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

      /* ---------- FORCE POWERS ---------- */
      case 'forcePower': {
        const result = this._checkForcePowerCondition(actor, condition, reasons);
        return result;
      }

      /* ---------- FORCE TECHNIQUES ---------- */
      case 'forceTechnique': {
        const result = this._checkForceTechniqueCondition(actor, condition, reasons);
        return result;
      }

      /* ---------- FORCE SECRETS ---------- */
      case 'forceSecret': {
        const result = this._checkForceSecretCondition(actor, condition, reasons);
        return result;
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
   * FORCE PREREQUISITES
   * ============================================ */

  _getForceSnapshot(actor) {
    const powers = actor.items.filter(i => i.type === 'forcepower');
    const techniques = actor.items.filter(i => i.type === 'forceTechnique');
    const secrets = actor.items.filter(i => i.type === 'forceSecret');

    return {
      powers,
      techniques,
      secrets,
      powersByCategory: this._mapPowersByCategory(powers),
      techniquesByPower: this._mapTechniquesByPower(techniques)
    };
  },

  _mapPowersByCategory(powers) {
    const map = {};
    for (const power of powers) {
      const categories = power.system?.categories ?? [];
      for (const cat of categories) {
        if (!map[cat]) map[cat] = [];
        map[cat].push(power);
      }
    }
    return map;
  },

  _mapTechniquesByPower(techniques) {
    const map = {};
    for (const tech of techniques) {
      const associated = tech.system?.suggestion?.associatedPowers ?? [];
      for (const powerName of associated) {
        if (!map[powerName]) map[powerName] = [];
        map[powerName].push(tech);
      }
    }
    return map;
  },

  _checkForcePowerCondition(actor, condition, reasons) {
    const snapshot = this._getForceSnapshot(actor);

    // Check specific power names
    if (condition.names && condition.names.length > 0) {
      const allFound = condition.names.every(name =>
        snapshot.powers.some(p => p.name === name)
      );
      if (!allFound) {
        reasons.push(`Requires Force power: ${condition.names.join(' or ')}`);
        return false;
      }
      return true;
    }

    // Check by category
    if (condition.category) {
      const categoryCount = snapshot.powersByCategory[condition.category]?.length ?? 0;
      const required = condition.count ?? 1;
      if (categoryCount < required) {
        reasons.push(`Requires ${required} Force power(s) from ${condition.category} category`);
        return false;
      }
      return true;
    }

    return true;
  },

  _checkForceTechniqueCondition(actor, condition, reasons) {
    const snapshot = this._getForceSnapshot(actor);

    // Check technique count
    if (condition.count) {
      if (snapshot.techniques.length < condition.count) {
        reasons.push(`Requires ${condition.count} Force Technique(s)`);
        return false;
      }
      return true;
    }

    // Check technique associated with specific power
    if (condition.associatedWithPower) {
      const found = snapshot.techniques.some(t => {
        const associated = t.system?.suggestion?.associatedPowers ?? [];
        return associated.includes(condition.associatedWithPower);
      });
      if (!found) {
        reasons.push(`Requires a Technique associated with ${condition.associatedWithPower}`);
        return false;
      }
      return true;
    }

    return true;
  },

  _checkForceSecretCondition(actor, condition, reasons) {
    const snapshot = this._getForceSnapshot(actor);

    // Check if any Force Secret exists
    if (condition.any) {
      if (snapshot.secrets.length === 0) {
        reasons.push('Requires any Force Secret');
        return false;
      }
      return true;
    }

    // Check specific secret names
    if (condition.names && condition.names.length > 0) {
      const allFound = condition.names.every(name =>
        snapshot.secrets.some(s => s.name === name)
      );
      if (!allFound) {
        reasons.push(`Requires Force Secret: ${condition.names.join(' or ')}`);
        return false;
      }
      return true;
    }

    return true;
  },

  /* ============================================
   * UTIL
   * ============================================ */

  _normalizeId(doc) {
    return doc.flags?.swse?.id ?? doc.id;
  }
};

export default PrerequisiteRequirements;

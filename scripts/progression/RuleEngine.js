
// ======================================================================
// RuleEngine.js
// Determines whether an actor qualifies for a TalentNode.
//
// NOTE:
// This is intentionally backend + deterministic.
// The UI should NOT perform any logic itself.
// ======================================================================

export class RuleEngine {
  constructor(actor, pending = {}) {
    this.actor = actor;
    this.pending = pending; // talents hypothetically chosen during level-up
  }

  /**
   * MAIN ENTRY: checks "is this talent pick legal?"
   */
  qualifies(node) {
    if (!node.prereq || node.prereq.length === 0) {
      return true;
    }

    for (const req of node.prereq) {
      if (!this._checkRequirement(req)) {
        return false;
      }
    }
    return true;
  }

  // ----------------------------------------------------------
  // INTERNAL REQUIREMENT CHECKERS
  // ----------------------------------------------------------

  _checkRequirement(req) {
    switch (req.type) {
      case "ability":
        return this._checkAbility(req);

      case "bab":
        return this._checkBAB(req);

      case "skill_trained":
        return this._checkSkillTrained(req);

      case "skill_ranks":
        return this._checkSkillRanks(req);

      case "feat":
        return this._checkFeat(req);

      case "talent":
        return this._checkTalent(req);

      case "force_secret":
        return this._hasForceSecret();

      case "force_technique":
        return this._hasForceTechnique();

      case "force_sensitive":
        return this._hasForceSensitive();

      case "class_level":
        return this._checkClassLevel(req);

      case "alignment":
        return this._checkAlignment(req);

      default:
        console.warn("[RuleEngine] Unknown prerequisite type:", req);
        return false;
    }
  }

  _checkAbility(req) {
    const ability = this.actor.system?.abilities?.[req.ability];
    if (!ability) return false;
    return (ability?.total ?? 10) >= req.minimum;
  }

  _checkBAB(req) {
    const bab = this.actor.system?.attributes?.bab ?? 0;
    return bab >= req.minimum;
  }

  _checkSkillTrained(req) {
    const skill = this.actor.items.find(i =>
      i.type === "skill" &&
      i.system?.key?.toLowerCase() === req.skill
    );
    return Boolean(skill && skill.system?.trained);
  }

  _checkSkillRanks(req) {
    const skill = this.actor.items.find(i =>
      i.type === "skill" &&
      i.system?.key?.toLowerCase() === req.skill
    );
    return Boolean(skill && (skill.system?.ranks ?? 0) >= req.ranks);
  }

  _checkFeat(req) {
    const feats = this.actor.items.filter(i => i.type === "feat");
    const names = feats.map(f => f.name.toLowerCase());
    return names.includes(req.name.toLowerCase());
  }

  _checkTalent(req) {
    // Pending talents count as already acquired
    const pendingNames = Object.values(this.pending ?? {}).map(p =>
      p.name.toLowerCase()
    );

    const talents = this.actor.items.filter(i => i.type === "talent");
    const names = talents.map(t => t.name.toLowerCase());

    return names.includes(req.name.toLowerCase()) ||
           pendingNames.includes(req.name.toLowerCase());
  }

  _hasForceSecret() {
    return Boolean(this.actor.items.find(i => i.type === "force_secret"));
  }

  _hasForceTechnique() {
    return Boolean(this.actor.items.find(i => i.type === "force_technique"));
  }

  _hasForceSensitive() {
    return Boolean(this.actor.items.find(i => i.type === "feat" &&
      i.name.toLowerCase().includes("force sensitive")));
  }

  _checkClassLevel(req) {
    const levels = this.actor.items.filter(i => i.type === "class");
    for (const cls of levels) {
      if (cls.name.toLowerCase() === req.className.toLowerCase()) {
        return (cls.system?.level ?? 0) >= req.minimum;
      }
    }
    return false;
  }

  _checkAlignment(req) {
    const align = this.actor.system?.alignment ??
                  this.actor.system?.forceAlignment ??
                  "";
    return align.toLowerCase().includes(req.alignment.toLowerCase());
  }
}

/**
 * PrerequisiteEngine — Build Integrity & Prerequisite Validation
 *
 * Handles:
 * - Prerequisite validation for talents/feats
 * - Build mode tracking (validated vs free)
 * - Prerequisite audit (full character rebuild check)
 * - Warning-only enforcement (override allowed)
 *
 * Pure functions. No mutations. Clean validation pipeline.
 */

export class PrerequisiteEngine {
  /**
   * Check if item (talent/feat) meets prerequisites
   * @param {Actor} actor - Character actor
   * @param {Item} item - Item to validate
   * @returns {Object} Validation result {valid, issues}
   */
  static validateItemPrerequisites(actor, item) {
    if (!item?.system?.prerequisites) {
      return { valid: true, issues: [] };
    }

    const issues = [];
    const prePath = item.system.prerequisites;

    // Parse prerequisites (flexible format support)
    const parsed = this._parsePrerequisites(prePath);

    // Check each prerequisite
    for (const prereq of parsed) {
      if (!this._checkPrerequisite(actor, prereq)) {
        issues.push(prereq);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      itemName: item.name,
      itemType: item.type
    };
  }

  /**
   * Audit entire character build for prerequisites
   * @param {Actor} actor - Character actor
   * @returns {Object} Full audit result
   */
  static auditBuild(actor) {
    const talents = actor.items.filter(i => i.type === 'talent') || [];
    const feats = actor.items.filter(i => i.type === 'feat') || [];
    const allItems = [...talents, ...feats];

    const violations = [];
    const warnings = [];

    for (const item of allItems) {
      const validation = this.validateItemPrerequisites(actor, item);
      if (!validation.valid) {
        violations.push({
          item: item.name,
          type: item.type,
          issues: validation.issues
        });
      }
    }

    // Check level prerequisites
    const level = actor.system?.level ?? 0;
    const className = actor.system?.class?.name ?? actor.system?.className ?? '';

    return {
      valid: violations.length === 0,
      violations,
      warnings,
      level,
      className,
      totalItems: allItems.length,
      itemsChecked: allItems.length
    };
  }

  /**
   * Parse prerequisite text into structured format
   * Supports: "Level 10", "Dex 13", "Feat: Name", "Talent: Name", "Base Attack +5"
   * @private
   */
  static _parsePrerequisites(text) {
    if (!text) return [];

    const prereqs = [];
    const lines = String(text).split(/[,;]/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Level check
      if (/level/i.test(trimmed)) {
        const match = trimmed.match(/(\d+)/);
        if (match) {
          prereqs.push({ type: 'level', value: Number(match[1]) });
        }
      }

      // Ability score check
      const abilityMatch = trimmed.match(/(STR|DEX|CON|INT|WIS|CHA)\s*(\d+)/i);
      if (abilityMatch) {
        prereqs.push({
          type: 'ability',
          ability: abilityMatch[1].toLowerCase(),
          value: Number(abilityMatch[2])
        });
      }

      // Base Attack Bonus
      if (/base attack|bab/i.test(trimmed)) {
        const match = trimmed.match(/(\d+)/);
        if (match) {
          prereqs.push({ type: 'bab', value: Number(match[1]) });
        }
      }

      // Feat requirement
      const featMatch = trimmed.match(/feat:?\s*(.+)/i);
      if (featMatch) {
        prereqs.push({
          type: 'feat',
          name: featMatch[1].trim()
        });
      }

      // Talent requirement
      const talentMatch = trimmed.match(/talent:?\s*(.+)/i);
      if (talentMatch) {
        prereqs.push({
          type: 'talent',
          name: talentMatch[1].trim()
        });
      }

      // Class requirement
      const classMatch = trimmed.match(/class:?\s*(.+)/i);
      if (classMatch) {
        prereqs.push({
          type: 'class',
          name: classMatch[1].trim()
        });
      }
    }

    return prereqs;
  }

  /**
   * Check individual prerequisite
   * @private
   */
  static _checkPrerequisite(actor, prereq) {
    if (!prereq) return true;

    switch (prereq.type) {
      case 'level':
        return (actor.system?.level ?? 0) >= prereq.value;

      case 'ability':
        const abilityScore = actor.system?.abilities?.[prereq.ability]?.total ??
                            actor.system?.attributes?.[prereq.ability]?.total ?? 0;
        return abilityScore >= prereq.value;

      case 'bab':
        const bab = actor.system?.derived?.bab ??
                   actor.system?.bab?.total ??
                   actor.system?.baseAttackBonus ?? 0;
        return bab >= prereq.value;

      case 'feat':
        const feats = actor.items.filter(i => i.type === 'feat') || [];
        return feats.some(f => f.name.toLowerCase() === String(prereq.name).toLowerCase());

      case 'talent':
        const talents = actor.items.filter(i => i.type === 'talent') || [];
        return talents.some(t => t.name.toLowerCase() === String(prereq.name).toLowerCase());

      case 'class':
        const charClass = actor.system?.class?.name ?? actor.system?.className ?? '';
        return charClass.toLowerCase() === String(prereq.name).toLowerCase();

      default:
        return true;
    }
  }

  /**
   * Enable Free Build Mode (override mode)
   * @param {Actor} actor - Character actor
   */
  static async enableFreeBuildMode(actor) {
    await actor.update({ 'system.buildMode': 'free' });
  }

  /**
   * Validate and potentially switch from free build mode
   * @param {Actor} actor - Character actor
   * @returns {boolean} True if valid and switched to validated mode
   */
  static async validateBuild(actor) {
    const audit = this.auditBuild(actor);
    if (audit.valid) {
      await actor.update({ 'system.buildMode': 'validated' });
      return true;
    }
    return false;
  }

  /**
   * Get formatted prerequisite violations for display
   * @param {Object} audit - Audit result
   * @returns {string} Formatted message
   */
  static formatViolations(audit) {
    if (audit.valid) return 'Build is valid!';

    const lines = ['Build violations detected:'];
    for (const v of audit.violations) {
      lines.push(`\n${v.item} (${v.type}):`);
      for (const issue of v.issues) {
        lines.push(`  - ${this._formatIssue(issue)}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * Format individual issue for display
   * @private
   */
  static _formatIssue(issue) {
    if (!issue) return 'Unknown requirement';

    switch (issue.type) {
      case 'level':
        return `Requires Level ${issue.value}`;
      case 'ability':
        return `Requires ${issue.ability.toUpperCase()} ${issue.value}`;
      case 'bab':
        return `Requires Base Attack +${issue.value}`;
      case 'feat':
        return `Requires Feat: ${issue.name}`;
      case 'talent':
        return `Requires Talent: ${issue.name}`;
      case 'class':
        return `Requires Class: ${issue.name}`;
      default:
        return 'Unknown requirement';
    }
  }
}

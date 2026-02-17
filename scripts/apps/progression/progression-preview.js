// scripts/apps/progression/progression-preview.js
import { swseLogger } from '../../utils/logger.js';

/**
 * Progression Preview System
 * Provides dry-run previews for level-up and progression changes
 */

export class ProgressionPreview {
  /**
   * Preview what will happen when leveling up
   * @param {Actor} actor - Actor to preview
   * @param {Object} levelData - Level-up data
   * @returns {Promise<Object>} Preview data showing changes
   */
  static async previewLevelUp(actor, levelData) {
    const { classId, level, selections = {} } = levelData;

    // Create a temporary clone of the actor
    const tempActor = foundry.utils.deepClone(actor.toObject());

    // Preview changes
    const preview = {
      actor: actor.name,
      currentLevel: actor.system.level || 0,
      newLevel: level,
      class: classId,
      changes: {
        hp: this._previewHP(tempActor, levelData),
        skills: this._previewSkills(tempActor, selections.skills),
        feats: this._previewFeats(tempActor, selections.feats),
        talents: this._previewTalents(tempActor, selections.talents),
        classFeatures: this._previewClassFeatures(tempActor, classId, level),
        abilities: this._previewAbilities(tempActor, levelData)
      },
      warnings: [],
      errors: []
    };

    // Validate prerequisites
    preview.warnings = this._validatePrerequisites(tempActor, selections);

    return preview;
  }

  /**
   * Preview HP gain
   * @private
   */
  static _previewHP(actor, levelData) {
    const currentHP = actor.system.hp?.max || 0;
    const conMod = actor.system.attributes?.con?.mod || 0;

    // Calculate HP gain based on class
    const classHPDie = this._getClassHPDie(levelData.classId);
    const avgHPGain = Math.floor(classHPDie / 2) + 1 + conMod;

    return {
      current: currentHP,
      gain: avgHPGain,
      new: currentHP + avgHPGain,
      note: `Average for d${classHPDie} + ${conMod} (Con)`
    };
  }

  /**
   * Preview skill changes
   * @private
   */
  static _previewSkills(actor, skillSelections = {}) {
    const changes = [];

    for (const [skillKey, trained] of Object.entries(skillSelections)) {
      if (trained && !actor.system.skills?.[skillKey]?.trained) {
        changes.push({
          skill: skillKey,
          type: 'new',
          description: `Train ${skillKey}`
        });
      }
    }

    return changes;
  }

  /**
   * Preview feat changes
   * @private
   */
  static _previewFeats(actor, featSelections = []) {
    const currentFeats = actor.system.progression?.feats || [];
    const newFeats = featSelections.filter(f => !currentFeats.includes(f));

    return newFeats.map(feat => ({
      feat,
      type: 'new',
      description: `Gain feat: ${feat}`
    }));
  }

  /**
   * Preview talent changes
   * @private
   */
  static _previewTalents(actor, talentSelections = []) {
    const currentTalents = actor.system.progression?.talents || [];
    const newTalents = talentSelections.filter(t => !currentTalents.includes(t));

    return newTalents.map(talent => ({
      talent,
      type: 'new',
      description: `Gain talent: ${talent}`
    }));
  }

  /**
   * Preview class features
   * @private
   */
  static _previewClassFeatures(actor, classId, level) {
    // This would pull from class data
    // Placeholder for now
    return [{
      feature: 'Class Feature',
      level,
      description: `Features gained at level ${level}`
    }];
  }

  /**
   * Preview ability score changes
   * @private
   */
  static _previewAbilities(actor, levelData) {
    const changes = [];

    // Check if this is a level divisible by 4 (ability increase level)
    if (levelData.level % 4 === 0) {
      changes.push({
        type: 'abilityIncrease',
        description: `Choose one ability score to increase by 1`,
        note: 'Ability score increase available at levels 4, 8, 12, etc.'
      });
    }

    return changes;
  }

  /**
   * Validate prerequisites for selections
   * @private
   */
  static _validatePrerequisites(actor, selections) {
    const warnings = [];

    // Validate feat prerequisites
    if (selections.feats) {
      for (const feat of selections.feats) {
        // Placeholder - would check actual prerequisites
        // if (!this._checkFeatPrereqs(actor, feat)) {
        //   warnings.push(`Warning: ${feat} prerequisites may not be met`);
        // }
      }
    }

    // Validate talent prerequisites
    if (selections.talents) {
      for (const talent of selections.talents) {
        // Placeholder - would check actual prerequisites
        // if (!this._checkTalentPrereqs(actor, talent)) {
        //   warnings.push(`Warning: ${talent} prerequisites may not be met`);
        // }
      }
    }

    return warnings;
  }

  /**
   * Get class HP die
   * @private
   */
  static _getClassHPDie(classId) {
    // Placeholder - would pull from class data
    const classHPDice = {
      'soldier': 10,
      'scout': 8,
      'scoundrel': 6,
      'noble': 8,
      'jedi': 8
    };

    return classHPDice[classId?.toLowerCase()] || 8;
  }

  /**
   * Display preview in a dialog
   * @param {Object} preview - Preview data
   * @returns {Promise<boolean>} True if user confirms, false if cancelled
   */
  static async showPreviewDialog(preview) {
    const content = this._formatPreviewHTML(preview);

    return new Promise(resolve => {
      new SWSEDialogV2({
        title: 'Level Up Preview',
        content,
        buttons: {
          confirm: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Apply Changes',
            callback: () => resolve(true)
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(false)
          }
        },
        default: 'confirm',
        close: () => resolve(false)
      }, {
        width: 600,
        classes: ['swse-progression-preview']
      }).render(true);
    });
  }

  /**
   * Format preview as HTML
   * @private
   */
  static _formatPreviewHTML(preview) {
    let html = `
      <div class="progression-preview">
        <h2>Level Up Preview: ${preview.actor}</h2>
        <p><strong>Current Level:</strong> ${preview.currentLevel} → <strong>New Level:</strong> ${preview.newLevel}</p>
        <p><strong>Class:</strong> ${preview.class}</p>
        <hr>
    `;

    // HP Changes
    if (preview.changes.hp) {
      const hp = preview.changes.hp;
      html += `
        <h3>Hit Points</h3>
        <p>${hp.current} → <strong>${hp.new}</strong> (+${hp.gain})</p>
        <p class="note">${hp.note}</p>
        <hr>
      `;
    }

    // Skills
    if (preview.changes.skills?.length > 0) {
      html += `<h3>Skills</h3><ul>`;
      for (const skill of preview.changes.skills) {
        html += `<li>${skill.description}</li>`;
      }
      html += `</ul><hr>`;
    }

    // Feats
    if (preview.changes.feats?.length > 0) {
      html += `<h3>Feats</h3><ul>`;
      for (const feat of preview.changes.feats) {
        html += `<li>${feat.description}</li>`;
      }
      html += `</ul><hr>`;
    }

    // Talents
    if (preview.changes.talents?.length > 0) {
      html += `<h3>Talents</h3><ul>`;
      for (const talent of preview.changes.talents) {
        html += `<li>${talent.description}</li>`;
      }
      html += `</ul><hr>`;
    }

    // Abilities
    if (preview.changes.abilities?.length > 0) {
      html += `<h3>Ability Scores</h3><ul>`;
      for (const ability of preview.changes.abilities) {
        html += `<li>${ability.description}</li>`;
        if (ability.note) {
          html += `<li class="note">${ability.note}</li>`;
        }
      }
      html += `</ul><hr>`;
    }

    // Warnings
    if (preview.warnings?.length > 0) {
      html += `<div class="warnings"><h3>⚠️ Warnings</h3><ul>`;
      for (const warning of preview.warnings) {
        html += `<li>${warning}</li>`;
      }
      html += `</ul></div><hr>`;
    }

    // Errors
    if (preview.errors?.length > 0) {
      html += `<div class="errors"><h3>❌ Errors</h3><ul>`;
      for (const error of preview.errors) {
        html += `<li>${error}</li>`;
      }
      html += `</ul></div>`;
    }

    html += `</div>`;

    return html;
  }

  /**
   * Console command to preview level-up
   */
  static async previewFromConsole(actorName, levelData) {
    const actor = game.actors.getName(actorName);

    if (!actor) {
      ui.notifications.error(`Actor "${actorName}" not found`);
      return;
    }

    const preview = await this.previewLevelUp(actor, levelData);

    await this.showPreviewDialog(preview);

    return preview;
  }
}

// Export for use in progression apps
export default ProgressionPreview;

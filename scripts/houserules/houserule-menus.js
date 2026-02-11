/**
 * SWSE Houserule Configuration Menus (Upgraded)
 * Modernizes all FormApplication classes for Foundry VTT V13–V15 compatibility
 * Includes safety, sanitation, error handling, and maintainability improvements.
 */

import SWSEFormApplicationV2 from '../apps/base/swse-form-application-v2.js';

const NAMESPACE = 'foundryvtt-swse';

/* -------------------------------------------------------------------------- */
/*                              UTILITY HELPERS                               */
/* -------------------------------------------------------------------------- */

function safeGet(setting) {
  try {
    return game.settings.get(NAMESPACE, setting);
  } catch (err) {
    console.error(`SWSE Houserules | Failed to read setting "${setting}"`, err);
    return null;
  }
}

function safeSet(setting, value) {
  try {
    return game.settings.set(NAMESPACE, setting, value);
  } catch (err) {
    console.error(`SWSE Houserules | Failed to save setting "${setting}"`, err);
  }
}

function _bool(v) {
  return v === true || v === 'true' || v === 'on' || v === '1';
}

function _num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/* ========================================================================== */
/*                         CHARACTER CREATION MENU                             */
/* ========================================================================== */

export class CharacterCreationMenu extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-character-creation-menu',
      title: 'Character Creation Rules',
      template: 'systems/foundryvtt-swse/templates/apps/houserules/character-creation.hbs',
      position: { width: 600, height: 'auto' },
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'abilities' }]
    }
  );


  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }
async _prepareContext(options) {
    return {
      ...safeGet('characterCreation'),
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    await safeSet('characterCreation', formData);
    ui.notifications.info('Character creation rules updated');
  }
}

/* ========================================================================== */
/*                              ADVANCEMENT MENU                               */
/* ========================================================================== */

export class AdvancementMenu extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-advancement-menu',
      title: 'Advancement Rules',
      template: 'systems/foundryvtt-swse/templates/apps/houserules/advancement.hbs',
      position: { width: 600, height: 'auto' },
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'levelup' }]
    }
  );

  async _prepareContext(options) {
    return {
      talentEveryLevel: safeGet('talentEveryLevel'),
      crossClassSkillTraining: safeGet('crossClassSkillTraining'),
      retrainingEnabled: safeGet('retrainingEnabled'),
      skillFocusVariant: safeGet('skillFocusVariant'),
      skillFocusActivationLevel: safeGet('skillFocusActivationLevel'),
      skillFocusRestriction: safeGet('skillFocusRestriction'),
      skillTrainingEnabled: safeGet('skillTrainingEnabled'),
      trainingPointsPerLevel: safeGet('trainingPointsPerLevel'),
      trainingPointsPerRest: safeGet('trainingPointsPerRest'),
      skillTrainingCap: safeGet('skillTrainingCap'),
      trainingCostScale: safeGet('trainingCostScale'),
      trainingRequiresTrainer: safeGet('trainingRequiresTrainer'),
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    await safeSet('talentEveryLevel', _bool(formData.talentEveryLevel));
    await safeSet('crossClassSkillTraining', _bool(formData.crossClassSkillTraining));
    await safeSet('retrainingEnabled', _bool(formData.retrainingEnabled));
    await safeSet('skillFocusVariant', formData.skillFocusVariant);
    await safeSet('skillFocusActivationLevel', _num(formData.skillFocusActivationLevel));

    const restriction = {
      useTheForce: _num(formData['skillFocusRestriction.useTheForce']),
      scaling: _bool(formData['skillFocusRestriction.scaling'])
    };

    await safeSet('skillFocusRestriction', restriction);

    // Skill Training settings
    await safeSet('skillTrainingEnabled', _bool(formData.skillTrainingEnabled));
    await safeSet('trainingPointsPerLevel', formData.trainingPointsPerLevel);
    await safeSet('trainingPointsPerRest', _num(formData.trainingPointsPerRest));
    await safeSet('skillTrainingCap', formData.skillTrainingCap);
    await safeSet('trainingCostScale', formData.trainingCostScale);
    await safeSet('trainingRequiresTrainer', _bool(formData.trainingRequiresTrainer));

    ui.notifications.info('Advancement rules updated');
  }
}

/* ========================================================================== */
/*                                COMBAT MENU                                 */
/* ========================================================================== */

export class CombatMenu extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-combat-menu',
      title: 'Combat Rules',
      template: 'systems/foundryvtt-swse/templates/apps/houserules/combat.hbs',
      position: { width: 600, height: 'auto' },
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'damage' }]
    }
  );

  async _prepareContext(options) {
    return {
      deathSystem: safeGet('deathSystem'),
      secondWindImproved: safeGet('secondWindImproved'),
      armoredDefenseForAll: safeGet('armoredDefenseForAll'),
      weaponRangeMultiplier: safeGet('weaponRangeMultiplier'),
      diagonalMovement: safeGet('diagonalMovement'),
      conditionTrackCap: safeGet('conditionTrackCap'),
      criticalHitVariant: safeGet('criticalHitVariant'),
      weaponFinesseDefault: safeGet('weaponFinesseDefault'),
      pointBlankShotDefault: safeGet('pointBlankShotDefault'),
      powerAttackDefault: safeGet('powerAttackDefault'),
      preciseShotDefault: safeGet('preciseShotDefault'),
      dodgeDefault: safeGet('dodgeDefault'),
      grappleEnabled: safeGet('grappleEnabled'),
      grappleVariant: safeGet('grappleVariant'),
      grappleDCBonus: safeGet('grappleDCBonus'),
      recoveryEnabled: safeGet('recoveryEnabled'),
      recoveryHPType: safeGet('recoveryHPType'),
      customRecoveryHP: safeGet('customRecoveryHP'),
      recoveryVitality: safeGet('recoveryVitality'),
      recoveryVitalityAmount: safeGet('recoveryVitalityAmount'),
      recoveryTiming: safeGet('recoveryTiming'),
      recoveryRequiresFullRest: safeGet('recoveryRequiresFullRest'),
      conditionTrackEnabled: safeGet('conditionTrackEnabled'),
      conditionTrackStartDamage: safeGet('conditionTrackStartDamage'),
      conditionTrackProgression: safeGet('conditionTrackProgression'),
      conditionTrackVariant: safeGet('conditionTrackVariant'),
      conditionTrackAutoApply: safeGet('conditionTrackAutoApply'),
      flankingEnabled: safeGet('flankingEnabled'),
      flankingBonus: safeGet('flankingBonus'),
      flankingRequiresConsciousness: safeGet('flankingRequiresConsciousness'),
      flankingLargeCreatures: safeGet('flankingLargeCreatures'),
      flankingDiagonalCounts: safeGet('flankingDiagonalCounts'),
      statusEffectsEnabled: safeGet('statusEffectsEnabled'),
      statusEffectsList: safeGet('statusEffectsList'),
      autoApplyFromConditionTrack: safeGet('autoApplyFromConditionTrack'),
      statusEffectDurationTracking: safeGet('statusEffectDurationTracking'),
      autoRemoveOnRest: safeGet('autoRemoveOnRest'),
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    const deathSystem = {
      system: formData['deathSystem.system'],
      strikesUntilDeath: _num(formData['deathSystem.strikesUntilDeath']),
      returnToHP: _num(formData['deathSystem.returnToHP']),
      strikeRemoval: formData['deathSystem.strikeRemoval'],
      displayStrikes: _bool(formData['deathSystem.displayStrikes']),
      deathAtNegativeCon: _bool(formData['deathSystem.deathAtNegativeCon']),
      massiveDamageThreshold: _num(formData['deathSystem.massiveDamageThreshold'])
    };

    await safeSet('deathSystem', deathSystem);
    await safeSet('secondWindImproved', _bool(formData.secondWindImproved));
    await safeSet('armoredDefenseForAll', _bool(formData.armoredDefenseForAll));
    await safeSet('weaponRangeMultiplier', _num(formData.weaponRangeMultiplier));
    await safeSet('diagonalMovement', formData.diagonalMovement);
    await safeSet('conditionTrackCap', _num(formData.conditionTrackCap));
    await safeSet('criticalHitVariant', formData.criticalHitVariant);
    await safeSet('weaponFinesseDefault', _bool(formData.weaponFinesseDefault));
    await safeSet('pointBlankShotDefault', _bool(formData.pointBlankShotDefault));
    await safeSet('powerAttackDefault', _bool(formData.powerAttackDefault));
    await safeSet('preciseShotDefault', _bool(formData.preciseShotDefault));
    await safeSet('dodgeDefault', _bool(formData.dodgeDefault));

    // Grapple settings
    await safeSet('grappleEnabled', _bool(formData.grappleEnabled));
    await safeSet('grappleVariant', formData.grappleVariant);
    await safeSet('grappleDCBonus', _num(formData.grappleDCBonus));

    // Recovery & Healing settings
    await safeSet('recoveryEnabled', _bool(formData.recoveryEnabled));
    await safeSet('recoveryHPType', formData.recoveryHPType);
    await safeSet('customRecoveryHP', _num(formData.customRecoveryHP));
    await safeSet('recoveryVitality', _bool(formData.recoveryVitality));
    await safeSet('recoveryVitalityAmount', _num(formData.recoveryVitalityAmount));
    await safeSet('recoveryTiming', formData.recoveryTiming);
    await safeSet('recoveryRequiresFullRest', _bool(formData.recoveryRequiresFullRest));

    // Condition Track settings
    await safeSet('conditionTrackEnabled', _bool(formData.conditionTrackEnabled));
    await safeSet('conditionTrackStartDamage', _num(formData.conditionTrackStartDamage));
    await safeSet('conditionTrackProgression', _num(formData.conditionTrackProgression));
    await safeSet('conditionTrackVariant', formData.conditionTrackVariant);
    await safeSet('conditionTrackAutoApply', _bool(formData.conditionTrackAutoApply));

    // Flanking settings
    await safeSet('flankingEnabled', _bool(formData.flankingEnabled));
    await safeSet('flankingBonus', formData.flankingBonus);
    await safeSet('flankingRequiresConsciousness', _bool(formData.flankingRequiresConsciousness));
    await safeSet('flankingLargeCreatures', formData.flankingLargeCreatures);
    await safeSet('flankingDiagonalCounts', _bool(formData.flankingDiagonalCounts));

    // Status Effects settings
    await safeSet('statusEffectsEnabled', _bool(formData.statusEffectsEnabled));
    await safeSet('statusEffectsList', formData.statusEffectsList);
    await safeSet('autoApplyFromConditionTrack', _bool(formData.autoApplyFromConditionTrack));
    await safeSet('statusEffectDurationTracking', formData.statusEffectDurationTracking);
    await safeSet('autoRemoveOnRest', _bool(formData.autoRemoveOnRest));

    ui.notifications.info('Combat rules updated');
  }
}

/* ========================================================================== */
/*                                FORCE MENU                                  */
/* ========================================================================== */

export class ForceMenu extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-force-menu',
      title: 'Force & Destiny Rules',
      template: 'systems/foundryvtt-swse/templates/apps/houserules/force.hbs',
      position: { width: 600, height: 'auto' }
    }
  );

  async _prepareContext(options) {
    return {
      forcePointRecovery: safeGet('forcePointRecovery'),
      darkSideTemptation: safeGet('darkSideTemptation'),
      darkSidePowerIncreaseScore: safeGet('darkSidePowerIncreaseScore'),
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    await safeSet('forcePointRecovery', formData.forcePointRecovery);
    await safeSet('darkSideTemptation', formData.darkSideTemptation);
    await safeSet('darkSidePowerIncreaseScore', _bool(formData.darkSidePowerIncreaseScore));
    ui.notifications.info('Force & Destiny rules updated');
  }
}

/* ========================================================================== */
/*                               PRESETS MENU                                 */
/* ========================================================================== */

export class PresetsMenu extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-presets-menu',
      title: 'Houserule Presets',
      template: 'systems/foundryvtt-swse/templates/apps/houserules/presets.hbs',
      position: { width: 500, height: 'auto' }
    }
  );

  async _prepareContext(options) {
    return {
      currentPreset: safeGet('houserulePreset'),
      isGM: game.user.isGM
    };
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    root.querySelectorAll("[data-action='apply-preset']").forEach(btn =>
      btn.addEventListener('click', e => this._onApplyPreset(e))
    );

    root.querySelector("[data-action='export-settings']")?.addEventListener('click', e =>
      this._onExportSettings(e)
    );

    root.querySelector("[data-action='import-settings']")?.addEventListener('click', e =>
      this._onImportSettings(e)
    );
  }

  async _onApplyPreset(event) {
    const preset = event.currentTarget.dataset.preset;

    const confirmed = await SWSEDialogV2.confirm({
      title: 'Apply Preset?',
      content: `<p>Overwrite all current houserule settings with the <strong>${preset}</strong> preset?</p>`
    });
    if (!confirmed) {return;}

    const presets = await import('./houserule-presets.js');
    await presets.applyPreset(preset);

    await safeSet('houserulePreset', preset);
    ui.notifications.info(`Applied ${preset} preset`);

    this.render();
  }

  async _onExportSettings() {
    const settings = game.settings.storage
      .get('world')
      .filter(s => s.key.startsWith(NAMESPACE))
      .reduce((obj, s) => {
        obj[s.key.replace(`${NAMESPACE}.`, '')] = s.value;
        return obj;
      }, {});

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'swse-houserules.json';
    a.click();

    URL.revokeObjectURL(url);
  }

  async _onImportSettings() {
    new SWSEDialogV2({
      title: 'Import Houserule Settings',
      content: `
        <form>
          <div class="form-group">
            <label>Select JSON file:</label>
            <input type="file" name="import-file" accept=".json"/>
          </div>
        </form>
      `,
      buttons: {
        import: {
          label: 'Import',
          callback: async html => {
            const file = html[0].querySelector("[name='import-file']")?.files[0];
            if (!file) {return;}

            const text = await file.text();
            const json = JSON.parse(text);

            for (const [key, value] of Object.entries(json)) {
              await safeSet(key, value);
            }

            ui.notifications.info('Settings imported');
            this.render();
          }
        },
        cancel: { label: 'Cancel' }
      }
    }).render(true);
  }
}

/* ========================================================================== */
/*                        SKILLS & FEATS MENU                                 */
/* ========================================================================== */

export class SkillsFeatsMenu extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-skills-feats-menu',
      title: 'Skills & Feats Rules',
      template: 'systems/foundryvtt-swse/templates/apps/houserules/skills-feats.hbs',
      position: { width: 600, height: 'auto' },
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'skills' }]
    }
  );

  async _prepareContext(options) {
    return {
      feintSkill: safeGet('feintSkill'),
      skillFocusVariant: safeGet('skillFocusVariant'),
      skillFocusActivationLevel: safeGet('skillFocusActivationLevel'),
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    await safeSet('feintSkill', formData.feintSkill);
    await safeSet('skillFocusVariant', formData.skillFocusVariant);
    await safeSet('skillFocusActivationLevel', _num(formData.skillFocusActivationLevel));

    ui.notifications.info('Skills & Feats rules updated');
  }
}

/* ========================================================================== */
/*                         SPACE COMBAT MENU                                  */
/* ========================================================================== */

export class SpaceCombatMenu extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-space-combat-menu',
      title: 'Space Combat Rules',
      template: 'systems/foundryvtt-swse/templates/apps/houserules/space-combat.hbs',
      position: { width: 600, height: 'auto' },
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'initiative' }]
    }
  );

  async _prepareContext(options) {
    return {
      spaceInitiativeSystem: safeGet('spaceInitiativeSystem'),
      initiativeRolePriority: safeGet('initiativeRolePriority'),
      weaponsOperatorsRollInit: safeGet('weaponsOperatorsRollInit'),
      isGM: game.user.isGM
    };
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    const list = root.querySelector('.role-priority-list');
    if (!list) {return;}

    this._activateDragAndDrop(list);
  }

  _activateDragAndDrop(list) {
    let dragging = null;

    list.querySelectorAll('li').forEach(li => {
      li.draggable = true;

      li.addEventListener('dragstart', evt => {
        dragging = li;
        li.classList.add('dragging');
        evt.dataTransfer.effectAllowed = 'move';
      });

      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        dragging = null;
      });

      li.addEventListener('dragover', evt => {
        evt.preventDefault();

        const after = this._getDragAfter(list, evt.clientY);
        if (after) {list.insertBefore(dragging, after);} else {list.appendChild(dragging);}
      });
    });
  }

  _getDragAfter(container, y) {
    const items = [...container.querySelectorAll('li:not(.dragging)')];

    return items.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - (box.top + box.height / 2);
        return offset < 0 && offset > closest.offset
          ? { offset, element: child }
          : closest;
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  async _updateObject(event, formData) {
    await safeSet('spaceInitiativeSystem', formData.spaceInitiativeSystem);
    await safeSet('weaponsOperatorsRollInit', _bool(formData.weaponsOperatorsRollInit));

    // Save new role priority
    const list = this.element?.querySelector('.role-priority-list');
    if (list) {
      const ordered = [...list.querySelectorAll('li')].map(li => li.dataset.role);
      await safeSet('initiativeRolePriority', ordered);
    }

    ui.notifications.info('Space Combat rules updated');
  }
}

/* ========================================================================== */
/*                        CHARACTER RESTRICTIONS MENU                         */
/* ========================================================================== */

export class CharacterRestrictionsMenu extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-character-restrictions-menu',
      title: 'Character Creation - Restrictions & Backgrounds',
      template: 'systems/foundryvtt-swse/templates/apps/houserules/character-restrictions.hbs',
      position: { width: 600, height: 'auto' },
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'backgrounds' }]
    }
  );

  async _prepareContext(options) {
    const enableBackgrounds = safeGet('enableBackgrounds');
    const bannedSpeciesStr = safeGet('bannedSpecies') || '';
    const bannedSpeciesList = bannedSpeciesStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Load species from compendium
    let availableSpecies = [];
    try {
      const speciesPack = game.packs.get('foundryvtt-swse.species');
      if (speciesPack) {
        const species = await speciesPack.getDocuments();
        availableSpecies = species.map(s => ({
          name: s.name,
          id: s.id
        }));
      }
    } catch (err) {
      console.error('Failed to load species list:', err);
    }

    return {
      enableBackgrounds: enableBackgrounds ?? true,
      bannedSpeciesList,
      availableSpecies,
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    // Update backgrounds setting
    const enableBackgrounds = _bool(formData.enableBackgrounds);
    await safeSet('enableBackgrounds', enableBackgrounds);

    // Process banned species checkboxes
    let bannedSpecies = [];
    if (formData.bannedSpecies) {
      // formData.bannedSpecies is either a string (single) or array (multiple)
      if (Array.isArray(formData.bannedSpecies)) {
        bannedSpecies = formData.bannedSpecies;
      } else if (typeof formData.bannedSpecies === 'string' && formData.bannedSpecies.length > 0) {
        bannedSpecies = [formData.bannedSpecies];
      }
    }

    const bannedSpeciesStr = bannedSpecies.join(', ');
    await safeSet('bannedSpecies', bannedSpeciesStr);

    ui.notifications.info('Character restrictions updated');
  }
}

// ============================================
// SWSE Character Generator - IMPROVED
import { SWSELogger } from '../utils/logger.js';
// Fully integrated with houserules and database
// Multi-level support with automatic progression
// ============================================

import CharacterGenerator from './chargen/chargen-main.js';
import { getClassProperty, getHitDie, getTrainedSkills, getTalentTrees } from './chargen/chargen-property-accessor.js';
import { createActor } from '../core/document-api-v13.js';
import { ActorEngine } from '../governance/actor-engine/actor-engine.js';

export default class CharacterGeneratorImproved extends CharacterGenerator {

  constructor(actor = null, options = {}) {
    super(actor, options);
    this.targetLevel = options.targetLevel || 1; // Target level for character creation
    this.createdActor = null; // Store the created actor for level-up
  }

  async _prepareContext() {
    const context = await super._prepareContext();

    // Get GM's ability generation method from houserules (with safe fallback)
    try {
      context.abilityMethod = game.settings.get('foundryvtt-swse', 'abilityScoreMethod') || 'pointbuy';
    } catch (err) {
      context.abilityMethod = 'pointbuy';
    }

    // Use droid or living point buy pool based on character type
    if (this.characterData.isDroid) {
      try {
        context.pointBuyPool = game.settings.get('foundryvtt-swse', 'droidPointBuyPool') || 20;
      } catch (err) {
        context.pointBuyPool = 20;
      }
    } else {
      try {
        context.pointBuyPool = game.settings.get('foundryvtt-swse', 'livingPointBuyPool') || 25;
      } catch (err) {
        context.pointBuyPool = 25;
      }
    }

    // Add target level
    context.targetLevel = this.targetLevel;

    // Add ability method labels
    context.methodLabels = {
      '4d6drop': '4d6 Drop Lowest',
      'organic': 'Organic (24d6)',
      'pointbuy': 'Point Buy',
      'array': 'Standard Array',
      '3d6': '3d6 Straight',
      '2d6plus6': '2d6+6'
    };

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    // AppV2 invariant:
    // _onRender receives NO html/jQuery object.
    // All DOM access must use this.element (HTMLElement).

    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    // Level selection
    const levelInput = root.querySelector('#target-level-input');
    if (levelInput) {
      levelInput.addEventListener('change', this._onLevelChange.bind(this));
    }

    // Free Build button
    const freeBuildBtn = root.querySelector('#free-build-btn');
    if (freeBuildBtn) {
      freeBuildBtn.addEventListener('click', this._onFreeBuild.bind(this));
    }

    // Class preview
    for (const button of root.querySelectorAll('.choice-button[data-class]')) {
      button.addEventListener('mouseenter', (e) => this._showClassPreview(e));
      button.addEventListener('mouseleave', () => this._hideClassPreview());
    }
  }

  // ========================================
  // LEVEL SELECTION
  // ========================================
  async _onLevelChange(event) {
    const newLevel = Math.max(1, Math.min(20, parseInt(event.target.value, 10) || 1));

    // Warn user about multi-level limitations
    if (newLevel > 1 && this.targetLevel === 1) {
      const confirmed = await SWSEDialogV2.confirm({
        title: 'Multi-Level Character Creation',
        content: `
          <div style="margin-bottom: 10px;">
            <p><strong>Creating a level ${newLevel} character</strong></p>
            <p>Multi-level creation will automatically apply:</p>
            <ul style="margin-left: 20px; margin-top: 10px;">
              <li>✓ Hit Points (based on houserule settings)</li>
              <li>✓ Level-based progression</li>
            </ul>
            <p style="margin-top: 10px;"><strong>You will NOT be able to select:</strong></p>
            <ul style="margin-left: 20px; margin-top: 10px;">
              <li>✗ Feats for bonus feat levels</li>
              <li>✗ Talents for each level</li>
              <li>✗ Skill training choices</li>
              <li>✗ Ability score increases (levels 4, 8, 12, 16, 20)</li>
            </ul>
            <p style="margin-top: 15px; color: #999; font-size: 0.9em;">
              <em>Tip: For full customization, create at level 1 and use the level-up system.</em>
            </p>
          </div>
        `,
        defaultYes: false
      });

      if (!confirmed) {
        // Reset the select element back to current level
        event.target.value = this.targetLevel;
        return;
      }
    }

    this.targetLevel = newLevel;
    SWSELogger.log(`SWSE CharGen | Target level set to ${this.targetLevel}`);
  }

  // ========================================
  // FREE BUILD - Manual Entry
  // ========================================
  _onFreeBuild(event) {
    event.preventDefault();

    const root = this.element;
    const ablist = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    // Enable all inputs for manual entry
    ablist.forEach(ab => {
      const input = root.querySelector(`[name="ability_${ab}"]`);
      if (input) {
        input.disabled = false;
        input.readOnly = false;
        input.min = 3;
        input.max = 25;
        input.value = this.characterData.abilities[ab].base || 10;

        input.addEventListener('input', (ev) => {
          const val = Math.max(3, Math.min(25, Number(ev.target.value) || 10));
          ev.target.value = val;
          this.characterData.abilities[ab].base = val;
          this._recalcAbilities();
          this._updateAbilityDisplay(root, ab);
        });
      }
    });

    // Hide other UI elements
    root.querySelectorAll('.ability-mode').forEach(el => el.style.display = 'none');
    root.querySelector('#free-mode').style.display = 'block';

    ui.notifications.info('Free Build enabled - manually enter any ability scores (3-25)');
  }

  _updateAbilityDisplay(html, ability) {
    const display = html.querySelector(`#display_${ability}`);
    if (display) {
      const total = this.characterData.abilities[ability].total || 10;
      const mod = this.characterData.abilities[ability].mod || 0;
      display.textContent = `Total: ${total} (Mod: ${mod >= 0 ? '+' : ''}${mod})`;
    }
  }

  // ========================================
  // CLASS INTEGRATION - Enhanced
  // ========================================
  async _onSelectClass(event) {
    event.preventDefault();
    const className = event.currentTarget.dataset.class;

    // Find class document from compendium
    const classDoc = this._packs.classes.find(c => c.name === className || c._id === className);

    if (!classDoc) {
      ui.notifications.error(`Class ${className} not found in database!`);
      return;
    }

    this.characterData.class = classDoc;

    // Also add to classes array for validation
    if (!this.characterData.classes) {
      this.characterData.classes = [];
    }
    // Only add if not already in the array
    if (!this.characterData.classes.some(c => c.name === classDoc.name)) {
      this.characterData.classes.push(classDoc);
    }

    SWSELogger.log(`SWSE CharGen | Selected class: ${className}`, classDoc.system);

    // Apply class data from database
    await this._applyClassData(classDoc);

    // Move to next step using parent's method
    await this._onNextStep(event);
  }

  async _applyClassData(classDoc) {
    const classSystem = classDoc.system;

    // Store class information using property accessor for consistent naming
    this.characterData.classData = {
      name: classDoc.name,
      hitDie: getHitDie(classDoc),
      babProgression: getClassProperty(classDoc, 'babProgression', 0),
      trainedSkills: getTrainedSkills(classDoc),
      classSkills: getClassProperty(classDoc, 'classSkills', []),
      talentTrees: getTalentTrees(classDoc),
      forceSensitive: classSystem.forceSensitive || false,
      forcePoints: classSystem.forcePointProgression || 0,
      defenses: classSystem.defenseProgression || { fortitude: 0, reflex: 0, will: 0 },
      startingFeatures: getClassProperty(classDoc, 'startingFeatures', [])
    };

    // Apply defense bonuses
    this.characterData.defenses = {
      fortitude: classSystem.defenseProgression?.fortitude || 0,
      reflex: classSystem.defenseProgression?.reflex || 0,
      will: classSystem.defenseProgression?.will || 0
    };

    // Calculate HP based on hitDie and CON modifier
    const hitDie = getHitDie(classDoc);

    // Level 1 always gets 5x hit die HP
    this.characterData.hp = {
      value: hitDie * 5,
      max: hitDie * 5,
      temp: 0
    };

    SWSELogger.log(`SWSE CharGen | HP: ${this.characterData.hp.max} (${hitDie} * 5)`);

    // Auto-apply starting feats if any
    if (classSystem.startingFeatures) {
      classSystem.startingFeatures.forEach(feature => {
        if (feature.type === 'proficiency' || feature.type === 'class_feature') {
          SWSELogger.log(`SWSE CharGen | Auto-applying: ${feature.name}`);
        }
      });
    }
  }

  _showClassPreview(event) {
    const className = event.currentTarget.dataset.class;
    const classDoc = this._packs.classes.find(c => c.name === className);

    if (!classDoc) {return;}

    const hitDie = getHitDie(classDoc);
    const babProgression = getClassProperty(classDoc, 'babProgression', 0);
    const trainedSkills = getTrainedSkills(classDoc);
    const forceSensitive = classDoc.system.forceSensitive || false;
    const forcePointProgression = classDoc.system.forcePointProgression || 0;
    const defenseProgression = classDoc.system.defenseProgression || { fortitude: 0, reflex: 0, will: 0 };

    const preview = `
      <div class="class-preview-tooltip">
        <h4>${classDoc.name}</h4>
        <p><strong>Hit Die:</strong> d${hitDie}</p>
        <p><strong>BAB:</strong> +${babProgression}</p>
        <p><strong>Trained Skills:</strong> ${trainedSkills}</p>
        <p><strong>Force Sensitive:</strong> ${forceSensitive ? 'Yes' : 'No'}</p>
        ${forceSensitive ? `<p><strong>Force Points:</strong> ${forcePointProgression}</p>` : ''}
        <p><strong>Defenses:</strong> Fort ${defenseProgression.fortitude} / Ref ${defenseProgression.reflex} / Will ${defenseProgression.will}</p>
      </div>
    `;

    // Show tooltip (implementation varies based on your UI framework)
    SWSELogger.log(preview);
  }

  _hideClassPreview() {
    // Hide tooltip
  }

  // ========================================
  // CHARACTER FINALIZATION
  // ========================================
  async _finish() {
    try {
      // Create the base level 1 character
      const actor = await this._createCharacterActor();

      if (!actor) {
        ui.notifications.error('Failed to create character!');
        return;
      }

      this.createdActor = actor;
      ui.notifications.success(`${actor.name} created at level 1!`);

      // Emit progression completion hook for modules (language initialization, etc.)
      Hooks.call('swse:progression:completed', {
        actor: actor,
        mode: 'chargen',
        level: actor.system.level || 1
      });

      // Apply houserule bonuses
      await this._applyHouseruleBonuses(actor);

      // Add imported droid equipment if applicable
      if (this.characterData.importedDroidData) {
        await this._addImportedDroidEquipment(actor, this.characterData.importedDroidData);
      }

      // If target level > 1, automatically level up
      if (this.targetLevel > 1) {
        await this._autoLevelUp(actor);
      }

      // Close the character generator
      this.close();

      // Open the character sheet
      actor.sheet.render(true);

    } catch (err) {
      SWSELogger.error('SWSE CharGen | Error creating character:', err);
      ui.notifications.error(`Character creation failed: ${err.message}`);
    }
  }

  async _createCharacterActor() {
    const classData = this.characterData.classData;
    const conMod = this.characterData.isDroid ? 0 : (this.characterData.abilities.con.mod || 0);

    // Calculate starting HP: use stored HP (from _applyClassData) + Con modifier, or fallback
    const baseHp = this.characterData.hp?.max ?? (classData.hitDie * 5);
    const startingHp = baseHp + conMod;

    // Build actor data
    const actorData = {
      name: this.characterData.name || 'New Character',
      type: 'character',
      system: {
        isDroid: this.characterData.isDroid || false,
        droidDegree: this.characterData.droidDegree || '',
        species: this.characterData.isDroid ? this.characterData.droidDegree : this.characterData.species,
        abilities: {
          str: { base: this.characterData.abilities.str.base || 10, racial: this.characterData.abilities.str.racial || 0 },
          dex: { base: this.characterData.abilities.dex.base || 10, racial: this.characterData.abilities.dex.racial || 0 },
          con: { base: this.characterData.isDroid ? 0 : (this.characterData.abilities.con.base || 10), racial: 0 },
          int: { base: this.characterData.abilities.int.base || 10, racial: this.characterData.abilities.int.racial || 0 },
          wis: { base: this.characterData.abilities.wis.base || 10, racial: this.characterData.abilities.wis.racial || 0 },
          cha: { base: this.characterData.abilities.cha.base || 10, racial: this.characterData.abilities.cha.racial || 0 }
        },
        hp: {
          value: startingHp,
          max: startingHp,
          temp: 0
        },
        level: 1,
        class: classData.name,
        defenses: this.characterData.defenses,
        bab: classData.babProgression,
        skills: {},
        feats: [],
        talents: [],
        forceSensitive: classData.forceSensitive,
        forcePoints: classData.forceSensitive ? classData.forcePoints : 0
      }
    };

    SWSELogger.log('SWSE CharGen | Creating actor with data:', actorData);

    const actor = await createActor(actorData);
    return actor;
  }

  // ========================================
  // IMPORTED DROID EQUIPMENT
  // ========================================
  async _addImportedDroidEquipment(actor, droid) {
    try {
      if (!droid.system || !droid.system.equipment) {
        SWSELogger.log('SWSE CharGen | No equipment found for imported droid');
        return;
      }

      const items = Array.isArray(droid.system.equipment)
        ? droid.system.equipment
        : Object.values(droid.system.equipment || {});

      if (items.length > 0) {
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', items);
        SWSELogger.log(`SWSE CharGen | Added ${items.length} equipment items from imported droid`);
        ui.notifications.info(`Added ${items.length} equipment items from droid template`);
      }
    } catch (err) {
      SWSELogger.error('SWSE CharGen | Error adding imported droid equipment:', err);
    }
  }

  // ========================================
  // HOUSERULE BONUSES
  // ========================================
  async _applyHouseruleBonuses(actor) {
    // Auto-grant Weapon Finesse if houserule is enabled
    let weaponFinesseDefault = false;
    try {
      weaponFinesseDefault = game.settings.get('foundryvtt-swse', 'weaponFinesseDefault');
    } catch (err) {
      weaponFinesseDefault = false;
    }

    if (weaponFinesseDefault) {
      SWSELogger.log('SWSE CharGen | Auto-granting Weapon Finesse (houserule)');

      // Find Weapon Finesse feat in compendium
      const featPack = game.packs.get('foundryvtt-swse.feats');
      if (featPack) {
        const feats = await featPack.getDocuments();
        const weaponFinesse = feats.find(f => f.name === 'Weapon Finesse');

        if (weaponFinesse) {
          await ActorEngine.createEmbeddedDocuments(actor, 'Item', [weaponFinesse.toObject()]);
          ui.notifications.info('Weapon Finesse feat automatically granted!');
        }
      }
    }

    // Log block/deflect houserule setting for reference
    let blockDeflectTalents = 'separate';
    try {
      blockDeflectTalents = game.settings.get('foundryvtt-swse', 'blockDeflectTalents');
    } catch (err) {
      blockDeflectTalents = 'separate';
    }

    if (blockDeflectTalents === 'combined') {
      SWSELogger.log('SWSE CharGen | Block/Deflect set to combined (houserule)');
    }
  }

  // ========================================
  // AUTOMATIC LEVEL-UP PROGRESSION
  // ========================================
  async _autoLevelUp(actor) {
    const currentLevel = 1;
    const targetLevel = this.targetLevel;

    ui.notifications.info(`Automatically leveling up to level ${targetLevel}...`);

    for (let level = currentLevel + 1; level <= targetLevel; level++) {
      await this._performLevelUp(actor, level);
    }

    ui.notifications.success(`${actor.name} is now level ${targetLevel}!`);
  }

  async _performLevelUp(actor, newLevel) {
    SWSELogger.log(`SWSE CharGen | Leveling up to level ${newLevel}`);

    const classData = this.characterData.classData;
    const conMod = this.characterData.isDroid ? 0 : (this.characterData.abilities.con.mod || 0);

    // Calculate HP gain based on houserule settings
    let hpGeneration = 'average';
    let maxHPLevels = 1;
    try {
      hpGeneration = game.settings.get('foundryvtt-swse', 'hpGeneration') || 'average';
      maxHPLevels = game.settings.get('foundryvtt-swse', 'maxHPLevels') || 1;
    } catch (err) {
      hpGeneration = 'average';
      maxHPLevels = 1;
    }

    let hpGain = 0;
    const hitDie = classData.hitDie;

    if (newLevel <= maxHPLevels) {
      // Levels within maxHPLevels get maximum HP
      hpGain = hitDie + conMod;
      SWSELogger.log(`SWSE CharGen | Level ${newLevel} gets max HP: ${hpGain}`);
    } else {
      // Apply HP generation method
      switch (hpGeneration) {
        case 'maximum':
          hpGain = hitDie + conMod;
          break;
        case 'average':
          hpGain = Math.floor(hitDie / 2) + 1 + conMod;
          break;
        case 'roll':
          hpGain = Math.floor(Math.random() * hitDie) + 1 + conMod;
          break;
        case 'average_minimum': {
          const rolled = Math.floor(Math.random() * hitDie) + 1;
          const average = Math.floor(hitDie / 2) + 1;
          hpGain = Math.max(rolled, average) + conMod;
          break;
        }
        default:
          hpGain = Math.floor(hitDie / 2) + 1 + conMod;
      }
      SWSELogger.log(`SWSE CharGen | Level ${newLevel} HP roll (${hpGeneration}): ${hpGain}`);
    }

    // Update actor
    const currentHP = actor.system.hp.max || 0;
    const newHP = currentHP + hpGain;

    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.level': newLevel,
      'system.hp.max': newHP,
      'system.hp.value': newHP
    });

    SWSELogger.log(`SWSE CharGen | Level ${newLevel} complete. HP: ${currentHP} -> ${newHP}`);
  }
}

// ============================================
// SWSE Character Generator - IMPROVED
// Fully integrated with houserules and database
// ============================================

import CharacterGenerator from './chargen.js';

export default class CharacterGeneratorImproved extends CharacterGenerator {

  async getData() {
    const context = await super.getData();

    // Get GM's ability generation method from houserules
    context.abilityMethod = game.settings.get("swse", "abilityScoreMethod") || "pointbuy";
    context.pointBuyPool = game.settings.get("swse", "pointBuyPool") || 32;

    // Add ability method labels
    context.methodLabels = {
      "4d6drop": "4d6 Drop Lowest",
      "organic": "Organic (24d6)",
      "pointbuy": "Point Buy",
      "array": "Standard Array",
      "3d6": "3d6 Straight",
      "2d6plus6": "2d6+6"
    };

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Free Build button
    html.find('#free-build-btn').click(this._onFreeBuild.bind(this));

    // Class preview
    html.find('.choice-button[data-class]').hover(
      (e) => this._showClassPreview(e),
      () => this._hideClassPreview()
    );
  }

  // ========================================
  // FREE BUILD - Manual Entry
  // ========================================
  _onFreeBuild(event) {
    event.preventDefault();

    const html = this.element[0];
    const ablist = ["str", "dex", "con", "int", "wis", "cha"];

    // Enable all inputs for manual entry
    ablist.forEach(ab => {
      const input = html.querySelector(`[name="ability_${ab}"]`);
      if (input) {
        input.disabled = false;
        input.readOnly = false;
        input.min = 3;
        input.max = 25;
        input.value = this.characterData.abilities[ab].base || 10;

        input.oninput = (ev) => {
          const val = Math.max(3, Math.min(25, Number(ev.target.value) || 10));
          ev.target.value = val;
          this.characterData.abilities[ab].base = val;
          this._recalcAbilities();
          this._updateAbilityDisplay(html, ab);
        };
      }
    });

    // Hide other UI elements
    html.querySelectorAll('.ability-mode').forEach(el => el.style.display = 'none');
    html.querySelector('#free-mode')?.style.display = 'block';

    ui.notifications.info("Free Build enabled - manually enter any ability scores (3-25)");
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

    // Add class with level 1
    this.characterData.classes.push({ name: className, level: 1 });

    console.log("SWSE CharGen | Applying class data:", classDoc);

    // Apply class-based values from database
    const system = classDoc.system || {};

    // Base Attack Bonus
    this.characterData.bab = Number(system.babProgression || system.bab) || 0;

    // Hit Points (class HD + CON mod, first level is max)
    const hitDie = Number(system.hitDie || 6);
    const conMod = this.characterData.abilities.con.mod || 0;
    this.characterData.hp.max = hitDie + conMod;
    this.characterData.hp.value = this.characterData.hp.max;

    // Defense bonuses from class
    if (system.defenseProgression) {
      this.characterData.defenses.fortitude.classBonus = Number(system.defenseProgression.fortitude) || 0;
      this.characterData.defenses.reflex.classBonus = Number(system.defenseProgression.reflex) || 0;
      this.characterData.defenses.will.classBonus = Number(system.defenseProgression.will) || 0;
    } else if (system.defenses) {
      this.characterData.defenses.fortitude.classBonus = Number(system.defenses.fortitude) || 0;
      this.characterData.defenses.reflex.classBonus = Number(system.defenses.reflex) || 0;
      this.characterData.defenses.will.classBonus = Number(system.defenses.will) || 0;
    }

    // Trained skills available
    this.characterData.trainedSkillsAllowed = Number(system.trainedSkills || system.skillPoints) || 0;

    // Force Points (if Force-sensitive class)
    if (system.forceSensitive) {
      this.characterData.forcePoints.max = 5 + Math.floor(this.characterData.level / 2);
      this.characterData.forcePoints.value = this.characterData.forcePoints.max;
      this.characterData.forcePoints.die = "1d6";
    }

    // Starting feats from class (if specified)
    if (system.startingFeats && Array.isArray(system.startingFeats)) {
      for (const featName of system.startingFeats) {
        const feat = this._packs.feats.find(f => f.name === featName);
        if (feat && !this.characterData.feats.find(f => f.name === feat.name)) {
          this.characterData.feats.push(feat);
          console.log(`SWSE CharGen | Auto-added class feat: ${featName}`);
        }
      }
    }

    // Class features (talents, special abilities)
    if (system.classFeatures && Array.isArray(system.classFeatures)) {
      for (const feature of system.classFeatures) {
        if (feature.level === 1 || !feature.level) {
          // This is a 1st level feature
          if (feature.type === "talent") {
            const talent = this._packs.talents.find(t => t.name === feature.name);
            if (talent && !this.characterData.talents.find(t => t.name === talent.name)) {
              this.characterData.talents.push(talent);
              console.log(`SWSE CharGen | Auto-added class talent: ${feature.name}`);
            }
          }
        }
      }
    }

    // Recalculate defenses
    this._recalcDefenses();

    ui.notifications.info(`${className} selected! Defense bonuses and class features applied.`);

    await this._onNextStep(event);
  }

  _showClassPreview(event) {
    const className = event.currentTarget.dataset.class;
    const classDoc = this._packs.classes.find(c => c.name === className);

    if (!classDoc || !classDoc.system) return;

    const preview = this.element.find('.class-preview-panel');
    if (preview.length === 0) {
      const panel = $(`
        <div class="class-preview-panel">
          <h4>${className}</h4>
          <dl>
            <dt>Hit Die:</dt><dd>d${classDoc.system.hitDie || 6}</dd>
            <dt>BAB:</dt><dd>${classDoc.system.babProgression || classDoc.system.bab || 0}</dd>
            <dt>Defense Bonuses:</dt>
            <dd>
              Fort: +${classDoc.system.defenses?.fortitude || classDoc.system.defenseProgression?.fortitude || 0},
              Ref: +${classDoc.system.defenses?.reflex || classDoc.system.defenseProgression?.reflex || 0},
              Will: +${classDoc.system.defenses?.will || classDoc.system.defenseProgression?.will || 0}
            </dd>
            <dt>Trained Skills:</dt><dd>${classDoc.system.trainedSkills || classDoc.system.skillPoints || 0}</dd>
            <dt>Force Sensitive:</dt><dd>${classDoc.system.forceSensitive ? 'Yes' : 'No'}</dd>
          </dl>
        </div>
      `);
      this.element.find('.chargen-body').append(panel);
    }
  }

  _hideClassPreview() {
    this.element.find('.class-preview-panel').remove();
  }

  // ========================================
  // ENHANCED ABILITIES BINDING
  // ========================================
  _bindAbilitiesUI(root) {
    const doc = root || this.element[0];
    const method = game.settings.get("swse", "abilityScoreMethod") || "pointbuy";
    const pool = game.settings.get("swse", "pointBuyPool") || 32;

    // Based on GM setting, initialize the appropriate method
    switch(method) {
      case "pointbuy":
        this._initPointBuy(doc, pool);
        break;
      case "4d6drop":
      case "array":
        this._initStandardRoll(doc, method);
        break;
      case "organic":
        this._initOrganicRoll(doc);
        break;
      case "3d6":
      case "2d6plus6":
        this._initSimpleRoll(doc, method);
        break;
    }

    // Always show free build button
    const freeBuildBtn = doc.querySelector('#free-build-btn');
    if (freeBuildBtn) {
      freeBuildBtn.style.display = 'inline-block';
    }
  }

  _initPointBuy(doc, pool) {
    // Point buy implementation from parent class
    const pbInit = doc.querySelector("#pb-init");
    if (pbInit) pbInit.click();

    // Update pool display
    const remaining = doc.querySelector("#point-remaining");
    if (remaining) remaining.textContent = pool;
  }

  _initStandardRoll(doc, method) {
    const stdBtn = doc.querySelector("#std-roll-btn");
    if (stdBtn) stdBtn.click();
  }

  _initOrganicRoll(doc) {
    const orgBtn = doc.querySelector("#org-roll-btn");
    if (orgBtn) orgBtn.click();
  }

  _initSimpleRoll(doc, method) {
    // For 3d6 or 2d6+6, automatically roll
    const ablist = ["str", "dex", "con", "int", "wis", "cha"];
    ablist.forEach(ab => {
      let roll;
      if (method === "3d6") {
        roll = new Roll("3d6").evaluate({ async: false });
      } else if (method === "2d6plus6") {
        roll = new Roll("2d6+6").evaluate({ async: false });
      }

      if (roll) {
        const input = doc.querySelector(`[name="ability_${ab}"]`);
        if (input) {
          input.value = roll.total;
          this.characterData.abilities[ab].base = roll.total;
        }
      }
    });

    this._recalcAbilities();
    ablist.forEach(ab => this._updateAbilityDisplay(doc, ab));
  }

  // ========================================
  // ENHANCED FINALIZATION
  // ========================================
  _finalizeCharacter() {
    super._finalizeCharacter();

    // Additional validation
    const totalMods = Object.values(this.characterData.abilities)
      .reduce((sum, ab) => sum + (ab.mod || 0), 0);

    console.log("SWSE CharGen | Final character data:", this.characterData);
    console.log(`SWSE CharGen | Total ability modifiers: ${totalMods}`);

    // Check if rerolls are allowed and total is too low
    if (game.settings.get("swse", "allowAbilityReroll") && totalMods < 0) {
      ui.notifications.warn("Total ability modifiers are negative. Consider rerolling if allowed.");
    }
  }
}

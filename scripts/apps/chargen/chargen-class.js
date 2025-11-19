// ============================================
// Class selection and features for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';

/**
 * Handle class selection
 */
export async function _onSelectClass(event) {
  event.preventDefault();
  const className = event.currentTarget.dataset.class;

  // Find class document
  const classDoc = this._packs.classes.find(c => c.name === className || c._id === className);

  if (!classDoc) {
    SWSELogger.error(`CharGen | Class not found: ${className}`);
    ui.notifications.error(`Class "${className}" not found in compendium.`);
    return;
  }

  // Clear any existing classes and add the selected one
  this.characterData.classes = [];
  this.characterData.classes.push({ name: className, level: 1 });

  SWSELogger.log(`CharGen | Selected class: ${className}, classes array:`, this.characterData.classes);

  // Set class-based values
  if (classDoc && classDoc.system) {
    // Base Attack Bonus
    this.characterData.bab = Number(classDoc.system.babProgression) || 0;

    // Hit Points (5 times hit die at level 1)
    // Parse hit die from string like "1d10" to get the die size (10)
    const hitDieString = classDoc.system.hit_die || classDoc.system.hitDie || "1d6";
    const hitDie = parseInt(hitDieString.match(/\d+d(\d+)/)?.[1] || "6");
    this.characterData.hp.max = hitDie * 5; // Level 1 HP is 5x hit die (e.g., d6=30, d8=40, d10=50)
    this.characterData.hp.value = this.characterData.hp.max;

    // Defense bonuses
    if (classDoc.system.defenses) {
      this.characterData.defenses.fortitude.classBonus = Number(classDoc.system.defenses.fortitude) || 0;
      this.characterData.defenses.reflex.classBonus = Number(classDoc.system.defenses.reflex) || 0;
      this.characterData.defenses.will.classBonus = Number(classDoc.system.defenses.will) || 0;
    }

    // Trained skills available (class base + INT modifier, minimum 1)
    const classSkills = Number(classDoc.system.trained_skills || classDoc.system.trainedSkills) || 0;
    const intMod = this.characterData.abilities.int.mod || 0;
    const humanBonus = (this.characterData.species === "Human" || this.characterData.species === "human") ? 1 : 0;
    this.characterData.trainedSkillsAllowed = Math.max(1, classSkills + intMod + humanBonus);

    SWSELogger.log(`CharGen | Skill trainings: ${classSkills} (class) + ${intMod} (INT) + ${humanBonus} (Human) = ${this.characterData.trainedSkillsAllowed}`);

    // Force Points (if Force-sensitive class)
    if (classDoc.system.forceSensitive) {
      this.characterData.forcePoints.max = 5 + Math.floor(this.characterData.level / 2);
      this.characterData.forcePoints.value = this.characterData.forcePoints.max;
      this.characterData.forcePoints.die = "1d6";
    }

    // Starting Credits
    if (classDoc.system.starting_credits) {
      const creditsString = classDoc.system.starting_credits;
      // Parse format like "3d4 x 400"
      const match = creditsString.match(/(\d+)d(\d+)\s*x\s*(\d+)/i);
      if (match) {
        const numDice = parseInt(match[1]);
        const dieSize = parseInt(match[2]);
        const multiplier = parseInt(match[3]);

        // Check for house rule to take maximum credits
        // Default to rolling dice
        const takeMax = game.settings?.get("swse", "maxStartingCredits") || false;

        let diceTotal;
        if (takeMax) {
          // Take maximum possible
          diceTotal = numDice * dieSize;
          SWSELogger.log(`CharGen | Starting credits (max): ${numDice}d${dieSize} = ${diceTotal}, × ${multiplier} = ${diceTotal * multiplier}`);
        } else {
          // Roll dice
          const roll = new Roll(`${numDice}d${dieSize}`);
          roll.evaluate({async: false});
          diceTotal = roll.total;
          SWSELogger.log(`CharGen | Starting credits (rolled): ${numDice}d${dieSize} = ${diceTotal}, × ${multiplier} = ${diceTotal * multiplier}`);
        }

        this.characterData.credits = diceTotal * multiplier;
      } else {
        SWSELogger.warn(`CharGen | Could not parse starting_credits: ${creditsString}`);
      }
    }
  }

  // Recalculate defenses
  this._recalcDefenses();

  await this._onNextStep(event);
}

/**
 * Handle class change (for level-up scenarios)
 */
export async function _onClassChanged(event, htmlRoot, initial = false) {
  await this._loadData();
  const classNode = (htmlRoot || this.element[0]).querySelector('[name="class_select"]');
  if (!classNode) return;

  const cls = classNode.value;
  const classDoc = this._packs.classes.find(c => c.name === cls || c._id === cls);

  // Calculate skill trainings (class base + INT modifier, minimum 1)
  const classSkills = classDoc && classDoc.system ? Number(classDoc.system.trained_skills || classDoc.system.trainedSkills || 0) : 0;
  const intMod = this.characterData.abilities.int.mod || 0;
  const humanBonus = (this.characterData.species === "Human" || this.characterData.species === "human") ? 1 : 0;
  this.characterData.trainedSkillsAllowed = Math.max(1, classSkills + intMod + humanBonus);

  if (!initial) await this.render();
}

/**
 * Apply starting class features to a newly created character
 * @param {Actor} actor - The actor to apply features to
 * @param {Object} classDoc - The class document from packs
 */
export async function _applyStartingClassFeatures(actor, classDoc) {
  if (!classDoc || !classDoc.system) {
    SWSELogger.warn("CharGen | No class document provided for feature application");
    return;
  }

  const featureItems = [];
  const weaponItems = [];
  SWSELogger.log(`CharGen | Applying starting features for ${classDoc.name}`);

  // Apply starting_features array
  if (classDoc.system.starting_features && Array.isArray(classDoc.system.starting_features)) {
    for (const feature of classDoc.system.starting_features) {
      SWSELogger.log(`CharGen | Auto-applying starting feature: ${feature.name} (${feature.type})`);

      const featureItem = {
        name: feature.name,
        type: "feat",
        img: feature.img || "icons/svg/upgrade.svg",
        system: {
          description: feature.description || `Starting feature from ${classDoc.name}`,
          source: `${classDoc.name} (Starting)`,
          type: feature.type || "class_feature"
        }
      };

      featureItems.push(featureItem);
    }
  }

  // Apply level 1 features from level_progression
  const levelProgression = classDoc.system.level_progression;
  if (levelProgression && Array.isArray(levelProgression)) {
    const level1Data = levelProgression.find(lp => lp.level === 1);

    if (level1Data && level1Data.features) {
      for (const feature of level1Data.features) {
        // Skip talent_choice and feat_grant as these are handled via selection UI
        if (feature.type === 'talent_choice' || feature.type === 'feat_grant') {
          continue;
        }

        // Special handling for Lightsaber - grant actual weapon item
        if (feature.name === 'Lightsaber' && feature.type === 'class_feature') {
          SWSELogger.log(`CharGen | Auto-granting Lightsaber weapon for Jedi`);

          // Load lightsaber from weapons pack
          const weaponsPack = game.packs.get("swse.weapons");
          if (weaponsPack) {
            const docs = await weaponsPack.getDocuments();
            const lightsaber = docs.find(d => d.name === "Lightsaber");
            if (lightsaber) {
              weaponItems.push(lightsaber.toObject());
            } else {
              SWSELogger.warn("CharGen | Lightsaber weapon not found in compendium");
            }
          }
          continue; // Don't create a feat for this, we're giving the actual weapon
        }

        // Apply proficiencies and class features
        if (feature.type === 'proficiency' || feature.type === 'class_feature') {
          SWSELogger.log(`CharGen | Auto-applying level 1 feature: ${feature.name} (${feature.type})`);

          const featureItem = {
            name: feature.name,
            type: "feat",
            img: feature.img || "icons/svg/upgrade.svg",
            system: {
              description: feature.description || `Class feature from ${classDoc.name} level 1`,
              source: `${classDoc.name} 1`,
              type: feature.type
            }
          };

          featureItems.push(featureItem);
        }
      }
    }
  }

  // Create all feature items at once
  if (featureItems.length > 0) {
    SWSELogger.log(`CharGen | Creating ${featureItems.length} class feature items`);
    await actor.createEmbeddedDocuments("Item", featureItems);
    ui.notifications.info(`Granted ${featureItems.length} class features from ${classDoc.name}`);
  }

  // Create weapon items
  if (weaponItems.length > 0) {
    SWSELogger.log(`CharGen | Creating ${weaponItems.length} starting weapon items`);
    await actor.createEmbeddedDocuments("Item", weaponItems);
    ui.notifications.info(`Granted starting equipment: ${weaponItems.map(w => w.name).join(', ')}`);
  }
}

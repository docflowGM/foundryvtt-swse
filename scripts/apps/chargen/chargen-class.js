// ============================================
// Class selection and features for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import {
  getClassProperty,
  getHitDie,
  getTrainedSkills,
  getTalentTrees,
  validateClassDocument
} from './chargen-property-accessor.js';
import { MentorSurvey } from '../mentor-survey.js';

// SSOT Data Layer
import { ClassesDB } from '../../data/classes-db.js';
import { calculateMaxForcePoints, initializeActorForcePoints } from '../../data/force-points.js';

/**
 * Handle class selection
 */
export async function _onSelectClass(event) {
  event.preventDefault();
  const className = event.currentTarget.dataset.class;

  // If changing class after initial selection, confirm with user
  if (this.characterData.classes && this.characterData.classes.length > 0) {
    const currentClass = this.characterData.classes[0].name;
    if (currentClass !== className) {
      const confirmed = await Dialog.confirm({
        title: "Change Class?",
        content: `
          <p>Changing your class will reset:</p>
          <ul>
            <li>Base Attack Bonus (BAB)</li>
            <li>Hit Points</li>
            <li>Defense bonuses (Fort/Ref/Will)</li>
            <li>Trained skills available</li>
            <li>Starting credits</li>
            <li>Force points (if applicable)</li>
          </ul>
          <p>Continue with this change?</p>
        `,
        defaultYes: false
      });
      if (!confirmed) return;
    }
  }

  // Get normalized class definition from SSOT
  // Ensure ClassesDB is built
  if (!ClassesDB.isBuilt) {
    SWSELogger.error(`CharGen | ClassesDB not built yet`);
    ui.notifications.error(`Class data not ready. Please wait a moment and try again.`);
    return;
  }

  const classDef = ClassesDB.byName(className);
  if (!classDef) {
    SWSELogger.error(`CharGen | Class not found in ClassesDB: ${className}`);
    ui.notifications.error(`Class "${className}" not found.`);
    return;
  }

  SWSELogger.log(`CharGen | Using normalized class definition:`, classDef);

  // For backward compatibility, also get the raw class doc for features
  const classDoc = this._packs.classes.find(c => c.name === className || c._id === className);
  if (!classDoc) {
    SWSELogger.warn(`CharGen | Could not find raw class doc for features (non-fatal)`);
  }

  // Clear any existing classes and add the selected one
  this.characterData.classes = [];
  this.characterData.classes.push({ name: className, level: 1 });

  SWSELogger.log(`CharGen | Selected class: ${className}, classes array length: ${this.characterData.classes.length}`, this.characterData.classes);

  // Validate class document has required properties
  const validation = validateClassDocument(classDoc);
  if (!validation.valid) {
    SWSELogger.error(`CharGen | Class document missing required properties:`, validation.missing);
    ui.notifications.error(`Class "${className}" is missing required data: ${validation.missing.join(', ')}`);
    return;
  }

  // Log any warnings (non-blocking issues like missing talent trees)
  if (validation.warnings) {
    validation.warnings.forEach(warning => {
      SWSELogger.warn(`CharGen | ${warning}`);
    });
  }

  // Set class-based values using normalized class definition
  // Base Attack Bonus - calculate actual BAB for level 1 based on progression type
  const babMultipliers = { 'fast': 1.0, 'high': 1.0, 'medium': 0.75, 'slow': 0.5, 'low': 0.5 };
  const multiplier = babMultipliers[classDef.babProgression] || 0.75;
  this.characterData.bab = Math.floor(1 * multiplier); // Level 1 BAB

  // Hit Points (3 times hit die + CON mod at level 1 per SWSE rules)
  const hitDie = classDef.hitDie;
  const conMod = this.characterData.abilities?.con?.mod || 0;
  this.characterData.hp.max = (hitDie * 3) + conMod; // Level 1 HP is 3x hit die + CON mod (SWSE heroic rule)
  this.characterData.hp.value = this.characterData.hp.max;

  SWSELogger.log(`CharGen | HP calculation: (${hitDie} × 3) + ${conMod} = ${this.characterData.hp.max}`);

  // Defense bonuses - NOTE: compendium uses 'fortitude', actor uses 'fort'
  if (this.characterData.defenses) {
    if (this.characterData.defenses.fort) {
      this.characterData.defenses.fort.classBonus = classDef.defenses.fortitude;
    }
    if (this.characterData.defenses.reflex) {
      this.characterData.defenses.reflex.classBonus = classDef.defenses.reflex;
    }
    if (this.characterData.defenses.will) {
      this.characterData.defenses.will.classBonus = classDef.defenses.will;
    }
    SWSELogger.log(`CharGen | Defense bonuses set: Fort=${classDef.defenses.fortitude}, Ref=${classDef.defenses.reflex}, Will=${classDef.defenses.will}`);
  }

  // Trained skills available (class base + INT modifier, minimum 1)
  const classSkills = classDef.trainedSkills;
  const intMod = this.characterData.abilities.int.mod || 0;
  const humanBonus = (this.characterData.species === "Human" || this.characterData.species === "human") ? 1 : 0;
  this.characterData.trainedSkillsAllowed = Math.max(1, classSkills + intMod + humanBonus);

  // Extract and store the list of class skills for filtering
  this.characterData.classSkillsList = Array.isArray(classDef.classSkills) ? classDef.classSkills : [];

  SWSELogger.log(`CharGen | Skill trainings: ${classSkills} (class) + ${intMod} (INT) + ${humanBonus} (Human) = ${this.characterData.trainedSkillsAllowed}`);
  SWSELogger.log(`CharGen | Class skills available for ${className}:`, {
    count: this.characterData.classSkillsList.length,
    skills: this.characterData.classSkillsList
  });

  // Force Points - Now calculated using actor-derived formula
  // This is independent of Force Sensitivity feat
  // Base = 5 for base classes, 6 for prestige (except Shaper)
  // Max = Base + floor(level / 2)
  const tempActorData = {
    system: {
      level: this.characterData.level || 1
    },
    items: this.characterData.classes.map(c => ({
      type: 'class',
      name: c.name,
      system: {
        classId: classDef.id,
        level: c.level || 1,
        base_class: classDef.baseClass,
        grants_force_points: classDef.grantsForcePoints
      }
    }))
  };

  const maxFP = calculateMaxForcePoints(tempActorData);
  this.characterData.forcePoints.max = maxFP;
  this.characterData.forcePoints.value = maxFP;
  this.characterData.forcePoints.die = "1d6";

  SWSELogger.log(`CharGen | Force Points calculated: ${maxFP} (base: ${classDef.baseClass ? 5 : (classDef.grantsForcePoints ? 6 : 5)})`);

  // Starting Credits
  const creditsString = classDef.startingCredits;
  if (creditsString) {
    // Parse format like "3d4 x 400"
    const match = creditsString.match(/(\d+)d(\d+)\s*x\s*(\d+)/i);
    if (match) {
      const numDice = parseInt(match[1], 10);
      const dieSize = parseInt(match[2], 10);
      const multiplier = parseInt(match[3], 10);

      // Check for house rule to take maximum credits
      // Default to rolling dice
      const takeMax = game.settings?.get("foundryvtt-swse", "maxStartingCredits") || false;

      let diceTotal;
      if (takeMax) {
        // Take maximum possible
        diceTotal = numDice * dieSize;
        SWSELogger.log(`CharGen | Starting credits (max): ${numDice}d${dieSize} = ${diceTotal}, × ${multiplier} = ${diceTotal * multiplier}`);
      } else {
        // Roll dice - safeRoll is async and returns an already-evaluated roll
        const roll = await globalThis.SWSE.RollEngine.safeRoll(`${numDice}d${dieSize}`);
        diceTotal = roll?.total || (numDice * dieSize); // Fallback to max if roll fails
        SWSELogger.log(`CharGen | Starting credits (rolled): ${numDice}d${dieSize} = ${diceTotal}, × ${multiplier} = ${diceTotal * multiplier}`);
      }

      this.characterData.credits = diceTotal * multiplier;
    } else {
      SWSELogger.warn(`CharGen | Could not parse starting_credits: ${creditsString}`);
    }
  }

  // Recalculate defenses
  this._recalcDefenses();

  // Check for background skill overlap (if backgrounds are enabled and selected)
  if (this.characterData.background && this.characterData.backgroundSkills && this.characterData.backgroundSkills.length > 0) {
    await this._checkBackgroundSkillOverlap(classDoc);
  }

  // Offer mentor survey at class selection if not yet completed (for both droid and living characters)
  if (!MentorSurvey.hasSurveyBeenCompleted(this._createTempActorForValidation())) {
    const acceptSurvey = await MentorSurvey.promptSurvey(this._createTempActorForValidation(), this.mentor);
    if (acceptSurvey) {
      const surveyAnswers = await MentorSurvey.showSurvey(this._createTempActorForValidation(), className, this.mentor);
      if (surveyAnswers) {
        const biases = MentorSurvey.processSurveyAnswers(surveyAnswers);
        // Store biases in characterData for later use when creating suggestions
        this.characterData.mentorBiases = biases;
        this.characterData.mentorSurveyCompleted = true;
        ui.notifications.info("Survey completed! Your mentor will use this to personalize suggestions.");
      }
    }
  }

  // Re-render to show the selected class and enable the Next button
  // Force a complete re-render to ensure the Next button appears
  await this.render(true);

  SWSELogger.log(`CharGen | Class selection complete, Next button should now be visible`);
}

/**
 * Handle class change (for level-up scenarios)
 */
export async function _onClassChanged(event, htmlRoot, initial = false) {
  const loaded = await this._loadData();
  if (loaded === false) {
    // Critical packs missing, chargen will close
    return;
  }
  const classNode = (htmlRoot || this.element[0]).querySelector('[name="class_select"]');
  if (!classNode) return;

  const cls = classNode.value;
  const classDoc = this._packs.classes.find(c => c.name === cls || c._id === cls);

  // Calculate skill trainings (class base + INT modifier, minimum 1)
  const classSkills = classDoc ? getTrainedSkills(classDoc) : 0;
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
  const startingFeatures = getClassProperty(classDoc, 'startingFeatures', []);
  if (startingFeatures && Array.isArray(startingFeatures)) {
    for (const feature of startingFeatures) {
      SWSELogger.log(`CharGen | Auto-applying starting feature: ${feature.name} (${feature.type})`);

      const featureItem = {
        name: feature.name,
        type: "feat",
        img: feature.img || "icons/svg/upgrade.svg",
        system: {
          description: feature.description || `Starting feature from ${classDoc.name}`,
          source: `${classDoc.name} (Starting)`,
          featType: "class_feature",
          prerequisite: feature.prerequisite || "",
          benefit: feature.description || `Starting feature from ${classDoc.name}`,
          special: feature.special || "",
          normalText: "",
          bonusFeatFor: [],
          uses: {
            current: 0,
            max: 0,
            perDay: false
          }
        }
      };

      featureItems.push(featureItem);
    }
  }

  // Apply level 1 features from level_progression
  const levelProgression = getClassProperty(classDoc, 'levelProgression', []);
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
          const weaponsPack = game.packs.get('foundryvtt-swse.weapons');
          if (weaponsPack) {
            const docs = await weaponsPack.getDocuments();
            const lightsaber = docs.find(d => d.name === "Lightsaber");
            if (lightsaber) {
              weaponItems.push(lightsaber.toObject());
            } else {
              SWSELogger.warn("CharGen | Lightsaber weapon not found in compendium");
            }
          } else {
            SWSELogger.error("CharGen | Weapons compendium (foundryvtt-swse.weapons) not found");
            ui.notifications.warn("Weapons compendium not found. Cannot grant starting lightsaber.");
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
              featType: feature.type === 'proficiency' ? 'proficiency' : 'class_feature',
              prerequisite: feature.prerequisite || "",
              benefit: feature.description || `Class feature from ${classDoc.name} level 1`,
              special: feature.special || "",
              normalText: "",
              bonusFeatFor: [],
              uses: {
                current: 0,
                max: 0,
                perDay: false
              }
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

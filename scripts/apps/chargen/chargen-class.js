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
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: START - Selected class: "${className}"`);

  // If changing class after initial selection, confirm with user
  if (this.characterData.classes && this.characterData.classes.length > 0) {
    const currentClass = this.characterData.classes[0].name;
    SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Current class: "${currentClass}"`);
    if (currentClass !== className) {
      SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Class change detected, requesting user confirmation...`);
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
      if (!confirmed) {
        SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: User cancelled class change`);
        return;
      }
      SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: User confirmed class change`);
    }
  }

  // Get normalized class definition from SSOT
  // Ensure ClassesDB is built
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Checking ClassesDB build status: ${ClassesDB.isBuilt}`);
  if (!ClassesDB.isBuilt) {
    SWSELogger.error(`[CHARGEN-CLASS] ERROR: ClassesDB not built yet!`);
    SWSELogger.error(`[CHARGEN-CLASS] ClassesDB state:`, { isBuilt: ClassesDB.isBuilt, type: typeof ClassesDB });
    ui.notifications.error(`Class data not ready. Please wait a moment and try again.`);
    return;
  }
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: ClassesDB is built, looking up class...`);

  const classDef = ClassesDB.byName(className);
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: ClassesDB.byName("${className}") returned:`, classDef ? 'FOUND' : 'NOT FOUND');
  if (!classDef) {
    SWSELogger.error(`[CHARGEN-CLASS] ERROR: Class not found in ClassesDB: "${className}"`);
    SWSELogger.error(`[CHARGEN-CLASS] Available classes in ClassesDB:`, ClassesDB.all ? ClassesDB.all.map(c => c.name) : 'ClassesDB.all not available');
    ui.notifications.error(`Class "${className}" not found.`);
    return;
  }

  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Using normalized class definition:`, classDef);

  // For backward compatibility, also get the raw class doc for features
  const classDoc = this._packs.classes.find(c => c.name === className || c._id === className);
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Raw class doc lookup result:`, classDoc ? 'FOUND' : 'NOT FOUND');
  if (!classDoc) {
    SWSELogger.warn(`[CHARGEN-CLASS] WARNING: Could not find raw class doc for features (non-fatal)`);
  }

  // Clear any existing classes and add the selected one
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Clearing existing classes and adding new one...`);
  this.characterData.classes = [];
  this.characterData.classes.push({ name: className, level: 1 });

  // DIAGNOSTIC: Verify class was stored correctly
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: CRITICAL - Class selection stored:`, {
    className: className,
    classesArray: JSON.stringify(this.characterData.classes),
    classesLength: this.characterData.classes.length,
    firstClassName: this.characterData.classes[0]?.name,
    characterDataRef: this.characterData === this.characterData // Should always be true
  });

  // Validate class document has required properties
  // NOTE: We prefer validating classDef (normalized from ClassesDB) over classDoc (raw compendium)
  // since classDoc may not be found if packs aren't fully loaded, but classDef is guaranteed to exist
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Validating class data...`);
  if (classDoc) {
    const validation = validateClassDocument(classDoc);
    SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Validation result:`, { valid: validation.valid, missing: validation.missing, warnings: validation.warnings });
    if (!validation.valid) {
      // Only warn, don't fail - we have classDef from ClassesDB which has all required data
      SWSELogger.warn(`[CHARGEN-CLASS] WARNING: Raw class document missing properties:`, validation.missing);
      SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Continuing with normalized classDef from ClassesDB`);
    }

    // Log any warnings (non-blocking issues like missing talent trees)
    if (validation.warnings) {
      validation.warnings.forEach(warning => {
        SWSELogger.warn(`[CHARGEN-CLASS] WARNING: ${warning}`);
      });
    }
  } else {
    SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Skipping validation - using normalized classDef from ClassesDB`);
  }

  // Set class-based values using normalized class definition
  // Base Attack Bonus - calculate actual BAB for level 1 based on progression type
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Calculating BAB - babProgression: ${classDef.babProgression}`);
  const babMultipliers = { 'fast': 1.0, 'high': 1.0, 'medium': 0.75, 'slow': 0.5, 'low': 0.5 };
  const multiplier = babMultipliers[classDef.babProgression] || 0.75;
  this.characterData.bab = Math.floor(1 * multiplier); // Level 1 BAB
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: BAB calculated: ${this.characterData.bab} (multiplier: ${multiplier})`);

  // Hit Points (3 times hit die + CON mod at level 1 per SWSE rules)
  const hitDie = classDef.hitDie;
  const conMod = this.characterData.abilities?.con?.mod || 0;
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Calculating HP - hitDie: ${hitDie}, CON mod: ${conMod}`);
  this.characterData.hp.max = (hitDie * 3) + conMod; // Level 1 HP is 3x hit die + CON mod (SWSE heroic rule)
  this.characterData.hp.value = this.characterData.hp.max;

  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: HP calculation: (${hitDie} × 3) + ${conMod} = ${this.characterData.hp.max}`);

  // Defense bonuses - NOTE: compendium uses 'fortitude', actor uses 'fort'
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Setting defense bonuses...`);
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Defense data from classDef:`, classDef.defenses);
  if (this.characterData.defenses) {
    if (this.characterData.defenses.fort) {
      this.characterData.defenses.fort.classBonus = classDef.defenses.fortitude;
      SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Set fort.classBonus = ${classDef.defenses.fortitude}`);
    }
    if (this.characterData.defenses.reflex) {
      this.characterData.defenses.reflex.classBonus = classDef.defenses.reflex;
      SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Set reflex.classBonus = ${classDef.defenses.reflex}`);
    }
    if (this.characterData.defenses.will) {
      this.characterData.defenses.will.classBonus = classDef.defenses.will;
      SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Set will.classBonus = ${classDef.defenses.will}`);
    }
    SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Defense bonuses set: Fort=${classDef.defenses.fortitude}, Ref=${classDef.defenses.reflex}, Will=${classDef.defenses.will}`);
  } else {
    SWSELogger.error(`[CHARGEN-CLASS] ERROR: characterData.defenses is not initialized!`);
  }

  // Trained skills available (class base + INT modifier, minimum 1)
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Calculating trained skills...`);
  const classSkills = classDef.trainedSkills;
  const intMod = this.characterData.abilities.int.mod || 0;
  const humanBonus = (this.characterData.species === "Human" || this.characterData.species === "human") ? 1 : 0;
  this.characterData.trainedSkillsAllowed = Math.max(1, classSkills + intMod + humanBonus);
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: trainedSkills: ${classSkills}, intMod: ${intMod}, humanBonus: ${humanBonus}, total: ${this.characterData.trainedSkillsAllowed}`);

  // Extract and store the list of class skills for filtering
  this.characterData.classSkillsList = Array.isArray(classDef.classSkills) ? classDef.classSkills : [];
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: classSkillsList loaded:`, {
    count: this.characterData.classSkillsList.length,
    skills: this.characterData.classSkillsList
  });

  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Skill trainings: ${classSkills} (class) + ${intMod} (INT) + ${humanBonus} (Human) = ${this.characterData.trainedSkillsAllowed}`);
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Class skills available for ${className}:`, {
    count: this.characterData.classSkillsList.length,
    skills: this.characterData.classSkillsList
  });

  // Force Points - Now calculated using actor-derived formula
  // This is independent of Force Sensitivity feat
  // Base = 5 for base classes, 6 for prestige (except Shaper)
  // Max = Base + floor(level / 2)
  SWSELogger.log(`[CHARGEN-CLASS] _onSelectClass: Calculating force points...`);
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

  // Starting Credits - Store formula for later choice (Finalize step)
  const creditsString = classDef.startingCredits;
  if (creditsString) {
    // Parse format like "3d4 x 400"
    const match = creditsString.match(/(\d+)d(\d+)\s*x\s*(\d+)/i);
    if (match) {
      const numDice = parseInt(match[1], 10);
      const dieSize = parseInt(match[2], 10);
      const multiplier = parseInt(match[3], 10);

      // Store formula for player to choose in Finalize step
      this.characterData.startingCreditsFormula = {
        numDice,
        dieSize,
        multiplier,
        formulaString: `${numDice}d${dieSize} × ${multiplier.toLocaleString()}`,
        maxPossible: numDice * dieSize * multiplier
      };

      // Don't auto-assign credits yet - player will choose in Finalize step
      this.characterData.credits = null;
      this.characterData.creditsChosen = false;

      SWSELogger.log(`CharGen | Starting credits formula stored: ${this.characterData.startingCreditsFormula.formulaString} (max: ${this.characterData.startingCreditsFormula.maxPossible})`);
    } else {
      SWSELogger.warn(`CharGen | Could not parse starting_credits: ${creditsString}`);
      this.characterData.startingCreditsFormula = null;
    }
  } else {
    this.characterData.startingCreditsFormula = null;
  }

  // Recalculate defenses
  this._recalcDefenses();

  // Check for background skill overlap (if backgrounds are enabled and selected)
  // Note: Background skills are informational only in SWSE - they don't affect class skill selection
  // They're displayed in the skills step to show which skills the background trained
  if (this.characterData.background && this.characterData.backgroundSkills && this.characterData.backgroundSkills.length > 0) {
    // Background skills are already stored in characterData.backgroundSkills
    // No additional processing needed - the skills step will display them
    SWSELogger.log(`CharGen | Background skills preserved:`, this.characterData.backgroundSkills);
  }

  // Offer mentor survey at class selection if not yet completed (for both droid and living characters)
  if (!MentorSurvey.hasSurveyBeenCompleted(this._createTempActorForValidation())) {
    const acceptSurvey = await MentorSurvey.promptSurvey(this._createTempActorForValidation(), className);
    if (acceptSurvey) {
      const surveyAnswers = await MentorSurvey.showSurvey(this._createTempActorForValidation(), className, className);
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

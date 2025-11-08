/**
 * SWSE Houserule Mechanics
 * Implementation of houserule mechanics and hooks
 */

export class SWSEHoureuleMechanics {
  
  /**
   * Initialize all houserule hooks and modifications
   */
  static initialize() {
    console.log("SWSE | Initializing houserule mechanics");
    
    // Hook into actor data preparation
    Hooks.on("Actor.prepareData", this.onActorPrepareData.bind(this));
    
    // Hook into damage application
    Hooks.on("swse.applyDamage", this.onApplyDamage.bind(this));
    
    // Hook into level up
    Hooks.on("swse.levelUp", this.onLevelUp.bind(this));
    
    // Hook into item creation (for restrictions)
    Hooks.on("preCreateItem", this.onPreCreateItem.bind(this));
    
    // Hook into combat
    Hooks.on("updateCombat", this.onUpdateCombat.bind(this));
  }
  
  /**
   * Modify actor data based on houserules
   */
  static onActorPrepareData(actor, options, userId) {
    if (actor.type !== "character") return;
    
    const settings = game.settings.get("swse", "characterCreation");
    const system = actor.system;
    
    // Armored Defense for All
    if (game.settings.get("swse", "armoredDefenseForAll")) {
      if (system.armor?.equipped && system.armor?.reflexBonus) {
        system.defenses.reflex.armor = Math.max(
          system.defenses.reflex.armor || 0,
          system.armor.reflexBonus
        );
      }
    }
    
    // Athletics Consolidation
    if (game.settings.get("swse", "athleticsConsolidation")) {
      const climb = system.skills?.climb || {};
      const jump = system.skills?.jump || {};
      const swim = system.skills?.swim || {};
      
      // Create consolidated athletics skill
      system.skills.athletics = {
        trained: climb.trained || jump.trained || swim.trained,
        focus: climb.focus || jump.focus || swim.focus,
        misc: Math.max(climb.misc || 0, jump.misc || 0, swim.misc || 0),
        ability: "str"
      };
      
      // Hide individual skills
      delete system.skills.climb;
      delete system.skills.jump;
      delete system.skills.swim;
    }
    
    // Knowledge Skill Consolidation
    const knowledgeMode = game.settings.get("swse", "knowledgeSkillMode");
    if (knowledgeMode !== "standard") {
      this._consolidateKnowledgeSkills(system, knowledgeMode);
    }
    
    // Skill Focus Scaling
    const skillFocusRestriction = game.settings.get("swse", "skillFocusRestriction");
    if (skillFocusRestriction.scaling) {
      const level = system.level || 1;
      const scaledBonus = Math.min(5, Math.floor(level / 2));
      
      for (const [key, skill] of Object.entries(system.skills || {})) {
        if (skill.focus) {
          skill.focusBonus = scaledBonus;
        }
      }
    }
  }
  
  /**
   * Handle damage application with houserules
   */
  static async onApplyDamage(actor, damage, options = {}) {
    const deathSystem = game.settings.get("swse", "deathSystem");
    
    // Check for death
    const hp = actor.system.hp.value;
    const newHP = hp - damage;
    
    if (deathSystem.system === "threeStrikes" && newHP <= 0) {
      // Three strikes system
      const strikes = actor.getFlag("swse", "deathStrikes") || 0;
      
      if (strikes >= deathSystem.strikesUntilDeath - 1) {
        // Character dies
        ui.notifications.error(`${actor.name} has died permanently!`);
        await actor.update({"system.conditions.dead": true});
      } else {
        // Add a strike and return to configured HP
        await actor.setFlag("swse", "deathStrikes", strikes + 1);
        await actor.update({"system.hp.value": deathSystem.returnToHP});
        
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({actor}),
          content: `<div class="swse death-strike">
            <h3>${actor.name} Death Strike!</h3>
            <p>Strike ${strikes + 1} of ${deathSystem.strikesUntilDeath}</p>
            <p>${actor.name} returns from death's door...</p>
          </div>`
        });
      }
      return;
    }
    
    // Condition track damage cap
    const cap = game.settings.get("swse", "conditionTrackCap");
    if (cap > 0 && options.conditionTrackDamage > cap) {
      options.conditionTrackDamage = cap;
      ui.notifications.warn(`Condition track damage capped at ${cap} steps`);
    }
  }
  
  /**
   * Handle level up with houserules
   */
  static async onLevelUp(actor, className) {
    const level = actor.system.level || 1;
    
    // Talent every level
    if (game.settings.get("swse", "talentEveryLevel")) {
      // Grant talent selection
      const currentTalents = actor.getFlag("swse", "availableTalentSelections") || 0;
      await actor.setFlag("swse", "availableTalentSelections", currentTalents + 1);
      ui.notifications.info("You gain a talent!");
    }
    
    // HP at level up
    const hpSettings = game.settings.get("swse", "characterCreation");
    if (hpSettings.hpGeneration === "maximum") {
      // Apply maximum HP instead of rolling
      const classData = game.system.template.Actor.templates[className];
      const hitDie = classData?.hitDie || 8;
      const conMod = actor.system.abilities.con.mod || 0;
      const hpGain = hitDie + conMod;
      
      await actor.update({
        "system.hp.max": actor.system.hp.max + hpGain,
        "system.hp.value": actor.system.hp.value + hpGain
      });
      
      ui.notifications.info(`Gained maximum HP: ${hpGain}`);
      return true; // Skip normal HP roll
    }
  }
  
  /**
   * Check item creation restrictions
   */
  static async onPreCreateItem(item, data, options, userId) {
    if (item.type !== "feat") return true;
    
    const actor = item.parent;
    if (!actor || actor.type !== "character") return true;
    
    // Skill Focus (Use the Force) restriction
    if (item.name === "Skill Focus" && data.system?.skill === "useTheForce") {
      const restriction = game.settings.get("swse", "skillFocusRestriction");
      const level = actor.system.level || 1;
      
      if (level < restriction.useTheForce) {
        ui.notifications.error(
          `Skill Focus (Use the Force) requires level ${restriction.useTheForce}!`
        );
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Handle combat round updates
   */
  static async onUpdateCombat(combat, changed, options, userId) {
    if (!changed.round) return;
    
    // Force Point recovery per encounter
    if (game.settings.get("swse", "forcePointRecovery") === "encounter") {
      // On combat end, refresh Force Points
      if (!combat.started && changed.round === 0) {
        for (const combatant of combat.combatants) {
          const actor = combatant.actor;
          if (actor?.type === "character") {
            await actor.update({
              "system.forcePoints.value": actor.system.forcePoints.max
            });
          }
        }
        ui.notifications.info("Force Points refreshed!");
      }
    }
  }
  
  /**
   * Consolidate knowledge skills
   */
  static _consolidateKnowledgeSkills(system, mode) {
    const knowledgeSkills = [
      "bureaucracy", "galacticLore", "lifeSciences", 
      "physicalSciences", "socialSciences", "tactics", "technology"
    ];
    
    // Check if any are trained
    const anyTrained = knowledgeSkills.some(s => system.skills?.[s]?.trained);
    
    if (mode === "consolidated4") {
      // 4 skill version
      system.skills.knowledgeGovernment = { trained: anyTrained, ability: "int" };
      system.skills.knowledgeHumanities = { trained: anyTrained, ability: "int" };
      system.skills.knowledgeScience = { trained: anyTrained, ability: "int" };
      system.skills.knowledgeWarfare = { trained: anyTrained, ability: "int" };
    } else if (mode === "simplified2") {
      // 2 skill version
      system.skills.knowledgeAcademic = { trained: anyTrained, ability: "int" };
      system.skills.knowledgePractical = { trained: anyTrained, ability: "int" };
    }
    
    // Remove individual skills
    knowledgeSkills.forEach(s => delete system.skills[s]);
  }
  
  /**
   * Apply second wind with improvements
   */
  static async useSecondWind(actor) {
    const improved = game.settings.get("swse", "secondWindImproved");
    
    // Normal second wind healing
    const con = actor.system.abilities.con.mod || 0;
    const level = actor.system.level || 1;
    const healing = Math.max(Math.floor(actor.system.hp.max / 4), con);
    
    await actor.update({
      "system.hp.value": Math.min(
        actor.system.hp.value + healing,
        actor.system.hp.max
      )
    });
    
    // Improved: Also improve condition track
    if (improved) {
      const current = actor.system.conditionTrack?.current || 0;
      if (current > 0) {
        await actor.update({
          "system.conditionTrack.current": Math.max(0, current - 1)
        });
        ui.notifications.info("Condition track improved by Second Wind!");
      }
    }
    
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor}),
      content: `${actor.name} uses Second Wind, healing ${healing} HP${
        improved ? " and improving condition!" : ""
      }`
    });
  }
  
  /**
   * Calculate weapon ranges with multiplier
   */
  static getWeaponRange(baseRange) {
    const multiplier = game.settings.get("swse", "weaponRangeMultiplier");
    return Math.round(baseRange * multiplier);
  }
  
  /**
   * Calculate diagonal movement cost
   */
  static getDiagonalCost(diagonals) {
    const mode = game.settings.get("swse", "diagonalMovement");
    
    switch (mode) {
      case "swse":
        return diagonals * 2;
      case "alternating":
        return Math.floor(diagonals * 1.5);
      case "simplified":
        return diagonals;
      default:
        return diagonals * 2;
    }
  }
  
  /**
   * Handle critical hits
   */
  static async rollCriticalDamage(weapon, actor) {
    const variant = game.settings.get("swse", "criticalHitVariant");
    
    switch (variant) {
      case "maxplus":
        // Maximum damage + normal roll
        const maxDamage = weapon.system.damage.replace(/d\d+/g, (match) => {
          const die = parseInt(match.slice(1));
          return die;
        });
        const formula = `${maxDamage} + ${weapon.system.damage}`;
        return new Roll(formula, actor.getRollData());
        
      case "exploding":
        // Exploding dice
        return new Roll(`${weapon.system.damage}x`, actor.getRollData());
        
      case "trackonly":
        // No extra damage, just condition track
        ui.notifications.info("Critical hit! Target moves down condition track.");
        return null;
        
      default:
        // Standard double damage
        return new Roll(`(${weapon.system.damage}) * 2`, actor.getRollData());
    }
  }
}

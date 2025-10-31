/**
 * Enhanced SWSE Actor Base
 * Modern architecture with getRollData, modular calculations, and automation
 */

import { calculateAbilities } from '../../calculations/abilities.js';
import { calculateDefenses } from '../../calculations/defenses.js';
import { calculateSkills } from '../../calculations/skills.js';
import { applyConditionPenalty } from '../../calculations/conditions.js';
import { CONDITION_PENALTIES, SIZE_MODIFIERS } from '../../../helpers/constants.js';

export class SWSEActorBase extends Actor {
  
  /**
   * Prepare base actor data
   */
  prepareData() {
    super.prepareData();
    
    // Apply racial bonuses
    this._applyRacialBonuses();
    
    // Apply condition track effects
    applyConditionPenalty(this);
  }
  
  /**
   * Prepare derived data using modular calculations
   */
  prepareDerivedData() {
    // Calculate abilities
    calculateAbilities(this);
    
    // Calculate defenses
    calculateDefenses(this);
    
    // Calculate skills
    calculateSkills(this);
    
    // Calculate resources (HP, Force Points, etc.)
    this._calculateResources();
    
    // Calculate speed
    this._calculateSpeed();
    
    // Calculate BAB
    this._calculateBAB();
    
    // Calculate initiative
    this._calculateInitiative();
  }
  
  /**
   * Get roll data for formulas
   * This is the KEY method for enabling formula-based rolling
   */
  getRollData() {
    const data = super.getRollData();
    
    // Ability scores with shortcuts
    data.abilities = {};
    for (const [key, ability] of Object.entries(this.system.abilities)) {
      data[key] = ability.mod;  // @str, @dex, etc.
      data.abilities[key] = {
        ...ability,
        mod: ability.mod  // @abilities.str.mod
      };
    }
    
    // Level and derived values
    data.level = this.system.level;
    data.halfLevel = Math.floor(this.system.level / 2);
    data.bab = this.system.bab || 0;
    
    // Condition track penalty
    data.conditionPenalty = CONDITION_PENALTIES[this.system.conditionTrack] || 0;
    data.conditionTrack = this.system.conditionTrack;
    
    // Defenses
    data.defenses = {};
    for (const [key, defense] of Object.entries(this.system.defenses)) {
      data.defenses[key] = defense.total;
      data[`${key}Def`] = defense.total;  // @reflexDef, @fortDef, @willDef
    }
    
    // Skills
    data.skills = {};
    for (const [key, skill] of Object.entries(this.system.skills)) {
      data.skills[key] = skill.total;
    }
    
    // Size modifier
    data.size = this.system.size;
    data.sizeMod = SIZE_MODIFIERS[this.system.size] || 0;
    
    // Force points
    if (this.system.forcePoints) {
      data.forcePoints = this.system.forcePoints.value;
      data.maxForcePoints = this.system.forcePoints.max;
    }
    
    // Damage threshold
    if (this.system.damageThreshold) {
      data.damageThreshold = this.system.damageThreshold.total;
    }
    
    // Initiative
    data.initiative = this.system.initiative?.total || 0;
    
    return data;
  }
  
  /**
   * Apply damage with automatic threshold checking and condition track
   */
  async applyDamage(damage, options = {}) {
    const { 
      multiplier = 1, 
      checkThreshold = true,
      source = null,
      ignoreTemp = false
    } = options;
    
    const appliedDamage = Math.floor(damage * multiplier);
    let remainingDamage = appliedDamage;
    
    // Apply to temp HP first (unless ignored)
    if (!ignoreTemp && this.system.hp.temp > 0) {
      const tempLoss = Math.min(this.system.hp.temp, remainingDamage);
      remainingDamage -= tempLoss;
      await this.update({'system.hp.temp': this.system.hp.temp - tempLoss});
      
      if (remainingDamage === 0) {
        this._chatMessage(`${this.name} absorbed ${appliedDamage} damage with temporary hit points.`);
        return appliedDamage;
      }
    }
    
    // Apply remaining to actual HP
    if (remainingDamage > 0) {
      const newHP = Math.max(0, this.system.hp.value - remainingDamage);
      await this.update({'system.hp.value': newHP});
      
      // Check damage threshold
      if (checkThreshold) {
        const threshold = this.system.damageThreshold?.total || this.system.defenses.fortitude.total;
        if (remainingDamage >= threshold) {
          await this.moveConditionTrack(-1);
          
          this._chatMessage(
            `<div class="swse damage-threshold">
              <h3>Damage Threshold Exceeded!</h3>
              <p><strong>${this.name}</strong> took ${remainingDamage} damage (threshold: ${threshold})</p>
              <p>Moved -1 on Condition Track → <strong>${this.system.conditionTrack}</strong></p>
            </div>`,
            'warning'
          );
        }
      }
      
      // Check for death
      if (newHP === 0) {
        await this._checkDeath();
      }
    }
    
    return appliedDamage;
  }
  
  /**
   * Apply healing
   */
  async applyHealing(healing, options = {}) {
    const { allowOverheal = false } = options;
    
    const maxHP = this.system.hp.max;
    const currentHP = this.system.hp.value;
    
    let newHP;
    if (allowOverheal) {
      newHP = currentHP + healing;
    } else {
      newHP = Math.min(currentHP + healing, maxHP);
    }
    
    const actualHealing = newHP - currentHP;
    
    if (actualHealing > 0) {
      await this.update({'system.hp.value': newHP});
      this._chatMessage(`${this.name} recovered ${actualHealing} hit points.`);
    }
    
    return actualHealing;
  }
  
  /**
   * Move on condition track
   */
  async moveConditionTrack(steps, options = {}) {
    const { notify = true } = options;
    
    const track = ['normal', '-1', '-2', '-5', '-10', 'helpless'];
    const currentIndex = track.indexOf(this.system.conditionTrack);
    const newIndex = Math.max(0, Math.min(track.length - 1, currentIndex - steps));
    
    if (newIndex !== currentIndex) {
      await this.update({'system.conditionTrack': track[newIndex]});
      
      // Force re-calculation of penalties
      this.prepareData();
      
      if (notify) {
        const direction = steps > 0 ? 'improved' : 'worsened';
        this._chatMessage(
          `${this.name}'s condition ${direction} to <strong>${track[newIndex]}</strong>`,
          steps > 0 ? 'info' : 'warning'
        );
      }
    }
  }
  
  /**
   * Use Second Wind
   */
  async useSecondWind() {
    const sw = this.system.secondWind;
    
    if (sw.uses <= 0) {
      ui.notifications.warn('No Second Wind uses remaining!');
      return false;
    }
    
    const healing = sw.healing;
    await this.applyHealing(healing);
    
    await this.update({
      'system.secondWind.uses': sw.uses - 1
    });
    
    this._chatMessage(
      `<div class="swse second-wind">
        <h3>Second Wind!</h3>
        <p><strong>${this.name}</strong> recovered ${healing} HP</p>
        <p>Second Wind uses remaining: ${sw.uses - 1}/${sw.uses}</p>
      </div>`,
      'info'
    );
    
    return true;
  }
  
  /**
   * Spend Force Point
   */
  async spendForcePoint(purpose = "reroll") {
    const fp = this.system.forcePoints;
    
    if (!fp || fp.value <= 0) {
      ui.notifications.warn('No Force Points remaining!');
      return false;
    }
    
    await this.update({
      'system.forcePoints.value': fp.value - 1
    });
    
    this._chatMessage(`${this.name} spent a Force Point (${purpose}). Remaining: ${fp.value - 1}/${fp.max}`);
    return true;
  }
  
  /**
   * Rest (restore resources)
   */
  async rest(type = 'short') {
    const updates = {};
    
    if (type === 'short') {
      // Restore Force Powers
      for (const power of this.items.filter(i => i.type === 'forcepower')) {
        if (power.system.uses && power.system.uses.max > 0) {
          await power.update({
            'system.uses.current': power.system.uses.max
          });
        }
      }
      
      this._chatMessage(`${this.name} took a short rest. Force Powers restored.`);
      
    } else if (type === 'long') {
      // Restore HP to max
      updates['system.hp.value'] = this.system.hp.max;
      
      // Restore Second Wind
      updates['system.secondWind.uses'] = 1;
      
      // Restore Force Powers
      for (const power of this.items.filter(i => i.type === 'forcepower')) {
        if (power.system.uses && power.system.uses.max > 0) {
          await power.update({
            'system.uses.current': power.system.uses.max
          });
        }
      }
      
      // Restore Condition Track to normal
      updates['system.conditionTrack'] = 'normal';
      
      await this.update(updates);
      this._chatMessage(`${this.name} took an extended rest. All resources restored.`);
    }
  }
  
  // === PRIVATE HELPER METHODS ===
  
  _applyRacialBonuses() {
    // Find species item
    const species = this.items.find(i => i.type === 'species');
    if (!species) return;
    
    // Apply ability modifiers
    const mods = species.system.abilityModifiers;
    if (mods) {
      for (const [key, value] of Object.entries(mods)) {
        if (this.system.abilities[key]) {
          this.system.abilities[key].racial = value;
        }
      }
    }
    
    // Apply size
    if (species.system.size) {
      this.system.size = species.system.size;
    }
    
    // Apply speed
    if (species.system.speed) {
      this.system.speed.base = species.system.speed;
    }
  }
  
  _calculateResources() {
    // Second Wind healing
    const level = this.system.level || 1;
    const conMod = this.system.abilities.con?.mod || 0;
    this.system.secondWind.healing = Math.floor(level / 4) + conMod;
    
    // Force Points max (if Force-sensitive)
    const isForceUser = this.items.some(i => 
      i.type === 'feat' && i.name.toLowerCase().includes('force sensitive')
    );
    if (isForceUser && this.system.forcePoints) {
      this.system.forcePoints.max = 5 + Math.floor(level / 2);
    }
  }
  
  _calculateSpeed() {
    // Get armor penalty
    const armor = this.items.find(i => i.type === 'armor' && i.system.equipped);
    const armorPenalty = armor?.system.speedPenalty || 0;
    
    this.system.speed.armor = armorPenalty;
    this.system.speed.total = Math.max(1, this.system.speed.base + armorPenalty + this.system.speed.misc);
  }
  
  _calculateBAB() {
    // Sum BAB from all classes
    const classes = this.items.filter(i => i.type === 'class');
    let totalBAB = 0;
    
    for (const cls of classes) {
      const level = cls.system.classLevel || 1;
      const progression = cls.system.babProgression || 'medium';
      
      if (progression === 'fast') {
        totalBAB += level;
      } else if (progression === 'medium') {
        totalBAB += Math.floor(level * 0.75);
      } else {
        totalBAB += Math.floor(level * 0.5);
      }
    }
    
    this.system.bab = totalBAB;
  }
  
  _calculateInitiative() {
    const dexMod = this.system.abilities.dex?.mod || 0;
    const penalty = CONDITION_PENALTIES[this.system.conditionTrack] || 0;
    
    // Check for Improved Initiative feat
    const hasImproved = this.items.some(i => 
      i.type === 'feat' && i.name.toLowerCase() === 'improved initiative'
    );
    const featBonus = hasImproved ? 5 : 0;
    
    this.system.initiative = {
      total: dexMod + penalty + featBonus,
      dex: dexMod,
      misc: featBonus
    };
  }
  
  async _checkDeath() {
    const isHelpless = this.system.conditionTrack === 'helpless';
    
    if (isHelpless) {
      this._chatMessage(
        `<div class="swse death">
          <h3>${this.name} has died!</h3>
          <p>Reduced to 0 HP while Helpless on Condition Track.</p>
        </div>`,
        'error'
      );
      
      // Set token to dead
      for (const token of this.getActiveTokens()) {
        await token.update({
          'overlayEffect': CONFIG.controlIcons.defeated
        });
      }
    }
  }
  
  _chatMessage(content, type = 'info') {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: this}),
      content: content,
      type: type === 'error' ? CONST.CHAT_MESSAGE_TYPES.OOC : CONST.CHAT_MESSAGE_TYPES.IC
    });
  }
  
  /**
   * Get half level (commonly used in SWSE)
   */
  getHalfLevel() {
    return Math.floor((this.system.level || 1) / 2);
  }
}

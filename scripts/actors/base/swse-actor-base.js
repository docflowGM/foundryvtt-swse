/**
 * Base Actor class for SWSE
 */
export class SWSEActorBase extends Actor {
  
  prepareDerivedData() {
    super.prepareDerivedData();
    this._prepareAbilities();
    this._prepareDefenses();
    this._prepareSkills();
    this._prepareDamageThreshold();
  }
  
  _prepareAbilities() {
    for (const [key, ability] of Object.entries(this.system.abilities)) {
      ability.total = ability.base + ability.racial + ability.temp;
      ability.mod = Math.floor((ability.total - 10) / 2);
    }
  }
  
  _prepareDefenses() {
    const level = this.system.level || 1;
    const halfLevel = Math.floor(level / 2);
    
    // Reflex
    this.system.defenses.reflex.ability = this.system.abilities.dex.mod;
    this.system.defenses.reflex.total = 
      this.system.defenses.reflex.base +
      this.system.defenses.reflex.levelArmor +
      this.system.abilities.dex.mod +
      this.system.defenses.reflex.misc +
      this.conditionPenalty;
    
    // Fortitude
    const fortAbility = Math.max(
      this.system.abilities.con.mod,
      this.system.abilities.str.mod
    );
    this.system.defenses.fortitude.ability = fortAbility;
    this.system.defenses.fortitude.total = 
      this.system.defenses.fortitude.base +
      halfLevel +
      fortAbility +
      this.system.defenses.fortitude.misc +
      this.conditionPenalty;
    
    // Will
    this.system.defenses.will.ability = this.system.abilities.wis.mod;
    this.system.defenses.will.total = 
      this.system.defenses.will.base +
      halfLevel +
      this.system.abilities.wis.mod +
      this.system.defenses.will.misc +
      this.conditionPenalty;
  }
  
  _prepareSkills() {
    const level = this.system.level || 1;
    const halfLevel = Math.floor(level / 2);
    
    const skillAbilities = {
      acrobatics: 'dex',
      climb: 'str',
      deception: 'cha',
      endurance: 'con',
      initiative: 'dex',
      perception: 'wis',
      persuasion: 'cha',
      pilot: 'dex',
      stealth: 'dex',
      useTheForce: 'cha'
    };
    
    for (const [key, skill] of Object.entries(this.system.skills)) {
      const abilityKey = skillAbilities[key];
      const abilityMod = this.system.abilities[abilityKey]?.mod || 0;
      const trainedBonus = skill.trained ? halfLevel : 0;
      const focusBonus = skill.focusRanks * 5;
      
      skill.total = abilityMod + trainedBonus + focusBonus + skill.misc + this.conditionPenalty;
    }
  }
  
  _prepareDamageThreshold() {
    this.system.damageThreshold.fortitude = this.system.defenses.fortitude.total;
    this.system.damageThreshold.total = 
      this.system.damageThreshold.fortitude +
      this.system.damageThreshold.size;
  }
  
  get conditionPenalty() {
    const penalties = {
      "normal": 0,
      "-1": -1,
      "-2": -2,
      "-5": -5,
      "-10": -10,
      "helpless": -10
    };
    return penalties[this.system.conditionTrack] || 0;
  }
  
  async applyDamage(damage, options = {}) {
    if (typeof damage !== 'number' || damage < 0) return;
    
    const newHP = Math.max(0, this.system.hp.value - damage);
    await this.update({ 'system.hp.value': newHP });
    
    if (options.checkThreshold && damage >= this.system.damageThreshold.total) {
      await this._moveConditionTrack(1);
    }
  }
  
  async _moveConditionTrack(steps) {
    const tracks = ['normal', '-1', '-2', '-5', '-10', 'helpless'];
    const currentIndex = tracks.indexOf(this.system.conditionTrack);
    const newIndex = Math.max(0, Math.min(tracks.length - 1, currentIndex + steps));
    
    if (newIndex !== currentIndex) {
      await this.update({ 'system.conditionTrack': tracks[newIndex] });
      ui.notifications.info(`${this.name} moved to ${tracks[newIndex]} on Condition Track`);
    }
  }
}

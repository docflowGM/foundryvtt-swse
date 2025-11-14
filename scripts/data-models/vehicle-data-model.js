import { SWSEActorDataModel } from './actor-data-model.js';

export class SWSEVehicleDataModel extends SWSEActorDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // Vehicles have attributes too!
      attributes: new fields.SchemaField({
        str: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        dex: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        con: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        int: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        wis: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        cha: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        })
      }),

      // Vehicle stats
      hull: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 50, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 50, min: 1, integer: true})
      }),

      shields: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 0, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 0, min: 0, integer: true})
      }),

      // Defenses (calculated in prepareDerivedData)
      reflexDefense: new fields.NumberField({required: true, initial: 10, integer: true}),
      fortitudeDefense: new fields.NumberField({required: true, initial: 10, integer: true}),
      damageThreshold: new fields.NumberField({required: true, initial: 30, integer: true}),
      damageReduction: new fields.NumberField({required: true, initial: 0, integer: true}),

      // Armor bonus (or can use pilot's heroic level)
      armorBonus: new fields.NumberField({required: true, initial: 0, integer: true}),
      usePilotLevel: new fields.BooleanField({required: true, initial: true}),

      // Crew Quality
      crewQuality: new fields.StringField({
        required: true,
        initial: 'normal',
        choices: ['untrained', 'normal', 'skilled', 'expert', 'ace']
      }),

      // Movement
      speed: new fields.StringField({required: false, initial: "12 squares"}),
      starshipSpeed: new fields.StringField({required: false, initial: "4 squares"}),
      maxVelocity: new fields.StringField({required: false, initial: "800 km/h"}),
      maneuver: new fields.StringField({required: false, initial: "+0"}),

      // Other vehicle properties
      size: new fields.StringField({
        required: false,
        initial: "Colossal",
        choices: ['Large', 'Huge', 'Gargantuan', 'Colossal', 'Colossal (Frigate)', 'Colossal (Cruiser)', 'Colossal (Station)']
      }),
      crew: new fields.StringField({required: false, initial: "1"}),
      passengers: new fields.StringField({required: false, initial: "0"}),
      cargo: new fields.StringField({required: false, initial: "100 kg"}),
      consumables: new fields.StringField({required: false, initial: "1 week"}),
      hyperdrive: new fields.StringField({required: false, initial: "x1"}),
      cost: new fields.SchemaField({
        new: new fields.NumberField({required: true, initial: 0, integer: true}),
        used: new fields.NumberField({required: true, initial: 0, integer: true})
      }),

      // Condition Track for vehicles
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({required: true, initial: 0, min: 0, max: 5, integer: true}),
        penalty: new fields.NumberField({required: true, initial: 0, integer: true})
      }),

      // Cover provided to occupants
      cover: new fields.StringField({
        required: true,
        initial: 'total',
        choices: ['none', 'normal', 'improved', 'total']
      })
    };
  }

  prepareDerivedData() {
    // Calculate ability modifiers
    for (const [key, ability] of Object.entries(this.attributes)) {
      const total = ability.base + ability.racial + ability.temp;
      ability.total = total;
      ability.mod = Math.floor((total - 10) / 2);
    }

    // Get size modifier
    const sizeModifier = this._getSizeModifier();

    // Calculate Reflex Defense
    // Formula: 10 + Size Modifier + (Armor Bonus OR Pilot's Heroic Level) + DEX mod
    const dexMod = this.attributes.dex.mod || 0;

    let reflexBonus = 0;
    if (this.usePilotLevel) {
      // Try to get pilot from crew positions
      const pilot = this._getPilot();
      reflexBonus = pilot ? (pilot.system?.heroicLevel || pilot.system?.level || 0) : this.armorBonus;
    } else {
      reflexBonus = this.armorBonus;
    }

    this.reflexDefense = 10 + sizeModifier + reflexBonus + dexMod;

    // Calculate Fortitude Defense
    // Formula: 10 + STR mod
    const strMod = this.attributes.str.mod || 0;
    this.fortitudeDefense = 10 + strMod;

    // Calculate Damage Threshold
    // Formula: Fortitude Defense + Size-specific modifier
    const sizeDamageModifier = this._getSizeDamageThresholdModifier();
    this.damageThreshold = this.fortitudeDefense + sizeDamageModifier;

    // Calculate Condition Track penalty
    if (this.conditionTrack) {
      const conditionStep = this.conditionTrack.current || 0;
      const penalties = [0, -1, -2, -5, -10, 0]; // Disabled at step 4-5
      this.conditionTrack.penalty = penalties[conditionStep] || 0;
    }

    // Ensure shield/hull values are numbers
    if (this.shields) {
      this.shields.value = Number(this.shields.value) || 0;
      this.shields.max = Number(this.shields.max) || 0;
    }

    if (this.hull) {
      this.hull.value = Number(this.hull.value) || 0;
      this.hull.max = Number(this.hull.max) || 0;
    }
  }

  /**
   * Get size modifier for Reflex Defense
   * @private
   */
  _getSizeModifier() {
    const size = (this.size || 'medium').toLowerCase();
    const modifiers = {
      'large': -1,
      'huge': -2,
      'gargantuan': -5,
      'colossal': -10,
      'colossal (frigate)': -10,
      'colossal (cruiser)': -10,
      'colossal (station)': -10
    };
    return modifiers[size] || 0;
  }

  /**
   * Get size-specific damage threshold modifier
   * @private
   */
  _getSizeDamageThresholdModifier() {
    const size = (this.size || 'medium').toLowerCase();
    const modifiers = {
      'large': 5,
      'huge': 10,
      'gargantuan': 20,
      'colossal': 50,
      'colossal (frigate)': 100,
      'colossal (cruiser)': 200,
      'colossal (station)': 500
    };
    return modifiers[size] || 0;
  }

  /**
   * Get pilot actor if assigned to crew
   * @private
   */
  _getPilot() {
    if (!this.crewPositions?.pilot) return null;

    const pilotName = this.crewPositions.pilot;
    return game.actors?.getName(pilotName) || null;
  }
}

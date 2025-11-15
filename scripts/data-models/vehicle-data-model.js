import { SWSEActorDataModel } from './actor-data-model.js';

export class SWSEVehicleDataModel extends SWSEActorDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const parentSchema = super.defineSchema();

    return {
      ...parentSchema, // Inherit all parent fields

      // Vehicles have attributes too! (override parent abilities)
      attributes: new fields.SchemaField({
        str: new fields.SchemaField({
          base: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 10,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 10;
              const num = Number(value);
              return Number.isNaN(num) ? 10 : Math.floor(num);
            }
          }),
          racial: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          }),
          temp: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          })
        }),
        dex: new fields.SchemaField({
          base: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 10,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 10;
              const num = Number(value);
              return Number.isNaN(num) ? 10 : Math.floor(num);
            }
          }),
          racial: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          }),
          temp: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          })
        }),
        con: new fields.SchemaField({
          base: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 10,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 10;
              const num = Number(value);
              return Number.isNaN(num) ? 10 : Math.floor(num);
            }
          }),
          racial: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          }),
          temp: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          })
        }),
        int: new fields.SchemaField({
          base: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 10,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 10;
              const num = Number(value);
              return Number.isNaN(num) ? 10 : Math.floor(num);
            }
          }),
          racial: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          }),
          temp: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          })
        }),
        wis: new fields.SchemaField({
          base: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 10,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 10;
              const num = Number(value);
              return Number.isNaN(num) ? 10 : Math.floor(num);
            }
          }),
          racial: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          }),
          temp: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          })
        }),
        cha: new fields.SchemaField({
          base: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 10,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 10;
              const num = Number(value);
              return Number.isNaN(num) ? 10 : Math.floor(num);
            }
          }),
          racial: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          }),
          temp: new fields.NumberField({
            required: true,
            nullable: true,
            initial: 0,
            integer: true,
            clean: value => {
              if (value === null || value === undefined || value === "") return 0;
              const num = Number(value);
              return Number.isNaN(num) ? 0 : Math.floor(num);
            }
          })
        })
      }),

      // Vehicle stats
      hull: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 50,
          min: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 50;
            const num = Number(value);
            return Number.isNaN(num) ? 50 : Math.floor(num);
          }
        }),
        max: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 50,
          min: 1,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 50;
            const num = Number(value);
            return Number.isNaN(num) ? 50 : Math.floor(num);
          }
        })
      }),

      shields: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          min: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        }),
        max: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          min: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        })
      }),

      // Defenses (calculated in prepareDerivedData)
      reflexDefense: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 10,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 10;
          const num = Number(value);
          return Number.isNaN(num) ? 10 : Math.floor(num);
        }
      }),
      fortitudeDefense: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 10,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 10;
          const num = Number(value);
          return Number.isNaN(num) ? 10 : Math.floor(num);
        }
      }),
      damageThreshold: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 30,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 30;
          const num = Number(value);
          return Number.isNaN(num) ? 30 : Math.floor(num);
        }
      }),
      damageReduction: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 0;
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      }),

      // Armor bonus (or can use pilot's heroic level)
      armorBonus: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 0;
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      }),
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
      // Note: choices removed to allow clean function to run before validation
      size: new fields.StringField({
        required: false,
        initial: "colossal",
        clean: value => {
          // Normalize capitalized values to lowercase for backwards compatibility
          if (typeof value === 'string') {
            const normalized = value.toLowerCase();
            const validSizes = ['large', 'huge', 'gargantuan', 'colossal', 'colossal (frigate)', 'colossal (cruiser)', 'colossal (station)'];
            return validSizes.includes(normalized) ? normalized : "colossal";
          }
          return "colossal";
        },
        validate: value => {
          const validSizes = ['large', 'huge', 'gargantuan', 'colossal', 'colossal (frigate)', 'colossal (cruiser)', 'colossal (station)'];
          if (value && !validSizes.includes(value)) {
            console.warn(`SWSE | Invalid vehicle size "${value}" was auto-corrected to "colossal". Valid sizes are: ${validSizes.join(', ')}`);
          }
        }
      }),
      crew: new fields.StringField({required: false, initial: "1"}),
      passengers: new fields.StringField({required: false, initial: "0"}),
      cargo: new fields.StringField({required: false, initial: "100 kg"}),
      consumables: new fields.StringField({required: false, initial: "1 week"}),
      hyperdrive: new fields.StringField({required: false, initial: "x1"}),
      cost: new fields.SchemaField({
        new: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        }),
        used: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        })
      }),

      // Condition Track for vehicles
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          min: 0,
          max: 5,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        }),
        penalty: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        })
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
    const size = (this.size || 'colossal').toLowerCase();
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
    const size = (this.size || 'colossal').toLowerCase();
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

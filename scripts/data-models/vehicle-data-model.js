import { SWSEActorDataModel } from './actor-data-model.js';

export class SWSEVehicleDataModel extends SWSEActorDataModel {

  /**
   * Override shimData to handle vehicle-specific field types
   * Vehicles use strings for initiative and speed, not integers
   */
  static shimData(data, options) {
    // Call parent shimData first to handle common fields
    const shimmed = super.shimData(data, options);

    // For vehicles, ensure initiative and speed are STRINGS, not integers
    if (shimmed.initiative !== undefined && shimmed.initiative !== null) {
      shimmed.initiative = String(shimmed.initiative);
    }

    if (shimmed.speed !== undefined && shimmed.speed !== null) {
      shimmed.speed = String(shimmed.speed);
    }

    // Ensure attributes have integer values (vehicles still use attributes)
    if (shimmed.attributes) {
      for (const attrType of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        if (shimmed.attributes[attrType]) {
          const attr = shimmed.attributes[attrType];
          for (const field of ['base', 'racial', 'temp']) {
            if (attr[field] !== undefined && attr[field] !== null) {
              const num = Number(attr[field]);
              attr[field] = Number.isNaN(num) ? (field === 'base' ? 10 : 0) : Math.floor(num);
            }
          }
        }
      }
    }

    // Ensure cost fields are integers
    if (shimmed.cost) {
      if (shimmed.cost.new !== undefined && shimmed.cost.new !== null) {
        const num = Number(shimmed.cost.new);
        shimmed.cost.new = Number.isNaN(num) ? 0 : Math.floor(num);
      }
      if (shimmed.cost.used !== undefined && shimmed.cost.used !== null) {
        const num = Number(shimmed.cost.used);
        shimmed.cost.used = Number.isNaN(num) ? 0 : Math.floor(num);
      }
    }

    return shimmed;
  }

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
              if (value === null || value === undefined || value === '') {return 10;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 10;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 10;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 10;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 10;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 10;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
              if (value === null || value === undefined || value === '') {return 0;}
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
            if (value === null || value === undefined || value === '') {return 50;}
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
            if (value === null || value === undefined || value === '') {return 50;}
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
            if (value === null || value === undefined || value === '') {return 0;}
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
            if (value === null || value === undefined || value === '') {return 0;}
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
          if (value === null || value === undefined || value === '') {return 10;}
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
          if (value === null || value === undefined || value === '') {return 10;}
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
          if (value === null || value === undefined || value === '') {return 30;}
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
          if (value === null || value === undefined || value === '') {return 0;}
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
          if (value === null || value === undefined || value === '') {return 0;}
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      }),
      usePilotLevel: new fields.BooleanField({ required: true, initial: true }),

      // Crew Quality
      crewQuality: new fields.StringField({
        required: true,
        initial: 'normal',
        choices: ['untrained', 'normal', 'skilled', 'expert', 'ace']
      }),

      // Movement
      speed: new fields.StringField({ required: false, initial: '12 squares' }),
      starshipSpeed: new fields.StringField({ required: false, initial: '4 squares' }),
      maxVelocity: new fields.StringField({ required: false, initial: '800 km/h' }),
      maneuver: new fields.StringField({ required: false, initial: '+0' }),
      initiative: new fields.StringField({ required: false, initial: '+0' }),
      baseAttackBonus: new fields.StringField({ required: false, initial: '+0' }),
      flatFooted: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 10,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === '') {return 10;}
          const num = Number(value);
          return Number.isNaN(num) ? 10 : Math.floor(num);
        }
      }),

      // Other vehicle properties
      type: new fields.StringField({ required: false, initial: '' }),
      size: new fields.StringField({
        required: false,
        initial: 'colossal',
        clean: value => {
          // Normalize capitalized values to lowercase for backwards compatibility
          if (typeof value === 'string') {
            const normalized = value.toLowerCase();
            const validSizes = ['large', 'huge', 'gargantuan', 'colossal', 'colossal (frigate)', 'colossal (cruiser)', 'colossal (station)'];
            return validSizes.includes(normalized) ? normalized : 'colossal';
          }
          return 'colossal';
        }
      }),
      crew: new fields.StringField({ required: false, initial: '1' }),
      passengers: new fields.StringField({ required: false, initial: '0' }),
      cargo: new fields.StringField({ required: false, initial: '100 kg' }),
      consumables: new fields.StringField({ required: false, initial: '1 week' }),
      hyperdrive: new fields.StringField({ required: false, initial: 'x1' }),

      // Additional vehicle statistics per SWSE rules
      challengeLevel: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 1,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === '') {return 1;}
          const num = Number(value);
          return Number.isNaN(num) ? 1 : Math.floor(num);
        }
      }),

      cover: new fields.StringField({
        required: true,
        initial: 'none',
        choices: ['none', 'normal', 'improved', 'total']
      }),

      payload: new fields.StringField({ required: false, initial: '' }),
      availability: new fields.StringField({ required: false, initial: '' }),

      // Calculated combat statistics
      perception: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === '') {return 0;}
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      }),

      grappleModifier: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === '') {return 0;}
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      }),

      attackBonus: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === '') {return 0;}
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      }),

      cost: new fields.SchemaField({
        new: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === '') {return 0;}
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
            if (value === null || value === undefined || value === '') {return 0;}
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
            if (value === null || value === undefined || value === '') {return 0;}
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        }),
        persistentSteps: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          min: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === '') {return 0;}
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
            if (value === null || value === undefined || value === '') {return 0;}
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        })
      }),

      // Weapons array
      weapons: new fields.ArrayField(new fields.SchemaField({
        name: new fields.StringField({ required: false, initial: '' }),
        arc: new fields.StringField({ required: false, initial: '' }),
        attackBonus: new fields.StringField({ required: false, initial: '' }),
        damage: new fields.StringField({ required: false, initial: '' }),
        range: new fields.StringField({ required: false, initial: '' })
      }), { initial: [] }),

      // Crew positions - stores both name and UUID for each crew member
      crewPositions: new fields.SchemaField({
        pilot: new fields.SchemaField({
          name: new fields.StringField({ required: false, nullable: true, initial: null }),
          uuid: new fields.StringField({ required: false, nullable: true, initial: null })
        }, { required: false, nullable: true, initial: null }),
        copilot: new fields.SchemaField({
          name: new fields.StringField({ required: false, nullable: true, initial: null }),
          uuid: new fields.StringField({ required: false, nullable: true, initial: null })
        }, { required: false, nullable: true, initial: null }),
        gunner: new fields.SchemaField({
          name: new fields.StringField({ required: false, nullable: true, initial: null }),
          uuid: new fields.StringField({ required: false, nullable: true, initial: null })
        }, { required: false, nullable: true, initial: null }),
        engineer: new fields.SchemaField({
          name: new fields.StringField({ required: false, nullable: true, initial: null }),
          uuid: new fields.StringField({ required: false, nullable: true, initial: null })
        }, { required: false, nullable: true, initial: null }),
        shields: new fields.SchemaField({
          name: new fields.StringField({ required: false, nullable: true, initial: null }),
          uuid: new fields.StringField({ required: false, nullable: true, initial: null })
        }, { required: false, nullable: true, initial: null }),
        commander: new fields.SchemaField({
          name: new fields.StringField({ required: false, nullable: true, initial: null }),
          uuid: new fields.StringField({ required: false, nullable: true, initial: null })
        }, { required: false, nullable: true, initial: null })
      }),

      // Crew notes
      crewNotes: new fields.StringField({ required: false, initial: '' }),

      // Additional details
      carried_craft: new fields.StringField({ required: false, initial: '' }),
      tags: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      description: new fields.StringField({ required: false, initial: '' }),
      sourcebook: new fields.StringField({ required: false, initial: '' }),
      page: new fields.NumberField({
        required: false,
        nullable: true,
        initial: null,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === '') {return null;}
          const num = Number(value);
          return Number.isNaN(num) ? null : Math.floor(num);
        }
      }),

      // Hyperdrive classes
      hyperdrive_class: new fields.StringField({ required: false, initial: '' }),
      backup_class: new fields.StringField({ required: false, initial: '' }),

      // Cargo capacity (string to allow units)
      cargo_capacity: new fields.StringField({ required: false, initial: '' }),

      // Sensors
      senses: new fields.StringField({ required: false, initial: '' }),

      // Emplacement Points for vehicle modifications
      emplacementPoints: new fields.NumberField({
        required: true,
        nullable: true,
        initial: value => {
          // This will be calculated in prepareDerivedData
          return null;
        },
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === '') {return null;}
          const num = Number(value);
          return Number.isNaN(num) ? null : Math.floor(num);
        }
      }),
      unusedEmplacementPoints: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === '') {return 0;}
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      })
    };
  }

  /**
   * Get default emplacement points for a given size
   * @param {string} size - The vehicle size
   * @returns {number} The default EP for the size
   */
  static getDefaultEmplacementPoints(size) {
    const sizeMap = {
      'huge': 1,
      'gargantuan': 2,
      'colossal': 4,
      'colossal (frigate)': 2,
      'colossal (cruiser)': 8,
      'colossal (station)': 16,
      'large': 0
    };
    return sizeMap[size?.toLowerCase()] || 0;
  }

  prepareDerivedData() {
    // Calculate ability modifiers
    for (const [key, ability] of Object.entries(this.attributes)) {
      const total = ability.base + ability.racial + ability.temp;
      ability.total = total;
      ability.mod = Math.floor((total - 10) / 2);
    }

    // Set default emplacement points based on size if not explicitly set
    if (this.emplacementPoints === null || this.emplacementPoints === undefined) {
      this.emplacementPoints = SWSEVehicleDataModel.getDefaultEmplacementPoints(this.size);
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

    // Calculate Flat-Footed Defense (Reflex without DEX)
    this.flatFooted = 10 + sizeModifier + reflexBonus;

    // Calculate Fortitude Defense
    // Formula: 10 + STR mod
    const strMod = this.attributes.str.mod || 0;
    this.fortitudeDefense = 10 + strMod;

    // Calculate Damage Threshold
    // Formula: Fortitude Defense + Size-specific modifier
    const sizeDamageModifier = this._getSizeDamageThresholdModifier();
    this.damageThreshold = this.fortitudeDefense + sizeDamageModifier;

    // Enhanced Massive Damage: override DT if formula modified
    this._applyEnhancedDamageThreshold(sizeDamageModifier);

    // Calculate Condition Track penalty
    if (this.conditionTrack) {
      const conditionStep = this.conditionTrack.current || 0;
      const penalties = [0, -1, -2, -5, -10, 0]; // Disabled at step 4-5
      this.conditionTrack.penalty = penalties[conditionStep] || 0;
    }

    // Calculate Perception (best crew member perception)
    this._calculatePerception();

    // Calculate Attack Bonus (Gunner's BAB + Vehicle INT modifier)
    this._calculateAttackBonus();

    // Calculate Grapple Modifier (Pilot's BAB + Vehicle STR modifier + size modifier)
    this._calculateGrappleModifier();

    // Calculate Initiative (Pilot's Initiative mod + Vehicle size + Vehicle DEX)
    this._calculateInitiative();

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
    if (!this.crewPositions?.pilot) {return null;}

    const pilot = this.crewPositions.pilot;
    const pilotName = typeof pilot === 'string' ? pilot : pilot?.name;
    if (!pilotName) {return null;}

    return game.actors?.getName(pilotName) || null;
  }

  /**
   * Get gunner actor if assigned to crew
   * @private
   */
  _getGunner() {
    if (!this.crewPositions?.gunner) {return null;}

    const gunner = this.crewPositions.gunner;
    const gunnerName = typeof gunner === 'string' ? gunner : gunner?.name;
    if (!gunnerName) {return null;}

    return game.actors?.getName(gunnerName) || null;
  }

  /**
   * Calculate Perception from best crew member
   * @private
   */
  _calculatePerception() {
    let bestPerception = 0;

    // Check all crew positions for their perception modifier
    for (const [, crewData] of Object.entries(this.crewPositions || {})) {
      if (!crewData) {continue;}

      const crewName = typeof crewData === 'string' ? crewData : crewData?.name;
      if (!crewName) {continue;}

      const crewActor = game.actors?.getName(crewName);
      if (!crewActor) {continue;}

      const perception = crewActor.system?.skills?.perception?.total || 0;
      if (perception > bestPerception) {
        bestPerception = perception;
      }
    }

    this.perception = bestPerception;
  }

  /**
   * Calculate Attack Bonus
   * Formula: Gunner's Base Attack Bonus + Vehicle's Intelligence modifier + misc bonuses
   * @private
   */
  _calculateAttackBonus() {
    const gunner = this._getGunner();
    const intMod = this.attributes.int.mod || 0;

    if (!gunner) {
      // No gunner assigned, just use vehicle INT modifier
      this.attackBonus = intMod;
      return;
    }

    // Get gunner's base attack bonus
    const gunnerBAB = gunner.system?.baseAttackBonus || 0;

    // Check if pilot is trained in Pilot skill (adds +2 bonus to pilot-controlled weapons)
    const pilot = this._getPilot();
    let pilotTrainedBonus = 0;
    if (pilot) {
      const pilotSkill = pilot.system?.skills?.pilot;
      if (pilotSkill?.trained) {
        pilotTrainedBonus = 2;
      }
    }

    this.attackBonus = gunnerBAB + intMod + pilotTrainedBonus;
  }

  /**
   * Calculate Grapple Modifier
   * Formula: Pilot's Base Attack Bonus + Vehicle's Strength modifier + Vehicle's Size modifier
   * @private
   */
  _calculateGrappleModifier() {
    const pilot = this._getPilot();
    const strMod = this.attributes.str.mod || 0;

    // Get size-specific grapple modifier
    const sizeGrappleModifier = this._getSizeGrappleModifier();

    if (!pilot) {
      // No pilot assigned, just use vehicle STR + size
      this.grappleModifier = strMod + sizeGrappleModifier;
      return;
    }

    // Get pilot's base attack bonus
    const pilotBAB = pilot.system?.baseAttackBonus || 0;

    this.grappleModifier = pilotBAB + strMod + sizeGrappleModifier;
  }

  /**
   * Get size-specific grapple modifier (different from reflex size modifier)
   * @private
   */
  _getSizeGrappleModifier() {
    const size = (this.size || 'colossal').toLowerCase();
    const modifiers = {
      'large': 5,
      'huge': 10,
      'gargantuan': 15,
      'colossal': 20,
      'colossal (frigate)': 25,
      'colossal (cruiser)': 30,
      'colossal (station)': 35
    };
    return modifiers[size] || 0;
  }

  /**
   * Calculate Vehicle Initiative per SWSE Rules
   * Formula: Pilot's Initiative modifier (or Pilot skill modifier if trained) + Vehicle's size modifier + Vehicle's Dexterity modifier
   * Special cases:
   * - If pilot is flat-footed or vehicle is out of control, lose Dexterity bonus
   * - If vehicle is disabled, treat vehicle Dex as 0 (-5 penalty instead)
   * @private
   */
  _calculateInitiative() {
    const pilot = this._getPilot();
    let dexMod = this.attributes.dex.mod || 0;
    const sizeModifier = this._getSizeModifier();

    // Check vehicle state conditions
    const vehicleDisabled = this.conditionTrack?.current >= 4;
    const vehicleOutOfControl = this.attributes?.outOfControl || false;

    // If vehicle is disabled, treat as Dex 0 (-5 penalty)
    if (vehicleDisabled) {
      dexMod = -5;
    } else if (vehicleOutOfControl) {
      // If vehicle is out of control, lose Dexterity bonus
      dexMod = 0;
    }

    // Get pilot's initiative modifier
    let pilotInitiativeMod = 0;
    if (pilot) {
      // Use pilot's initiative skill total
      const skills = pilot.system?.skills;
      if (skills?.initiative) {
        pilotInitiativeMod = skills.initiative.total || 0;
      } else {
        // Fallback to 0 if no initiative skill (use BAB approach would double-count dex)
        pilotInitiativeMod = 0;
      }

      // Check if pilot is flat-footed - if so, they don't get their dex bonus to initiative
      const pilotFlatFooted = pilot.system?.conditions?.flatFooted || false;
      if (pilotFlatFooted) {
        // Remove pilot's dex bonus from their initiative modifier
        const pilotDexMod = pilot.system?.abilities?.dex?.mod || 0;
        pilotInitiativeMod = Math.max(0, pilotInitiativeMod - pilotDexMod);
      }
    }

    const initiativeBonus = pilotInitiativeMod + sizeModifier + dexMod;
    this.initiative = `${initiativeBonus >= 0 ? '+' : ''}${initiativeBonus}`;
  }

  /**
   * Apply enhanced DT formula override from ThresholdEngine settings.
   * Only activates if both enableEnhancedMassiveDamage and modifyDamageThresholdFormula are true.
   * @param {number} sizeDamageModifier - The size-based DT modifier already calculated
   */
  _applyEnhancedDamageThreshold(sizeDamageModifier) {
    try {
      const enabled = game.settings?.get('foundryvtt-swse', 'enableEnhancedMassiveDamage');
      const modifyFormula = game.settings?.get('foundryvtt-swse', 'modifyDamageThresholdFormula');
      if (!enabled || !modifyFormula) return;

      const formulaType = game.settings?.get('foundryvtt-swse', 'damageThresholdFormulaType') ?? 'fullLevel';
      const vehicleLevel = this.challengeLevel ?? 0;

      if (formulaType === 'halfLevel') {
        this.damageThreshold = this.fortitudeDefense + Math.floor(vehicleLevel / 2) + sizeDamageModifier;
      } else {
        this.damageThreshold = this.fortitudeDefense + vehicleLevel + sizeDamageModifier;
      }
    } catch {
      // Settings not yet registered or not available; skip silently
    }
  }
}

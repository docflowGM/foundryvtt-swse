/**
 * Vehicle Modification Manager
 * Handles loading, calculating, and managing starship modifications
 */

export class VehicleModificationManager {

  static _stockShips = null;
  static _movementSystems = null;
  static _defenseSystems = null;
  static _weaponSystems = null;
  static _accessories = null;
  static _initialized = false;

  /**
   * Initialize by loading all modification data from compendium packs
   */
  static async init() {
    if (this._initialized) return;

    try {
      // Load stock ships from compendium
      const stockShipsPack = game.packs.get('swse.stock_ships');
      if (stockShipsPack) {
        const shipDocs = await stockShipsPack.getDocuments();
        this._stockShips = shipDocs.map(doc => this._convertActorToStockShip(doc));
      } else {
        console.warn('SWSE | Stock ships compendium not found');
        this._stockShips = [];
      }

      // Load vehicle modifications from compendium
      const modsPack = game.packs.get('swse.vehicle_modifications');
      if (modsPack) {
        const modDocs = await modsPack.getDocuments();

        // Separate by category
        this._movementSystems = [];
        this._defenseSystems = [];
        this._weaponSystems = [];
        this._accessories = [];

        for (const doc of modDocs) {
          const mod = this._convertItemToModification(doc);
          const category = doc.system.category || doc.flags?.swse?.modCategory || 'Accessory';

          if (category.toLowerCase().includes('movement')) {
            this._movementSystems.push(mod);
          } else if (category.toLowerCase().includes('defense')) {
            this._defenseSystems.push(mod);
          } else if (category.toLowerCase().includes('weapon')) {
            this._weaponSystems.push(mod);
          } else {
            this._accessories.push(mod);
          }
        }
      } else {
        console.warn('SWSE | Vehicle modifications compendium not found');
        this._movementSystems = [];
        this._defenseSystems = [];
        this._weaponSystems = [];
        this._accessories = [];
      }

      this._initialized = true;
      console.log('SWSE | Vehicle Modification Manager initialized');
      console.log(`  - ${this._stockShips.length} stock ships`);
      console.log(`  - ${this._movementSystems.length} movement systems`);
      console.log(`  - ${this._defenseSystems.length} defense systems`);
      console.log(`  - ${this._weaponSystems.length} weapon systems`);
      console.log(`  - ${this._accessories.length} accessories`);
    } catch (error) {
      console.error('SWSE | Failed to load vehicle modification data:', error);
      this._stockShips = [];
      this._movementSystems = [];
      this._defenseSystems = [];
      this._weaponSystems = [];
      this._accessories = [];
    }
  }

  /**
   * Convert FoundryVTT vehicle actor to stock ship data format
   * @private
   */
  static _convertActorToStockShip(doc) {
    const sys = doc.system;
    return {
      name: doc.name,
      size: sys.size || "Huge",
      strength: sys.abilities?.str?.base || 10,
      dexterity: sys.abilities?.dex?.base || 10,
      intelligence: sys.abilities?.int?.base || 10,
      speedCharacter: sys.speed || "0 sq.",
      speedStarship: sys.speedStarship || "0 sq.",
      hitPoints: sys.hp?.max || 100,
      dr: sys.damageReduction || 0,
      armor: sys.armor || 0,
      cost: sys.cost || 0,
      costModifier: sys.costModifier || 1,
      crew: sys.crew || 1,
      passengers: sys.passengers || 0,
      cargoCapacity: sys.cargoCapacity || "0 kg",
      consumables: sys.consumables || "0 Days",
      emplacementPoints: sys.emplacementPoints || 0,
      unusedEmplacementPoints: sys.unusedEmplacementPoints || 0
    };
  }

  /**
   * Convert FoundryVTT equipment item to modification data format
   * @private
   */
  static _convertItemToModification(doc) {
    const sys = doc.system;
    const vehicleData = sys.vehicleModData || {};

    return {
      id: sys.modId || vehicleData.originalId || doc.name.toLowerCase().replace(/\s+/g, '-'),
      name: doc.name,
      category: sys.category || vehicleData.category || 'Accessory',
      weaponType: sys.weaponType || vehicleData.weaponType || '',
      damage: sys.damage || '',
      emplacementPoints: sys.emplacementPoints || 0,
      availability: sys.availability || 'Common',
      sizeRestriction: sys.sizeRestriction || vehicleData.sizeRestriction || null,
      cost: sys.cost || 0,
      costType: sys.costType || 'flat',
      costMultiplier: sys.costMultiplier || 1,
      description: doc.system.description || '',
      effect: vehicleData.effect || ''
    };
  }

  /**
   * Get all stock ships
   */
  static getStockShips() {
    return this._stockShips || [];
  }

  /**
   * Get stock ship by name
   */
  static getStockShip(name) {
    return this._stockShips?.find(ship => ship.name === name);
  }

  /**
   * Get all modifications by category
   */
  static getModificationsByCategory(category) {
    switch(category.toLowerCase()) {
      case 'movement':
        return this._movementSystems || [];
      case 'defense':
        return this._defenseSystems || [];
      case 'weapon':
      case 'weapons':
        return this._weaponSystems || [];
      case 'accessory':
      case 'accessories':
        return this._accessories || [];
      default:
        return [];
    }
  }

  /**
   * Get all modifications
   */
  static getAllModifications() {
    return [
      ...(this._movementSystems || []),
      ...(this._defenseSystems || []),
      ...(this._weaponSystems || []),
      ...(this._accessories || [])
    ];
  }

  /**
   * Get modification by ID
   */
  static getModification(id) {
    return this.getAllModifications().find(mod => mod.id === id);
  }

  /**
   * Calculate the cost of a modification for a specific ship
   * @param {Object} modification - The modification object
   * @param {Object} stockShip - The stock ship object
   * @param {boolean} isNonstandard - Whether this is a nonstandard modification
   * @returns {number} - The calculated cost in credits
   */
  static calculateModificationCost(modification, stockShip, isNonstandard = false) {
    let baseCost = modification.cost || 0;

    // Handle cost type
    if (modification.costType === 'base') {
      baseCost *= stockShip.costModifier;
    } else if (modification.costType === 'multiplier') {
      // Multiplier type requires a base weapon/system cost
      // This would be handled differently in actual usage
      baseCost = 0; // Placeholder
    }
    // 'flat' cost type uses the cost as-is

    // Nonstandard modifications cost x5
    if (isNonstandard) {
      baseCost *= 5;
    }

    return baseCost;
  }

  /**
   * Calculate emplacement points required for a modification
   * @param {Object} modification - The modification object
   * @param {boolean} isNonstandard - Whether this is a nonstandard modification
   * @returns {number} - The emplacement points required
   */
  static calculateEmplacementPoints(modification, isNonstandard = false) {
    let ep = modification.emplacementPoints || 0;

    // Nonstandard modifications require double emplacement points
    if (isNonstandard) {
      ep *= 2;
    }

    return ep;
  }

  /**
   * Check if a modification can be installed on a ship
   * @param {Object} modification - The modification to check
   * @param {Object} stockShip - The stock ship
   * @param {Array} currentModifications - Currently installed modifications
   * @returns {Object} - {canInstall: boolean, reason: string}
   */
  static canInstall Modification(modification, stockShip, currentModifications = []) {
    // Check size restriction
    if (modification.sizeRestriction) {
      const allowed = this._checkSizeRestriction(stockShip.size, modification.sizeRestriction);
      if (!allowed) {
        return {
          canInstall: false,
          reason: `Requires ship size: ${modification.sizeRestriction}`
        };
      }
    }

    // Check for conflicting modifications
    // For example, can only have one hyperdrive
    if (modification.id.startsWith('hyperdrive-')) {
      const hasHyperdrive = currentModifications.some(mod =>
        mod.id.startsWith('hyperdrive-')
      );
      if (hasHyperdrive) {
        return {
          canInstall: false,
          reason: 'Already has a hyperdrive installed (remove existing first)'
        };
      }
    }

    // Check for shield conflicts
    if (modification.id.startsWith('shields-')) {
      const hasShields = currentModifications.some(mod =>
        mod.id.startsWith('shields-')
      );
      if (hasShields) {
        return {
          canInstall: false,
          reason: 'Already has shields installed (remove existing first)'
        };
      }
    }

    return {
      canInstall: true,
      reason: ''
    };
  }

  /**
   * Check if ship size meets restriction
   * @private
   */
  static _checkSizeRestriction(shipSize, restriction) {
    const sizeOrder = [
      'Huge',
      'Gargantuan',
      'Colossal',
      'Colossal (Frigate)',
      'Colossal (Cruiser)',
      'Colossal (Station)'
    ];

    const shipIndex = sizeOrder.indexOf(shipSize);

    // Handle "X or Larger" restrictions
    if (restriction.includes('or Larger')) {
      const requiredSize = restriction.replace(' or Larger', '');
      const requiredIndex = sizeOrder.indexOf(requiredSize);
      return shipIndex >= requiredIndex;
    }

    // Handle "X or Smaller" restrictions
    if (restriction.includes('or Smaller')) {
      const requiredSize = restriction.replace(' or Smaller', '');
      const requiredIndex = sizeOrder.indexOf(requiredSize);
      return shipIndex <= requiredIndex;
    }

    // Exact match
    return shipSize === restriction;
  }

  /**
   * Calculate total emplacement points used
   * @param {Array} modifications - Array of installed modifications
   * @param {Object} stockShip - The stock ship
   * @returns {Object} - {used, available, total}
   */
  static calculateEmplacementPointsTotal(modifications, stockShip) {
    const used = modifications.reduce((sum, mod) => {
      return sum + (mod.emplacementPoints || 0);
    }, 0);

    const available = (stockShip.emplacementPoints || 0) + (stockShip.unusedEmplacementPoints || 0);

    return {
      used,
      available,
      total: available,
      remaining: available - used
    };
  }

  /**
   * Calculate total cost of modifications
   * @param {Array} modifications - Array of installed modifications
   * @param {Object} stockShip - The stock ship
   * @returns {number} - Total cost in credits
   */
  static calculateTotalCost(modifications, stockShip) {
    const modCost = modifications.reduce((sum, mod) => {
      return sum + this.calculateModificationCost(mod, stockShip);
    }, 0);

    return (stockShip.cost || 0) + modCost;
  }

  /**
   * Calculate installation time in days
   * @param {Object} modification - The modification
   * @param {Object} stockShip - The stock ship
   * @param {number} workers - Number of workers (default: minimum for ship size)
   * @param {number} lacksEmplacementPoints - How many EP are lacking
   * @returns {number} - Installation time in days
   */
  static calculateInstallationTime(modification, stockShip, workers = null, lacksEmplacementPoints = 0) {
    // Minimum work force by size
    const minWorkForce = {
      'Huge': 1,
      'Gargantuan': 1,
      'Colossal': 5,
      'Colossal (Frigate)': 10,
      'Colossal (Cruiser)': 20,
      'Colossal (Station)': 50
    };

    const actualWorkers = workers || minWorkForce[stockShip.size] || 1;
    const ep = modification.emplacementPoints || 0;
    const costMod = stockShip.costModifier || 1;

    let baseTime = (ep * costMod) / actualWorkers;

    // Add extra time if lacking emplacement points
    if (lacksEmplacementPoints > 0) {
      baseTime += (lacksEmplacementPoints * 2);
    }

    return Math.max(1, Math.ceil(baseTime));
  }

  /**
   * Calculate Mechanics DC for installation
   * @param {Object} modification - The modification
   * @param {number} lacksEmplacementPoints - How many EP are lacking
   * @returns {number} - Mechanics check DC
   */
  static calculateInstallationDC(modification, lacksEmplacementPoints = 0) {
    const baseDC = 20;
    const ep = modification.emplacementPoints || 0;
    let dc = baseDC + ep;

    // Add +5 per lacking emplacement point
    if (lacksEmplacementPoints > 0) {
      dc += (lacksEmplacementPoints * 5);
    }

    return dc;
  }

  /**
   * Determine if a modification is nonstandard for a given stock ship
   * @param {Object} modification - The modification
   * @param {Object} stockShip - The stock ship
   * @returns {boolean} - True if nonstandard
   */
  static isNonstandardModification(modification, stockShip) {
    // Hyperdrives are nonstandard for TIE fighters and similar
    if (modification.id.startsWith('hyperdrive-') &&
        stockShip.name.toLowerCase().includes('fighter') &&
        !stockShip.name.toLowerCase().includes('x-wing')) {
      return true;
    }

    // Shields are nonstandard for TIE fighters
    if (modification.id.startsWith('shields-') &&
        stockShip.name.toLowerCase().includes('tie')) {
      return true;
    }

    // This would need more complex logic based on stock configuration
    // For now, return false (can be expanded based on requirements)
    return false;
  }

  /**
   * Get modifications filtered by availability
   * @param {string} category - The category to filter
   * @param {string} availability - Filter by availability (Common, Licensed, Restricted, Military, Illegal)
   * @returns {Array} - Filtered modifications
   */
  static getModificationsByAvailability(category, availability) {
    const mods = this.getModificationsByCategory(category);
    if (!availability || availability === 'all') return mods;
    return mods.filter(mod => mod.availability === availability);
  }
}

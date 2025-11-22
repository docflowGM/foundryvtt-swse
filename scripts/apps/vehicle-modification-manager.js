import { SWSELogger } from '../utils/logger.js';

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
   * Initialize by loading all modification data
   */
  static async init() {
    if (this._initialized) return;

    try {
      // Load all modification data
      const [stockShips, movement, defense, weapons, accessories] = await Promise.all([
        fetch('systems/swse/data/stock-ships.json').then(r => r.json()),
        fetch('systems/swse/data/vehicle-modifications/movement-systems.json').then(r => r.json()),
        fetch('systems/swse/data/vehicle-modifications/defense-systems.json').then(r => r.json()),
        fetch('systems/swse/data/vehicle-modifications/weapon-systems.json').then(r => r.json()),
        fetch('systems/swse/data/vehicle-modifications/accessories.json').then(r => r.json())
      ]);

      this._stockShips = stockShips;
      this._movementSystems = movement;
      this._defenseSystems = defense;
      this._weaponSystems = weapons;
      this._accessories = accessories;

      this._initialized = true;
      SWSELogger.log('SWSE | Vehicle Modification Manager initialized');
      SWSELogger.log(`  - ${stockShips.length} stock ships`);
      SWSELogger.log(`  - ${movement.length} movement systems`);
      SWSELogger.log(`  - ${defense.length} defense systems`);
      SWSELogger.log(`  - ${weapons.length} weapon systems`);
      SWSELogger.log(`  - ${accessories.length} accessories`);
    } catch (error) {
      SWSELogger.error('SWSE | Failed to load vehicle modification data:', error);
      this._stockShips = [];
      this._movementSystems = [];
      this._defenseSystems = [];
      this._weaponSystems = [];
      this._accessories = [];
    }
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
  static canInstallModification(modification, stockShip, currentModifications = []) {
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

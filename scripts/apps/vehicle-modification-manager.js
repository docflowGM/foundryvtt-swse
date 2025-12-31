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
        fetch('systems/foundryvtt-swse/data/stock-ships.json').then(r => r.json()),
        fetch('systems/foundryvtt-swse/data/vehicle-modifications/movement-systems.json').then(r => r.json()),
        fetch('systems/foundryvtt-swse/data/vehicle-modifications/defense-systems.json').then(r => r.json()),
        fetch('systems/foundryvtt-swse/data/vehicle-modifications/weapon-systems.json').then(r => r.json()),
        fetch('systems/foundryvtt-swse/data/vehicle-modifications/accessories.json').then(r => r.json())
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
    // Normalize category to lowercase for comparison
    const normalizedCategory = (category || '').toLowerCase();
    switch(normalizedCategory) {
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
    if (!modification) return 0;
    if (!stockShip) return modification.cost || 0;

    let baseCost = modification.cost || 0;

    // Handle cost type
    if (modification.costType === 'base') {
      // Cost scales with ship size via costModifier
      baseCost *= (stockShip.costModifier || 1);
    } else if (modification.costType === 'flat') {
      // Flat cost type uses the cost as-is, no scaling
      // baseCost already set above
    } else if (modification.costType === 'multiplier') {
      // Multiplier type is not currently supported - would require base item cost
      SWSELogger.warn(`SWSE | Modification "${modification.name}" uses unsupported cost type: multiplier. Treating as flat cost.`);
      // Fall through to use flat cost
    } else {
      // Default to flat cost for unknown types
      SWSELogger.warn(`SWSE | Modification "${modification.name}" has unknown cost type: ${modification.costType}. Treating as flat cost.`);
    }

    // Nonstandard modifications cost 5x more
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

    // Check emplacement points availability
    const epStats = this.calculateEmplacementPointsTotal(currentModifications, stockShip);
    const modEP = modification.emplacementPoints || 0;
    if (epStats.remaining < modEP) {
      return {
        canInstall: false,
        reason: `Insufficient emplacement points: needs ${modEP}, available ${epStats.remaining}`
      };
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
      'large',
      'huge',
      'gargantuan',
      'colossal',
      'colossal (frigate)',
      'colossal (cruiser)',
      'colossal (station)'
    ];

    // Normalize to lowercase for comparison
    const normalizedShipSize = (shipSize || '').toLowerCase();
    const shipIndex = sizeOrder.indexOf(normalizedShipSize);

    // Handle "X or Larger" restrictions
    if (restriction.includes('or Larger')) {
      const requiredSize = restriction.replace(' or Larger', '').toLowerCase();
      const requiredIndex = sizeOrder.indexOf(requiredSize);
      return shipIndex >= requiredIndex && shipIndex !== -1;
    }

    // Handle "X or Smaller" restrictions
    if (restriction.includes('or Smaller')) {
      const requiredSize = restriction.replace(' or Smaller', '').toLowerCase();
      const requiredIndex = sizeOrder.indexOf(requiredSize);
      return shipIndex <= requiredIndex && shipIndex !== -1;
    }

    // Exact match (also normalized)
    return normalizedShipSize === restriction.toLowerCase();
  }

  /**
   * Calculate total emplacement points used
   * @param {Array} modifications - Array of installed modifications
   * @param {Object} stockShip - The stock ship
   * @returns {Object} - {used, available, total, remaining}
   */
  static calculateEmplacementPointsTotal(modifications, stockShip) {
    // Calculate EP used by modifications
    const usedByModifications = (Array.isArray(modifications) ? modifications : []).reduce((sum, mod) => {
      return sum + (mod?.emplacementPoints || 0);
    }, 0);

    // Total available EP pool is the sum of baseline and unused
    const totalAvailable = (stockShip.emplacementPoints || 0) + (stockShip.unusedEmplacementPoints || 0);

    // EP used by stock configuration (already allocated in emplacementPoints)
    const usedByStock = stockShip.emplacementPoints || 0;

    // Remaining available for modifications
    const available = (stockShip.unusedEmplacementPoints || 0);

    return {
      used: usedByModifications,
      available: available,
      total: totalAvailable,
      remaining: available - usedByModifications,
      usedByStock: usedByStock,
      totalAvailable: totalAvailable
    };
  }

  /**
   * Calculate total cost of modifications
   * @param {Array} modifications - Array of installed modifications
   * @param {Object} stockShip - The stock ship
   * @returns {number} - Total cost in credits
   */
  static calculateTotalCost(modifications, stockShip) {
    if (!stockShip) return 0;
    if (!Array.isArray(modifications)) return stockShip.cost || 0;

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
    if (!modification) return 1;
    if (!stockShip) return Math.max(1, Math.ceil(modification.emplacementPoints || 0));

    // Minimum work force by size (normalized to lowercase)
    const minWorkForce = {
      'large': 1,
      'huge': 1,
      'gargantuan': 1,
      'colossal': 5,
      'colossal (frigate)': 10,
      'colossal (cruiser)': 20,
      'colossal (station)': 50
    };

    const shipSize = (stockShip.size || 'colossal').toLowerCase();
    const actualWorkers = workers || minWorkForce[shipSize] || 1;
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

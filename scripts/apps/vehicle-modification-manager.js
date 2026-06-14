import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

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
    if (this._initialized) {return;}

    try {
      // Load all modification data
      const [stockShips, movement, defense, weapons, accessories] = await Promise.all([
        fetch('systems/foundryvtt-swse/data/stock-ships.json').then(r => r.json()),
        fetch('systems/foundryvtt-swse/data/vehicle-modifications/movement-systems.json').then(r => r.json()),
        fetch('systems/foundryvtt-swse/data/vehicle-modifications/defense-systems.json').then(r => r.json()),
        fetch('systems/foundryvtt-swse/data/vehicle-modifications/weapon-systems.json').then(r => r.json()),
        fetch('systems/foundryvtt-swse/data/vehicle-modifications/accessories.json').then(r => r.json())
      ]);

      this._stockShips = (Array.isArray(stockShips) ? stockShips : []).map(ship => this.normalizeStockShip(ship));
      this._movementSystems = (Array.isArray(movement) ? movement : []).map(mod => this.normalizeModification(mod));
      this._defenseSystems = (Array.isArray(defense) ? defense : []).map(mod => this.normalizeModification(mod));
      this._weaponSystems = (Array.isArray(weapons) ? weapons : []).map(mod => this.normalizeModification(mod));
      this._accessories = (Array.isArray(accessories) ? accessories : []).map(mod => this.normalizeModification(mod));

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

  static _numberFromAny(...values) {
    for (const value of values) {
      if (value == null || value === '') continue;
      const n = Number(typeof value === 'string' ? value.replace(/[^0-9.-]/g, '') : value);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  }

  static getEmplacementPoints(modification = {}) {
    return this._numberFromAny(
      modification.emplacementPoints,
      modification.ep,
      modification.system?.emplacementPoints,
      modification.system?.ep,
      modification.system?.emplacement?.points,
      modification.system?.emplacement?.value,
      modification.flags?.['foundryvtt-swse']?.emplacementPoints
    );
  }

  static normalizeModification(modification = {}) {
    const ep = this.getEmplacementPoints(modification);
    const category = this.normalizeCategory(modification.category ?? modification.system?.category ?? modification.type);
    return {
      ...modification,
      category,
      emplacementPoints: ep,
      ep
    };
  }

  static normalizeStockShip(stockShip = {}) {
    const used = this._numberFromAny(stockShip.emplacementPoints, stockShip.usedEmplacementPoints, stockShip.epUsed, stockShip.system?.emplacementPoints);
    const unused = this._numberFromAny(stockShip.unusedEmplacementPoints, stockShip.remainingEmplacementPoints, stockShip.ep, stockShip.unusedEP, stockShip.system?.unusedEmplacementPoints);
    return {
      ...stockShip,
      emplacementPoints: used,
      unusedEmplacementPoints: unused
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
    // Normalize category to lowercase for comparison
    const normalizedCategory = (category || '').toLowerCase();
    switch (normalizedCategory) {
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
   * Normalize a modification category to the app/manager key.
   */
  static normalizeCategory(category) {
    const raw = String(category || '').toLowerCase();
    if (raw.startsWith('movement')) return 'movement';
    if (raw.startsWith('defense')) return 'defense';
    if (raw.startsWith('weapon')) return 'weapon';
    if (raw.startsWith('accessor')) return 'accessory';
    return raw || 'accessory';
  }

  /**
   * Shield systems are mutually exclusive. Data mostly uses shields-* ids,
   * but regenerating shields are also a shield system and must not bypass the
   * one-shield contract.
   */
  static isShieldModification(modification = {}) {
    const id = String(modification?.id || '').toLowerCase();
    const name = String(modification?.name || '').toLowerCase();
    return id.startsWith('shields-') || id === 'regenerating-shields' || name.includes('shield');
  }

  /**
   * Hyperdrive systems are mutually exclusive, except the dedicated backup
   * hyperdrive, which is not a primary drive replacement.
   */
  static isPrimaryHyperdriveModification(modification = {}) {
    const id = String(modification?.id || '').toLowerCase();
    return id.startsWith('hyperdrive-');
  }


  /**
   * Some weapon entries are enhancement multipliers rather than standalone
   * systems. They require an already-installed base weapon so the extra cost can
   * be priced from that weapon instead of silently becoming free.
   */
  static isMultiplierEnhancement(modification = {}) {
    return String(modification?.costType || '').toLowerCase() === 'multiplier';
  }

  static _resolveMultiplierBaseModification(modification = {}, currentModifications = []) {
    const installed = Array.isArray(currentModifications) ? currentModifications : [];
    const targetType = String(modification?.weaponType || '').toLowerCase();
    const modName = String(modification?.name || '').toLowerCase();
    const candidates = installed.filter((entry) => {
      const category = String(entry?.category || '').toLowerCase();
      const weaponType = String(entry?.weaponType || '').toLowerCase();
      const costType = String(entry?.costType || '').toLowerCase();
      if (!category.startsWith('weapon')) return false;
      if (costType === 'multiplier') return false;
      if (weaponType === 'enhancement') return false;
      const entryText = `${entry?.id || ''} ${entry?.name || ''}`.toLowerCase();
      if (targetType && targetType !== 'enhancement') {
        return weaponType === targetType || entryText.includes(targetType);
      }
      if (modName.includes('cannon')) return /cannon|blaster|ion|laser|turbolaser/i.test(entryText);
      if (modName.includes('fire-linked')) return true;
      return true;
    });

    if (!candidates.length) return null;
    return candidates.reduce((best, entry) => {
      const bestCost = Number(best?.finalCost ?? best?.cost ?? 0) || 0;
      const entryCost = Number(entry?.finalCost ?? entry?.cost ?? 0) || 0;
      return entryCost > bestCost ? entry : best;
    }, candidates[0]);
  }

  static _resolveMultiplierBaseCost(modification = {}, currentModifications = []) {
    const base = this._resolveMultiplierBaseModification(modification, currentModifications);
    return Number(base?.finalCost ?? base?.cost ?? 0) || 0;
  }

  /**
   * Calculate the cost of a modification for a specific ship
   * @param {Object} modification - The modification object
   * @param {Object} stockShip - The stock ship object
   * @param {boolean} isNonstandard - Whether this is a nonstandard modification
   * @returns {number} - The calculated cost in credits
   */
  static calculateModificationCost(modification, stockShip, isNonstandard = false, currentModifications = []) {
    if (!modification) {return 0;}
    if (!stockShip) {return modification.cost || 0;}

    const costType = String(modification.costType || 'flat').toLowerCase();
    let baseCost = Number(modification.cost || 0) || 0;

    // Handle cost type
    if (costType === 'base') {
      // Cost scales with ship size via costModifier
      baseCost *= (stockShip.costModifier || 1);
    } else if (costType === 'flat' || costType === 'modifier') {
      // Flat/modifier cost types use the cost as-is, no scaling.
    } else if (costType === 'multiplier') {
      const multiplier = Number(modification.costMultiplier || 0) || 0;
      const baseWeaponCost = this._resolveMultiplierBaseCost(modification, currentModifications);
      if (baseWeaponCost > 0 && multiplier > 1) {
        // SWSE enhancement multipliers price the additional work over the base weapon.
        baseCost = Math.max(0, Math.round(baseWeaponCost * (multiplier - 1)));
      } else {
        baseCost = 0;
      }
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
  static calculateEmplacementPoints(modification, _isNonstandard = false) {
    // Store construction uses the real unusedEmplacementPoints pool.
    // Nonstandard systems are a cost multiplier only; they do not double EP.
    return this.getEmplacementPoints(modification);
  }

  /**
   * Check if a modification can be installed on a ship
   * @param {Object} modification - The modification to check
   * @param {Object} stockShip - The stock ship
   * @param {Array} currentModifications - Currently installed modifications
   * @returns {Object} - {canInstall: boolean, reason: string}
   */
  static canInstallModification(modification, stockShip, currentModifications = []) {
    if (!modification) {
      return { canInstall: false, reason: 'No modification selected' };
    }

    if (!stockShip) {
      return { canInstall: false, reason: 'Select a ship frame first' };
    }

    const installed = Array.isArray(currentModifications) ? currentModifications : [];

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

    // Only one primary hyperdrive may be installed.
    if (this.isPrimaryHyperdriveModification(modification)) {
      const hasHyperdrive = installed.some(mod => this.isPrimaryHyperdriveModification(mod));
      if (hasHyperdrive) {
        return {
          canInstall: false,
          reason: 'Already has a hyperdrive installed (remove existing first)'
        };
      }
    }

    // Only one shield system may be installed.
    if (this.isShieldModification(modification)) {
      const hasShields = installed.some(mod => this.isShieldModification(mod));
      if (hasShields) {
        return {
          canInstall: false,
          reason: 'Already has shields installed (remove existing first)'
        };
      }
    }

    if (this.isMultiplierEnhancement(modification) && !this._resolveMultiplierBaseModification(modification, installed)) {
      return {
        canInstall: false,
        reason: 'Requires an installed base weapon before this enhancement can be priced'
      };
    }

    // Check emplacement points availability against unusedEmplacementPoints, not
    // total/baseline EP already consumed by the stock hull.
    const epStats = this.calculateEmplacementPointsTotal(installed, stockShip);
    const modEP = this.calculateEmplacementPoints(modification);
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
    if (!stockShip) {
      return { used: 0, available: 0, total: 0, remaining: 0, usedByStock: 0, totalAvailable: 0 };
    }

    // Calculate EP used by modifications. This is the actual player-spendable
    // pool, not the stock hull's already-allocated baseline EP.
    const usedByModifications = (Array.isArray(modifications) ? modifications : []).reduce((sum, mod) => {
      return sum + this.calculateEmplacementPoints(mod);
    }, 0);

    // Total available EP pool is the sum of baseline and unused, but only
    // unusedEmplacementPoints is available for the builder.
    const usedByStock = stockShip.emplacementPoints || 0;
    const available = stockShip.unusedEmplacementPoints || 0;
    const totalAvailable = usedByStock + available;

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
    if (!stockShip) {return 0;}
    if (!Array.isArray(modifications)) {return stockShip.cost || 0;}

    const modCost = modifications.reduce((sum, mod) => {
      if (Number.isFinite(Number(mod?.finalCost))) return sum + Number(mod.finalCost);
      return sum + this.calculateModificationCost(mod, stockShip, this.isNonstandardModification(mod, stockShip), modifications);
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
    if (!modification) {return 1;}
    if (!stockShip) {return Math.max(1, Math.ceil(this.calculateEmplacementPoints(modification)));}

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
    const ep = this.calculateEmplacementPoints(modification);
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
    const ep = this.calculateEmplacementPoints(modification);
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
    if (!modification || !stockShip) return false;

    const shipName = String(stockShip.name || '').toLowerCase();

    // Hyperdrives are nonstandard for TIE-class / small stock fighters in the
    // store construction lane. The stock data does not include named TIE frames,
    // so the generic fighter/interceptor hulls use the same warning/cost rule.
    if (this.isPrimaryHyperdriveModification(modification) &&
        (shipName.includes('tie') || shipName.includes('light fighter') || shipName.includes('interceptor'))) {
      return true;
    }

    // Shields are nonstandard for TIE-class frames.
    if (this.isShieldModification(modification) && shipName.includes('tie')) {
      return true;
    }

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
    if (!availability || availability === 'all') {return mods;}
    return mods.filter(mod => mod.availability === availability);
  }
}

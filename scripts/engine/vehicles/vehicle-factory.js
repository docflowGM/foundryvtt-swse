/**
 * VehicleFactory — Pure Vehicle Creation
 *
 * Responsibilities:
 * - Build MutationPlan for vehicle creation from store templates or stock-ship
 *   construction specs.
 * - Convert build spec or template → V2-compliant actor data.
 * - Never mutate actor state directly.
 * - Never assign ownership.
 * - Never determine final placement.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function clone(value) {
  if (value === undefined || value === null) return value;
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  try { return structuredClone(value); } catch (_err) { return JSON.parse(JSON.stringify(value)); }
}

function numberOrZero(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function ability(base) {
  return { base: numberOrZero(base) || 10, racial: 0, temp: 0 };
}

function frameCategory(stockShip = {}) {
  const size = String(stockShip.size || '').toLowerCase();
  const name = String(stockShip.name || '').toLowerCase();
  if (size.includes('frigate') || name.includes('corvette')) return 'frigate';
  if (name.includes('fighter') || name.includes('interceptor') || name.includes('bomber')) return 'starfighter';
  return 'transport';
}

function buildModificationSummary(modifications = []) {
  return (Array.isArray(modifications) ? modifications : []).map((mod) => ({
    id: mod.id,
    name: mod.name,
    category: mod.category,
    emplacementPoints: numberOrZero(mod.emplacementPoints),
    finalCost: numberOrZero(mod.finalCost ?? mod.cost),
    baseCost: numberOrZero(mod.cost),
    costType: mod.costType || 'flat',
    availability: mod.availability || 'Common',
    sizeRestriction: mod.sizeRestriction || null,
    nonstandard: mod.nonstandard === true,
    effect: mod.effect || '',
    description: mod.description || '',
    weaponType: mod.weaponType || null,
    damage: mod.damage || null
  }));
}


function extractArmorBonus(modifications = []) {
  let best = 0;
  for (const mod of modifications) {
    const id = String(mod?.id || '').toLowerCase();
    const name = String(mod?.name || '').toLowerCase();
    if (!id.startsWith('armor-') && !name.includes('armor')) continue;
    const match = String(mod?.effect || mod?.name || '').match(/\+(\d+)\s*Armor/i)
      || String(mod?.id || '').match(/armor-(\d+)/i);
    if (match) best = Math.max(best, numberOrZero(match[1]));
  }
  return best;
}

function extractShieldRating(modifications = []) {
  let rating = 0;
  for (const mod of modifications) {
    const text = `${mod?.id || ''} ${mod?.name || ''} ${mod?.effect || ''}`;
    if (!/shield/i.test(text)) continue;
    const match = text.match(/(?:SR|Shield Rating|Shields?)\s*(\d+)/i) || text.match(/shields?-(\d+)/i);
    if (match) rating = Math.max(rating, numberOrZero(match[1]));
    else if (String(mod?.id || '').toLowerCase() === 'regenerating-shields') rating = Math.max(rating, 10);
  }
  return rating;
}

function extractHyperdriveLabel(modifications = []) {
  const drive = modifications.find((mod) => String(mod?.id || '').toLowerCase().startsWith('hyperdrive-'));
  if (!drive) return '';
  const text = `${drive.effect || ''} ${drive.name || ''}`;
  const match = text.match(/class\s*([0-9.]+)/i) || text.match(/hyperdrive-(.+)$/i);
  return match ? `Class ${match[1]}` : (drive.name || 'Installed');
}

function buildWeaponRows(modifications = []) {
  return modifications
    .filter((mod) => String(mod?.category || '').toLowerCase().startsWith('weapon') && String(mod?.weaponType || '').toLowerCase() !== 'enhancement')
    .map((mod) => ({
      id: mod.id,
      name: mod.name || 'Vehicle Weapon',
      arc: mod.arc || 'Forward',
      attackBonus: mod.attackBonus || mod.bonus || '+0',
      bonus: mod.bonus || mod.attackBonus || '+0',
      damage: mod.damage || '—',
      range: mod.range || 'Starship',
      fireControl: mod.fireControl || null,
      notes: mod.effect || mod.description || '',
      sourceModificationId: mod.id
    }));
}

function currentVehicleTotalCost(actor, fallback = 0) {
  const cost = actor?.system?.cost;
  if (typeof cost === 'number') return numberOrZero(cost);
  if (typeof cost === 'string') return numberOrZero(cost.replace(/[^0-9.-]/g, ''));
  if (cost && typeof cost === 'object') return numberOrZero(cost.new ?? cost.value ?? fallback);
  return numberOrZero(fallback);
}

export class VehicleFactory {
  /**
   * Build MutationPlan for vehicle creation.
   * @param {Object} buildSpec
   * @param {Object} [buildSpec.template] - Existing vehicle template entry.
   * @param {Object} [buildSpec.stockShip] - Stock ship JSON frame for custom construction.
   * @param {Array<Object>} [buildSpec.modifications] - Installed modifications.
   * @param {string} [buildSpec.condition] - "new" or "used".
   * @returns {Object} MutationPlan with CREATE bucket
   */
  static buildMutationPlan(buildSpec) {
    if (!buildSpec || (!buildSpec.template && !buildSpec.stockShip)) {
      throw new Error('VehicleFactory: buildSpec with template or stockShip required');
    }

    const tempId = this._generateTemporaryId('vehicle');
    const vehicleData = this.buildVehicleActorData(buildSpec);

    swseLogger.debug('VehicleFactory: Built MutationPlan', {
      tempId,
      name: vehicleData.name,
      condition: buildSpec.condition,
      customBuild: Boolean(buildSpec.stockShip)
    });

    return {
      create: {
        actors: [{
          type: 'vehicle',
          temporaryId: tempId,
          data: vehicleData
        }]
      }
    };
  }

  /**
   * Public actor-data builder for approval drafts and store purchases.
   */
  static buildVehicleActorData(buildSpec) {
    if (buildSpec?.stockShip) return this._buildStockShipActorData(buildSpec);
    return this._buildVehicleActorData(buildSpec);
  }


  /**
   * Build a MutationPlan for applying Shipyard modifications to an existing
   * vehicle actor.  The caller owns credit movement; this factory only shapes
   * the vehicle-side mutation payload.
   *
   * @param {Actor} vehicleActor
   * @param {Object} buildSpec
   * @returns {Object} MutationPlan for ActorEngine.applyMutationPlan(vehicleActor)
   */
  static buildExistingModificationMutationPlan(vehicleActor, buildSpec = {}) {
    if (!vehicleActor || vehicleActor.type !== 'vehicle') {
      throw new Error('VehicleFactory: existing vehicle actor required for modification mutation plan');
    }

    const stockShip = clone(buildSpec.stockShip || vehicleActor.system?.modificationData?.stockShip || vehicleActor.system?.stockShip || {});
    const modifications = buildModificationSummary(buildSpec.modifications || []);
    const removedModifications = buildModificationSummary(buildSpec.removedModifications || []);
    const frameCost = numberOrZero(stockShip.cost ?? buildSpec.frameCost ?? 0);
    const modificationCost = modifications.reduce((sum, mod) => sum + numberOrZero(mod.finalCost), 0);
    const previousTotal = currentVehicleTotalCost(vehicleActor, frameCost + modificationCost);
    const totalCost = numberOrZero(buildSpec.totalCost ?? Math.max(previousTotal, frameCost + modificationCost));
    const epUsed = modifications.reduce((sum, mod) => sum + numberOrZero(mod.emplacementPoints), 0);
    const stockUnused = numberOrZero(stockShip.unusedEmplacementPoints ?? vehicleActor.system?.unusedEmplacementPoints ?? vehicleActor.system?.remainingCustomizationEmplacementPoints ?? 0);
    const existingShieldRating = numberOrZero(vehicleActor.system?.shieldRating ?? vehicleActor.system?.shields?.max ?? 0);
    const shieldRating = extractShieldRating(modifications) || existingShieldRating;
    const armorBonus = extractArmorBonus(modifications);
    const baseArmor = numberOrZero(stockShip.armor ?? vehicleActor.system?.stockShip?.armor ?? vehicleActor.system?.armor ?? 0);
    const armor = baseArmor + armorBonus;
    const weaponRows = buildWeaponRows(modifications);
    const hyperdrive = extractHyperdriveLabel(modifications);
    const existingWeapons = Array.isArray(vehicleActor.system?.weapons) ? vehicleActor.system.weapons : [];
    const nonShipyardWeapons = existingWeapons.filter((weapon) => !weapon?.sourceModificationId);

    return {
      set: {
        'system.stockShip': stockShip,
        'system.modificationData': {
          stockShip,
          modifications,
          removedModifications,
          totalCost,
          frameCost,
          modificationCost,
          contextMode: buildSpec.contextMode || 'modifyExisting',
          lastTransactionId: buildSpec.transactionId ?? null,
          lastModifiedAt: Date.now()
        },
        'system.shipyard': {
          source: 'shipyard-builder',
          contextMode: buildSpec.contextMode || 'modifyExisting',
          frameName: stockShip.name || vehicleActor.system?.buildMetadata?.frameName || vehicleActor.name,
          installedModifications: modifications,
          removedModifications,
          costs: {
            frameCost,
            modificationCost,
            totalCost,
            lastGrossCost: numberOrZero(buildSpec.grossCost ?? 0),
            lastResaleCredit: numberOrZero(buildSpec.resaleCredit ?? 0),
            lastNetCost: numberOrZero(buildSpec.transactionCost ?? 0)
          },
          emplacementPoints: {
            total: numberOrZero(stockShip.emplacementPoints) + stockUnused,
            baselineUsed: numberOrZero(stockShip.emplacementPoints),
            available: stockUnused,
            used: epUsed,
            remaining: stockUnused - epUsed
          },
          lastModifiedAt: Date.now()
        },
        'system.cost': {
          ...(typeof vehicleActor.system?.cost === 'object' && vehicleActor.system?.cost ? vehicleActor.system.cost : {}),
          new: totalCost,
          used: Math.floor(totalCost / 2)
        },
        'system.emplacementPoints': numberOrZero(stockShip.emplacementPoints),
        'system.unusedEmplacementPoints': stockUnused,
        'system.usedCustomizationEmplacementPoints': epUsed,
        'system.remainingCustomizationEmplacementPoints': stockUnused - epUsed,
        'system.armor': armor,
        'system.armorBonus': armorBonus,
        'system.reflexDefense': 10 + armor,
        'system.shieldRating': shieldRating,
        'system.shields': {
          ...(vehicleActor.system?.shields || {}),
          value: Math.min(numberOrZero(vehicleActor.system?.shields?.value ?? shieldRating), shieldRating),
          max: shieldRating
        },
        'system.hyperdrive': hyperdrive || vehicleActor.system?.hyperdrive || '',
        'system.weapons': [...nonShipyardWeapons, ...weaponRows],
        'system.buildMetadata': {
          ...(vehicleActor.system?.buildMetadata || {}),
          customBuild: true,
          modifiedInShipyard: true,
          frameName: stockShip.name || vehicleActor.system?.buildMetadata?.frameName || null,
          source: 'shipyard-builder',
          lastModifiedAt: Date.now()
        },
        'flags.foundryvtt-swse.shipyardBuild': {
          stockShip,
          modifications,
          removedModifications,
          totalCost,
          contextMode: buildSpec.contextMode || 'modifyExisting',
          lastModifiedAt: Date.now()
        }
      }
    };
  }

  /**
   * Build canonical V2 vehicle actor data from a stock ship construction spec.
   * @private
   */
  static _buildStockShipActorData(buildSpec) {
    const stockShip = clone(buildSpec.stockShip || {});
    const modifications = buildModificationSummary(buildSpec.modifications || []);
    const totalCost = numberOrZero(buildSpec.totalCost ?? stockShip.cost);
    const hull = numberOrZero(stockShip.hitPoints) || 1;
    const category = frameCategory(stockShip);
    const name = buildSpec.name || `${stockShip.name || 'Custom Starship'} (Custom)`;
    const epUsed = modifications.reduce((sum, mod) => sum + numberOrZero(mod.emplacementPoints), 0);
    const unusedEP = numberOrZero(stockShip.unusedEmplacementPoints);
    const shieldMod = modifications.find((mod) => String(mod.id || '').startsWith('shields-'));
    const shieldMatch = String(shieldMod?.id || '').match(/(\d+)/);
    const shieldRating = shieldMatch ? Number(shieldMatch[1]) : 0;

    return {
      name,
      type: 'vehicle',
      img: buildSpec.img || 'icons/svg/rocket.svg',
      system: {
        category,
        vehicleType: category,
        type: 'Starship',
        domain: 'starship',
        size: stockShip.size || 'Colossal',
        attributes: {
          str: ability(stockShip.strength),
          dex: ability(stockShip.dexterity),
          con: ability(10),
          int: ability(stockShip.intelligence),
          wis: ability(10),
          cha: ability(10)
        },
        hp: { value: hull, max: hull, temp: 0 },
        hull: { value: hull, max: hull },
        shields: { value: shieldRating, max: shieldRating },
        shieldRating,
        armor: numberOrZero(stockShip.armor),
        damageReduction: numberOrZero(stockShip.dr),
        dr: numberOrZero(stockShip.dr),
        reflexDefense: 10 + numberOrZero(stockShip.armor),
        fortitudeDefense: 10 + Math.floor((numberOrZero(stockShip.strength) - 10) / 2),
        baseAttackBonus: 0,
        speed: stockShip.speedStarship || stockShip.speedCharacter || '',
        speedCharacter: stockShip.speedCharacter || '',
        speedStarship: stockShip.speedStarship || '',
        crew: numberOrZero(stockShip.crew),
        passengers: numberOrZero(stockShip.passengers),
        cargoCapacity: stockShip.cargoCapacity || '',
        consumables: stockShip.consumables || '',
        cost: {
          new: totalCost,
          used: Math.floor(totalCost / 2)
        },
        emplacementPoints: numberOrZero(stockShip.emplacementPoints),
        unusedEmplacementPoints: unusedEP,
        usedCustomizationEmplacementPoints: epUsed,
        remainingCustomizationEmplacementPoints: unusedEP - epUsed,
        stockShip: clone(stockShip),
        modificationData: {
          stockShip: clone(stockShip),
          modifications,
          totalCost,
          frameCost: numberOrZero(stockShip.cost),
          modificationCost: modifications.reduce((sum, mod) => sum + numberOrZero(mod.finalCost), 0),
          contextMode: buildSpec.contextMode || 'storeConstruction'
        },
        storeAcquisition: {
          source: 'shipyard-builder',
          requestedByActorId: buildSpec.ownerActorId ?? null,
          requestedByActorName: buildSpec.ownerActorName ?? null,
          costCredits: totalCost,
          baseTemplateName: stockShip.name || null
        },
        buildMetadata: {
          isNew: true,
          condition: buildSpec.condition || 'new',
          customBuild: true,
          frameName: stockShip.name || null,
          templateId: `stock-ship:${stockShip.name || 'unknown'}`,
          source: 'shipyard-builder'
        }
      },
      flags: {
        'foundryvtt-swse': {
          shipyardBuild: {
            stockShip: clone(stockShip),
            modifications,
            totalCost,
            contextMode: buildSpec.contextMode || 'storeConstruction'
          }
        }
      }
    };
  }

  /**
   * Build canonical V2 vehicle actor data from existing template.
   * @private
   */
  static _buildVehicleActorData(buildSpec) {
    const template = buildSpec.template;
    const condition = buildSpec.condition || 'new';

    const source = template?.doc || template?.template || template;
    const templateObj = source?.toObject ? source.toObject(false) : clone(source || {});
    const templateSystem = templateObj.system || template?.system || {};

    // Preserve full stock ship/vehicle fidelity from the compendium/world actor:
    // embedded weapons, effects, token defaults, and vehicle-specific system
    // fields. The minimal fallback fields stay only as safe defaults.
    const vehicleData = {
      ...templateObj,
      type: 'vehicle',
      name: `${condition === 'used' ? '(Used) ' : ''}${templateObj.name || template?.name || 'Unnamed Vehicle'}`,
      img: templateObj.img || template?.img || 'icons/svg/anchor.svg',
      system: {
        ...templateSystem,
        category: templateSystem.category || templateSystem.vehicleType || 'starfighter',
        domain: templateSystem.domain || 'starship',
        hull: {
          value: templateSystem.hull?.value ?? templateSystem.hull?.max ?? 50,
          max: templateSystem.hull?.max ?? templateSystem.hull?.value ?? 50
        },
        shields: {
          value: templateSystem.shields?.value ?? templateSystem.shields?.max ?? 0,
          max: templateSystem.shields?.max ?? templateSystem.shields?.value ?? 0
        },
        speed: templateSystem.speed || 12,
        reflexDefense: templateSystem.reflexDefense ?? 10,
        fortitudeDefense: templateSystem.fortitudeDefense ?? 10,
        baseAttackBonus: templateSystem.baseAttackBonus ?? 0,
        buildMetadata: {
          ...(templateSystem.buildMetadata || {}),
          isNew: condition === 'new',
          condition,
          templateId: template?.id || template?._id || templateObj._id || templateObj.id
        }
      }
    };

    delete vehicleData._id;
    delete vehicleData.id;
    return vehicleData;
  }

  /**
   * Generate temporary ID for later resolution.
   * @private
   */
  static _generateTemporaryId(prefix) {
    return `temp_${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

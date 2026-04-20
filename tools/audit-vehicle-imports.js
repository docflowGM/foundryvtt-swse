#!/usr/bin/env node

/**
 * Vehicle Import Audit Tool (Phase 4)
 *
 * Scans vehicle packs to identify:
 * - Legacy field names that might need normalization
 * - Corrupted data (empty weapons, missing defenses, etc.)
 * - Partial migrations (mix of old and new field names)
 * - Missing required fields for v2 contract
 *
 * Usage (in Foundry console):
 *   // Run audit on all vehicles
 *   const report = await auditVehicleImports();
 *   console.log(report);
 *
 *   // Save detailed report
 *   const detailed = await auditVehicleImports(true);
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Check if vehicle has legacy field names
 */
function hasLegacyFields(vehicleData) {
  const issues = [];

  // Old defense format
  if (vehicleData.system?.defenses?.reflex !== undefined) {
    issues.push('legacy_defense_format');
  }

  // Old HP format
  if (vehicleData.system?.hit_points !== undefined) {
    issues.push('legacy_hit_points');
  }

  // Old crew_size format
  if (vehicleData.system?.crew_size !== undefined && typeof vehicleData.system.crew === 'string') {
    issues.push('legacy_crew_size');
  }

  // Old cargo format
  if (vehicleData.system?.cargo_capacity !== undefined) {
    issues.push('legacy_cargo_capacity');
  }

  return issues;
}

/**
 * Check if vehicle has required fields for context builder
 */
function hasMissingFields(vehicleData) {
  const issues = [];
  const sys = vehicleData.system || {};

  // Check HP existence
  if (!sys.hp && !sys.hull && !sys.hit_points) {
    issues.push('missing_hp');
  }

  // Check defenses
  if (!sys.reflexDefense && !sys.defenses?.reflex) {
    issues.push('missing_reflex_defense');
  }
  if (!sys.fortitudeDefense && !sys.defenses?.fortitude) {
    issues.push('missing_fortitude_defense');
  }

  // Check crew
  if (!sys.crew && !sys.crew_size) {
    issues.push('missing_crew');
  }

  // Check cargo
  if (!sys.cargo && !sys.cargo_capacity) {
    issues.push('missing_cargo');
  }

  // Check weapons array
  if (!Array.isArray(sys.weapons)) {
    issues.push('invalid_weapons_array');
  } else if (sys.weapons.length === 0) {
    issues.push('empty_weapons_array');
  }

  // Check defenses object exists (for derived builder)
  if (!sys.defenses || typeof sys.defenses !== 'object') {
    issues.push('missing_defenses_object');
  }

  return issues;
}

/**
 * Check for corrupted data patterns
 */
function hasCorruptedData(vehicleData) {
  const issues = [];
  const sys = vehicleData.system || {};

  // Check weapons for corrupted entries (category names instead of weapons)
  if (Array.isArray(sys.weapons)) {
    const CORRUPTED_TERMS = [
      'categor', 'add category', 'vehicles', 'planetary', 'ground', 'speeders',
      'starship', 'water', 'air', 'mandalorian'
    ];

    const corruptedCount = sys.weapons.filter(w => {
      if (!w?.name) return true;
      const name = String(w.name).toLowerCase();
      return CORRUPTED_TERMS.some(term => name.includes(term));
    }).length;

    if (corruptedCount > 0) {
      issues.push(`corrupted_weapons_${corruptedCount}`);
    }
  }

  // Check HP values validity
  const hp = sys.hp || sys.hull;
  if (hp && typeof hp === 'object') {
    if (hp.max <= 0) issues.push('invalid_hp_max');
    if (hp.value < 0) issues.push('invalid_hp_value');
  }

  // Check defenses validity
  const defenses = [sys.reflexDefense, sys.fortitudeDefense, sys.flatFooted];
  const invalidDefenses = defenses.filter(d => d !== undefined && (typeof d !== 'number' || d < 1 || d > 50));
  if (invalidDefenses.length > 0) {
    issues.push('invalid_defense_values');
  }

  return issues;
}

/**
 * Audit single vehicle entry
 */
function auditVehicle(vehicleData) {
  const legacy = hasLegacyFields(vehicleData);
  const missing = hasMissingFields(vehicleData);
  const corrupted = hasCorruptedData(vehicleData);

  return {
    name: vehicleData.name,
    type: vehicleData.system?.type,
    category: vehicleData.system?.category,
    legacy,
    missing,
    corrupted,
    hasIssues: legacy.length > 0 || missing.length > 0 || corrupted.length > 0
  };
}

/**
 * Main audit function
 * Scans all vehicles and categorizes by data quality
 */
export async function auditVehicleImports(detailed = false) {
  const packNames = ['vehicles', 'vehicles-speeders', 'vehicles-starships', 'vehicles-walkers', 'vehicles-stations'];

  const report = {
    timestamp: new Date().toISOString(),
    total: 0,
    clean: 0,
    legacy: 0,
    missing: 0,
    corrupted: 0,
    details: detailed ? [] : undefined,
    issuesByType: {}
  };

  SWSELogger.log(`[${SYSTEM_ID}] Starting vehicle import audit...`);

  for (const packName of packNames) {
    const pack = game.packs.get(`swse.${packName}`);
    if (!pack) continue;

    const vehicles = await pack.getDocuments();

    for (const vehicle of vehicles) {
      report.total++;

      const audit = auditVehicle(vehicle.toObject());

      if (audit.hasIssues) {
        if (audit.legacy.length > 0) report.legacy++;
        if (audit.missing.length > 0) report.missing++;
        if (audit.corrupted.length > 0) report.corrupted++;

        // Track issue types
        const allIssues = [...audit.legacy, ...audit.missing, ...audit.corrupted];
        for (const issue of allIssues) {
          report.issuesByType[issue] = (report.issuesByType[issue] || 0) + 1;
        }

        if (detailed) {
          report.details.push(audit);
        }
      } else {
        report.clean++;
      }
    }
  }

  report.successRate = `${Math.round((report.clean / report.total) * 100)}%`;

  SWSELogger.log(`[${SYSTEM_ID}] Vehicle audit complete: ${report.clean}/${report.total} vehicles clean (${report.successRate})`);

  return report;
}

/**
 * Generate normalized migration script (if needed)
 */
export async function generateVehicleMigrationScript() {
  const report = await auditVehicleImports(true);

  const vehiclesNeedingFix = (report.details || []).filter(v => v.hasIssues);

  if (vehiclesNeedingFix.length === 0) {
    SWSELogger.log(`[${SYSTEM_ID}] All vehicles already properly formatted`);
    return { migrationsNeeded: 0, script: null };
  }

  SWSELogger.log(`[${SYSTEM_ID}] ${vehiclesNeedingFix.length} vehicles need normalization`);

  return {
    migrationsNeeded: vehiclesNeedingFix.length,
    affectedVehicles: vehiclesNeedingFix.map(v => v.name),
    issueTypes: report.issuesByType
  };
}

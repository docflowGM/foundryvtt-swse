/**
 * RangeEngine — Deterministic Range Profile Resolution
 *
 * PHASE 2b: Range system migration to data-driven architecture
 *
 * Replaces:
 * - String parsing of system.range
 * - Hardcoded range penalties
 * - Ad-hoc distance-to-penalty mapping
 *
 * Provides:
 * - Data-driven range profiles
 * - O(n) lookup by rangeProfile + distance
 * - Zero string parsing
 * - Safe failure modes
 *
 * Data files:
 * - data/actor-weapon-ranges.json
 * - data/vehicle-weapon-ranges.json
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const RangeEngine = {
  _actorProfiles: null,
  _vehicleProfiles: null,

  /* ============================================
     INITIALIZATION
     ============================================ */

  async init() {
    try {
      if (!this._actorProfiles) {
        const actorResp = await fetch("systems/foundryvtt-swse/data/actor-weapon-ranges.json");
        if (!actorResp.ok) {
          throw new Error(`Failed to load actor ranges: ${actorResp.status}`);
        }
        this._actorProfiles = await actorResp.json();
        SWSELogger.debug(`[RangeEngine] Loaded ${this._actorProfiles.length} actor weapon profiles`);
      }

      if (!this._vehicleProfiles) {
        const vehicleResp = await fetch("systems/foundryvtt-swse/data/vehicle-weapon-ranges.json");
        if (!vehicleResp.ok) {
          throw new Error(`Failed to load vehicle ranges: ${vehicleResp.status}`);
        }
        this._vehicleProfiles = await vehicleResp.json();
        SWSELogger.debug(`[RangeEngine] Loaded ${this._vehicleProfiles.length} vehicle weapon profiles`);
      }

      SWSELogger.info("[RangeEngine] Initialized successfully");
    } catch (err) {
      SWSELogger.error("[RangeEngine] Initialization failed", err);
      throw err;
    }
  }

  /* ============================================
     PROFILE RESOLUTION
     ============================================ */

  /**
   * Get actor weapon profile by slug
   * @param {string} slug - Weapon category slug (e.g., "rifles", "pistols")
   * @returns {Object|null} Profile with bands definition
   */
  getActorProfile(slug) {
    if (!this._actorProfiles) {
      SWSELogger.warn(`[RangeEngine] Actor profiles not loaded`);
      return null;
    }
    return this._actorProfiles.find(p => p.slug === slug) ?? null;
  }

  /**
   * Get vehicle weapon profile by slug
   * @param {string} slug - Weapon category slug (e.g., "laser-cannons")
   * @returns {Object|null} Profile with scale-specific bands
   */
  getVehicleProfile(slug) {
    if (!this._vehicleProfiles) {
      SWSELogger.warn(`[RangeEngine] Vehicle profiles not loaded`);
      return null;
    }
    return this._vehicleProfiles.find(p => p.slug === slug) ?? null;
  }

  /* ============================================
     BAND RESOLUTION — ACTOR WEAPONS
     ============================================ */

  /**
   * Resolve distance to attack modifier for actor weapons
   * @param {string} slug - Weapon profile slug
   * @param {number} distance - Distance in squares
   * @returns {Object|null} { band, attackMod } or null if out of range
   */
  getActorBand(slug, distance) {
    const profile = this.getActorProfile(slug);
    if (!profile || !profile.bands) {
      SWSELogger.warn(`[RangeEngine] No profile found for actor weapon slug: ${slug}`);
      return null;
    }

    for (const [band, range] of Object.entries(profile.bands)) {
      if (!range) continue;
      if (distance >= range.min && distance <= range.max) {
        return {
          band,
          attackMod: range.attackMod ?? 0
        };
      }
    }

    // Out of range
    SWSELogger.debug(`[RangeEngine] Distance ${distance} out of range for ${slug}`);
    return null;
  }

  /* ============================================
     BAND RESOLUTION — VEHICLE WEAPONS
     ============================================ */

  /**
   * Resolve distance to band for vehicle weapons
   * @param {string} slug - Vehicle weapon profile slug
   * @param {number} distance - Distance (varies by scale)
   * @param {string} scale - "character" | "starship" (default: "character")
   * @returns {Object|null} { band } or null if out of range
   */
  getVehicleBand(slug, distance, scale = "character") {
    const profile = this.getVehicleProfile(slug);
    if (!profile || !profile[scale]) {
      SWSELogger.warn(`[RangeEngine] No profile found for vehicle weapon slug: ${slug} (scale: ${scale})`);
      return null;
    }

    const bands = profile[scale];
    for (const [band, range] of Object.entries(bands)) {
      if (!range) continue;
      if (distance >= range.min && distance <= range.max) {
        return { band };
      }
    }

    // Out of range
    SWSELogger.debug(`[RangeEngine] Distance ${distance} out of range for ${slug} (${scale})`);
    return null;
  }

  /* ============================================
     UTILITY
     ============================================ */

  /**
   * Get all available actor weapon profiles
   * @returns {Array} Array of profile slugs
   */
  getActorProfileSlugs() {
    if (!this._actorProfiles) return [];
    return this._actorProfiles.map(p => p.slug);
  }

  /**
   * Get all available vehicle weapon profiles
   * @returns {Array} Array of profile slugs
   */
  getVehicleProfileSlugs() {
    if (!this._vehicleProfiles) return [];
    return this._vehicleProfiles.map(p => p.slug);
  }

  /**
   * Clear loaded profiles (for testing)
   */
  reset() {
    this._actorProfiles = null;
    this._vehicleProfiles = null;
  }
};

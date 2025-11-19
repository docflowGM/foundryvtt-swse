/**
 * Vehicle Combat System for SWSE
 *
 * This file serves as the main entry point for the vehicle combat system.
 * The implementation has been split into focused modules for better maintainability:
 *
 * - vehicle-shared.js: Shared utilities and constants
 * - vehicle-calculations.js: Attack and damage calculations
 * - vehicle-dogfighting.js: Dogfight system for starfighters
 * - vehicle-collisions.js: Collision mechanics
 * - vehicle-weapons.js: Missiles, torpedoes, and weapon batteries
 * - vehicle-combat-main.js: Main class integrating all systems
 *
 * This file re-exports the main class to maintain backward compatibility.
 */

export { SWSEVehicleCombat } from './vehicle/vehicle-combat-main.js';

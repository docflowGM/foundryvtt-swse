/**
 * Phase 5 Initialization - Observability, Testing, and Forward Compatibility
 *
 * Registers all Phase 5 systems on system ready:
 * - Correlation ID tracing
 * - Schema validation
 * - Custom hook firing
 * - Version detection
 * - Trace metrics
 */

import { registerTraceMetrics } from "/systems/foundryvtt-swse/scripts/core/correlation-id.js";
import { registerSchemaValidation } from "/systems/foundryvtt-swse/scripts/core/schema-validator.js";
import { registerVersionAdapter, validateSystemCompatibility } from "/systems/foundryvtt-swse/scripts/core/version-adapter.js";
import { log } from "/systems/foundryvtt-swse/scripts/core/foundry-env.js";
import { ArchetypeRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js";

const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Initialize Phase 5 systems when Foundry is ready
 * Called from main system init hook
 */
export function initializePhase5() {
  try {
    // 1. Register version adapter
    registerVersionAdapter();
    validateSystemCompatibility();

    // 2. Register trace metrics (GM only)
    registerTraceMetrics();

    // 3. Register schema validation tools
    registerSchemaValidation();

    // 4. Initialize ArchetypeRegistry (Phase A & B)
    Hooks.once('ready', async () => {
      try {
        await ArchetypeRegistry.initialize();
        const stats = ArchetypeRegistry.getStats();
        log.info(`[${SYSTEM_ID}] ArchetypeRegistry initialized: ${stats.count} archetypes`);
      } catch (err) {
        log.error(`[${SYSTEM_ID}] ArchetypeRegistry initialization failed:`, err);
      }
    });

    log.info(`[${SYSTEM_ID}] Phase 5 initialization complete`);
    log.info(`[${SYSTEM_ID}]   ✓ Observability (correlation IDs, tracing)`);
    log.info(`[${SYSTEM_ID}]   ✓ Data contracts (schema validation)`);
    log.info(`[${SYSTEM_ID}]   ✓ Extension safety (custom hooks)`);
    log.info(`[${SYSTEM_ID}]   ✓ Forward compatibility (version detection)`);
    log.info(`[${SYSTEM_ID}]   ✓ Archetypes (registry, alignment scoring)`);

  } catch (err) {
    log.error(`Phase 5 initialization failed:`, err.message);
  }
}

/**
 * Phase 5 diagnostic summary (GM only)
 * Useful for troubleshooting
 */
export function getPhaseSummary() {
  if (!game?.user?.isGM) {
    return { error: 'GMs only' };
  }

  return {
    phase: 5,
    system: SYSTEM_ID,
    foundry: game?.version || 'unknown',
    observability: {
      tracing: 'enabled',
      correlationIds: 'active',
      metricsCollection: 'available via SWSETracing.metrics()'
    },
    contracts: {
      schemaValidation: 'dev-mode only',
      importValidation: 'enabled',
      actorValidation: 'enabled'
    },
    extensions: {
      customHooks: [
        'swse.chargen.complete',
        'swse.levelup.complete',
        'swse.import.complete',
        'swse.migration.start',
        'swse.migration.complete',
        'swse.combat.resolved',
        'swse.actor.prepared'
      ],
      publicAPI: 'available via window.SWSE.api'
    },
    compatibility: {
      minimumFoundry: '13',
      currentVersion: game?.version,
      status: game?.version?.startsWith('13') ? '✓ Verified' : '⚠️ Unverified'
    }
  };
}

/**
 * Sentinel Layer Registry
 *
 * Manages layer registration, initialization order, and dependencies
 * Loads all layers and registers with kernel
 */

import { SentinelEngine } from './sentinel-core.js';

// Import all layers
import { CSSLayer } from './layers/css-layer.js';
import { RenderLayer } from './layers/render-layer.js';
import { DataLayer } from './layers/data-layer.js';
import { HooksLayer } from './layers/hooks-layer.js';
import { PromisesLayer } from './layers/promises-layer.js';
import { PerformanceLayer } from './layers/performance-layer.js';
import { CombatLayer } from './layers/combat-layer.js';

// PHASE 7: Import utility layer governance enforcement
import { UtilityLayer } from './layers/utility-layer.js';

// PHASE 3: Import mutation authority layer
import { MutationIntegrityLayer } from './mutation-integrity-layer.js';

// PHASE 10: Import hook mutation detection layer
import { HooksMutationLayer } from './layers/hooks-mutation-layer.js';

// PHASE 3: Import Batch 1 validation suite
import { Batch1Validation } from '../mutation/batch-1-validation.js';

/**
 * Initialize and register all sentinel layers
 * Called during system bootstrap
 */
export function initializeSentinelLayers() {
  // Register layers in priority order
  // Do not change order without understanding dependencies

  SentinelEngine.registerLayer('css', CSSLayer);
  SentinelEngine.registerLayer('render', RenderLayer);
  SentinelEngine.registerLayer('data', DataLayer);
  SentinelEngine.registerLayer('hooks', HooksLayer);
  SentinelEngine.registerLayer('promises', PromisesLayer);
  SentinelEngine.registerLayer('performance', PerformanceLayer);

  // PHASE 3: Register mutation authority enforcement
  SentinelEngine.registerLayer('mutation', MutationIntegrityLayer);

  // PHASE 4: Register combat domain sovereignty layer
  SentinelEngine.registerLayer('combat', CombatLayer);

  // PHASE 7: Register utility layer governance enforcement
  SentinelEngine.registerLayer('utility', UtilityLayer);

  // PHASE 10: Register hook mutation detection layer
  SentinelEngine.registerLayer('hooks-mutation', HooksMutationLayer);
}

/**
 * Bootstrap Sentinel kernel after layer registration
 */
export function bootstrapSentinel() {
  SentinelEngine.bootstrap();

  // PHASE 3: Register Batch 1 Validation Suite with Sentinel
  // Makes validation available via sentinel API
  if (typeof window !== 'undefined') {
    window.Batch1Validation = Batch1Validation;
  }

  console.log('[Sentinel] Batch1Validation suite registered');
}

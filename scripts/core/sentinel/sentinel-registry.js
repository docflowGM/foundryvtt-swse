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

// PHASE 3: Import mutation authority layer
import { MutationIntegrityLayer } from './mutation-integrity-layer.js';

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
}

/**
 * Bootstrap Sentinel kernel after layer registration
 */
export function bootstrapSentinel() {
  SentinelEngine.bootstrap();
}

/**
 * Sentinel Layer Registry
 *
 * Manages layer registration, initialization order, and dependencies
 * Loads all layers and registers with kernel
 */

import { Sentinel } from './sentinel-core.js';

// Import all layers
import { CSSLayer } from './layers/css-layer.js';
import { RenderLayer } from './layers/render-layer.js';
import { DataLayer } from './layers/data-layer.js';
import { HooksLayer } from './layers/hooks-layer.js';
import { PromisesLayer } from './layers/promises-layer.js';
import { PerformanceLayer } from './layers/performance-layer.js';

/**
 * Initialize and register all sentinel layers
 * Called during system bootstrap
 */
export function initializeSentinelLayers() {
  // Register layers in priority order
  // Do not change order without understanding dependencies

  Sentinel.registerLayer('css', CSSLayer);
  Sentinel.registerLayer('render', RenderLayer);
  Sentinel.registerLayer('data', DataLayer);
  Sentinel.registerLayer('hooks', HooksLayer);
  Sentinel.registerLayer('promises', PromisesLayer);
  Sentinel.registerLayer('performance', PerformanceLayer);
}

/**
 * Bootstrap Sentinel kernel after layer registration
 */
export function bootstrapSentinel() {
  Sentinel.bootstrap();
}

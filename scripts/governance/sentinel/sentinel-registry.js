/**
 * Sentinel Layer Registry
 *
 * Manages layer registration, initialization order, and dependencies
 * Loads all layers and registers with kernel
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

// Import all layers
import { CSSLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/layers/css-layer.js";
// NOTE: RenderLayer and PerformanceLayer do not exist yet (placeholder for future implementation)
// import { RenderLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/layers/render-layer.js";
import { DataLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/layers/data-layer.js";
import { HooksLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/layers/hooks-layer.js";
import { PromisesLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/layers/promises-layer.js";
// import { PerformanceLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/layers/performance-layer.js";
import { CombatLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/layers/combat-layer.js";

// PHASE 7: Import utility layer governance enforcement
import { UtilityLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/layers/utility-layer.js";

// PHASE 3: Import mutation authority layer
import { MutationIntegrityLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/mutation-integrity-layer.js";

// PHASE 10: Import hook mutation detection layer
import { HooksMutationLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/layers/hooks-mutation-layer.js";

// PHASE 3: Import Batch 1 validation suite
import { Batch1Validation } from "/systems/foundryvtt-swse/scripts/governance/mutation/batch-1-validation.js";

// PHASE 2: Import AppV2 Auditor Layer (V13 foundation enforcement)
import { AppV2AuditorLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/appv2-auditor.js";

// PHASE 11: Import Always-On Audit Layers (Store + Sheet + Roll + Update + Template + Guardrails + Layout + CSS + Contract)
import { SentinelMallCop } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-mall-cop.js";
import { SentinelSheetHydration } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-sheet-hydration.js";
import { SentinelSheetGuardrails } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-sheet-guardrails.js";
import { SentinelLayoutDebugger } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-layout-debugger.js";
import { SentinelCSSContract } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-css-contract.js";
import { SentinelLayoutEvaluator } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-layout-evaluator.js";
import { SentinelRollPipeline } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-roll-pipeline.js";
import { SentinelUpdateAtomicity } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-update-atomicity.js";
import { SentinelTemplateIntegrity } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-template-integrity.js";

/**
 * Initialize and register all sentinel layers
 * Called during system bootstrap
 */
export function initializeSentinelLayers() {
  // Register layers in priority order
  // Do not change order without understanding dependencies

  SentinelEngine.registerLayer('css', CSSLayer);
  // SentinelEngine.registerLayer('render', RenderLayer); // Placeholder layer not yet implemented
  SentinelEngine.registerLayer('data', DataLayer);
  SentinelEngine.registerLayer('hooks', HooksLayer);
  SentinelEngine.registerLayer('promises', PromisesLayer);
  // SentinelEngine.registerLayer('performance', PerformanceLayer); // Placeholder layer not yet implemented

  // PHASE 3: Register mutation authority enforcement
  SentinelEngine.registerLayer('mutation', MutationIntegrityLayer);

  // PHASE 4: Register combat domain sovereignty layer
  SentinelEngine.registerLayer('combat', CombatLayer);

  // PHASE 7: Register utility layer governance enforcement
  SentinelEngine.registerLayer('utility', UtilityLayer);

  // PHASE 10: Register hook mutation detection layer
  SentinelEngine.registerLayer('hooks-mutation', HooksMutationLayer);

  // PHASE 2: Register AppV2 Auditor (V13 foundation enforcement)
  // Reports through Sentinel for unified health state + aggregation
  SentinelEngine.registerLayer('appv2', AppV2AuditorLayer);

  // PHASE 11: Initialize Always-On Audit Layers
  // These are passive, always-enabled monitoring layers
  // (They self-initialize via Hooks.once('ready'))
  console.log('[Sentinel] Registering always-on audit layers...');
  // Layers auto-init on Foundry ready, no manual registration needed
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

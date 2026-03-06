/**
 * SWSE Sentinel Auditors - Runtime validation modules
 */

export {
  auditOverflow,
  auditZeroSize,
  auditStackingContext,
  auditForbiddenStyles,
  auditIcons,
  auditCSSVariable,
  auditHidden,
  auditCSSHealth,
  runFullCSSAudit
} from "/systems/foundryvtt-swse/scripts/governance/sentinel/css-auditor.js";

export {
  v2Assert,
  logRenderLifecycle,
  validateContextShape,
  logAsyncOrderViolation,
  CompendiumAccessAuditor,
  validateDOMOwnership,
  validateLayoutState,
  validateStateDrift,
  generateMigrationReport,
  enableStrictV2,
  disableStrictV2,
  logPhase,
  validateCompendiumIntegrity,
  validateContextComplete,
  validateTemplateDependencies,
  classifyRenderOutcome,
  validateSurfaceTransition,
  setupNoWindowSentinel,
  generateUIFailureReport
} from "/systems/foundryvtt-swse/scripts/governance/sentinel/migration-auditor.js";

// Sentinel Reporter - File export utility
export { SentinelReporter } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-reporter.js";

// Tab Diagnostics - Deep diagnostic for tab system failures
export {
  SentinelTabDiagnostics,
  initTabDiagnostics
} from "/systems/foundryvtt-swse/scripts/governance/sentinel/tab-diagnostics.js";

// AppV2 Auditor - Runtime contract enforcement for ApplicationV2
export {
  SentinelAppV2Auditor,
  initAppV2Auditor
} from "/systems/foundryvtt-swse/scripts/governance/sentinel/appv2-auditor.js";

/* 🔥 IMPORTANT: Explicitly import what we use locally */
import { initMigrationAuditor } from "/systems/foundryvtt-swse/scripts/governance/sentinel/migration-auditor.js";
import { initTabDiagnostics } from "/systems/foundryvtt-swse/scripts/governance/sentinel/tab-diagnostics.js";
import { initAppV2Auditor } from "/systems/foundryvtt-swse/scripts/governance/sentinel/appv2-auditor.js";

/**
 * Initialize all auditors
 */
export function initializeSentinelAuditors() {
  initMigrationAuditor();
  initTabDiagnostics();
  initAppV2Auditor();
  console.log('[Sentinel Auditors] Initialized');
}
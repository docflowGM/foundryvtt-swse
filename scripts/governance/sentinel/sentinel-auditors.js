/**
 * SWSE Sentinel Auditors - Runtime validation modules
 * Provides CSS and migration auditing for system integrity
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
} from './css-auditor.js';

export {
  initMigrationAuditor,
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
} from './migration-auditor.js';

/**
 * Initialize all auditors
 * Called by SentinelEngine during bootstrap
 */
export function initializeSentinelAuditors() {
  initMigrationAuditor();
  console.log('[Sentinel Auditors] Initialized');
}

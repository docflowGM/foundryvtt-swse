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
} from './css-auditor.js';

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
} from './migration-auditor.js';

/* 🔥 IMPORTANT: Explicitly import what we use locally */
import { initMigrationAuditor } from './migration-auditor.js';

/**
 * Initialize all auditors
 */
export function initializeSentinelAuditors() {
  initMigrationAuditor();
  console.log('[Sentinel Auditors] Initialized');
}
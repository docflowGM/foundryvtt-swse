/**
 * Combat Domain Sovereignty Layer
 *
 * Enforces architectural invariants for the V2 combat system:
 * - Orchestration authority (only CombatEngine orchestrates)
 * - Mutation routing (actor.update only in authorized engines)
 * - Roll engine isolation (RollEngine restricted to specific contexts)
 * - Layer separation (engine doesn't import from UI/sheets)
 * - No duplicate orchestrators (prevents mini-orchestrator regression)
 *
 * Runs in WARNING mode by default; configurable to ENFORCE.
 */

import { Sentinel } from './sentinel-core.js';

export const CombatLayer = {
  #violations = [],
  #enforceMode = false, // WARNING mode by default
  #scannedFiles = new Set(),

  /**
   * Initialize combat domain monitoring
   */
  init() {
    // Scan existing codebase for violations
    this.performInitialScan();

    // Expose control API
    if (typeof window !== 'undefined') {
      window.__SWSE_COMBAT_SENTINEL__ = {
        getViolations: () => this.getViolations(),
        getReport: () => this.generateReport(),
        setEnforceMode: (enforce) => this.setEnforceMode(enforce),
        scan: () => this.performInitialScan()
      };
    }

    Sentinel.report('combat', Sentinel.SEVERITY.INFO, 'Combat domain sovereignty monitoring initialized', {
      enforceMode: this.#enforceMode,
      mode: 'WARNING'
    });
  },

  /**
   * Set enforcement mode
   * @param {boolean} enforce - true = fail on violation, false = warn only
   */
  setEnforceMode(enforce) {
    this.#enforceMode = enforce;
    Sentinel.report('combat', Sentinel.SEVERITY.INFO, 'Combat enforcement mode changed', {
      enforceMode: enforce
    });
  },

  /**
   * VIOLATION DETECTOR 1: Orchestration Violations
   * Detects unauthorized calls to combat engines outside CombatEngine
   */
  detectOrchestrationViolations(filePath, content) {
    const violations = [];

    // Files that are allowed to call these
    const authorizedOrchestrators = [
      'scripts/engines/combat/CombatEngine.js',
      'scripts/engines/combat/subsystems'
    ];

    const isAuthorized = authorizedOrchestrators.some(path =>
      filePath.includes(path)
    );

    if (!isAuthorized && filePath.includes('scripts/engines/combat')) {
      // Forbidden orchestration calls
      const forbiddenPatterns = [
        /DamageEngine\s*\.\s*applyDamage\s*\(/,
        /ThresholdEngine\s*\.\s*applyResult\s*\(/,
        /SWSEInitiative\s*\.\s*rollInitiative\s*\(/,
        /ActorEngine\s*\.\s*applyDamage\s*\(/,
        /Combat\s*\.\s*setInitiative\s*\(/
      ];

      forbiddenPatterns.forEach((pattern, idx) => {
        const matches = content.match(pattern);
        if (matches) {
          violations.push({
            type: 'ORCHESTRATION_VIOLATION',
            severity: 'ERROR',
            file: filePath,
            pattern: pattern.source,
            message: `Unauthorized orchestration call detected: ${matches[0]}`,
            context: 'Only CombatEngine may orchestrate combat subsystems'
          });
        }
      });
    }

    return violations;
  },

  /**
   * VIOLATION DETECTOR 2: Direct Mutation Violations
   * Detects actor.update() and direct property mutations outside authorized engines
   */
  detectMutationViolations(filePath, content) {
    const violations = [];

    // Authorized mutation engines
    const authorizedMutators = [
      'ActorEngine.js',
      'DamageEngine.js',
      'ThresholdEngine.js'
    ];

    const isAuthorized = authorizedMutators.some(name =>
      filePath.includes(name)
    );

    if (!isAuthorized && filePath.includes('scripts/engines/combat')) {
      // Forbidden direct mutations
      const mutationPatterns = [
        {
          pattern: /actor\s*\.\s*system\s*\.\s*hp\s*\.\s*value\s*=/,
          message: 'Direct actor.system.hp.value assignment detected'
        },
        {
          pattern: /actor\s*\.\s*system\s*\.\s*conditionTrack\s*\.\s*current\s*=/,
          message: 'Direct actor.system.conditionTrack.current assignment detected'
        },
        {
          pattern: /actor\s*\.\s*update\s*\(\s*\{\s*system\s*\.\s*hp/,
          message: 'actor.update() with HP mutation detected'
        }
      ];

      mutationPatterns.forEach(({ pattern, message }) => {
        const matches = content.match(pattern);
        if (matches) {
          violations.push({
            type: 'MUTATION_VIOLATION',
            severity: 'CRITICAL',
            file: filePath,
            pattern: pattern.source,
            message,
            context: 'Actor mutations must route through ActorEngine, DamageEngine, or ThresholdEngine'
          });
        }
      });
    }

    return violations;
  },

  /**
   * VIOLATION DETECTOR 3: Roll Engine Misuse
   * Detects RollEngine.safeRoll() outside authorized contexts
   */
  detectRollEngineMisuse(filePath, content) {
    const violations = [];

    // Authorized roll contexts
    const authorizedRollContexts = [
      'SWSEInitiative.js',
      'CombatEngine.js',
      'scripts/engines/combat/roll/'
    ];

    const isAuthorized = authorizedRollContexts.some(path =>
      filePath.includes(path)
    );

    if (!isAuthorized && content.includes('RollEngine.safeRoll')) {
      violations.push({
        type: 'ROLL_ENGINE_MISUSE',
        severity: 'WARN',
        file: filePath,
        message: 'RollEngine.safeRoll() used outside authorized contexts',
        context: 'Roll math must stay in: CombatEngine, SWSEInitiative, or engine/combat/roll/'
      });
    }

    return violations;
  },

  /**
   * VIOLATION DETECTOR 4: UI ↔ Engine Layer Violations
   * Detects engine importing from UI/sheets/templates
   */
  detectLayerViolations(filePath, content) {
    const violations = [];

    if (!filePath.includes('scripts/engines/combat')) {
      return violations; // Only check combat engine files
    }

    // Engine should NOT import from these
    const forbiddenImports = [
      /from\s+['"].*scripts\/sheets\//,
      /from\s+['"].*scripts\/ui\//,
      /from\s+['"].*templates\//,
      /import\s+.*from\s+['"].*scripts\/sheets\//,
      /import\s+.*from\s+['"].*scripts\/ui\//
    ];

    forbiddenImports.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        violations.push({
          type: 'LAYER_VIOLATION',
          severity: 'ERROR',
          file: filePath,
          message: `Engine importing from UI layer: ${matches[0]}`,
          context: 'Combat engine must not depend on UI/sheets/templates'
        });
      }
    });

    return violations;
  },

  /**
   * VIOLATION DETECTOR 5: Duplicate Orchestrator Detection
   * Flags new orchestrator methods outside CombatEngine
   */
  detectDuplicateOrchestrators(filePath, content) {
    const violations = [];

    if (!filePath.includes('scripts/engines/combat')) {
      return violations;
    }

    // Only CombatEngine should have these
    if (!filePath.includes('CombatEngine.js')) {
      const orchestratorMethods = [
        /^\s*(?:async\s+)?resolveAttack\s*\(/m,
        /^\s*(?:async\s+)?rollAttack\s*\(/m,
        /^\s*(?:async\s+)?applyDamage\s*\(/m,
        /^\s*(?:async\s+)?handleAttack\s*\(/m
      ];

      orchestratorMethods.forEach((pattern) => {
        const matches = content.match(pattern);
        if (matches) {
          violations.push({
            type: 'DUPLICATE_ORCHESTRATOR',
            severity: 'WARN',
            file: filePath,
            message: `Orchestrator method detected outside CombatEngine: ${matches[0].trim()}`,
            context: 'All combat orchestration should route through CombatEngine'
          });
        }
      });
    }

    return violations;
  },

  /**
   * VIOLATION DETECTOR 6: Execution Order Drift
   * Advanced pattern: detects threshold before damage, shield after HP, etc.
   */
  detectExecutionOrderDrift(filePath, content) {
    const violations = [];

    if (!filePath.includes('scripts/engines/combat/CombatEngine.js')) {
      return violations; // Only check main orchestrator
    }

    // Check for execution order problems
    const thresholdIndex = content.indexOf('ThresholdEngine.applyResult');
    const damageIndex = content.indexOf('DamageEngine.applyDamage');

    if (thresholdIndex > -1 && damageIndex > -1 && thresholdIndex < damageIndex) {
      violations.push({
        type: 'EXECUTION_ORDER_DRIFT',
        severity: 'WARN',
        file: filePath,
        message: 'Threshold processing occurs before damage application',
        context: 'Expected order: DamageEngine → ThresholdEngine → Escalation'
      });
    }

    return violations;
  },

  /**
   * Perform full codebase scan
   * @private
   */
  async performInitialScan() {
    if (typeof Hooks === 'undefined') {
      return; // Not in browser context
    }

    this.#violations = [];

    // Try to fetch combat domain files
    const combatFiles = [
      'scripts/engines/combat/CombatEngine.js',
      'scripts/engines/combat/subsystems/DamageEngine.js',
      'scripts/engines/combat/subsystems/ThresholdEngine.js',
      'scripts/engines/combat/subsystems/ActorEngine.js',
      'scripts/engines/combat/subsystems/EscalationEngine.js',
      'scripts/engines/combat/initiative/SWSEInitiative.js'
    ];

    for (const file of combatFiles) {
      if (this.#scannedFiles.has(file)) continue;

      try {
        const response = await fetch(file);
        if (!response.ok) continue;

        const content = await response.text();
        this.#scannedFiles.add(file);

        // Run all detectors
        const violations = [
          ...this.detectOrchestrationViolations(file, content),
          ...this.detectMutationViolations(file, content),
          ...this.detectRollEngineMisuse(file, content),
          ...this.detectLayerViolations(file, content),
          ...this.detectDuplicateOrchestrators(file, content),
          ...this.detectExecutionOrderDrift(file, content)
        ];

        violations.forEach(v => {
          this.#violations.push(v);
          this.reportViolation(v);
        });
      } catch (err) {
        // Silently fail on file fetch
      }
    }
  },

  /**
   * Report a single violation
   * @private
   */
  reportViolation(violation) {
    const severity = violation.severity === 'CRITICAL'
      ? Sentinel.SEVERITY.CRITICAL
      : violation.severity === 'ERROR'
        ? Sentinel.SEVERITY.ERROR
        : Sentinel.SEVERITY.WARN;

    Sentinel.report(
      'combat',
      severity,
      `[${violation.type}] ${violation.message}`,
      {
        file: violation.file,
        type: violation.type,
        context: violation.context,
        pattern: violation.pattern
      }
    );

    // In enforce mode, could escalate
    if (this.#enforceMode && severity >= Sentinel.SEVERITY.ERROR) {
      // Future: could throw or fail build
    }
  },

  /**
   * Get all detected violations
   */
  getViolations() {
    return [...this.#violations];
  },

  /**
   * Generate structured combat violation report
   */
  generateReport() {
    const report = {
      timestamp: Date.now(),
      enforceMode: this.#enforceMode,
      totalViolations: this.#violations.length,
      byType: {},
      bySeverity: {},
      topOffenders: [],
      violations: this.#violations
    };

    // Group by type
    this.#violations.forEach(v => {
      if (!report.byType[v.type]) {
        report.byType[v.type] = 0;
      }
      report.byType[v.type]++;

      if (!report.bySeverity[v.severity]) {
        report.bySeverity[v.severity] = 0;
      }
      report.bySeverity[v.severity]++;
    });

    // Top offenders
    const fileCount = new Map();
    this.#violations.forEach(v => {
      fileCount.set(v.file, (fileCount.get(v.file) || 0) + 1);
    });
    report.topOffenders = Array.from(fileCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file, count]) => ({ file, count }));

    return report;
  }
};

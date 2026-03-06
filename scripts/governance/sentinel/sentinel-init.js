/**
 * Sentinel Initialization
 * Bootstraps unified enforcement and removes duplicate guards
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";
import { SentinelEnforcement } from "/systems/foundryvtt-swse/scripts/governance/sentinel/enforcement-core.js";
import { SheetIntegrationLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/layers/sheet-integration-layer.js";
import { V2ComprehensiveAudit } from "/systems/foundryvtt-swse/scripts/governance/sentinel/v2-comprehensive-audit.js";
import { SWSEV2SheetDiagnostics } from "/systems/foundryvtt-swse/scripts/sheets/v2/sheet-diagnostics.js";

export function initializeSentinelGovernance() {
  // Initialize enforcement layer
  SentinelEnforcement.init();

  // Register sheet integration audit layer (Phase A2)
  SentinelEngine.registerLayer('sheet-integration', {
    init: () => SheetIntegrationLayer.init(),
    enabled: true
  });

  // Register V2 comprehensive governance audit (Phase 1: Survey)
  SentinelEngine.registerLayer('v2-comprehensive-audit', {
    init: () => {
      // Audit is on-demand via game.SWSE.debug.runV2ComprehensiveAudit()
    },
    enabled: true
  });

  // Register performance metrics layer
  registerPerformanceLayer();

  // Bootstrap Sentinel engine
  SentinelEngine.bootstrap();

  // Register console export command
  registerConsoleExport();
}

/**
 * Performance metrics layer
 */
function registerPerformanceLayer() {
  SentinelEngine.registerLayer('performance', {
    init: () => {
      Hooks.on('renderApplicationV2', (app) => {
        const startTime = performance.now();
        const timerId = `app:${app.id || Date.now()}`;
        SentinelEngine.startTimer(timerId);

        requestAnimationFrame(() => {
          const elapsed = SentinelEngine.endTimer(timerId);
          if (elapsed > 1000) {
            SentinelEngine.report('performance', SentinelEngine.SEVERITY.WARN,
              'Slow ApplicationV2 render', {
                appName: app.constructor.name,
                duration: `${elapsed.toFixed(2)}ms`,
                threshold: '1000ms'
              });
          }
        });
      });

      Hooks.on('renderDocumentSheetV2', (sheet) => {
        const timerId = `sheet:${sheet.id || Date.now()}`;
        SentinelEngine.startTimer(timerId);

        requestAnimationFrame(() => {
          const elapsed = SentinelEngine.endTimer(timerId);
          if (elapsed > 500) {
            SentinelEngine.report('performance', SentinelEngine.SEVERITY.WARN,
              'Slow DocumentSheetV2 render', {
                sheetName: sheet.constructor.name,
                duration: `${elapsed.toFixed(2)}ms`,
                threshold: '500ms'
              });
          }
        });
      });
    },
    enabled: true
  });
}

/**
 * Register console export command
 */
function registerConsoleExport() {
  if (typeof window !== 'undefined') {
    // Initialize main sentinel namespace
    if (!window.sentinel) {
      window.sentinel = {};
    }

    // Expose sheet audit diagnostics under sentinel.sheetaudit
    window.sentinel.sheetaudit = {
      /**
       * Run V2 sheet diagnostics and copy report to clipboard
       * Usage: sentinel.sheetaudit.runandcopy()
       */
      runandcopy: async (actor = null) => {
        return await SWSEV2SheetDiagnostics.runAndCopy(actor);
      },

      /**
       * Run diagnostics without clipboard copy
       * Usage: sentinel.sheetaudit.run()
       */
      run: async (actor = null) => {
        return await SWSEV2SheetDiagnostics.runDiagnostics(actor);
      }
    };

    // Keep legacy _SWSE_Sentinel for backward compatibility
    window._SWSE_Sentinel = {
      report: {
        /**
         * Export sentinel report as JSON file
         */
        export: () => {
          const data = {
            timestamp: new Date().toISOString(),
            foundryVersion: game.version,
            systemVersion: game.system.version,
            sentinelStatus: SentinelEngine.getStatus(),
            violations: window._SWSE_Enforcement.export(),
            sentinelReports: SentinelEngine.getReports()
          };

          const json = JSON.stringify(data, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);

          // Create filename with timestamp
          const now = new Date();
          const timestamp = now.toISOString()
            .replace(/[:-]/g, '-')
            .split('T')[0] + '-' +
            now.toTimeString().split(' ')[0].replace(/:/g, '-');
          const filename = `swse-sentinel-report-${timestamp}.json`;

          // Download
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          console.log(
            '%c[SWSE SENTINEL] Report exported to file',
            'color:cyan;font-weight:bold;',
            filename
          );
          return data;
        }
      }
    };

    console.log(
      '%c[SWSE SENTINEL] Console API ready',
      'color:cyan;font-weight:bold;'
    );
    console.log(
      '%c  Sheet Diagnostics: sentinel.sheetaudit.runandcopy()',
      'color:cyan;'
    );
    console.log(
      '%c  Report Export: window._SWSE_Sentinel.report.export()',
      'color:cyan;'
    );
  }
}

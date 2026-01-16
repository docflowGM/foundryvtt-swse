/**
 * SWSE Character Sheet Debug Module
 * Paste this into Forge console to diagnose character sheet initialization issues
 *
 * Usage:
 * 1. Copy this entire file
 * 2. Open browser console (F12)
 * 3. Paste and press Enter
 * 4. Try opening a character sheet
 * 5. Check console for detailed diagnostic logs
 */

(function() {
  swseLogger.log('%c=== SWSE Character Sheet Debugger Loaded ===', 'color: #00ff00; font-size: 16px; font-weight: bold');

  const DEBUG_PREFIX = '[SWSE DEBUG]';
  const debugLog = (...args) => swseLogger.log(`%c${DEBUG_PREFIX}`, 'color: #00aaff; font-weight: bold', ...args);
  const debugError = (...args) => swseLogger.error(`%c${DEBUG_PREFIX}`, 'color: #ff0000; font-weight: bold', ...args);
  const debugWarn = (...args) => swseLogger.warn(`%c${DEBUG_PREFIX}`, 'color: #ffaa00; font-weight: bold', ...args);
  const debugSuccess = (...args) => swseLogger.log(`%c${DEBUG_PREFIX}`, 'color: #00ff00; font-weight: bold', '✓', ...args);

  // ============================================
  // Diagnostic Information
  // ============================================

  debugLog('Starting diagnostic checks...');

  // Check Foundry version
  debugLog('Foundry VTT Version:', game.version);

  // Check if SWSE system is loaded
  if (game.system.id === 'foundryvtt-swse') {
    debugSuccess('SWSE System is active');
  } else {
    debugError('SWSE System is NOT active! Current system:', game.system.id);
  }

  // ============================================
  // Check System Initialization
  // ============================================

  console.group('System Initialization Check');

  // Check game.swse namespace
  if (game.swse) {
    debugSuccess('game.swse namespace exists');
    debugLog('game.swse keys:', Object.keys(game.swse));
  } else {
    debugError('game.swse namespace is MISSING!');
  }

  // Check window.SWSE namespace
  if (window.SWSE) {
    debugSuccess('window.SWSE namespace exists');
    debugLog('window.SWSE keys:', Object.keys(window.SWSE));
  } else {
    debugError('window.SWSE namespace is MISSING!');
  }

  // Check CONFIG.SWSE
  if (CONFIG.SWSE) {
    debugSuccess('CONFIG.SWSE exists');
  } else {
    debugError('CONFIG.SWSE is MISSING!');
  }

  console.groupEnd();

  // ============================================
  // Check Core Components
  // ============================================

  console.group('Core Components Check');

  const componentsToCheck = [
    'SWSEActorBase',
    'SWSEItemBase',
    'DamageSystem',
    'CombatActionsMapper',
    'HouseruleMechanics',
    'HouserulesConfig',
    'SWSEStore',
    'SWSELevelUp'
  ];

  componentsToCheck.forEach(component => {
    const exists = (window[component] || game.swse?.[component] || window.SWSE?.[component]);
    if (exists) {
      debugSuccess(`${component} is loaded`);
    } else {
      debugError(`${component} is MISSING!`);
    }
  });

  console.groupEnd();

  // ============================================
  // Check Houserules Initialization
  // ============================================

  console.group('Houserules Initialization Check');

  // Check if houserule settings exist
  try {
    const houseruleSettings = [
      'enableCriticalHits',
      'criticalHitMultiplier',
      'enableFumbles',
      'naturalOneAlwaysMisses',
      'naturalTwentyAlwaysHits'
    ];

    let settingsFound = 0;
    houseruleSettings.forEach(setting => {
      try {
        const value = game.settings.get('foundryvtt-swse', setting);
        debugSuccess(`Setting '${setting}' = ${value}`);
        settingsFound++;
      } catch (err) {
        debugWarn(`Setting '${setting}' not found`);
      }
    });

    if (settingsFound > 0) {
      debugSuccess(`Found ${settingsFound} houserule settings`);
    } else {
      debugError('No houserule settings found - settings not registered!');
    }
  } catch (err) {
    debugError('Failed to check houserule settings:', err);
  }

  // Check if HouseruleMechanics is initialized
  if (game.swse?.HouseruleMechanics || window.SWSE?.HouseruleMechanics) {
    debugSuccess('HouseruleMechanics class is available');
  } else {
    debugError('HouseruleMechanics class is MISSING!');
  }

  console.groupEnd();

  // ============================================
  // Check Data Models
  // ============================================

  console.group('Data Models Check');

  if (CONFIG.Actor.dataModels) {
    debugSuccess('Actor data models registered:');
    Object.entries(CONFIG.Actor.dataModels).forEach(([type, model]) => {
      debugLog(`  ${type}:`, model.name || model);
    });
  } else {
    debugError('No Actor data models registered!');
  }

  console.groupEnd();

  // ============================================
  // Check if character sheet class is registered
  // ============================================

  console.group('Sheet Registration Check');

  if (typeof SWSECharacterSheet !== 'undefined') {
    debugSuccess('SWSECharacterSheet class is defined globally');
  } else if (game.swse?.SWSECharacterSheet) {
    debugSuccess('SWSECharacterSheet available via game.swse');
  } else {
    debugError('SWSECharacterSheet class is NOT defined!');
  }

  // Check registered sheets
  debugLog('Registered Actor Sheets:');
  const actorTypes = CONFIG.Actor.sheetClasses || {};
  Object.entries(actorTypes).forEach(([type, sheets]) => {
    if (sheets && Object.keys(sheets).length > 0) {
      debugLog(`  ${type}:`, Object.keys(sheets));
    } else {
      debugWarn(`  ${type}: No sheets registered!`);
    }
  });

  console.groupEnd();

  // ============================================
  // Check for JavaScript Errors
  // ============================================

  console.group('JavaScript Error Check');

  // Check browser console for existing errors
  debugLog('Checking for console errors...');
  debugLog('(Open DevTools > Console and look for red error messages)');

  // Try to load problematic module
  if (game.modules?.get('forgevtt')?.active) {
    debugWarn('Forge VTT module is active - compatibility issues possible');
  }

  console.groupEnd();

  // ============================================
  // Hook into Sheet Rendering
  // ============================================

  let renderAttempts = 0;
  let successfulRenders = 0;
  let failedRenders = 0;

  Hooks.on('renderActorSheet', (app, html, data) => {
    renderAttempts++;

    debugLog('─'.repeat(60));
    debugLog(`Sheet Render Attempt #${renderAttempts}`);
    debugLog('Sheet Class:', app.constructor.name);
    debugLog('Actor Name:', app.actor?.name || 'Unknown');
    debugLog('Actor Type:', app.actor?.type || 'Unknown');
    debugLog('Actor ID:', app.actor?.id || 'Unknown');
    debugLog('Sheet Template:', app.template);
    debugLog('HTML Element:', html.length ? `${html.length} elements` : 'No elements');
    debugLog('Data Context Keys:', Object.keys(data));

    if (app.constructor.name === 'SWSECharacterSheet' || app.actor?.type === 'character') {
      successfulRenders++;
      debugSuccess(`Character sheet rendered successfully! (${successfulRenders} total)`);

      // Check for common issues
      if (!html || html.length === 0) {
        debugError('HTML is empty or missing!');
      }

      if (!data || Object.keys(data).length === 0) {
        debugError('Data context is empty!');
      }

      // Check for specific elements
      const tabs = html.find('.sheet-tabs');
      const body = html.find('.sheet-body');

      debugLog('Sheet Structure Check:');
      debugLog('  Tabs found:', tabs.length > 0 ? `Yes (${tabs.length})` : 'No');
      debugLog('  Body found:', body.length > 0 ? `Yes (${body.length})` : 'No');

      // Check actor data
      debugLog('Actor Data Check:');
      debugLog('  System data exists:', !!app.actor?.system);
      debugLog('  Level:', app.actor?.system?.level);
      debugLog('  HP:', app.actor?.system?.hp);
      debugLog('  Abilities:', app.actor?.system?.abilities ? Object.keys(app.actor.system.attributes) : 'None');
    }

    debugLog('─'.repeat(60));
  });

  // ============================================
  // Hook into getData (before render)
  // ============================================

  Hooks.on('preRenderActorSheet', (app, html) => {
    debugLog('Pre-Render Hook Triggered:');
    debugLog('  Sheet:', app.constructor.name);
    debugLog('  Actor:', app.actor?.name);

    try {
      // Try to get data
      debugLog('  Attempting to call getData()...');
      const data = app.getData();
      if (data instanceof Promise) {
        data.then(resolvedData => {
          debugSuccess('  getData() returned Promise, resolved successfully');
          debugLog('  Data keys:', Object.keys(resolvedData));
        }).catch(err => {
          debugError('  getData() Promise rejected:', err);
        });
      } else {
        debugSuccess('  getData() returned synchronously');
        debugLog('  Data keys:', Object.keys(data));
      }
    } catch (err) {
      debugError('  getData() threw error:', err);
      swseLogger.error(err.stack);
    }
  });

  // ============================================
  // Hook into Actor Sheet Close
  // ============================================

  Hooks.on('closeActorSheet', (app, html) => {
    debugLog('Sheet Closed:', app.constructor.name, '-', app.actor?.name);
  });

  // ============================================
  // Global Error Handler
  // ============================================

  const originalError = console.error;
  console.error = function(...args) {
    // Check if error is related to character sheets
    const errorString = args.join(' ').toLowerCase();
    if (errorString.includes('sheet') ||
        errorString.includes('character') ||
        errorString.includes('swse') ||
        errorString.includes('render')) {
      debugError('Intercepted Error (potentially sheet-related):');
      debugError(...args);

      // Try to get stack trace
      const error = new Error();
      debugError('Stack Trace:', error.stack);
    }

    return originalError.apply(console, args);
  };

  // ============================================
  // Diagnostic Functions
  // ============================================

  window.SWSE_DEBUG = {
    // Get current stats
    stats() {
      console.group('SWSE Debug Statistics');
      swseLogger.log('Render Attempts:', renderAttempts);
      swseLogger.log('Successful Renders:', successfulRenders);
      swseLogger.log('Failed Renders:', failedRenders);
      console.groupEnd();
    },

    // Test opening a character sheet
    async testCharacterSheet() {
      debugLog('Testing character sheet rendering...');

      // Find first character
      const character = game.actors.find(a => a.type === 'character');
      if (!character) {
        debugError('No characters found in the world!');
        return;
      }

      debugLog('Found character:', character.name);
      debugLog('Character ID:', character.id);
      debugLog('Character Type:', character.type);

      try {
        debugLog('Attempting to render sheet...');
        await character.sheet.render(true);
        debugSuccess('Sheet render called successfully');
      } catch (err) {
        debugError('Failed to render sheet:', err);
        swseLogger.error(err.stack);
      }
    },

    // Check all character sheets
    checkAll() {
      debugLog('Checking all characters...');
      const characters = game.actors.filter(a => a.type === 'character');

      console.group(`Found ${characters.length} characters`);
      characters.forEach((char, i) => {
        swseLogger.log(`${i + 1}. ${char.name} (${char.id})`);
        swseLogger.log('   Sheet Class:', char.sheet?.constructor.name || 'No sheet');
        swseLogger.log('   Level:', char.system?.level || 'Unknown');
        swseLogger.log('   HP:', char.system?.hp || 'Unknown');
      });
      console.groupEnd();
    },

    // Inspect specific actor
    inspect(actorNameOrId) {
      const actor = game.actors.get(actorNameOrId) || game.actors.getName(actorNameOrId);

      if (!actor) {
        debugError('Actor not found:', actorNameOrId);
        return;
      }

      console.group(`Inspecting: ${actor.name}`);
      swseLogger.log('ID:', actor.id);
      swseLogger.log('Type:', actor.type);
      swseLogger.log('Sheet:', actor.sheet?.constructor.name);
      swseLogger.log('Sheet Rendered:', actor.sheet?.rendered);
      swseLogger.log('Sheet Element:', actor.sheet?.element);
      swseLogger.log('System Data:', actor.system);
      swseLogger.log('Items:', actor.items.size, 'items');
      swseLogger.log('Effects:', actor.effects.size, 'effects');
      console.groupEnd();

      return actor;
    },

    // Force refresh all open sheets
    refreshSheets() {
      debugLog('Refreshing all open actor sheets...');
      let count = 0;
      Object.values(ui.windows).forEach(app => {
        if (app.actor && app.render) {
          debugLog('Refreshing:', app.actor.name);
          app.render(false);
          count++;
        }
      });
      debugSuccess(`Refreshed ${count} sheets`);
    },

    // Check for the syntax error
    checkSyntaxError() {
      debugLog('Checking for newLevel syntax error...');
      try {
        // Try to import the levelup module
        import('/systems/foundryvtt-swse/scripts/apps/swse-levelup-enhanced.js')
          .then(() => {
            debugSuccess('swse-levelup-enhanced.js loaded without syntax errors');
          })
          .catch(err => {
            debugError('Syntax error in swse-levelup-enhanced.js:', err);
          });
      } catch (err) {
        debugError('Failed to check:', err);
      }
    },

    // Check initialization hooks
    checkHooks() {
      console.group('Hook Registration Check');

      const hooksToCheck = ['init', 'ready', 'renderActorSheet', 'preUpdateActor'];

      hooksToCheck.forEach(hookName => {
        const hooks = Hooks._hooks[hookName];
        if (hooks && hooks.length > 0) {
          debugLog(`Hook '${hookName}': ${hooks.length} listeners`);
        } else {
          debugWarn(`Hook '${hookName}': No listeners`);
        }
      });

      console.groupEnd();
    },

    // Full diagnostic report
    fullDiagnostic() {
      console.clear();
      swseLogger.log('%c=== FULL SWSE DIAGNOSTIC REPORT ===', 'color: #00ff00; font-size: 18px; font-weight: bold');
      swseLogger.log('');

      this.checkHooks();
      this.checkAll();
      this.stats();
      this.checkSyntaxError();

      swseLogger.log('');
      swseLogger.log('%c=== END OF DIAGNOSTIC REPORT ===', 'color: #00ff00; font-size: 18px; font-weight: bold');
    },

    // Export diagnostic data
    exportDiagnostic() {
      const diagnostic = {
        timestamp: new Date().toISOString(),
        foundryVersion: game.version,
        systemId: game.system.id,
        systemVersion: game.system.version,
        renderStats: {
          attempts: renderAttempts,
          successful: successfulRenders,
          failed: failedRenders
        },
        namespaces: {
          gameSwse: !!game.swse,
          windowSwse: !!window.SWSE,
          configSwse: !!CONFIG.SWSE
        },
        actors: game.actors.filter(a => a.type === 'character').map(a => ({
          name: a.name,
          id: a.id,
          level: a.system?.level,
          hasSheet: !!a.sheet
        })),
        errors: []
      };

      swseLogger.log('Diagnostic Data:');
      swseLogger.log(JSON.stringify(diagnostic, null, 2));

      return diagnostic;
    }
  };

  // ============================================
  // Auto-run diagnostics
  // ============================================

  swseLogger.log('');
  swseLogger.log('%c=== Running Auto-Diagnostics ===', 'color: #ffaa00; font-size: 14px; font-weight: bold');
  swseLogger.log('');

  SWSE_DEBUG.checkAll();
  SWSE_DEBUG.stats();

  swseLogger.log('');
  swseLogger.log('%c=== Debug Functions Available ===', 'color: #00ff00; font-size: 14px; font-weight: bold');
  swseLogger.log('SWSE_DEBUG.stats()              - Show rendering statistics');
  swseLogger.log('SWSE_DEBUG.testCharacterSheet() - Test opening a character sheet');
  swseLogger.log('SWSE_DEBUG.checkAll()           - Check all characters');
  swseLogger.log('SWSE_DEBUG.inspect(name/id)     - Inspect specific actor');
  swseLogger.log('SWSE_DEBUG.refreshSheets()      - Force refresh all open sheets');
  swseLogger.log('SWSE_DEBUG.checkSyntaxError()   - Check for syntax errors in levelup module');
  swseLogger.log('SWSE_DEBUG.checkHooks()         - Check Foundry hook registrations');
  swseLogger.log('SWSE_DEBUG.fullDiagnostic()     - Run complete diagnostic report');
  swseLogger.log('SWSE_DEBUG.exportDiagnostic()   - Export diagnostic data as JSON');
  swseLogger.log('');
  swseLogger.log('%cNow try opening a character sheet and watch the console!', 'color: #00aaff; font-size: 12px');
  swseLogger.log('%cIf you see errors about "SWSECharacterSheet not defined", you need to RELOAD the page after fixing the syntax error!', 'color: #ff0000; font-size: 12px; font-weight: bold');

})();

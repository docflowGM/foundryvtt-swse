/**
 * SWSE Logger Utility
 * Centralized logging system with debug mode support
 */

export class SWSELogger {
  /**
   * Check if debug mode is enabled
   * @returns {boolean}
   */
  static isDebugMode() {
    // Use devMode setting (Developer Mode in settings)
    return game.settings?.get('swse', 'devMode') ?? false;
  }

  /**
   * Log a debug message (only shows when debug mode is enabled)
   * @param {...any} args - Arguments to log
   */
  static log(...args) {
    if (this.isDebugMode()) {
      SWSELogger.log('SWSE |', ...args);
    }
  }

  /**
   * Log an info message (always shows)
   * @param {...any} args - Arguments to log
   */
  static info(...args) {
    console.info('SWSE |', ...args);
  }

  /**
   * Log a warning message (always shows)
   * @param {...any} args - Arguments to log
   */
  static warn(...args) {
    SWSELogger.warn('SWSE |', ...args);
  }

  /**
   * Log an error message (always shows)
   * @param {...any} args - Arguments to log
   */
  static error(...args) {
    SWSELogger.error('SWSE |', ...args);
  }

  /**
   * Log a group with nested logs
   * @param {string} label - Group label
   * @param {Function} callback - Function containing nested logs
   */
  static group(label, callback) {
    if (this.isDebugMode()) {
      console.group(`SWSE | ${label}`);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Log a table (useful for arrays and objects)
   * @param {any} data - Data to display as table
   * @param {string} label - Optional label
   */
  static table(data, label = '') {
    if (this.isDebugMode()) {
      if (label) SWSELogger.log(`SWSE | ${label}`);
      console.table(data);
    }
  }

  /**
   * Log timing information
   * @param {string} label - Timer label
   */
  static time(label) {
    if (this.isDebugMode()) {
      console.time(`SWSE | ${label}`);
    }
  }

  /**
   * End timing information
   * @param {string} label - Timer label
   */
  static timeEnd(label) {
    if (this.isDebugMode()) {
      console.timeEnd(`SWSE | ${label}`);
    }
  }

  /**
   * Log actor information (for debugging sheets)
   * @param {Actor} actor - The actor to log
   */
  static actor(actor) {
    if (this.isDebugMode()) {
      console.group(`SWSE | Actor: ${actor.name}`);
      SWSELogger.log('Type:', actor.type);
      SWSELogger.log('System Data:', actor.system);
      SWSELogger.log('Items:', actor.items.contents);
      SWSELogger.log('Effects:', actor.effects.contents);
      console.groupEnd();
    }
  }

  /**
   * Log item information (for debugging)
   * @param {Item} item - The item to log
   */
  static item(item) {
    if (this.isDebugMode()) {
      console.group(`SWSE | Item: ${item.name}`);
      SWSELogger.log('Type:', item.type);
      SWSELogger.log('System Data:', item.system);
      SWSELogger.log('Actor:', item.actor?.name || 'None');
      console.groupEnd();
    }
  }

  /**
   * Log roll information (for debugging dice rolls)
   * @param {Roll} roll - The roll object
   * @param {string} label - Description of the roll
   */
  static roll(roll, label = 'Roll') {
    if (this.isDebugMode()) {
      console.group(`SWSE | ${label}`);
      SWSELogger.log('Formula:', roll.formula);
      SWSELogger.log('Total:', roll.total);
      SWSELogger.log('Terms:', roll.terms);
      console.groupEnd();
    }
  }

  /**
   * Log sheet lifecycle events
   * @param {string} sheetType - Type of sheet
   * @param {string} event - Event name (render, getData, activate, etc.)
   * @param {any} data - Event data
   */
  static sheet(sheetType, event, data = null) {
    if (this.isDebugMode()) {
      SWSELogger.log(`SWSE | Sheet ${sheetType} | ${event}`, data || '');
    }
  }

  /**
   * Log drag/drop operations
   * @param {string} operation - 'drag' or 'drop'
   * @param {any} data - Drag/drop data
   */
  static dragDrop(operation, data) {
    if (this.isDebugMode()) {
      SWSELogger.log(`SWSE | ${operation.toUpperCase()}`, data);
    }
  }

  /**
   * Log data model validation
   * @param {string} modelType - Type of model
   * @param {any} errors - Validation errors if any
   */
  static validation(modelType, errors) {
    if (errors) {
      SWSELogger.error(`SWSE | Validation Failed: ${modelType}`, errors);
    } else if (this.isDebugMode()) {
      SWSELogger.log(`SWSE | Validation Passed: ${modelType}`);
    }
  }

  /**
   * Log combat events
   * @param {string} event - Combat event (turn, round, etc.)
   * @param {any} data - Event data
   */
  static combat(event, data) {
    if (this.isDebugMode()) {
      SWSELogger.log(`SWSE | Combat | ${event}`, data);
    }
  }

  /**
   * Log setting changes
   * @param {string} key - Setting key
   * @param {any} oldValue - Old value
   * @param {any} newValue - New value
   */
  static settingChanged(key, oldValue, newValue) {
    if (this.isDebugMode()) {
      SWSELogger.log(`SWSE | Setting Changed: ${key}`, {
        old: oldValue,
        new: newValue
      });
    }
  }
}

// Register debug mode setting
Hooks.once('init', () => {
  game.settings.register('swse', 'debugMode', {
    name: 'Debug Mode',
    hint: 'Enable detailed console logging for debugging',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });
});

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
    return game.settings.get('swse', 'debugMode') ?? false;
  }

  /**
   * Log a debug message (only shows when debug mode is enabled)
   * @param {...any} args - Arguments to log
   */
  static log(...args) {
    if (this.isDebugMode()) {
      console.log('SWSE |', ...args);
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
    console.warn('SWSE |', ...args);
  }

  /**
   * Log an error message (always shows)
   * @param {...any} args - Arguments to log
   */
  static error(...args) {
    console.error('SWSE |', ...args);
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
      if (label) console.log(`SWSE | ${label}`);
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
      console.log('Type:', actor.type);
      console.log('System Data:', actor.system);
      console.log('Items:', actor.items.contents);
      console.log('Effects:', actor.effects.contents);
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
      console.log('Type:', item.type);
      console.log('System Data:', item.system);
      console.log('Actor:', item.actor?.name || 'None');
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
      console.log('Formula:', roll.formula);
      console.log('Total:', roll.total);
      console.log('Terms:', roll.terms);
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
      console.log(`SWSE | Sheet ${sheetType} | ${event}`, data || '');
    }
  }

  /**
   * Log drag/drop operations
   * @param {string} operation - 'drag' or 'drop'
   * @param {any} data - Drag/drop data
   */
  static dragDrop(operation, data) {
    if (this.isDebugMode()) {
      console.log(`SWSE | ${operation.toUpperCase()}`, data);
    }
  }

  /**
   * Log data model validation
   * @param {string} modelType - Type of model
   * @param {any} errors - Validation errors if any
   */
  static validation(modelType, errors) {
    if (errors) {
      console.error(`SWSE | Validation Failed: ${modelType}`, errors);
    } else if (this.isDebugMode()) {
      console.log(`SWSE | Validation Passed: ${modelType}`);
    }
  }

  /**
   * Log combat events
   * @param {string} event - Combat event (turn, round, etc.)
   * @param {any} data - Event data
   */
  static combat(event, data) {
    if (this.isDebugMode()) {
      console.log(`SWSE | Combat | ${event}`, data);
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
      console.log(`SWSE | Setting Changed: ${key}`, {
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

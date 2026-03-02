import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
/**
 * SWSE Notifications Utility
 * Centralized notification system for consistent user feedback
 */

export class SWSENotifications {
  /**
   * Display an error notification
   * @param {string} message - The error message to display
   * @param {Object} options - Additional notification options
   */
  static error(message, options = {}) {
    SWSELogger.error('SWSE | ERROR:', message);
    const prefix = options.noPrefix ? '' : 'SWSE: ';
    ui.notifications.error(`${prefix}${message}`, {
      permanent: false,
      ...options
    });
  }

  /**
   * Display a warning notification
   * @param {string} message - The warning message to display
   * @param {Object} options - Additional notification options
   */
  static warn(message, options = {}) {
    SWSELogger.warn('SWSE | WARNING:', message);
    const prefix = options.noPrefix ? '' : 'SWSE: ';
    ui.notifications.warn(`${prefix}${message}`, {
      permanent: false,
      ...options
    });
  }

  /**
   * Display an info notification
   * @param {string} message - The info message to display
   * @param {Object} options - Additional notification options
   */
  static info(message, options = {}) {
    SWSELogger.log('SWSE | INFO:', message);
    const prefix = options.noPrefix ? '' : '';
    ui.notifications.info(`${prefix}${message}`, {
      permanent: false,
      ...options
    });
  }

  /**
   * Display a success notification
   * @param {string} message - The success message to display
   * @param {Object} options - Additional notification options
   */
  static success(message, options = {}) {
    SWSELogger.log('SWSE | SUCCESS:', message);
    const prefix = options.noPrefix ? '' : '';
    ui.notifications.info(`${prefix}${message}`, {
      permanent: false,
      ...options
    });
  }

  /**
   * Display a notification for item operations
   * @param {string} operation - The operation performed (added, removed, updated)
   * @param {string} itemType - The type of item
   * @param {string} itemName - The name of the item
   */
  static itemOperation(operation, itemType, itemName) {
    const messages = {
      added: `${itemType} "${itemName}" added`,
      removed: `${itemType} "${itemName}" removed`,
      updated: `${itemType} "${itemName}" updated`
    };

    this.info(messages[operation] || `${itemType} ${operation}`);
  }

  /**
   * Display a notification for failed operations with helpful context
   * @param {string} operation - The operation that failed
   * @param {Error} error - The error object
   */
  static operationFailed(operation, error) {
    SWSELogger.error('SWSE | Operation Failed:', operation, error);
    this.error(`Failed to ${operation}. Check console for details.`, { permanent: true });
  }

  /**
   * Display a notification for missing data
   * @param {string} dataType - The type of data that's missing
   */
  static missingData(dataType) {
    this.warn(`Missing ${dataType}. Please check your configuration.`);
  }

  /**
   * Display a notification for invalid input
   * @param {string} fieldName - The field with invalid input
   * @param {string} expectedFormat - Description of expected format
   */
  static invalidInput(fieldName, expectedFormat = '') {
    const message = expectedFormat
      ? `Invalid ${fieldName}. Expected: ${expectedFormat}`
      : `Invalid ${fieldName}`;
    this.error(message);
  }

  /**
   * Display a notification for permission errors
   * @param {string} action - The action that requires permission
   */
  static permissionDenied(action) {
    this.error(`Permission denied: ${action}. Only GMs can perform this action.`);
  }

  /**
   * Display a notification for successful saves
   * @param {string} itemName - What was saved
   */
  static saved(itemName = 'Changes') {
    this.success(`${itemName} saved successfully`);
  }

  /**
   * Display a notification for Roll20-style advantage/disadvantage
   * @param {string} type - 'advantage' or 'disadvantage'
   */
  static rollModifier(type) {
    const icon = type === 'advantage' ? '⬆' : '⬇';
    this.info(`${icon} Rolling with ${type}`);
  }
}

/**
 * Quick access functions for common operations
 */
export function notifyError(message, options) {
  SWSENotifications.error(message, options);
}

export function notifyWarn(message, options) {
  SWSENotifications.warn(message, options);
}

export function notifyInfo(message, options) {
  SWSENotifications.info(message, options);
}

export function notifySuccess(message, options) {
  SWSENotifications.success(message, options);
}

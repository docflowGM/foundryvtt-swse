// scripts/utils/security-utils.js
import { swseLogger } from './logger.js';

/**
 * Security Utilities
 * Provides HTML sanitization and permission checking
 */

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param {string} html - HTML content to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const {
    allowedTags = ['b', 'i', 'u', 'em', 'strong', 'br', 'p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
    allowedAttributes = ['class', 'id', 'style', 'data-tooltip'],
    stripScripts = true,
    stripEvents = true
  } = options;

  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove script tags if stripScripts is true
  if (stripScripts) {
    const scripts = temp.querySelectorAll('script');
    scripts.forEach(script => script.remove());
  }

  // Remove event handler attributes if stripEvents is true
  if (stripEvents) {
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
      // Remove all on* attributes (onclick, onload, etc.)
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });

      // Remove javascript: URLs
      ['href', 'src', 'action'].forEach(attr => {
        const value = el.getAttribute(attr);
        if (value && value.toLowerCase().startsWith('javascript:')) {
          el.removeAttribute(attr);
        }
      });
    });
  }

  // Filter tags and attributes
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove disallowed tags
    if (!allowedTags.includes(el.tagName.toLowerCase())) {
      // Keep the text content but remove the tag
      const textNode = document.createTextNode(el.textContent);
      el.parentNode?.replaceChild(textNode, el);
      return;
    }

    // Remove disallowed attributes
    Array.from(el.attributes).forEach(attr => {
      if (!allowedAttributes.includes(attr.name)) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return temp.innerHTML;
}

/**
 * Sanitizes a string for use in chat messages
 * @param {string} message - Message to sanitize
 * @returns {string} Sanitized message
 */
export function sanitizeChatMessage(message) {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // Allow basic formatting but strip scripts and events
  return sanitizeHTML(message, {
    allowedTags: ['b', 'i', 'u', 'em', 'strong', 'br', 'p', 'span'],
    allowedAttributes: ['class'],
    stripScripts: true,
    stripEvents: true
  });
}

/**
 * Checks if a user has permission to modify an actor
 * @param {Actor} actor - Actor to check
 * @param {User} user - User to check (defaults to current user)
 * @returns {boolean} True if user can modify
 */
export function canUserModifyActor(actor, user = null) {
  if (!actor) {
    swseLogger.warn('canUserModifyActor: actor is required');
    return false;
  }

  const checkUser = user || game.user;

  if (!checkUser) {
    swseLogger.warn('canUserModifyActor: no user found');
    return false;
  }

  // GM can always modify
  if (checkUser.isGM) {
    return true;
  }

  // Check if user owns the actor
  if (actor.isOwner || actor.testUserPermission?.(checkUser, 'OWNER')) {
    return true;
  }

  return false;
}

/**
 * Checks if a user has permission to modify an item
 * @param {Item} item - Item to check
 * @param {User} user - User to check (defaults to current user)
 * @returns {boolean} True if user can modify
 */
export function canUserModifyItem(item, user = null) {
  if (!item) {
    swseLogger.warn('canUserModifyItem: item is required');
    return false;
  }

  const checkUser = user || game.user;

  if (!checkUser) {
    swseLogger.warn('canUserModifyItem: no user found');
    return false;
  }

  // GM can always modify
  if (checkUser.isGM) {
    return true;
  }

  // If item is on an actor, check actor ownership
  if (item.actor) {
    return canUserModifyActor(item.actor, checkUser);
  }

  // Check if user owns the item
  if (item.isOwner || item.testUserPermission?.(checkUser, 'OWNER')) {
    return true;
  }

  return false;
}

/**
 * Validates that a user has permission before executing a function
 * @param {Actor|Item} document - Document to check permissions for
 * @param {Function} func - Function to execute if permission is granted
 * @param {Object} context - Context for error messages
 * @returns {Promise<*>} Result of function or null if permission denied
 */
export async function withPermissionCheck(document, func, context = {}) {
  const docType = document.documentName || document.constructor.name;
  const canModify = docType === 'Actor'
    ? canUserModifyActor(document)
    : canUserModifyItem(document);

  if (!canModify) {
    const message = `Permission denied: You do not have permission to modify this ${docType}`;
    swseLogger.warn(message, context);
    ui.notifications?.error(message);
    return null;
  }

  try {
    return await func();
  } catch (err) {
    swseLogger.error(`withPermissionCheck: function execution failed`, err);
    throw err;
  }
}

/**
 * Validates that only GMs can execute a function
 * @param {Function} func - Function to execute if user is GM
 * @param {Object} context - Context for error messages
 * @returns {Promise<*>} Result of function or null if not GM
 */
export async function withGMCheck(func, context = {}) {
  if (!game.user?.isGM) {
    const message = 'Permission denied: This action requires GM privileges';
    swseLogger.warn(message, context);
    ui.notifications?.error(message);
    return null;
  }

  try {
    return await func();
  } catch (err) {
    swseLogger.error(`withGMCheck: function execution failed`, err);
    throw err;
  }
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHTML(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validates and sanitizes user input
 * @param {string} input - User input to validate
 * @param {Object} options - Validation options
 * @returns {Object} { valid: boolean, sanitized: string, error?: string }
 */
export function validateUserInput(input, options = {}) {
  const {
    maxLength = 1000,
    allowHTML = false,
    required = false,
    pattern = null
  } = options;

  // Check if required
  if (required && (!input || input.trim().length === 0)) {
    return {
      valid: false,
      sanitized: '',
      error: 'This field is required'
    };
  }

  // Check length
  if (input && input.length > maxLength) {
    return {
      valid: false,
      sanitized: input.substring(0, maxLength),
      error: `Input exceeds maximum length of ${maxLength} characters`
    };
  }

  // Sanitize
  let sanitized = input;
  if (allowHTML) {
    sanitized = sanitizeHTML(input);
  } else {
    sanitized = escapeHTML(input);
  }

  // Check pattern
  if (pattern && !pattern.test(sanitized)) {
    return {
      valid: false,
      sanitized,
      error: 'Input does not match required format'
    };
  }

  return {
    valid: true,
    sanitized
  };
}

/**
 * Rendering and Context Preparation for Character Generator
 * Handles render orchestration, scroll preservation, and context building
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Preserve and restore scroll positions during render
 * @param {HTMLElement} element - The app element
 * @param {Array<string>} scrollYSelectors - Selectors to preserve scroll for
 * @returns {Object} Scroll positions to restore
 */
export function captureScrollPositions(element, scrollYSelectors = []) {
  const scrollPositions = {};
  if (element instanceof HTMLElement) {
    for (const selector of scrollYSelectors || []) {
      const el = element.querySelector(selector);
      if (el) {
        scrollPositions[selector] = el.scrollTop;
      }
    }
  }
  return scrollPositions;
}

/**
 * Restore captured scroll positions
 * @param {HTMLElement} element - The app element
 * @param {Object} scrollPositions - Positions to restore
 */
export function restoreScrollPositions(element, scrollPositions = {}) {
  if (element instanceof HTMLElement) {
    for (const [selector, scrollTop] of Object.entries(scrollPositions)) {
      const el = element.querySelector(selector);
      if (el) {
        el.scrollTop = scrollTop;
      }
    }
  }
}

/**
 * Build the context for rendering
 * @param {Object} characterData - The character data
 * @param {string} currentStep - Current step key
 * @param {boolean} isDroid - Whether character is a droid
 * @param {Array<string>} steps - Available steps
 * @returns {Object} Base context object
 */
export function buildBaseContext(characterData, currentStep, isDroid, steps) {
  return {
    characterData,
    currentStep,
    isDroid,
    steps,
    isFirstStep: steps.indexOf(currentStep) === 0,
    isLastStep: steps.indexOf(currentStep) === steps.length - 1,
    stepIndex: steps.indexOf(currentStep),
    totalSteps: steps.length
  };
}

/**
 * Enhance context with step-specific data
 * @param {Object} context - The base context
 * @param {string} currentStep - Current step key
 * @param {Object} specializations - Step-specific context builders
 * @returns {Object} Enhanced context
 */
export function enhanceContextForStep(context, currentStep, specializations = {}) {
  if (specializations[currentStep]) {
    return specializations[currentStep](context);
  }
  return context;
}

/**
 * Activate Foundry tooltips for the rendered content
 * @param {HTMLElement} root - Root element
 */
export function activateFoundryTooltips(root) {
  if (game.tooltip) {
    game.tooltip.activate(root, { selector: '[data-tooltip]' });
  }
}

/**
 * Check if element is a valid HTML element
 * @param {*} el - The element to check
 * @returns {boolean} True if valid HTML element
 */
export function isValidElement(el) {
  return el instanceof HTMLElement;
}

/**
 * Log render metadata
 * @param {string} label - Label for the log
 * @param {Object} metadata - Metadata to log
 */
export function logRenderMetadata(label, metadata) {
  SWSELogger.log(`[CharacterGenerator._onRender] ${label}:`, metadata);
}

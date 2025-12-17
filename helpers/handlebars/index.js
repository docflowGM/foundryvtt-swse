import { swseLogger } from '../../scripts/utils/logger.js';
import { skillHelpers } from './skill-helpers.js';
import { stringHelpers } from './string-helpers.js';
import { mathHelpers } from './math-helpers.js';
import { comparisonHelpers } from './comparison-helpers.js';
import { arrayHelpers } from './array-helpers.js';
import { swseHelpers } from './swse-helpers.js';
import { utilityHelpers } from './utility-helpers.js';

/**
 * Safely register a group of Handlebars helpers.
 *
 * @param {Record<string, Function>} group - Map of helper name to function.
 * @param {string} groupName - Friendly group name for logging.
 */
function registerHelperGroup(group, groupName) {
  if (!group) {
    swseLogger.warn(`SWSE | Helper group '${groupName}' is undefined`);
    return;
  }

  let registered = 0;
  let skipped = 0;

  for (const [name, fn] of Object.entries(group)) {
    if (typeof fn !== 'function') {
      swseLogger.warn(`SWSE | Helper '${groupName}.${name}' is not a function, skipping`);
      skipped++;
      continue;
    }

    if (Handlebars.helpers[name]) {
      swseLogger.warn(`SWSE | Helper '${name}' already registered, skipping`);
      skipped++;
      continue;
    }

    // Foundry/Handlebars will internally bind the helper as needed.
    Handlebars.registerHelper(name, fn);
    registered++;
  }

  swseLogger.log(`SWSE | Registered ${registered} helpers from ${groupName}${skipped ? `, skipped ${skipped}` : ''}`);
}

/**
 * Register all Handlebars helpers for the SWSE system.
 * Should be called once during system initialization.
 */
export function registerHandlebarsHelpers() {
  swseLogger.log('SWSE | Registering Handlebars helpers...');

  registerHelperGroup(skillHelpers, 'skillHelpers');
  registerHelperGroup(stringHelpers, 'stringHelpers');
  registerHelperGroup(mathHelpers, 'mathHelpers');
  registerHelperGroup(comparisonHelpers, 'comparisonHelpers');
  registerHelperGroup(arrayHelpers, 'arrayHelpers');
  registerHelperGroup(swseHelpers, 'swseHelpers');
  registerHelperGroup(utilityHelpers, 'utilityHelpers');
}

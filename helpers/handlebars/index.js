import { swseLogger } from '../../scripts/utils/logger.js';
import { skillHelpers } from './skill-helpers.js';
import { stringHelpers } from './string-helpers.js';
import { mathHelpers } from './math-helpers.js';
import { comparisonHelpers } from './comparison-helpers.js';
import { arrayHelpers } from './array-helpers.js';
import { swseHelpers } from './swse-helpers.js';
import { utilityHelpers } from './utility-helpers.js';

/**
 * Register all Handlebars helpers for SWSE system
 * Called ONCE during system initialization
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper(skillHelpers);
  swseLogger.log("SWSE | Registering Handlebars helpers...");

  const allHelpers = {
    ...stringHelpers,
    ...mathHelpers,
    ...comparisonHelpers,
    ...arrayHelpers,
    ...swseHelpers,
    ...utilityHelpers};

  let registered = 0;
  let skipped = 0;

  for (const [name, fn] of Object.entries(allHelpers)) {
    if (typeof fn !== 'function') {
      swseLogger.warn(`SWSE | Helper '${name}' is not a function, skipping`);
      skipped++;
      continue;
    }

    if (Handlebars.helpers[name]) {
      swseLogger.warn(`SWSE | Helper '${name}' already registered, skipping`);
      skipped++;
      continue;
    }

    Handlebars.registerHelper(name, fn);
    registered++;
  }

  swseLogger.log(`SWSE | Registered ${registered} helpers${skipped ? `, skipped ${skipped}` : ''}`);
}

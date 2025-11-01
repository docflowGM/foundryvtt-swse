/**
 * Consolidated helper registration - SINGLE REGISTRATION POINT
 */
import { stringHelpers } from './string-helpers.js';
import { mathHelpers } from './math-helpers.js';
import { comparisonHelpers } from './comparison-helpers.js';
import { arrayHelpers } from './array-helpers.js';
import { utilityHelpers } from './utility-helpers.js';

export function registerHandlebarsHelpers() {
  console.log('SWSE | Registering Handlebars helpers...');
  
  const allHelpers = {
    ...stringHelpers,
    ...mathHelpers,
    ...comparisonHelpers,
    ...arrayHelpers,
    ...utilityHelpers
  };
  
  let registered = 0;
  for (const [name, fn] of Object.entries(allHelpers)) {
    if (Handlebars.helpers[name]) {
      console.warn(`SWSE | Helper '${name}' already registered, skipping`);
      continue;
    }
    if (typeof fn !== 'function') {
      console.error(`SWSE | Helper '${name}' is not a function, skipping`);
      continue;
    }
    Handlebars.registerHelper(name, fn);
    registered++;
  }
  
  console.log(`SWSE | Registered ${registered} Handlebars helpers`);
}

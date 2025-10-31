import { stringHelpers } from './string-helpers.js';
import { mathHelpers } from './math-helpers.js';
import { comparisonHelpers } from './comparison-helpers.js';
import { arrayHelpers } from './array-helpers.js';
import { swseHelpers } from './swse-helpers.js';

export function registerHandlebarsHelpers() {
  const categories = {
    ...stringHelpers,
    ...mathHelpers,
    ...comparisonHelpers,
    ...arrayHelpers,
    ...swseHelpers
  };
  
  Object.entries(categories).forEach(([name, fn]) => {
    Handlebars.registerHelper(name, fn);
  });
  
  console.log("SWSE | Handlebars helpers registered");
}

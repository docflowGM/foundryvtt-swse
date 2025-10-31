export const arrayHelpers = {
  filterBy: (array, property, value) => {
    if (!Array.isArray(array)) return [];
    return array.filter(item => 
      foundry.utils.getProperty(item, property) === value
    );
  },
  
  sortBy: (array, property, descending = false) => {
    if (!Array.isArray(array)) return [];
    const sorted = [...array].sort((a, b) => {
      const aVal = foundry.utils.getProperty(a, property);
      const bVal = foundry.utils.getProperty(b, property);
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
    return descending ? sorted.reverse() : sorted;
  },
  
  length: (array) => Array.isArray(array) ? array.length : 0
};

export const swseHelpers = {
  numberFormat: function(value, options) {
    const num = parseFloat(value) || 0;
    const decimals = options?.hash?.decimals ?? 0;
    const sign = options?.hash?.sign ?? false;
    
    let result = num.toFixed(decimals);
    if (sign && num >= 0) result = '+' + result;
    return result;
  },
  
  dice: function(formula, options) {
    if (!formula) return '';
    const sign = options?.hash?.sign ?? false;
    const str = String(formula);
    
    if (sign && !str.startsWith('-') && !str.startsWith('+')) {
      return '+' + str;
    }
    return str;
  },
  
  classes: function(...classes) {
    classes = classes.slice(0, -1);
    return classes.filter(Boolean).join(' ');
  },
  
  times: function(n, block) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += block.fn({...this, index: i, number: i + 1});
    }
    return result;
  },
  
  getProperty: function(obj, path) {
    if (!obj || !path) return undefined;
    return foundry.utils.getProperty(obj, path);
  }
};

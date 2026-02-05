/**
 * Icon Handlebars Helpers
 * Provide template access to SWSE icon constants.
 */

import { getIconClass, createIcon } from '../../scripts/utils/icon-constants.js';

export const iconHelpers = {
  /**
   * Get the class string for an icon.
   *
   * Usage:
   *   <i class="{{getIconClass 'info'}}"></i>
   */
  getIconClass: function(iconKey) {
    if (typeof iconKey !== 'string') {
      console.error('[SWSE Icons] getIconClass received non-string:', {
        received: iconKey,
        type: typeof iconKey,
        context: this,
      });
      return '';
    }
    return getIconClass(iconKey);
  },

  /**
   * Render an icon inline (escaping disabled).
   *
   * Usage:
   *   {{{icon 'warning'}}}
   */
  icon: function(iconKey) {
    if (typeof iconKey !== 'string') {
      console.error('[SWSE Icons] icon helper received non-string:', {
        received: iconKey,
        type: typeof iconKey,
        context: this,
      });
      return '';
    }
    const el = createIcon(iconKey);
    return el.outerHTML;
  }
};

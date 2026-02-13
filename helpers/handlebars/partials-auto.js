import { swseLogger } from '../../scripts/utils/logger.js';

export async function registerSWSEPartials() {
  const partialFiles = [];

  // Recursively discover all .hbs files under /partials/ directories
  async function scanForPartials(dir) {
    try {
      const response = await fetch(dir);
      if (!response.ok) return;

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract links from directory listing
      for (const link of doc.querySelectorAll('a')) {
        const href = link.getAttribute('href');
        if (!href || href === '../') continue;

        const fullPath = dir.endsWith('/') ? dir + href : dir + '/' + href;

        if (href.endsWith('.hbs')) {
          partialFiles.push(fullPath);
        } else if (href.endsWith('/')) {
          // Recursively scan subdirectories
          await scanForPartials(fullPath);
        }
      }
    } catch (error) {
      // Silently skip unreadable directories
    }
  }

  // Start scanning from templates root
  await scanForPartials('systems/foundryvtt-swse/templates');

  // Filter to only files under /partials/ directories
  const partialsToRegister = partialFiles.filter(path => path.includes('/partials/'));

  swseLogger.log(`SWSE | Found ${partialsToRegister.length} partial files to register`);

  for (const path of partialsToRegister) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        swseLogger.warn(`SWSE | Failed to fetch partial: ${path} (${response.status})`);
        continue;
      }
      const html = await response.text();
      // Register with full path as the partial name
      Handlebars.registerPartial(path, html);
      swseLogger.log(`SWSE | Registered partial: ${path}`);
    } catch (error) {
      swseLogger.error(`SWSE | Error registering partial ${path}:`, error);
    }
  }
}

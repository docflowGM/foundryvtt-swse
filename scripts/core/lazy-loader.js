/**
import { SWSELogger } from '../utils/logger.js';
 * Lazy Loading Manager
 * Defers loading of non-critical resources until needed
 */

import { lazy } from '../utils/performance-utils.js';

export class LazyLoader {
  constructor() {
    this._templates = new Map();
    this._modules = new Map();
    this._images = new Set();
    this._loadingPromises = new Map();
  }

  /**
   * Register a template for lazy loading
   * @param {string} name - Template identifier
   * @param {string} path - Template path
   */
  registerTemplate(name, path) {
    if (!this._templates.has(name)) {
      this._templates.set(name, {
        path,
        loaded: false,
        loader: lazy(async () => {
          await this._loadTemplate(path);
          return true;
        })
      });
    }
  }

  /**
   * Load a template on demand
   * @param {string} name - Template identifier
   * @returns {Promise<boolean>}
   */
  async loadTemplate(name) {
    const template = this._templates.get(name);
    if (!template) {
      SWSELogger.warn(`SWSE | Template not registered: ${name}`);
      return false;
    }

    if (template.loaded) {
      return true;
    }

    try {
      await template.loader();
      template.loaded = true;
      return true;
    } catch (error) {
      SWSELogger.error(`SWSE | Failed to load template ${name}:`, error);
      return false;
    }
  }

  /**
   * Load multiple templates in parallel
   * @param {Array<string>} names - Template identifiers
   * @returns {Promise<boolean>}
   */
  async loadTemplates(names) {
    const promises = names.map(name => this.loadTemplate(name));
    const results = await Promise.all(promises);
    return results.every(r => r);
  }

  /**
   * Internal template loader
   * @private
   */
  async _loadTemplate(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${path}`);
    }

    const html = await response.text();
    const template = Handlebars.compile(html);
    Handlebars.registerPartial(path, template);
  }

  /**
   * Register a module for lazy loading
   * @param {string} name - Module identifier
   * @param {Function} loader - Async loader function
   */
  registerModule(name, loader) {
    if (!this._modules.has(name)) {
      this._modules.set(name, {
        loaded: false,
        loader: lazy(loader)
      });
    }
  }

  /**
   * Load a module on demand
   * @param {string} name - Module identifier
   * @returns {Promise<*>} Module exports
   */
  async loadModule(name) {
    const module = this._modules.get(name);
    if (!module) {
      SWSELogger.warn(`SWSE | Module not registered: ${name}`);
      return null;
    }

    if (module.loaded) {
      return module.instance;
    }

    try {
      module.instance = await module.loader();
      module.loaded = true;
      return module.instance;
    } catch (error) {
      SWSELogger.error(`SWSE | Failed to load module ${name}:`, error);
      return null;
    }
  }

  /**
   * Setup lazy image loading
   * Uses Intersection Observer to load images when visible
   */
  setupLazyImages() {
    if (!('IntersectionObserver' in window)) {
      SWSELogger.warn('SWSE | IntersectionObserver not supported, images will load immediately');
      return;
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.lazySrc;

          if (src) {
            img.src = src;
            img.removeAttribute('data-lazy-src');
            observer.unobserve(img);
            this._images.delete(img);
          }
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before visible
    });

    // Observe all lazy images
    document.querySelectorAll('img[data-lazy-src]').forEach(img => {
      imageObserver.observe(img);
      this._images.add(img);
    });

    // Store observer for cleanup
    this._imageObserver = imageObserver;
  }

  /**
   * Mark an image for lazy loading
   * @param {HTMLImageElement} img - Image element
   * @param {string} src - Image source
   */
  markImageLazy(img, src) {
    img.dataset.lazySrc = src;
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1px transparent gif

    if (this._imageObserver) {
      this._imageObserver.observe(img);
      this._images.add(img);
    } else {
      // Fallback: load immediately
      img.src = src;
    }
  }

  /**
   * Create lazy tab loader for sheet tabs
   * @param {jQuery} html - Sheet HTML
   * @param {Object} callbacks - Tab render callbacks
   */
  setupLazyTabs(html, callbacks = {}) {
    const tabs = html.find('.sheet-tabs a[data-tab]');
    const loadedTabs = new Set(['summary']); // Summary always loads

    tabs.on('click', async (event) => {
      const tabName = event.currentTarget.dataset.tab;

      if (!loadedTabs.has(tabName)) {
        const tabContent = html.find(`.tab[data-tab="${tabName}"]`);

        // Show loading indicator
        if (tabContent.length > 0) {
          const originalContent = tabContent.html();
          tabContent.html('<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>');

          try {
            // Execute tab-specific callback
            if (callbacks[tabName]) {
              await callbacks[tabName](tabContent);
            }

            // Load tab-specific templates if needed
            await this.loadTemplate(`tab-${tabName}`);

            loadedTabs.add(tabName);
          } catch (error) {
            SWSELogger.error(`SWSE | Failed to load tab ${tabName}:`, error);
            tabContent.html(originalContent);
          }
        }
      }
    });

    return loadedTabs;
  }

  /**
   * Defer function execution until idle
   * @param {Function} func - Function to defer
   * @param {Object} options - Options
   * @returns {Promise}
   */
  async deferUntilIdle(func, options = {}) {
    const { timeout = 2000 } = options;

    if ('requestIdleCallback' in window) {
      return new Promise((resolve, reject) => {
        requestIdleCallback(async () => {
          try {
            const result = await func();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, { timeout });
      });
    } else {
      // Fallback: use setTimeout
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const result = await func();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, 0);
      });
    }
  }

  /**
   * Preload critical resources
   * @param {Array<string>} critical - Critical template names
   */
  async preloadCritical(critical = []) {
    const promises = critical.map(name => this.loadTemplate(name));
    await Promise.all(promises);
  }

  /**
   * Get loading statistics
   */
  getStats() {
    const templateStats = {
      total: this._templates.size,
      loaded: Array.from(this._templates.values()).filter(t => t.loaded).length
    };

    const moduleStats = {
      total: this._modules.size,
      loaded: Array.from(this._modules.values()).filter(m => m.loaded).length
    };

    return {
      templates: templateStats,
      modules: moduleStats,
      lazyImages: this._images.size
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this._imageObserver) {
      this._imageObserver.disconnect();
    }
    this._images.clear();
    this._loadingPromises.clear();
  }
}

// Global lazy loader instance
export const lazyLoader = new LazyLoader();

/**
 * Decorator for lazy-loaded methods
 * @param {string} moduleName - Module to load
 */
export function lazyLoad(moduleName) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      // Load module if not loaded
      if (window.SWSE?.lazyLoader) {
        await window.SWSE.lazyLoader.loadModule(moduleName);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

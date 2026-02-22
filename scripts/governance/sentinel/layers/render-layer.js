/**
 * Render Layer - SWSE Scoped Application Validator
 * Validates only SWSE-owned AppV2 windows.
 */

import { Sentinel } from './sentinel-core.js';

export const RenderLayer = {

  init() {
    this.attachApplicationV2Hook();
    this.attachDocumentSheetV2Hook();
  },

  attachApplicationV2Hook() {
    Hooks.on('renderApplicationV2', (app) => {

      // Only validate SWSE classes
      if (!app?.constructor?.name?.startsWith("SWSE")) return;

      const el = app.element;
      if (!el || !el.classList.contains('window-app')) return;

      // Wait two frames for layout stabilization
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {

          if (!document.body.contains(el)) return;

          const rect = el.getBoundingClientRect();

          if (rect.width === 0 || rect.height === 0) {
            Sentinel.report('render', Sentinel.SEVERITY.ERROR,
              'SWSE ApplicationV2 rendered with zero dimensions',
              {
                appName: app.constructor.name,
                width: rect.width,
                height: rect.height
              }
            );
          }

          if (!el.querySelector('.window-content')) {
            Sentinel.report('render', Sentinel.SEVERITY.WARN,
              'SWSE ApplicationV2 missing window-content',
              { appName: app.constructor.name }
            );
          }

        });
      });
    });
  },

  attachDocumentSheetV2Hook() {
    Hooks.on('renderDocumentSheetV2', (sheet) => {

      if (!sheet?.constructor?.name?.startsWith("SWSE")) return;

      const el = sheet.element;
      if (!el) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {

          if (!document.body.contains(el)) return;

          const rect = el.getBoundingClientRect();

          if (rect.width === 0 || rect.height === 0) {
            Sentinel.report('render', Sentinel.SEVERITY.ERROR,
              'SWSE DocumentSheetV2 rendered with zero dimensions',
              {
                sheetName: sheet.constructor.name,
                width: rect.width,
                height: rect.height
              }
            );
          }

        });
      });
    });
  }

};
/**
 * Phase 3 Structural Enforcement Layer
 * Runtime safeguards for ApplicationV2 contract violations and structural CSS contamination
 *
 * @module v2-render-guard
 * @description
 * Adds defensive hardening without altering engine behavior:
 * - ApplicationV2 render contract assertions
 * - Window structural integrity checks
 * - Stacking context detection (canvas safety)
 * - Flexbox collapse protection
 * - Z-index safety scanning
 */

import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * DIAGNOSTIC MODE: Toggle Phase 3 enforcement
 * Set to false to disable the enforcement layer for diagnostic isolation
 * This helps determine if enforcement is mutating sheet instantiation
 */
const ENABLE_PHASE3_ENFORCEMENT = false;

/**
 * Initialize Phase 3 structural enforcement
 * Registers all runtime guards and diagnostic hooks
 */
export async function initializeV2RenderGuard() {
    if (!ENABLE_PHASE3_ENFORCEMENT) {
        SWSELogger.log('Phase 3 Structural Enforcement Layer DISABLED (diagnostic mode)');
        return;
    }

    SWSELogger.log('Initializing Phase 3 Structural Enforcement Layer');

    registerRenderContractAssertions();
    registerWindowStructuralChecks();
    registerStackingContextDetector();
    registerFlexCollapseGuard();
    registerZIndexSafetyScanner();

    SWSELogger.log('Phase 3 enforcement guards activated');
}

/**
 * 1️⃣ ApplicationV2 Render Contract Assertion
 * Validates that _renderHTML returns HTMLElement and render hook receives proper structure
 */
function registerRenderContractAssertions() {
    // Hook on renderApplicationV2 to validate render contract
    HooksRegistry.register('renderApplicationV2', (app, html, context) => {
        if (!(html instanceof HTMLElement)) {
            SWSELogger.warn(
                'SWSE V2 CONTRACT VIOLATION: renderApplicationV2 did not receive HTMLElement',
                {
                    app: app?.constructor?.name,
                    htmlType: html?.constructor?.name,
                    htmlValue: typeof html
                }
            );
        }
    }, {
        id: 'v2-render-contract-assert',
        priority: 1000, // Run early to catch violations
        description: 'Validate ApplicationV2 render contract compliance',
        category: 'diagnostics'
    });

    HooksRegistry.register('renderDocumentSheetV2', (app, html, context) => {
        if (!(html instanceof HTMLElement)) {
            SWSELogger.warn(
                'SWSE V2 CONTRACT VIOLATION: renderDocumentSheetV2 did not receive HTMLElement',
                {
                    app: app?.constructor?.name,
                    htmlType: html?.constructor?.name,
                    htmlValue: typeof html
                }
            );
        }
    }, {
        id: 'v2-document-sheet-contract-assert',
        priority: 1000,
        description: 'Validate DocumentSheetV2 render contract compliance',
        category: 'diagnostics'
    });
}

/**
 * 2️⃣ Window Structural Integrity Check
 * Validates on ready that critical window elements maintain expected CSS properties
 */
function registerWindowStructuralChecks() {
    Hooks.once('ready', () => {
        const forbiddenChecks = [
            {
                selector: '.window-content',
                property: 'display',
                forbidden: ['inline', 'inline-block', 'none'],
                warn: 'window-content display modified from expected block/flex'
            },
            {
                selector: '.window-header',
                property: 'overflow',
                forbidden: ['hidden'],
                warn: 'header overflow:hidden may hide overflow content'
            },
            {
                selector: '.window-app',
                property: 'position',
                forbidden: ['static'],
                warn: 'window-app position not absolute/fixed - may break positioning'
            }
        ];

        forbiddenChecks.forEach(check => {
            const elements = document.querySelectorAll(check.selector);
            elements.forEach(el => {
                const style = getComputedStyle(el);
                const value = style[check.property];

                if (check.forbidden.includes(value)) {
                    SWSELogger.warn(`SWSE Structural Warning: ${check.warn}`, {
                        selector: check.selector,
                        property: check.property,
                        value,
                        element: el
                    });
                }
            });
        });
    });
}

/**
 * 3️⃣ Stacking Context Detector (Canvas Safety)
 * Detects transform/filter on high-level containers that could create stacking contexts
 * and cause canvas controls to disappear
 */
function registerStackingContextDetector() {
    Hooks.once('canvasReady', () => {
        const criticalNodes = [
            { node: document.body, name: 'document.body' },
            { node: document.getElementById('ui'), name: '#ui' },
            { node: document.getElementById('canvas'), name: '#canvas' }
        ];

        criticalNodes.forEach(({ node, name }) => {
            if (!node) return;

            const style = getComputedStyle(node);

            // Check for transform
            if (style.transform !== 'none') {
                SWSELogger.error(
                    `SWSE CRITICAL: transform detected on ${name} - creates stacking context`,
                    {
                        element: name,
                        transform: style.transform,
                        element_ref: node
                    }
                );
            }

            // Check for filter
            if (style.filter !== 'none') {
                SWSELogger.error(
                    `SWSE CRITICAL: filter detected on ${name} - creates stacking context`,
                    {
                        element: name,
                        filter: style.filter,
                        element_ref: node
                    }
                );
            }

            // Check for will-change with stacking properties
            if (style.willChange !== 'auto' && ['transform', 'filter', 'opacity'].some(prop => style.willChange.includes(prop))) {
                SWSELogger.warn(
                    `SWSE Warning: will-change with stacking property on ${name}`,
                    {
                        element: name,
                        willChange: style.willChange
                    }
                );
            }
        });
    });
}

/**
 * 4️⃣ Flex Collapse Runtime Guard
 * After ApplicationV2 render, detect flexbox containers missing min-height: 0
 * which can cause flex children to collapse
 */
function registerFlexCollapseGuard() {
    HooksRegistry.register('renderApplicationV2', (app, html, context) => {
        if (!(html instanceof HTMLElement)) return;

        const scrollRegions = html.querySelectorAll('[data-scroll], .scroll-region, [style*="overflow"]');

        scrollRegions.forEach(region => {
            const parent = region.parentElement;
            if (!parent) return;

            const parentStyle = getComputedStyle(parent);
            const isFlexContainer = parentStyle.display === 'flex' || parentStyle.display === 'inline-flex';

            if (isFlexContainer) {
                // In flex containers, min-height should be 0 to prevent collapse
                if (parentStyle.minHeight === 'auto' || parentStyle.minHeight === '') {
                    SWSELogger.warn(
                        'SWSE Flex Warning: flex parent missing min-height: 0',
                        {
                            app: app.constructor.name,
                            parent_tag: parent.tagName,
                            parent_class: parent.className,
                            flexDirection: parentStyle.flexDirection,
                            minHeight: parentStyle.minHeight
                        }
                    );
                }
            }
        });
    }, {
        id: 'v2-flex-collapse-guard',
        priority: 500, // After render but before further processing
        description: 'Detect flexbox collapse risks in rendered applications',
        category: 'diagnostics'
    });
}

/**
 * 5️⃣ Z-Index Safety Scanner
 * On ready, scan for excessive z-index values that indicate potential regressions
 */
function registerZIndexSafetyScanner() {
    Hooks.once('ready', () => {
        // Scan with a reasonable delay to allow UI to fully render
        setTimeout(() => {
            const allElements = document.querySelectorAll('*');
            const excessiveZIndexes = [];

            allElements.forEach(el => {
                const zIndex = getComputedStyle(el).zIndex;

                // Check for suspicious z-index values
                if (zIndex !== 'auto' && !isNaN(parseInt(zIndex))) {
                    const z = parseInt(zIndex);

                    if (z > 2000) {
                        excessiveZIndexes.push({
                            element: el,
                            zIndex: z,
                            tag: el.tagName,
                            class: el.className,
                            id: el.id
                        });
                    }
                }
            });

            if (excessiveZIndexes.length > 0) {
                SWSELogger.warn(
                    `SWSE Z-Index Warning: ${excessiveZIndexes.length} element(s) with z-index > 2000 detected`,
                    {
                        count: excessiveZIndexes.length,
                        elements: excessiveZIndexes.map(e => ({
                            tag: e.tag,
                            id: e.id || 'none',
                            class: e.class || 'none',
                            zIndex: e.zIndex
                        }))
                    }
                );
            }
        }, 500);
    });
}

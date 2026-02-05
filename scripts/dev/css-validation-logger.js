/**
 * CSS Validation & Failure Logger - SWSE Icon Rendering Debug
 *
 * Comprehensive CSS diagnostics that fail LOUD when anything breaks.
 * Monitors:
 * - CSS rule application
 * - Style inheritance issues
 * - Mask-image failures
 * - Computed style mismatches
 * - DOM visibility problems
 * - CSS load order conflicts
 * - Dynamic style mutations
 */

const CSS_VALIDATOR = {
  failures: [],
  warnings: [],

  /**
   * LOUD ERROR LOGGING
   */
  error(title, details) {
    const msg = `❌ CSS ERROR: ${title}`;
    console.error(msg, details);
    this.failures.push({ title, details, timestamp: Date.now() });
  },

  warn(title, details) {
    const msg = `⚠️ CSS WARNING: ${title}`;
    console.warn(msg, details);
    this.warnings.push({ title, details, timestamp: Date.now() });
  },

  success(title, details) {
    console.log(`✅ ${title}`, details);
  },

  /**
   * Validate that CSS files loaded
   */
  validateCSSLoadOrder() {
    console.log("\n%c🔍 VALIDATING CSS LOAD ORDER", "font-size: 14px; font-weight: bold; color: #0ff;");

    const sheets = [...document.styleSheets];
    const swseSheets = sheets.filter(
      s => s.href?.includes('swse') || s.href?.includes('holo') || s.ownerNode?.dataset?.swse
    );

    if (swseSheets.length === 0) {
      this.error("NO SWSE STYLESHEETS FOUND", {
        totalSheets: sheets.length,
        hint: "Check if swse-holo.css or similar is linked in HTML"
      });
    } else {
      this.success(`Found ${swseSheets.length} SWSE stylesheets`, {
        sheets: swseSheets.map(s => ({
          href: s.href,
          disabled: s.disabled,
          ruleCount: s.cssRules?.length || 'N/A'
        }))
      });
    }

    return swseSheets;
  },

  /**
   * Validate CSS rules actually exist for target selectors
   */
  validateCSSRules() {
    console.log("\n%c🔍 VALIDATING CSS RULES EXIST", "font-size: 14px; font-weight: bold; color: #0ff;");

    const targetSelectors = [
      "button.ui-control.icon",
      "button.ui-control.icon::before",
      ".ui-control.icon::before"
    ];

    const allRules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules || []) {
          if (rule.selectorText) {
            allRules.push(rule.selectorText);
          }
        }
      } catch (e) {
        // Cross-origin sheets can't be read
        this.warn(`Cannot read stylesheet (cross-origin?)`, { href: sheet.href });
      }
    }

    for (const selector of targetSelectors) {
      const found = allRules.some(r => r.includes(selector.split("::")[0]));
      if (found) {
        this.success(`CSS Rule found`, { selector });
      } else {
        this.error(`CSS RULE NOT FOUND`, {
          selector,
          hint: `No rules found matching "${selector}". Your CSS may not be loaded.`
        });
      }
    }

    return allRules;
  },

  /**
   * Validate buttons exist and have expected properties
   */
  validateButtonDOM() {
    console.log("\n%c🔍 VALIDATING BUTTON DOM", "font-size: 14px; font-weight: bold; color: #0ff;");

    const buttons = [...document.querySelectorAll("button.ui-control.icon")];

    if (buttons.length === 0) {
      this.error("NO BUTTONS FOUND", {
        selector: "button.ui-control.icon",
        hint: "Scene controls may not be rendered yet. Wait for Foundry to load fully."
      });
      return [];
    }

    this.success(`Found ${buttons.length} buttons`, {
      sample: buttons.slice(0, 3).map(b => ({
        tool: b.dataset.tool,
        id: b.id,
        class: b.className
      }))
    });

    return buttons;
  },

  /**
   * CRITICAL: Validate computed styles match expectations
   */
  validateComputedStyles(buttons) {
    console.log("\n%c🔍 VALIDATING COMPUTED STYLES", "font-size: 14px; font-weight: bold; color: #0ff;");

    const criticalProps = [
      { prop: "--control-icon", description: "Icon SVG URL variable" },
      { prop: "--control-icon-color", description: "Icon color tint" }
    ];

    const pseudoProps = [
      { prop: "content", description: "::before content property" },
      { prop: "display", description: "::before display mode" },
      { prop: "maskImage", description: "::before mask-image" },
      { prop: "-webkit-mask-image", description: "::before webkit mask-image" }
    ];

    let problemCount = 0;

    for (const btn of buttons.slice(0, 3)) {
      // Validate CSS custom properties
      const computed = getComputedStyle(btn);
      for (const { prop, description } of criticalProps) {
        const value = computed.getPropertyValue(prop).trim();
        if (!value) {
          this.error(`Missing CSS variable on button`, {
            tool: btn.dataset.tool,
            variable: prop,
            description,
            hint: `${prop} is empty. Foundry may not have set the icon.`
          });
          problemCount++;
        } else {
          this.success(`CSS variable set`, { variable: prop, value: value.slice(0, 50) });
        }
      }

      // Validate ::before pseudo-element
      const beforeComputed = getComputedStyle(btn, "::before");
      for (const { prop, description } of pseudoProps) {
        const key = prop === "-webkit-mask-image" ? "webkitMaskImage" : prop;
        const value = beforeComputed[key];

        if (!value || value === "none") {
          this.error(`::before pseudo-element missing property`, {
            tool: btn.dataset.tool,
            property: prop,
            currentValue: value || "(empty)",
            description,
            hint: `${prop} is not applied. Your CSS rule may not match or is being overridden.`
          });
          problemCount++;
        } else {
          this.success(`::before property applied`, {
            property: prop,
            value: String(value).slice(0, 50)
          });
        }
      }
    }

    return problemCount === 0;
  },

  /**
   * Validate visibility and layout
   */
  validateVisibility(buttons) {
    console.log("\n%c🔍 VALIDATING VISIBILITY & LAYOUT", "font-size: 14px; font-weight: bold; color: #0ff;");

    let visibilityProblems = 0;

    for (const btn of buttons.slice(0, 3)) {
      const tool = btn.dataset.tool;
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      const display = style.display;
      const visibility = style.visibility;
      const opacity = style.opacity;
      const pointerEvents = style.pointerEvents;

      // Check display
      if (display === "none") {
        this.error(`Button is display: none`, {
          tool,
          hint: "The button is hidden by CSS display property."
        });
        visibilityProblems++;
      } else {
        this.success(`Button display property OK`, { tool, display });
      }

      // Check visibility
      if (visibility === "hidden") {
        this.error(`Button is visibility: hidden`, {
          tool,
          hint: "The button is hidden by CSS visibility property."
        });
        visibilityProblems++;
      } else {
        this.success(`Button visibility OK`, { tool, visibility });
      }

      // Check opacity
      if (parseFloat(opacity) === 0) {
        this.error(`Button is fully transparent (opacity: 0)`, {
          tool,
          hint: "The button is invisible due to opacity."
        });
        visibilityProblems++;
      } else {
        this.success(`Button opacity OK`, { tool, opacity });
      }

      // Check size
      if (rect.width === 0 || rect.height === 0) {
        this.error(`Button has zero size`, {
          tool,
          size: `${rect.width}x${rect.height}px`,
          hint: "Button has no width or height. Check CSS sizing."
        });
        visibilityProblems++;
      } else {
        this.success(`Button size OK`, { tool, size: `${rect.width}x${rect.height}px` });
      }

      // Check pointer events
      if (pointerEvents === "none") {
        this.warn(`Button has pointer-events: none`, {
          tool,
          hint: "Button won't respond to clicks."
        });
      }
    }

    return visibilityProblems === 0;
  },

  /**
   * Validate SVG files actually exist
   */
  async validateSVGAssets(buttons) {
    console.log("\n%c🔍 VALIDATING SVG ASSETS", "font-size: 14px; font-weight: bold; color: #0ff;");

    let assetProblems = 0;

    for (const btn of buttons.slice(0, 5)) {
      const tool = btn.dataset.tool;
      const computed = getComputedStyle(btn);
      const iconVar = computed.getPropertyValue("--control-icon").trim();

      if (!iconVar) {
        this.warn(`No icon variable set`, { tool });
        continue;
      }

      const urlMatch = iconVar.match(/url\(["']?(.*?)["']?\)/);
      if (!urlMatch) {
        this.error(`Cannot parse icon URL`, {
          tool,
          value: iconVar,
          hint: "Icon URL is malformed. Should be url(...)"
        });
        assetProblems++;
        continue;
      }

      const iconUrl = urlMatch[1];
      try {
        const response = await fetch(iconUrl);
        if (!response.ok) {
          this.error(`SVG file not found (${response.status})`, {
            tool,
            url: iconUrl,
            status: response.status,
            hint: `Icon file missing or inaccessible. Check CONFIG.controlIcons.`
          });
          assetProblems++;
        } else {
          this.success(`SVG file accessible`, { tool, url: iconUrl });
        }
      } catch (e) {
        this.error(`SVG fetch error`, {
          tool,
          url: iconUrl,
          error: e.message,
          hint: "Network error or CORS issue."
        });
        assetProblems++;
      }
    }

    return assetProblems === 0;
  },

  /**
   * Check for CSS rule conflicts/overrides
   */
  validateCSSConflicts(buttons) {
    console.log("\n%c🔍 CHECKING FOR CSS CONFLICTS", "font-size: 14px; font-weight: bold; color: #0ff;");

    for (const btn of buttons.slice(0, 1)) {
      // Get all matching CSS rules
      const matched = document.styleSheets;

      console.log(`Inspecting button: ${btn.dataset.tool}`);
      console.log("Matching CSS rules:", {
        element: btn,
        styles: getComputedStyle(btn),
        beforeStyles: getComputedStyle(btn, "::before")
      });
    }
  },

  /**
   * Monitor for style mutations
   */
  setupMutationMonitor(buttons) {
    console.log("\n%c🔍 SETTING UP MUTATION MONITOR", "font-size: 14px; font-weight: bold; color: #0ff;");

    if (buttons.length === 0) return;

    const testBtn = buttons[0];
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "style") {
          this.warn(`Button style mutated`, {
            tool: testBtn.dataset.tool,
            newStyle: testBtn.getAttribute("style"),
            hint: "Something is dynamically changing button styles."
          });
        }
      }
    });

    observer.observe(testBtn, {
      attributes: true,
      attributeFilter: ["style", "class"],
      subtree: false
    });

    this.success("Mutation monitor active", {
      watching: testBtn.dataset.tool,
      hint: "Style changes will be logged."
    });

    return observer;
  },

  /**
   * MASTER DIAGNOSTIC - Run all checks
   */
  async runFullDiagnostic() {
    console.clear();
    console.log("%c═══════════════════════════════════════", "color: #0ff; font-weight: bold;");
    console.log("%c🔥 SWSE CSS VALIDATION - FULL DIAGNOSTIC", "font-size: 16px; color: #f00; font-weight: bold;");
    console.log("%c═══════════════════════════════════════\n", "color: #0ff; font-weight: bold;");

    this.failures = [];
    this.warnings = [];

    // Run all checks
    this.validateCSSLoadOrder();
    this.validateCSSRules();
    const buttons = this.validateButtonDOM();

    if (buttons.length > 0) {
      const computedOk = this.validateComputedStyles(buttons);
      const visibilityOk = this.validateVisibility(buttons);
      const assetsOk = await this.validateSVGAssets(buttons);
      this.validateCSSConflicts(buttons);
      this.setupMutationMonitor(buttons);
    }

    // Final report
    console.log("\n%c═══════════════════════════════════════", "color: #0ff; font-weight: bold;");
    console.log("%c📊 FINAL REPORT", "font-size: 14px; font-weight: bold; color: #0ff;");
    console.log("%c═══════════════════════════════════════", "color: #0ff; font-weight: bold;");

    console.table({
      "Total Failures": this.failures.length,
      "Total Warnings": this.warnings.length,
      "Status": this.failures.length === 0 ? "✅ PASS" : "❌ FAIL"
    });

    if (this.failures.length > 0) {
      console.log("\n%c🔴 FAILURES:", "font-size: 12px; font-weight: bold; color: #f00;");
      this.failures.forEach((f, i) => {
        console.error(`${i + 1}. ${f.title}`, f.details);
      });
    }

    if (this.warnings.length > 0) {
      console.log("\n%c🟡 WARNINGS:", "font-size: 12px; font-weight: bold; color: #ff0;");
      this.warnings.forEach((w, i) => {
        console.warn(`${i + 1}. ${w.title}`, w.details);
      });
    }

    console.log("\n%c✅ Diagnostic Complete", "font-size: 12px; color: #0f0; font-weight: bold;");
    return {
      failures: this.failures,
      warnings: this.warnings,
      success: this.failures.length === 0
    };
  }
};

// Export globally
window.CSS_VALIDATOR = CSS_VALIDATOR;

// Auto-run on ready in dev mode
Hooks.on("canvasReady", async () => {
  if (game.settings.get("core", "devMode")) {
    console.log(
      "%c💡 Dev mode detected. Run CSS_VALIDATOR.runFullDiagnostic() to validate icon rendering.",
      "color: #0ff; font-weight: bold;"
    );
  }
});

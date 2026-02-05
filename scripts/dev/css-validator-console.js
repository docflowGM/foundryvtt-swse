/**
 * QUICK CONSOLE PASTE VERSION - CSS Validation
 *
 * Copy and paste this entire function into your browser console and run:
 *
 * (async () => { ... })()
 *
 * It will perform a LOUD diagnostic of all CSS issues related to icon rendering.
 */

(async () => {
  const failures = [];
  const warnings = [];

  const error = (title, details) => {
    console.error(`❌ CSS ERROR: ${title}`, details);
    failures.push({ title, details });
  };

  const warn = (title, details) => {
    console.warn(`⚠️ CSS WARNING: ${title}`, details);
    warnings.push({ title, details });
  };

  const success = (title, details) => {
    console.log(`✅ ${title}`, details);
  };

  console.clear();
  console.log("%c═══════════════════════════════════════", "color: #0ff; font-weight: bold;");
  console.log("%c🔥 SWSE CSS VALIDATION - FULL DIAGNOSTIC", "font-size: 16px; color: #f00; font-weight: bold;");
  console.log("%c═══════════════════════════════════════\n", "color: #0ff; font-weight: bold;");

  // 1. Validate CSS files loaded
  console.log("%c🔍 VALIDATING CSS LOAD ORDER", "font-size: 14px; font-weight: bold; color: #0ff;");
  const sheets = [...document.styleSheets];
  const swseSheets = sheets.filter(
    s => s.href?.includes('swse') || s.href?.includes('holo') || s.ownerNode?.dataset?.swse
  );

  if (swseSheets.length === 0) {
    error("NO SWSE STYLESHEETS FOUND", {
      totalSheets: sheets.length,
      hint: "Check if swse-holo.css or similar is linked in HTML"
    });
  } else {
    success(`Found ${swseSheets.length} SWSE stylesheets`, {
      sheets: swseSheets.map(s => ({
        href: s.href?.split('/').pop(),
        disabled: s.disabled,
        ruleCount: s.cssRules?.length || 'N/A'
      }))
    });
  }

  // 2. Validate CSS rules exist
  console.log("\n%c🔍 VALIDATING CSS RULES EXIST", "font-size: 14px; font-weight: bold; color: #0ff;");
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
    }
  }

  const iconRuleFound = allRules.some(r => r.includes("ui-control.icon"));
  if (iconRuleFound) {
    success(`CSS Rule found`, { selector: "button.ui-control.icon" });
  } else {
    error(`CSS RULE NOT FOUND`, {
      selector: "button.ui-control.icon",
      hint: "No CSS rules found for icon buttons. Your stylesheet may not be loaded."
    });
  }

  // 3. Validate buttons exist
  console.log("\n%c🔍 VALIDATING BUTTON DOM", "font-size: 14px; font-weight: bold; color: #0ff;");
  const buttons = [...document.querySelectorAll("button.ui-control.icon")];

  if (buttons.length === 0) {
    error("NO BUTTONS FOUND", {
      selector: "button.ui-control.icon",
      hint: "Scene controls may not be rendered yet."
    });
  } else {
    success(`Found ${buttons.length} buttons`, {
      sample: buttons.slice(0, 3).map(b => b.dataset.tool)
    });
  }

  // 4. Validate computed styles
  if (buttons.length > 0) {
    console.log("\n%c🔍 VALIDATING COMPUTED STYLES", "font-size: 14px; font-weight: bold; color: #0ff;");

    for (const btn of buttons.slice(0, 3)) {
      const tool = btn.dataset.tool;
      const computed = getComputedStyle(btn);
      const beforeComputed = getComputedStyle(btn, "::before");

      // Check CSS variables
      const iconVar = computed.getPropertyValue("--control-icon").trim();
      const iconColor = computed.getPropertyValue("--control-icon-color").trim();

      if (!iconVar) {
        error(`Missing --control-icon on ${tool}`, {
          hint: "Foundry did not set the icon CSS variable."
        });
      } else {
        success(`CSS variable set on ${tool}`, { value: iconVar.slice(0, 40) });
      }

      if (!iconColor) {
        warn(`Missing --control-icon-color on ${tool}`, {
          hint: "Icon color variable not set (non-fatal)."
        });
      }

      // Check ::before pseudo-element
      const beforeContent = beforeComputed.content;
      const beforeDisplay = beforeComputed.display;
      const beforeMask = beforeComputed.maskImage || "none";

      if (!beforeContent || beforeContent === "none" || beforeContent === '""') {
        error(`::before has no content on ${tool}`, {
          content: beforeContent,
          hint: "The ::before pseudo-element may not have content: '' defined."
        });
      } else {
        success(`::before content set on ${tool}`, { content: beforeContent });
      }

      if (beforeDisplay === "none") {
        error(`::before is display: none on ${tool}`, {
          hint: "The pseudo-element is hidden."
        });
      } else {
        success(`::before display OK on ${tool}`, { display: beforeDisplay });
      }

      if (beforeMask === "none") {
        error(`::before mask-image is not applied on ${tool}`, {
          currentValue: beforeMask,
          hint: "Your CSS rule for mask-image is not being applied."
        });
      } else {
        success(`::before mask-image applied on ${tool}`, { mask: beforeMask.slice(0, 40) });
      }
    }

    // 5. Validate visibility
    console.log("\n%c🔍 VALIDATING VISIBILITY & LAYOUT", "font-size: 14px; font-weight: bold; color: #0ff;");

    for (const btn of buttons.slice(0, 3)) {
      const tool = btn.dataset.tool;
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      const display = style.display;
      const visibility = style.visibility;
      const opacity = style.opacity;

      if (display === "none") {
        error(`${tool}: display: none`, { hint: "Button is hidden." });
      } else {
        success(`${tool}: display OK`, { display });
      }

      if (visibility === "hidden") {
        error(`${tool}: visibility: hidden`, { hint: "Button is hidden." });
      } else {
        success(`${tool}: visibility OK`, { visibility });
      }

      if (parseFloat(opacity) === 0) {
        error(`${tool}: opacity 0`, { hint: "Button is fully transparent." });
      } else {
        success(`${tool}: opacity OK`, { opacity });
      }

      if (rect.width === 0 || rect.height === 0) {
        error(`${tool}: zero size`, {
          size: `${rect.width}x${rect.height}px`,
          hint: "Button has no width/height."
        });
      } else {
        success(`${tool}: size OK`, { size: `${rect.width}x${rect.height}px` });
      }
    }

    // 6. Validate SVG assets
    console.log("\n%c🔍 VALIDATING SVG ASSETS", "font-size: 14px; font-weight: bold; color: #0ff;");

    for (const btn of buttons.slice(0, 5)) {
      const tool = btn.dataset.tool;
      const computed = getComputedStyle(btn);
      const iconVar = computed.getPropertyValue("--control-icon").trim();

      if (!iconVar) {
        warn(`${tool}: No icon variable`, {});
        continue;
      }

      const urlMatch = iconVar.match(/url\(["']?(.*?)["']?\)/);
      if (!urlMatch) {
        error(`${tool}: Cannot parse icon URL`, {
          value: iconVar,
          hint: "URL format is malformed."
        });
        continue;
      }

      const iconUrl = urlMatch[1];
      try {
        const response = await fetch(iconUrl);
        if (!response.ok) {
          error(`${tool}: SVG not found (${response.status})`, {
            url: iconUrl,
            hint: "Icon file is missing or inaccessible."
          });
        } else {
          success(`${tool}: SVG accessible`, { url: iconUrl });
        }
      } catch (e) {
        error(`${tool}: SVG fetch error`, {
          url: iconUrl,
          error: e.message
        });
      }
    }
  }

  // Final report
  console.log("\n%c═══════════════════════════════════════", "color: #0ff; font-weight: bold;");
  console.log("%c📊 FINAL REPORT", "font-size: 14px; font-weight: bold; color: #0ff;");
  console.log("%c═══════════════════════════════════════\n", "color: #0ff; font-weight: bold;");

  console.table({
    "Total Failures": failures.length,
    "Total Warnings": warnings.length,
    "Status": failures.length === 0 ? "✅ PASS" : "❌ FAIL"
  });

  if (failures.length > 0) {
    console.log("\n%c🔴 CRITICAL FAILURES:", "font-size: 12px; font-weight: bold; color: #f00;");
    failures.forEach((f, i) => {
      console.error(`\n${i + 1}. ${f.title}`);
      console.error(f.details);
    });
  }

  if (warnings.length > 0) {
    console.log("\n%c🟡 WARNINGS:", "font-size: 12px; font-weight: bold; color: #ff0;");
    warnings.forEach((w, i) => {
      console.warn(`\n${i + 1}. ${w.title}`);
      console.warn(w.details);
    });
  }

  console.log("\n%c✅ Diagnostic Complete\n", "font-size: 12px; color: #0f0; font-weight: bold;");

  return { failures, warnings, success: failures.length === 0 };
})();

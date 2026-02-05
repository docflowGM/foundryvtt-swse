/**
 * SWSE Icon Debug Logger
 *
 * Comprehensive diagnostic tool for tracking why sidebar/toolbar icons fail to render.
 * Logs CSS variables, SVG fetch status, DOM layout, and computed styles.
 *
 * Usage: Run in browser console or load as a module
 */

export async function diagnoseIconRenderingFailure() {
  console.log("%c🔍 SWSE Icon Diagnostic Started", "font-size: 14px; font-weight: bold; color: #0ff;");

  const buttons = [...document.querySelectorAll("button.ui-control.icon")];
  console.log(`Found ${buttons.length} .ui-control.icon buttons\n`);

  if (buttons.length === 0) {
    console.warn("❌ No buttons.ui-control.icon found. Scene controls may not be loaded yet.");
    return;
  }

  // Summary object to track failures
  const summary = {
    totalButtons: buttons.length,
    missingIconVar: 0,
    failedFetch: 0,
    hiddenOrZeroSize: 0,
    cssRuleNotApplied: 0,
    details: []
  };

  for (const btn of buttons) {
    const tool = btn.dataset.tool || "unknown";
    const iconVar = getComputedStyle(btn).getPropertyValue("--control-icon").trim();
    const size = btn.getBoundingClientRect();
    const visible = !!(btn.offsetWidth || btn.offsetHeight);
    const beforeStyles = getComputedStyle(btn, "::before");
    const beforeMask = beforeStyles.maskImage || "none";
    const beforeContent = beforeStyles.content;

    const result = {
      tool,
      hasIconVar: !!iconVar,
      sizeOk: size.width > 0 && size.height > 0,
      visible,
      beforeHasContent: beforeContent && beforeContent !== "none",
      beforeMaskApplied: beforeMask !== "none",
      issues: []
    };

    // Detect issues
    if (!iconVar) {
      result.issues.push("CSS variable --control-icon is empty or undefined");
      summary.missingIconVar++;
    }

    if (!visible) {
      result.issues.push(`Not visible: width=${size.width}px height=${size.height}px`);
      summary.hiddenOrZeroSize++;
    }

    if (!beforeContent || beforeContent === "none") {
      result.issues.push("::before pseudo-element has no content or content: none");
      summary.cssRuleNotApplied++;
    }

    if (!beforeMask || beforeMask === "none") {
      result.issues.push("::before mask-image is not applied or is 'none'");
      summary.cssRuleNotApplied++;
    }

    // Try to fetch the icon if we have a URL
    if (iconVar) {
      const urlMatch = iconVar.match(/url\(["']?(.*?)["']?\)/);
      if (urlMatch) {
        const iconURL = urlMatch[1];
        try {
          const res = await fetch(iconURL);
          if (!res.ok) {
            result.issues.push(`SVG fetch failed: ${res.status} ${res.statusText} (${iconURL})`);
            summary.failedFetch++;
          } else {
            result.svgFetchOk = true;
          }
        } catch (e) {
          result.issues.push(`SVG fetch error: ${e.message}`);
          summary.failedFetch++;
        }
      } else {
        result.issues.push("Icon URL could not be parsed from --control-icon");
      }
    }

    summary.details.push(result);

    // Log per button
    const hasIssues = result.issues.length > 0;
    const icon = hasIssues ? "❌" : "✅";
    console.group(`${icon} ${tool.toUpperCase()}`);
    console.table({
      tool,
      "CSS var set": result.hasIconVar ? "✅" : "❌",
      "Visible": result.visible ? "✅" : "❌",
      "Size OK": result.sizeOk ? "✅" : "❌",
      "::before content": result.beforeHasContent ? "✅" : "❌",
      "::before mask": result.beforeMaskApplied ? "✅" : "❌",
      "SVG loads": result.svgFetchOk ? "✅" : (result.issues.some(i => i.includes("fetch")) ? "❌" : "?")
    });

    if (hasIssues) {
      console.error("Issues:");
      result.issues.forEach(issue => console.error(`  • ${issue}`));
    }

    console.log("Element:", btn);
    console.log("HTML:", btn.outerHTML);
    console.groupEnd();
  }

  // Summary report
  console.log("\n%c📊 SUMMARY", "font-size: 12px; font-weight: bold; color: #0ff;");
  console.table({
    "Total buttons": summary.totalButtons,
    "Missing --control-icon": summary.missingIconVar,
    "Failed SVG fetch": summary.failedFetch,
    "Hidden or zero size": summary.hiddenOrZeroSize,
    "CSS rule not applied": summary.cssRuleNotApplied
  });

  // Recommend fixes
  console.log("\n%c💡 DIAGNOSTIC INSIGHTS", "font-size: 12px; font-weight: bold; color: #0af;");

  if (summary.missingIconVar > 0) {
    console.warn(`${summary.missingIconVar}/${summary.totalButtons} buttons lack --control-icon. This usually means Foundry's icon assignment JS didn't run.`);
  }

  if (summary.failedFetch > 0) {
    console.warn(`${summary.failedFetch} SVG files failed to load. Check icon paths in CONFIG.controlIcons.`);
  }

  if (summary.hiddenOrZeroSize > 0) {
    console.warn(`${summary.hiddenOrZeroSize} buttons are not visible (hidden or zero size). Check CSS display/width/height.`);
  }

  if (summary.cssRuleNotApplied > 0) {
    console.error(`${summary.cssRuleNotApplied} buttons lack proper ::before pseudo-element styling. Your CSS rule for .ui-control.icon::before may not be applying.`);
    console.log("Verify your CSS includes:");
    console.log(`
    button.ui-control.icon::before {
      content: "";
      display: block;
      mask-image: var(--control-icon);
      -webkit-mask-image: var(--control-icon);
      background-color: var(--control-icon-color);
    }
    `);
  }

  console.log("\n%c✅ Diagnostic Complete", "font-size: 12px; color: #0f0;");
  return summary;
}

// Expose globally for console access
window.SWSE_DiagnoseIcons = diagnoseIconRenderingFailure;

// Auto-run on ready if in dev mode
Hooks.on("ready", () => {
  if (game.settings.get("core", "devMode")) {
    console.log("Dev mode detected. To run icon diagnostic:\n  await window.SWSE_DiagnoseIcons()");
  }
});

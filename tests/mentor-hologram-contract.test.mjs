import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';

// Phase 1 — Garage/Shipyard Corrective Engineering: shared mentor hologram
// primitive + mentor identity contract. Most of this suite checks semantic
// presence in source/template/CSS text rather than rendering DOM (this repo
// has no browser/DOM test harness — see droid-customization-exploit.test.mjs
// et al. for the same constraint), per PART 28 Test Contracts A-D: "avoid
// brittle exact-pixel/color tests... test semantic presence."

registerFoundryPathLoader();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

// ---------------------------------------------------------------------------
// Test Contract A — mentor identity: Garage -> Seraphim, Shipyard -> Marl
// Skindar, Workbench -> Delta (with the existing Miraj lightsaber exception
// preserved, not asserted away).
// ---------------------------------------------------------------------------
{
  const bayApp = read('scripts/apps/customization/customization-bay-app.js');
  const garageBlockMatch = bayApp.match(/garage:\s*{[^}]*}/s);
  const shipyardBlockMatch = bayApp.match(/shipyard:\s*{[^}]*}/s);
  assert.ok(garageBlockMatch, 'MODE_CONFIG.garage block must exist');
  assert.ok(shipyardBlockMatch, 'MODE_CONFIG.shipyard block must exist');
  assert.match(garageBlockMatch[0], /mentorName:\s*"Seraphim"/, 'Garage mentor must be Seraphim');
  assert.match(shipyardBlockMatch[0], /mentorName:\s*"Marl Skindar"/, 'Shipyard mentor must be Marl Skindar');
  assert.match(garageBlockMatch[0], /mentorDialogueKey:\s*"seraphim"/);
  assert.match(shipyardBlockMatch[0], /mentorDialogueKey:\s*"skindar"/);
  assert.match(garageBlockMatch[0], /mentorPortraitKey:\s*"seraphim"/);
  assert.match(shipyardBlockMatch[0], /mentorPortraitKey:\s*"marl-skindar"/);

  const workbenchApp = read('scripts/apps/customization/item-customization-workbench.js');
  assert.match(workbenchApp, /mentorKey:\s*'delta'/, 'Workbench primary mentor must be Delta');
  assert.match(workbenchApp, /mentorKey:\s*'miraj'/, 'Workbench must preserve the existing Miraj lightsaber exception');
}

// ---------------------------------------------------------------------------
// Test Contract B — canonical WebP resolution for the two newly-wired
// mentors, through the actual registry (not a hardcoded path re-derived by
// this test).
// ---------------------------------------------------------------------------
{
  const { getMentorPortraitPath } = await import('../scripts/mentor/mentor-portrait-registry.js');
  const seraphim = getMentorPortraitPath('seraphim', '');
  const marl = getMentorPortraitPath('marl-skindar', '');
  assert.match(seraphim, /\.webp$/, 'Seraphim portrait must resolve to a canonical .webp path');
  assert.match(marl, /\.webp$/, 'Marl Skindar portrait must resolve to a canonical .webp path');
  assert.doesNotMatch(seraphim, /\.png$/i);
  assert.doesNotMatch(marl, /\.png$/i);

  // The Bay template itself must not hardcode a second portrait path/registry.
  const bayTemplate = read('templates/apps/customization/customization-bay.hbs');
  assert.doesNotMatch(bayTemplate, /assets\/mentors\/[^"']+\.(png|webp)/i, 'customization-bay.hbs must not hardcode a mentor portrait path — it must come from the resolved VM (mentor.mentorPortrait)');
  assert.match(bayTemplate, /mentor\.mentorPortrait/, 'the template must render the resolved portrait from the VM');
}

// ---------------------------------------------------------------------------
// Test Contract C — the shared hologram CSS must contain meaningful
// treatment for: grayscale, blue/cyan tint, blue scanlines, a pale/white
// scanline component, and a glow. Semantic (regex) presence, not pixel
// comparison.
// ---------------------------------------------------------------------------
{
  const css = read('styles/system/mentor-hologram.css');
  assert.match(css, /\.swse-mentor-hologram\b/, 'shared container class must exist');
  assert.match(css, /\.swse-mentor-hologram__image\b/, 'shared image class must exist');
  assert.match(css, /\.swse-mentor-hologram__tint\b/, 'shared tint layer must exist');
  assert.match(css, /\.swse-mentor-hologram__scan\b/, 'shared scanline layer must exist');

  assert.match(css, /grayscale\(\s*1\s*\)/, 'image filter must include a full grayscale pass');
  assert.match(css, /hue-rotate\(\s*\d+deg\s*\)/, 'image filter must include a hue-rotate for the blue/cyan tint');

  // Scanline layer must carry BOTH a blue/cyan band and a brighter pale/white
  // band within the same rule (PART 14: neither may be so subtle it
  // effectively disappears).
  const scanRuleMatch = css.match(/\.swse-mentor-hologram__scan\s*{[^}]*}/s);
  assert.ok(scanRuleMatch, 'scanline rule body must exist');
  const scanRule = scanRuleMatch[0];
  assert.match(scanRule, /rgba\(\s*94,\s*224,\s*255/, 'scanline layer must contain a blue/cyan band');
  assert.match(scanRule, /rgba\(\s*255,\s*255,\s*255/, 'scanline layer must contain a pale/white band');

  // Glow: some controlled box-shadow/drop-shadow using the cyan family, not
  // an unbounded bloom.
  assert.match(css, /box-shadow:[^;]*rgba\(\s*0,\s*19?0,\s*255/, 'container must apply a controlled cyan glow');

  // Motion respect: reduced/off must dial down the scan layer, and no new
  // motion-preference system was invented — it hooks the existing
  // [data-motion-style] attribute convention used across the repo.
  assert.match(css, /\[data-motion-style="off"\]\s*\.swse-mentor-hologram__scan/);
  assert.match(css, /\[data-motion-style="reduced"\]\s*\.swse-mentor-hologram__scan/);
}

// ---------------------------------------------------------------------------
// Test Contract D — player character portraits must be excluded. Protect
// against selectors broad enough to affect generic actor/token/item art:
// the shared classes must never appear on a player-character portrait
// template, and the two Phase-0-identified mis-scoped usages must be fixed.
// ---------------------------------------------------------------------------
{
  const playerPortraitTemplates = [
    'templates/partials/actor/persistent-header.hbs',
    'templates/sheets/partials/sheet-header.hbs',
    'templates/actors/droid/droid-image-operational.hbs',
    'templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs',
    'templates/shell/partials/surface-home.hbs',
    'templates/apps/progression-framework/summary-panel/species-summary.hbs',
    'templates/apps/progression-framework/summary-panel/droid-builder-summary.hbs'
  ];
  for (const relPath of playerPortraitTemplates) {
    const full = path.join(ROOT, relPath);
    if (!fs.existsSync(full)) continue; // tolerate repo drift; not the point of this check
    const content = fs.readFileSync(full, 'utf8');
    assert.doesNotMatch(
      content,
      /swse-mentor-hologram/,
      `${relPath} renders a player-character portrait and must never carry the mentor hologram class`
    );
  }

  // The two Phase-0-identified mis-scoped usages must no longer carry the
  // GENERIC hologram-filter image class on the actor's own portrait.
  const species = read('templates/apps/progression-framework/summary-panel/species-summary.hbs');
  const droidSummary = read('templates/apps/progression-framework/summary-panel/droid-builder-summary.hbs');
  assert.doesNotMatch(species, /class="[^"]*prog-holo-media__image[^"]*"/, 'species-summary.hbs actor portrait must not receive the hologram filter class');
  assert.doesNotMatch(droidSummary, /class="[^"]*prog-holo-media__image[^"]*"/, 'droid-builder-summary.hbs actor portrait must not receive the hologram filter class');
  assert.match(species, /actor\.img/, 'sanity: this is still the actor\'s own portrait');
  assert.match(droidSummary, /actor\.img/, 'sanity: this is still the actor\'s own portrait');
}

// ---------------------------------------------------------------------------
// Mentor guidance surfaces DO carry the shared class (positive control,
// complementing the exclusion checks above).
// ---------------------------------------------------------------------------
{
  const bayTemplate = read('templates/apps/customization/customization-bay.hbs');
  assert.match(bayTemplate, /swse-mentor-hologram/, 'Garage/Shipyard mentor portrait must use the shared hologram primitive');

  const workbenchContent = read('templates/apps/customization/partials/workbench-content.hbs');
  assert.match(workbenchContent, /swse-mentor-hologram/, 'Workbench (Delta/Miraj) mentor portrait must use the shared hologram primitive');

  const mentorRail = read('templates/apps/progression-framework/mentor-rail.hbs');
  assert.match(mentorRail, /swse-mentor-hologram__image/, 'Progression mentor rail portrait must use the shared hologram primitive');
}

// ---------------------------------------------------------------------------
// Test Contract K — Garage/Shipyard mentor surface must expose the required
// hydration hooks and actually be invoked through MentorTranslationIntegration,
// mirroring WorkbenchSurfaceAdapter.afterInlineRender()'s exact, already-proven
// invocation point (character-sheet.js's _hydrateInline*Surface pattern — see
// PART 25). Hydration must be idempotent (guarded by translationHydrated).
// ---------------------------------------------------------------------------
{
  const bayTemplate = read('templates/apps/customization/customization-bay.hbs');
  assert.match(bayTemplate, /data-customization-mentor-text/, 'template must expose the mentor-text hydration hook');
  assert.match(bayTemplate, /data-mentor="{{mentor\.mentorKey}}"/, 'template must expose the mentor key for translation preset lookup');
  assert.match(bayTemplate, /data-raw-text="{{mentor\.mentorText}}"/, 'template must expose the raw (untranslated) text for idempotent hydration');

  const adapter = read('scripts/ui/shell/CustomizationSurfaceAdapter.js');
  assert.match(adapter, /async afterInlineRender\(surfaceRoot\)/, 'adapter must implement afterInlineRender(), mirroring WorkbenchSurfaceAdapter');
  assert.match(adapter, /MentorTranslationIntegration\.render\(/, 'adapter must use the shared MentorTranslationIntegration pipeline, not a separate implementation');
  assert.match(adapter, /translationHydrated/, 'hydration must be idempotent, matching WorkbenchSurfaceAdapter\'s guard');

  const sheet = read('scripts/sheets/v2/character-sheet.js');
  const wireStart = sheet.indexOf('_wireCustomizationSurfaceEvents(root, signal)');
  assert.ok(wireStart !== -1, '_wireCustomizationSurfaceEvents must exist on the actual live sheet class');
  const wireEnd = sheet.indexOf('\n  }', wireStart);
  const wireBlock = sheet.slice(wireStart, wireEnd);
  assert.match(
    wireBlock,
    /_hydrateInlineCustomizationSurface/,
    '_wireCustomizationSurfaceEvents must invoke the hydration seam on render, the same way _wireWorkbenchSurfaceEvents invokes _hydrateInlineWorkbenchSurface'
  );
  assert.match(
    sheet,
    /_hydrateInlineCustomizationSurface\(surfaceRoot\)\s*{[\s\S]*?afterInlineRender/,
    '_hydrateInlineCustomizationSurface must call the adapter\'s afterInlineRender()'
  );
}

// ---------------------------------------------------------------------------
// Test Contract C(2) — effective cascade, not just rule presence (PR #946
// review, Correction 5). CSS `filter` does not merge: a more-specific
// interaction-state rule (:hover/:focus/:active/etc.) that ALSO targets the
// actual <img> and declares its own `filter` REPLACES the shared hologram
// filter entirely for that state, even though the base/idle rule (checked
// above) is untouched. This is a lightweight, targeted parse — not a full
// CSS cascade engine — but it directly encodes the real bug class found in
// review: an img-targeting interaction-state selector must never declare a
// filter that lacks `grayscale`.
// ---------------------------------------------------------------------------
{
  const filesToScan = [
    'styles/progression-framework/mentor-rail.css',
    'styles/progression-framework/holo-theme.css',
    'styles/apps/item-customization-workbench.css',
    'styles/apps/customization-bay.css'
  ];

  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  const interactionStatePattern = /:hover|:focus|:active|:focus-visible|\[data-mood|\[data-choice-reaction/;
  const targetsImagePattern = /\bimg\b|__image\b|-image\b|__img\b/;

  for (const relPath of filesToScan) {
    const css = read(relPath);
    let match;
    while ((match = ruleRe.exec(css))) {
      const selector = match[1].trim();
      const body = match[2];
      if (!interactionStatePattern.test(selector)) continue;
      if (!targetsImagePattern.test(selector)) continue; // container-level filters (e.g. a brightness pulse on .prog-mentor__portrait itself) compose with, not replace, the child image's filter — not a violation.
      const filterMatch = body.match(/(?<![\w-])filter\s*:\s*([^;]+);/);
      if (!filterMatch) continue; // no filter declared at all — falls through the cascade to the base rule, fine.
      assert.match(
        filterMatch[1],
        /grayscale/,
        `${relPath}: interaction-state selector "${selector}" declares a non-hologram filter ("${filterMatch[1].trim()}") on the mentor image — CSS filter does not merge, so this REPLACES the shared grayscale/blue-tint hologram filter for that state`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Correction 6 — Progression must use the shared tint/scan primitive, not a
// second, independently-maintained formula. The rail's own DOM nodes now
// carry BOTH the rail-specific class (geometry only) and the shared class
// (the actual effect), and mentor-rail.css must no longer independently
// declare the tint/scanline gradient formula itself.
// ---------------------------------------------------------------------------
{
  const mentorRail = read('templates/apps/progression-framework/mentor-rail.hbs');
  assert.match(mentorRail, /prog-holo-mentor-media__overlay swse-mentor-hologram__tint/, 'Progression tint node must adopt the shared tint class');
  assert.match(mentorRail, /prog-holo-mentor-media__scan swse-mentor-hologram__scan/, 'Progression scan node must adopt the shared scan class');

  const mentorRailCss = read('styles/progression-framework/mentor-rail.css');
  const overlayBody = (mentorRailCss.match(/\.prog-holo-mentor-media__overlay\s*\{([^}]*)\}/) || [])[1] || '';
  const scanBody = (mentorRailCss.match(/(?<!__overlay,\s*\n\.progression-shell )\.prog-holo-mentor-media__scan\s*\{([^}]*)\}/) || [])[1] || '';
  assert.doesNotMatch(overlayBody, /background\s*:/, 'Progression must not independently declare the tint gradient — that value comes from the shared .swse-mentor-hologram__tint class now');
  assert.doesNotMatch(scanBody, /repeating-linear-gradient/, 'Progression must not independently declare the scanline gradient — that value comes from the shared .swse-mentor-hologram__scan class now');
}

// ---------------------------------------------------------------------------
// Correction 7 — no inline PNG->WebP portrait-path resolution in the
// template. The portrait resolver is JS/data authority
// (resolveMentorPortraitPath, already applied before the VM reaches this
// template — see scripts/apps/progression-framework/shell/progression-shell.js),
// not template markup.
// ---------------------------------------------------------------------------
{
  const mentorRail = read('templates/apps/progression-framework/mentor-rail.hbs');
  assert.doesNotMatch(mentorRail, /data-src=/, 'template must not stage a raw, unresolved portrait path in data-src');
  assert.doesNotMatch(mentorRail, /onload=/, 'template must not run portrait path-normalization logic in an onload handler');
  assert.doesNotMatch(mentorRail, /\.replace\(/, 'template must not contain inline path-rewriting logic');
  assert.doesNotMatch(mentorRail, /\\\.png/, 'template must not contain an inline .png matcher');
  assert.match(mentorRail, /src="\{\{mentor\.portrait\}\}"/, 'template must render the already-resolved VM portrait path directly');
  assert.match(mentorRail, /onerror=/, 'a plain image-load fallback to the canonical mentor must remain');

  const progressionShell = read('scripts/apps/progression-framework/shell/progression-shell.js');
  assert.match(progressionShell, /portrait:\s*resolveMentorPortraitPath\(this\.mentor\?\.portrait\)/, 'the controller must still resolve the portrait before building the mentor rail VM');
}

console.log('Mentor hologram contract tests passed.');

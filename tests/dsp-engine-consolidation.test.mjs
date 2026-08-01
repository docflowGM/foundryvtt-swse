import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 1 DSP consolidation — static architectural guards for the
// mechanical refactors (method-name fixes, canonical-field-path fixes,
// import/export fidelity, registry metadata) where a source-text check is
// the appropriate tool. The compatibility-critical semantics (canonical
// vs. legacy value resolution, integer max normalization, increment
// correctness) are covered by real behavioral tests instead — see
// tests/dsp-engine-behavior.test.mjs — not duplicated here as regexes.

const dspEngine = await readFile(new URL('../scripts/engine/darkside/dsp-engine.js', import.meta.url), 'utf8');
const mentorSuggestionBias = await readFile(new URL('../scripts/mentor/mentor-suggestion-bias.js', import.meta.url), 'utf8');
const mentorStoryResolver = await readFile(new URL('../scripts/engine/mentor/mentor-story-resolver.js', import.meta.url), 'utf8');
const poisonEngine = await readFile(new URL('../scripts/engine/poison/poison-engine.js', import.meta.url), 'utf8');
const npcSheetHelpers = await readFile(new URL('../scripts/sheets/v2/npc/npc-sheet-helpers.js', import.meta.url), 'utf8');
const panelContextBuilder = await readFile(new URL('../scripts/sheets/v2/context/PanelContextBuilder.js', import.meta.url), 'utf8');
const darkSidePanelContext = await readFile(new URL('../scripts/sheets/v2/context/dark-side-panel-context.js', import.meta.url), 'utf8');
const panelValidators = await readFile(new URL('../scripts/sheets/v2/context/PanelValidators.js', import.meta.url), 'utf8');
const characterSheet = await readFile(new URL('../scripts/sheets/v2/character-sheet.js', import.meta.url), 'utf8');
const npcImporter = await readFile(new URL('../scripts/engine/import/npc-template-importer-engine.js', import.meta.url), 'utf8');
const droidImporter = await readFile(new URL('../scripts/engine/import/stock-droid-importer-engine.js', import.meta.url), 'utf8');
const droidNormalizer = await readFile(new URL('../scripts/domain/droids/stock-droid-normalizer.js', import.meta.url), 'utf8');
const exportModel = await readFile(new URL('../scripts/export/swse-export-model.js', import.meta.url), 'utf8');
const panelRegistry = await readFile(new URL('../scripts/sheets/v2/context/PANEL_REGISTRY.js', import.meta.url), 'utf8');
const prerequisiteChecker = await readFile(new URL('../scripts/data/prerequisite-checker.js', import.meta.url), 'utf8');
const forcePoints = await readFile(new URL('../scripts/utils/force-points.js', import.meta.url), 'utf8');
const forceEngine = await readFile(new URL('../scripts/engine/force/force-engine.js', import.meta.url), 'utf8');
const sithTalentActions = await readFile(new URL('../scripts/engine/talent/sith-talent-actions.js', import.meta.url), 'utf8');
const forceAdeptTalentActions = await readFile(new URL('../scripts/engine/talent/force-adept-talent-actions.js', import.meta.url), 'utf8');
const forceAlchemyMechanicsService = await readFile(new URL('../scripts/apps/force-alchemy/force-alchemy-mechanics-service.js', import.meta.url), 'utf8');
const lightSideTalentMechanics = await readFile(new URL('../scripts/engine/talent/light-side-talent-mechanics.js', import.meta.url), 'utf8');
const sentinelTalentActions = await readFile(new URL('../scripts/engine/talent/sentinel-talent-actions.js', import.meta.url), 'utf8');
const forcePointFeatRules = await readFile(new URL('../scripts/engine/feats/force-point-feat-rules.js', import.meta.url), 'utf8');
const skillFeatResolver = await readFile(new URL('../scripts/engine/skills/skill-feat-resolver.js', import.meta.url), 'utf8');
const darkSidePowers = await readFile(new URL('../scripts/talents/DarkSidePowers.js', import.meta.url), 'utf8');

// 1. The two broken DSPEngine method-name crashes are fixed.
assert.match(mentorSuggestionBias, /DSPEngine\.getBiasMultiplier\(actor\)/);
assert.doesNotMatch(mentorSuggestionBias, /getSuggestionBiasMultiplier/);
assert.match(mentorStoryResolver, /DSPEngine\.getSaturationByWisdom\(actor\)/);
assert.doesNotMatch(mentorStoryResolver, /calculateSaturationByWisdom/);

// 2. DSPEngine itself: SchemaAdapters used for every Wisdom read instead
//    of the raw, racial/enhancement-blind attributes.wis.base/.total.
assert.match(dspEngine, /import \{ SchemaAdapters \}/);
assert.doesNotMatch(dspEngine, /attributes\?\.wis\?\.base/);
assert.match(dspEngine, /getNextValue\(actor, delta = 1\)/);
assert.match(dspEngine, /Math\.ceil\(explicit\)/);
assert.match(dspEngine, /Math\.ceil\(wisdom \* multiplier\)/);

// 3. Poison engine and NPC-sheet allowlist no longer target the
//    schema-invalid system.darkSideScore.value object path.
assert.doesNotMatch(poisonEngine, /darkSideScore\.value/);
assert.match(poisonEngine, /DSPEngine\.getValue\(targetActor\)/);
assert.doesNotMatch(npcSheetHelpers, /darkSideScore\.value/);
assert.match(npcSheetHelpers, /'system\.darkSide\.value'/);

// 4. PanelContextBuilder delegates to the Phase 3 shared panel-context
//    helper, which itself delegates to DSPEngine; no hardcoded || 20
//    fallback; segment loop starts at 0 so DSP can be reset to zero.
//    (Segment-building logic moved to dark-side-panel-context.js in
//    Phase 3 so it's a real, lightweight production function tests can
//    import directly — see dsp-panel-context-visibility.test.mjs.)
assert.match(panelContextBuilder, /buildDarkSidePanelContext\(this\.actor/);
assert.doesNotMatch(panelContextBuilder, /\|\| 20/);
assert.match(darkSidePanelContext, /DSPEngine\.getValue\(actor\)/);
assert.match(darkSidePanelContext, /DSPEngine\.getMax\(actor\)/);
assert.doesNotMatch(darkSidePanelContext, /\|\| 20/);
assert.match(darkSidePanelContext, /for \(let i = 0; i <= max; i\+\+\)/);

// 5. PanelValidators' segment-count invariant accounts for the added
//    zero segment (max + 1 entries, not max). Round 2: danger is a
//    required registry key that was never actually validated as boolean.
assert.match(panelValidators, /panelData\.segments\.length !== panelData\.max \+ 1/);
assert.match(panelValidators, /typeof panelData\.danger !== 'boolean'/);

// 6. character-sheet.js: dead duplicate DSP calc removed; click handler
//    delegates to the extracted, independently-tested dsp-click-handler.js
//    module (Phase 3) instead of inlining the finite-index guard/prompt
//    removal/ActorEngine call directly — see
//    dsp-click-handler-authorization.test.mjs for the actual authorization
//    and mutation-shape behavioral coverage.
assert.doesNotMatch(characterSheet, /const dspSegments = \[\]/);
const handlerMatch = characterSheet.match(/\[data-action="set-dark-side-score"\][\s\S]{0,400}?\}\);\s*\n\s*\}\);/);
assert.ok(handlerMatch, 'set-dark-side-score handler block found');
const handlerBody = handlerMatch[0];
assert.match(handlerBody, /event\.currentTarget\?\.dataset\?\.index/);
assert.match(handlerBody, /handleSetDarkSideScore\(this\.actor,/);
assert.doesNotMatch(handlerBody, /prompt\(/);
assert.match(characterSheet, /import \{ handleSetDarkSideScore \} from/);
// Round 2 cleanup: the DSPEngine import became dead after the handler
// extraction (the only remaining occurrence of the name was the import
// itself) — must stay removed, not just unused.
assert.doesNotMatch(characterSheet, /DSPEngine/, 'character-sheet.js must not reference DSPEngine at all — the handler extraction moved that logic to dsp-click-handler.js');

// 7. Importers populate the canonical nested field, not just the legacy
//    flat mirror; the droid normalizer prefers canonical when re-reading.
assert.match(npcImporter, /darkSide: \{ value: numberOrNull\(statblock\['Dark Side Points'\]\) \?\? 0, max: 0 \}/);
assert.match(droidImporter, /darkSide: \{ value: totals\.darkSideScore \|\| 0, max: 0 \}/);
assert.match(droidNormalizer, /system\.darkSide\?\.value \?\? system\.darkSideScore/);

// 8. Export model reads canonical first, with legacy fallback.
assert.match(exportModel, /sys\.darkSide\?\.value \?\? sys\.darkSideScore \?\? 0/);

// 9. Panel registry metadata: correct template path, no fake SVG
//    contract, no static 20-segment cap.
assert.match(panelRegistry, /v2-concept\/partials\/panels\/dark-side-panel\.hbs/);
assert.doesNotMatch(panelRegistry, /v2\/partials\/dark-side-panel\.hbs/);
const darkSidePanelEntryMatch = panelRegistry.match(/darkSidePanel: \{[\s\S]*?\n {2}\},/);
assert.ok(darkSidePanelEntryMatch, 'darkSidePanel registry entry found');
assert.match(darkSidePanelEntryMatch[0], /svgBacked: false/);
assert.doesNotMatch(darkSidePanelEntryMatch[0], /dsp-track-box/);
assert.doesNotMatch(darkSidePanelEntryMatch[0], /1\.\.20/);

// 10. Wisdom reads in prerequisite-checker.js / force-points.js route
//     through SchemaAdapters instead of a broken/incomplete field path.
assert.match(prerequisiteChecker, /import \{ SchemaAdapters \}/);
assert.match(prerequisiteChecker, /SchemaAdapters\.getAbilityScore\(actor, 'wis'\)/);
assert.match(forcePoints, /import \{ SchemaAdapters \}/);
assert.match(forcePoints, /SchemaAdapters\.getAbilityScore\(actor, 'wis'\)/);
assert.doesNotMatch(forcePoints, /attributes\?\.wis\?\.total/);

// 11. Dual-writers compute before/after through DSPEngine instead of
//     reimplementing the canonical-zero-vs-legacy fallback inline.
// Round 2 cleanup: gainDarkSidePoint() no longer computes a separate
// "before" value at all (it was unused dead code) — only getNextValue()
// is called, so getValue() is no longer expected to appear here.
assert.match(forceEngine, /import \{ DSPEngine \}/);
assert.match(forceEngine, /DSPEngine\.getNextValue\(actor, 1\)/);
assert.doesNotMatch(forceEngine, /const currentValue = DSPEngine\.getValue\(actor\);/, 'the unused currentValue local must stay removed');
assert.match(sithTalentActions, /import \{ DSPEngine \}/);
assert.match(sithTalentActions, /DSPEngine\.getNextValue\(actor, delta\)/);
assert.doesNotMatch(sithTalentActions, /actor\?\.system\?\.darkSide\?\.value \?\? actor\?\.system\?\.darkSideScore/);
assert.match(forceAdeptTalentActions, /import \{ DSPEngine \}/);
assert.match(forceAdeptTalentActions, /DSPEngine\.getNextValue\(actor, delta\)/);
assert.doesNotMatch(forceAdeptTalentActions, /actor\?\.system\?\.darkSide\?\.value \?\? actor\?\.system\?\.darkSideScore/);
// force-alchemy-mechanics-service.js already called DSPEngine.getValue()
// first on inspection — confirm that remains true, unchanged.
assert.match(forceAlchemyMechanicsService, /numberFrom\(DSPEngine\.getValue\(actor\)/);

// 12. Non-canonical DSP fallback chains consolidated onto
//     DSPEngine.getValue() in the five talent/feat modules.
assert.match(lightSideTalentMechanics, /import \{ DSPEngine \}/);
assert.match(lightSideTalentMechanics, /DSPEngine\.getValue\(target\)/);
assert.doesNotMatch(lightSideTalentMechanics, /target\.system\?\.darkSideScore \|\| target\.system\?\.dsp/);
assert.match(sentinelTalentActions, /import \{ DSPEngine \}/);
assert.match(sentinelTalentActions, /function getDarkSideScore\(actor\) \{\s*\n\s*return DSPEngine\.getValue\(actor\);/);
assert.match(forcePointFeatRules, /import \{ DSPEngine \}/);
assert.match(forcePointFeatRules, /function darkSideScore\(actor\) \{\s*\n\s*return DSPEngine\.getValue\(actor\);/);
assert.match(skillFeatResolver, /import \{ DSPEngine \}/);
assert.match(skillFeatResolver, /case 'halfDarkSideScore': \{\s*\n\s*const dsp = DSPEngine\.getValue\(actor\);/);
assert.match(darkSidePowers, /import \{ DSPEngine \}/);
assert.match(darkSidePowers, /export function _getDSP\(actor\) \{\s*\n\s*return DSPEngine\.getValue\(actor\);/);
assert.match(darkSidePowers, /DSPEngine\.getNextValue\(actor, amount\)/);

console.log('DSP engine consolidation static guards passed.');

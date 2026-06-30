#!/usr/bin/env node
/**
 * Implant Phase 4B UX/visibility audit.
 *
 * Read-only audit for the item sheet tagging controls and actor sheet visibility
 * added after the Phase 4A rules integration.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const strict = process.argv.includes('--strict');
const checks = [];

function read(rel) {
  return fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : '';
}

function ok(id, rel, condition, detail) {
  checks.push({ id, file: rel, ok: !!condition, detail });
}

const equipmentResolverPath = 'scripts/items/equipment-data-resolver.js';
const itemBodyPath = 'templates/dialogs/entity/parts/body-item.hbs';
const rowTransformerPath = 'scripts/sheets/v2/context/RowTransformers.js';
const inventoryRowPath = 'templates/actors/character/v2/partials/inventory-item-row.hbs';
const panelBuilderPath = 'scripts/sheets/v2/context/PanelContextBuilder.js';
const defensePanelPath = 'templates/actors/character/v2/partials/defenses-panel.hbs';

const equipmentResolver = read(equipmentResolverPath);
const itemBody = read(itemBodyPath);
const rowTransformer = read(rowTransformerPath);
const inventoryRow = read(inventoryRowPath);
const panelBuilder = read(panelBuilderPath);
const defensePanel = read(defensePanelPath);

ok('resolver-imports-implant-rules', equipmentResolverPath, equipmentResolver.includes('ImplantRules'), 'equipment resolver should expose ImplantRules-derived display state');
ok('resolver-exposes-is-implant', equipmentResolverPath, equipmentResolver.includes('isImplant') && equipmentResolver.includes('isActiveImplant'), 'equipment context should include implant tagging and active state');
ok('resolver-exposes-notes', equipmentResolverPath, equipmentResolver.includes('implantRules') && equipmentResolver.includes('notes'), 'equipment context should preserve GM implant notes');

ok('item-sheet-has-implant-section', itemBodyPath, itemBody.includes('Implant / Cybernetics Rules'), 'item sheet should have explicit implant/cybernetics section');
ok('item-sheet-counts-as-implant', itemBodyPath, itemBody.includes('system.implantRules.countAsImplant'), 'item sheet should expose explicit implant marker');
ok('item-sheet-installed-active', itemBodyPath, itemBody.includes('system.installed') && itemBody.includes('system.active'), 'item sheet should expose installed/active controls');
ok('item-sheet-active-by-ownership', itemBodyPath, itemBody.includes('system.implantRules.activeByOwnership'), 'item sheet should expose active-by-ownership escape hatch');
ok('item-sheet-cautions-generic-cybernetics', itemBodyPath, itemBody.includes('Generic cybernetic prostheses should remain untagged'), 'item sheet should caution against broad cybernetic classification');

ok('row-transformer-imports-implant-rules', rowTransformerPath, rowTransformer.includes('ImplantRules'), 'inventory rows should derive implant badges through ImplantRules');
ok('row-transformer-adds-implant-row-state', rowTransformerPath, rowTransformer.includes('isActiveImplant') && rowTransformer.includes('implantPenaltyTitle'), 'inventory row context should include implant badge metadata');
ok('inventory-row-shows-badge', inventoryRowPath, inventoryRow.includes('implant-indicator'), 'inventory row should display implant badge');
ok('inventory-row-active-warning', inventoryRowPath, inventoryRow.includes('IMP!'), 'active implants should be visually distinct');

ok('defense-panel-builder-includes-implant-penalty', panelBuilderPath, panelBuilder.includes('implantWillPenalty') && panelBuilder.includes('hasImplantWillPenalty'), 'defense panel context should include implant Will penalty');
ok('defense-panel-total-includes-implant', panelBuilderPath, panelBuilder.includes('+ implantWillPenalty'), 'defense panel visible math should include implant Will penalty');
ok('defense-panel-summary-context', panelBuilderPath, panelBuilder.includes('implantSummary') && panelBuilder.includes('implantTraining'), 'defense panel should include actor implant summary');
ok('defense-panel-renders-summary', defensePanelPath, defensePanel.includes('defense-implant-summary'), 'defense panel should render implant state summary');
ok('defense-panel-renders-breakdown', defensePanelPath, defensePanel.includes('Implant Penalty'), 'defense breakdown should show implant penalty line');

const okCount = checks.filter(c => c.ok).length;
const errors = checks.filter(c => !c.ok);
const report = {
  generatedAt: new Date().toISOString(),
  phase: 'Implants Phase 4B - UX and Visibility',
  ok: okCount,
  errors: errors.length,
  checks
};

fs.mkdirSync(path.join(ROOT, 'docs/audits/generated'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audits/generated/implant-ux-visibility-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(ROOT, 'docs/audits/generated/implant-ux-visibility-report.md'), [
  '# Implant UX Visibility Audit',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `Result: ${okCount} ok, ${errors.length} errors`,
  '',
  ...checks.map(c => `- ${c.ok ? 'OK' : 'ERROR'} ${c.id}: ${c.detail} (${c.file})`),
  ''
].join('\n'));

console.log(`Implant UX visibility audit: ${okCount} ok, ${errors.length} errors`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error.id}: ${error.detail} (${error.file})`);
  if (strict) process.exit(1);
}

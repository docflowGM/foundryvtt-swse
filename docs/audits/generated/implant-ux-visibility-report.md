# Implant UX Visibility Audit

Generated: 2026-06-30T12:55:30.375Z

Result: 17 ok, 0 errors

- OK resolver-imports-implant-rules: equipment resolver should expose ImplantRules-derived display state (scripts/items/equipment-data-resolver.js)
- OK resolver-exposes-is-implant: equipment context should include implant tagging and active state (scripts/items/equipment-data-resolver.js)
- OK resolver-exposes-notes: equipment context should preserve GM implant notes (scripts/items/equipment-data-resolver.js)
- OK item-sheet-has-implant-section: item sheet should have explicit implant/cybernetics section (templates/dialogs/entity/parts/body-item.hbs)
- OK item-sheet-counts-as-implant: item sheet should expose explicit implant marker (templates/dialogs/entity/parts/body-item.hbs)
- OK item-sheet-installed-active: item sheet should expose installed/active controls (templates/dialogs/entity/parts/body-item.hbs)
- OK item-sheet-active-by-ownership: item sheet should expose active-by-ownership escape hatch (templates/dialogs/entity/parts/body-item.hbs)
- OK item-sheet-cautions-generic-cybernetics: item sheet should caution against broad cybernetic classification (templates/dialogs/entity/parts/body-item.hbs)
- OK row-transformer-imports-implant-rules: inventory rows should derive implant badges through ImplantRules (scripts/sheets/v2/context/RowTransformers.js)
- OK row-transformer-adds-implant-row-state: inventory row context should include implant badge metadata (scripts/sheets/v2/context/RowTransformers.js)
- OK inventory-row-shows-badge: inventory row should display implant badge (templates/actors/character/v2/partials/inventory-item-row.hbs)
- OK inventory-row-active-warning: active implants should be visually distinct (templates/actors/character/v2/partials/inventory-item-row.hbs)
- OK defense-panel-builder-includes-implant-penalty: defense panel context should include implant Will penalty (scripts/sheets/v2/context/PanelContextBuilder.js)
- OK defense-panel-total-includes-implant: defense panel visible math should include implant Will penalty (scripts/sheets/v2/context/PanelContextBuilder.js)
- OK defense-panel-summary-context: defense panel should include actor implant summary (scripts/sheets/v2/context/PanelContextBuilder.js)
- OK defense-panel-renders-summary: defense panel should render implant state summary (templates/actors/character/v2/partials/defenses-panel.hbs)
- OK defense-panel-renders-breakdown: defense breakdown should show implant penalty line (templates/actors/character/v2/partials/defenses-panel.hbs)

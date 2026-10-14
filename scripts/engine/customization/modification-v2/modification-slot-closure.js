/**
 * Slot-cost closure -- G3 (pure). Builds the `certifiedDefinitionLookup(upgradeKey)` function that the merged Phase 1a
 * ModificationSlotAuthority accepts through its context. This module does not import Phase 1a (Phase 1a still has no
 * importer); the caller wires the two. In V2 the `upgradeKey` IS the typed definition id.
 *
 * The closure answers only for a typed domain definition whose slot cost the generator certified AND whose domain is
 * source-certified for read-only accounting. Everything else returns null, which Phase 1a reports as uncertified.
 * It is for counting an already-recorded installation; it says nothing about installability or host legality.
 */
export function createCertifiedDefinitionLookup(catalog) {
  return function certifiedDefinitionLookup(upgradeKey) {
    if (typeof upgradeKey !== 'string') return null;
    const found = catalog.getTyped(upgradeKey);
    if (!found) return null;
    const { parent, typed } = found;
    if (typed.accounting?.eligible !== true || typed.slotCost?.certification?.certified !== true) return null;
    const cost = typed.slotCost.registry?.slots ?? parent.slotCost?.registry?.slots;
    if (!Number.isInteger(cost) || cost < 0) return null;
    const src = parent.provenance?.source ?? {};
    const page = src.printedTablePage ?? src.rulesPage;
    if (typeof src.bookId !== 'string' || !Number.isInteger(page)) return null;
    const table = src.tableId ? ` table ${src.tableId}` : '';
    return {
      definitionId: typed.typedDefinitionId,
      upgradeKey,
      certifiedCost: cost,
      source: {
        ref: `${src.bookId}:p${page}${table}`,
        certification: `${parent.provenance.tableCertification}; domainBasis=${typed.applicability.domainBasis}; registry=${parent.registry.version}`
      }
    };
  };
}

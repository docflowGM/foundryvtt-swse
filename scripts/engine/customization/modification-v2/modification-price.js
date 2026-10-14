/**
 * Price resolution -- G3 (pure). Mirrors the registry's tagged price and never invents a number.
 * Only a stated credit amount is computable. Unstated (`unknown`), percentage, multiplier, procedure, force-point,
 * component and not-for-sale prices stay tagged and non-computable. An unknown price is never 0 (register D-006).
 */
export function resolvePrice(parentRecord) {
  const price = parentRecord?.price;
  if (!price || typeof price.kind !== 'string' || !price.registry || typeof price.registry !== 'object') return { kind: 'unknown', amount: null, computable: false, registry: null };
  const amount = price.registry.amount;
  if (price.kind === 'credits' && typeof amount === 'number' && Number.isFinite(amount) && amount >= 0) return { kind: 'credits', amount, computable: true, registry: price.registry };
  return { kind: price.kind, amount: null, computable: false, registry: price.registry };
}

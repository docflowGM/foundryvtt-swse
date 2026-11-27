/**
 * Provisional credit ledger (Transaction & Progression SSOT, Phase 2). A DRAFT view of purchasing power for a progression/mannequin build.
 *
 * Rule-neutral by design: grant amounts, eligible categories, expiry and priority are attributes SUPPLIED BY THE CALLER (the canonical rule
 * authorities); nothing here encodes a sourcebook rule (see rules register TPS-RD-001). Pure data: it never touches an actor, an item, a setting, a
 * chat message or a persistent credit field. The committed settlement stays with TransactionEngine's execute* methods.
 *
 * Model
 *  - grant: { id, source, amount, step, ruleRef, eligibleCategories ('*' | string[]), policy ('persist' | 'expire-at-finalization'), priority }
 *    A grant limited to certain categories is RESTRICTED; '*' is unrestricted. Registering the same id twice with identical content is a no-op
 *    (idempotent); the same id with different content is refused.
 *  - purchase: { id, category, cost }. A purchase draws only from grants eligible for its category, restricted grants first (expiring before
 *    persisting), then unrestricted, then by priority, then registration order. It is funded in full or not at all (never partial); idempotent by id.
 *  - Everything is DERIVED from the ordered (grants, purchases) lists on every call, so replay after an upstream change is deterministic: purchases
 *    that are no longer affordable or eligible are reported `invalid` with a reason; they never produce a negative balance.
 *  - finalize(): the liquid credits left (unrestricted, persistent funds ONLY), the amounts that expire, the restricted remainders that stay restricted
 *    (`retainedRestricted`; how such a remainder is carried is a rule question, TPS-RD-001, never decided here), and the allocation record. Persisting any of it is the caller's TransactionEngine
 *    settlement, not this module.
 */

const POLICIES = new Set(['persist', 'expire-at-finalization']);
const QUOTE_PREFIX = '__quote__';

function fail(message) { throw new Error(`ProvisionalLedger: ${message}`); }
const money = (n) => Math.round(Number(n) * 100) / 100;

function normalizeGrant(raw) {
  const id = String(raw?.id ?? '').trim();
  if (!id) fail('a grant needs a stable id');
  const amount = money(raw.amount);
  if (!Number.isFinite(amount) || amount < 0) fail(`grant "${id}" amount must be a non-negative number`);
  const policy = raw.policy ?? 'persist';
  if (!POLICIES.has(policy)) fail(`grant "${id}" has an unknown policy "${policy}"`);
  const eligible = raw.eligibleCategories ?? '*';
  const eligibleCategories = eligible === '*' ? '*' : [...new Set((Array.isArray(eligible) ? eligible : [eligible]).map((c) => String(c)))].sort();
  if (eligibleCategories !== '*' && eligibleCategories.length === 0) fail(`grant "${id}" lists no eligible category (use '*' for unrestricted)`);
  return Object.freeze({
    id, amount, policy, eligibleCategories: eligibleCategories === '*' ? '*' : Object.freeze(eligibleCategories),
    source: raw.source ?? null, step: raw.step ?? null, ruleRef: raw.ruleRef ?? null,
    priority: Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0,
  });
}

function normalizePurchase(raw) {
  const id = String(raw?.id ?? '').trim();
  if (!id) fail('a purchase needs a stable id');
  if (id.startsWith(QUOTE_PREFIX) && !raw.__quote) fail(`purchase id "${id}" uses the reserved quote prefix`);
  const cost = money(raw.cost);
  if (!Number.isFinite(cost) || cost < 0) fail(`purchase "${id}" cost must be a non-negative number`);
  const category = String(raw.category ?? '').trim();
  if (!category) fail(`purchase "${id}" needs a category`);
  return Object.freeze({ id, category, cost });
}

const sameGrant = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isRestricted = (g) => g.eligibleCategories !== '*';
const eligibleFor = (g, category) => g.eligibleCategories === '*' || g.eligibleCategories.includes(category);

/** Funding order for a category: restricted before unrestricted, expiring before persisting, then priority (higher first), then registration order. */
function fundingOrder(grants, category) {
  return grants
    .map((g, index) => ({ g, index }))
    .filter(({ g }) => eligibleFor(g, category))
    .sort((a, b) => (isRestricted(b.g) - isRestricted(a.g))
      || ((b.g.policy === 'expire-at-finalization') - (a.g.policy === 'expire-at-finalization'))
      || (b.g.priority - a.g.priority)
      || (a.index - b.index))
    .map(({ g }) => g);
}

/** Pure evaluation of an ordered grant list and purchase list. */
export function evaluateProvisionalLedger(grants, purchases) {
  const remaining = new Map(grants.map((g) => [g.id, g.amount]));
  const allocations = [];
  const invalid = [];
  for (const p of purchases) {
    const order = fundingOrder(grants, p.category);
    const available = money(order.reduce((sum, g) => sum + remaining.get(g.id), 0));
    if (order.length === 0 && p.cost > 0) { invalid.push({ id: p.id, reason: 'no grant is eligible for this category' }); continue; }
    if (p.cost > available) { invalid.push({ id: p.id, reason: `insufficient eligible funds (${available} available, ${p.cost} needed)` }); continue; }
    let need = p.cost;
    const draws = [];
    for (const g of order) {
      if (need <= 0) break;
      const take = Math.min(need, remaining.get(g.id));
      if (take <= 0) continue;
      remaining.set(g.id, money(remaining.get(g.id) - take));
      draws.push({ grantId: g.id, amount: take });
      need = money(need - take);
    }
    allocations.push({ purchaseId: p.id, category: p.category, cost: p.cost, draws });
  }
  const left = grants.map((g) => ({ grantId: g.id, remaining: remaining.get(g.id), policy: g.policy, restricted: isRestricted(g) }));
  // Eligibility restriction and expiry are INDEPENDENT. Only an UNRESTRICTED, PERSISTENT remainder is liquid; a restricted persistent remainder stays
  // restricted (reported, never merged into liquid credits); an expiring remainder expires whether or not it is restricted.
  const expiring = money(left.filter((l) => l.policy === 'expire-at-finalization').reduce((s, l) => s + l.remaining, 0));
  const liquid = money(left.filter((l) => l.policy !== 'expire-at-finalization' && !l.restricted).reduce((s, l) => s + l.remaining, 0));
  const byGrant = new Map(grants.map((g) => [g.id, g]));
  const retainedRestricted = left
    .filter((l) => l.policy !== 'expire-at-finalization' && l.restricted && l.remaining > 0)
    .map((l) => ({ grantId: l.grantId, amount: l.remaining, eligibleCategories: [...byGrant.get(l.grantId).eligibleCategories] }));
  return { allocations, invalid, left, expiring, liquid, retainedRestricted };
}

export function createProvisionalLedger() {
  const grants = [];
  const purchases = [];
  const api = {
    registerGrant(raw) {
      const grant = normalizeGrant(raw);
      const existing = grants.find((g) => g.id === grant.id);
      if (existing) { if (!sameGrant(existing, grant)) fail(`grant "${grant.id}" is already registered with different content`); return api; }
      grants.push(grant);
      return api;
    },
    /** Remove a grant (an upstream choice changed). Purchases it funded are re-evaluated, not silently kept. */
    revokeGrant(id) {
      const i = grants.findIndex((g) => g.id === String(id));
      if (i >= 0) grants.splice(i, 1);
      return api;
    },
    /** Record a draft purchase (idempotent by id). Returns its current evaluation; an unaffordable purchase stays recorded as invalid for correction. */
    purchase(raw) {
      const p = normalizePurchase(raw);
      const existing = purchases.find((x) => x.id === p.id);
      if (existing) { if (existing.category !== p.category || existing.cost !== p.cost) fail(`purchase "${p.id}" is already recorded with different content`); }
      else purchases.push(p);
      return api.statusOf(p.id);
    },
    removePurchase(id) {
      const i = purchases.findIndex((p) => p.id === String(id));
      if (i >= 0) purchases.splice(i, 1);
      return api;
    },
    /** Would this purchase be fully funded right now (after all recorded purchases)? Read-only. */
    quote(raw) {
      // the quote id is internal: a caller-supplied id is ignored and can never match a recorded purchase
      const quoteId = `${QUOTE_PREFIX}${purchases.length}`;
      const p = normalizePurchase({ category: raw?.category, cost: raw?.cost, id: quoteId, __quote: true });
      const out = evaluateProvisionalLedger(grants, [...purchases, p]);
      const bad = out.invalid.find((x) => x.id === quoteId);
      return bad ? { affordable: false, reason: bad.reason } : { affordable: true, draws: out.allocations.at(-1).draws.map((d) => ({ ...d })) };
    },
    statusOf(id) {
      const out = evaluateProvisionalLedger(grants, purchases);
      const bad = out.invalid.find((x) => x.id === String(id));
      if (bad) return { id: String(id), valid: false, reason: bad.reason };
      const alloc = out.allocations.find((a) => a.purchaseId === String(id));
      return alloc ? { id: String(id), valid: true, draws: alloc.draws } : { id: String(id), valid: false, reason: 'unknown purchase' };
    },
    /** Deterministic re-evaluation: `valid` allocations and `invalid` purchases that need correction. */
    replay() { const out = evaluateProvisionalLedger(grants, purchases); return { valid: out.allocations, invalid: out.invalid }; },
    /** Balances for display: restricted / unrestricted remaining, funds that will expire, purchasing power for a category. */
    balances(category = null) {
      const out = evaluateProvisionalLedger(grants, purchases);
      const byId = new Map(grants.map((g) => [g.id, g]));
      const restricted = money(out.left.filter((l) => l.restricted).reduce((s, l) => s + l.remaining, 0));
      const unrestricted = money(out.left.filter((l) => !l.restricted).reduce((s, l) => s + l.remaining, 0));
      const result = { restricted, unrestricted, expiring: out.expiring, liquid: out.liquid };
      if (category !== null) result.eligiblePurchasingPower = money(out.left.filter((l) => eligibleFor(byId.get(l.grantId), String(category))).reduce((s, l) => s + l.remaining, 0));
      return result;
    },
    /** Finalization view: only VALID purchases settle; restricted/expiring residuals expire and never become liquid credits. Pure: persists nothing. */
    finalize() {
      const out = evaluateProvisionalLedger(grants, purchases);
      return { liquidCredits: out.liquid, expired: out.expiring, retainedRestricted: out.retainedRestricted, allocations: out.allocations, invalid: out.invalid, complete: out.invalid.length === 0 };
    },
    snapshot() { return { grants: grants.map((g) => ({ ...g, eligibleCategories: g.eligibleCategories === '*' ? '*' : [...g.eligibleCategories] })), purchases: purchases.map((p) => ({ ...p })) }; },
  };
  return api;
}

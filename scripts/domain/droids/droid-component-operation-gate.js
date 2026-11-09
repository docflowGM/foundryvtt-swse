/**
 * Droid component operation gate (pure; no Foundry globals; nothing is written).
 *
 * May this actor OPERATE a droid component (weapon attack, self-destruct, any mechanical effect of an installed system)? A component being
 * visible, hydrated from the part catalog, carrying a weapon profile or having a button on a sheet is NOT permission. Operation requires that the
 * existing installed-component authority establishes the hardware as installed:
 *
 *   OPERABLE   the installation LEDGER is the component's primary source, it is installed, and it is not disabled
 *              (the same predicate `componentMayContributeDroidModifiers` applies to modifiers, plus the ledger's own enabled flag)
 *   DISABLED   ledger-confirmed but disabled
 *   DRAFT      only a `system.droidSystems` record (Garage/builder draft or display mirror)
 *   ITEM_ONLY  only an embedded Item (present, not ledger-confirmed)
 *   UNRESOLVED nothing (or only a legacy record, or an ambiguous multi-instance reference) establishes it; source disagreements are already resolved by the
 *              resolver's own precedence (ledger first), so they are not re-litigated here
 *   NOT_DROID  the Droid rules profile does not classify the actor as a droid (contradictory classification included)
 *
 * This composes the existing resolver and rules profile; it is not a second installation verifier. Inspection is never gated by it: only
 * execution is. Ordinary handheld weapons are not droid components and are never evaluated here.
 */
import { resolveDroidRulesProfile, componentMayContributeDroidModifiers } from './droid-rules-profile.js';
import { resolveInstalledDroidComponents, DROID_COMPONENT_SOURCE_KIND as KIND } from './droid-installed-component-resolver.js';

export const DROID_OPERATION_STATUS = Object.freeze({ OPERABLE: 'OPERABLE', DISABLED: 'DISABLED', DRAFT: 'DRAFT', ITEM_ONLY: 'ITEM_ONLY', UNRESOLVED: 'UNRESOLVED', NOT_DROID: 'NOT_DROID' });

const REASON = Object.freeze({
  OPERABLE: null,
  DISABLED: 'This component is installed but disabled.',
  DRAFT: 'This component exists only as a Garage/builder draft record; it is not confirmed in the installation ledger.',
  ITEM_ONLY: 'This component exists only as an embedded Item; it is not confirmed in the installation ledger.',
  UNRESOLVED: 'The installation evidence does not establish this component.',
  NOT_DROID: 'This actor is not classified as a droid by the Droid rules profile.',
});

/**
 * Identity matching shared by the execution gate and the component browser (one matcher, no stale-instance fallback).
 *   - a supplied instanceId must match EXACTLY; a wrong/stale instance never falls back to another installation
 *   - a supplied canonical part must agree with whatever the instance / Item resolved to
 *   - a supplied embedded-Item id resolves only through the resolver's own Item-to-component association (`sources[].itemId`); an Item that is
 *     not part of an installation never inherits a same-type installation. If the relationship cannot be established it fails closed
 *   - a bare canonical id is accepted only when it names exactly one component (several installations require an instance)
 * @returns {{component:object|null, refusal:string|null}}
 */
export function findInstalledComponent(components, ref = {}, normalizeId = (v) => String(v ?? '').trim().toLowerCase()) {
  const list = Array.isArray(components) ? components : [];
  const instanceId = ref.instanceId ? String(ref.instanceId) : null;
  const itemId = ref.itemId ? String(ref.itemId) : null;
  const rawCanonical = ref.ruleId ?? ref.partId ?? null;
  const canonical = rawCanonical ? normalizeId(rawCanonical) : '';
  const nameCanonical = !canonical && ref.name ? normalizeId(ref.name) : '';
  const want = canonical || nameCanonical;
  let component = null;
  if (instanceId) {
    component = list.find((c) => c.instanceId === instanceId) ?? null;
    if (!component) return { component: null, refusal: 'No installed component has that physical instance; the reference is stale or wrong.' };
  } else if (itemId) {
    component = list.find((c) => (c.sources ?? []).some((src) => src.itemId && String(src.itemId) === itemId)) ?? null;
    if (!component) return { component: null, refusal: 'This Item is not part of any installation record.' };
    // several Items collapsing into one installation cannot be told apart (no per-Item installation identity exists): fail closed
    if (!component.instanceId && (component.sources ?? []).filter((src) => src.itemId).length > 1) return { component: null, refusal: 'Several Items share this installation record; which one is installed is not established.' };
  } else if (want) {
    const matches = list.filter((c) => c.canonicalId === want);
    if (matches.length > 1) return { component: null, refusal: 'Several installed instances match; name the physical instance.' };
    component = matches[0] ?? null;
  }
  if (component && want && component.canonicalId !== want) return { component: null, refusal: 'The requested component does not match the installed component at that identity.' };
  if (component && itemId && instanceId && !(component.sources ?? []).some((src) => src.itemId && String(src.itemId) === itemId)) {
    return { component: null, refusal: 'This Item is not the Item behind that installed instance.' };
  }
  return { component, refusal: null };
}

/**
 * @param {object} actor
 * @param {{instanceId?:string|null, itemId?:string|null, ruleId?:string|null, partId?:string|null, name?:string|null}} ref  what the caller knows about the component
 * @param {{normalizeId?:(v:any)=>string, getDefinition?:(id:string)=>object|null}} [deps] injected so this module stays pure (production: droid-part-schema)
 * @returns {{ok:boolean, status:string, reason:string|null, component:object|null}}
 */
export function authorizeDroidComponentOperation(actor, ref = {}, deps = {}) {
  const profile = resolveDroidRulesProfile(actor);
  if (!profile.droidRules.isDroid) return { ok: false, status: DROID_OPERATION_STATUS.NOT_DROID, reason: REASON.NOT_DROID, component: null };
  const normalizeId = typeof deps.normalizeId === 'function' ? deps.normalizeId : (v) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const resolution = resolveInstalledDroidComponents(actor, { normalizeId, getDefinition: deps.getDefinition });
  const components = Array.isArray(resolution?.components) ? resolution.components : [];
  const found = findInstalledComponent(components, ref, normalizeId);
  if (found.refusal) return { ok: false, status: DROID_OPERATION_STATUS.UNRESOLVED, reason: found.refusal, component: null };
  const component = found.component;
  if (!component) return { ok: false, status: DROID_OPERATION_STATUS.UNRESOLVED, reason: REASON.UNRESOLVED, component: null };

  const kind = component.primarySource?.kind;
  if (kind === KIND.INSTALLED_LEDGER && componentMayContributeDroidModifiers(actor, component, profile)) {
    return component.enabled === false
      ? { ok: false, status: DROID_OPERATION_STATUS.DISABLED, reason: REASON.DISABLED, component }
      : { ok: true, status: DROID_OPERATION_STATUS.OPERABLE, reason: null, component };
  }
  if (kind === KIND.EMBEDDED_ITEM) return { ok: false, status: DROID_OPERATION_STATUS.ITEM_ONLY, reason: REASON.ITEM_ONLY, component };
  if (kind === KIND.DROID_SYSTEMS_RECORD) return { ok: false, status: DROID_OPERATION_STATUS.DRAFT, reason: REASON.DRAFT, component };
  return { ok: false, status: DROID_OPERATION_STATUS.UNRESOLVED, reason: REASON.UNRESOLVED, component };
}

export default { authorizeDroidComponentOperation, findInstalledComponent, DROID_OPERATION_STATUS };

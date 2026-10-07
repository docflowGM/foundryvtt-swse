// Phase 5D-B -- player-selectable canonical attack forms.
// Derives the legal attack forms of a canonical weapon FROM the resolver (WeaponRuntimeResolver is the authority):
// every candidate is verified by actually resolving it, so an illegal profile/configuration/mode combination can never be
// offered. Submitted values are canonical ids only; labels are display text and never identity. Pure (no actor, no mutation).
//   legacy/custom weapon          -> { source: 'legacy' }
//   canonical, one meaningful form -> forms.length === 1 (callers show no selector)
//   canonical, several             -> forms.length > 1 (selector shown)
// A form is { value, profileId, configurationId, modeId, branch, label }. Dimensions are included only when meaningful:
//   configuration: >1 usable (attackUsable !== false) configurations; mode: a mode that pins exactly one attack profile
//   (multi-profile modes such as double-weapon full-attack belong to a later phase); payload: >1 payloads (separate list).
import { WeaponRuntimeError } from './errors.js';
import { resolveAttackWeaponRuntime } from './attack-consumer.js';
import { getSharedWeaponAuthorityRegistry } from './weapon-authority-registry.js';
import { resolveCanonicalIdentity } from './canonical-identity.js';
import { WeaponRuntimeResolver } from './weapon-runtime-resolver.js';
import { resolveCanonicalRange } from './canonical-range.js';
import { resolveCanonicalResourceCost } from './canonical-resource.js';

const SEP = '|';
export const attackFormValue = ({ profileId, configurationId = null, modeId = null }) =>
  [profileId, configurationId ?? '', modeId ?? ''].join(SEP).replace(/\|+$/, '');

/** Look a submitted selector value up in the offered forms (never parsed from text). */
export function findAttackForm(forms, value) { return (forms ?? []).find((f) => f.value === value) ?? null; }

/** Selection keys to hand to computeFinalAttackComposition for a form. */
export function attackFormSelection(form) {
  if (!form) return {};
  const sel = { profileId: form.profileId };
  if (form.configurationId) sel.configurationId = form.configurationId;
  if (form.modeId) sel.modeId = form.modeId;
  return sel;
}

export function buildAttackForms(weapon, requested = {}) {
  const registry = getSharedWeaponAuthorityRegistry();
  if (!weapon || !registry) return { source: 'legacy', forms: [] };
  const id = resolveCanonicalIdentity(weapon, registry);
  if (id.kind === 'legacy') return { source: 'legacy', forms: [] };
  const resolver = new WeaponRuntimeResolver(registry);
  const base = resolver.resolveIdentity(id.identityKey, weapon, {}, id.via);

  const configs = base.configurationStates.filter((c) => c.attackUsable !== false);
  const useConfigs = configs.length > 1;
  const singleModes = base.operatingModes.filter((m) => m.attackProfileId && base.profiles.some((p) => p.id === m.attackProfileId));
  const anyPinned = base.profiles.some((p) => p.availableIn);
  const pinned = new Set(singleModes.map((m) => m.attackProfileId));
  const options = [
    ...singleModes.map((m) => ({ profileId: m.attackProfileId, modeId: m.id, label: m.label ?? m.id })),
    ...base.profiles.filter((p) => !pinned.has(p.id)).map((p) => ({ profileId: p.id, modeId: null, label: p.label ?? p.id })),
  ];

  const forms = [];
  for (const opt of options) {
    const profile = base.profiles.find((p) => p.id === opt.profileId);
    // a profile pinned to configurations offers exactly those; a profile valid in every configuration only multiplies by
    // configuration when NO profile of the weapon is pinned (configuration is then an independent dimension, e.g. mounted-bayonet)
    const cfgIds = !useConfigs ? [null]
      : profile.availableIn ? configs.filter((c) => profile.availableIn.includes(c.id)).map((c) => c.id)
      : (anyPinned ? [null] : configs.map((c) => c.id));
    for (const configurationId of cfgIds) {
      const ctx = { profileId: opt.profileId, ...(configurationId ? { configurationId } : {}), ...(opt.modeId ? { modeId: opt.modeId } : {}) };
      let resolved;
      let range;
      try {
        resolved = resolver.resolveIdentity(id.identityKey, weapon, ctx, id.via);
        range = resolveCanonicalRange(resolved, resolved.profiles.find((p) => p.id === resolved.selection.profileId)); // a form whose range contradicts its branch is never offered
      } catch (err) { if (err instanceof WeaponRuntimeError) continue; throw err; }
      const sel = resolved.selection;
      const cfgLabel = configurationId ? base.configurationStates.find((c) => c.id === configurationId)?.label ?? configurationId : null;
      forms.push(Object.freeze({
        value: attackFormValue({ profileId: sel.profileId, configurationId, modeId: opt.modeId }),
        profileId: sel.profileId, configurationId, modeId: opt.modeId,
        branch: resolved.profiles.find((p) => p.id === sel.profileId)?.branch ?? null,
        // Phase 5D-D (display + validation data only; the runtime resolves the same facets again at attack time)
        range: Object.freeze({ status: range.status, allowedBands: range.allowedBands, bandSquares: range.bandSquares, basePenalties: range.basePenalties, shortPenaltyOverride: range.shortPenaltyOverride }),
        ammoUnits: (() => { const c = resolveCanonicalResourceCost({ resolved, profile: resolved.profiles.find((p) => p.id === sel.profileId) }); return c.status === 'pending' ? null : c.units; })(),
        label: cfgLabel ? `${opt.label} · ${cfgLabel}` : opt.label,
      }));
    }
  }

  // the form the resolver would pick with no explicit selection (or the caller's preselection)
  const pre = resolveAttackWeaponRuntime(weapon, requested); // throws on an invalid preselection (fail closed)
  const wanted = pre.resolved.selection;
  const selected = forms.find((f) => f.profileId === wanted.profileId && (!f.configurationId || f.configurationId === wanted.configurationId) && (!requested.modeId || f.modeId === requested.modeId))
    ?? forms.find((f) => f.profileId === wanted.profileId) ?? forms[0] ?? null;

  const payloads = base.payloads.length > 1
    ? base.payloads.map((p) => Object.freeze({ value: p.id, payloadId: p.id, label: p.label ?? p.id, default: p.default === true }))
    : [];
  return { source: 'canonical', identityKey: id.identityKey, forms: Object.freeze(forms), selected, payloads: Object.freeze(payloads), defaultPayloadId: pre.resolved.selection.payloadId };
}

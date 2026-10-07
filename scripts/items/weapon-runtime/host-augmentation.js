// Phase 5B-R -- host-weapon configuration augmentation (generic).
//   attached/configured weapon + host weapon  ->  additional profile/configuration behaviour on the host
// First required case: a rifle with a mounted Vibrobayonet may be wielded as a double weapon (vibrobayonet end + club end).
// Declarative: operation.hostWeaponAugmentation[configurationId] = { hostWeaponGroup, availableWhen[], grantsDoubleWeapon:{ends[]} }.
// No weapon names, no global double-weapon flags; ends are canonical delegations to registry profiles. Attack count, penalties and
// full-round behaviour stay with the existing double-weapon rules. Conditions go through the hybrid AUTO/PROMPT policy.
import { evaluateCondition } from './condition-policy.js';
import { deepFreeze } from './deep-freeze.js';

export function resolveHostAugmentations(resolved, registry, context = {}) {
  const table = resolved?.operation?.hostWeaponAugmentation ?? {};
  const out = [];
  for (const [configurationId, aug] of Object.entries(table)) {
    const active = resolved.selection?.configurationId === configurationId;
    const ends = (aug.grantsDoubleWeapon?.ends ?? []).map((e) => {
      const rec = registry.getByIdentityKey(e.resolveAsIdentityKey);
      const profile = rec?.canonicalStats?.attackProfiles?.find((p) => p.id === e.resolveAsProfileId) ?? null;
      return { id: e.id, identityKey: e.resolveAsIdentityKey, profileId: e.resolveAsProfileId, definition: profile, resolvable: !!profile };
    });
    const pending = [];
    let available = active;
    if (active) {
      const ctx = { ...context, configurationId: resolved.selection.configurationId };
      let unknown = false;
      for (const r of aug.availableWhen ?? []) {
        const ev = evaluateCondition(r.condition, ctx);
        pending.push(...ev.pending);
        if (ev.value === null) { unknown = true; continue; }
        const ok = r.negate ? !ev.value : ev.value;
        if (!ok) { available = false; unknown = false; break; }
      }
      if (available && unknown) available = null;
    }
    out.push({ configurationId, active, hostWeaponGroup: aug.hostWeaponGroup ?? null, available, pending, doubleWeapon: ends.every((e) => e.resolvable) ? { ends } : null });
  }
  return deepFreeze(out);
}

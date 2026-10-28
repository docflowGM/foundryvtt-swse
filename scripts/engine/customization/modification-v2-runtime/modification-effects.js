/**
 * Modification V2 effects -- DERIVED from the verified catalog, never baked into the Item and never trusted from Item flags.
 *
 * An installed instance only names WHICH definition is installed (typedDefinitionId), its state and its basis. The effect operations come
 * from the verified, pinned runtime catalog, and only from definitions whose mechanics are EFFECTS_CERTIFIED. An instance contributes when:
 *   - state === 'installed' (a deactivated or failed upgrade contributes nothing), and
 *   - it is canonical (the definition is runtime-selectable -- none is yet), or it was installed under the GM development policy while the
 *     development setting is on.
 * Provisional GM-adjudicated installs never automate effects (Q-029). Removing, deactivating or turning the setting off restores the
 * original behavior with no write. With no verified catalog loaded, nothing applies (fail closed).
 */
import { getVerifiedModificationData } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-store.js';
import { DEVELOPMENT_BASIS, isDevelopmentModeEnabled } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-development-mode.js';

const TARGETS = Object.freeze({ SHOTS_PER_POWER_PACK: 'weapon.reload.shotsPerPowerPack' });

/** Certified operations of the active instances on an Item, optionally for one target. */
export function activeEffectOperations(item, target = null, { data = getVerifiedModificationData(), developmentMode = isDevelopmentModeEnabled() } = {}) {
  const list = item?.flags?.['foundryvtt-swse']?.customization?.installedUpgrades;
  if (!Array.isArray(list) || !data?.ok) return [];
  const ops = [];
  for (const inst of list) {
    if (!inst || inst.state !== 'installed' || typeof inst.typedDefinitionId !== 'string') continue;
    const found = data.catalog.getTyped(inst.typedDefinitionId);
    if (!found || found.domain !== item.type || found.parent?.provenance?.mechanicalCertification !== 'EFFECTS_CERTIFIED') continue;
    const canonical = found.typed.runtimeSelectable === true && inst.provisional !== true;
    const development = inst.basis === DEVELOPMENT_BASIS && developmentMode === true;
    if (!canonical && !development) continue;
    for (const op of found.typed.effects?.operations ?? []) if (op && (!target || op.target === target)) ops.push({ ...op, instanceId: inst.instanceId });
  }
  return ops;
}

/** Effective tracked shot capacity: the base pool multiplied by certified "shots per power pack" multipliers. */
export function effectiveShotCapacity(item, base, options = {}) {
  const n = Number(base);
  if (!Number.isFinite(n) || n <= 0) return Number.isFinite(n) ? n : 0;
  let factor = 1;
  for (const op of activeEffectOperations(item, TARGETS.SHOTS_PER_POWER_PACK, options)) {
    if (op.operation === 'multiply' && Number.isFinite(op.value) && op.value > 0) factor *= op.value;
  }
  return Math.floor(n * factor);
}

export { TARGETS as EFFECT_TARGETS };
export default { activeEffectOperations, effectiveShotCapacity, EFFECT_TARGETS: TARGETS };

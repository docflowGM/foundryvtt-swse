/**
 * Computes a STRICT canonical ActorEngine embedded-Item update for a scaling
 * class feature. Only source-tagged auto-granted class-feature Items may update;
 * other feats with the same display name must never be modified.
 *
 * The class pack -> entitlement manifest is the sole authority for amounts.
 */
export function planScalingClassFeatureUpdate(actorItems, feature) {
  const key = String(feature?.system?.featureKey || '').trim();
  if (!key) return null; // unrelated legacy scaling features follow existing path
  if (feature?.system?.progressionFeatureType !== 'scaling_feature') {
    throw new Error(`Class feature ${key} must use scaling_feature entitlement type`);
  }
  const next = Number(feature.system.value);
  if (!Number.isFinite(next) || next < 0) {
    throw new Error(`Class feature ${key} has an invalid scaling value`);
  }
  const items = Array.from(actorItems?.contents || actorItems || []);
  const matches = items.filter(item => item?.type === 'feat'
    && item?.system?.sourceType === 'class-feature'
    && item?.system?.featureKey === key);
  if (matches.length > 1) throw new Error(`Duplicate granted class-feature identity: ${key}`);
  if (!matches.length) return null;
  const existing = matches[0];
  const previous = Number(existing.system.value);
  const oldLevel = Number(existing.system.grantedClassLevel || 0);
  if (Number.isFinite(previous) && next < previous) {
    throw new Error(`Scaling feature ${key} would regress from ${previous} to ${next}`);
  }
  if (Number(feature.classLevel) < oldLevel) {
    throw new Error(`Scaling feature ${key} would regress its class level`);
  }
  if (Number.isFinite(previous) && previous === next) return { found:true, update:null };
  const id = existing._id || existing.id;
  if (!id) throw new Error(`Existing class-feature ${key} has no embedded Item identity`);
  return {
    found:true,
    update:{
      _id:id,
      name: feature.name,
      'system.value':next,
      'system.unit':feature.system.unit || null,
      'system.grantedClassLevel':feature.classLevel,
      'system.featureKey':key,
    },
  };
}

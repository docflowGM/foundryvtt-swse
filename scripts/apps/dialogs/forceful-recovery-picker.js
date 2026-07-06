import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";

function escapeHtml(value = '') {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function descriptorsFor(power) {
  const system = power?.system ?? {};
  const raw = [];
  const add = value => {
    if (Array.isArray(value)) value.forEach(add);
    else if (value != null && String(value).trim()) raw.push(String(value).trim());
  };
  add(system.descriptor);
  add(system.descriptors);
  add(system.tags);
  add(system.discipline);
  return [...new Set(raw)].slice(0, 5);
}

function sortPowers(powers = []) {
  return [...powers].sort((a, b) => {
    const aForm = ForceExecutor.isLightsaberFormPower(a) ? 0 : 1;
    const bForm = ForceExecutor.isLightsaberFormPower(b) ? 0 : 1;
    if (aForm !== bForm) return aForm - bForm;
    return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
  });
}

function buildPowerRows(powers = []) {
  return sortPowers(powers).map((power, index) => {
    const isForm = ForceExecutor.isLightsaberFormPower(power);
    const descriptors = descriptorsFor(power);
    const subtitle = descriptors.length ? descriptors.join(', ') : (isForm ? 'Lightsaber Form Power' : 'Force Power');
    return `<label class="swse-forceful-recovery-option">
      <input type="radio" name="powerId" value="${escapeHtml(power.id)}" ${index === 0 ? 'checked' : ''} />
      <span class="swse-forceful-recovery-option__body">
        <span class="swse-forceful-recovery-option__name">${escapeHtml(power.name)}</span>
        <span class="swse-forceful-recovery-option__meta">${isForm ? 'Lightsaber Form Power' : 'Force Power'}${subtitle ? ` · ${escapeHtml(subtitle)}` : ''}</span>
      </span>
    </label>`;
  }).join('');
}

export function getForcefulRecoveryCandidates(actor) {
  return MetaResourceFeatResolver.getRecoverableForcePowers(actor);
}

export async function promptForcefulRecoveryPower(actor, options = {}) {
  if (!actor) return { success: false, reason: 'Actor not found.' };
  const candidates = getForcefulRecoveryCandidates(actor);
  if (!candidates.length) {
    const message = options.emptyMessage || 'There are no valid Force powers or lightsaber form powers to recover.';
    ui?.notifications?.info?.(message);
    return { success: false, reason: 'no-valid-force-powers', message };
  }

  const content = `<form class="swse-dialog swse-forceful-recovery-picker">
    <p>Forceful Recovery lets you return one expended Force Power to your Force Power Suite after catching a Second Wind.</p>
    <div class="swse-forceful-recovery-list">
      ${buildPowerRows(candidates)}
    </div>
    <p class="notes">Eligible entries include spent Force powers and spent Lightsaber Form powers from your discard pile.</p>
  </form>`;

  const pickedPowerId = await SWSEDialogV2.prompt({
    title: 'Forceful Recovery',
    content,
    label: 'Recover Power',
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      const fd = new FormData(form);
      return String(fd.get('powerId') || '');
    },
    options: {
      width: 520,
      classes: ['swse-forceful-recovery-picker-app']
    }
  });

  if (!pickedPowerId) return { success: false, reason: 'cancelled' };
  const result = await MetaResourceFeatResolver.recoverForcefulRecoveryPower(actor, pickedPowerId);
  if (result?.success) {
    ui?.notifications?.info?.(`${result.powerName || 'Force power'} recovered through Forceful Recovery.`);
  } else {
    ui?.notifications?.warn?.(result?.reason || result?.error || 'Forceful Recovery could not recover that power.');
  }
  return result;
}

export default promptForcefulRecoveryPower;

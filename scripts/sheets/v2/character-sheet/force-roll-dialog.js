/**
 * Force power roll configuration dialog.
 * UI-only helper for character/NPC sheets; force execution remains in ForceExecutor.
 */

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value = '') {
  if (value && typeof value === 'object') {
    value = value.value ?? value.description ?? value.text ?? value.label ?? '';
  }
  const text = String(value ?? '');
  if (!text) return '';
  const div = document.createElement('div');
  div.innerHTML = text;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value = '') {
  return foundry?.utils?.escapeHTML?.(String(value ?? ''))
    ?? String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function getUseTheForceTotal(actor) {
  const candidates = [
    actor?.system?.derived?.skillsByKey?.useTheForce?.total,
    actor?.system?.derived?.skills?.useTheForce?.total,
    actor?.system?.skills?.useTheForce?.total,
    actor?.system?.skills?.useTheForce?.value,
    actor?.system?.skills?.useTheForce?.mod
  ];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function getBaseDc(power) {
  const system = power?.system ?? {};
  const firstChartDc = Array.isArray(system.dcChart) ? system.dcChart.find(row => row?.dc != null)?.dc : null;
  return toNumber(system.useTheForce ?? system.dc ?? system.DC ?? firstChartDc, 10) || 10;
}

function fieldValue(html, name) {
  const root = html?.[0] ?? html;
  const found = root?.querySelector?.(`[name="${name}"]`);
  if (found) return found.type === 'checkbox' ? found.checked : found.value;
  const jq = html?.find?.(`[name="${name}"]`);
  if (jq?.length) return jq.attr('type') === 'checkbox' ? jq.prop('checked') : jq.val();
  return null;
}

export async function promptForcePowerRollOptions({ actor, power, sourceElement = null } = {}) {
  if (!actor || !power) return null;

  const baseBonus = getUseTheForceTotal(actor);
  const baseDC = getBaseDc(power);
  const fpValue = Number(actor?.system?.forcePoints?.value ?? actor?.system?.resources?.forcePoints?.value ?? 0) || 0;
  const boosted = !!sourceElement?.closest?.('.fcard')?.querySelector?.('[data-action="force-suite-toggle-fp-boost"].on');
  const summary = cleanText(power?.system?.effect || power?.system?.summary || power?.system?.description || '');
  const dcRows = Array.isArray(power?.system?.dcChart) ? power.system.dcChart.slice(0, 4) : [];
  const rowsHtml = dcRows.length ? `
    <div class="swse-force-roll-dialog__tiers">
      ${dcRows.map(row => `<span><b>DC ${escapeHtml(row.dc ?? '')}</b> ${escapeHtml(cleanText(row.effect || row.description || ''))}</span>`).join('')}
    </div>` : '';

  const content = `
    <form class="swse-force-roll-dialog">
      <p class="swse-force-roll-dialog__hint">Configure the Use the Force check before expending <strong>${escapeHtml(power.name)}</strong>.</p>
      ${summary ? `<p class="swse-force-roll-dialog__summary">${escapeHtml(summary)}</p>` : ''}
      ${rowsHtml}
      <div class="form-group">
        <label>Use the Force total</label>
        <input type="number" name="baseBonus" value="${baseBonus}" step="1">
      </div>
      <div class="form-group">
        <label>Situational modifier</label>
        <input type="number" name="customModifier" value="0" step="1">
      </div>
      <div class="form-group">
        <label>Target DC</label>
        <input type="number" name="baseDC" value="${baseDC}" step="1">
      </div>
      <div class="form-group swse-force-roll-dialog__check">
        <label>
          <input type="checkbox" name="useForce" ${boosted ? 'checked' : ''} ${fpValue <= 0 ? 'disabled' : ''}>
          Spend Force Point for bonus die ${fpValue <= 0 ? '(none available)' : `(${fpValue} available)`}
        </label>
      </div>
    </form>`;

  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    new Dialog({
      title: `Use ${power.name}`,
      content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll / Use',
          callback: html => finish({
            baseBonus: toNumber(fieldValue(html, 'baseBonus'), baseBonus),
            customModifier: toNumber(fieldValue(html, 'customModifier'), 0),
            baseDC: toNumber(fieldValue(html, 'baseDC'), baseDC),
            useForce: fieldValue(html, 'useForce') === true
          })
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => finish(null)
        }
      },
      default: 'roll',
      close: () => finish(null)
    }).render(true);
  });
}

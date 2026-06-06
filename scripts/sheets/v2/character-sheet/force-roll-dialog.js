import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

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
    <div class="rcd-tiers">
      ${dcRows.map(row => `<div class="rcd-tier"><span class="rcd-tier-dc">DC ${escapeHtml(row.dc ?? '')}</span><span class="rcd-tier-fx">${escapeHtml(cleanText(row.effect || row.description || ''))}</span></div>`).join('')}
    </div>` : '';

  const content = `
    <div class="swse-force-roll-config rcd" style="--accent-rgb:180,140,255">
      <header class="rcd-header">
        <div class="rcd-header-bg"></div>
        <div class="rcd-header-content">
          <span class="rcd-type-chip">◇ Force</span>
          <span class="rcd-roll-name">${escapeHtml(power.name)}</span>
          <span class="rcd-actor">${escapeHtml(actor.name ?? 'Actor')}</span>
        </div>
      </header>
      <div class="rcd-formula-strip">
        <span class="rcd-formula-text">1d20 + Use the Force</span>
        <span class="rcd-formula-base-mod">base +${baseBonus}</span>
        <span class="rcd-formula-chips"><span class="rcd-fchip">power</span><span class="rcd-fchip">dc ${baseDC}</span></span>
      </div>
      <div class="rcd-body">
        <form class="swse-force-roll-dialog rcd-main">
          <section class="swse-roll-config-panel">
            <h4>Power Intel</h4>
            <p class="swse-roll-config-note">Configure the Use the Force check before expending <strong>${escapeHtml(power.name)}</strong>.</p>
            ${summary ? `<p class="swse-force-roll-dialog__summary">${escapeHtml(summary)}</p>` : ''}
            ${rowsHtml}
          </section>
          <section class="swse-roll-config-panel">
            <h4>Roll Inputs</h4>
            <div class="swse-roll-config-grid">
              <label>Use the Force Total<input type="number" name="baseBonus" value="${baseBonus}" step="1"></label>
              <label>Situational Modifier<input type="number" name="customModifier" value="0" step="1"></label>
              <label>Target DC<input type="number" name="baseDC" value="${baseDC}" step="1"></label>
            </div>
          </section>
          <section class="swse-roll-config-panel swse-roll-config-panel--resources">
            <h4>Resources</h4>
            <label class="rcd-resource ${boosted ? 'rcd-res-active' : ''} ${fpValue <= 0 ? 'rcd-resource-disabled' : ''}">
              <span class="rcd-res-header"><input type="checkbox" name="useForce" ${boosted ? 'checked' : ''} ${fpValue <= 0 ? 'disabled' : ''}> <span class="rcd-res-icon">✦</span><span class="rcd-res-name">Spend Force Point</span></span>
              <span class="rcd-res-detail">${fpValue <= 0 ? 'No Force Points available.' : `${fpValue} Force Points available.`}</span>
            </label>
          </section>
        </form>
        <aside class="rcd-rail">
          <section class="rcd-rail-sec rcd-rail-sec--preview">
            <div class="rcd-rail-lbl">Projected Outcome</div>
            <div class="rcd-preview-formula">1d20 + ${baseBonus}</div>
            <div class="rcd-preview-total">${baseBonus + 10}</div>
            <div class="rcd-preview-label">Take 10 reference</div>
            <div class="rcd-preview-dc ${(baseBonus + 10) >= baseDC ? 'pass' : 'fail'}">Take 10 ${(baseBonus + 10) >= baseDC ? 'meets' : 'misses'} DC ${baseDC}</div>
          </section>
          <section class="rcd-rail-sec">
            <div class="rcd-rail-lbl">Execution</div>
            <p class="swse-roll-config-note">The final roll is still handled by the Force executor. This dialog only collects bonuses, DC, and Force Point intent.</p>
          </section>
        </aside>
      </div>
    </div>`;

  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    new SWSEDialogV2({
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
    }, {
      id: 'swse-force-roll-config',
      classes: ['swse-roll-config-dialog-v2', 'swse-force-roll-dialog-app'],
      width: 900,
      height: 640,
      resizable: true
    }).render(true);
  });
}


export async function promptForceRegimenRollOptions({ actor, regimen, sourceElement = null } = {}) {
  if (!actor || !regimen) return null;

  const baseBonus = getUseTheForceTotal(actor);
  const rows = Array.isArray(regimen?.system?.dcTiers) ? regimen.system.dcTiers : [];
  const firstDc = rows.map(row => String(row?.dc ?? '').match(/\d+/)?.[0]).find(Boolean);
  const baseDC = toNumber(regimen?.system?.dc ?? firstDc, 10) || 10;
  const fpValue = Number(actor?.system?.forcePoints?.value ?? actor?.system?.resources?.forcePoints?.value ?? 0) || 0;
  const boosted = !!sourceElement?.closest?.('.fcard')?.querySelector?.('[data-action="force-suite-toggle-fp-boost"].on');
  const summary = cleanText(regimen?.system?.summary || regimen?.system?.effect || regimen?.system?.descriptionText || regimen?.system?.description || '');
  const rowsHtml = rows.length ? `
    <div class="rcd-tiers">
      ${rows.map(row => `<div class="rcd-tier"><span class="rcd-tier-dc">DC ${escapeHtml(row.dc ?? '')}</span><span class="rcd-tier-fx">${escapeHtml(cleanText(row.effect || row.description || ''))}</span></div>`).join('')}
    </div>` : '';

  const content = `
    <div class="swse-force-roll-config rcd swse-force-regimen-roll-config" style="--accent-rgb:120,210,255">
      <header class="rcd-header">
        <div class="rcd-header-bg"></div>
        <div class="rcd-header-content">
          <span class="rcd-type-chip">⬢ Regimen</span>
          <span class="rcd-roll-name">${escapeHtml(regimen.name)}</span>
          <span class="rcd-actor">${escapeHtml(actor.name ?? 'Actor')}</span>
        </div>
      </header>
      <div class="rcd-formula-strip">
        <span class="rcd-formula-text">1d20 + Use the Force</span>
        <span class="rcd-formula-base-mod">base +${baseBonus}</span>
        <span class="rcd-formula-chips"><span class="rcd-fchip">regimen</span><span class="rcd-fchip">dc ${baseDC}</span></span>
      </div>
      <div class="rcd-body">
        <form class="swse-force-roll-dialog rcd-main">
          <section class="swse-roll-config-panel">
            <h4>Regimen Intel</h4>
            <p class="swse-roll-config-note">Configure the Use the Force check before performing <strong>${escapeHtml(regimen.name)}</strong>. Only one Force Regimen can be active until long rest or End Effect.</p>
            ${summary ? `<p class="swse-force-roll-dialog__summary">${escapeHtml(summary)}</p>` : ''}
            ${rowsHtml}
          </section>
          <section class="swse-roll-config-panel">
            <h4>Roll Inputs</h4>
            <div class="swse-roll-config-grid">
              <label>Use the Force Total<input type="number" name="baseBonus" value="${baseBonus}" step="1"></label>
              <label>Situational Modifier<input type="number" name="customModifier" value="0" step="1"></label>
              <label>Target DC<input type="number" name="baseDC" value="${baseDC}" step="1"></label>
            </div>
          </section>
          <section class="swse-roll-config-panel swse-roll-config-panel--resources">
            <h4>Resources</h4>
            <label class="rcd-resource ${boosted ? 'rcd-res-active' : ''} ${fpValue <= 0 ? 'rcd-resource-disabled' : ''}">
              <span class="rcd-res-header"><input type="checkbox" name="useForce" ${boosted ? 'checked' : ''} ${fpValue <= 0 ? 'disabled' : ''}> <span class="rcd-res-icon">✦</span><span class="rcd-res-name">Spend Force Point</span></span>
              <span class="rcd-res-detail">${fpValue <= 0 ? 'No Force Points available.' : `${fpValue} Force Points available.`}</span>
            </label>
          </section>
        </form>
        <aside class="rcd-rail">
          <section class="rcd-rail-sec rcd-rail-sec--preview">
            <div class="rcd-rail-lbl">Projected Outcome</div>
            <div class="rcd-preview-formula">1d20 + ${baseBonus}</div>
            <div class="rcd-preview-total">${baseBonus + 10}</div>
            <div class="rcd-preview-label">Take 10 reference</div>
            <div class="rcd-preview-dc ${(baseBonus + 10) >= baseDC ? 'pass' : 'fail'}">Take 10 ${(baseBonus + 10) >= baseDC ? 'meets' : 'misses'} DC ${baseDC}</div>
          </section>
          <section class="rcd-rail-sec">
            <div class="rcd-rail-lbl">Execution</div>
            <p class="swse-roll-config-note">The final roll is handled by the Force Regimen executor. On success, the resolved tier is stored on the active effect and the card moves to the regimen discard lane.</p>
          </section>
        </aside>
      </div>
    </div>`;

  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    new SWSEDialogV2({
      title: `Perform ${regimen.name}`,
      content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll / Perform',
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
    }, {
      id: 'swse-force-regimen-roll-config',
      classes: ['swse-roll-config-dialog-v2', 'swse-force-roll-dialog-app', 'swse-force-regimen-roll-dialog-app'],
      width: 900,
      height: 640,
      resizable: true
    }).render(true);
  });
}

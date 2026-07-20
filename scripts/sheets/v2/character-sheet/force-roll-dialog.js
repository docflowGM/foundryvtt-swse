import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

/**
 * Force power and Force regimen roll configuration dialogs.
 * UI-only helpers for character/NPC sheets; execution remains in the Force executors.
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

function normalizePowerName(power) {
  return String(power?.name ?? power?.system?.slug ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isNegateEnergyPower(power) {
  return normalizePowerName(power) === 'negate energy';
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
  if (isNegateEnergyPower(power)) return 0;
  const system = power?.system ?? {};
  const firstChartDc = Array.isArray(system.dcChart) ? system.dcChart.find(row => row?.dc != null)?.dc : null;
  return toNumber(system.useTheForce ?? system.dc ?? system.DC ?? firstChartDc, 10) || 10;
}

function actorHasTalent(actor, talentName) {
  const wanted = String(talentName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return Array.from(actor?.items ?? []).some(item => item?.type === 'talent' && String(item?.name || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*\(\d+\)\s*$/, '') === wanted);
}

function isMoveObjectPower(power) {
  return /move\s*object/i.test(String(power?.name || power?.system?.slug || ''));
}

function fieldValue(html, name) {
  const root = html?.[0] ?? html;
  const radio = root?.querySelector?.(`[name="${name}"][type="radio"]:checked`);
  if (radio) return radio.value;
  const found = root?.querySelector?.(`[name="${name}"]`);
  if (found) return found.type === 'checkbox' ? found.checked : found.value;
  const jq = html?.find?.(`[name="${name}"]`);
  if (jq?.length) {
    const type = jq.attr('type');
    if (type === 'radio') return jq.filter?.(':checked')?.val?.() ?? null;
    return type === 'checkbox' ? jq.prop('checked') : jq.val();
  }
  return null;
}

function defenseValue(actor, defense = 'reflex') {
  const candidates = [
    actor?.system?.derived?.defenses?.[defense]?.total,
    actor?.system?.derived?.defenses?.[defense],
    actor?.system?.defenses?.[defense]?.total,
    actor?.system?.defenses?.[defense]
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return 10;
}

function selectedTargetRows() {
  return Array.from(game?.user?.targets ?? []).map(token => {
    const targetActor = token?.actor ?? token?.document?.actor ?? null;
    return {
      tokenId: token?.id ?? token?.document?.id ?? '',
      actorId: targetActor?.id ?? '',
      name: token?.name ?? token?.document?.name ?? targetActor?.name ?? 'Target',
      reflex: defenseValue(targetActor, 'reflex'),
      fortitude: defenseValue(targetActor, 'fortitude'),
      will: defenseValue(targetActor, 'will')
    };
  }).filter(row => row.tokenId);
}

function combatantRows() {
  return Array.from(game?.combat?.combatants ?? [])
    .filter(combatant => combatant?.actor)
    .map(combatant => ({
      actorId: combatant.actor.id,
      name: combatant.name ?? combatant.actor.name,
      reflex: defenseValue(combatant.actor, 'reflex'),
      fortitude: defenseValue(combatant.actor, 'fortitude'),
      will: defenseValue(combatant.actor, 'will')
    }));
}

function inferredTargetDefense(power) {
  const system = power?.system ?? {};
  const haystack = [
    system.targetDefense,
    system.defense,
    system.opposedBy,
    system.check?.defense,
    system.targeting?.defense,
    power?.name
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  if (/will|force stun|mind trick|move object/.test(haystack)) return 'will';
  if (/fortitude|force grip|force slam/.test(haystack)) return 'fortitude';
  if (/reflex|force lightning/.test(haystack)) return 'reflex';
  return 'dc';
}

function resolveTargetActor({ mode, tokenId, actorId } = {}) {
  if (mode === 'token' && tokenId) {
    const targeted = Array.from(game?.user?.targets ?? []).find(token => String(token?.id ?? token?.document?.id ?? '') === String(tokenId));
    const canvasToken = canvas?.tokens?.get?.(tokenId) ?? null;
    return targeted?.actor ?? targeted?.document?.actor ?? canvasToken?.actor ?? null;
  }

  if (mode === 'combatant' && actorId) {
    const combatant = Array.from(game?.combat?.combatants ?? []).find(entry => String(entry?.actor?.id ?? '') === String(actorId));
    return combatant?.actor ?? game?.actors?.get?.(actorId) ?? null;
  }

  return null;
}

function targetPanelHtml(power, baseDC) {
  const targets = selectedTargetRows();
  const combatants = combatantRows();
  const defense = inferredTargetDefense(power);
  const defaultDefense = targets[0]?.[defense] ?? baseDC;
  const targetOptions = targets.map((target, index) => `<option value="${escapeHtml(target.tokenId)}" ${index === 0 ? 'selected' : ''}>${escapeHtml(target.name)} · Ref ${target.reflex} / Fort ${target.fortitude} / Will ${target.will}</option>`).join('');
  const combatantOptions = combatants.map(target => `<option value="${escapeHtml(target.actorId)}">${escapeHtml(target.name)} · Ref ${target.reflex} / Fort ${target.fortitude} / Will ${target.will}</option>`).join('');

  return `
    <section class="swse-roll-config-panel swse-force-target-panel">
      <h4>Target Context</h4>
      <div class="swse-roll-config-grid swse-roll-config-grid--target">
        <label>Mode
          <select name="targetMode">
            <option value="token" ${targets.length ? 'selected' : ''}>Selected token</option>
            <option value="combatant">Pick from combatants</option>
            <option value="manual" ${targets.length ? '' : 'selected'}>Manual defense / theater of mind</option>
            <option value="none">No target · GM adjudication</option>
          </select>
        </label>
        <label>Selected Token
          <select name="targetTokenId"><option value="">None</option>${targetOptions}</select>
        </label>
        <label>Combatant
          <select name="targetActorId"><option value="">None</option>${combatantOptions}</select>
        </label>
        <label>Defense
          <select name="targetDefenseType">
            <option value="reflex" ${defense === 'reflex' ? 'selected' : ''}>Reflex</option>
            <option value="fortitude" ${defense === 'fortitude' ? 'selected' : ''}>Fortitude</option>
            <option value="will" ${defense === 'will' ? 'selected' : ''}>Will</option>
            <option value="dc" ${defense === 'dc' ? 'selected' : ''}>Static DC / opposed check</option>
          </select>
        </label>
        <label>Manual Value
          <input type="number" name="targetDefenseValue" value="${defaultDefense}" placeholder="e.g. 18">
        </label>
      </div>
      <p class="swse-roll-config-note">Targeting is optional. With no actor target, the power still rolls and posts to chat; automated target effects are left for GM/player adjudication.</p>
    </section>`;
}

function buildTargetOptions(html, power, baseDC) {
  const mode = String(fieldValue(html, 'targetMode') || 'none');
  const tokenId = String(fieldValue(html, 'targetTokenId') || '');
  const requestedActorId = String(fieldValue(html, 'targetActorId') || '');
  const defenseType = String(fieldValue(html, 'targetDefenseType') || inferredTargetDefense(power));
  const rawDefense = fieldValue(html, 'targetDefenseValue');
  const defenseValueManual = rawDefense === '' || rawDefense == null ? null : toNumber(rawDefense, baseDC);
  const targetActor = resolveTargetActor({ mode, tokenId, actorId: requestedActorId });
  const actorId = targetActor?.id ?? (mode === 'combatant' ? requestedActorId || null : null);
  const label = targetActor?.name
    ?? (mode === 'manual' ? 'Manual / theater-of-the-mind target' : mode === 'none' ? 'GM adjudication' : 'Unresolved target');

  return {
    target: targetActor,
    targetActor,
    targetContext: {
      mode,
      tokenId: tokenId || null,
      actorId,
      defenseType,
      defenseValue: defenseValueManual,
      label,
      automated: Boolean(targetActor)
    }
  };
}

function dcRowsHtml(rows = []) {
  return rows.length ? `
    <div class="rcd-tiers">
      ${rows.map(row => `<div class="rcd-tier"><span class="rcd-tier-dc">DC ${escapeHtml(row.dc ?? '')}</span><span class="rcd-tier-fx">${escapeHtml(cleanText(row.effect || row.description || ''))}</span></div>`).join('')}
    </div>` : '';
}

function projectedOutcomeHtml(baseBonus, baseDC, { label = 'Reference total', dynamicDc = false } = {}) {
  const referenceTotal = baseBonus + 10;
  if (dynamicDc) {
    return `
      <section class="rcd-rail-sec rcd-rail-sec--preview">
        <div class="rcd-rail-lbl">Negation Check</div>
        <div class="rcd-preview-formula">1d20 + ${baseBonus}</div>
        <div class="rcd-preview-total">${referenceTotal}</div>
        <div class="rcd-preview-label">Reference Use the Force total</div>
        <div class="rcd-preview-dc pending">DC equals the incoming Energy damage entered in the form.</div>
      </section>`;
  }
  return `
    <section class="rcd-rail-sec rcd-rail-sec--preview">
      <div class="rcd-rail-lbl">Projected Outcome</div>
      <div class="rcd-preview-formula">1d20 + ${baseBonus}</div>
      <div class="rcd-preview-total">${referenceTotal}</div>
      <div class="rcd-preview-label">${escapeHtml(label)}</div>
      <div class="rcd-preview-dc ${referenceTotal >= baseDC ? 'pass' : 'fail'}">Reference ${referenceTotal >= baseDC ? 'meets' : 'misses'} DC ${baseDC}</div>
    </section>`;
}

function negateEnergyRulesPanel() {
  return `
    <section class="swse-roll-config-panel swse-negate-energy-panel">
      <h4>Incoming Energy Attack</h4>
      <p class="swse-roll-config-note"><strong>The DC is the incoming Energy damage.</strong> If the Use the Force result equals or exceeds that damage, the attack is negated and deals no damage. Otherwise, the attack deals damage normally.</p>
      <div class="swse-roll-config-grid">
        <label>Incoming Energy Damage (DC)
          <input type="number" name="incomingDamage" value="" min="1" step="1" required placeholder="Enter rolled damage">
        </label>
      </div>
      <label class="rcd-resource">
        <span class="rcd-res-header"><input type="checkbox" name="negateEnergyEligible" checked> <span class="rcd-res-name">Aware of the attack and not Flat-Footed</span></span>
        <span class="rcd-res-detail">Negate Energy cannot be used if you are unaware of the attack or Flat-Footed.</span>
      </label>
    </section>`;
}

export async function promptForcePowerRollOptions({ actor, power, sourceElement = null } = {}) {
  if (!actor || !power) return null;

  const negateEnergy = isNegateEnergyPower(power);
  const baseBonus = getUseTheForceTotal(actor);
  const baseDC = getBaseDc(power);
  const fpValue = Number(actor?.system?.forcePoints?.value ?? actor?.system?.resources?.forcePoints?.value ?? 0) || 0;
  const hpValue = Number(actor?.system?.hp?.value ?? 0) || 0;
  const hpMax = Number(actor?.system?.hp?.max ?? hpValue) || hpValue;
  const boosted = !!sourceElement?.closest?.('.fcard')?.querySelector?.('[data-action="force-suite-toggle-fp-boost"].on');
  const summary = cleanText(power?.system?.effect || power?.system?.summary || power?.system?.description || '');
  const dcRows = negateEnergy ? [] : (Array.isArray(power?.system?.dcChart) ? power.system.dcChart.slice(0, 4) : []);
  const rowsHtml = dcRowsHtml(dcRows);

  const content = `
    <div class="swse-roll-config-shell swse-force-roll-config rcd" style="--accent-rgb:180,140,255">
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
        <span class="rcd-formula-chips"><span class="rcd-fchip">power</span><span class="rcd-fchip">${negateEnergy ? 'reaction' : `dc ${baseDC}`}</span></span>
      </div>
      <div class="rcd-body">
        <form class="swse-force-roll-dialog rcd-main">
          <section class="swse-roll-config-panel">
            <h4>Power Intel</h4>
            <p class="swse-roll-config-note">Configure the Use the Force check before expending <strong>${escapeHtml(power.name)}</strong>.</p>
            ${summary ? `<p class="swse-force-roll-dialog__summary">${escapeHtml(summary)}</p>` : ''}
            ${rowsHtml}
          </section>
          ${negateEnergy ? negateEnergyRulesPanel() : `
          <section class="swse-roll-config-panel">
            <h4>Roll Inputs</h4>
            <div class="swse-roll-config-grid">
              <label>Use the Force Total<input type="number" name="baseBonus" value="${baseBonus}" step="1"></label>
              <label>Situational Modifier<input type="number" name="customModifier" value="0" step="1"></label>
              <label>Target DC<input type="number" name="baseDC" value="${baseDC}" step="1"></label>
            </div>
          </section>
          ${targetPanelHtml(power, baseDC)}`}
          ${negateEnergy ? `
          <section class="swse-roll-config-panel">
            <h4>Roll Inputs</h4>
            <div class="swse-roll-config-grid">
              <label>Use the Force Total<input type="number" name="baseBonus" value="${baseBonus}" step="1"></label>
              <label>Situational Modifier<input type="number" name="customModifier" value="0" step="1"></label>
            </div>
          </section>` : ''}
          <section class="swse-roll-config-panel swse-roll-config-panel--resources">
            <h4>Resources</h4>
            ${actorHasTalent(actor, 'Move Massive Object') && isMoveObjectPower(power) ? `<label class="rcd-resource ${fpValue <= 0 ? 'rcd-resource-disabled' : ''}">
              <span class="rcd-res-header"><input type="checkbox" name="moveMassiveObject" ${fpValue <= 0 ? 'disabled' : ''}> <span class="rcd-res-icon">▦</span><span class="rcd-res-name">Move Massive Object Area Attack</span></span>
              <span class="rcd-res-detail">Spend 1 Force Point to affect an area with a Large or larger object. Large 2x2, Huge 3x3, Gargantuan 4x4, Colossal+ 6x6.</span>
            </label>` : ''}
            <label class="rcd-resource ${boosted ? 'rcd-res-active' : ''} ${fpValue <= 0 ? 'rcd-resource-disabled' : ''}">
              <span class="rcd-res-header"><input type="checkbox" name="useForce" ${boosted ? 'checked' : ''} ${fpValue <= 0 ? 'disabled' : ''}> <span class="rcd-res-icon">✦</span><span class="rcd-res-name">Spend Force Point on the check</span></span>
              <span class="rcd-res-detail">${fpValue <= 0 ? 'No Force Points available.' : `${fpValue} Force Points available.`}</span>
            </label>
            ${negateEnergy ? `<label class="rcd-resource ${fpValue <= 0 || hpValue >= hpMax ? 'rcd-resource-disabled' : ''}">
              <span class="rcd-res-header"><input type="checkbox" name="negateEnergyHeal" ${fpValue <= 0 || hpValue >= hpMax ? 'disabled' : ''}> <span class="rcd-res-icon">✚</span><span class="rcd-res-name">On success, spend 1 Force Point to regain HP</span></span>
              <span class="rcd-res-detail">Regain HP equal to the negated damage, up to ${hpMax} HP. Current HP: ${hpValue}/${hpMax}.</span>
            </label>` : ''}
          </section>
        </form>
        <aside class="rcd-rail">
          ${projectedOutcomeHtml(baseBonus, baseDC, { label: 'D20 midpoint reference', dynamicDc: negateEnergy })}
          <section class="rcd-rail-sec">
            <div class="rcd-rail-lbl">Execution</div>
            <p class="swse-roll-config-note">${negateEnergy
              ? 'Negate Energy is an instant reaction. It does not create Damage Reduction or a persistent Active Effect.'
              : 'The final roll is handled by the Force executor. Actor targets enable automated resolution; manual/no-target mode preserves theater-of-the-mind play.'}</p>
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
          callback: html => {
            const incomingDamage = negateEnergy ? toNumber(fieldValue(html, 'incomingDamage'), 0) : null;
            if (negateEnergy && incomingDamage <= 0) {
              ui?.notifications?.warn?.('Negate Energy requires the incoming Energy damage. That damage is the Use the Force DC.');
              finish(null);
              return;
            }
            if (negateEnergy && fieldValue(html, 'negateEnergyEligible') !== true) {
              ui?.notifications?.warn?.('Negate Energy cannot be used while unaware of the attack or Flat-Footed.');
              finish(null);
              return;
            }

            finish({
              baseBonus: toNumber(fieldValue(html, 'baseBonus'), baseBonus),
              customModifier: toNumber(fieldValue(html, 'customModifier'), 0),
              baseDC: negateEnergy ? incomingDamage : toNumber(fieldValue(html, 'baseDC'), baseDC),
              incomingDamage,
              checkMode: 'roll',
              take10: false,
              forcePowerMastery: null,
              useForce: fieldValue(html, 'useForce') === true,
              moveMassiveObject: fieldValue(html, 'moveMassiveObject') === true,
              negateEnergyEligible: negateEnergy ? true : undefined,
              negateEnergyHeal: negateEnergy ? fieldValue(html, 'negateEnergyHeal') === true : false,
              ...(negateEnergy ? {
                target: null,
                targetActor: null,
                targetContext: {
                  mode: 'incoming-attack',
                  defenseType: 'incoming-energy-damage',
                  defenseValue: incomingDamage,
                  label: 'Incoming Energy attack',
                  automated: false
                }
              } : buildTargetOptions(html, power, baseDC))
            });
          }
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
      width: 940,
      height: 720,
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
  const rowsHtml = dcRowsHtml(rows);

  const content = `
    <div class="swse-roll-config-shell swse-force-roll-config rcd swse-force-regimen-roll-config" style="--accent-rgb:120,210,255">
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
          ${projectedOutcomeHtml(baseBonus, baseDC, { label: 'D20 midpoint reference' })}
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
            checkMode: 'roll',
            take10: false,
            useForce: fieldValue(html, 'useForce') === true,
            moveMassiveObject: false
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

/**
 * Custom starship designer / GM review dialogs (Asset Bay -> Shipyard). Thin UI over
 * CustomVehicleConstructionService: the dialogs only collect inputs and show the service's validation;
 * approval, authority and pricing are decided by the service.
 */
import { CREW_QUALITY } from '/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-modification-rules.js';
import { CustomVehicleConstructionService } from '/systems/foundryvtt-swse/scripts/engine/vehicles/custom-vehicle-construction-service.js';
import { VehicleInstallationService } from '/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-installation-service.js';

const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function buildDesignerFormHtml({ frames, systems, isGM }) {
  return `<form class="swse-ship-designer">
    <label>Name <input name="name" type="text" required></label>
    <label>Stock frame <select name="frameId">${frames.map(f => `<option value="${esc(f.id)}">${esc(f.class)} — ${esc(f.size)} — ${esc(f.cost)} cr${f.certification === 'NEEDS_PDF_CONFIRMATION' ? ' (unconfirmed)' : ''}</option>`).join('')}</select></label>
    <label>Crew quality <select name="crewQuality"><option value="">(choose)</option>${Object.entries(CREW_QUALITY).map(([k]) => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select></label>
    ${isGM ? '<label>Authorship <select name="authorshipKind"><option value="rules-legal">Published rules (Starship Designer)</option><option value="gm-homebrew">GM homebrew</option></select></label>' : ''}
    <fieldset><legend>Certified systems</legend>${systems.map(s => `<label><input type="checkbox" name="system" value="${esc(s.id)}"> ${esc(s.name)} (EP ${esc(s.emplacementPoints)})</label>`).join('') || '<em>None available</em>'}</fieldset>
    <div class="swse-ship-designer-preview" aria-live="polite"></div>
  </form>`;
}

export function summarizePreview(v) {
  if (!v) return '';
  const lines = [`Status: ${v.status}`];
  if (v.preview?.ok) {
    const d = v.preview.derived;
    lines.push(`Reflex ${d.reflexDefense} · Fortitude ${d.fortitudeDefense} · Damage Threshold ${d.damageThreshold} · HP ${d.hitPoints} · DR ${d.damageReduction}`);
  }
  lines.push(`Total cost: ${v.totalCredits ?? 'unresolved'} cr`);
  if (v.design?.days !== undefined) lines.push(`Design time ${v.design.days} days, Mechanics DC ${v.design.mechanicsDC}`);
  for (const r of v.reasons ?? []) lines.push(`Blocked: ${r}`);
  for (const r of v.unresolved ?? []) lines.push(`Unresolved: ${r}`);
  return lines.join('\n');
}

const readForm = form => {
  const f = new FormData(form);
  return { name: f.get('name'), frameId: f.get('frameId'), crewQuality: f.get('crewQuality') || null,
    authorshipKind: f.get('authorshipKind') || 'rules-legal', systemIds: f.getAll('system') };
};

export async function openShipDesigner(designerActor) {
  const game = globalThis.game, ui = globalThis.ui;
  const [frames, catalog] = [await CustomVehicleConstructionService.loadFrames(), await VehicleInstallationService.loadCatalog()];
  const systems = [...catalog.values()].filter(c => c.certification?.status === 'MECHANIC_SPECIFIED');
  const choice = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'Design a Custom Starship' },
    content: buildDesignerFormHtml({ frames, systems, isGM: game.user.isGM }),
    render: (_ev, dialog) => {
      const form = dialog.element.querySelector('form'), out = form.querySelector('.swse-ship-designer-preview');
      const update = async () => {
        const i = readForm(form);
        out.textContent = summarizePreview(await CustomVehicleConstructionService.preview({ designerActor, ...i }).catch(e => ({ status: 'ERROR', reasons: [e.message] })));
      };
      form.addEventListener('change', update); update();
    },
    ok: { label: 'Submit for GM approval', callback: (_ev, button) => readForm(button.form) },
    rejectClose: false
  });
  if (!choice) return null;
  const r = await CustomVehicleConstructionService.submitDesign({ designerActor, ...choice });
  if (r.success) ui.notifications.info('Design submitted for GM approval. Credits are charged when the GM approves and funds it.');
  else ui.notifications.warn(`Design refused: ${[...(r.reasons ?? [])].join(', ')}`);
  return r;
}

const projectLine = (actor, p) => {
  const d = CustomVehicleConstructionService.describe(p);
  const work = d.publishedProcess ? ` · design ${d.daysLogged}/${d.daysRequired} days · DC ${d.dc}` : ' · no published process (GM completes)';
  return `${p.name} (${actor.name}) — ${d.status}${d.creditsPaid ? ` · paid ${d.creditsPaid} cr` : ''}${work}${d.lastCheck ? ` · last check ${d.lastCheck.total}` : ''}`;
};

/** GM: approve/reject pending designs; log design time or adjudicate completion of funded projects. */
export async function openDesignReview() {
  const game = globalThis.game, ui = globalThis.ui;
  if (!game.user.isGM) { ui.notifications.warn('Only a GM can review ship designs.'); return null; }
  const rows = [];
  for (const actor of game.actors.contents) for (const p of CustomVehicleConstructionService.projectsOf(actor)) if (p.status !== 'COMPLETED') rows.push({ actor, p });
  if (!rows.length) { ui.notifications.info('No ship designs or construction projects need attention.'); return null; }
  const buttons = rows.flatMap(({ actor, p }) => {
    const key = `${actor.id}:${p.designId}`;
    if (p.status === 'PENDING_APPROVAL') return [{ action: `approve:${key}`, label: `Approve and fund: ${p.name}` }, { action: `reject:${key}`, label: `Reject: ${p.name}` }];
    const out = [];
    if (p.status === 'UNDERWAY' && p.work) out.push({ action: `days:${key}`, label: `Log design days: ${p.name}` });
    out.push({ action: `complete:${key}`, label: `GM: complete ${p.name} now` });
    return out;
  });
  const picked = await foundry.applications.api.DialogV2.wait({ window: { title: 'Ship Designs and Construction' },
    content: `<ul>${rows.map(({ actor, p }) => `<li>${esc(projectLine(actor, p))}</li>`).join('')}</ul>`, buttons, rejectClose: false });
  if (!picked) return null;
  const [kind, actorId, designId] = String(picked).split(':');
  const designerActor = game.actors.get(actorId);
  let r;
  if (kind === 'approve') r = await CustomVehicleConstructionService.approveDesign({ designerActor, designId });
  else if (kind === 'reject') r = await CustomVehicleConstructionService.rejectDesign({ designerActor, designId });
  else if (kind === 'days') {
    const v = Number(await askText('Log design days', 'Days of design work completed', 'number'));
    if (!Number.isFinite(v) || v <= 0) return null;
    r = await CustomVehicleConstructionService.logDesignDays({ designerActor, designId, days: v });
  } else if (kind === 'complete') {
    const reason = await askText('Complete construction now', 'Reason (recorded)');
    if (!reason) return null;
    r = await CustomVehicleConstructionService.gmCompleteConstruction({ designerActor, designId, reason });
  }
  if (r?.success) ui.notifications.info({ approve: 'Design approved and funded; the design work is under way.', reject: 'Design rejected.', days: 'Design time logged.', complete: 'Construction completed; the ship was delivered.' }[kind]);
  else if (r) ui.notifications.warn(`Refused: ${[...(r.reasons ?? [])].join(', ')}`);
  return r;
}

/** Designer: see own projects and roll the design Mechanics check when the design time is complete. */
export async function openShipProjects(designerActor) {
  const ui = globalThis.ui;
  const projects = CustomVehicleConstructionService.projectsOf(designerActor).filter(p => p.status !== 'COMPLETED');
  if (!projects.length) { ui.notifications.info('No ship projects in progress.'); return null; }
  const buttons = projects.filter(p => CustomVehicleConstructionService.describe(p).canRecordCheck)
    .map(p => ({ action: `check:${p.designId}`, label: `Roll design check: ${p.name}` }));
  buttons.push({ action: 'close', label: 'Close' });
  const picked = await foundry.applications.api.DialogV2.wait({ window: { title: 'Ship Projects' },
    content: `<ul>${projects.map(p => `<li>${esc(projectLine(designerActor, p))}</li>`).join('')}</ul>`, buttons, rejectClose: false });
  if (!picked || picked === 'close') return null;
  const r = await CustomVehicleConstructionService.recordDesignCheck({ designerActor, designId: String(picked).split(':')[1] });
  if (r.success) ui.notifications.info(r.outcome === 'SUCCESS' ? `Design check ${r.total}: success. The ship was delivered.` : `Design check ${r.total}: failed. The GM decides what happens next.`);
  else ui.notifications.warn(`Refused: ${[...(r.reasons ?? [])].join(', ')}`);
  return r;
}

async function askText(title, label, type = 'text') {
  try {
    return await foundry.applications.api.DialogV2.prompt({ window: { title },
      content: `<label>${esc(label)} <input type="${type}" name="value" autofocus></label>`,
      ok: { label: 'OK', callback: (_ev, button) => button.form.elements.value.value }, rejectClose: false }) ?? null;
  } catch { return null; }
}

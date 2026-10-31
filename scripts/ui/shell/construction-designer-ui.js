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
  if (r.success) ui.notifications.info('Design submitted for GM approval.');
  else ui.notifications.warn(`Design refused: ${[...(r.reasons ?? [])].join(', ')}`);
  return r;
}

/** GM: list pending proposals across characters; approve (charges and creates the ship) or reject. */
export async function openDesignReview() {
  const game = globalThis.game, ui = globalThis.ui;
  if (!game.user.isGM) { ui.notifications.warn('Only a GM can review ship designs.'); return null; }
  const rows = [];
  for (const actor of game.actors.contents) for (const p of CustomVehicleConstructionService.proposalsOf(actor)) rows.push({ actor, p });
  if (!rows.length) { ui.notifications.info('No ship designs are waiting for approval.'); return null; }
  const buttons = rows.flatMap(({ actor, p }) => [
    { action: `approve:${actor.id}:${p.designId}`, label: `Approve: ${p.name} (${actor.name})` },
    { action: `reject:${actor.id}:${p.designId}`, label: `Reject: ${p.name}` }
  ]);
  const picked = await foundry.applications.api.DialogV2.wait({ window: { title: 'Ship Design Proposals' }, content: '<p>Choose a proposal action.</p>', buttons, rejectClose: false });
  if (!picked) return null;
  const [kind, actorId, designId] = String(picked).split(':');
  const designerActor = game.actors.get(actorId);
  const r = kind === 'approve' ? await CustomVehicleConstructionService.approveDesign({ designerActor, designId })
    : await CustomVehicleConstructionService.rejectDesign({ designerActor, designId });
  if (r.success) ui.notifications.info(kind === 'approve' ? 'Design approved; the ship was created.' : 'Design rejected.');
  else ui.notifications.warn(`Refused: ${[...(r.reasons ?? [])].join(', ')}`);
  return r;
}

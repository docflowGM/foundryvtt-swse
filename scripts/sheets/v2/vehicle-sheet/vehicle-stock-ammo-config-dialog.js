/** GM dialog for a stock launcher's missing ammunition facts (Foundry V13 DialogV2). Asks ONLY for what the source does not print; resolves null when dismissed. */
export async function askStockAmmoConfig(row) {
  const needs = row?.needs ?? {};
  const field = (name, label, show, extra = '') => (show ? `<label>${label} <input type="number" name="${name}" min="0" step="1" ${extra}></label>` : '');
  try {
    return await foundry.applications.api.DialogV2.prompt({
      window: { title: `Configure launcher: ${row?.label ?? ''}` },
      content: `<p>GM configuration (recorded on this world Actor; not canonical source data).</p>
        ${field('payload', 'Payload (rounds carried)', needs.payload?.needed)}
        ${field('launchers', 'Number of launchers', needs.launchers?.needed)}
        ${needs.launcher?.needed ? `${field('magazineCapacity', 'Magazine capacity per launcher', true)}<label>Ammunition <input type="text" name="ammunition"></label>` : ''}
        ${field('loaded', 'Loaded now (blank = fill to capacity)', true)}
        <label>Reason <input type="text" name="reason" required></label>`,
      ok: { label: 'Configure', callback: (_ev, button) => {
        const f = button.form.elements, num = n => (f[n] && f[n].value !== '' ? Number(f[n].value) : undefined);
        return { reason: f.reason.value.trim(), values: { payload: num('payload'), launchers: num('launchers'), magazineCapacity: num('magazineCapacity'), loaded: num('loaded'), ammunition: f.ammunition?.value?.trim() || undefined } };
      } }
    });
  } catch { return null; }
}

/** GM: the top-left grid square of the 4x4 interdiction area (the operator chooses the area; the system measures range to it). Resolves null when dismissed. */
export async function askInterdictionArea(_weapon) {
  try {
    return await foundry.applications.api.DialogV2.prompt({
      window: { title: 'Project gravity well: choose the 4x4 area' },
      content: '<p>Grid column and row of the area\'s top-left square (starship-scale squares).</p><label>Column <input type="number" name="col" step="1" required></label><label>Row <input type="number" name="row" step="1" required></label>',
      ok: { label: 'Project', callback: (_ev, button) => { const f = button.form.elements; const col = Number(f.col.value), row = Number(f.row.value); return Number.isInteger(col) && Number.isInteger(row) ? { col, row } : null; } }
    });
  } catch { return null; }
}

/** GM: certify how many identical weapons a printed battery contains (Core p. 170: up to six). Resolves null when dismissed. */
export async function askBatteryCount(row) {
  try {
    return await foundry.applications.api.DialogV2.prompt({
      window: { title: `Certify battery: ${row?.label ?? ''}` },
      content: `<p>The source prints ${row?.gunners ?? '?'} gunners but not the number of weapons. Enter the number of identical weapons (not inferred from the gunners).</p><label>Weapons <input type="number" name="count" min="2" max="6" step="1" required></label><label>Reason <input type="text" name="reason" required></label>`,
      ok: { label: 'Certify', callback: (_ev, button) => { const f = button.form.elements; return { weaponCount: Number(f.count.value), reason: f.reason.value.trim() }; } }
    });
  } catch { return null; }
}

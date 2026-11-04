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

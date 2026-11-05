/** GM dialogs for ship logistics (Foundry V13 DialogV2). They only COLLECT values; every rule and write is the logistics service's. Each resolves null when dismissed. */
const ask = async (title, content, pick) => {
  try { return await foundry.applications.api.DialogV2.prompt({ window: { title }, content, ok: { label: 'OK', callback: (_ev, button) => pick(button.form.elements) } }); } catch { return null; }
};
const num = v => (v === '' || v === undefined ? undefined : Number(v));

export const askFuelConfig = () => ask('Configure the fuel tank (GM)',
  '<p>A fuel-tank capacity is not published: this is a GM configuration, recorded as such.</p><label>Capacity (fuel-days) <input type="number" name="capacity" min="1" step="1" required></label><label>Current fuel (blank = keep) <input type="number" name="current" min="0" step="1"></label><label>Reason <input type="text" name="reason" required></label>',
  f => ({ capacity: Number(f.capacity.value), current: num(f.current.value) ?? null, reason: f.reason.value.trim() }));

export const askOccupants = () => ask('Living occupants (GM)',
  '<p>Living creatures aboard (droids excluded) price supplies at 10 cr each per day. Passengers are added to the assigned living crew; an override replaces the total.</p><label>Living passengers <input type="number" name="passengers" min="0" step="1"></label><label>Total override (blank = none) <input type="number" name="override" min="0" step="1"></label><label>Reason <input type="text" name="reason" required></label>',
  f => ({ passengers: num(f.passengers.value), override: f.override.value === '' ? null : Number(f.override.value), reason: f.reason.value.trim() }));

export const askConsumablesRemaining = () => ask('Adjust remaining consumables (GM)',
  '<p>Set the remaining endurance in days (0 up to the ship\'s maximum). No dependable campaign clock depletes it automatically.</p><label>Remaining days <input type="number" name="days" min="0" step="1" required></label><label>Reason <input type="text" name="reason" required></label>',
  f => ({ remainingDays: Number(f.days.value), reason: f.reason.value.trim() }));

export const askFuelEvent = events => ask('Record fuel use (GM)',
  `<p>One authoritative event spends one fuel-day per unit.</p><label>Event <select name="event">${Object.entries(events).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label><label>Quantity <input type="number" name="quantity" min="1" step="1" value="1" required></label>`,
  f => ({ event: f.event.value, quantity: Number(f.quantity.value) }));

/**
 * Detail prompts the ItemCustomizationWorkbench opens for one Modification V2 install or removal. They collect exactly what the install
 * service requires (the GM host ruling where host compatibility is not certified, the armor classification attestation, an explicitly
 * re-entered price, the check -- a Mechanics roll or a GM-entered result -- and a note); the service re-validates everything.
 * Empty fields are reported as missing (NaN / null), never defaulted.
 */
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => (v === null || v === undefined || String(v).trim() === "" ? NaN : Number(v));
const formOf = (html) => { const root = html instanceof HTMLElement ? html : html?.[0] ?? html; return root?.querySelector?.("form") ?? root; };

/** Pure: the install form. */
export function buildInstallContent(review, { item }) {
  const host = review.hostNeedsGmRuling ? `<label><input type="checkbox" name="hostCompatible" value="yes"> GM ruling: this ${esc(item?.type)} is a compatible host (<strong>GM adjudication, not a published rule</strong>)</label><label>Host ruling note <input type="text" name="hostNote"></label>` : "";
  const armor = item?.type === "armor" ? `<fieldset><legend>Armor classification (GM attestation for slot capacity)</legend><label>Stock class <select name="stockClass"><option value="">—</option>${["light", "medium", "heavy"].map((c) => `<option value="${c}"${c === item?.system?.armorType ? " selected" : ""}>${c}</option>`).join("")}</select></label><label><input type="radio" name="powered" value="no"> Not powered</label><label><input type="radio" name="powered" value="yes"> Powered</label></fieldset>` : "";
  const accepted = (review.accepted ?? []).map((a) => `<li>${esc(a.code)}${a.detail ? ` (${esc(a.detail)})` : ""}</li>`).join("");
  return `<form class="swse-dialog"><p><strong>${esc(review.name)}</strong>: Mechanics DC ${esc(review.dc)}, ${esc(review.time)} (installer trained in Mechanics). ${esc(review.source)}.</p>${accepted ? `<details><summary>Provisional install: accepting ${review.accepted.length} uncertified item(s)</summary><ul>${accepted}</ul></details>` : ""}${host}${armor}<label>Confirm price (credits) <input type="number" name="priceConfirmed" min="0" step="1" placeholder="${esc(review.price)}"></label><fieldset><legend>Check</legend><label><input type="radio" name="checkMode" value="roll"> Roll Mechanics</label><label><input type="radio" name="checkMode" value="gm-entered"> GM-entered result <input type="number" name="checkTotal" step="1"></label></fieldset><label>Note <input type="text" name="note"></label><p><small>Effects of a provisional install are not automated. A failed check records the attempt and charges nothing automatically (owner policies Q-021/Q-024/Q-029).</small></p></form>`;
}

/** Pure: the removal form. */
export function buildRemoveContent(instance) {
  return `<form class="swse-dialog"><p>Remove <strong>${esc(instance?.name ?? instance?.typedDefinitionId)}</strong>: same time as installation, DC − 5. A failed ordinary removal deactivates the upgrade (it keeps its slot).</p><label><input type="checkbox" name="expedited" value="yes"> Expedited (next lower time increment; destroyed on a failed check; not available at 10 minutes)</label><fieldset><legend>Check</legend><label><input type="radio" name="checkMode" value="roll"> Roll Mechanics</label><label><input type="radio" name="checkMode" value="gm-entered"> GM-entered result <input type="number" name="checkTotal" step="1"></label></fieldset><label>Note <input type="text" name="note"></label></form>`;
}

/** Pure: read the install form (FormData-like). */
export function readInstallForm(fd) {
  const mode = String(fd.get("checkMode") ?? "");
  const stock = fd.get("stockClass");
  return {
    priceConfirmed: num(fd.get("priceConfirmed")),
    check: mode === "gm-entered" ? { mode, total: num(fd.get("checkTotal")) } : mode === "roll" ? { mode } : null,
    hostRuling: fd.get("hostCompatible") === "yes" ? { compatible: true, note: String(fd.get("hostNote") ?? "") || null } : null,
    armor: stock !== null && stock !== undefined ? { stockClass: String(stock), powered: fd.get("powered") === "yes" ? true : fd.get("powered") === "no" ? false : null } : null,
    note: String(fd.get("note") ?? "") || null,
  };
}

/** Pure: read the removal form. */
export function readRemoveForm(fd) {
  const mode = String(fd.get("checkMode") ?? "");
  return { expedited: fd.get("expedited") === "yes", check: mode === "gm-entered" ? { mode, total: num(fd.get("checkTotal")) } : mode === "roll" ? { mode } : null, note: String(fd.get("note") ?? "") || null };
}

export async function promptInstall(review, item, { prompt = (o) => SWSEDialogV2.prompt(o) } = {}) {
  return prompt({ title: `Install ${review.name}`, content: buildInstallContent(review, { item }), label: "Install", callback: (html) => readInstallForm(new FormData(formOf(html))) });
}

export async function promptRemove(instance, { prompt = (o) => SWSEDialogV2.prompt(o) } = {}) {
  return prompt({ title: `Remove ${instance?.name ?? instance?.typedDefinitionId}`, content: buildRemoveContent(instance), label: "Remove", callback: (html) => readRemoveForm(new FormData(formOf(html))) });
}

/** Player-facing message for an install/removal outcome. */
export function describeOutcome(itemName, result) {
  const m = {
    INSTALLED: (r) => `installed (check ${r.check.total} vs DC ${r.check.dc}); ${r.review.price} credits charged.`,
    INSTALL_FAILED_CHECK: (r) => `installation failed (check ${r.check.total} vs DC ${r.check.dc}); the attempt is recorded, nothing was charged or installed.`,
    REMOVED: (r) => `removed (check ${r.check.total} vs DC ${r.dc}); the slot is free.`,
    DESTROYED: (r) => `destroyed by a failed expedited removal (check ${r.check.total} vs DC ${r.dc}); the slot is free.`,
    DEACTIVATED: (r) => `removal failed (check ${r.check.total} vs DC ${r.dc}); the upgrade is deactivated and keeps its slot.`,
    DUPLICATE: () => "that attempt was already resolved; nothing changed.",
  }[result?.status];
  if (m) return { level: ["INSTALLED", "REMOVED"].includes(result.status) ? "info" : "warn", text: `${itemName}: ${m(result)}` };
  return { level: "warn", text: `${itemName}: not done (${result?.status}: ${result?.reason ?? ""}${result?.hard ? ` — ${result.hard.map((h) => h.code).join(", ")}` : ""}).` };
}

export default { buildInstallContent, buildRemoveContent, readInstallForm, readRemoveForm, promptInstall, promptRemove, describeOutcome };

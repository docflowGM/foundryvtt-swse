/**
 * GM reconciliation control (TI4-B G36) for an unresolved equipment transaction on a weapon.
 *
 * The sheet shows "Resolve" (GM only) on a weapon whose readiness is withheld by an unresolved journal entry. This module asks the coordinator for a
 * fresh REVIEW (it writes nothing), shows the evidence and ONLY the decisions that review admits, and sends the GM's choice back through
 * InventoryEngine.reconcileWeaponRequest, which re-observes under serialization and refuses a decision the evidence no longer supports. Nothing here
 * decides an outcome, spends or refunds an action, or replays a request.
 */
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";
import { readJournal, unresolvedItemIds, JOURNAL_STATUS } from "/systems/foundryvtt-swse/scripts/engine/equipment/equipment-transaction-journal.js";

const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const RESOLUTION_TEXT = Object.freeze({
  "close-not-applied": "Close as not applied — the weapon kept its previous state. A recorded action spend stays recorded (never refunded here).",
  finalize: "Finalize — the change took effect and its action is settled.",
  "finalize-without-spend": "Finalize without the action — the change took effect; no action is charged (recorded as waived). Charge it manually if your table requires it.",
  compensate: "Undo the change — restore each field that still holds the planned value. Fields someone else changed are left alone.",
});
const CLASSIFICATION_TEXT = Object.freeze({
  APPLIED: "The weapon holds the planned state.",
  NOT_APPLIED: "The weapon holds its previous state.",
  PARTIAL: "Some fields hold the planned state and some do not.",
  INDETERMINATE: "The weapon holds a state that is neither the previous nor the planned one, or it could not be read.",
});
const SPEND_TEXT = Object.freeze({ present: "recorded", absent: "not recorded", unknown: "could not be read" });

/** Request ids of unresolved transactions covering this Item, oldest first. */
export function unresolvedRequestIdsFor(actor, itemId) {
  const journal = readJournal(actor?.flags?.swse?.equipmentTxn);
  if (journal.status !== JOURNAL_STATUS.VALID) return [];
  return (unresolvedItemIds(journal.entries).get(itemId) ?? []).map((t) => t.requestId);
}

/** Pure: the review form for one REVIEW result. */
export function buildReconcileContent(review) {
  const e = review?.evidence ?? {};
  const spendNeeded = e.journaledSpend?.state && e.journaledSpend.state !== "not-required";
  const items = (e.perItem ?? []).map((p) => `<li>${escapeHtml(p.id)}: ${escapeHtml(p.state)}</li>`).join("");
  const reasons = (e.reasons ?? []).map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  const options = (review?.allowedResolutions ?? []).map((r) => `<label class="swse-weapon-choice"><span class="swse-weapon-choice__name"><input type="radio" name="resolution" value="${escapeHtml(r)}"> ${escapeHtml(RESOLUTION_TEXT[r] ?? r)}</span></label>`).join("");
  return `<form class="swse-dialog">
    <p><strong>Request</strong> ${escapeHtml(review?.requestId)} — journal phase ${escapeHtml(e.phase)}${e.executor ? `, executor ${escapeHtml(e.executor.userId)} (epoch ${escapeHtml(e.executor.epoch)})` : ""}</p>
    <p>${escapeHtml(CLASSIFICATION_TEXT[e.classification] ?? e.classification)}${spendNeeded ? ` Action spend (${escapeHtml(e.journaledSpend.actionType ?? "action")}): ${escapeHtml(SPEND_TEXT[e.spend] ?? e.spend)}.` : ""}</p>
    ${items ? `<ul>${items}</ul>` : ""}${reasons ? `<ul>${reasons}</ul>` : ""}
    ${options ? `<div class="swse-weapon-choice-list">${options}</div>` : "<p>No decision is available from this evidence.</p>"}
    <label>Note (kept in the journal) <textarea name="note" rows="2"></textarea></label>
  </form>`;
}

/** Pure: read { resolution, note } from a FormData-like object; null when nothing admitted was picked. */
export function readReconcileChoice(formData, review) {
  const resolution = String(formData.get?.("resolution") ?? "");
  if (!resolution || !(review?.allowedResolutions ?? []).includes(resolution)) return null;
  const note = String(formData.get?.("note") ?? "").trim().slice(0, 500);
  return { resolution, ...(note ? { note } : {}) };
}

export async function promptReconcileChoice(item, review) {
  if (!(review?.allowedResolutions ?? []).length) {
    globalThis.ui?.notifications?.warn?.(`${item?.name ?? "Weapon"}: no reconciliation decision is available for request ${review?.requestId}.`);
    return null;
  }
  const picked = await SWSEDialogV2.prompt({
    title: `${item?.name ?? "Weapon"} - Resolve equipment change`,
    content: buildReconcileContent(review),
    label: "Apply decision",
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.("form") ?? root;
      return readReconcileChoice(new FormData(form), review) ?? { incomplete: true };
    }
  });
  if (!picked || picked.incomplete) return null;
  return picked;
}

/**
 * GM flow for one weapon: review each unresolved request, ask for a decision, apply it. Returns the per-request results.
 * @param {{prompt?:Function, reconcile?:Function, notify?:object, isGm?:Function}} [deps] test seams
 */
export async function reconcileItemTransactions(actor, item, deps = {}) {
  const notify = deps.notify ?? globalThis.ui?.notifications;
  const isGm = deps.isGm ? deps.isGm() : globalThis.game?.user?.isGM === true;
  if (!isGm) { notify?.warn?.("Only a GM can resolve an unfinished equipment change."); return []; }
  const reconcile = deps.reconcile ?? ((requestId, opts) => InventoryEngine.reconcileWeaponRequest(actor, requestId, opts));
  const prompt = deps.prompt ?? promptReconcileChoice;
  const results = [];
  for (const requestId of unresolvedRequestIdsFor(actor, item.id)) {
    const review = await reconcile(requestId, {});
    if (review?.status !== "REVIEW") { results.push(review); continue; }
    const choice = await prompt(item, review);
    if (!choice) { results.push({ status: "CANCELLED", requestId }); break; }
    const result = await reconcile(requestId, choice);
    results.push(result);
    if (result?.status === "RECONCILED") {
      const msg = `${item.name}: ${choice.resolution} recorded (${result.phaseBefore} → ${result.phaseAfter}).`;
      if (result.resolved) notify?.info?.(msg); else notify?.warn?.(`${msg} Some fields were changed by someone else and were left alone; the change stays unresolved.`);
    } else {
      notify?.warn?.(`${item.name}: the decision was not applied (${result?.status ?? "unknown"}).`);
      break;
    }
  }
  return results;
}

export default { buildReconcileContent, readReconcileChoice, promptReconcileChoice, reconcileItemTransactions, unresolvedRequestIdsFor, RESOLUTION_TEXT };

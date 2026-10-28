/**
 * Weapon draw/ready choice dialog (equipment vertical slice).
 *
 * The equipment-state coordinator never picks appendages, a purpose or a grip; when they are missing it answers CHOICE_REQUIRED with the options
 * it would accept. This dialog shows exactly those options, nothing pre-selected, and returns what the user picked. The follow-up request carries
 * the same request id (G18) and the coordinator re-validates everything; this module decides nothing about rules.
 */
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const humanize = (id) => String(id ?? "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const GRIP_LABELS = { "one-handed": "One-handed", "two-handed": "Two-handed" };
const PURPOSE_LABELS = { hold: "Hold", wield: "Wield" };

/** Pure: the dialog form for a coordinator `choices` array. Unknown choice ids are ignored (the coordinator will ask again). */
export function buildPostureChoiceContent(choices = []) {
  const sections = [];
  for (const choice of Array.isArray(choices) ? choices : []) {
    if (choice?.id === "appendageIds") {
      const rows = (choice.options ?? []).map((a) => {
        const state = a?.functionalState && a.functionalState !== "functional" ? ` <em>(${escapeHtml(a.functionalState)})</em>` : "";
        return `<label class="swse-weapon-choice"><span class="swse-weapon-choice__name"><input type="checkbox" name="appendageIds" value="${escapeHtml(a?.id)}"> ${escapeHtml(humanize(a?.id))}${state}</span></label>`;
      }).join("");
      sections.push(`<fieldset><legend>Hands / appendages</legend><div class="swse-weapon-choice-list">${rows}</div></fieldset>`);
    } else if (choice?.id === "grip") {
      const rows = (choice.options ?? []).map((g) => `<label class="swse-weapon-choice"><span class="swse-weapon-choice__name"><input type="radio" name="grip" value="${escapeHtml(g)}"> ${escapeHtml(GRIP_LABELS[g] ?? humanize(g))}</span></label>`).join("");
      sections.push(`<fieldset><legend>Grip</legend><div class="swse-weapon-choice-list">${rows}</div></fieldset>`);
    } else if (choice?.id === "purpose") {
      const rows = (choice.options ?? []).map((p) => `<label class="swse-weapon-choice"><span class="swse-weapon-choice__name"><input type="radio" name="purpose" value="${escapeHtml(p)}"> ${escapeHtml(PURPOSE_LABELS[p] ?? humanize(p))}</span></label>`).join("");
      sections.push(`<fieldset><legend>Purpose</legend><div class="swse-weapon-choice-list">${rows}</div></fieldset>`);
    }
  }
  return `<form class="swse-dialog">${sections.join("")}</form>`;
}

/**
 * Pure: read the picked values from a FormData-like object ({ get, getAll }). Returns null when a requested choice is left empty.
 * @returns {{appendageIds?:string[], grip?:string, purpose?:string}|null}
 */
export function readPostureChoice(formData, choices = []) {
  const ids = new Set((Array.isArray(choices) ? choices : []).map((c) => c?.id));
  const out = {};
  if (ids.has("appendageIds")) {
    const picked = (formData.getAll?.("appendageIds") ?? []).map(String).filter(Boolean);
    if (!picked.length) return null;
    out.appendageIds = picked;
  }
  for (const key of ["grip", "purpose"]) {
    if (!ids.has(key)) continue;
    const value = String(formData.get?.(key) ?? "");
    if (!value) return null;
    out[key] = value;
  }
  return out;
}

/** Ask the user for the missing choices. Resolves to the picked values, or null when cancelled or incomplete. */
export async function promptWeaponPostureChoice(item, choices) {
  const picked = await SWSEDialogV2.prompt({
    title: `${item?.name ?? "Weapon"} - Draw`,
    content: buildPostureChoiceContent(choices),
    label: "Draw",
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.("form") ?? root;
      return readPostureChoice(new FormData(form), choices) ?? { incomplete: true };
    }
  });
  if (!picked) return null;
  if (picked.incomplete) {
    globalThis.ui?.notifications?.warn?.(`${item?.name ?? "Weapon"}: choose the hands and grip to draw it; nothing was changed.`);
    return null;
  }
  return picked;
}

/**
 * Run a posture request; when the coordinator needs choices, ask for them and send the follow-up with the SAME request id.
 * @param {object} item
 * @param {() => Promise<object>} first the initial request
 * @param {(options:object) => Promise<object>} followUp called with { appendageIds?, grip?, purpose?, requestId }
 * @param {{prompt?:Function}} [deps] test seam for the dialog
 */
export async function requestWithPostureChoices(item, first, followUp, { prompt = promptWeaponPostureChoice } = {}) {
  const result = await first();
  if (result?.status !== "CHOICE_REQUIRED") return result;
  const picked = await prompt(item, result.choices ?? []);
  if (!picked) return { ...result, ok: false, cancelled: true, message: null };
  return followUp({ ...picked, requestId: result.requestId ?? null });
}

export default { buildPostureChoiceContent, readPostureChoice, promptWeaponPostureChoice, requestWithPostureChoices };

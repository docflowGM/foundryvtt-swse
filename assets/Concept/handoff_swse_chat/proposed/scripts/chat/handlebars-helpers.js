/**
 * scripts/chat/handlebars-helpers.js
 *
 * Small Handlebars helpers used by the new chat templates. Register
 * during init alongside the existing helpers. If any of these names
 * collide with existing helpers in the repo, rename — the templates
 * just use whatever name you bind here.
 */

export function registerSwseChatHelpers() {
  const H = Handlebars;

  // {{eq a b}} — strict equality (used for source-type branching)
  H.registerHelper("eq", (a, b) => a === b);

  // {{uppercase "dex"}} → "DEX"
  H.registerHelper("uppercase", s => String(s ?? "").toUpperCase());

  // {{formatCredits 1500}} → "1,500"
  H.registerHelper("formatCredits", n => {
    const v = Number(n);
    if (!Number.isFinite(v)) return "0";
    return Math.round(v).toLocaleString("en-US");
  });

  // {{formatDelta -850}}  → "−850"
  // {{formatDelta  3000}} → "+3,000"
  // {{formatDelta    0}}  → "±0"
  H.registerHelper("formatDelta", n => {
    const v = Number(n);
    if (!Number.isFinite(v) || v === 0) return "±0";
    const abs = Math.abs(Math.round(v)).toLocaleString("en-US");
    return (v < 0 ? "−" : "+") + abs;
  });

  // {{labelFor descriptorKey}} — pretty label for Force descriptors
  const DESCRIPTOR_LABELS = {
    light: "◇ Light Side",
    dark:  "◆ Dark Side",
    tk:    "◆ Telekinetic",
    mind:  "◇ Mind-Affecting",
    form:  "◆ Form"
  };
  H.registerHelper("labelFor", key => DESCRIPTOR_LABELS[key] ?? key);

  // {{formatTime iso}} — short hh:mm rendering
  H.registerHelper("formatTime", iso => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isFinite(d.getTime())
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
  });
}

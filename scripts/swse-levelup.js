// swse-levelup.js
// Handles level-up logic for SWSE actors, including feat/talent selection

import { getActorData, getFeats, getTalents, getClassData } from "./swse-data.js";

export async function handleLevelUp(actor, newLevel) {
  const className = actor.system.class;
  const classData = getClassData(className);
  const levelRow = classData.level_table.find(row => row.level === `${newLevel}th`);
  if (!levelRow) return ui.notifications.warn("No class data for this level.");

  const features = levelRow.class_features.toLowerCase();
  const feats = getFeats();
  const talents = getTalents();

  const eligibleFeats = features.includes("bonus feat")
    ? feats.filter(f => f.bonus_feat_for?.includes(className) && prerequisitesMet(f.prerequisites, actor))
    : [];

  const eligibleTalents = features.includes("talent")
    ? talents.filter(t => t.class === className && prerequisitesMet(t.prerequisites, actor))
    : [];

  renderLevelUpDialog(actor, newLevel, eligibleFeats, eligibleTalents);
}

function prerequisitesMet(prereqs, actor) {
  if (!prereqs || prereqs.length === 0) return true;
  return prereqs.every(req => actorHasRequirement(req, actor));
}

function actorHasRequirement(req, actor) {
  // Basic check: ability scores, feats, skills
  const lowerReq = req.toLowerCase();
  if (lowerReq.includes("str") || lowerReq.includes("dex") || lowerReq.includes("int")) {
    const [stat, value] = lowerReq.split(" ");
    return actor.system.abilities[stat]?.value >= parseInt(value);
  }
  if (lowerReq.includes("trained") || lowerReq.includes("skill")) {
    return actor.system.skills?.some(s => lowerReq.includes(s.name.toLowerCase()) && s.trained);
  }
  if (lowerReq.includes("feat")) {
    return actor.system.feats?.some(f => lowerReq.includes(f.name.toLowerCase()));
  }
  return false;
}

function renderLevelUpDialog(actor, level, feats, talents) {
  const content = `
    <h2>Level ${level} Advancement</h2>
    ${feats.length > 0 ? renderFeatTable(feats) : ""}
    ${talents.length > 0 ? renderTalentTable(talents) : ""}
  `;
  new Dialog({
    title: `Level Up: ${actor.name}`,
    content,
    buttons: {
      confirm: {
        label: "Apply",
        callback: html => applySelections(actor, html)
      },
      cancel: {
        label: "Cancel"
      }
    }
  }).render(true);
}

function renderFeatTable(feats) {
  return `
    <h3>Bonus Feats</h3>
    <div class="scroll-table">
      <table>
        <thead><tr><th>Select</th><th>Name</th><th>Prerequisites</th><th>Description</th></tr></thead>
        <tbody>
          ${feats.map(f => `
            <tr>
              <td><input type="radio" name="feat" value="${f.name}" ${f.selectable === false ? "disabled" : ""}></td>
              <td>${f.name}</td>
              <td>${f.prerequisites?.join(", ") || "—"}</td>
              <td>${f.description}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTalentTable(talents) {
  return `
    <h3>Talents</h3>
    <div class="scroll-table">
      <table>
        <thead><tr><th>Select</th><th>Name</th><th>Tree</th><th>Prerequisites</th><th>Description</th></tr></thead>
        <tbody>
          ${talents.map(t => `
            <tr>
              <td><input type="radio" name="talent" value="${t.name}" ${t.selectable === false ? "disabled" : ""}></td>
              <td>${t.name}</td>
              <td>${t.tree || "—"}</td>
              <td>${t.prerequisites?.join(", ") || "—"}</td>
              <td>${t.description}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function applySelections(actor, html) {
  const feat = html.find("input[name='feat']:checked").val();
  const talent = html.find("input[name='talent']:checked").val();
  if (feat) actor.system.feats.push({ name: feat });
  if (talent) actor.system.talents.push({ name: talent });
  ui.notifications.info(`${actor.name} leveled up with ${feat || "no feat"} and ${talent || "no talent"}.`);
}

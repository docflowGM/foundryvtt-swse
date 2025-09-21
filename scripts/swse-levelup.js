/**
 * swse‐levelup.js
 * Handles SWSE actor level‐up, including Bonus Feat & Talent selection.
 */

import { getFeats, getTalents, getClassData } from "./swse‐data.js";

/**
 * Entry point: call this when your actor levels up.
 * @param {Actor} actor    The Foundry actor
 * @param {number} newLevel The new class level (integer)
 */
export async function handleLevelUp(actor, newLevel) {
  const className = actor.system.class;
  const classData = getClassData(className);
  const lvlRow = classData.level_table.find(r => r.level === `${newLevel}th`);
  if (!lvlRow) {
    return ui.notifications.warn(`No progression data for ${className} level ${newLevel}.`);
  }

  const features   = lvlRow.class_features.toLowerCase();
  const allFeats   = features.includes("bonus feat")
    ? getFeats().filter(f => f.bonus_feat_for?.includes(className))
    : [];
  const allTalents = features.includes("talent")
    ? getTalents().filter(t => t.class === className)
    : [];

  // Mark selectable based on prerequisites
  const feats = allFeats.map(f => ({
    ...f,
    selectable: prerequisitesMet(f.prerequisites, actor)
  }));
  const talents = allTalents.map(t => ({
    ...t,
    selectable: prerequisitesMet(t.prerequisites, actor)
  }));

  renderLevelUpDialog(actor, newLevel, feats, talents);
}


/** Check an array of prereqs against actor data */
function prerequisitesMet(prereqs = [], actor) {
  return prereqs.every(req => actorHasRequirement(req, actor));
}

/** Very basic requirement parser: Abilities, feats, skills */
function actorHasRequirement(req, actor) {
  const text = req.toLowerCase();

  // Ability score: "Dex 13", "Str 15"
  let m = text.match(/(str|dex|con|int|wis|cha)\s*(\d+)/);
  if (m) {
    const [_, abbr, score] = m;
    return actor.system.abilities[abbr]?.value >= parseInt(score);
  }

  // Feat requirement: assumes full feat name in req string
  if (text.includes("feat")) {
    return (actor.system.feats || []).some(f => f.name.toLowerCase() === text);
  }

  // Skill requirement: "trained in Pilot"
  m = text.match(/trained in ([a-z ]+)/);
  if (m) {
    const skill = m[1].trim();
    const s = actor.system.skills?.[skill.toLowerCase()];
    return s?.trained;
  }

  return false;
}


/**
 * Build and display the Level‐Up dialog
 */
function renderLevelUpDialog(actor, level, feats, talents) {
  const content = `
    <h2>${actor.name} — Level ${level} (${actor.system.class})</h2>

    ${feats.length ? renderFeatSection(feats) : ""}
    ${talents.length ? renderTalentSection(talents) : ""}
  `;

  new Dialog({
    title: "Level Up",
    content,
    buttons: {
      confirm: {
        label: "Apply",
        callback: html => applySelections(actor, html)
      },
      cancel: { label: "Cancel" }
    },
    render: html => setupFilters(html),
    default: "confirm"
  }).render(true);
}


/** HTML for the Bonus Feat section */
function renderFeatSection(feats) {
  return `
    <h3>Bonus Feats</h3>
    <div class="filter-controls" id="feat-filters">
      <input id="feat-search" type="text" placeholder="Search feats…" />
      <label><input id="feat-only" type="checkbox" checked /> Only selectable</label>
    </div>
    <div class="scroll-table">
      <table id="feat-table">
        <thead>
          <tr>
            <th>Select</th>
            <th>Name</th>
            <th>Prerequisites</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${feats.map(f => `
            <tr data-name="${f.name.toLowerCase()}"
                data-prereqs="${(f.prerequisites||[]).map(p=>p.toLowerCase()).join(";")}"
                data-description="${f.description.toLowerCase()}"
                data-selectable="${f.selectable}">
              <td>
                <input type="radio" name="feat" value="${f.name}" ${!f.selectable ? "disabled" : ""} />
              </td>
              <td>${f.name}</td>
              <td>${(f.prerequisites||[]).join(", ") || "—"}</td>
              <td>${f.description}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/** HTML for the Talent section */
function renderTalentSection(talents) {
  return `
    <h3>Talents</h3>
    <div class="filter-controls" id="talent-filters">
      <input id="talent-search" type="text" placeholder="Search talents…" />
      <label><input id="talent-only" type="checkbox" checked /> Only selectable</label>
    </div>
    <div class="scroll-table">
      <table id="talent-table">
        <thead>
          <tr>
            <th>Select</th>
            <th>Name</th>
            <th>Tree</th>
            <th>Prerequisites</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${talents.map(t => `
            <tr data-name="${t.name.toLowerCase()}"
                data-tree="${(t.tree||"").toLowerCase()}"
                data-prereqs="${(t.prerequisites||[]).map(p=>p.toLowerCase()).join(";")}"
                data-description="${t.description.toLowerCase()}"
                data-selectable="${t.selectable}">
              <td>
                <input type="radio" name="talent" value="${t.name}" ${!t.selectable ? "disabled" : ""} />
              </td>
              <td>${t.name}</td>
              <td>${t.tree || "—"}</td>
              <td>${(t.prerequisites||[]).join(", ") || "—"}</td>
              <td>${t.description}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}


/**
 * After dialog renders, wire up search & "only selectable" filters
 */
function setupFilters(html) {
  // Feat filters
  const fSearch = html.find("#feat-search")[0];
  const fOnly   = html.find("#feat-only")[0];
  const fBody   = html.find("#feat-table tbody")[0];
  if (fSearch && fOnly && fBody) {
    const filterFeats = () => {
      const q = fSearch.value.toLowerCase();
      const only = fOnly.checked;
      Array.from(fBody.rows).forEach(row => {
        const name  = row.dataset.name;
        const prereqs = row.dataset.prereqs;
        const desc  = row.dataset.description;
        const ok    = only ? row.dataset.selectable === "true" : true;
        const match = [name, prereqs, desc].some(s => s.includes(q));
        row.style.display = (ok && match) ? "" : "none";
      });
    };
    fSearch.addEventListener("input", filterFeats);
    fOnly.addEventListener("change", filterFeats);
    filterFeats();
  }

  // Talent filters
  const tSearch = html.find("#talent-search")[0];
  const tOnly   = html.find("#talent-only")[0];
  const tBody   = html.find("#talent-table tbody")[0];
  if (tSearch && tOnly && tBody) {
    const filterTalents = () => {
      const q = tSearch.value.toLowerCase();
      const only = tOnly.checked;
      Array.from(tBody.rows).forEach(row => {
        const name  = row.dataset.name;
        const tree  = row.dataset.tree;
        const prereqs = row.dataset.prereqs;
        const desc  = row.dataset.description;
        const ok    = only ? row.dataset.selectable === "true" : true;
        const match = [name, tree, prereqs, desc].some(s => s.includes(q));
        row.style.display = (ok && match) ? "" : "none";
      });
    };
    tSearch.addEventListener("input", filterTalents);
    tOnly.addEventListener("change", filterTalents);
    filterTalents();
  }
}


/**
 * Apply selected feat & talent to the actor
 */
async function applySelections(actor, html) {
  const feat   = html.find("input[name='feat']:checked").val();
  const talent = html.find("input[name='talent']:checked").val();

  // Update feats
  if (feat) {
    const current = actor.system.feats || [];
    await actor.update({ "system.feats": [...current, { name: feat }] });
    ui.notifications.info(`${actor.name} gains Bonus Feat: ${feat}`);
  }

  // Update talents
  if (talent) {
    const current = actor.system.talents || [];
    await actor.update({ "system.talents": [...current, { name: talent }] });
    ui.notifications.info(`${actor.name} gains Talent: ${talent}`);
  }
}

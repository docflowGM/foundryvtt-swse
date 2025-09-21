// systems/swse/scripts/swse-levelup.js

/**
 * SWSE “Level Up” Dialog
 * Presents a wizard to advance your character:
 *  • Pick a class (new or existing)
 *  • Roll or take max HP
 *  • Select new Feats/Talents with live previews
 *  • At every 4th level, pick two distinct abilities to +1
 *  • Handle Force Training free‐power slots
 */

Hooks.on("renderSWSEActorSheet", (app, html) => {
  html.find(".level-up").click(ev => {
    ev.preventDefault();
    _swseLevelUp(app.actor);
  });
});

async function _swseLevelUp(actor) {
  // 1. Load compendia
  const [classes, feats, talents] = await Promise.all([
    game.packs.get("swse.swse-classes").getDocuments(),
    game.packs.get("swse.swse-feats").getDocuments(),
    game.packs.get("swse.swse-talents").getDocuments()
  ]);

  const nextLevel = actor.system.level + 1;
  const currentClass = actor.system.class;

  // 2. Build HTML form
  const classOptions = classes.map(c =>
    `<option value="${c.id}" ${c.name === currentClass ? "selected" : ""}>${c.name}</option>`
  ).join("");

  let content = `
  <form>
    <div class="form-group">
      <label>Class to Advance</label>
      <select name="classId">${classOptions}</select>
    </div>

    <div class="form-group">
      <label>HP Gain</label>
      <label><input type="radio" name="hpMode" value="roll" checked/> Roll</label>
      <label><input type="radio" name="hpMode" value="max"/> Maximum</label>
    </div>

    <div class="form-group">
      <label>Choose Feat(s)</label>
      <select name="featIds" multiple></select>
      <div class="feat-details"></div>
    </div>

    <div class="form-group">
      <label>Choose Talent(s)</label>
      <select name="talentIds" multiple></select>
      <div class="talent-details"></div>
    </div>`;

  // Ability increases on levels 4,8,12,16,20
  if ([4,8,12,16,20].includes(nextLevel)) {
    content += `
    <div class="form-group">
      <label>Ability Increases (pick 2 distinct)</label>
      <select name="abi1"></select>
      <select name="abi2"></select>
    </div>`;
  }

  content += `</form>`;

  // 3. Render Dialog
  new Dialog({
    title: `Level Up to ${nextLevel}`,
    content,
    render: html => {
      // Populate Feats & Talents
      const featSel   = html.find("[name=featIds]");
      const talentSel = html.find("[name=talentIds]");
      for (let f of feats) {
        featSel.append(`<option value="${f.id}">${f.name}</option>`);
      }
      for (let t of talents) {
        talentSel.append(`<option value="${t.id}">${t.name}</option>`);
      }

      // Populate Abilities if needed
      if (html.find("[name=abi1]").length) {
        const abilities = Object.keys(actor.system.abilities);
        const sel1 = html.find("[name=abi1]");
        const sel2 = html.find("[name=abi2]");
        for (let ab of abilities) {
          const label = ab.toUpperCase();
          sel1.append(`<option value="${ab}">${label}</option>`);
          sel2.append(`<option value="${ab}">${label}</option>`);
        }
      }

      // Live preview for Feat details
      featSel.change(() => {
        const id = featSel.val()[0];
        const f  = feats.find(x => x.id === id);
        featSel.closest(".form-group")
          .find(".feat-details")
          .html(f ? `
            <h4>${f.name}</h4>
            <p><strong>Prerequisite:</strong> ${f.system.prerequisites || "None"}</p>
            <p>${f.system.benefit || f.system.description || ""}</p>
          ` : "");
      });

      // Live preview for Talent details
      talentSel.change(() => {
        const id = talentSel.val()[0];
        const t  = talents.find(x => x.id === id);
        talentSel.closest(".form-group")
          .find(".talent-details")
          .html(t ? `
            <h4>${t.name}</h4>
            <p><strong>Prerequisite:</strong> ${t.system.prerequisites || "None"}</p>
            <p>${t.system.description || ""}</p>
          ` : "");
      });
    },
    buttons: {
      level: {
        icon: "<i class='fas fa-level-up-alt'></i>",
        label: "Apply",
        callback: async dlg => {
          const fd       = new FormData(dlg.find("form")[0]);
          const classId  = fd.get("classId");
          const hpMode   = fd.get("hpMode");
          const featIds  = fd.getAll("featIds");
          const talIds   = fd.getAll("talentIds");
          const abi1     = fd.get("abi1");
          const abi2     = fd.get("abi2");

          // 4. Class Record & HP
          const cls    = classes.find(c => c.id === classId);
          const lvlRec = cls.system.levels?.[nextLevel] || {};
          const hd     = lvlRec.hitDie || cls.system.hitDie || 0;
          const conMod = actor.system.abilities.con.mod;
          const rollHP = hpMode === "max"
            ? hd
            : new Roll(`1d${hd}`).roll({async:false}).total;
          const gained = rollHP + conMod;

          // 5. Update actor: level, class, HP
          await actor.update({
            "system.level": nextLevel,
            "system.class": cls.name,
            "system.hp.max": actor.system.hp.max + gained,
            "system.hp.value": actor.system.hp.value + gained
          });

          // 6. Grant Feats & Talents
          const toCreate = [];
          for (let id of featIds) {
            const f = feats.find(x => x.id === id);
            if (f) toCreate.push(duplicate(f.toObject()));
          }
          for (let id of talIds) {
            const t = talents.find(x => x.id === id);
            if (t) toCreate.push(duplicate(t.toObject()));
          }
          if (toCreate.length) {
            await actor.createEmbeddedDocuments("Item", toCreate);
          }

          // 7. Ability Increases on milestones
          if ([4,8,12,16,20].includes(nextLevel) && abi1 && abi2 && abi1 !== abi2) {
            const updates = {};
            updates[`system.abilities.${abi1}.base`] =
              actor.system.abilities[abi1].base + 1;
            updates[`system.abilities.${abi2}.base`] =
              actor.system.abilities[abi2].base + 1;
            await actor.update(updates);
          }

          // 8. Handle Force Training feat
          const hasFT = featIds
            .map(id => feats.find(f => f.id === id)?.name)
            .includes("Force Training")
            || actor.items.some(i => i.type === "feat" && i.name === "Force Training");
          if (hasFT) {
            const wisMod = actor.system.abilities.wis.mod;
            const newMax = 1 + wisMod;
            const oldCur = actor.system.freeForcePowers.current || 0;
            await actor.update({
              "system.freeForcePowers.max": newMax,
              "system.freeForcePowers.current": Math.max(oldCur, newMax)
            });
          }

          ui.notifications.info(`${actor.name} is now level ${nextLevel}!`);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "level"
  }).render(true);
}

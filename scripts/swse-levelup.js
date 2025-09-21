// systems/swse/scripts/swse-levelup.js
// A “Level Up” dialog and logic for SWSE

/**
 * Presents a Level-Up Dialog for the given actor.
 * Handles class choice, HP gain, feat/talent picks, and Force Training logic.
 */
async function onLevelUp(actor) {
  // 1. Load compendium data
  const classPack   = game.packs.get("swse.swse-classes");
  const featPack    = game.packs.get("swse.swse-feats");
  const talentPack  = game.packs.get("swse.swse-talents");
  const classes     = await classPack.getDocuments();
  const feats       = await featPack.getDocuments();
  const talents     = await talentPack.getDocuments();

  // 2. Build HTML form
  const currentClass = actor.system.class;
  const nextLevel    = actor.system.level + 1;
  const classOptions = classes.map(c =>
    `<option value="${c.id}" ${c.name===currentClass?"selected":""}>${c.name}</option>`
  ).join("");

  // We assume each class document has a `system.levels` map:
  // { "1":{ hitDie, feats, talents, freeForcePowers }, "2":{…}, … }
  // If your JSON differs, adapt the property names below.
  const content = `
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
      <select name="featIds" multiple>
        ${feats.map(f => `<option value="${f.id}">${f.name}</option>`).join("")}
      </select>
      <small>You may choose up to <span class="feat-slot-count"></span> feat(s).</small>
    </div>

    <div class="form-group">
      <label>Choose Talent(s)</label>
      <select name="talentIds" multiple>
        ${talents.map(t => `<option value="${t.id}">${t.name}</option>`).join("")}
      </select>
      <small>You may choose up to <span class="talent-slot-count"></span> talent(s).</small>
    </div>
  </form>`;

  // 3. Show the dialog
  new Dialog({
    title: `Level Up to ${nextLevel}`,
    content,
    render: html => {
      // After rendering, fill in slot counts from the selected class
      const updateSlots = () => {
        const cId = html.find("[name=classId]").val();
        const cls = classes.find(c => c.id === cId);
        const lvlData = cls.system.levels?.[ nextLevel ] || {};
        html.find(".feat-slot-count").text(lvlData.feats || 0);
        html.find(".talent-slot-count").text(lvlData.talents || 0);
        html.find("[name=featIds]").prop("multiple", true)
          .attr("size", lvlData.feats || 1);
        html.find("[name=talentIds]").prop("multiple", true)
          .attr("size", lvlData.talents || 1);
      };
      html.find("[name=classId]").change(updateSlots);
      updateSlots();
    },
    buttons: {
      level: {
        icon: "<i class='fas fa-level-up-alt'></i>",
        label: "Apply",
        callback: async dlg => {
          const form    = dlg.find("form")[0];
          const formD   = new FormData(form);
          const classId = formD.get("classId");
          const hpMode  = formD.get("hpMode");
          const featIds = formD.getAll("featIds");
          const talIds  = formD.getAll("talentIds");

          // 4. Determine class & level
          const cls    = classes.find(c => c.id === classId);
          const lvlRec = cls.system.levels?.[ nextLevel ] || {};
          const hitDie = lvlRec.hitDie || cls.system.hitDie || 0;

          // 5. HP gain
          const conMod = actor.system.abilities.con.mod;
          const rollHP = new Roll(`${hpMode==="max"?hitDie:`1d${hitDie}`}`).roll({async:false}).total;
          const gained = rollHP + conMod;
          await actor.update({
            "system.level": nextLevel,
            "system.hp.max": actor.system.hp.max + gained,
            "system.hp.value": actor.system.hp.value + gained,
            "system.class": cls.name
          });

          // 6. Grant feats & talents
          const toCreate = [];
          for (let id of featIds) {
            const f = feats.find(x => x.id === id);
            toCreate.push(duplicate(f.toObject()));
          }
          for (let id of talIds) {
            const t = talents.find(x => x.id === id);
            toCreate.push(duplicate(t.toObject()));
          }
          if (toCreate.length) {
            await actor.createEmbeddedDocuments("Item", toCreate);
          }

          // 7. Handle Force Training feat
          const hasFT = featIds
            .map(id => feats.find(f => f.id === id)?.name)
            .includes("Force Training")
            || actor.items.some(i=> i.type==="feat" && i.name==="Force Training");
          if (hasFT) {
            const wisMod = actor.system.abilities.wis.mod;
            const newMax = 1 + wisMod;
            const oldCur = actor.system.freeForcePowers.current;
            await actor.update({
              "system.freeForcePowers.max": newMax,
              "system.freeForcePowers.current": Math.max(oldCur, newMax)
            });
          }

          // 8. Grant any class‐based free Power slots
          if (lvlRec.freeForcePowers) {
            const oldCur = actor.system.freeForcePowers.current;
            await actor.update({
              "system.freeForcePowers.current": oldCur + lvlRec.freeForcePowers
            });
          }

          // 9. Notify
          ui.notifications.info(`${actor.name} is now level ${nextLevel}!`);
        }
      },
      cancel: {
        label: "Cancel"
      }
    },
    default: "level"
  }).render(true);
}

// Hook it up in your sheet
Hooks.on("renderSWSEActorSheet", (app, html) => {
  html.find(".level-up").click(ev => {
    ev.preventDefault();
    onLevelUp(app.actor);
  });
});

// Also, recalc freeForcePowers in prepareData if Wis or Force Training changes
class SWSEActor extends Actor {
  prepareData() {
    super.prepareData();
    // … your existing calls …
    this._syncFreeForcePowers();
  }

  _syncFreeForcePowers() {
    const hasFT = this.items.some(i=>
      i.type==="feat" && i.name==="Force Training"
    );
    if (!hasFT) return;
    const wisMod = this.system.abilities.wis.mod;
    const maxFP  = 1 + wisMod;
    const curFP  = this.system.freeForcePowers.current || 0;
    this.system.freeForcePowers.max     = maxFP;
    this.system.freeForcePowers.current = Math.max(curFP, maxFP);
  }
}

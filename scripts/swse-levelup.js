// systems/swse/scripts/swse-levelup.js
// Level-up flow implementation for SWSE
// Drop into systems/swse/scripts/ and ensure it's imported from init.js

const DATA_PATH_CLASSES = "/systems/swse/data/classes.json";
const DATA_PATH_FEATS   = "/systems/swse/data/feats.json";
const DATA_PATH_TALENTS = "/systems/swse/data/talents.json";

function attrMod(score) {
  return Math.floor((score - 10) / 2);
}

async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}`);
  return r.json();
}

/**
 * Utility: simple prereq checker (best-effort)
 * Expects prereqs to be string or array of strings from feats/talents JSON.
 * You may need to extend to parse exact prereq notation you have in JSON.
 */
function meetsPrereq(prereq, actor) {
  if (!prereq) return true;
  const pr = Array.isArray(prereq) ? prereq : [prereq];

  const actorSys = actor.system ?? actor.data?.system ?? {};
  const attributes = actorSys.attributes ?? actorSys.attributes ?? {};
  const scores = {
    str: attributes.str?.value ?? attributes.strength ?? actorSys.str ?? 10,
    dex: attributes.dex?.value ?? attributes.dexterity ?? actorSys.dex ?? 10,
    int: attributes.int?.value ?? attributes.intelligence ?? actorSys.int ?? 10,
    wis: attributes.wis?.value ?? attributes.wisdom ?? actorSys.wis ?? 10,
    cha: attributes.cha?.value ?? attributes.charisma ?? actorSys.cha ?? 10,
    con: attributes.con?.value ?? attributes.constitution ?? actorSys.con ?? 10
  };

  for (const p of pr) {
    if (!p) continue;
    const pp = p.toString().trim();

    // numeric attribute prereq like "Dex 13"
    const mAttr = pp.match(/^(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)/i);
    if (mAttr) {
      const abbr = mAttr[1].toLowerCase();
      const val = parseInt(mAttr[2], 10);
      if ((scores[abbr] || 0) < val) return false;
      continue;
    }

    // simple "Trained in X" (skill)
    if (/Trained in/i.test(pp)) {
      // assumes actor.system.skills is an object with skill IDs/names or array
      const skillName = pp.replace(/Trained in\s*/i, "").trim().toLowerCase();
      const skills = actor.system?.skills ?? actor.data?.system?.skills ?? {};
      const trained = Object.values(skills).some(s => (s.name ?? s).toString().toLowerCase().includes(skillName) && (s.trained || s.ranks || s.value));
      if (!trained) return false;
      continue;
    }

    // "Base attack bonus +6"
    const mBab = pp.match(/Base attack bonus\s*\+?(\d+)/i);
    if (mBab) {
      const babNeeded = parseInt(mBab[1], 10);
      const bab = actor.system?.bab ?? actor.data?.system?.baseAttackBonus ?? 0;
      if ((bab || 0) < babNeeded) return false;
      continue;
    }

    // if prereq is a feat name or talent name, check actor's lists
    const feats = actor.system?.feats ?? actor.data?.system?.feats ?? [];
    const talents = actor.system?.talents ?? actor.data?.system?.talents ?? [];

    const hasFeat = feats.some(f => (typeof f === "string" ? f.toLowerCase() : (f.name || f).toLowerCase()) === pp.toLowerCase());
    const hasTalent = talents.some(t => (typeof t === "string" ? t.toLowerCase() : (t.name || t).toLowerCase()) === pp.toLowerCase());

    if (!hasFeat && !hasTalent) {
      // fallback: if prereq string is present in actor flags or tags, allow — but be conservative and fail
      return false;
    }
  }

  return true;
}

/**
 * returns whether the level is an attribute milestone (4/8/12/16/20 or every 4)
 */
function isAttributeMilestone(level) {
  return level >= 4 && (level % 4 === 0);
}

/**
 * returns whether the level grants a free feat per your rule:
 * levels 3/5/7/9/... (odd levels except 1)
 */
function isFreeFeatLevel(level) {
  return level >= 3 && (level % 2 === 1);
}

/**
 * Helper to compute new defense bonus: apply if larger than current class bonus
 * classDefenseBonuses: object {reflex: n, fortitude: n, will: n}
 * actor has existing defenses in actor.system.defenses.* (or similar)
 */
function applyDefenseBonuses(actor, classDefenseBonuses) {
  const sys = actor.system ?? actor.data?.system ?? {};
  const defenses = sys.defenses ?? sys; // adapt to your actor structure

  // default path names: reflex, flatFooted, fortitude, will
  const out = {};
  for (const k of ["reflex", "fortitude", "will"]) {
    const existing = defenses?.[`classBonus_${k}`] ?? defenses[`classBonus${k.charAt(0).toUpperCase()+k.slice(1)}`] ?? 0;
    const candidate = classDefenseBonuses[k] ?? 0;
    out[k] = candidate > existing ? candidate : existing;
  }
  return out;
}

/**
 * Main level-up dialog flow
 * actor: Actor instance
 * newLevelInfo: {classId: optional string to be leveled, targetClassAction: "level"|"newcore"|"prestige", pickClassIdForNew: optional}
 */
async function startLevelUpFlow(actor) {
  if (!actor || actor.type !== "character") return ui.notifications.warn("Level-up is only for character actors.");

  // load static data for options
  let classesList = [], featsList = [], talentsList = [];
  try {
    classesList = await loadJSON(DATA_PATH_CLASSES);
    featsList = await loadJSON(DATA_PATH_FEATS);
    talentsList = await loadJSON(DATA_PATH_TALENTS);
  } catch (err) {
    ui.notifications.error("Failed to load class/feat/talent data: " + err.message);
    return;
  }

  // current level and targeted increment
  const actorSys = actor.system ?? actor.data?.system ?? {};
  const currentLevel = actorSys.level ?? actor.data?.system?.level ?? 1;
  const newTotalLevel = currentLevel + 1;
  const planned = {
    levelGained: 1,
    oldLevel: currentLevel,
    newLevel: newTotalLevel,
    attributeChanges: {}, // e.g. {str: +1}
    skillToTrain: null, // skill id
    classChoice: null, // {action:'level'|'newcore'|'prestige', classId, newClassLevel:1}
    pickedFeats: [], // list
    pickedClassFeat: null,
    pickedTalents: [],
    hpChoice: null, // {type:'roll'|'max', rolledHP: n, hpGain: n}
    forcePointsGain: 0,
    defenseChanges: {}
  };

  // Step 1: Attribute milestone?
  if (isAttributeMilestone(newTotalLevel)) {
    // 2 free attribute points to distribute among S D I W C? you asked S D C I W C order — I'll show S D I W C (Strength, Dex, Int, Wis, Cha), Con omitted for droids? user said S D C I W C earlier — use attributes SDIWC. We'll present STR/DEX/INT/WIS/CHA and CON if actor has CON (PCs usually have Con).
    const attributes = ["str","dex","con","int","wis","cha"];
    // Build UI to allocate 2 points with +/- and live update of mods
    const dialogHtml = (currentValues, selectedDeltas= {str:0,dex:0,con:0,int:0,wis:0,cha:0}) => {
      const rows = attributes.map(a => {
        const cur = currentValues[a] ?? 10;
        const delta = selectedDeltas[a] ?? 0;
        const newVal = cur + delta;
        return `
          <div style="display:flex;align-items:center;gap:10px;margin:6px 0">
            <div style="width:90px"><strong>${a.toUpperCase()}</strong></div>
            <div>Current: ${cur} (mod ${attrMod(cur) >= 0 ? "+"+attrMod(cur) : attrMod(cur)})</div>
            <div>New: <span class="newVal_${a}">${newVal}</span> (mod <span class="newMod_${a}">${attrMod(newVal)}</span>)</div>
            <div>
              <button data-attr="${a}" data-op="minus" type="button">-</button>
              <button data-attr="${a}" data-op="plus" type="button">+</button>
            </div>
          </div>
        `;
      }).join("");
      const remaining = 2 - Object.values(selectedDeltas).reduce((s,n)=>s+(n>0?n:0),0);
      return `<div><p>You have 2 attribute points to spend. Remaining: <span id="remaining">${remaining}</span></p>${rows}</div>`;
    };

    // read current attribute scores
    const currentAttrs = {};
    const attPath = actorSys.attributes ?? actor.data?.system?.attributes ?? {};
    currentAttrs.str = attPath.str?.value ?? attPath.strength ?? 10;
    currentAttrs.dex = attPath.dex?.value ?? attPath.dexterity ?? 10;
    currentAttrs.con = attPath.con?.value ?? attPath.constitution ?? 10;
    currentAttrs.int = attPath.int?.value ?? attPath.intelligence ?? 10;
    currentAttrs.wis = attPath.wis?.value ?? attPath.wisdom ?? 10;
    currentAttrs.cha = attPath.cha?.value ?? attPath.charisma ?? 10;

    let deltas = {str:0,dex:0,con:0,int:0,wis:0,cha:0};
    const attrPromise = new Promise(resolve => {
      const d = new Dialog({
        title: "Level-up — Attribute Increase (2 points)",
        content: dialogHtml(currentAttrs,deltas),
        buttons: {
          ok: { label: "Next", callback: () => resolve(deltas) },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "ok",
        render: (html) => {
          // attach click handlers for +/-
          html.on("click", "button[data-op]", ev => {
            const op = ev.currentTarget.dataset.op;
            const a = ev.currentTarget.dataset.attr;
            // only allow allocating up to 2 total points, min 0 for each attribute (no negatives)
            const currentlyAllocated = Object.values(deltas).reduce((s,n)=>s+(n>0?n:0),0);
            if (op === "plus") {
              if (currentlyAllocated >= 2) return ui.notifications.warn("No remaining points.");
              deltas[a] = (deltas[a] || 0) + 1;
            } else {
              if ((deltas[a] || 0) <= 0) return;
              deltas[a] = (deltas[a] || 0) - 1;
            }
            // re-render content
            const newHtml = dialogHtml(currentAttrs,deltas);
            html.find(".dialog-content").html(newHtml);
            // rebind handlers (crudely)
            d.render(true);
          });
        },
        close: html => {}
      }, {width: 600});
      d.render(true);
    });

    const result = await attrPromise;
    if (result === null) return ui.notifications.info("Level up canceled.");
    // record attributeChanges (only positives)
    for (const k of Object.keys(result)) {
      if ((result[k] || 0) > 0) planned.attributeChanges[k] = result[k];
    }

    // If INT increased such that mod changed, grant a free skill training
    const intBefore = currentAttrs.int;
    const intAfter = intBefore + (planned.attributeChanges.int || 0);
    if (attrMod(intAfter) > attrMod(intBefore)) {
      // collect eligible skills that are NOT currently trained
      const skills = actor.system?.skills ?? actor.data?.system?.skills ?? {};
      // skills may be keyed; build list
      const skillEntries = Object.entries(skills).map(([k,v]) => ({id:k, name: v.name ?? k, trained: !!(v.trained || v.ranks || v.value)}));
      const notTrained = skillEntries.filter(s => !s.trained);

      if (notTrained.length > 0) {
        const skOptions = notTrained.map(s => ({id:s.id, name:`${s.name} (mod ${attrMod(currentAttrs[(s.id||"").slice(0,3)]||10)})`}));
        const picked = await new Promise(res => {
          new Dialog({
            title: "Intelligence increase — free skill training",
            content: `<p>Pick one skill to become trained in:</p>`,
            buttons: {
              choose: { label: "Choose", callback: (html) => {
                const sel = html.find('select[name="skill"]').val();
                res(sel || null);
              }},
              skip: { label: "Skip", callback: () => res(null) }
            },
            render: (html) => {
              const sel = `<select name="skill">${skOptions.map(o=>`<option value="${o.id}">${o.name}</option>`) .join("")}</select>`;
              html.find(".dialog-content").html(sel);
            },
            default: "choose",
            close: () => res(null)
          }).render(true);
        });

        if (picked) planned.skillToTrain = picked;
      }
    }
  } // end attribute milestone

  // Step 2: Class Leveling choices
  // Present existing classes and option to take new core or prestige (we assume actor.system.classes is array)
  const actorClasses = actorSys.classes ?? actor.data?.system?.classes ?? [];
  // actorClasses likely: [{id:'jedi', level:3}, {...}]
  const classOptions = actorClasses.map(c => ({id:c.id, name:`Level up ${c.id} (current ${c.level || c.levels || 0})`}));

  // Gather core classes and prestige classes from classesList
  const coreClasses = classesList.filter(cl => cl.type?.toLowerCase() === "heroic" || cl.category === "core" || (!cl.prestige && !cl.heroic) );
  const prestigeClasses = classesList.filter(cl => (cl.type?.toLowerCase() === "prestige" || cl.prestige));

  const classChoiceOptions = [
    ...classOptions,
    {id:"__new_core__", name:"Take a new core class (level 1)"},
    {id:"__prestige__", name:"Take a prestige class"}
  ];

  const chosenClassId = await new Promise(resolve => {
    new Dialog({
      title: "Class Leveling",
      content: `<p>Choose how to apply your new level: Level an existing class, take a new core class at level 1, or take a prestige class (if eligible).</p>`,
      buttons: {
        ok: { label: "OK", callback: (html) => {
          const sel = html.find('input[name="classChoice"]:checked').val();
          resolve(sel || null);
        }},
        cancel: { label: "Cancel", callback: () => resolve(null) }
      },
      render: (html) => {
        const htmlOptions = classChoiceOptions.map(o => `
          <label><input type="radio" name="classChoice" value="${o.id}" /> ${o.name}</label><br/>`
        ).join("");
        html.find(".dialog-content").html(htmlOptions);
      },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });

  if (!chosenClassId) return ui.notifications.info("Level up canceled.");

  if (chosenClassId === "__new_core__") {
    // allow pick from core classes (heroic)
    const picked = await new Promise(res => {
      new Dialog({
        title: "Pick Core Class",
        content: `<p>Select the core class to take at level 1:</p>`,
        buttons: {
          ok: { label: "OK", callback: (html)=> res(html.find('select[name="pickClass"]').val() || null) },
          cancel: { label: "Cancel", callback: () => res(null) }
        },
        render: (html)=>{
          const opts = coreClasses.map(c=>`<option value="${c.name||c.id}">${c.name||c.id}</option>`).join("");
          html.find(".dialog-content").html(`<select name="pickClass">${opts}</select>`);
        },
        default: "ok",
        close: ()=>res(null)
      }).render(true);
    });
    if (!picked) return ui.notifications.info("Level up canceled.");
    planned.classChoice = {action:"newcore", classId:picked, newClassLevel:1};
  } else if (chosenClassId === "__prestige__") {
    // choose prestige class — enforce prereqs
    // filter prestigeClasses by prerequisites satisfied
    const eligiblePrestige = prestigeClasses.filter(pc => {
      // assume pc.prerequisite exists in class data as array/string
      return meetsPrereq(pc.prerequisite, actor);
    });

    if (eligiblePrestige.length === 0) {
      ui.notifications.warn("No eligible prestige classes found based on prerequisites.");
      // back to choose level an existing class
      planned.classChoice = {action:"level", classId: actorClasses[0]?.id ?? null};
    } else {
      const picked = await new Promise(res => {
        new Dialog({
          title: "Choose Prestige Class",
          content: `<p>Select one prestige class:</p>`,
          buttons: {
            ok: { label: "OK", callback: (html)=> res(html.find('select[name="prestige"]').val() || null) },
            cancel: { label: "Cancel", callback: () => res(null) }
          },
          render: (html)=>{
            const opts = eligiblePrestige.map(c=>`<option value="${c.name||c.id}">${c.name||c.id}</option>`).join("");
            html.find(".dialog-content").html(`<select name="prestige">${opts}</select>`);
          },
          default: "ok",
          close: ()=>res(null)
        }).render(true);
      });
      if (!picked) return ui.notifications.info("Level up canceled.");
      planned.classChoice = {action:"prestige", classId:picked, newClassLevel:1};
    }
  } else {
    // leveling an existing class
    planned.classChoice = {action:"level", classId:chosenClassId, newClassLevel: (actorClasses.find(c=>c.id===chosenClassId)?.level || 0) + 1};
  }

  // Step 3: Free feat on odd levels (3/5/7/9/...)
  if (isFreeFeatLevel(newTotalLevel)) {
    // Build list of eligible feats by prerequisites
    const eligibleFeats = featsList.filter(f => meetsPrereq(f.prerequisite, actor));
    // Present UI with "choose any feat" available
    const featChoices = [{id:"__all__", name:"Choose any feat (open full list)"}].concat(eligibleFeats.map(f=>({id:f.name, name:`${f.name} — ${f.type || ""}`})));
    const chosenFeat = await new Promise(res => {
      new Dialog({
        title: "Free Feat Choice",
        content: `<p>Pick a feat from eligible options, or choose any feat.</p>`,
        buttons: {
          ok: { label: "OK", callback: (html) => res(html.find('select[name="feat"]').val() || null) },
          skip: { label: "Skip", callback: () => res(null)}
        },
        render: (html) => {
          const options = featChoices.map(o=>`<option value="${o.id}">${o.name}</option>`).join("");
          html.find(".dialog-content").html(`<select name="feat">${options}</select>`);
        },
        default: "ok",
        close: ()=>res(null)
      }).render(true);
    });

    if (chosenFeat === "__all__") {
      // show full featsList
      const allPick = await new Promise(res => {
        new Dialog({
          title: "Choose Any Feat",
          content: `<p>Choose any feat (prereqs still must be satisfied).</p>`,
          buttons: {
            ok: { label: "OK", callback: (html) => res(html.find('select[name="allfeat"]').val() || null) },
            cancel: { label: "Cancel", callback: ()=>res(null) }
          },
          render: (html) => {
            const opts = featsList.map(f=>`<option value="${f.name}">${f.name}</option>`).join("");
            html.find(".dialog-content").html(`<select name="allfeat">${opts}</select>`);
          },
          default: "ok",
          close: ()=>res(null)
        }).render(true);
      });
      if (allPick) planned.pickedFeats.push(allPick);
    } else if (chosenFeat) {
      planned.pickedFeats.push(chosenFeat);
    }
  }

  // Step 4: Class feat if class grants at this level
  // We attempt to read class benefits from classesList entry
  const thisClassDef = classesList.find(c => c.name === planned.classChoice.classId || c.id === planned.classChoice.classId);
  if (thisClassDef) {
    const classFeatAtLevel = (thisClassDef.classFeatsLevels ?? []).includes(newTotalLevel) || ((thisClassDef.classFeatPerLevel || 0) > 0 && planned.classChoice.action !== "newcore");
    if (classFeatAtLevel) {
      // present class feat options - assume thisClassDef.classFeats is an array of feat names
      const classFeatOptions = (thisClassDef.classFeats ?? []).map(fn => ({id:fn, name:fn}));
      // allow "pick any" at top
      const chosen = await new Promise(res => {
        new Dialog({
          title: "Class Feat",
          content: `<p>Pick a class feat from this class (or choose any feat).</p>`,
          buttons: {
            ok: { label: "OK", callback: (html)=> res(html.find('select[name="cf"]').val() || null) },
            skip: { label: "Skip", callback: ()=>res(null) }
          },
          render: (html) => {
            const opts = [{id:"__any__",name:"Choose any feat"}].concat(classFeatOptions).map(o=>`<option value="${o.id}">${o.name}</option>`).join("");
            html.find(".dialog-content").html(`<select name="cf">${opts}</select>`);
          },
          default: "ok",
          close: ()=>res(null)
        }).render(true);
      });
      if (chosen === "__any__") {
        const anyPick = await new Promise(res => {
          new Dialog({
            title: "Any Feat",
            content:`<p>Pick any feat from the list (prereqs apply).</p>`,
            buttons: { ok: {label:"OK", callback:(html)=>res(html.find('select[name="anyfeat"]').val() || null)}, cancel:{label:"Cancel", callback:()=>res(null)}},
            render: (html)=> {html.find(".dialog-content").html(`<select name="anyfeat">${featsList.map(f=>`<option value="${f.name}">${f.name}</option>`).join("")}</select>`);},
            default:"ok",
            close:()=>res(null)
          }).render(true);
        });
        if (anyPick) planned.pickedClassFeat = anyPick;
      } else if (chosen) {
        planned.pickedClassFeat = chosen;
      }
    }
  }

  // Step 5: Talents for class if applicable
  if (thisClassDef && (thisClassDef.talentPerLevel || (thisClassDef.talentsAtLevels ?? []).includes(newTotalLevel))) {
    // present talents in this class tree that meet prereqs
    const possibleTalents = talentsList.filter(t => (t.class ?? []).includes(thisClassDef.name || thisClassDef.id));
    const eligibleTalents = possibleTalents.filter(t => meetsPrereq(t.prerequisite, actor));
    if (eligibleTalents.length > 0) {
      const tPick = await new Promise(res => {
        new Dialog({
          title: "Pick Talent",
          content: `<p>Pick a talent from the class talent trees you are eligible for (or choose any talent)</p>`,
          buttons: { ok: {label:"OK", callback:(html)=>res(html.find('select[name="tal"]').val()||null)}, skip:{label:"Skip", callback:()=>res(null)}},
          render: (html)=> {
            const opts = [{id:"__any__",name:"Choose any talent"}].concat(eligibleTalents.map(t=>({id:t.name,name:t.name}))).map(o=>`<option value="${o.id}">${o.name}</option>`).join("");
            html.find(".dialog-content").html(`<select name="tal">${opts}</select>`);
          },
          default:"ok",
          close:()=>res(null)
        }).render(true);
      });
      if (tPick === "__any__") {
        const anyTal = await new Promise(res => {
          new Dialog({
            title: "Any Talent",
            content: `<p>Choose any talent you meet prereqs for.</p>`,
            buttons: { ok:{label:"OK", callback:(html)=>res(html.find('select[name="anytal"]').val()||null)}, cancel:{label:"Cancel", callback:()=>res(null)}},
            render: (html)=> {
              const elig = talentsList.filter(t=>meetsPrereq(t.prerequisite, actor));
              html.find(".dialog-content").html(`<select name="anytal">${elig.map(t=>`<option value="${t.name}">${t.name}</option>`).join("")}</select>`);
            },
            default:"ok",
            close:()=>res(null)
          }).render(true);
        });
        if (anyTal) planned.pickedTalents.push(anyTal);
      } else if (tPick) {
        planned.pickedTalents.push(tPick);
      }
    }
  }

  // Step 6: HP and Force Points choices
  // Determine HP die for chosen class (if leveling existing class use that class's hit die)
  let hitDie = thisClassDef?.hitDie ?? 6; // default
  // current con before distribution
  const baseAttrs = actorSys.attributes ?? actor.data?.system?.attributes ?? {};
  const conBefore = baseAttrs.con?.value ?? baseAttrs.con ?? 10;
  const conAfter = conBefore + (planned.attributeChanges.con || 0);
  const conModBefore = attrMod(conBefore);
  const conModAfter = attrMod(conAfter);
  const conModDelta = conModAfter - conModBefore;

  const hpChoice = await new Promise(res => {
    new Dialog({
      title: "HP & Force Points",
      content: `<p>Choose HP method for this level:</p>
                <form>
                  <label><input type="radio" name="hp" value="roll" checked/> Roll (${hitDie}d) + Con mod</label><br/>
                  <label><input type="radio" name="hp" value="max"/> Take max (${hitDie}) + Con mod</label><br/>
                </form>`,
      buttons: {
        ok: { label: "OK", callback: (html)=> {
          const hpMode = html.find('input[name="hp"]:checked').val();
          res(hpMode);
        }},
        cancel: { label: "Cancel", callback: ()=>res(null) }
      },
      default: "ok",
      close: ()=>res(null)
    }).render(true);
  });

  if (!hpChoice) return ui.notifications.info("Level up canceled.");

  let hpGain = 0;
  if (hpChoice === "max") {
    hpGain = hitDie + conModAfter;
  } else {
    // roll hitDie once for one level
    const roll = new Roll(`1d${hitDie}`).roll({async:false});
    const r = roll.total;
    hpGain = r + conModAfter;
  }
  planned.hpChoice = {type:hpChoice, hpGain, conModDelta};

  // Force Points: compute gains from class; best-effort: use class.forcePointGain or default 0
  const fpGain = thisClassDef?.forcePointsAtLevel?.[planned.classChoice.newClassLevel] ?? thisClassDef?.forcePointsPerLevel ?? 0;
  planned.forcePointsGain = fpGain || 0;

  // Step Final: Defense bonuses (if new class grants class defense)
  const clsDefense = thisClassDef?.defenseBonus ?? {reflex:0,fortitude:0,will:0};
  planned.defenseChanges = applyDefenseBonuses(actor, clsDefense);

  // Review dialog: show a summary and allow apply or cancel
  const summary = `
    <h3>Review Level Up</h3>
    <p>Old Level: ${planned.oldLevel}, New Level: ${planned.newLevel}</p>
    <p>Attribute changes: ${JSON.stringify(planned.attributeChanges)}</p>
    <p>Skill trained: ${planned.skillToTrain || "None"}</p>
    <p>Class change: ${planned.classChoice.action} - ${planned.classChoice.classId || "N/A"}</p>
    <p>Picked feats: ${planned.pickedFeats.concat(planned.pickedClassFeat ? [planned.pickedClassFeat] : []).join(", ") || "None"}</p>
    <p>Picked talents: ${planned.pickedTalents.join(", ") || "None"}</p>
    <p>HP gain this level: ${planned.hpChoice.hpGain} (method: ${planned.hpChoice.type})</p>
    <p>Force Points gained: ${planned.forcePointsGain}</p>
    <p>Defense class bonus changes (applied if greater than existing): Reflex ${planned.defenseChanges.reflex}, Fortitude ${planned.defenseChanges.fortitude}, Will ${planned.defenseChanges.will}</p>
  `;

  const confirm = await new Promise(res => {
    new Dialog({
      title: "Apply Level Up?",
      content: summary,
      buttons: {
        apply: { label: "Apply", callback: () => res(true) },
        cancel: { label: "Cancel", callback: () => res(false) }
      },
      default: "apply",
      close: () => res(false)
    }).render(true);
  });

  if (!confirm) return ui.notifications.info("Level up cancelled - no changes applied.");

  // Apply changes in one update
  const updateData = {};

  // 1) Apply attributes
  if (Object.keys(planned.attributeChanges).length > 0) {
    // Update actor.system.attributes.*.value
    const attrPath = actorSys.attributes ?? actor.data?.system?.attributes ?? {};
    for (const [k,v] of Object.entries(planned.attributeChanges)) {
      // path to field depends on system; we'll attempt common: system.attributes.str.value
      const path = `system.attributes.${k}.value`;
      // retrieve current value safely
      const cur = getProperty(actor.data, path) ?? (actor.system?.attributes?.[k]?.value) ?? 10;
      updateData[path] = (cur || 0) + v;
    }
  }

  // 2) Train skill if any: set actor.system.skills[skillId].trained = true
  if (planned.skillToTrain) {
    const skPath = `system.skills.${planned.skillToTrain}.trained`;
    updateData[skPath] = true;
  }

  // 3) Class changes: increase level or add class
  if (!actorSys.classes) {
    updateData["system.classes"] = [];
  }
  // we'll read and modify with actor.updateEmbeddedDocuments if needed
  // For simplicity: mutate classes array then set system.classes
  const existingClasses = JSON.parse(JSON.stringify(actorSys.classes || actor.data?.system?.classes || []));
  if (planned.classChoice.action === "level") {
    const idx = existingClasses.findIndex(c => c.id === planned.classChoice.classId || c.name === planned.classChoice.classId);
    if (idx >= 0) {
      existingClasses[idx].level = (existingClasses[idx].level || 0) + 1;
    } else {
      // fallback - push it
      existingClasses.push({id: planned.classChoice.classId, level: 1});
    }
  } else {
    // newcore or prestige: add new class at level 1 (or level 1 but user wanted "as if after level one" - user said they get HP as usual for level 1 and defense)
    existingClasses.push({id: planned.classChoice.classId, level: 1});
  }
  updateData["system.classes"] = existingClasses;

  // 4) Add feats/talents
  if (planned.pickedFeats.length > 0 || planned.pickedClassFeat) {
    const curFeats = JSON.parse(JSON.stringify(actorSys.feats || actor.data?.system?.feats || []));
    planned.pickedFeats.forEach(f => curFeats.push(f));
    if (planned.pickedClassFeat) curFeats.push(planned.pickedClassFeat);
    updateData["system.feats"] = curFeats;
  }
  if (planned.pickedTalents.length > 0) {
    const curTal = JSON.parse(JSON.stringify(actorSys.talents || actor.data?.system?.talents || []));
    planned.pickedTalents.forEach(t => curTal.push(t));
    updateData["system.talents"] = curTal;
  }

  // 5) HP and Force points
  const curHP = actorSys.HP ?? actor.data?.system?.HP ?? actorSys.hp ?? 0;
  const newHP = (curHP || 0) + (planned.hpChoice.hpGain || 0);
  updateData["system.HP"] = newHP;

  if (planned.forcePointsGain) {
    const curFP = actorSys.forcePoints ?? actor.data?.system?.forcePoints ?? 0;
    updateData["system.forcePoints"] = (curFP || 0) + planned.forcePointsGain;
  }

  // 6) defense class bonuses - write into system.classBonuses.*
  // we use system.classBonuses.{reflex,fortitude,will}
  updateData["system.classBonuses.reflex"] = planned.defenseChanges.reflex;
  updateData["system.classBonuses.fortitude"] = planned.defenseChanges.fortitude;
  updateData["system.classBonuses.will"] = planned.defenseChanges.will;

  // 7) increment total level value (system.level)
  updateData["system.level"] = planned.newLevel;

  // Commit update
  await actor.update(updateData);

  ui.notifications.info(`${actor.name} leveled up to ${planned.newLevel}. Changes applied.`);
}

// Add Level Up button in character sheet header and wire to above flow
Hooks.on("renderSWSEActorSheet", (app, html, data) => {
  // Only for character sheets
  if (app.actor?.type !== "character") return;
  // add button to header if not already present
  const header = html.find(".sheet-header") || html.find(".sheet-body");
  if (!header || header.length === 0) return;

  if (header.find(".swse-levelup-btn").length === 0) {
    const btn = $(`<button class="swse-levelup-btn">Level Up</button>`);
    btn.css({marginLeft:"8px"});
    header.prepend(btn);
    btn.on("click", async ev => {
      await startLevelUpFlow(app.actor);
    });
  }
});

// Also expose a chat command for quick testing
Hooks.once("ready", () => {
  console.log("SWSE | levelup module ready - use the Level Up button on actor sheets.");
  // optional: register a keyboard command or chat macro
});

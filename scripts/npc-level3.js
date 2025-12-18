Hooks.on("ready", () => {

  Hooks.on("renderActorSheet", (sheet, html, data) => {

    if (!sheet.actor || sheet.actor.type !== "npc") return;

    // Collapse logic
    html.find(".npc-block-header").click(ev => {
      const block = ev.currentTarget.closest(".npc-block");
      block.classList.toggle("open");
    });

    // Threat ring auto-logic
    const actor = sheet.actor;
    let manual = actor.getFlag("swse","threatLevel");
    if (!manual) {
      let role = actor.system.role || actor.system.type;
      let cr = Number(actor.system.challenge || 1);

      let level = "standard";

      if (role) {
        if (role == "minion") level = "minion";
        else if (role == "elite") level = "elite";
        else if (role == "boss") level = "boss";
      } else {
        if (cr <= 3) level = "minion";
        else if (cr <= 8) level = "standard";
        else if (cr <= 14) level = "elite";
        else level = "boss";
      }

      actor.setFlag("swse","threatLevel", level);
    }

  });
});

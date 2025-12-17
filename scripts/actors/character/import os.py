JS_METHODS = r'''
  // ==========================================================
  // ASSET AUTOMATION: Utility + Helper Methods
  // ==========================================================

  // -------------------------------------------
  // INTERNAL: Fetch an asset list by type
  // -------------------------------------------
  _getAssetListForType(type) {
    const sys = this.actor.system;
    if (type === "droid") return sys.droids || [];
    if (type === "vehicle") return sys.vehicles || [];
    if (type === "Follower") return sys.followers || [];
    if (type === "Npc") return sys.followers || [];
    if (type === "beast") return sys.animalCompanions || [];
    return [];
  },

  // -------------------------------------------
  // INTERNAL: Save asset list by type
  // -------------------------------------------
  async _saveAssetList(type, assets) {
    if (type === "droid") {
      return this.actor.update({ "system.droids": assets });
    }
    if (type === "vehicle") {
      return this.actor.update({ "system.vehicles": assets });
    }
    if (type === "Follower" || type === "Npc") {
      return this.actor.update({ "system.followers": assets });
    }
    if (type === "beast") {
      return this.actor.update({ "system.animalCompanions": assets });
    }
  },


  // ==========================================================
  // NAME / RENAME METHODS
  // ==========================================================
  async _onRenameAsset(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.id;

    const name = await Dialog.prompt({
      title: "Rename Asset",
      content: `<p>Enter new name:</p><input type="text" id="new-name" />`,
      label: "Rename",
      callback: html => html[0].querySelector("#new-name").value
    });

    if (!name) return;

    const sys = this.actor.system;
    let updated = false;

    // Update inside each asset list if the ID exists
    if (sys.droids?.some(a => a._id === id)) {
      const list = sys.droids.map(a => a._id === id ? { ...a, name } : a);
      await this.actor.update({ "system.droids": list });
      updated = true;
    }

    if (sys.vehicles?.some(a => a._id === id)) {
      const list = sys.vehicles.map(a => a._id === id ? { ...a, name } : a);
      await this.actor.update({ "system.vehicles": list });
      updated = true;
    }

    if (sys.followers?.some(a => a._id === id)) {
      const list = sys.followers.map(a => a._id === id ? { ...a, name } : a);
      await this.actor.update({ "system.followers": list });
      updated = true;
    }

    if (sys.animalCompanions?.some(a => a._id === id)) {
      const list = sys.animalCompanions.map(a => a._id === id ? { ...a, name } : a);
      await this.actor.update({ "system.animalCompanions": list });
      updated = true;
    }

    if (updated) ui.notifications.info(`Renamed asset to ${name}.`);
  },


  // ==========================================================
  // REMOVE ASSET (button + drag-out)
  // ==========================================================
  async _onRemoveAsset(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.id;

    const ok = await Dialog.confirm({
      title: "Remove Asset",
      content: "<p>Are you sure?</p>"
    });
    if (!ok) return;

    const sys = this.actor.system;

    const removeFrom = async (key) => {
      const list = sys[key].filter(a => a._id !== id);
      await this.actor.update({ [`system.${key}`]: list });
    };

    if (sys.droids?.some(a => a._id === id)) return removeFrom("droids");
    if (sys.vehicles?.some(a => a._id === id)) return removeFrom("vehicles");
    if (sys.followers?.some(a => a._id === id)) return removeFrom("followers");
    if (sys.animalCompanions?.some(a => a._id === id)) return removeFrom("animalCompanions");
  },


  // ==========================================================
  // HP + CONDITION UPDATER
  // ==========================================================
  async _onAssetHpChange(event) {
    const id = event.currentTarget.dataset.id;
    const val = Number(event.currentTarget.value);

    const sys = this.actor.system;

    const update = async (key) => {
      const updated = sys[key].map(a =>
        a._id === id ? { ...a, hp: { ...a.hp, value: val } } : a
      );
      await this.actor.update({ [`system.${key}`]: updated });
    };

    if (sys.droids?.some(a => a._id === id)) return update("droids");
    if (sys.vehicles?.some(a => a._id === id)) return update("vehicles");
    if (sys.followers?.some(a => a._id === id)) return update("followers");
    if (sys.animalCompanions?.some(a => a._id === id)) return update("animalCompanions");
  },


  async _onAssetConditionChange(event) {
    const id = event.currentTarget.dataset.id;
    const val = Number(event.currentTarget.value);

    const sys = this.actor.system;

    const update = async (key) => {
      const updated = sys[key].map(a =>
        a._id === id ? { ...a, condition: val } : a
      );
      await this.actor.update({ [`system.${key}`]: updated });
    };

    if (sys.droids?.some(a => a._id === id)) return update("droids");
    if (sys.vehicles?.some(a => a._id === id)) return update("vehicles");
    if (sys.followers?.some(a => a._id === id)) return update("followers");
    if (sys.animalCompanions?.some(a => a._id === id)) return update("animalCompanions");
  },


  // ==========================================================
  // TAGGING
  // ==========================================================
  async _addAssetTag(event) {
    const id = event.currentTarget.dataset.id;

    const tag = await Dialog.prompt({
      title: "Add Tag",
      content: `<input type="text" id="tagin" placeholder="Tag" />`,
      callback: html => html[0].querySelector("#tagin").value
    });

    if (!tag) return;

    const sys = this.actor.system;

    const apply = async (key) => {
      const updated = sys[key].map(a =>
        a._id === id ? { ...a, tags: [...(a.tags || []), tag] } : a
      );
      await this.actor.update({ [`system.${key}`]: updated });
    };

    if (sys.droids?.some(a => a._id === id)) return apply("droids");
    if (sys.vehicles?.some(a => a._id === id)) return apply("vehicles");
    if (sys.followers?.some(a => a._id === id)) return apply("followers");
    if (sys.animalCompanions?.some(a => a._id === id)) return apply("animalCompanions");
  },


  async _removeAssetTag(event) {
    const id = event.currentTarget.dataset.id;
    const tag = event.currentTarget.dataset.tag;

    const sys = this.actor.system;

    const apply = async (key) => {
      const updated = sys[key].map(a =>
        a._id === id ? { ...a, tags: (a.tags || []).filter(t => t !== tag) } : a
      );
      await this.actor.update({ [`system.${key}`]: updated });
    };

    if (sys.droids?.some(a => a._id === id)) return apply("droids");
    if (sys.vehicles?.some(a => a._id === id)) return apply("vehicles");
    if (sys.followers?.some(a => a._id === id)) return apply("followers");
    if (sys.animalCompanions?.some(a => a._id === id)) return apply("animalCompanions");
  },


  // ==========================================================
  // TWO-WAY SYNC (Item → Asset)
  // ==========================================================
  async _syncAssetWithItem(asset, item) {
    if (!item) return;

    asset.name = item.name;

    if (item.system?.model) asset.model = item.system.model;
    if (item.system?.vehicleClass) asset.vehicleClass = item.system.vehicleClass;

    // HP sync
    if (item.system?.hp) {
      asset.hp = {
        value: item.system.hp.value,
        max: item.system.hp.max
      };
    }

    // Condition sync
    if (item.system?.condition !== undefined) {
      asset.condition = item.system.condition;
    }

    // Tags (optional)
    asset.tags = asset.tags || [];
  },


  // ==========================================================
  // COMPANION CONVERSION (your Option A)
  // ==========================================================
  async _convertDroidToCompanion(itemData) {
    const actorData = {
      name: itemData.name,
      type: "Droid",
      system: {
        model: itemData.system?.model || "",
        hp: itemData.system?.hp || { value: 1, max: 1 },
        condition: 0
      }
    };

    const actor = await Actor.create(actorData);
    ui.notifications.info(`Converted '${itemData.name}' into a Droid Companion.`);
    return actor;
  },
'''

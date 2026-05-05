/**
 * SWSE Scene Control Registry
 *
 * Single authority for SWSE canvas Scene Controls. This registry uses Foundry's
 * getSceneControlButtons hook and never mutates the canvas/sidebar DOM.
 */

function normalizeTool(toolId, config = {}) {
  return {
    name: toolId,
    title: config.title ?? toolId,
    icon: config.icon ?? 'fa-solid fa-circle',
    button: config.button ?? true,
    toggle: config.toggle ?? false,
    visible: config.visible ?? true,
    enabled: config.enabled ?? true,
    onClick: config.onClick ?? config.handler ?? (() => undefined),
    ...(config.active !== undefined ? { active: config.active } : {}),
    ...(config.order !== undefined ? { order: Number(config.order) || 0 } : {}),
    ...(config.class !== undefined ? { class: config.class } : {}),
    ...(config.cssClass !== undefined ? { cssClass: config.cssClass } : {})
  };
}

function normalizeGroup(groupId, config = {}) {
  return {
    name: groupId,
    title: config.title ?? groupId,
    icon: config.icon ?? 'fa-solid fa-circle',
    layer: config.layer ?? 'TokenLayer',
    visible: config.visible ?? true,
    tools: []
  };
}

function getControlGroups(controls) {
  if (Array.isArray(controls)) return controls;
  if (Array.isArray(controls?.controls)) return controls.controls;
  if (Array.isArray(controls?.groups)) return controls.groups;
  if (controls && typeof controls === 'object') return Object.values(controls).filter(Boolean);
  return [];
}

function findControlGroup(controls, name) {
  if (!controls) return null;

  if (Array.isArray(controls)) return controls.find((group) => group?.name === name) ?? null;

  if (typeof controls === 'object') {
    return controls[name]
      ?? Object.values(controls).find((group) => group?.name === name)
      ?? null;
  }

  return null;
}

function addControlGroup(controls, group) {
  if (Array.isArray(controls)) {
    controls.push(group);
    return group;
  }

  if (controls && typeof controls === 'object') {
    controls[group.name] = group;
    return group;
  }

  return null;
}

function getOrCreateControlGroup(controls, name, fallback = {}) {
  let group = findControlGroup(controls, name);
  if (group) return group;

  group = normalizeGroup(name, fallback);
  return addControlGroup(controls, group) ?? group;
}

function upsertTool(tools, tool) {
  if (!Array.isArray(tools)) return;
  const index = tools.findIndex((existing) => existing?.name === tool.name);
  if (index >= 0) {
    tools[index] = { ...tools[index], ...tool };
    return;
  }
  tools.push(tool);
}

function sortedTools(toolsMap) {
  return Array.from(toolsMap.values()).sort((a, b) => {
    const left = Number(a?.order ?? 0);
    const right = Number(b?.order ?? 0);
    if (left !== right) return left - right;
    return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
  });
}

export class SceneControlRegistry {
  constructor() {
    this.groups = new Map();
    this.hostTools = new Map();
    this.#hookInstalled = false;
  }

  #hookInstalled;

  /**
   * Register a standalone SWSE scene control group.
   */
  registerGroup(groupId, config = {}) {
    const existing = this.groups.get(groupId);
    const group = existing ?? {
      id: groupId,
      title: config.title ?? groupId,
      icon: config.icon ?? 'fa-solid fa-circle',
      layer: config.layer ?? 'TokenLayer',
      visible: config.visible ?? true,
      tools: new Map()
    };

    group.title = config.title ?? group.title;
    group.icon = config.icon ?? group.icon;
    group.layer = config.layer ?? group.layer;
    group.visible = config.visible ?? group.visible;

    this.groups.set(groupId, group);
    return group;
  }

  /**
   * Register a tool inside a standalone SWSE group.
   */
  registerTool(groupId, toolId, config = {}) {
    const group = this.groups.get(groupId) ?? this.registerGroup(groupId, config.group ?? {});
    group.tools.set(toolId, normalizeTool(toolId, config));
    return group.tools.get(toolId);
  }

  /**
   * Register a SWSE tool inside an existing Foundry control group, such as token.
   */
  registerHostTool(hostGroupId, toolId, config = {}) {
    const hostId = hostGroupId || 'token';
    if (!this.hostTools.has(hostId)) {
      this.hostTools.set(hostId, {
        fallback: normalizeGroup(hostId, config.group ?? {}),
        tools: new Map()
      });
    }

    const host = this.hostTools.get(hostId);
    if (config.group) host.fallback = { ...host.fallback, ...normalizeGroup(hostId, config.group) };
    host.tools.set(toolId, normalizeTool(toolId, config));
    return host.tools.get(toolId);
  }

  getControls() {
    return Array.from(this.groups.values()).map((group) => ({
      name: group.id,
      title: group.title,
      icon: group.icon,
      layer: group.layer,
      visible: group.visible,
      tools: sortedTools(group.tools)
    }));
  }

  applyToControls(controls) {
    if (!controls) return;

    for (const group of this.getControls()) {
      const targetGroup = findControlGroup(controls, group.name);
      if (!targetGroup) {
        addControlGroup(controls, {
          ...group,
          tools: group.tools.map((tool) => ({ ...tool }))
        });
        continue;
      }

      targetGroup.title = targetGroup.title ?? group.title;
      targetGroup.icon = targetGroup.icon ?? group.icon;
      targetGroup.layer = targetGroup.layer ?? group.layer;
      targetGroup.visible = targetGroup.visible ?? group.visible;
      if (!Array.isArray(targetGroup.tools)) targetGroup.tools = [];
      for (const tool of group.tools) upsertTool(targetGroup.tools, tool);
    }

    for (const [hostGroupId, host] of this.hostTools.entries()) {
      const group = getOrCreateControlGroup(controls, hostGroupId, host.fallback);
      if (!group) continue;
      if (!Array.isArray(group.tools)) group.tools = [];
      for (const tool of sortedTools(host.tools)) upsertTool(group.tools, tool);
    }
  }

  installFoundryHook() {
    if (this.#hookInstalled) return;
    this.#hookInstalled = true;

    Hooks.on('getSceneControlButtons', (controls) => {
      try {
        this.applyToControls(controls);
      } catch (error) {
        console.error('[SWSE Scene Controls] Failed to apply scene controls', error);
      }
    });
  }

  clear() {
    this.groups.clear();
    this.hostTools.clear();
  }
}

export const sceneControlRegistry = new SceneControlRegistry();

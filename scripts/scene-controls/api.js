/**
 * SWSE Scene Control Registry
 *
 * Single authority for SWSE canvas Scene Controls. Foundry V13 expects the
 * getSceneControlButtons payload to be a Record<string, SceneControl>, and
 * every SceneControl#tools collection to be a Record<string, SceneControlTool>.
 * This registry still tolerates legacy array-shaped controls for older worlds.
 */

const HOST_GROUP_ALIASES = {
  token: 'tokens',
  measure: 'measurement',
  template: 'templates'
};

function resolveHostGroupId(groupId) {
  const id = String(groupId || 'tokens');
  return HOST_GROUP_ALIASES[id] ?? id;
}

function normalizeIcon(icon = 'fas fa-circle') {
  return String(icon || 'fas fa-circle').replace(/\bfa-solid\b/g, 'fas');
}

function invokeToolHandler(handler, event, active) {
  try {
    return handler?.(event, active);
  } catch (error) {
    console.error('[SWSE Scene Controls] Tool handler failed', error);
    globalThis.ui?.notifications?.error?.(`SWSE scene control failed: ${error.message}`);
    return undefined;
  }
}

function normalizeTool(toolId, config = {}) {
  const handler = config.onChange ?? config.onClick ?? config.handler ?? (() => undefined);
  const normalized = {
    name: toolId,
    title: config.title ?? toolId,
    icon: normalizeIcon(config.icon),
    order: Number(config.order ?? 0) || 0,
    button: config.button ?? true,
    toggle: config.toggle ?? false,
    visible: config.visible ?? true,
    // Foundry V13 scene control buttons dispatch onChange, not onClick.
    onChange: (event, active) => invokeToolHandler(handler, event, active),
    // Keep onClick as a compatibility alias for any legacy control consumers.
    onClick: (event, active) => invokeToolHandler(handler, event, active)
  };

  if (config.enabled !== undefined) normalized.enabled = config.enabled;
  if (config.active !== undefined) normalized.active = config.active;
  if (config.class !== undefined) normalized.class = config.class;
  if (config.cssClass !== undefined) normalized.cssClass = config.cssClass;
  if (config.toolclip !== undefined) normalized.toolclip = config.toolclip;
  return normalized;
}

function normalizeGroup(groupId, config = {}) {
  return {
    name: groupId,
    title: config.title ?? groupId,
    icon: normalizeIcon(config.icon),
    order: Number(config.order ?? 0) || 0,
    activeTool: config.activeTool ?? 'select',
    visible: config.visible ?? true,
    tools: {}
  };
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function findControlGroup(controls, name) {
  if (!controls) return null;
  const resolvedName = resolveHostGroupId(name);

  if (Array.isArray(controls)) {
    return controls.find((group) => group?.name === resolvedName || group?.name === name) ?? null;
  }

  if (isRecord(controls)) {
    return controls[resolvedName]
      ?? controls[name]
      ?? Object.values(controls).find((group) => group?.name === resolvedName || group?.name === name)
      ?? null;
  }

  return null;
}

function addControlGroup(controls, group) {
  if (Array.isArray(controls)) {
    controls.push({ ...group, tools: Object.values(group.tools ?? {}) });
    return group;
  }

  if (isRecord(controls)) {
    controls[group.name] = group;
    return group;
  }

  return null;
}

function getOrCreateControlGroup(controls, name, fallback = {}) {
  const groupId = resolveHostGroupId(name);
  let group = findControlGroup(controls, groupId);
  if (group) {
    group.name = group.name ?? groupId;
    group.title = group.title ?? fallback.title ?? groupId;
    group.icon = group.icon ?? normalizeIcon(fallback.icon);
    group.order = Number(group.order ?? fallback.order ?? 0) || 0;
    group.activeTool = group.activeTool ?? fallback.activeTool ?? 'select';
    if (!group.tools) group.tools = Array.isArray(controls) ? [] : {};
    return group;
  }

  group = normalizeGroup(groupId, fallback);
  return addControlGroup(controls, group) ?? group;
}

function upsertTool(tools, tool) {
  if (!tools) return;

  if (Array.isArray(tools)) {
    const index = tools.findIndex((existing) => existing?.name === tool.name);
    if (index >= 0) tools[index] = { ...tools[index], ...tool };
    else tools.push(tool);
    return;
  }

  if (isRecord(tools)) {
    tools[tool.name] = { ...(tools[tool.name] ?? {}), ...tool };
  }
}

function sortedTools(toolsMap) {
  return Array.from(toolsMap.values()).sort((a, b) => {
    const left = Number(a?.order ?? 0);
    const right = Number(b?.order ?? 0);
    if (left !== right) return left - right;
    return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
  });
}

function toolsRecord(toolsMap) {
  const record = {};
  for (const tool of sortedTools(toolsMap)) record[tool.name] = { ...tool };
  return record;
}

export class SceneControlRegistry {
  constructor() {
    this.groups = new Map();
    this.hostTools = new Map();
    this.#hookInstalled = false;
  }

  #hookInstalled;

  registerGroup(groupId, config = {}) {
    const existing = this.groups.get(groupId);
    const group = existing ?? {
      id: groupId,
      title: config.title ?? groupId,
      icon: normalizeIcon(config.icon),
      visible: config.visible ?? true,
      order: Number(config.order ?? 0) || 0,
      tools: new Map(),
      activeTool: config.activeTool ?? 'select'
    };

    group.title = config.title ?? group.title;
    group.icon = config.icon ? normalizeIcon(config.icon) : group.icon;
    group.visible = config.visible ?? group.visible;
    group.order = Number(config.order ?? group.order ?? 0) || 0;
    group.activeTool = config.activeTool ?? group.activeTool ?? 'select';

    this.groups.set(groupId, group);
    return group;
  }

  registerTool(groupId, toolId, config = {}) {
    const group = this.groups.get(groupId) ?? this.registerGroup(groupId, config.group ?? {});
    group.tools.set(toolId, normalizeTool(toolId, config));
    return group.tools.get(toolId);
  }

  registerHostTool(hostGroupId, toolId, config = {}) {
    const hostId = resolveHostGroupId(hostGroupId);
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
      order: Number(group.order ?? 0) || 0,
      visible: group.visible,
      activeTool: group.activeTool ?? 'select',
      tools: toolsRecord(group.tools)
    }));
  }

  applyToControls(controls) {
    if (!controls) return;
    const v13Record = isRecord(controls);

    for (const group of this.getControls()) {
      const targetGroup = findControlGroup(controls, group.name);
      if (!targetGroup) {
        addControlGroup(controls, v13Record ? group : { ...group, tools: Object.values(group.tools) });
        continue;
      }

      targetGroup.title = targetGroup.title ?? group.title;
      targetGroup.icon = targetGroup.icon ?? group.icon;
      targetGroup.order = Number(targetGroup.order ?? group.order ?? 0) || 0;
      targetGroup.visible = targetGroup.visible ?? group.visible;
      targetGroup.activeTool = targetGroup.activeTool ?? group.activeTool ?? 'select';
      if (!targetGroup.tools) targetGroup.tools = v13Record ? {} : [];
      for (const tool of Object.values(group.tools)) upsertTool(targetGroup.tools, tool);
    }

    for (const [hostGroupId, host] of this.hostTools.entries()) {
      const group = getOrCreateControlGroup(controls, hostGroupId, host.fallback);
      if (!group) continue;
      if (!group.tools) group.tools = v13Record ? {} : [];
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

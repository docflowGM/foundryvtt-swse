/**
 * Scene Control Registry - Single source of truth for all SWSE scene controls
 * Foundry v13 native architecture - no DOM manipulation
 */

class SceneControlRegistry {
  constructor() {
    this.groups = new Map();
  }

  /**
   * Register a control group
   * @param {string} groupId - Unique group identifier
   * @param {Object} config - Group configuration
   * @param {string} config.title - Display title
   * @param {string} config.icon - Font Awesome icon class
   */
  registerGroup(groupId, config) {
    if (this.groups.has(groupId)) {
      console.warn(`Scene control group "${groupId}" already registered, overwriting`);
    }
    this.groups.set(groupId, {
      id: groupId,
      title: config.title,
      icon: config.icon,
      tools: []
    });
  }

  /**
   * Register a tool within a group
   * @param {string} groupId - Parent group ID
   * @param {string} toolId - Unique tool identifier
   * @param {Object} config - Tool configuration
   * @param {string} config.title - Display title
   * @param {string} config.icon - Font Awesome icon class
   * @param {Function} config.onClick - Handler function(canvas, tool)
   * @param {Function} [config.visible] - Optional visibility function(canvas)
   * @param {Function} [config.enabled] - Optional enabled function(canvas)
   */
  registerTool(groupId, toolId, config) {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Scene control group "${groupId}" not registered`);
    }

    group.tools.push({
      name: toolId,
      title: config.title,
      icon: config.icon,
      onClick: config.onClick,
      visible: config.visible,
      enabled: config.enabled
    });
  }

  /**
   * Get all registered groups and tools as Foundry scene control format
   * @returns {Array} Array of control group objects
   */
  getControls() {
    const controls = [];

    for (const group of this.groups.values()) {
      controls.push({
        name: group.id,
        title: group.title,
        icon: group.icon,
        layer: 'TokenLayer',
        tools: group.tools
      });
    }

    return controls;
  }

  /**
   * Clear all registered controls (useful for testing/reset)
   */
  clear() {
    this.groups.clear();
  }
}

export const sceneControlRegistry = new SceneControlRegistry();

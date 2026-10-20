/**
 * AquaPulse Plugin Registry
 * Lifecycle and registry manager for modular calculators, telemetry widgets, and care extensions.
 * Validates the IPlugin contract: { id, name, category, mount, unmount, update? }
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

export class PluginRegistry {
  /**
   * @param {Object} [options]
   * @param {EventBus} [options.eventBus] - Optional EventBus for emitting lifecycle events
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus || null;
    this.plugins = new Map();
    this.mountedInstances = new Map();
    this._mountingIds = new Set();
  }

  /**
   * Validate that a candidate object implements the IPlugin contract
   * @param {*} plugin
   * @throws {Error} If plugin contract is violated
   */
  validateContract(plugin) {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must be an object');
    }
    if (typeof plugin.id !== 'string' || !plugin.id.trim()) {
      throw new Error('Plugin must specify id, name, and category (valid string id)');
    }
    if (typeof plugin.name !== 'string' || !plugin.name.trim()) {
      throw new Error('Plugin must specify id, name, and category (valid string name)');
    }
    if (typeof plugin.category !== 'string' || !plugin.category.trim()) {
      throw new Error('Plugin must specify id, name, and category (valid string category)');
    }
    if (typeof plugin.mount !== 'function' || typeof plugin.unmount !== 'function') {
      throw new Error('Plugin must implement mount and unmount methods');
    }
    if (plugin.update !== undefined && typeof plugin.update !== 'function') {
      throw new Error('Plugin update must be a function if provided');
    }
    return true;
  }

  /**
   * Register a new plugin
   * @param {Object} plugin
   * @returns {boolean}
   */
  register(plugin) {
    this.validateContract(plugin);

    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id "${plugin.id}" already registered`);
    }

    this.plugins.set(plugin.id, plugin);

    if (this.eventBus) {
      this.eventBus.emit('plugin:registered', { plugin });
    }

    return true;
  }

  /**
   * Unregister an existing plugin, unmounting it if currently mounted
   * @param {string} pluginId
   * @returns {boolean} Whether plugin was found and removed
   */
  unregister(pluginId) {
    if (!pluginId || !this.plugins.has(pluginId)) {
      return false;
    }

    if (this.mountedInstances.has(pluginId)) {
      this.unmountPlugin(pluginId);
    }

    const removed = this.plugins.delete(pluginId);

    if (this.eventBus) {
      this.eventBus.emit('plugin:unregistered', { pluginId });
    }

    return removed;
  }

  /**
   * Get plugin by ID
   * @param {string} pluginId
   * @returns {Object|null}
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Check if plugin is registered
   * @param {string} pluginId
   * @returns {boolean}
   */
  hasPlugin(pluginId) {
    return this.plugins.has(pluginId);
  }

  /**
   * Get all registered plugins in a given category
   * @param {string} category
   * @returns {Array<Object>}
   */
  getPluginsByCategory(category) {
    return Array.from(this.plugins.values()).filter(p => p.category === category);
  }

  /**
   * Get all registered plugins
   * @returns {Array<Object>}
   */
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Mount a registered plugin into a DOM container
   * @param {string} pluginId
   * @param {HTMLElement|Object} container - DOM element or mock container
   * @param {Object} [context={}] - Context provided to plugin (store, eventBus, etc.)
   * @returns {*} Result returned by plugin mount method
   */
  mountPlugin(pluginId, container, context = {}) {
    if (this._mountingIds.has(pluginId)) {
      throw new Error(`Circular mount detected for plugin "${pluginId}"`);
    }

    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }

    // If already mounted, unmount first
    if (this.mountedInstances.has(pluginId)) {
      this.unmountPlugin(pluginId);
    }

    this._mountingIds.add(pluginId);
    try {
      const instance = plugin.mount(container, context);
      this.mountedInstances.set(pluginId, { container, context, instance });

      if (this.eventBus) {
        this.eventBus.emit('plugin:mounted', { pluginId, container, context });
      }

      return instance;
    } finally {
      this._mountingIds.delete(pluginId);
    }
  }

  /**
   * Unmount a currently mounted plugin
   * @param {string} pluginId
   * @returns {boolean} Whether plugin was mounted and successfully unmounted
   */
  unmountPlugin(pluginId) {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) return false;

    const mountInfo = this.mountedInstances.get(pluginId);
    if (!mountInfo) return false;

    // Delete before calling plugin.unmount to prevent re-entrant unmount loops
    this.mountedInstances.delete(pluginId);

    let unmountSucceeded = true;
    try {
      plugin.unmount(mountInfo.context);
    } catch (err) {
      console.error(`[PluginRegistry] Error unmounting plugin "${pluginId}":`, err);
      unmountSucceeded = false;
    }

    if (this.eventBus) {
      this.eventBus.emit('plugin:unmounted', { pluginId });
    }

    return unmountSucceeded;
  }

  /**
   * Check if a plugin is currently mounted
   * @param {string} pluginId
   * @returns {boolean}
   */
  isMounted(pluginId) {
    return this.mountedInstances.has(pluginId);
  }

  /**
   * Get mount details for a plugin
   * @param {string} pluginId
   * @returns {Object|null}
   */
  getMountedInstance(pluginId) {
    return this.mountedInstances.get(pluginId) || null;
  }

  /**
   * Dispatch update to a mounted plugin
   * @param {string} pluginId
   * @param {*} state - New state or update payload
   * @returns {boolean}
   */
  updatePlugin(pluginId, state) {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) return false;

    if (!this.mountedInstances.has(pluginId)) {
      return false;
    }

    if (typeof plugin.update === 'function') {
      try {
        plugin.update(state);
        return true;
      } catch (err) {
        console.error(`[PluginRegistry] Error updating plugin "${pluginId}":`, err);
        return false;
      }
    }
    return false;
  }

  /**
   * Dispatch update to all mounted plugins
   * @param {*} state
   * @returns {number} Number of plugins successfully updated
   */
  updateAll(state) {
    let count = 0;
    for (const pluginId of this.mountedInstances.keys()) {
      if (this.updatePlugin(pluginId, state)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all plugins and unmount active instances
   */
  clear() {
    for (const pluginId of Array.from(this.mountedInstances.keys())) {
      this.unmountPlugin(pluginId);
    }
    this.plugins.clear();
    this.mountedInstances.clear();
    this._mountingIds.clear();
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.AquaPulsePluginRegistry = PluginRegistry;
  if (!globalThis.PluginRegistry) {
    globalThis.PluginRegistry = PluginRegistry;
  }
}

export default PluginRegistry;

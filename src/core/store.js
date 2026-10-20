/**
 * AquaPulse Centralized Reactive Store
 * Uses JavaScript Proxy for mutation interception, decoupled from DOM.
 * Supports multi-tank scoped storage keys ('aquapulse_<tankId>_<suffix>').
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

import { EventBus } from './event-bus.js';

/**
 * In-memory storage fallback for headless Node.js or environments where
 * localStorage is unavailable, disabled, or throws security exceptions.
 */
class MemoryStorage {
  constructor() {
    this._data = new Map();
  }
  getItem(key) {
    return this._data.has(key) ? this._data.get(key) : null;
  }
  setItem(key, value) {
    this._data.set(key, String(value));
  }
  removeItem(key) {
    this._data.delete(key);
  }
  clear() {
    this._data.clear();
  }
  get length() {
    return this._data.size;
  }
  key(index) {
    return Array.from(this._data.keys())[index] || null;
  }
}

/**
 * Deep clone utility safe for serializable state objects
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch (_) {
      // Fall through to JSON or manual clone if non-cloneable
    }
  }
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (_) {
    if (Array.isArray(obj)) {
      return obj.map(item => deepClone(item));
    }
    const copy = {};
    for (const key of Object.keys(obj)) {
      copy[key] = deepClone(obj[key]);
    }
    return copy;
  }
}

/**
 * Resolve a dot-separated path on an object
 */
function getByPath(target, path) {
  if (!path) return target;
  const parts = Array.isArray(path) ? path : path.split('.');
  let current = target;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Set a value on an object via dot-separated path
 */
function setByPath(target, path, value) {
  const parts = Array.isArray(path) ? path : path.split('.');
  for (const part of parts) {
    if (DANGEROUS_KEYS.has(part)) {
      throw new Error('Security Exception: restricted property access blocked');
    }
  }
  let current = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === null || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  const lastKey = parts[parts.length - 1];
  const previousValue = current[lastKey];
  current[lastKey] = value;
  return previousValue;
}

export class AquaPulseStore {
  /**
   * @param {Object} [initialStateOrOptions] - Initial state object OR options object
   * @param {EventBus} [maybeEventBus] - EventBus instance if first arg was initialState
   */
  constructor(initialStateOrOptions = {}, maybeEventBus = null) {
    let initialState = {};
    let eventBus = maybeEventBus;
    let storage = null;

    if (initialStateOrOptions && typeof initialStateOrOptions === 'object') {
      if ('initialState' in initialStateOrOptions || 'eventBus' in initialStateOrOptions || 'storage' in initialStateOrOptions) {
        initialState = initialStateOrOptions.initialState || {};
        eventBus = initialStateOrOptions.eventBus || eventBus;
        storage = initialStateOrOptions.storage || null;
      } else {
        initialState = initialStateOrOptions;
      }
    }

    this._eventBus = eventBus || new EventBus();
    this._subscribers = new Set();
    this._pathSubscribers = new Map(); // path -> Set of listener functions

    // Initialize storage with safe fallback
    this._storage = this._resolveStorage(storage);

    // Baseline application state structure
    const defaultState = {
      config: null,
      activeTankId: 'tank-demo-community',
      activeTab: 'tank',
      telemetry: {
        current: null,
        history: [],
        status: 'OPTIMAL',
        diagnostics: []
      },
      simulation: {
        mode: 'current',
        activeLayers: {
          hardscape: true,
          streamlines: true,
          heatmap: false,
          fish: true,
          bubbles: true,
          caustics: true,
          feedingZones: false
        },
        activeFeedingSequence: 'all',
        selectedZoneId: null
      },
      care: {
        filterRinseState: { currentCupIndex: 0, lastRinsedDate: null },
        checklist: {},
        quarantine: { active: false, fishName: '', startDate: null, durationDays: 14 },
        socialIncidents: [],
        activeMedicationProtocol: null
      }
    };

    // Deep-merge provided initial state over default state
    this._rawState = deepClone(defaultState);
    if (initialState && typeof initialState === 'object') {
      this._deepMergeInPlace(this._rawState, initialState);
      if (!('activeTankId' in initialState)) {
        const explicitId = getByPath(initialState, 'config.tank.id') || getByPath(initialState, 'tank.id') || initialState.tankId;
        if (explicitId) {
          this._rawState.activeTankId = explicitId;
        }
      }
    }

    // Create reactive proxy tree
    this.state = this._createReactiveProxy(this._rawState, '');
  }

  get tankId() {
    return (
      getByPath(this._rawState, 'activeTankId') ||
      getByPath(this._rawState, 'config.tank.id') ||
      getByPath(this._rawState, 'tank.id') ||
      'tank-demo-community'
    );
  }

  set tankId(id) {
    this.setTankId(id);
  }

  setTankId(id) {
    this._rawState.activeTankId = id;
    if (this._rawState.config && this._rawState.config.tank) {
      this._rawState.config.tank.id = id;
    }
    if (this._rawState.tank) {
      this._rawState.tank.id = id;
    }
  }

  getItem(key) {
    return this._storage.getItem(key);
  }

  setItem(key, value) {
    this._storage.setItem(key, value);
  }

  removeItem(key) {
    this._storage.removeItem(key);
  }

  /**
   * Safely determine storage backend
   * @private
   */
  _resolveStorage(customStorage) {
    if (customStorage && typeof customStorage.getItem === 'function') {
      return customStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const testKey = '__aquapulse_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return window.localStorage;
      } catch (_) {
        // Fall back to in-memory storage if storage access is restricted
      }
    } else if (typeof localStorage !== 'undefined' && localStorage) {
      try {
        return localStorage;
      } catch (_) {}
    }
    return new MemoryStorage();
  }

  /**
   * Create recursive reactive proxy
   * @private
   */
  _createReactiveProxy(target, basePath) {
    if (target === null || typeof target !== 'object') {
      return target;
    }

    const self = this;
    return new Proxy(target, {
      get(obj, prop) {
        if (prop === '__isProxy') return true;
        if (prop === '__rawTarget') return obj;
        if (DANGEROUS_KEYS.has(prop)) return undefined;

        const val = Reflect.get(obj, prop);
        if (typeof prop === 'symbol' || prop.startsWith('_')) {
          return val;
        }
        if (val !== null && typeof val === 'object') {
          const currentPath = basePath ? `${basePath}.${String(prop)}` : String(prop);
          return self._createReactiveProxy(val, currentPath);
        }
        return val;
      },
      set(obj, prop, value) {
        if (DANGEROUS_KEYS.has(prop)) {
          throw new Error('Security Exception: restricted property access blocked');
        }
        const previousValue = obj[prop];
        if (previousValue === value) {
          return true;
        }

        const success = Reflect.set(obj, prop, value);
        if (success && typeof prop !== 'symbol' && !prop.startsWith('_')) {
          const propertyPath = basePath ? `${basePath}.${String(prop)}` : String(prop);
          self._onStateMutated(propertyPath, value, previousValue);
        }
        return success;
      },
      deleteProperty(obj, prop) {
        const previousValue = obj[prop];
        const success = Reflect.deleteProperty(obj, prop);
        if (success && typeof prop !== 'symbol' && !prop.startsWith('_')) {
          const propertyPath = basePath ? `${basePath}.${String(prop)}` : String(prop);
          self._onStateMutated(propertyPath, undefined, previousValue);
        }
        return success;
      }
    });
  }

  /**
   * Internal hook invoked when state mutation occurs
   * @private
   */
  _onStateMutated(path, value, previousValue) {
    if (path === 'activeTankId') {
      if (this._rawState.config && this._rawState.config.tank) {
        this._rawState.config.tank.id = value;
      }
      if (this._rawState.tank) {
        this._rawState.tank.id = value;
      }
    } else if (path === 'config.tank.id' || path === 'tank.id') {
      this._rawState.activeTankId = value;
    }

    const payload = {
      path,
      value: deepClone(value),
      previousValue: deepClone(previousValue),
      state: this.getState()
    };

    // Auto-sync tank-scoped state to storage if applicable
    this._syncScopedState(path, value);

    // Notify global subscribers
    for (const listener of Array.from(this._subscribers)) {
      try {
        listener(payload);
      } catch (err) {
        console.error('[AquaPulseStore] Error in subscriber:', err);
      }
    }

    // Notify path-specific subscribers
    for (const [subPath, listenerSet] of this._pathSubscribers.entries()) {
      if (path === subPath || path.startsWith(subPath + '.') || subPath.startsWith(path + '.')) {
        for (const listener of Array.from(listenerSet)) {
          try {
            listener(payload);
          } catch (err) {
            console.error(`[AquaPulseStore] Error in path subscriber for "${subPath}":`, err);
          }
        }
      }
    }

    // Publish to EventBus
    if (this._eventBus) {
      this._eventBus.emit('state:changed', payload);
      this._eventBus.emit(`state:changed:${path}`, payload);
    }
  }

  /**
   * Automatically persist tank-scoped slices into storage
   * @private
   */
  _syncScopedState(path, value) {
    if (!this._storage) return;

    try {
      if (path.startsWith('telemetry.history')) {
        const key = this.getScopedKey('params');
        this._storage.setItem(key, JSON.stringify(this._rawState.telemetry.history || []));
      } else if (path.startsWith('care.checklist')) {
        const key = this.getScopedKey('tasks');
        this._storage.setItem(key, JSON.stringify(this._rawState.care.checklist || {}));
      } else if (path.startsWith('care.filterRinseState.currentCupIndex')) {
        const key = this.getScopedKey('sponge_idx');
        this._storage.setItem(key, JSON.stringify(value));
      } else if (path.startsWith('care.quarantine')) {
        const key = this.getScopedKey('quarantine');
        this._storage.setItem(key, JSON.stringify(this._rawState.care.quarantine || {}));
      } else if (path.startsWith('care.socialIncidents')) {
        const key = this.getScopedKey('social');
        this._storage.setItem(key, JSON.stringify(this._rawState.care.socialIncidents || []));
      }
    } catch (err) {
      console.warn('[AquaPulseStore] Storage sync warning:', err);
    }
  }

  /**
   * Recursive in-place merge helper
   * @private
   */
  _deepMergeInPlace(target, source) {
    if (!source || typeof source !== 'object') return target;
    for (const key of Object.keys(source)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      const srcVal = source[key];
      const tgtVal = target[key];
      if (
        srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) &&
        tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal)
      ) {
        this._deepMergeInPlace(tgtVal, srcVal);
      } else if (Array.isArray(srcVal)) {
        target[key] = srcVal.map(item => deepClone(item));
      } else {
        target[key] = deepClone(srcVal);
      }
    }
    return target;
  }

  /**
   * Get an immutable snapshot or slice of state
   * @param {string} [path] - Optional dot-separated path (e.g. 'tank.volumeNetL')
   * @returns {*} Deep clone of requested state slice or entire state
   */
  getState(path) {
    if (!path) {
      return deepClone(this._rawState);
    }
    const val = getByPath(this._rawState, path);
    return deepClone(val);
  }

  /**
   * Update state at a specified path or merge root object
   * @param {string|Object} path - Dot path string OR object to merge into root state
   * @param {*} [value] - Value to set at path (ignored if path is object)
   */
  setState(path, value) {
    if (typeof path === 'object' && path !== null) {
      // Merge object into root
      for (const [key, val] of Object.entries(path)) {
        this.setState(key, val);
      }
      return;
    }

    if (typeof path !== 'string' || !path) {
      throw new TypeError('Path must be a non-empty string or object');
    }

    const previousValue = getByPath(this._rawState, path);
    setByPath(this._rawState, path, deepClone(value));
    this._onStateMutated(path, value, previousValue);
  }

  /**
   * Generate an isolated storage key scoped to current active tank
   * @param {string} suffix - Suffix identifier (e.g. 'params', 'tasks', 'sponge_idx')
   * @returns {string} Fully qualified scoped key: 'aquapulse_<tankId>_<suffix>'
   */
  getScopedKey(suffix) {
    return `aquapulse_${this.tankId}_${suffix || 'default'}`;
  }

  /**
   * Subscribe to state mutations
   * @param {string|Function} pathOrListener - Dot path or listener callback
   * @param {Function} [optionalListener] - Callback if path was specified
   * @returns {Function} Unsubscribe function
   */
  subscribe(pathOrListener, optionalListener) {
    if (typeof pathOrListener === 'function') {
      const listener = pathOrListener;
      this._subscribers.add(listener);
      return () => this._subscribers.delete(listener);
    }

    if (typeof pathOrListener === 'string' && typeof optionalListener === 'function') {
      const path = pathOrListener;
      const listener = optionalListener;
      if (!this._pathSubscribers.has(path)) {
        this._pathSubscribers.set(path, new Set());
      }
      this._pathSubscribers.get(path).add(listener);
      return () => {
        const set = this._pathSubscribers.get(path);
        if (set) {
          set.delete(listener);
          if (set.size === 0) {
            this._pathSubscribers.delete(path);
          }
        }
      };
    }

    throw new TypeError('Invalid arguments to subscribe');
  }

  /**
   * Access underlying EventBus
   * @returns {EventBus}
   */
  get eventBus() {
    return this._eventBus;
  }

  /**
   * Access underlying storage engine
   * @returns {Storage|MemoryStorage}
   */
  get storage() {
    return this._storage;
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.AquaPulseStore = AquaPulseStore;
}

export default AquaPulseStore;

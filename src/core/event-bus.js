/**
 * AquaPulse Decoupled Event Bus
 * Pure publish/subscribe bus with wildcard and namespaced event pattern support.
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

export class EventBus {
  constructor() {
    // Map of pattern string -> Set of listener functions
    this._listeners = new Map();
    // Cache for compiled wildcard regexes
    this._regexCache = new Map();
  }

  /**
   * Escape special regex characters except asterisk
   * @private
   */
  _patternToRegex(pattern) {
    if (!this._regexCache.has(pattern)) {
      // Escape regex chars except *
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      // Convert * to .*
      const regexStr = '^' + escaped.split('*').join('.*') + '$';
      this._regexCache.set(pattern, new RegExp(regexStr));
    }
    return this._regexCache.get(pattern);
  }

  /**
   * Check if a registered pattern matches an emitted event
   * @private
   */
  _matches(pattern, event) {
    if (pattern === '*' || pattern === event) {
      return true;
    }
    if (pattern.includes('*')) {
      return this._patternToRegex(pattern).test(event);
    }
    return false;
  }

  /**
   * Subscribe to an event or wildcard pattern
   * @param {string} event - Event name or pattern (e.g. 'state:changed', 'state:*', '*')
   * @param {Function} callback - Function called with (data, event)
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (typeof event !== 'string' || !event) {
      throw new TypeError('Event name must be a non-empty string');
    }
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe closure
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name or pattern
   * @param {Function} [callback] - Specific callback to remove; if omitted, removes all for event
   * @returns {boolean} Whether listener(s) were removed
   */
  off(event, callback) {
    if (typeof event !== 'string') return false;

    if (!this._listeners.has(event)) {
      return false;
    }

    if (!callback) {
      this._listeners.delete(event);
      this._regexCache.delete(event);
      return true;
    }

    const set = this._listeners.get(event);
    let deleted = set.delete(callback);
    if (!deleted) {
      for (const fn of set) {
        if (fn._originalCallback === callback) {
          deleted = set.delete(fn);
          break;
        }
      }
    }
    if (set.size === 0) {
      this._listeners.delete(event);
      this._regexCache.delete(event);
    }
    return deleted;
  }

  /**
   * Subscribe once; automatically unsubscribes after first execution
   * @param {string} event - Event name or pattern
   * @param {Function} callback - Function called with (data, event)
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    const wrapper = (data, emittedEvent) => {
      this.off(event, wrapper);
      callback(data, emittedEvent);
    };
    // Keep reference to original callback for manual .off(event, callback) lookup if needed
    wrapper._originalCallback = callback;

    return this.on(event, wrapper);
  }

  /**
   * Emit an event with data payload
   * @param {string} event - Concrete event name
   * @param {*} [data] - Data payload
   * @returns {number} Count of listeners invoked
   */
  emit(event, data) {
    if (typeof event !== 'string' || !event) {
      return 0;
    }

    let invokedCount = 0;
    // Iterate through all registered patterns
    for (const [pattern, listenerSet] of this._listeners.entries()) {
      if (this._matches(pattern, event)) {
        // Copy set to avoid mutations during iteration (e.g. from once())
        const listeners = Array.from(listenerSet);
        for (const fn of listeners) {
          try {
            fn(data, event);
            invokedCount++;
          } catch (err) {
            console.error(`[EventBus] Error in listener for "${pattern}" (on emit "${event}"):`, err);
          }
        }
      }
    }

    return invokedCount;
  }

  /**
   * Clear listeners
   * @param {string} [event] - Specific event to clear; if omitted, clears all
   */
  clear(event) {
    if (typeof event === 'string') {
      this._listeners.delete(event);
      this._regexCache.delete(event);
    } else {
      this._listeners.clear();
      this._regexCache.clear();
    }
  }

  /**
   * Get count of listeners for a specific event pattern or total
   * @param {string} [event]
   * @returns {number}
   */
  listenerCount(event) {
    if (typeof event === 'string') {
      return this._listeners.has(event) ? this._listeners.get(event).size : 0;
    }
    let total = 0;
    for (const set of this._listeners.values()) {
      total += set.size;
    }
    return total;
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.AquaPulseEventBus = EventBus;
  if (!globalThis.EventBus) {
    globalThis.EventBus = EventBus;
  }
}

export default EventBus;

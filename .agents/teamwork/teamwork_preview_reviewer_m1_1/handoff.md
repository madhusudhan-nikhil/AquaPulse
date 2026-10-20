# Milestone 1 Quality Review & Adversarial Challenge Report

## Review Summary

**Verdict**: REQUEST_CHANGES  
**Integrity Status**: PASS (No integrity violations, no facade/dummy code, genuine implementations throughout)  
**Overall Risk Assessment**: MEDIUM-HIGH (1 Critical Security vulnerability, 2 Major functional defects, 2 Minor quality issues)

---

## 1. Observation

### Observation 1.1: Automated Verification Suites Run Cleanly
Executing the official verification suite:
- Command: `node tests/verify-m1-core.js`
- Result: `29 passed, 0 failed` (Duration: ~150ms).
- Command: `node tests/run-tests.js`
- Result: `112 passed, 0 failed` across 20 suites covering F01–F10 and B01–B10.

### Observation 1.2: Code Structure & Integrity Verification
Inspection of the 4 core modules confirmed genuine implementations without hardcoded test mocks, shortcut facades, or fabricated outputs:
- `src/core/event-bus.js` (187 lines): Map/Set based publish-subscribe engine with wildcard regex compilation, error isolation per listener, and browser/Node dual export.
- `src/core/store.js` (490 lines): Centralized reactive state store using JavaScript `Proxy` for mutation interception, dot-path accessors, automatic localStorage synchronization across 5 scoped domains, and `MemoryStorage` fallback for headless environments.
- `src/core/config-manager.js` (370 lines): 3-tier configuration ingestion, recursive deepMerge with array replacement, lenient JSON parser stripping comments/trailing commas/smart quotes with line/column diagnostic reporting, and RFC 4180 CSV export.
- `src/core/plugin-registry.js` (270 lines): `IPlugin` lifecycle management (`register`, `mount`, `unmount`, `update`), duplicate prevention, and event bus lifecycle announcements.

### Observation 1.3: Prototype Pollution in `AquaPulseStore`
In `src/core/store.js`:
- Line 363 (`_deepMergeInPlace`):
```javascript
  _deepMergeInPlace(target, source) {
    if (!source || typeof source !== 'object') return target;
    for (const key of Object.keys(source)) {
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
```
- Line 85 (`setByPath`):
```javascript
function setByPath(target, path, value) {
  const parts = Array.isArray(path) ? path : path.split('.');
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
```
When tested with payload `JSON.parse('{"__proto__": {"polluted": "YES"}}')`:
- Command:
  ```javascript
  const { AquaPulseStore } = require('./src/core/store.js');
  const store = new AquaPulseStore(JSON.parse('{"__proto__": {"polluted": "YES"}}'));
  console.log(({}).polluted); // Output: "YES"
  ```
- Command:
  ```javascript
  const store = new AquaPulseStore();
  store.setState('__proto__.hacked', true);
  console.log(({}).hacked); // Output: true
  ```
Directly mutates `Object.prototype`, polluting all plain objects in the JavaScript environment.

### Observation 1.4: `EventBus.off()` Fails to Remove `once()` Listeners
In `src/core/event-bus.js`:
- Lines 106–114:
```javascript
    const wrapper = (data, emittedEvent) => {
      this.off(event, wrapper);
      callback(data, emittedEvent);
    };
    // Keep reference to original callback for manual .off(event, callback) lookup if needed
    wrapper._originalCallback = callback;

    return this.on(event, wrapper);
```
- Lines 86–92:
```javascript
    const set = this._listeners.get(event);
    const deleted = set.delete(callback);
    if (set.size === 0) {
      this._listeners.delete(event);
      this._regexCache.delete(event);
    }
    return deleted;
```
When tested:
```javascript
const { EventBus } = require('./src/core/event-bus.js');
const bus = new EventBus();
function testCb() { console.log('FIRED'); }
bus.once('event1', testCb);
const removed = bus.off('event1', testCb); // Output: false
bus.emit('event1'); // Output: FIRED
```
`off(event, callback)` searches for `callback` in the Set, but the Set holds `wrapper`. `deleted` is `false`, and the listener remains active.

### Observation 1.5: Tank ID Precedence Inconsistency
In `src/core/store.js`:
- Lines 176–187:
```javascript
  get tankId() {
    return (
      getByPath(this._rawState, 'config.tank.id') ||
      getByPath(this._rawState, 'tank.id') ||
      getByPath(this._rawState, 'activeTankId') ||
      'tank-demo-community'
    );
  }
```
When `store` is initialized with a config (e.g. `config.tank.id = 'tank-255l'`), updating `store.state.activeTankId = 'tank-betta'` mutates `this._rawState.activeTankId`, but `store.tankId` and `store.getScopedKey('params')` still return `'tank-255l'` because `config.tank.id` is checked first.

---

## 2. Logic Chain

1. **Test Verification**: The implementation cleanly passes all 29 verification tests in `tests/verify-m1-core.js` and all 112 tests in `tests/run-tests.js`.
2. **Integrity Assessment**: Source code analysis verifies that algorithms are fully implemented with general-purpose logic (e.g., recursive deep-merging, AST-free regex-assisted JSON tokenization, dynamic Proxy trap delegation). There are no hardcoded mocks or facade stubs. Integrity check passes.
3. **Security Analysis (Observation 1.3)**: `_deepMergeInPlace` does not check for prototype-polluting property keys (`__proto__`, `constructor`, `prototype`). When `key === '__proto__'`, `tgtVal` references `Object.prototype`, and subsequent recursive assignments mutate the shared global object prototype. Similarly, `setByPath` traverses `__proto__` to `Object.prototype`. This violates security boundary requirements for untrusted config/telemetry ingestion.
4. **Functional Correctness (Observation 1.4)**: `EventBus.once()` attaches `_originalCallback` to `wrapper` explicitly intending to support manual `bus.off(event, callback)` removal, but `EventBus.off()` performs a strict `set.delete(callback)` without checking `item._originalCallback === callback`. This causes `off()` to silently fail, leaving one-time callbacks active.
5. **State Consistency (Observation 1.5)**: The reactive proxy pattern allows external code to mutate `store.state.activeTankId = id`. However, `store.tankId` prioritizes `config.tank.id`. This creates state divergence where UI components think the tank has changed, but persistence keys remain scoped to the old tank ID.
6. **Verdict Deduction**: While the architecture and majority of features are robust and conformant to `PROJECT.md`, the presence of a Critical security vulnerability (Prototype Pollution) and a Major bug in event unsubscription necessitates **REQUEST_CHANGES** before Milestone 1 is signed off.

---

## 3. Caveats

- **WebWorker / Multi-Threaded Storage**: AquaPulse runs in single-threaded DOM and Node.js environments. Concurrent cross-tab storage access via `StorageEvent` was not part of Milestone 1 scope and was not evaluated.
- **Node.js Config Requiring**: In native Node.js environments, requiring `aquapulse.config.js` and `aquapulse.private.js` requires `globalThis.window = globalThis` because the files assign to `window.*`. This is standard for browser scripts, but worth noting for test runners.

---

## 4. Conclusion & Findings

### Verdict: REQUEST_CHANGES

### Findings Catalog

#### [Critical] Finding 1: CWE-1321 Prototype Pollution in `AquaPulseStore`
- **Where**: `src/core/store.js` line 363 (`_deepMergeInPlace`) and line 85 (`setByPath`).
- **Why**: Malicious or malformed JSON payloads containing `__proto__` mutate `Object.prototype`, compromising all objects in the runtime.
- **Suggestion**:
  1. In `_deepMergeInPlace(target, source)`:
     ```javascript
     for (const key of Object.keys(source)) {
       if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
       ...
     ```
  2. In `setByPath(target, path, value)`:
     ```javascript
     const parts = Array.isArray(path) ? path : path.split('.');
     if (parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype')) {
       return;
     }
     ```
  3. In `_createReactiveProxy`: Guard against `prop === '__proto__' || prop === 'prototype' || prop === 'constructor'` in both `get` and `set` traps.

#### [Major] Finding 2: `EventBus.off()` Fails to Remove `once()` Listeners
- **Where**: `src/core/event-bus.js` lines 86–92.
- **Why**: `bus.once(event, cb)` creates an internal `wrapper`. Calling `bus.off(event, cb)` returns `false` and does not unsubscribe the wrapper, leading to unexpected execution and potential memory leaks.
- **Suggestion**:
  Update `EventBus.off(event, callback)`:
  ```javascript
  const set = this._listeners.get(event);
  let deleted = set.delete(callback);
  if (!deleted) {
    for (const item of set) {
      if (item._originalCallback === callback) {
        deleted = set.delete(item);
        break;
      }
    }
  }
  ```

#### [Major] Finding 3: State Divergence Between `store.state.activeTankId` and `store.tankId`
- **Where**: `src/core/store.js` lines 176–187 and line 290 (`_onStateMutated`).
- **Why**: When `store.state.activeTankId = 'new-tank'` is set, `get tankId()` still returns `config.tank.id`, causing subsequent `getScopedKey()` calls to write to the old tank's storage key.
- **Suggestion**:
  Prioritize `activeTankId` in `get tankId()`:
  ```javascript
  get tankId() {
    return (
      getByPath(this._rawState, 'activeTankId') ||
      getByPath(this._rawState, 'config.tank.id') ||
      getByPath(this._rawState, 'tank.id') ||
      'tank-demo-community'
    );
  }
  ```
  And in `_onStateMutated`, if `path === 'activeTankId'`, synchronize `config.tank.id` and `tank.id` if they exist.

#### [Minor] Finding 4: `PluginRegistry.register` Bypasses `validateContract`
- **Where**: `src/core/plugin-registry.js` lines 54–66.
- **Why**: `register()` repeats inline checks rather than delegating to `this.validateContract(plugin)`, allowing plugins with invalid `update` properties to register.
- **Suggestion**: Call `this.validateContract(plugin)` at the start of `register()`.

#### [Minor] Finding 5: `window` Global Dependency in Config Files
- **Where**: `aquapulse.config.js:23` and `aquapulse.private.js:10`.
- **Why**: Direct assignment to `window.*` causes `ReferenceError` when required in Node.js test environments without polyfill.
- **Suggestion**: Use `(typeof window !== 'undefined' ? window : globalThis).AQUAPULSE_DEFAULT_CONFIG = ...`.

---

## 5. Verification Method

### How to Independently Verify All Findings:

1. **Verify Official Test Suite**:
   ```powershell
   node tests/verify-m1-core.js
   node tests/run-tests.js
   ```
   Both suites should exit code 0.

2. **Verify Finding 1 (Prototype Pollution)**:
   ```powershell
   @'
   const { AquaPulseStore } = require('./src/core/store.js');
   new AquaPulseStore(JSON.parse('{"__proto__": {"polluted": true}}'));
   console.log('Polluted:', ({}).polluted);
   '@ | node
   ```
   *Expected defect behavior*: Outputs `Polluted: true`.
   *Fixed behavior*: Outputs `Polluted: undefined`.

3. **Verify Finding 2 (EventBus once/off)**:
   ```powershell
   @'
   const { EventBus } = require('./src/core/event-bus.js');
   const bus = new EventBus();
   let called = false;
   const cb = () => { called = true; };
   bus.once('test', cb);
   const removed = bus.off('test', cb);
   bus.emit('test');
   console.log('Removed:', removed, 'Called:', called);
   '@ | node
   ```
   *Expected defect behavior*: Outputs `Removed: false Called: true`.
   *Fixed behavior*: Outputs `Removed: true Called: false`.

4. **Verify Finding 3 (Tank ID State Divergence)**:
   ```powershell
   @'
   const { AquaPulseStore } = require('./src/core/store.js');
   const store = new AquaPulseStore({ initialState: { config: { tank: { id: 'tank-1' } }, activeTankId: 'tank-1' } });
   store.state.activeTankId = 'tank-2';
   console.log('Active Tank ID:', store.tankId);
   '@ | node
   ```
   *Expected defect behavior*: Outputs `Active Tank ID: tank-1`.
   *Fixed behavior*: Outputs `Active Tank ID: tank-2`.

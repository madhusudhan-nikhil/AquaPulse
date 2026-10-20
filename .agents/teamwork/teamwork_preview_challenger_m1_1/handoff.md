# Milestone 1 Adversarial Challenge Report: EventBus & Reactive Store

## 1. Observation

### Test Execution Overview
Executed the standalone adversarial stress suite `tests/stress-m1-adversarial.test.js`:
Command: `node tests/stress-m1-adversarial.test.js`
Summary Results:
- Total tests executed: 17
- Passed: 14
- Failed: 3
- Throughput benchmarks:
  * EventBus exact dispatch: 250,000 listener invocations (5,000 events across 50 listeners) completed in 4.5ms (~55,400,000 ops/sec, heap delta +1.64 MB).
  * EventBus wildcard/regex dispatch: 250,000 listener invocations across 50 wildcard patterns completed in 5.1ms (~48,600,000 ops/sec).
  * AquaPulseStore reactive mutations: 50,000 subscriber notifications across 50 subscribers completed in 6.9ms (~7,200,000 ops/sec).
  * 10-level deep path mutations via `setState()` and reactive `Proxy` succeeded with correct ancestor and leaf notification propagation.
  * Fault tolerance: 100 listeners with simulated errors in listeners 0, 15, 49, and 99 demonstrated complete error isolation with healthy listeners executing.

### Directly Observed Failures & Code References

#### Failure 1: EventBus `once()` listeners cannot be unsubscribed via `bus.off(event, callback)`
- **File**: `src/core/event-bus.js`, lines 86-92 and 106-113.
- **Code in `once()`**:
```javascript
106:   const wrapper = (data, emittedEvent) => {
107:     this.off(event, wrapper);
108:     callback(data, emittedEvent);
109:   };
110:   // Keep reference to original callback for manual .off(event, callback) lookup if needed
111:   wrapper._originalCallback = callback;
112: 
113:   return this.on(event, wrapper);
```
- **Code in `off()`**:
```javascript
86:   const set = this._listeners.get(event);
87:   const deleted = set.delete(callback);
88:   if (set.size === 0) {
89:     this._listeners.delete(event);
90:     this._regexCache.delete(event);
91:   }
92:   return deleted;
```
- **Verbatim Error**:
```
[RUN] EventBus: ADVERSARIAL — once() unsubscription via bus.off(event, callback)... FAIL (0.61ms)
      Error: bus.off(event, handler) must return true when removing once() listener
false !== true
```
- **Minimal CLI Reproduction**:
```powershell
node -e "const { EventBus } = require('./src/core/event-bus.js'); const bus = new EventBus(); let fired = false; const cb = () => { fired = true; }; bus.once('event', cb); const removed = bus.off('event', cb); bus.emit('event'); console.log('removed:', removed, 'fired:', fired);"
```
Output: `removed: false fired: true`

#### Failure 2: Critical Prototype Pollution Vulnerability in `store.setState()` via `setByPath()`
- **File**: `src/core/store.js`, lines 85-99.
- **Code**:
```javascript
85: function setByPath(target, path, value) {
86:   const parts = Array.isArray(path) ? path : path.split('.');
87:   let current = target;
88:   for (let i = 0; i < parts.length - 1; i++) {
89:     const part = parts[i];
90:     if (current[part] === null || typeof current[part] !== 'object') {
91:       current[part] = {};
92:     }
93:     current = current[part];
94:   }
95:   const lastKey = parts[parts.length - 1];
96:   const previousValue = current[lastKey];
97:   current[lastKey] = value;
98:   return previousValue;
99: }
```
- **Verbatim Error**:
```
[RUN] AquaPulseStore: ADVERSARIAL — Prototype pollution resistance via setState()... FAIL (0.21ms)
      Error: CRITICAL SECURITY: store.setState() allowed prototype pollution onto Object.prototype!
true !== false
```
- **Minimal CLI Reproduction**:
```powershell
node -e "const { AquaPulseStore } = require('./src/core/store.js'); const store = new AquaPulseStore(); store.setState('__proto__.polluted', true); console.log('Object polluted:', ({}).polluted);"
```
Output: `Object polluted: true`

#### Failure 3: Multi-Tank State Bleed & Storage Key Desynchronization when `config.tank.id` is Present
- **File**: `src/core/store.js`, lines 176-183 and 423-431.
- **Code in `get tankId()` and `getScopedKey()`**:
```javascript
176:   get tankId() {
177:     return (
178:       getByPath(this._rawState, 'config.tank.id') ||
179:       getByPath(this._rawState, 'tank.id') ||
180:       getByPath(this._rawState, 'activeTankId') ||
181:       'tank-demo-community'
182:     );
183:   }
...
423:   getScopedKey(suffix) {
424:     const rawSuffix = suffix || 'default';
425:     const tankId = 
426:       getByPath(this._rawState, 'config.tank.id') ||
427:       getByPath(this._rawState, 'tank.id') ||
428:       getByPath(this._rawState, 'activeTankId') ||
429:       'default';
430:     return `aquapulse_${tankId}_${rawSuffix}`;
431:   }
```
- **Verbatim Error**:
```
[RUN] Multi-tank: ADVERSARIAL — State bleed when switching activeTankId on store with config.tank.id... FAIL (0.57ms)
      Error: store.tankId expected 'tank-beta' but got 'tank-alpha'
+ actual - expected
+ 'tank-alpha'
- 'tank-beta'
```
- **Minimal CLI Reproduction**:
```powershell
node -e "const { AquaPulseStore } = require('./src/core/store.js'); const store = new AquaPulseStore({ initialState: { config: { tank: { id: 'tank-alpha' } }, activeTankId: 'tank-alpha' } }); store.setState('activeTankId', 'tank-beta'); console.log('tankId:', store.tankId); console.log('key:', store.getScopedKey('tasks'));"
```
Output:
`tankId: tank-alpha`
`key: aquapulse_tank-alpha_tasks`

---

## 2. Logic Chain

1. **Logic for Defect 1 (`EventBus.once` unsubscription)**:
   - Observation 1 demonstrates that calling `bus.once(event, callback)` stores an internal closure `wrapper` into the listener `Set`, decorating it with `wrapper._originalCallback = callback`.
   - When a consumer attempts to deregister via standard `bus.off(event, callback)`, line 87 executes `set.delete(callback)`.
   - Because `set` contains `wrapper` rather than `callback`, `set.delete` returns `false` and leaves `wrapper` in the `Set`.
   - On line 135, when `bus.emit(event)` is triggered, `wrapper` is invoked, causing `callback` to run unexpectedly despite explicit deregistration.
   - Consequently, `once` listeners cannot be cancelled by reference, creating phantom event executions and unbounded closure retention in memory.

2. **Logic for Defect 2 (Prototype Pollution)**:
   - Observation 2 demonstrates that `setByPath` accepts any dot-delimited path without key filtering.
   - When a path such as `'__proto__.polluted'` is supplied, line 93 traverses into `current['__proto__']`, which is JavaScript's root `Object.prototype`.
   - Line 97 then assigns `Object.prototype['polluted'] = value`.
   - Any subsequently allocated object `{}` immediately possesses the property `'polluted'`.
   - This represents a critical prototype pollution security vulnerability. If telemetry payloads, user-supplied JSON profiles, or untrusted events trigger state updates with unvalidated keys, the host runtime is exposed to prototype poisoning.

3. **Logic for Defect 3 (Multi-Tank State Bleed & Key Desync)**:
   - Observation 3 shows that `store.tankId` and `store.getScopedKey()` resolve the active tank ID using the priority order: `config.tank.id` > `tank.id` > `activeTankId`.
   - When a user initializes a store with a standard aquarium configuration (where `config.tank.id` is populated) and then switches active tanks via `store.setState('activeTankId', 'tank-beta')` or `store.state.activeTankId = 'tank-beta'`, `config.tank.id` retains the initial value (`'tank-alpha'`).
   - Because `config.tank.id` takes precedence over `activeTankId`, `store.tankId` and `getScopedKey()` return keys for the previous tank.
   - When automatic state syncing (`_syncScopedState`) runs for care checklists, filter rinse sponge index, quarantine trackers, or telemetry history, the data for `tank-beta` is written directly into `aquapulse_tank-alpha_*` storage keys.
   - This causes silent cross-tank state pollution and violates Requirement R1/R4 multi-tank isolation.

---

## 3. Caveats

- **DOM Interactions**: This challenge focused strictly on the headless core foundations (`src/core/event-bus.js` and `src/core/store.js`). DOM rendering and UI visual tree behavior were not tested.
- **Deep Clone Performance at Scale**: Under moderate state size (telemetry history < 1,000 entries), mutation latency remains below 0.01ms. However, because `_onStateMutated` invokes `getState()` (which invokes `deepClone(this._rawState)`) on every property set, extremely large arrays (e.g., 50,000 sensor ticks) will experience garbage collection pressure if not debounced.

---

## 4. Conclusion & Verdict

**Verdict**: **REQUEST_CHANGES**

While the core architecture exhibits exceptional throughput (~55M ops/sec on EventBus, ~7.2M ops/sec on Store) and robust basic isolation across independent store instances, the implementation has 3 concrete defects that block Milestone 1 approval:
1. **EventBus memory leak & phantom execution**: `bus.off(event, callback)` fails to remove `once()` listeners.
2. **Critical Security**: `store.setState()` is vulnerable to prototype pollution on `Object.prototype`.
3. **Multi-tank state bleed**: `store.tankId` and `store.getScopedKey()` prioritize stale `config.tank.id` over `activeTankId`, causing cross-tank storage overwrites.

### Concrete Actionable Mitigations

1. **In `src/core/event-bus.js` (`off` method)**:
```javascript
  off(event, callback) {
    if (typeof event !== 'string') return false;
    if (!this._listeners.has(event)) return false;

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
```

2. **In `src/core/store.js` (`setByPath` function)**:
```javascript
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function setByPath(target, path, value) {
  const parts = Array.isArray(path) ? path : path.split('.');
  for (const part of parts) {
    if (DANGEROUS_KEYS.has(part)) {
      throw new Error(`Security Exception: Access to restricted property "${part}" is blocked`);
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
```

3. **In `src/core/store.js` (`tankId` getter & `_onStateMutated`)**:
Prioritize `activeTankId` in `tankId` and `getScopedKey()`, and synchronize `config.tank.id` whenever `activeTankId` is updated:
```javascript
  get tankId() {
    return (
      getByPath(this._rawState, 'activeTankId') ||
      getByPath(this._rawState, 'config.tank.id') ||
      getByPath(this._rawState, 'tank.id') ||
      'tank-demo-community'
    );
  }

  getScopedKey(suffix) {
    const rawSuffix = suffix || 'default';
    const tankId = this.tankId || 'default';
    return `aquapulse_${tankId}_${rawSuffix}`;
  }
```
And in `_onStateMutated`, if `path === 'activeTankId'`, synchronize `this._rawState.config.tank.id = value`.

---

## 5. Verification Method

To independently verify all findings and confirm remediation:

1. **Run Full Adversarial Stress Suite**:
```powershell
node tests/stress-m1-adversarial.test.js
```
*Current Result*: Exits with code 1; shows 14 passes, 3 failures.
*Expected Result After Fix*: Exits with code 0; all 17 tests pass.

2. **Run Existing Baseline Verification**:
```powershell
node tests/verify-m1-core.js
node tests/run-tests.js --tier=1
```
*Expected Result*: Must continue to pass with 0 regressions.

3. **Verify Individual Defect Remediations**:
- `EventBus.once()` unsubscription:
  `node -e "const { EventBus } = require('./src/core/event-bus.js'); const bus = new EventBus(); let f = false; const cb = () => { f = true; }; bus.once('e', cb); console.log(bus.off('e', cb)); bus.emit('e'); console.log(f);"`
  Must output: `true` then `false`.
- Prototype pollution guard:
  `node -e "const { AquaPulseStore } = require('./src/core/store.js'); const s = new AquaPulseStore(); s.setState('__proto__.p', true); console.log(({}).p);"`
  Must throw security error or output `undefined`.
- Multi-tank storage key isolation:
  `node -e "const { AquaPulseStore } = require('./src/core/store.js'); const s = new AquaPulseStore({ initialState: { config: { tank: { id: 'tA' } }, activeTankId: 'tA' } }); s.setState('activeTankId', 'tB'); console.log(s.getScopedKey('tasks'));"`
  Must output: `aquapulse_tB_tasks`.

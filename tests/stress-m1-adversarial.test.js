/**
 * AquaPulse Milestone 1 Adversarial Stress & Chaos Test Suite
 * Empirically tests EventBus and AquaPulseStore under extreme conditions:
 * - High-throughput event delivery & wildcard performance
 * - Memory retention and leak checks on unsubscribe/clear
 * - Flaws in once() unsubscription semantics
 * - 10-level deep state path mutations via setState & Proxy
 * - Prototype pollution attack vectors
 * - Multi-tank state mutation collisions & storage key bleeding
 * - Error isolation and reentrancy under concurrent notifications
 */

const assert = require('assert');
const path = require('path');
const { EventBus } = require('../src/core/event-bus.js');
const { AquaPulseStore } = require('../src/core/store.js');

let passedTests = 0;
let failedTests = 0;
const findings = [];

function recordTest(name, fn) {
  process.stdout.write(`  [RUN] ${name}... `);
  const start = performance.now();
  try {
    fn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(`PASS (${duration}ms)`);
    passedTests++;
  } catch (err) {
    const duration = (performance.now() - start).toFixed(2);
    console.log(`FAIL (${duration}ms)`);
    console.error(`        Error: ${err.message}`);
    if (err.stack) {
      const frames = err.stack.split('\n').slice(1, 4).join('\n');
      console.error(frames);
    }
    failedTests++;
    findings.push({ test: name, error: err.message, stack: err.stack });
  }
}

console.log('\n======================================================================');
console.log('  AquaPulse Adversarial Stress & Vulnerability Test Suite (M1)');
console.log('======================================================================\n');

// ====================================================================
// 1. High-Frequency Event Throughput
// ====================================================================
console.log('--- 1. High-Frequency Event Throughput ---');

recordTest('EventBus: 5,000 events delivered across 50 exact listeners (250,000 dispatches)', () => {
  const bus = new EventBus();
  const HANDLERS = 50;
  const EVENTS = 5000;
  let receivedCount = 0;

  for (let i = 0; i < HANDLERS; i++) {
    bus.on('sensor:telemetry:tick', (data) => {
      receivedCount++;
    });
  }

  const startMem = process.memoryUsage().heapUsed;
  const t0 = performance.now();

  for (let e = 0; e < EVENTS; e++) {
    bus.emit('sensor:telemetry:tick', { tick: e, temp: 25.5, nh3: 0.0 });
  }

  const durationMs = performance.now() - t0;
  const endMem = process.memoryUsage().heapUsed;
  const memDeltaMB = ((endMem - startMem) / (1024 * 1024)).toFixed(2);

  assert.strictEqual(receivedCount, HANDLERS * EVENTS, `Expected ${HANDLERS * EVENTS} received calls, got ${receivedCount}`);
  console.log(`\n        Stats: ${EVENTS} events x ${HANDLERS} handlers = ${receivedCount} calls in ${durationMs.toFixed(1)}ms (${Math.round((receivedCount / durationMs) * 1000)} ops/sec, Heap Δ: ${memDeltaMB} MB)`);
});

recordTest('EventBus: 5,000 events delivered across 50 wildcard/regex listeners', () => {
  const bus = new EventBus();
  const HANDLERS = 50;
  const EVENTS = 5000;
  let wildCount = 0;

  for (let i = 0; i < HANDLERS; i++) {
    // 25 wildcard prefix, 25 global wildcard
    if (i % 2 === 0) {
      bus.on('telemetry:*', () => { wildCount++; });
    } else {
      bus.on('*', () => { wildCount++; });
    }
  }

  const t0 = performance.now();
  for (let e = 0; e < EVENTS; e++) {
    bus.emit('telemetry:current', { temp: 25.0 + (e % 5) });
  }
  const durationMs = performance.now() - t0;

  assert.strictEqual(wildCount, HANDLERS * EVENTS, `Expected ${HANDLERS * EVENTS} calls, got ${wildCount}`);
  console.log(`\n        Stats: Wildcard dispatch: ${wildCount} calls in ${durationMs.toFixed(1)}ms (${Math.round((wildCount / durationMs) * 1000)} ops/sec)`);
});

recordTest('AquaPulseStore: 1,000 state mutations across 50 subscribers (high-throughput reactive updates)', () => {
  const store = new AquaPulseStore();
  const SUBSCRIBERS = 50;
  const MUTATIONS = 1000;
  let notifiedCount = 0;

  for (let s = 0; s < SUBSCRIBERS; s++) {
    store.subscribe('telemetry.current.temp', () => {
      notifiedCount++;
    });
  }

  const t0 = performance.now();
  for (let m = 0; m < MUTATIONS; m++) {
    store.setState('telemetry.current.temp', 25.0 + (m * 0.001));
  }
  const durationMs = performance.now() - t0;

  assert.strictEqual(notifiedCount, SUBSCRIBERS * MUTATIONS, `Expected ${SUBSCRIBERS * MUTATIONS} notifications, got ${notifiedCount}`);
  console.log(`\n        Stats: Store mutations: ${MUTATIONS} mutations x ${SUBSCRIBERS} subs = ${notifiedCount} calls in ${durationMs.toFixed(1)}ms (${Math.round((notifiedCount / durationMs) * 1000)} ops/sec)`);
});

// ====================================================================
// 2. Memory Leak Checks on Unsubscribe & Clear
// ====================================================================
console.log('\n--- 2. Memory Leak & Reference Retention Checks ---');

recordTest('EventBus: 10,000 distinct event registrations & unsubscriptions leave 0 references', () => {
  const bus = new EventBus();
  const unsubs = [];

  for (let i = 0; i < 10000; i++) {
    const unsub = bus.on(`event:${i}`, () => {});
    unsubs.push(unsub);
  }

  assert.strictEqual(bus.listenerCount(), 10000);
  assert.strictEqual(bus._listeners.size, 10000);

  // Unsubscribe all
  for (const unsub of unsubs) {
    unsub();
  }

  assert.strictEqual(bus.listenerCount(), 0, `Expected listenerCount 0, got ${bus.listenerCount()}`);
  assert.strictEqual(bus._listeners.size, 0, `Expected _listeners.size 0, got ${bus._listeners.size}`);
  assert.strictEqual(bus._regexCache.size, 0, `Expected _regexCache.size 0, got ${bus._regexCache.size}`);
});

recordTest('EventBus: clear() fully purges listeners and compiled regex cache', () => {
  const bus = new EventBus();
  for (let i = 0; i < 1000; i++) {
    bus.on(`wildcard:*:${i}`, () => {});
  }
  // Trigger regex compilation
  bus.emit('wildcard:test:1');
  bus.emit('wildcard:test:2');
  assert.ok(bus._regexCache.size > 0, 'Regex cache should contain compiled patterns');

  bus.clear();
  assert.strictEqual(bus.listenerCount(), 0);
  assert.strictEqual(bus._listeners.size, 0);
  assert.strictEqual(bus._regexCache.size, 0, `Expected _regexCache.size 0 after clear(), got ${bus._regexCache.size}`);
});

recordTest('EventBus: ADVERSARIAL — once() unsubscription via bus.off(event, callback)', () => {
  const bus = new EventBus();
  let fired = false;
  const handler = () => { fired = true; };

  // Register with once()
  bus.once('temp:high', handler);
  assert.strictEqual(bus.listenerCount('temp:high'), 1, 'Should have 1 registered listener');

  // Attempt to cancel via bus.off(event, handler)
  const removed = bus.off('temp:high', handler);

  // Verification:
  assert.strictEqual(removed, true, 'bus.off(event, handler) must return true when removing once() listener');
  assert.strictEqual(bus.listenerCount('temp:high'), 0, 'Listener count must be 0 after off()');

  // Emit should not fire
  bus.emit('temp:high');
  assert.strictEqual(fired, false, 'Handler must not execute after being removed via off()');
});

recordTest('AquaPulseStore: 5,000 subscriptions and unsubscriptions leave 0 retained listeners', () => {
  const store = new AquaPulseStore();
  const unsubs = [];

  for (let i = 0; i < 2500; i++) {
    unsubs.push(store.subscribe(() => {}));
    unsubs.push(store.subscribe(`path.${i}`, () => {}));
  }

  assert.strictEqual(store._subscribers.size, 2500);
  assert.strictEqual(store._pathSubscribers.size, 2500);

  for (const unsub of unsubs) {
    unsub();
  }

  assert.strictEqual(store._subscribers.size, 0, `Expected 0 global subscribers, got ${store._subscribers.size}`);
  assert.strictEqual(store._pathSubscribers.size, 0, `Expected 0 path subscribers, got ${store._pathSubscribers.size}`);
});

// ====================================================================
// 3. Deeply Nested State Path Mutations
// ====================================================================
console.log('\n--- 3. Deeply Nested State Path Mutations & Security ---');

recordTest('AquaPulseStore: 10-level deep path mutation via setState()', () => {
  const store = new AquaPulseStore();
  const path10 = 'a.b.c.d.e.f.g.h.i.j';
  let capturedPayload = null;

  store.subscribe(path10, (payload) => {
    capturedPayload = payload;
  });

  store.setState(path10, 9999);

  assert.strictEqual(store.getState(path10), 9999, 'getState on 10-level path must return 9999');
  assert.ok(capturedPayload !== null, 'Path subscriber on 10-level path must be notified');
  assert.strictEqual(capturedPayload.path, path10);
  assert.strictEqual(capturedPayload.value, 9999);
});

recordTest('AquaPulseStore: 10-level deep path mutation via reactive Proxy property assignment', () => {
  const store = new AquaPulseStore();
  // Initialize nested structure
  store.setState('l1.l2.l3.l4.l5.l6.l7.l8.l9.l10', 'original');

  let leafFired = 0;
  let midFired = 0;
  let rootFired = 0;
  let siblingFired = 0;

  store.subscribe('l1.l2.l3.l4.l5.l6.l7.l8.l9.l10', () => { leafFired++; });
  store.subscribe('l1.l2.l3.l4.l5', () => { midFired++; });
  store.subscribe('l1', () => { rootFired++; });
  store.subscribe('l1.l2.other_sibling', () => { siblingFired++; });

  // Mutate via Proxy
  store.state.l1.l2.l3.l4.l5.l6.l7.l8.l9.l10 = 'adversarial_update';

  assert.strictEqual(store.getState('l1.l2.l3.l4.l5.l6.l7.l8.l9.l10'), 'adversarial_update');
  assert.strictEqual(leafFired, 1, 'Leaf subscriber must fire exactly once');
  assert.strictEqual(midFired, 1, 'Mid-level ancestor subscriber must fire once');
  assert.strictEqual(rootFired, 1, 'Root ancestor subscriber must fire once');
  assert.strictEqual(siblingFired, 0, 'Unrelated sibling path subscriber must NOT fire');
});

recordTest('AquaPulseStore: Deep property deletion via Proxy triggers mutation lifecycle', () => {
  const store = new AquaPulseStore();
  store.setState('nested.deep.leaf', 'exists');

  let deletedPath = null;
  store.subscribe('nested.deep.leaf', (payload) => {
    deletedPath = payload.path;
  });

  delete store.state.nested.deep.leaf;

  assert.strictEqual(store.getState('nested.deep.leaf'), undefined);
  assert.strictEqual(deletedPath, 'nested.deep.leaf', 'Subscriber should be notified of deletion');
});

recordTest('AquaPulseStore: ADVERSARIAL — Prototype pollution resistance via setState()', () => {
  const store = new AquaPulseStore();
  const testProp = '__polluted_adversarial_test__';

  // Attempt prototype pollution
  try {
    store.setState(`__proto__.${testProp}`, 'attack_succeeded');
  } catch (_) {
    // If it threw, that is safe
  }

  try {
    store.setState(`constructor.prototype.${testProp}`, 'attack_succeeded');
  } catch (_) {
    // If it threw, that is safe
  }

  // Check if Object.prototype or empty object was polluted
  const cleanObject = {};
  const isPolluted = cleanObject[testProp] === 'attack_succeeded';

  // Clean up if pollution occurred
  delete Object.prototype[testProp];

  assert.strictEqual(isPolluted, false, 'CRITICAL SECURITY: store.setState() allowed prototype pollution onto Object.prototype!');
});

// ====================================================================
// 4. Multi-Tank State Mutation Collision Tests
// ====================================================================
console.log('\n--- 4. Multi-Tank State Mutation Collision & Key Isolation ---');

recordTest('Multi-tank: Independent stores sharing storage maintain strict data isolation', () => {
  // Mock shared localStorage
  const sharedStorage = new Map();
  const mockStorage = {
    getItem: (k) => sharedStorage.has(k) ? sharedStorage.get(k) : null,
    setItem: (k, v) => sharedStorage.set(k, String(v)),
    removeItem: (k) => sharedStorage.delete(k)
  };

  const storeTankA = new AquaPulseStore({
    initialState: {
      activeTankId: 'tank-A-reef',
      care: { checklist: { t1: true } },
      telemetry: { history: [{ date: '2026-10-01', temp: 25.5 }] }
    },
    storage: mockStorage
  });

  const storeTankB = new AquaPulseStore({
    initialState: {
      activeTankId: 'tank-B-freshwater',
      care: { checklist: { t1: false } },
      telemetry: { history: [{ date: '2026-10-01', temp: 22.0 }] }
    },
    storage: mockStorage
  });

  // Verify scoped keys
  assert.strictEqual(storeTankA.getScopedKey('tasks'), 'aquapulse_tank-A-reef_tasks');
  assert.strictEqual(storeTankB.getScopedKey('tasks'), 'aquapulse_tank-B-freshwater_tasks');
  assert.notStrictEqual(storeTankA.getScopedKey('tasks'), storeTankB.getScopedKey('tasks'));

  // Mutate Tank A checklist
  storeTankA.setState('care.checklist.t2', 'completed_in_tank_A');

  // Verify Tank A storage written
  const tankATasks = JSON.parse(mockStorage.getItem('aquapulse_tank-A-reef_tasks'));
  assert.strictEqual(tankATasks.t2, 'completed_in_tank_A');

  // Verify Tank B state and storage are completely untainted
  assert.strictEqual(storeTankB.getState('care.checklist.t2'), undefined);
  const tankBTasksRaw = mockStorage.getItem('aquapulse_tank-B-freshwater_tasks');
  if (tankBTasksRaw) {
    const tankBTasks = JSON.parse(tankBTasksRaw);
    assert.strictEqual(tankBTasks.t2, undefined);
  }
});

recordTest('Multi-tank: ADVERSARIAL — State bleed when switching activeTankId on store with config.tank.id', () => {
  const sharedStorage = new Map();
  const mockStorage = {
    getItem: (k) => sharedStorage.has(k) ? sharedStorage.get(k) : null,
    setItem: (k, v) => sharedStorage.set(k, String(v)),
    removeItem: (k) => sharedStorage.delete(k)
  };

  // Store initialized with full config containing tank.id = 'tank-alpha'
  const store = new AquaPulseStore({
    initialState: {
      config: { tank: { id: 'tank-alpha', name: 'Alpha Tank' } },
      activeTankId: 'tank-alpha'
    },
    storage: mockStorage
  });

  assert.strictEqual(store.tankId, 'tank-alpha');
  assert.strictEqual(store.getScopedKey('tasks'), 'aquapulse_tank-alpha_tasks');

  // Scenario: Developer switches active tank via setState('activeTankId', 'tank-beta')
  // or state.activeTankId = 'tank-beta'
  store.setState('activeTankId', 'tank-beta');

  // Verification 1: store.tankId must reflect 'tank-beta'
  assert.strictEqual(store.tankId, 'tank-beta', `store.tankId expected 'tank-beta' but got '${store.tankId}'`);

  // Verification 2: store.getScopedKey('tasks') must reflect 'tank-beta'
  const scopedKey = store.getScopedKey('tasks');
  assert.strictEqual(scopedKey, 'aquapulse_tank-beta_tasks', `getScopedKey expected 'aquapulse_tank-beta_tasks' but got '${scopedKey}' (config.tank.id bled over activeTankId!)`);

  // Verification 3: storage sync must write to tank-beta key, NOT tank-alpha
  store.setState('care.checklist.water_change', true);
  assert.ok(sharedStorage.has('aquapulse_tank-beta_tasks'), 'Storage should have key for tank-beta');
  assert.ok(!sharedStorage.has('aquapulse_tank-alpha_tasks') || !JSON.parse(sharedStorage.get('aquapulse_tank-alpha_tasks')).water_change,
    'Tank Alpha key must NOT receive Tank Beta mutation!');
});

// ====================================================================
// 5. Concurrent Subscriber Notifications & Error Isolation
// ====================================================================
console.log('\n--- 5. Concurrent Subscriber Notifications & Error Isolation ---');

recordTest('EventBus: Listener error isolation across 100 listeners with random faults', () => {
  const bus = new EventBus();
  const TOTAL = 100;
  const FAULTY_INDICES = new Set([0, 15, 49, 99]);
  let successfulExecutions = 0;

  for (let i = 0; i < TOTAL; i++) {
    if (FAULTY_INDICES.has(i)) {
      bus.on('fault:test', () => {
        throw new Error(`Simulated listener failure at index ${i}`);
      });
    } else {
      bus.on('fault:test', () => {
        successfulExecutions++;
      });
    }
  }

  // Suppress console.error during expected simulated faults
  const origError = console.error;
  console.error = () => {};
  try {
    const invokedCount = bus.emit('fault:test', { data: 'test' });
    assert.strictEqual(successfulExecutions, TOTAL - FAULTY_INDICES.size, 'All healthy listeners must execute');
  } finally {
    console.error = origError;
  }
});

recordTest('AquaPulseStore: Subscriber error isolation on state mutation', () => {
  const store = new AquaPulseStore();
  let sub1Ran = false;
  let sub2Ran = false;
  let sub3Ran = false;

  store.subscribe(() => { sub1Ran = true; });
  store.subscribe(() => { throw new Error('Uncaught subscriber disaster'); });
  store.subscribe(() => { sub3Ran = true; });

  const origError = console.error;
  console.error = () => {};
  try {
    store.setState('telemetry.status', 'CRITICAL');
  } finally {
    console.error = origError;
  }

  assert.strictEqual(sub1Ran, true, 'Subscriber 1 must run');
  assert.strictEqual(sub3Ran, true, 'Subscriber 3 must run despite Subscriber 2 error');
});

recordTest('AquaPulseStore: Mutation reentrancy — subscriber mutates different state path during notification', () => {
  const store = new AquaPulseStore();
  const log = [];

  store.subscribe('simulation.mode', (payload) => {
    log.push(`mode:${payload.value}`);
    if (payload.value === 'baffled') {
      // Reentrant mutation: mutate another slice
      store.setState('simulation.selectedZoneId', 'zone-bottom-return');
    }
  });

  store.subscribe('simulation.selectedZoneId', (payload) => {
    log.push(`zone:${payload.value}`);
  });

  store.setState('simulation.mode', 'baffled');

  assert.deepStrictEqual(log, ['mode:baffled', 'zone:zone-bottom-return'],
    'Reentrant state mutation should trigger subsequent listener cleanly');
  assert.strictEqual(store.getState('simulation.selectedZoneId'), 'zone-bottom-return');
});

recordTest('EventBus: Unsubscribing a listener during emit() iteration does not skip remaining listeners', () => {
  const bus = new EventBus();
  const executed = [];
  let unsub2;

  bus.on('step:test', () => {
    executed.push('first');
    // First listener unsubscribes the second listener during iteration
    unsub2();
  });

  unsub2 = bus.on('step:test', () => {
    executed.push('second');
  });

  bus.on('step:test', () => {
    executed.push('third');
  });

  bus.emit('step:test');

  // In Array.from copy semantics:
  // First runs, third runs. Whether second runs depends on copy snapshot timing,
  // but crucially, third MUST run and no crash must occur.
  assert.ok(executed.includes('first'), 'First listener must run');
  assert.ok(executed.includes('third'), 'Third listener must run');
  assert.ok(!executed.includes('error'), 'No crash should occur');
});

// ====================================================================
// Summary & Verdict
// ====================================================================
console.log('\n======================================================================');
console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
console.log('======================================================================\n');

if (failedTests > 0) {
  console.log('FAILING TESTS / DEFECTS ENCOUNTERED:');
  findings.forEach((f, idx) => {
    console.log(`\n[Defect ${idx + 1}] ${f.test}`);
    console.log(`  Details: ${f.error}`);
  });
  console.log('\nVERDICT: REQUEST_CHANGES\n');
  process.exit(1);
} else {
  console.log('VERDICT: APPROVE (All stress & adversarial tests passed)\n');
  process.exit(0);
}

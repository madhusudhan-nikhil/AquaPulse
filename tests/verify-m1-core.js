/**
 * AquaPulse Milestone 1 Core Modules Automated Verification Suite
 * Tests EventBus, AquaPulseStore, ConfigManager, and PluginRegistry.
 */

const assert = require('assert');
const path = require('path');

// 1. Load Modules
const { EventBus } = require('../src/core/event-bus.js');
const { AquaPulseStore } = require('../src/core/store.js');
const { ConfigManager } = require('../src/core/config-manager.js');
const { PluginRegistry } = require('../src/core/plugin-registry.js');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failCount++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.name}: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 3).join('\n'));
    }
  }
}

console.log('\n======================================================');
console.log('  AquaPulse Milestone 1 Core Foundation Verification');
console.log('======================================================\n');

// ----------------------------------------------------
// Test Suite 1: EventBus
// ----------------------------------------------------
console.log('--- Suite 1: EventBus ---');

runTest('Basic publish and subscribe', () => {
  const bus = new EventBus();
  let received = null;
  bus.on('test:event', (data) => {
    received = data;
  });
  bus.emit('test:event', { msg: 'hello' });
  assert.deepStrictEqual(received, { msg: 'hello' });
});

runTest('Unsubscribe removes listener', () => {
  const bus = new EventBus();
  let count = 0;
  const unsub = bus.on('test:count', () => {
    count++;
  });
  bus.emit('test:count');
  assert.strictEqual(count, 1);
  unsub();
  bus.emit('test:count');
  assert.strictEqual(count, 1);
});

runTest('Wildcard matching with prefix: *', () => {
  const bus = new EventBus();
  const captured = [];
  bus.on('state:*', (data, event) => {
    captured.push({ event, data });
  });

  bus.emit('state:changed', { key: 'a' });
  bus.emit('state:tank:updated', { key: 'b' });
  bus.emit('config:updated', { key: 'c' }); // Should not match

  assert.strictEqual(captured.length, 2);
  assert.strictEqual(captured[0].event, 'state:changed');
  assert.strictEqual(captured[1].event, 'state:tank:updated');
});

runTest('Global wildcard * captures all events', () => {
  const bus = new EventBus();
  let capturedCount = 0;
  bus.on('*', () => {
    capturedCount++;
  });

  bus.emit('event:one');
  bus.emit('event:two');
  bus.emit('anything');
  assert.strictEqual(capturedCount, 3);
});

runTest('once() executes only once', () => {
  const bus = new EventBus();
  let count = 0;
  bus.once('single:fire', () => {
    count++;
  });
  bus.emit('single:fire');
  bus.emit('single:fire');
  assert.strictEqual(count, 1);
});

runTest('Error in listener does not break subsequent listeners', () => {
  const bus = new EventBus();
  let secondRan = false;
  bus.on('boom', () => {
    throw new Error('Intentional error in listener');
  });
  bus.on('boom', () => {
    secondRan = true;
  });
  bus.emit('boom');
  assert.strictEqual(secondRan, true);
});

runTest('clear() removes listeners', () => {
  const bus = new EventBus();
  bus.on('a', () => {});
  bus.on('b', () => {});
  assert.strictEqual(bus.listenerCount(), 2);
  bus.clear('a');
  assert.strictEqual(bus.listenerCount('a'), 0);
  assert.strictEqual(bus.listenerCount('b'), 1);
  bus.clear();
  assert.strictEqual(bus.listenerCount(), 0);
});

// ----------------------------------------------------
// Test Suite 2: AquaPulseStore
// ----------------------------------------------------
console.log('\n--- Suite 2: AquaPulseStore ---');

runTest('Store initializes with default structure', () => {
  const store = new AquaPulseStore();
  const state = store.getState();
  assert.ok(state.telemetry);
  assert.ok(state.simulation);
  assert.ok(state.care);
  assert.strictEqual(state.activeTankId, 'tank-demo-community');
});

runTest('getState returns deep clone preventing external mutation', () => {
  const store = new AquaPulseStore();
  const state1 = store.getState();
  state1.activeTankId = 'mutated';
  const state2 = store.getState();
  assert.strictEqual(state2.activeTankId, 'tank-demo-community');
});

runTest('getState with dot notation path', () => {
  const store = new AquaPulseStore();
  store.setState('telemetry.current.temp', 25.8);
  assert.strictEqual(store.getState('telemetry.current.temp'), 25.8);
});

runTest('setState updates value and emits events', () => {
  const bus = new EventBus();
  const store = new AquaPulseStore({ eventBus: bus });
  let eventFired = false;

  bus.on('state:changed:telemetry.status', (payload) => {
    eventFired = (payload.value === 'ACTION NEEDED');
  });

  store.setState('telemetry.status', 'ACTION NEEDED');
  assert.strictEqual(store.getState('telemetry.status'), 'ACTION NEEDED');
  assert.strictEqual(eventFired, true);
});

runTest('Reactive Proxy intercepts property assignment', () => {
  const bus = new EventBus();
  const store = new AquaPulseStore({ eventBus: bus });
  let notified = false;

  bus.on('state:changed:simulation.mode', (payload) => {
    notified = (payload.value === 'baffled');
  });

  store.state.simulation.mode = 'baffled';
  assert.strictEqual(store.getState('simulation.mode'), 'baffled');
  assert.strictEqual(notified, true);
});

runTest('getScopedKey generates correct tank isolation key', () => {
  const store = new AquaPulseStore({ initialState: { activeTankId: 'tank-255l-community' } });
  assert.strictEqual(store.getScopedKey('params'), 'aquapulse_tank-255l-community_params');
  assert.strictEqual(store.getScopedKey('tasks'), 'aquapulse_tank-255l-community_tasks');
  assert.strictEqual(store.getScopedKey('sponge_idx'), 'aquapulse_tank-255l-community_sponge_idx');

  store.setTankId('tank-60l-betta');
  assert.strictEqual(store.getScopedKey('params'), 'aquapulse_tank-60l-betta_params');
});

runTest('Store fallback storage persists in-memory without window.localStorage', () => {
  const store = new AquaPulseStore();
  store.setItem('test_key', 'test_value');
  assert.strictEqual(store.getItem('test_key'), 'test_value');
  store.removeItem('test_key');
  assert.strictEqual(store.getItem('test_key'), null);
});

runTest('subscribe listener is notified on state changes', () => {
  const store = new AquaPulseStore();
  let receivedPath = null;
  const unsub = store.subscribe(({ path, value }) => {
    receivedPath = path;
  });

  store.setState('care.checklist.t1', true);
  assert.strictEqual(receivedPath, 'care.checklist.t1');
  unsub();
  store.setState('care.checklist.t2', true);
  assert.strictEqual(receivedPath, 'care.checklist.t1'); // Did not update after unsub
});

// ----------------------------------------------------
// Test Suite 3: ConfigManager
// ----------------------------------------------------
console.log('\n--- Suite 3: ConfigManager ---');

runTest('deepMerge recursively merges nested objects', () => {
  const target = {
    tank: { id: 'tank-1', dimensions: { length: 2, width: 1 } },
    targets: { temp: { min: 24, max: 26 } }
  };
  const source = {
    tank: { name: 'Custom Tank', dimensions: { length: 3 } },
    targets: { temp: { max: 27 } }
  };
  const merged = ConfigManager.deepMerge(target, source);

  assert.strictEqual(merged.tank.id, 'tank-1');
  assert.strictEqual(merged.tank.name, 'Custom Tank');
  assert.strictEqual(merged.tank.dimensions.length, 3);
  assert.strictEqual(merged.tank.dimensions.width, 1);
  assert.strictEqual(merged.targets.temp.min, 24);
  assert.strictEqual(merged.targets.temp.max, 27);
});

runTest('deepMerge completely replaces arrays rather than merging them', () => {
  const target = {
    species: [{ id: 'neon', count: 10 }, { id: 'cory', count: 6 }]
  };
  const source = {
    species: [{ id: 'betta', count: 1 }]
  };
  const merged = ConfigManager.deepMerge(target, source);

  assert.strictEqual(merged.species.length, 1);
  assert.strictEqual(merged.species[0].id, 'betta');
});

runTest('lenientParseJSON strips Unicode smart/curly quotes', () => {
  const raw = '{\u201Ctank\u201D: {\u201Cname\u201D: \u201CCommunity Tank\u201D}}';
  const parsed = ConfigManager.lenientParseJSON(raw);
  assert.strictEqual(parsed.tank.name, 'Community Tank');
});

runTest('lenientParseJSON strips single-line and multi-line comments', () => {
  const raw = `
  {
    // Top-level comment
    "tank": {
      "id": "t1" /* inline comment */
    },
    /* Multiline
       comment
    */
    "url": "http://example.com//keep_this_url"
  }`;
  const parsed = ConfigManager.lenientParseJSON(raw);
  assert.strictEqual(parsed.tank.id, 't1');
  assert.strictEqual(parsed.url, 'http://example.com//keep_this_url');
});

runTest('lenientParseJSON strips trailing commas in objects and arrays', () => {
  const raw = `
  {
    "items": [1, 2, 3, ],
    "tank": { "vol": 100, },
  }`;
  const parsed = ConfigManager.lenientParseJSON(raw);
  assert.deepStrictEqual(parsed.items, [1, 2, 3]);
  assert.strictEqual(parsed.tank.vol, 100);
});

runTest('lenientParseJSON throws informative Error with line/column on invalid syntax', () => {
  const raw = '{\n  "broken": true,\n  "unclosed\n}';
  assert.throws(
    () => ConfigManager.lenientParseJSON(raw),
    (err) => {
      assert.ok(err.message.includes('JSON Parse Error'));
      assert.ok(typeof err.line === 'number');
      assert.ok(typeof err.column === 'number');
      return true;
    }
  );
});

runTest('exportJSON and importJSON validate required sections', () => {
  const valid = {
    tank: { id: 't1' },
    species: [],
    medicines: []
  };
  const jsonStr = ConfigManager.exportJSON(valid);
  assert.ok(jsonStr.includes('"tank"'));

  const reimported = ConfigManager.importJSON(jsonStr);
  assert.strictEqual(reimported.tank.id, 't1');

  // Test missing required field
  const invalid = JSON.stringify({ tank: { id: 't1' } });
  assert.throws(
    () => ConfigManager.importJSON(invalid),
    /Aquarium profile must contain "tank", "species", and "medicines" sections\./
  );
});

runTest('exportCSV serializes logs into exact header format with proper escaping', () => {
  const logs = [
    {
      date: '2026-10-18',
      nh3: 0.0,
      no2: 0.0,
      no3: 15,
      ph: 7.2,
      temp: 25.8,
      gh: 7,
      kh: 4,
      wc: 'Yes (35%)',
      notes: 'Weekly routine change, cleaned glass'
    },
    {
      date: '2026-10-11',
      nh3: 0.25,
      no2: 0.1,
      no3: 35,
      ph: 6.8,
      temp: 26.0,
      gh: 6,
      kh: 3,
      wc: 'Yes (50%)',
      notes: 'Emergency change: "Ammonia Spike"'
    }
  ];

  const csv = ConfigManager.exportCSV(logs);
  const lines = csv.split('\n');
  assert.strictEqual(lines[0], 'Date, Ammonia_ppm, Nitrite_ppm, Nitrate_ppm, pH, Temp_C, GH_dGH, KH_dKH, Water_Change, Notes');
  assert.strictEqual(lines.length, 3);
  assert.ok(lines[1].includes('2026-10-18'));
  assert.ok(lines[1].includes('"Weekly routine change, cleaned glass"'));
  assert.ok(lines[2].includes('"Emergency change: ""Ammonia Spike"""'));
});

runTest('getScopedStorageKey constructs key correctly', () => {
  assert.strictEqual(
    ConfigManager.getScopedStorageKey('tank-255l', 'params'),
    'aquapulse_tank-255l_params'
  );
  assert.strictEqual(
    ConfigManager.getScopedStorageKey(null, 'tasks'),
    'aquapulse_default_tasks'
  );
});

// ----------------------------------------------------
// Test Suite 4: PluginRegistry
// ----------------------------------------------------
console.log('\n--- Suite 4: PluginRegistry ---');

runTest('Registers a valid plugin and queries by id & category', () => {
  const registry = new PluginRegistry();
  const plugin = {
    id: 'sensor-orp',
    name: 'ORP Sensor Widget',
    category: 'sensor',
    mount: () => {},
    unmount: () => {}
  };

  const registered = registry.register(plugin);
  assert.strictEqual(registered, true);
  assert.strictEqual(registry.hasPlugin('sensor-orp'), true);
  assert.strictEqual(registry.getPlugin('sensor-orp').name, 'ORP Sensor Widget');

  const sensors = registry.getPluginsByCategory('sensor');
  assert.strictEqual(sensors.length, 1);
  assert.strictEqual(sensors[0].id, 'sensor-orp');

  const calculators = registry.getPluginsByCategory('calculator');
  assert.strictEqual(calculators.length, 0);
});

runTest('Rejects duplicate plugin registration', () => {
  const registry = new PluginRegistry();
  const plugin = {
    id: 'duplicate-id',
    name: 'Plugin 1',
    category: 'widget',
    mount: () => {},
    unmount: () => {}
  };
  registry.register(plugin);
  assert.throws(
    () => registry.register({ ...plugin, name: 'Plugin 2' }),
    /already registered/
  );
});

runTest('Rejects plugin violating contract', () => {
  const registry = new PluginRegistry();
  // Missing unmount
  assert.throws(
    () => registry.register({ id: 'p1', name: 'P1', category: 'widget', mount: () => {} }),
    /Plugin must implement mount and unmount methods/
  );
  // Missing category
  assert.throws(
    () => registry.register({ id: 'p2', name: 'P2', mount: () => {}, unmount: () => {} }),
    /Plugin must specify id, name, and category/
  );
});

runTest('Mounts, updates, and unmounts plugin with lifecycle tracking', () => {
  const registry = new PluginRegistry();
  let mountedWith = null;
  let updatedWith = null;
  let unmountedCalled = false;

  const plugin = {
    id: 'calculator-salt',
    name: 'Salt Dosing Calculator',
    category: 'calculator',
    mount: (container, context) => {
      mountedWith = { container, context };
      return { handle: 123 };
    },
    update: (state) => {
      updatedWith = state;
    },
    unmount: () => {
      unmountedCalled = true;
    }
  };

  registry.register(plugin);
  assert.strictEqual(registry.isMounted('calculator-salt'), false);

  const containerMock = {};
  const contextMock = { store: 'storeMock' };
  const instance = registry.mountPlugin('calculator-salt', containerMock, contextMock);

  assert.strictEqual(registry.isMounted('calculator-salt'), true);
  assert.deepStrictEqual(mountedWith, { container: containerMock, context: contextMock });
  assert.deepStrictEqual(instance, { handle: 123 });

  registry.updatePlugin('calculator-salt', { volume: 50 });
  assert.deepStrictEqual(updatedWith, { volume: 50 });

  const unmounted = registry.unmountPlugin('calculator-salt');
  assert.strictEqual(unmounted, true);
  assert.strictEqual(registry.isMounted('calculator-salt'), false);
  assert.strictEqual(unmountedCalled, true);
});

runTest('unregister unmounts if mounted and removes plugin', () => {
  const registry = new PluginRegistry();
  let unmounted = false;
  registry.register({
    id: 'widget-to-remove',
    name: 'Widget',
    category: 'widget',
    mount: () => {},
    unmount: () => { unmounted = true; }
  });
  registry.mountPlugin('widget-to-remove', {});
  assert.strictEqual(registry.isMounted('widget-to-remove'), true);

  registry.unregister('widget-to-remove');
  assert.strictEqual(unmounted, true);
  assert.strictEqual(registry.hasPlugin('widget-to-remove'), false);
});

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n======================================================');
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log('======================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

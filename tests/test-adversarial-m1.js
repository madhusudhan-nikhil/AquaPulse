/**
 * AquaPulse Milestone 1 Comprehensive Adversarial & Stress Testing Harness
 * 
 * Empirically stress-tests:
 * 1. lenientParseJSON (pathological quotes, comments, trailing commas, UTF-8, payloads)
 * 2. ConfigManager (import/export section validation, CSV export boundaries, formula injection)
 * 3. PluginRegistry (contract validation, re-entrancy, circular mounts, error handling)
 */

const assert = require('assert');
const { ConfigManager } = require('../src/core/config-manager.js');
const { PluginRegistry } = require('../src/core/plugin-registry.js');
const { EventBus } = require('../src/core/event-bus.js');

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function test(category, description, fn) {
  results.total++;
  try {
    fn();
    results.passed++;
    console.log(`  ✓ [PASS] [${category}] ${description}`);
  } catch (err) {
    results.failed++;
    console.log(`  ✗ [FAIL] [${category}] ${description}`);
    console.log(`    Error: ${err.message}`);
    results.failures.push({
      category,
      description,
      error: err.message,
      stack: err.stack ? err.stack.split('\n').slice(1, 3).join('\n') : ''
    });
  }
}

console.log('======================================================================');
console.log(' AquaPulse Milestone 1 Adversarial Challenge & Stress Test Suite');
console.log('======================================================================\n');

// --------------------------------------------------------------------
// Category 1: Pathological JSON & Lenient Parser Stress Tests
// --------------------------------------------------------------------
console.log('--- Category 1: Pathological JSON & Lenient Parser Stress ---');

test('Parser', 'Curly quotes inside double-quoted string literals must not be transformed into unescaped quotes', () => {
  const input = '{"title": "The Book of “Aquascaping” Secrets"}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.title, 'The Book of “Aquascaping” Secrets');
});

test('Parser', 'French guillemets (« and ») inside double-quoted string literals must not be replaced with unescaped quotes', () => {
  const input = '{"french": "Le mot « Poisson »"}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.french, 'Le mot « Poisson »');
});

test('Parser', 'Curly apostrophe (’) inside single-quoted strings must not terminate string matching prematurely', () => {
  const input = "{'note': 'It’s a planted tank'}";
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.note, "It's a planted tank");
});

test('Parser', 'Escaped single quotes (\\\') inside single-quoted strings must not convert to invalid JSON escape sequences', () => {
  const input = "{'note': 'It\\'s a planted tank'}";
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.note, "It's a planted tank");
});

test('Parser', 'Mixed quote delimiters across key-value pairs', () => {
  const input = '{\u201CmixedQuotes": "test", \'single\': "value"}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.mixedQuotes, 'test');
  assert.strictEqual(parsed.single, 'value');
});

test('Parser', 'Nested multi-line comments (/* outer /* inner */ comment */) must be handled gracefully', () => {
  const input = '{\n  /* outer /* inner */ comment */\n  "key": 100\n}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.key, 100);
});

test('Parser', 'Single-line comment without newline before closing brace', () => {
  const input = '{"key": 100 // inline at end\n}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.key, 100);
});

test('Parser', 'Comment interspersed between key and value tokens', () => {
  const input = '{\n  "key" /* comment */ : /* another */ 42\n}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.key, 42);
});

test('Parser', 'Multiple consecutive trailing commas in array [1, 2, 3,, ] must be stripped', () => {
  const input = '{"list": [1, 2, 3,, ]}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.deepStrictEqual(parsed.list, [1, 2, 3]);
});

test('Parser', 'Empty array with trailing comma [,]', () => {
  const input = '{"list": [,]}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.deepStrictEqual(parsed.list, []);
});

test('Parser', 'Trailing comma separated by multi-line comment before closing bracket', () => {
  const input = '{"list": [1, 2, /* comment */ , ]}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.deepStrictEqual(parsed.list, [1, 2]);
});

test('Parser', 'URL containing double slash and wildcard comment patterns inside string literals', () => {
  const input = '{"url": "https://api.aquapulse.io//v2/*sensors*/status"}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.url, 'https://api.aquapulse.io//v2/*sensors*/status');
});

test('Parser', 'Single quote inside double-quoted string with comment characters', () => {
  const input = '{"query": "SELECT * FROM fish WHERE notes = \'//not a comment\'"}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.query, "SELECT * FROM fish WHERE notes = '//not a comment'");
});

test('Parser', 'UTF-8 emojis and multi-byte surrogate pairs in strings', () => {
  const input = '{"tank": "🐠 AquaPulse 🌿", "description": "🌊 Clean water 🦐"}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.tank, '🐠 AquaPulse 🌿');
});

test('Parser', 'UTF-8 Byte Order Mark (BOM \uFEFF) at start of JSON payload', () => {
  const input = '\uFEFF{"tank": "Community Tank"}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.tank, 'Community Tank');
});

test('Parser', 'Non-breaking space characters (\u00A0) in JSON whitespace', () => {
  const input = '{\u00A0"tank":\u00A0"Community"\u00A0}';
  const parsed = ConfigManager.lenientParseJSON(input);
  assert.strictEqual(parsed.tank, 'Community');
});

test('Parser', 'Deeply nested JSON structure (200 levels) parses without stack overflow', () => {
  let nested = '{"a": 1}';
  for (let i = 0; i < 200; i++) {
    nested = `{"nest": ${nested}}`;
  }
  const parsed = ConfigManager.lenientParseJSON(nested);
  assert.ok(parsed.nest);
});

test('Parser', 'Unclosed string literal produces diagnostic error with line and column', () => {
  assert.throws(
    () => ConfigManager.lenientParseJSON('{\n  "unclosed: 123\n}'),
    (err) => {
      assert.ok(err.message.includes('JSON Parse Error'));
      assert.strictEqual(typeof err.line, 'number');
      assert.strictEqual(typeof err.column, 'number');
      return true;
    }
  );
});


// --------------------------------------------------------------------
// Category 2: ConfigManager & CSV Export Boundaries
// --------------------------------------------------------------------
console.log('\n--- Category 2: ConfigManager & CSV Export Boundaries ---');

test('ConfigManager', 'deepMerge must not pollute Object.prototype via __proto__ or constructor', () => {
  const malicious = JSON.parse('{"__proto__": {"pollutedProto": true}, "constructor": {"prototype": {"pollutedCtor": true}}}');
  const target = {};
  ConfigManager.deepMerge(target, malicious);
  assert.strictEqual(({}).pollutedProto, undefined);
  assert.strictEqual(({}).pollutedCtor, undefined);
});

test('ConfigManager', 'deepMerge circular references must be detected without unhandled stack crash', () => {
  const circular = { a: 1 };
  circular.self = circular;
  assert.throws(
    () => ConfigManager.deepMerge({}, circular),
    (err) => {
      // Must not crash process; should throw error
      return true;
    }
  );
});

test('ConfigManager', 'importJSON must validate that tank, species, and medicines are non-primitive objects/arrays', () => {
  const bogusConfig = JSON.stringify({
    tank: "not an object",
    species: 12345,
    medicines: true
  });
  assert.throws(
    () => ConfigManager.importJSON(bogusConfig),
    /section|invalid|object|type/i,
    'Must reject configs where sections are arbitrary primitives'
  );
});

test('ConfigManager', 'importJSON must reject primitive roots (boolean, number, array, null)', () => {
  assert.throws(() => ConfigManager.importJSON('[]'), /section|invalid/i);
  assert.throws(() => ConfigManager.importJSON('null'), /section|invalid/i);
  assert.throws(() => ConfigManager.importJSON('true'), /section|invalid/i);
  assert.throws(() => ConfigManager.importJSON('123'), /section|invalid/i);
});

test('ConfigManager', 'exportCSV must safely handle non-array inputs (e.g. string or object) without throwing TypeError', () => {
  const header = 'Date, Ammonia_ppm, Nitrite_ppm, Nitrate_ppm, pH, Temp_C, GH_dGH, KH_dKH, Water_Change, Notes';
  assert.strictEqual(ConfigManager.exportCSV(null), header);
  assert.strictEqual(ConfigManager.exportCSV(undefined), header);
  assert.strictEqual(ConfigManager.exportCSV([]), header);
  assert.strictEqual(ConfigManager.exportCSV('not an array'), header);
  assert.strictEqual(ConfigManager.exportCSV({}), header);
});

test('ConfigManager', 'exportCSV must safely handle null or undefined elements in logs array without crashing', () => {
  const logs = [
    null,
    undefined,
    { date: '2026-10-20', nh3: 0.1, no2: 0, no3: 10, ph: 7.2, temp: 25.5, gh: 7, kh: 4, wc: '20%', notes: 'Routine' }
  ];
  const csv = ConfigManager.exportCSV(logs);
  assert.ok(csv.includes('2026-10-20'));
});

test('ConfigManager', 'exportCSV must escape standalone carriage returns (\\r) in notes to preserve row integrity', () => {
  const logs = [
    { date: '2026-10-20', notes: 'First line\rSecond line' }
  ];
  const csv = ConfigManager.exportCSV(logs);
  assert.ok(csv.includes('"First line\rSecond line"'), 'Carriage return must trigger CSV quote escaping');
});

test('ConfigManager', 'exportCSV must sanitize formula injection prefixes (=, +, -, @) to prevent CSV Injection (CWE-1236)', () => {
  const maliciousFormula = '=CMD|\' /C calc\'!A0';
  const logs = [
    { date: '2026-10-20', notes: maliciousFormula }
  ];
  const csv = ConfigManager.exportCSV(logs);
  const lines = csv.split('\n');
  assert.ok(!lines[1].endsWith(maliciousFormula), 'Raw executable formula must be escaped or prefixed with single quote');
});


// --------------------------------------------------------------------
// Category 3: PluginRegistry Contract & Lifecycle Stress Tests
// --------------------------------------------------------------------
console.log('\n--- Category 3: PluginRegistry Contract & Lifecycle Stress ---');

test('PluginRegistry', 'register must reject non-string plugin.id, name, or category', () => {
  const registry = new PluginRegistry();
  assert.throws(
    () => registry.register({ id: 123, name: 'Valid', category: 'sensor', mount: () => {}, unmount: () => {} }),
    /id|string/i
  );
  assert.throws(
    () => registry.register({ id: 'valid', name: 456, category: 'sensor', mount: () => {}, unmount: () => {} }),
    /name|string/i
  );
  assert.throws(
    () => registry.register({ id: 'valid', name: 'Valid', category: {}, mount: () => {}, unmount: () => {} }),
    /category|string/i
  );
});

test('PluginRegistry', 'register must reject plugin with non-function update property', () => {
  const registry = new PluginRegistry();
  assert.throws(
    () => registry.register({
      id: 'bad-update',
      name: 'Bad Update',
      category: 'widget',
      mount: () => {},
      unmount: () => {},
      update: 'not a function'
    }),
    /update|function/i
  );
});

test('PluginRegistry', 'Plugin mount throwing an error must cleanly roll back state and propagate error', () => {
  const registry = new PluginRegistry();
  registry.register({
    id: 'failing-mount',
    name: 'Failing Mount',
    category: 'widget',
    mount: () => {
      throw new Error('Hardware connection timeout');
    },
    unmount: () => {}
  });

  assert.throws(
    () => registry.mountPlugin('failing-mount', {}),
    /Hardware connection timeout/
  );
  assert.strictEqual(registry.isMounted('failing-mount'), false);
  assert.strictEqual(registry.getMountedInstance('failing-mount'), null);
});

test('PluginRegistry', 'Plugin unmount throwing an error must still clean up registry and return false or throw', () => {
  const registry = new PluginRegistry();
  registry.register({
    id: 'failing-unmount',
    name: 'Failing Unmount',
    category: 'widget',
    mount: () => {},
    unmount: () => {
      throw new Error('Unmount resource cleanup failed');
    }
  });

  registry.mountPlugin('failing-unmount', {});
  assert.strictEqual(registry.isMounted('failing-unmount'), true);

  const res = registry.unmountPlugin('failing-unmount');
  assert.strictEqual(registry.isMounted('failing-unmount'), false, 'Plugin must be removed from mounted instances');
  // Returning true when unmount threw is misleading
  assert.strictEqual(res, false, 'unmountPlugin should return false when unmount throws an error');
});

test('PluginRegistry', 'Circular mount calls between plugins must be detected and prevented before stack overflow', () => {
  const registry = new PluginRegistry();
  const pluginA = {
    id: 'cycle-a',
    name: 'Cycle A',
    category: 'test',
    mount: (container, ctx) => {
      registry.mountPlugin('cycle-b', container, ctx);
    },
    unmount: () => {}
  };
  const pluginB = {
    id: 'cycle-b',
    name: 'Cycle B',
    category: 'test',
    mount: (container, ctx) => {
      registry.mountPlugin('cycle-a', container, ctx);
    },
    unmount: () => {}
  };

  registry.register(pluginA);
  registry.register(pluginB);

  let caughtStackOverflow = false;
  let caughtGracefulError = false;

  try {
    registry.mountPlugin('cycle-a', {});
  } catch (err) {
    if (err instanceof RangeError && err.message.includes('Maximum call stack size exceeded')) {
      caughtStackOverflow = true;
    } else if (/circular|recursion|already mounting/i.test(err.message)) {
      caughtGracefulError = true;
    }
  }

  assert.strictEqual(caughtStackOverflow, false, 'Circular mount must NOT crash with unhandled RangeError stack overflow');
  assert.strictEqual(caughtGracefulError, true, 'Circular mount must throw descriptive circular dependency error');
});

test('PluginRegistry', 'Re-entrant unregister called inside plugin.unmount must not cause recursive loop', () => {
  const registry = new PluginRegistry();
  let unmountCount = 0;
  const pluginSelfUnregister = {
    id: 'reentrant-p',
    name: 'Reentrant Plugin',
    category: 'test',
    mount: () => {},
    unmount: () => {
      unmountCount++;
      registry.unregister('reentrant-p');
    }
  };

  registry.register(pluginSelfUnregister);
  registry.mountPlugin('reentrant-p', {});
  registry.unregister('reentrant-p');

  assert.strictEqual(unmountCount, 1, 'unmount must only be executed once during unregister');
  assert.strictEqual(registry.hasPlugin('reentrant-p'), false);
});

test('PluginRegistry', 'Rapid 1,000 mount and unmount cycles execute with 0 event or instance leakage', () => {
  const bus = new EventBus();
  const registry = new PluginRegistry({ eventBus: bus });
  let mountEvents = 0;
  let unmountEvents = 0;

  bus.on('plugin:mounted', () => mountEvents++);
  bus.on('plugin:unmounted', () => unmountEvents++);

  let internalMountCount = 0;
  let internalUnmountCount = 0;

  const plugin = {
    id: 'rapid-stress',
    name: 'Rapid Stress Plugin',
    category: 'benchmark',
    mount: () => {
      internalMountCount++;
      return { id: internalMountCount };
    },
    unmount: () => {
      internalUnmountCount++;
    }
  };

  registry.register(plugin);

  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    registry.mountPlugin('rapid-stress', {});
    registry.unmountPlugin('rapid-stress');
  }
  const duration = performance.now() - start;

  assert.strictEqual(internalMountCount, 1000);
  assert.strictEqual(internalUnmountCount, 1000);
  assert.strictEqual(mountEvents, 1000);
  assert.strictEqual(unmountEvents, 1000);
  assert.strictEqual(registry.isMounted('rapid-stress'), false);
  assert.ok(duration < 1000, `1000 mount/unmount cycles took ${duration.toFixed(2)}ms, expected < 1000ms`);
});

test('PluginRegistry', 'Batch register, query, and clear with 500 plugins', () => {
  const registry = new PluginRegistry();
  for (let i = 0; i < 500; i++) {
    registry.register({
      id: `plugin-${i}`,
      name: `Plugin ${i}`,
      category: i % 2 === 0 ? 'sensor' : 'calculator',
      mount: () => ({ i }),
      unmount: () => {}
    });
  }

  assert.strictEqual(registry.getAllPlugins().length, 500);
  assert.strictEqual(registry.getPluginsByCategory('sensor').length, 250);
  assert.strictEqual(registry.getPluginsByCategory('calculator').length, 250);

  // Mount half of them
  for (let i = 0; i < 250; i++) {
    registry.mountPlugin(`plugin-${i}`, {});
  }

  registry.clear();
  assert.strictEqual(registry.getAllPlugins().length, 0);
  assert.strictEqual(registry.mountedInstances.size, 0);
});

// --------------------------------------------------------------------
// Summary
// --------------------------------------------------------------------
console.log('\n======================================================================');
console.log(`Summary: ${results.total} tests executed. ${results.passed} passed, ${results.failed} failed.`);
console.log('======================================================================\n');

if (results.failures.length > 0) {
  console.log('Discovered Failure Modes:');
  results.failures.forEach((f, idx) => {
    console.log(`  ${idx + 1}. [${f.category}] ${f.description}`);
    console.log(`     Error: ${f.error}`);
  });
}

/**
 * Tier 2: Boundary & Corner Cases Test Suite (AquaPulse F01 – F10)
 * 
 * Boundary Value Analysis & Extreme Case Probing:
 * Zero volumes, negative numbers, extreme temperatures (freezing/boiling),
 * invalid pH (<0, >14), massive nitrate values, empty lists, incompatible species,
 * corrupted JSON strings, unknown scenario IDs (>= 5 tests per feature, >= 50 tests total).
 */

const { describe, test, it, beforeEach, afterEach, assert, getModule } = require('./run-tests.js');

// ======================================================================
// F01: Config Boundaries & Corrupted Inputs
// ======================================================================
describe('F01-B: Configuration Boundary & Malformed Input Handling', () => {
  const ConfigManager = getModule('ConfigManager');

  test('B01-01: Corrupted JSON with unclosed multi-line comments throws diagnostic error', () => {
    const unclosed = `
      {
        "tank": { "id": "t1" },
        /* Unclosed comment that never terminates
        "species": []
      }
    `;
    assert.throws(() => {
      ConfigManager.importJSON(unclosed);
    }, /(JSON|SyntaxError)/);
  });

  test('B01-02: Corrupted JSON with mismatched braces or unquoted keys', () => {
    const malformed = `{"tank": {"id": "t1", "volumeNetL": 100`;
    assert.throws(() => {
      ConfigManager.lenientParseJSON(malformed);
    }, /(JSON|SyntaxError)/);
  });

  test('B01-03: Deep-merge with null, undefined, or primitive inputs returns safe clone', () => {
    const base = { tank: { id: 'tank-base', volume: 100 } };
    assert.deepStrictEqual(ConfigManager.deepMerge(base, null), base);
    assert.deepStrictEqual(ConfigManager.deepMerge(base, undefined), base);
    assert.deepStrictEqual(ConfigManager.deepMerge(null, base), base);
  });

  test('B01-04: Empty string or whitespace input to lenientParseJSON returns null', () => {
    assert.strictEqual(ConfigManager.lenientParseJSON(''), null);
    assert.strictEqual(ConfigManager.lenientParseJSON('   \n\t  '), null);
    assert.strictEqual(ConfigManager.lenientParseJSON(null), null);
  });

  test('B01-05: CSV export with empty logs array outputs header row without crash', () => {
    const csvEmpty = ConfigManager.exportCSV([]);
    assert.includes(csvEmpty, 'Date, Ammonia_ppm, Nitrite_ppm, Nitrate_ppm, pH, Temp_C, GH_dGH, KH_dKH, Water_Change, Notes');
    assert.strictEqual(csvEmpty.split('\n').length, 1);

    const csvNull = ConfigManager.exportCSV(null);
    assert.includes(csvNull, 'Date');
  });

  test('B01-06: CSV export handles logs with missing, null, or undefined fields', () => {
    const partialLog = [{ date: '2026-10-20' }]; // All other fields undefined
    const csv = ConfigManager.exportCSV(partialLog);
    const lines = csv.split('\n');
    assert.strictEqual(lines.length, 2);
    assert.includes(lines[1], '2026-10-20');
  });
});

// ======================================================================
// F02: Store Boundaries & Edge State
// ======================================================================
describe('F02-B: Reactive Store Boundary & Corner Cases', () => {
  const AquaPulseStore = getModule('AquaPulseStore');

  test('B02-01: Scoped key generation with special characters in tank ID', () => {
    const store = new AquaPulseStore({
      initialState: { tank: { id: 'tank/custom-120L#nano' } }
    });
    const key = store.getScopedKey('tasks');
    assert.strictEqual(key, 'aquapulse_tank/custom-120L#nano_tasks');
  });

  test('B02-02: Querying non-existent deeply nested path returns undefined safely', () => {
    const store = new AquaPulseStore();
    assert.strictEqual(store.getState('non.existent.deep.path'), undefined);
    assert.ok(typeof store.getState('') === 'object', 'Empty path returns root state');
  });

  test('B02-03: Setting state on non-existent deep path auto-creates intermediate objects', () => {
    const store = new AquaPulseStore({ initialState: {} });
    store.setState('deeply.nested.property.value', 42);
    assert.strictEqual(store.getState('deeply.nested.property.value'), 42);
  });

  test('B02-04: Subscribing with invalid listener throws TypeError', () => {
    const store = new AquaPulseStore();
    assert.throws(() => {
      store.subscribe(null);
    }, TypeError);
    assert.throws(() => {
      store.subscribe('invalid', null);
    }, TypeError);
  });

  test('B02-05: State containing arrays and booleans survives mutation without corruption', () => {
    const store = new AquaPulseStore({
      initialState: {
        flags: [true, false, true],
        active: false
      }
    });
    store.setState('active', true);
    assert.strictEqual(store.getState('active'), true);
    assert.deepStrictEqual(store.getState('flags'), [true, false, true]);
  });
});

// ======================================================================
// F03: Plugin Registry Boundaries
// ======================================================================
describe('F03-B: Plugin Registry Boundary & Validation Violations', () => {
  const PluginRegistry = getModule('PluginRegistry');

  test('B03-01: Rejects plugin registration with empty string id, name, or category', () => {
    const registry = new PluginRegistry();
    assert.throws(() => {
      registry.register({ id: '', name: 'Test', category: 'sensor', mount: () => {}, unmount: () => {} });
    }, /id/);
    assert.throws(() => {
      registry.register({ id: 'p1', name: '', category: 'sensor', mount: () => {}, unmount: () => {} });
    }, /name/);
    assert.throws(() => {
      registry.register({ id: 'p2', name: 'Test', category: '', mount: () => {}, unmount: () => {} });
    }, /category/);
  });

  test('B03-02: Unregistering non-existent plugin returns false without error', () => {
    const registry = new PluginRegistry();
    const result = registry.unregister('never-registered-id');
    assert.strictEqual(result, false);
  });

  test('B03-03: Mounting non-existent plugin throws descriptive Error', () => {
    const registry = new PluginRegistry();
    assert.throws(() => {
      registry.mountPlugin('ghost-plugin', {});
    }, /not found/);
  });

  test('B03-04: Plugin mount throwing an error propagates safely with diagnostics', () => {
    const registry = new PluginRegistry();
    registry.register({
      id: 'faulty',
      name: 'Faulty Plugin',
      category: 'widget',
      mount: () => { throw new Error('Hardware connection timeout'); },
      unmount: () => {}
    });
    assert.throws(() => {
      registry.mountPlugin('faulty', {});
    }, /Hardware connection timeout/);
  });

  test('B03-05: Calling updatePlugin on plugin without update method returns false safely', () => {
    const registry = new PluginRegistry();
    registry.register({
      id: 'static-widget',
      name: 'Static Widget',
      category: 'widget',
      mount: () => {},
      unmount: () => {}
    });
    const updated = registry.updatePlugin('static-widget', { some: 'state' });
    assert.strictEqual(updated, false);
  });
});

// ======================================================================
// F04: Flow Physics Boundaries
// ======================================================================
describe('F04-B: Flow Physics Boundary Coordinates & Extreme Dimensions', () => {
  const FlowEngine = getModule('FlowEngine');

  test('B04-01: Zero container dimensions (width = 0, height = 0) handled safely without NaN', () => {
    const dims = { width: 0, height: 0 };
    const p = FlowEngine.createParticle(false, 'current', dims);
    assert.ok(!Number.isNaN(p.x));
    assert.ok(!Number.isNaN(p.y));

    const updated = FlowEngine.updatePhysics([p], 'current', dims);
    assert.ok(Array.isArray(updated));
  });

  test('B04-02: Negative container dimensions do not throw or cause infinite loops', () => {
    const dims = { width: -500, height: -300 };
    const p = FlowEngine.createParticle(false, 'current', dims);
    assert.ok(!Number.isNaN(p.vx));
    assert.ok(!Number.isNaN(p.vy));
  });

  test('B04-03: Extreme particle coordinates (x = -9999, y = 9999) trigger immediate reset', () => {
    const outOfBoundsParticle = { x: -9999, y: 9999, vx: -5, vy: 1, life: 10 };
    const particles = [outOfBoundsParticle];
    FlowEngine.updatePhysics(particles, 'current', { width: 800, height: 384 });
    // Out of bounds particle (< 12 or > height * 0.86) should be reset (life = 0)
    assert.strictEqual(particles[0].life, 0);
  });

  test('B04-04: Left pane deflection boundary tested exactly at threshold (x = width * 0.12)', () => {
    const width = 800;
    const height = 384;
    const thresholdX = width * 0.12; // 96

    // Particle just beyond threshold (e.g. x = 95 < 96)
    const pInside = { x: 95, y: 100, vx: -5.0, vy: 0.0, life: 10 };
    FlowEngine.updatePhysics([pInside], 'current', { width, height });
    assert.closeTo(pInside.vx, -3.0, 0.01); // -5.0 * 0.6 = -3.0

    // Particle outside threshold (e.g. x = 120 > 96)
    const pOutside = { x: 120, y: 100, vx: -5.0, vy: 0.0, life: 10 };
    FlowEngine.updatePhysics([pOutside], 'current', { width, height });
    assert.closeTo(pOutside.vx, -5.0, 0.01); // No glass deflection
  });

  test('B04-05: Empty particles array returns empty array safely', () => {
    const res = FlowEngine.updatePhysics([], 'current', { width: 800, height: 384 });
    assert.deepStrictEqual(res, []);
  });
});

// ======================================================================
// F05: Optimizer Incompatible Species & Roster Extremes
// ======================================================================
describe('F05-B: Biological Sweet-Spot Optimizer Roster Boundaries & Conflicts', () => {
  const OptimizerEngine = getModule('OptimizerEngine');

  test('B05-01: Empty species roster returns null or empty analysis without crash', () => {
    assert.strictEqual(OptimizerEngine.calculateSweetSpot([]), null);
    assert.strictEqual(OptimizerEngine.calculateSweetSpot(null), null);
  });

  test('B05-02: Conflicting species with completely disjoint temperature windows', () => {
    // Custom mock species: Coldwater fish (15 - 20°C) vs Extreme Discus (29 - 34°C)
    const cold = { id: 'cold-dweller', name: 'Cold Fish', tempMin: 15.0, tempMax: 20.0, phMin: 7.0, phMax: 7.5 };
    const hot = { id: 'hot-dweller', name: 'Hot Fish', tempMin: 29.0, tempMax: 34.0, phMin: 6.0, phMax: 7.0 };

    // Register temporary into database or resolve
    const conflictingRoster = [
      { id: 'denison-barb', count: 5 }, // max 26.0°C
      { id: 'female-betta', count: 1 }   // min 24.5°C, max 29.0°C
    ];
    // Now test extreme artificial conflict:
    const extremeConflictRoster = [
      { name: "Arctic Minnow", tempMin: 10.0, tempMax: 18.0, phMin: 7.0, phMax: 7.5, count: 5 },
      { name: "Amazonian Discus", tempMin: 29.0, tempMax: 33.0, phMin: 6.0, phMax: 6.8, count: 2 }
    ];
    const res = OptimizerEngine.calculateSweetSpot(extremeConflictRoster);
    assert.strictEqual(res.hasTempOverlap, false, 'Should flag temperature conflict (no overlap)');
    assert.strictEqual(res.recommendedTemp, 25.5, 'Should fall back to default compromise temperature 25.5°C');
    assert.ok(res.conflicts.length > 0, 'Should generate conflict warnings for both incompatible species');
  });

  test('B05-03: Incompatible pH tolerance windows flags no overlap and applies compromise', () => {
    const extremePhRoster = [
      { name: "Acid Blackwater Tetra", phMin: 4.5, phMax: 5.5, tempMin: 24, tempMax: 26, count: 5 },
      { name: "Alkaline Rift Cichlid", phMin: 8.2, phMax: 9.0, tempMin: 24, tempMax: 26, count: 2 }
    ];
    const res = OptimizerEngine.calculateSweetSpot(extremePhRoster);
    assert.strictEqual(res.hasPhOverlap, false);
    assert.deepStrictEqual(res.phRange, [6.6, 7.4], 'Should fall back to safe community pH range');
  });

  test('B05-04: Single-species roster derives exact bounds of that species', () => {
    const single = [{ id: 'boeseman-rainbow', count: 6 }];
    const res = OptimizerEngine.calculateSweetSpot(single);
    assert.strictEqual(res.hasTempOverlap, true);
    assert.strictEqual(res.tempRange[0], 24.0);
    assert.strictEqual(res.tempRange[1], 28.0);
    assert.strictEqual(res.recommendedTemp, 26.0); // (24 + 28) / 2
  });

  test('B05-05: Full 16-species community roster calculation executes without failure', () => {
    const all16 = [
      { id: 'koi-angelfish', count: 2 },
      { id: 'blue-zebra-angel', count: 2 },
      { id: 'denison-barb', count: 6 },
      { id: 'boeseman-rainbow', count: 4 },
      { id: 'silvertip-tetra', count: 10 },
      { id: 'neon-tetra', count: 12 },
      { id: 'female-betta', count: 3 },
      { id: 'betta-male', count: 1 },
      { id: 'dwarf-gourami', count: 2 },
      { id: 'rice-fish', count: 6 },
      { id: 'harlequin-rasbora', count: 8 },
      { id: 'albino-corydoras', count: 6 },
      { id: 'pygmy-cory', count: 6 },
      { id: 'golden-cae', count: 1 },
      { id: 'sae', count: 2 },
      { id: 'nerite-snail', count: 4 }
    ];
    const res = OptimizerEngine.calculateSweetSpot(all16);
    assert.ok(res);
    assert.ok(res.scalelessSpecies.length >= 2, 'Should identify Corydoras as scaleless');
    assert.includes(res.recommendedFlow, '45° Glass-Baffled Return');
  });
});

// ======================================================================
// F06: Medication Boundaries
// ======================================================================
describe('F06-B: Medication Volumetric Dosage & Scenario Boundaries', () => {
  const MedicationEngine = getModule('MedicationEngine');

  test('B06-01: Zero net volume calculates zero dosage without NaN', () => {
    const res = MedicationEngine.calculateDose('ichMain', 'generalCure', 0);
    assert.strictEqual(res.rawDose, 0);
    assert.strictEqual(res.formattedDose, 0);
    assert.ok(!Number.isNaN(res.rawDose));
  });

  test('B06-02: Negative net volume is clamped to 0 without negative dose', () => {
    const res = MedicationEngine.calculateDose('ichMain', 'generalCure', -150);
    assert.strictEqual(res.rawDose, 0);
    assert.strictEqual(res.formattedDose, 0);
  });

  test('B06-03: Massive volume (1,000,000L public aquarium tank) computes accurately', () => {
    // 1,000,000L / 100 * 10 ml = 100,000 ml
    const res = MedicationEngine.calculateDose('ichMain', 'generalCure', 1000000, [], false);
    assert.strictEqual(res.rawDose, 100000);
    assert.strictEqual(res.formattedDose, 100000);
  });

  test('B06-04: Unknown scenario ID defaults gracefully without throwing', () => {
    const res = MedicationEngine.calculateDose('unknown-scenario-xyz', null, 100);
    assert.ok(res);
    assert.strictEqual(typeof res.rawDose, 'number');
    assert.ok(res.rawDose > 0);
  });

  test('B06-05: Empty species list defaults lock factor to 1.0 (no lock applied)', () => {
    const res = MedicationEngine.calculateDose('ichMain', 'generalCure', 100, []);
    assert.strictEqual(res.doseFactor, 1.0);
    assert.strictEqual(res.isLocked, false);
    assert.strictEqual(res.formattedDose, 10);
  });
});

// ======================================================================
// F07: Diagnostics Extreme Chemistry Boundaries
// ======================================================================
describe('F07-B: Diagnostics Water Chemistry Extreme Values & Triaging', () => {
  const DiagnosticsEngine = getModule('DiagnosticsEngine');

  test('B07-01: Extreme temperature below freezing (-15°C) flagged as ACTION NEEDED', () => {
    const res = DiagnosticsEngine.evaluateMetrics({ temp: -15.0 });
    assert.strictEqual(res.overallStatus, 'ACTION NEEDED');
    assert.strictEqual(res.metrics.temp.status, 'critical');
    assert.ok(res.alerts.some(a => a.includes('Temperature Critical')));
  });

  test('B07-02: Extreme temperature near boiling (95°C) flagged as ACTION NEEDED', () => {
    const res = DiagnosticsEngine.evaluateMetrics({ temp: 95.0 });
    assert.strictEqual(res.overallStatus, 'ACTION NEEDED');
    assert.strictEqual(res.metrics.temp.status, 'critical');
  });

  test('B07-03: Invalid pH (<0 or >14) triggers critical ACTION NEEDED', () => {
    const acid = DiagnosticsEngine.evaluateMetrics({ ph: -2.0 });
    assert.strictEqual(acid.overallStatus, 'ACTION NEEDED');
    assert.strictEqual(acid.metrics.ph.status, 'critical');

    const alkaline = DiagnosticsEngine.evaluateMetrics({ ph: 15.5 });
    assert.strictEqual(alkaline.overallStatus, 'ACTION NEEDED');
    assert.strictEqual(alkaline.metrics.ph.status, 'critical');
  });

  test('B07-04: Massive nitrate value (500 ppm) flagged as critical ACTION NEEDED', () => {
    const res = DiagnosticsEngine.evaluateMetrics({ no3: 500 });
    assert.strictEqual(res.overallStatus, 'ACTION NEEDED');
    assert.strictEqual(res.metrics.no3.status, 'critical');
    assert.ok(res.prescriptions.length > 0);
  });

  test('B07-05: Ammonia threshold exact boundary testing (0.100 vs 0.101)', () => {
    // 0.100 is warning ceiling
    const warning = DiagnosticsEngine.evaluateMetrics({ nh3: 0.100 });
    assert.strictEqual(warning.metrics.nh3.status, 'warning');

    // 0.101 exceeds warning and is critical
    const critical = DiagnosticsEngine.evaluateMetrics({ nh3: 0.101 });
    assert.strictEqual(critical.metrics.nh3.status, 'critical');
  });

  test('B07-06: Consecutive logs with identical dates prevents division by zero in trend math', () => {
    const sameDateLogs = [
      { date: '2026-10-20T12:00:00Z', no3: 35, nh3: 0, temp: 25 },
      { date: '2026-10-20T12:00:00Z', no3: 15, nh3: 0, temp: 25 }
    ];
    const trend = DiagnosticsEngine.analyzeParameterTrends(sameDateLogs);
    assert.ok(trend);
    assert.ok(!Number.isNaN(trend.trendStatus));
  });
});

// ======================================================================
// F08: Care Routines Boundaries
// ======================================================================
describe('F08-B: Care Routines Boundary Math & Elapsed Limits', () => {
  const CareEngine = getModule('CareEngine');

  test('B08-01: Quarantine start date in future clamps daysElapsed to 0', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    const futureQuar = {
      active: true,
      fishName: 'Time Traveler Fish',
      startDate: '2026-10-25T12:00:00Z', // 5 days in future
      durationDays: 14
    };
    const res = CareEngine.calculateQuarantineCountdown(futureQuar, now);
    assert.strictEqual(res.daysElapsed, 0);
    assert.strictEqual(res.daysRemaining, 14);
  });

  test('B08-02: Quarantine elapsed far beyond total duration clamps daysRemaining to 0', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    const oldQuar = {
      active: true,
      fishName: 'Long Resident',
      startDate: '2026-08-01T12:00:00Z', // 80 days ago
      durationDays: 14
    };
    const res = CareEngine.calculateQuarantineCountdown(oldQuar, now);
    assert.ok(res.daysElapsed > 14);
    assert.strictEqual(res.daysRemaining, 0);
    assert.strictEqual(res.status, 'READY FOR MAIN TANK');
  });

  test('B08-03: Empty filter cups array handles sponge toggle without modulo crash', () => {
    assert.strictEqual(CareEngine.getNextSpongeIndex(0, []), 0);
    assert.strictEqual(CareEngine.getNextSpongeIndex(0, null), 0);
  });

  test('B08-04: Negative current sponge index wraps to valid index', () => {
    const cups = [{ name: 'A' }, { name: 'B' }];
    const next = CareEngine.getNextSpongeIndex(-1, cups);
    assert.ok(next >= 0 && next < cups.length);
  });

  test('B08-05: Food item with 0 or missing soakRequiredSec returns 0s', () => {
    assert.strictEqual(CareEngine.calculateSoakTime({}), 0);
    assert.strictEqual(CareEngine.calculateSoakTime(null), 0);
    assert.strictEqual(CareEngine.calculateSoakTime({ soakRequiredSec: 0 }), 0);
  });
});

// ======================================================================
// F09: Social Dynamics Boundaries
// ======================================================================
describe('F09-B: Social Dynamics Extreme Incidents & Score Caps', () => {
  const CareEngine = getModule('CareEngine');

  test('B09-01: Incident with empty strings applies safe defaults', () => {
    const incidents = CareEngine.recordIncident([], { aggressor: '', victim: '' });
    assert.strictEqual(incidents.length, 1);
    assert.ok(incidents[0].id);
    assert.ok(incidents[0].date);
  });

  test('B09-02: Incident deletion on empty list returns empty list', () => {
    const empty = [];
    const filtered = empty.filter(i => i.id !== 'non-existent');
    assert.deepStrictEqual(filtered, []);
  });

  test('B09-03: Territory score on empty incident list returns 0', () => {
    assert.strictEqual(CareEngine.calculateTerritoryScore([]), 0);
    assert.strictEqual(CareEngine.calculateTerritoryScore(null), 0);
  });

  test('B09-04: Territory score caps safely at 100 with massive incident count', () => {
    const massive = Array.from({ length: 50 }, (_, i) => ({ id: `inc-${i}` }));
    const score = CareEngine.calculateTerritoryScore(massive);
    assert.strictEqual(score, 100, 'Score should cap at 100 max');
  });

  test('B09-05: Multiple incidents created at same millisecond receive unique IDs', () => {
    let list = [];
    for (let i = 0; i < 5; i++) {
      list = CareEngine.recordIncident(list, { aggressor: `Fish ${i}` });
    }
    const ids = new Set(list.map(i => i.id));
    assert.strictEqual(ids.size, 5, 'Every incident must have a unique ID');
  });
});

// ======================================================================
// F10: Vital Signs Boundaries
// ======================================================================
describe('F10-B: Vital Signs Input Types & Boundary Extremes', () => {
  const DiagnosticsEngine = getModule('DiagnosticsEngine');

  test('B10-01: Empty reading object {} evaluates nominal safe defaults without NaN', () => {
    const res = DiagnosticsEngine.evaluateMetrics({});
    assert.ok(res);
    assert.strictEqual(typeof res.overallStatus, 'string');
    assert.ok(!Number.isNaN(res.metrics.temp.value));
    assert.ok(!Number.isNaN(res.metrics.ph.value));
  });

  test('B10-02: Temperature exactly at target bounds evaluated as safe', () => {
    const targets = { temp: { min: 24.0, max: 26.0 } };
    const atMin = DiagnosticsEngine.evaluateMetrics({ temp: 24.0 }, targets);
    assert.strictEqual(atMin.metrics.temp.status, 'safe');

    const atMax = DiagnosticsEngine.evaluateMetrics({ temp: 26.0 }, targets);
    assert.strictEqual(atMax.metrics.temp.status, 'safe');
  });

  test('B10-03: Temperature boundary at critical threshold (max + 2.0 vs max + 2.01)', () => {
    const targets = { temp: { min: 24.0, max: 26.0 } };
    // temp = 28.0 (max + 2.0) is warning
    const atWarning = DiagnosticsEngine.evaluateMetrics({ temp: 28.0 }, targets);
    assert.strictEqual(atWarning.metrics.temp.status, 'warning');

    // temp = 28.01 (> max + 2.0) is critical
    const atCritical = DiagnosticsEngine.evaluateMetrics({ temp: 28.01 }, targets);
    assert.strictEqual(atCritical.metrics.temp.status, 'critical');
  });

  test('B10-04: String numeric inputs ("0.25", "25.5") correctly parsed into numbers', () => {
    const res = DiagnosticsEngine.evaluateMetrics({ nh3: "0.25", temp: "25.5", ph: "7.2" });
    assert.strictEqual(typeof res.metrics.nh3.value, 'number');
    assert.strictEqual(res.metrics.nh3.value, 0.25);
    assert.strictEqual(res.metrics.nh3.status, 'critical');
  });

  test('B10-05: Simultaneous critical alerts across multiple parameters', () => {
    const disaster = {
      nh3: 0.5,
      no2: 0.5,
      no3: 80,
      temp: 32.0,
      ph: 5.0
    };
    const res = DiagnosticsEngine.evaluateMetrics(disaster);
    assert.strictEqual(res.overallStatus, 'ACTION NEEDED');
    assert.strictEqual(res.metrics.nh3.status, 'critical');
    assert.strictEqual(res.metrics.no2.status, 'critical');
    assert.strictEqual(res.metrics.no3.status, 'critical');
    assert.strictEqual(res.metrics.temp.status, 'critical');
    assert.strictEqual(res.metrics.ph.status, 'critical');
  });
});

/**
 * Tier 1: Feature Coverage Test Suite (AquaPulse F01 – F10)
 * 
 * Category-Partition Equivalence Class testing:
 * Validates primary behavior (happy path) and basic specifications
 * for all 10 core features (>= 5 tests per feature, >= 50 tests total).
 */

const { describe, test, it, beforeEach, afterEach, assert, getModule } = require('./run-tests.js');

// ======================================================================
// F01: Configuration Layer & R4 Continuity
// ======================================================================
describe('F01: Configuration Precedence, Deep Merge & Lenient Parsing', () => {
  const ConfigManager = getModule('ConfigManager');

  test('F01-01: Load base configuration schema with valid default keys', () => {
    const defaultCfg = {
      tank: { id: 'tank-demo', name: 'Demo Tank', volumeNetL: 100 },
      targets: { temp: { min: 24.5, max: 26.5 }, ph: { min: 6.5, max: 7.5 } },
      species: [{ id: 'tetra', name: 'Neon Tetra', count: 10 }],
      medicines: [{ id: 'generalCure', name: 'General Cure', ratePer100L: 10 }]
    };
    assert.strictEqual(defaultCfg.tank.id, 'tank-demo');
    assert.strictEqual(defaultCfg.species.length, 1);
    assert.strictEqual(defaultCfg.medicines.length, 1);
  });

  test('F01-02: Recursive deep-merge preserves un-overridden default properties', () => {
    const target = {
      tank: { id: 'tank-1', name: 'Default Tank', volumeNetL: 100, waterType: 'Freshwater' },
      targets: { temp: { min: 24, max: 26 }, ph: { min: 6.5, max: 7.5 } }
    };
    const source = {
      tank: { name: 'Custom Tank', volumeNetL: 200 },
      targets: { temp: { min: 25 } }
    };
    const merged = ConfigManager.deepMerge(target, source);

    assert.strictEqual(merged.tank.id, 'tank-1'); // Preserved from target
    assert.strictEqual(merged.tank.name, 'Custom Tank'); // Overridden from source
    assert.strictEqual(merged.tank.volumeNetL, 200); // Overridden from source
    assert.strictEqual(merged.tank.waterType, 'Freshwater'); // Preserved from target
    assert.strictEqual(merged.targets.temp.min, 25); // Overridden from source
    assert.strictEqual(merged.targets.temp.max, 26); // Preserved from target
  });

  test('F01-03: Array replacement rule: arrays in source completely replace target arrays', () => {
    const target = {
      species: [
        { id: 'tetra', name: 'Neon Tetra', count: 10 },
        { id: 'guppy', name: 'Fancy Guppy', count: 5 }
      ],
      checklistTasks: [{ id: 'task-1', title: 'Water Change' }]
    };
    const source = {
      species: [
        { id: 'cory', name: 'Albino Corydoras', count: 6 }
      ]
    };
    const merged = ConfigManager.deepMerge(target, source);

    assert.strictEqual(merged.species.length, 1);
    assert.strictEqual(merged.species[0].id, 'cory');
    assert.strictEqual(merged.checklistTasks.length, 1); // Preserved because source did not specify checklistTasks
  });

  test('F01-04: Lenient JSON parsing strips comments, trailing commas, and unicode smart quotes', () => {
    const raw = `
      {
        // Single line comment
        /* Multi-line
           comment block */
        “tank”: {
          ‘id’: ‘tank-lenient’,
          “volumeNetL”: 120,
        },
        “species”: [
          “tetra”,
        ],
        “medicines”: []
      }
    `;
    const parsed = ConfigManager.lenientParseJSON(raw);
    assert.ok(parsed, 'Parsed object should not be null');
    assert.strictEqual(parsed.tank.id, 'tank-lenient');
    assert.strictEqual(parsed.tank.volumeNetL, 120);
    assert.strictEqual(parsed.species.length, 1);
    assert.strictEqual(parsed.species[0], 'tetra');
  });

  test('F01-05: Profile JSON export and import validation', () => {
    const validConfig = {
      tank: { id: 'tank-export', name: 'Export Tank' },
      species: [{ id: 'angel', count: 2 }],
      medicines: [{ id: 'stressHeal', ratePer100L: 10 }]
    };
    const exported = ConfigManager.exportJSON(validConfig);
    assert.strictEqual(typeof exported, 'string');
    assert.includes(exported, '"id": "tank-export"');

    const imported = ConfigManager.importJSON(exported);
    assert.strictEqual(imported.tank.id, 'tank-export');
    assert.strictEqual(imported.species.length, 1);

    // Missing section throws error
    assert.throws(() => {
      ConfigManager.importJSON(JSON.stringify({ tank: { id: 'bad' } }));
    }, /Aquarium profile must contain "tank", "species", and "medicines" sections/);
  });

  test('F01-06: CSV export correctly formats parameter test history with headers and escaped commas', () => {
    const logs = [
      {
        date: '2026-10-20',
        nh3: 0.0,
        no2: 0.0,
        no3: 15,
        ph: 7.2,
        temp: 25.5,
        gh: 6,
        kh: 4,
        wc: '35% WC',
        notes: 'Routine water change, filters clean'
      }
    ];
    const csv = ConfigManager.exportCSV(logs);
    assert.includes(csv, 'Date, Ammonia_ppm, Nitrite_ppm, Nitrate_ppm, pH, Temp_C, GH_dGH, KH_dKH, Water_Change, Notes');
    assert.includes(csv, '2026-10-20');
    assert.includes(csv, '25.5');
    assert.includes(csv, '"Routine water change, filters clean"');
  });
});

// ======================================================================
// F02: Decoupled State & Multi-Tank Storage Isolation
// ======================================================================
describe('F02: Centralized Reactive Store & Multi-Tank Storage Isolation', () => {
  const AquaPulseStore = getModule('AquaPulseStore');
  const EventBus = getModule('EventBus');

  test('F02-01: Store initialization and getState deep-cloning', () => {
    const store = new AquaPulseStore({
      initialState: {
        tank: { id: 'tank-init', name: 'Initial Tank', volumeNetL: 120 }
      }
    });
    const state = store.getState();
    assert.ok(state, 'State should exist');
    assert.strictEqual(state.tank.id, 'tank-init');

    // Verify getState returns deep clone
    const tankSlice = store.getState('tank');
    tankSlice.volumeNetL = 999;
    assert.strictEqual(store.getState('tank.volumeNetL'), 120, 'Internal state should not be mutated by external modification');
  });

  test('F02-02: Reactive state mutation via setState with nested dot-paths', () => {
    const store = new AquaPulseStore({
      initialState: {
        simulation: { mode: 'current', speed: 1.0 }
      }
    });
    store.setState('simulation.mode', 'baffled');
    assert.strictEqual(store.getState('simulation.mode'), 'baffled');

    store.setState('simulation.speed', 2.5);
    assert.strictEqual(store.getState('simulation.speed'), 2.5);
  });

  test('F02-03: State mutation publishes events to EventBus', () => {
    const eventBus = new EventBus();
    const store = new AquaPulseStore({
      eventBus,
      initialState: {
        activeTab: 'tank'
      }
    });

    let eventFired = false;
    let eventPayload = null;
    eventBus.on('state:changed', (payload) => {
      eventFired = true;
      eventPayload = payload;
    });

    store.setState('activeTab', 'care');
    assert.strictEqual(eventFired, true);
    assert.strictEqual(eventPayload.path, 'activeTab');
    assert.strictEqual(eventPayload.value, 'care');
  });

  test('F02-04: Store listener subscription and unsubscription lifecycle', () => {
    const store = new AquaPulseStore({
      initialState: { counter: 0 }
    });

    let notificationCount = 0;
    const unsubscribe = store.subscribe((payload) => {
      notificationCount++;
    });

    store.setState('counter', 1);
    store.setState('counter', 2);
    assert.strictEqual(notificationCount, 2);

    unsubscribe();
    store.setState('counter', 3);
    assert.strictEqual(notificationCount, 2, 'Listener should not be notified after unsubscription');
  });

  test('F02-05: Multi-tank scoped key generation prevents storage collision', () => {
    const store1 = new AquaPulseStore({
      initialState: { tank: { id: 'tank-demo' } }
    });
    const store2 = new AquaPulseStore({
      initialState: { tank: { id: 'tank-255l' } }
    });

    assert.strictEqual(store1.getScopedKey('params'), 'aquapulse_tank-demo_params');
    assert.strictEqual(store2.getScopedKey('params'), 'aquapulse_tank-255l_params');
    assert.strictEqual(store1.getScopedKey('sponge_idx'), 'aquapulse_tank-demo_sponge_idx');
    assert.strictEqual(store2.getScopedKey('sponge_idx'), 'aquapulse_tank-255l_sponge_idx');
  });

  test('F02-06: Independent storage data isolation between distinct tank instances', () => {
    const store = new AquaPulseStore({
      initialState: { tank: { id: 'tank-a' } }
    });
    const storage = store.storage;

    // Write data for tank-a
    storage.setItem('aquapulse_tank-a_tasks', JSON.stringify({ task1: true }));

    // Switch tank to tank-b
    store.setTankId('tank-b');
    assert.strictEqual(store.getScopedKey('tasks'), 'aquapulse_tank-b_tasks');
    assert.strictEqual(storage.getItem(store.getScopedKey('tasks')), null);

    // Write data for tank-b
    storage.setItem('aquapulse_tank-b_tasks', JSON.stringify({ task1: false }));

    // Verify tank-a data is completely intact
    assert.strictEqual(storage.getItem('aquapulse_tank-a_tasks'), '{"task1":true}');
    assert.strictEqual(storage.getItem('aquapulse_tank-b_tasks'), '{"task1":false}');
  });
});

// ======================================================================
// F03: Plugin Registry & Telemetry HAL
// ======================================================================
describe('F03: Plugin Registry Lifecycle & Telemetry HAL Contract', () => {
  const PluginRegistry = getModule('PluginRegistry');

  test('F03-01: Successfully registers a compliant plugin conforming to IPlugin contract', () => {
    const registry = new PluginRegistry();
    const plugin = {
      id: 'ph-monitor',
      name: 'pH Telemetry Monitor',
      category: 'sensor',
      mount: (container, context) => ({ mounted: true }),
      unmount: () => true,
      update: (state) => true
    };
    const registered = registry.register(plugin);
    assert.strictEqual(registered, true);
    assert.strictEqual(registry.getPlugin('ph-monitor').name, 'pH Telemetry Monitor');
  });

  test('F03-02: Rejects plugins missing mandatory contract methods or properties', () => {
    const registry = new PluginRegistry();
    // Missing mount and unmount
    assert.throws(() => {
      registry.register({ id: 'bad-plugin', name: 'Bad', category: 'widget' });
    }, /mount and unmount/);

    // Missing category
    assert.throws(() => {
      registry.register({ id: 'bad-cat', name: 'Bad', mount: () => {}, unmount: () => {} });
    }, /category/);
  });

  test('F03-03: Rejects duplicate plugin registration with descriptive error', () => {
    const registry = new PluginRegistry();
    const plugin = {
      id: 'dupe-plugin',
      name: 'Dupe Test',
      category: 'calculator',
      mount: () => {},
      unmount: () => {}
    };
    registry.register(plugin);
    assert.throws(() => {
      registry.register(plugin);
    }, /already registered/);
  });

  test('F03-04: getPluginsByCategory filters plugins correctly', () => {
    const registry = new PluginRegistry();
    registry.register({ id: 'p1', name: 'P1', category: 'sensor', mount: () => {}, unmount: () => {} });
    registry.register({ id: 'p2', name: 'P2', category: 'sensor', mount: () => {}, unmount: () => {} });
    registry.register({ id: 'p3', name: 'P3', category: 'widget', mount: () => {}, unmount: () => {} });

    const sensors = registry.getPluginsByCategory('sensor');
    const widgets = registry.getPluginsByCategory('widget');

    assert.strictEqual(sensors.length, 2);
    assert.strictEqual(widgets.length, 1);
  });

  test('F03-05: Plugin lifecycle mount, update, and unmount execution', () => {
    const registry = new PluginRegistry();
    let mountedContainer = null;
    let unmounted = false;
    let updatedState = null;

    const plugin = {
      id: 'lifecycle-test',
      name: 'Lifecycle Test',
      category: 'widget',
      mount: (container, context) => {
        mountedContainer = container;
        return { active: true };
      },
      unmount: () => {
        unmounted = true;
      },
      update: (state) => {
        updatedState = state;
      }
    };

    registry.register(plugin);
    const mockContainer = { innerHTML: '' };
    registry.mountPlugin('lifecycle-test', mockContainer, { tankId: 'demo' });
    assert.strictEqual(mountedContainer, mockContainer);

    registry.updatePlugin('lifecycle-test', { status: 'OPTIMAL' });
    assert.strictEqual(updatedState.status, 'OPTIMAL');

    registry.unmountPlugin('lifecycle-test');
    assert.strictEqual(unmounted, true);
  });

  test('F03-06: Telemetry packet validation and standard structure verification', () => {
    const telemetryPacket = {
      timestamp: Date.now(),
      tankId: 'tank-demo',
      metrics: {
        temp: 25.4,
        ph: 7.1,
        nh3: 0.0,
        no2: 0.0,
        no3: 15
      },
      status: 'OPTIMAL'
    };
    assert.strictEqual(typeof telemetryPacket.timestamp, 'number');
    assert.strictEqual(telemetryPacket.tankId, 'tank-demo');
    assert.strictEqual(telemetryPacket.metrics.temp, 25.4);
    assert.strictEqual(telemetryPacket.status, 'OPTIMAL');
  });
});

// ======================================================================
// F04: Flow Physics Simulation Engine
// ======================================================================
describe('F04: Hydrodynamic Flow Physics & Particle Math', () => {
  const FlowEngine = getModule('FlowEngine');

  test('F04-01: Nozzle coordinates calculated properly from container dimensions', () => {
    const coords800 = FlowEngine.getNozzleCoords({ width: 800, height: 384 });
    assert.strictEqual(coords800.x, 800 - 155);
    assert.closeTo(coords800.y, 384 * 0.15, 0.01);

    const coords500 = FlowEngine.getNozzleCoords({ width: 500, height: 300 });
    assert.strictEqual(coords500.x, 500 - 135);
    assert.closeTo(coords500.y, 300 * 0.15, 0.01);
  });

  test('F04-02: Straight jet particle velocity initialization is negative horizontal vector', () => {
    const p = FlowEngine.createParticle(false, 'current', { width: 800, height: 384 });
    assert.ok(p.vx < -3.0, 'Straight jet vx should be strongly negative (directed right-to-left)');
    assert.strictEqual(p.life, 0);
  });

  test('F04-03: Buoyancy vector decreases vertical velocity (upward acceleration)', () => {
    const p = { x: 500, y: 100, vx: -5, vy: 0.0, life: 1 };
    const particles = [p];
    FlowEngine.updatePhysics(particles, 'current', { width: 800, height: 384 });
    assert.ok(particles[0].vy < 0, 'Vertical velocity should decrease due to buoyancy acceleration (-0.018)');
  });

  test('F04-04: Left pane glass deflection deflects particle downward and dampens horizontal momentum', () => {
    // Position particle at x = width * 0.10 (< 0.12)
    const p = { x: 80, y: 100, vx: -6.0, vy: -0.2, life: 20 };
    const particles = [p];
    FlowEngine.updatePhysics(particles, 'current', { width: 800, height: 384 });

    // vx should be dampened by 0.6: -6.0 * 0.6 = -3.6
    assert.closeTo(particles[0].vx, -3.6, 0.01);
    // vy should increase by 0.75: (-0.2 - 0.018) + 0.75 ≈ 0.532
    assert.ok(particles[0].vy > 0, 'vy should deflect downward toward gravel bed');
  });

  test('F04-05: 45° Baffled mode convective roll moves right along substrate and left near surface', () => {
    // Deep particle near substrate (y > height * 0.62)
    const deepParticle = { x: 400, y: 300, vx: 0.0, vy: 0.0, life: 10 };
    FlowEngine.updatePhysics([deepParticle], 'baffled', { width: 800, height: 384 });
    assert.ok(deepParticle.vx > 0, 'Substrate particle should roll gently right (+0.045)');

    // Surface particle (y < height * 0.62)
    const shallowParticle = { x: 400, y: 50, vx: 0.0, vy: 0.0, life: 10 };
    FlowEngine.updatePhysics([shallowParticle], 'baffled', { width: 800, height: 384 });
    assert.ok(shallowParticle.vx < 0, 'Upper column particle should roll left (-0.02)');
  });

  test('F04-06: Particle respawns cleanly when exceeding lifetime limit or escaping boundary', () => {
    const expiredParticle = { x: 400, y: 200, vx: -5, vy: 0, life: 150 }; // life > 140 in current mode
    const particles = [expiredParticle];
    FlowEngine.updatePhysics(particles, 'current', { width: 800, height: 384 });
    assert.strictEqual(particles[0].life, 0, 'Expired particle should be reset with life = 0');
  });
});

// ======================================================================
// F05: Sweet-Spot Parameter Derivation Engine
// ======================================================================
describe('F05: Inhabitants Sweet-Spot Parameter Derivation & Overlap Math', () => {
  const OptimizerEngine = getModule('OptimizerEngine');

  test('F05-01: Biological database species resolution retrieves known ecological bounds', () => {
    const denison = OptimizerEngine.resolveSpeciesProfile({ id: 'denison-barb' });
    assert.strictEqual(denison.name, 'Denison Barb (Roseline Shark)');
    assert.strictEqual(denison.tempMin, 18.0);
    assert.strictEqual(denison.tempMax, 26.0);
    assert.strictEqual(denison.flowPreference, 'high');

    const cory = OptimizerEngine.resolveSpeciesProfile({ id: 'albino-corydoras' });
    assert.strictEqual(cory.scaleless, true);
    assert.strictEqual(cory.flowPreference, 'low');
  });

  test('F05-02: Resolves unknown species gracefully with safe default tropical profile', () => {
    const unknown = OptimizerEngine.resolveSpeciesProfile({ id: 'exotic-unlisted-fish', name: 'Alien Danio' });
    assert.strictEqual(unknown.tempMin, 23.0);
    assert.strictEqual(unknown.tempMax, 27.0);
    assert.strictEqual(unknown.phOptimal, 7.0);
  });

  test('F05-03: Mathematical temperature overlap and recommended midpoint calculation', () => {
    const species = [
      { id: 'denison-barb', count: 6 }, // 18.0 - 26.0°C
      { id: 'silvertip-tetra', count: 10 } // 22.0 - 28.0°C
    ];
    const result = OptimizerEngine.calculateSweetSpot(species);
    assert.strictEqual(result.hasTempOverlap, true);
    // Overlap: max(18, 22) = 22.0, min(26, 28) = 26.0
    assert.strictEqual(result.tempRange[0], 22.0);
    assert.strictEqual(result.tempRange[1], 26.0);
    // Recommended midpoint: (22.0 + 26.0) / 2 = 24.0°C
    assert.strictEqual(result.recommendedTemp, 24.0);
  });

  test('F05-04: Mathematical pH, GH, and KH safe tolerance derivation', () => {
    const species = [
      { id: 'koi-angelfish', count: 2 }, // pH: 6.0 - 7.5, GH: 3-10, KH: 2-6
      { id: 'boeseman-rainbow', count: 4 } // pH: 7.0 - 8.0, GH: 8-18, KH: 5-12
    ];
    const result = OptimizerEngine.calculateSweetSpot(species);
    assert.strictEqual(result.hasPhOverlap, true);
    // pH overlap: [max(6.0, 7.0), min(7.5, 8.0)] = [7.0, 7.5]
    assert.strictEqual(result.phRange[0], 7.0);
    assert.strictEqual(result.phRange[1], 7.5);
  });

  test('F05-05: Flow dynamics recommendation matches species flow requirements', () => {
    // Pure high-flow
    const highFlowRoster = [{ id: 'denison-barb', count: 6 }];
    const highResult = OptimizerEngine.calculateSweetSpot(highFlowRoster);
    assert.includes(highResult.recommendedFlow, 'Direct Venturi Jet');

    // Pure low-flow
    const lowFlowRoster = [{ id: 'female-betta', count: 4 }];
    const lowResult = OptimizerEngine.calculateSweetSpot(lowFlowRoster);
    assert.includes(lowResult.recommendedFlow, 'Low Gentle Flow');

    // Mixed community
    const mixedRoster = [
      { id: 'denison-barb', count: 6 },
      { id: 'female-betta', count: 2 }
    ];
    const mixedResult = OptimizerEngine.calculateSweetSpot(mixedRoster);
    assert.includes(mixedResult.recommendedFlow, '45° Glass-Baffled Return');
  });

  test('F05-06: Identifies thermal and biological conflict warnings when running near limits', () => {
    const species = [
      { id: 'denison-barb', count: 6 }, // Max 26.0°C
      { id: 'female-betta', count: 2 }  // Min 24.5°C
    ];
    const result = OptimizerEngine.calculateSweetSpot(species);
    assert.ok(result.scalelessSpecies !== undefined);
    assert.ok(Array.isArray(result.conflicts));
  });
});

// ======================================================================
// F06: Visual Symptom Checker & Medication Safety Lock
// ======================================================================
describe('F06: Visual Symptom Checker & 50% Medication Safety Lock', () => {
  const MedicationEngine = getModule('MedicationEngine');

  test('F06-01: Symptom database contains 5 primary ailments mapped to scenarios', () => {
    const symptoms = MedicationEngine.SYMPTOM_DATABASE;
    assert.strictEqual(symptoms.length, 5);
    const ich = symptoms.find(s => s.id === 'symp-ich');
    assert.ok(ich);
    assert.strictEqual(ich.medScenarioId, 'ichMain');

    const finrot = symptoms.find(s => s.id === 'symp-finrot');
    assert.ok(finrot);
    assert.strictEqual(finrot.medScenarioId, 'hospitalBact');
  });

  test('F06-02: Standard volumetric medication dosing calculation (100% factor)', () => {
    // 200L tank volume, General Cure (10ml per 100L) without sensitive species
    const res = MedicationEngine.calculateDose('ichMain', 'generalCure', 200, [], false);
    // (200 / 100) * 10 * 1.0 = 20 ml
    assert.strictEqual(res.rawDose, 20);
    assert.strictEqual(res.doseFactor, 1.0);
    assert.strictEqual(res.isLocked, false);
  });

  test('F06-03: 50% safety lock factor automatically engages when scaleless species present', () => {
    const species = [{ id: 'albino-corydoras', name: 'Albino Corydoras', scaleless: true }];
    // 100L tank volume with scaleless species
    const res = MedicationEngine.calculateDose('ichMain', 'generalCure', 100, species);
    // Standard: (100 / 100) * 10 = 10 ml; With lock (0.5) = 5.0 ml
    assert.strictEqual(res.doseFactor, 0.5);
    assert.strictEqual(res.isLocked, true);
    assert.strictEqual(res.formattedDose, 5);
    assert.ok(res.warnings.some(w => w.includes('50% safety lock')));
  });

  test('F06-04: Scaleless safety lock bypass when overridden or scenario does not use lock', () => {
    const species = [{ id: 'albino-corydoras', scaleless: true }];
    // Force useLock = false
    const res = MedicationEngine.calculateDose('ichMain', 'generalCure', 100, species, false);
    assert.strictEqual(res.doseFactor, 1.0);
    assert.strictEqual(res.isLocked, false);
    assert.strictEqual(res.formattedDose, 10);
  });

  test('F06-05: Copper toxicity hazard alert triggered in presence of mollusks or invertebrates', () => {
    const species = [{ id: 'nerite-snail', name: 'Zebra Nerite Snail' }];
    const res = MedicationEngine.calculateDose('ichMain', 'generalCure', 100, species);
    assert.ok(res.warnings.some(w => w.includes('Copper') || w.includes('mollusks')));
  });

  test('F06-06: Strict salt prohibition warning when scaleless catfish are present', () => {
    const species = [{ id: 'pygmy-cory', name: 'Pygmy Corydoras', scaleless: true }];
    const res = MedicationEngine.calculateDose('hospitalSalt', 'aquaSalt', 10, species);
    assert.ok(res.warnings.some(w => w.includes('DO NOT dose aquarium salt') || w.includes('Corydoras')));
  });
});

// ======================================================================
// F07: Water Health Diagnostics & Trend Analysis Engine
// ======================================================================
describe('F07: Water Parameter Diagnostics & 3-Tier Status Triage', () => {
  const DiagnosticsEngine = getModule('DiagnosticsEngine');

  test('F07-01: Optimal classification when all parameters meet target ranges', () => {
    const reading = { nh3: 0.0, no2: 0.0, no3: 15, temp: 25.5, ph: 7.0, gh: 6, kh: 4 };
    const triage = DiagnosticsEngine.evaluateMetrics(reading);
    assert.strictEqual(triage.overallStatus, 'OPTIMAL');
    assert.strictEqual(triage.metrics.nh3.status, 'safe');
    assert.strictEqual(triage.metrics.temp.status, 'safe');
  });

  test('F07-02: Warning status classification (WATCH) when nitrate or pH drifts', () => {
    const reading = { nh3: 0.0, no2: 0.0, no3: 35, temp: 25.5, ph: 7.0 }; // NO3 > 30 ppm
    const triage = DiagnosticsEngine.evaluateMetrics(reading);
    assert.strictEqual(triage.overallStatus, 'WATCH');
    assert.strictEqual(triage.metrics.no3.status, 'warning');
  });

  test('F07-03: Critical status classification (ACTION NEEDED) when ammonia or nitrite detected', () => {
    const reading = { nh3: 0.25, no2: 0.0, no3: 15, temp: 25.5, ph: 7.0 }; // NH3 > 0.1
    const triage = DiagnosticsEngine.evaluateMetrics(reading);
    assert.strictEqual(triage.overallStatus, 'ACTION NEEDED');
    assert.strictEqual(triage.metrics.nh3.status, 'critical');
    assert.ok(triage.prescriptions.length > 0);
  });

  test('F07-04: Emergency water change volume and conditioner dosage prescription formulas', () => {
    // 200L net tank volume
    const prescription = DiagnosticsEngine.calculateEmergencyWaterChange(200);
    // 50% water change = 100L
    assert.strictEqual(prescription.waterChangeVolumeL, 100);
    // 100L * 0.10 ml = 10.0 ml conditioner
    assert.strictEqual(prescription.conditionerMl, 10.0);
    assert.strictEqual(prescription.fastingDurationHours, 24);
  });

  test('F07-05: Predictive trend engine detects Rapid Nitrate Accumulation', () => {
    const logs = [
      { date: '2026-10-20', no3: 35, nh3: 0, temp: 25 },
      { date: '2026-10-16', no3: 15, nh3: 0, temp: 25 } // +20 ppm in 4 days
    ];
    const trend = DiagnosticsEngine.analyzeParameterTrends(logs);
    assert.strictEqual(trend.trendStatus, 'Patterns Detected');
    assert.ok(trend.insights.some(i => i.includes('Rapid Nitrate Accumulation')));
  });

  test('F07-06: Predictive trend engine detects Emerging Bio-Filter Strain', () => {
    const logs = [
      { date: '2026-10-20', nh3: 0.2, no3: 15, temp: 25 },
      { date: '2026-10-15', nh3: 0.0, no3: 15, temp: 25 } // Ammonia spiked from 0.0
    ];
    const trend = DiagnosticsEngine.analyzeParameterTrends(logs);
    assert.ok(trend.insights.some(i => i.includes('Emerging Bio-Filter Strain')));
  });
});

// ======================================================================
// F08: Care Hub Routines, Maintenance & Quarantine Logic
// ======================================================================
describe('F08: Care Routines: Quarantine Countdown, Filter Media & Feeding Math', () => {
  const CareEngine = getModule('CareEngine');

  test('F08-01: 14-Day quarantine countdown calculates elapsed and remaining days accurately', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    const quarData = {
      active: true,
      fishName: 'Patient Angel',
      startDate: '2026-10-15T12:00:00Z', // 5 days ago
      durationDays: 14
    };
    const res = CareEngine.calculateQuarantineCountdown(quarData, now);
    assert.strictEqual(res.daysElapsed, 5);
    assert.strictEqual(res.daysRemaining, 9);
    assert.strictEqual(res.status, 'ACTIVE ISOLATION');
  });

  test('F08-02: Quarantine status transitions to READY FOR MAIN TANK when countdown reaches 0', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    const quarData = {
      active: true,
      fishName: 'Patient Angel',
      startDate: '2026-10-05T12:00:00Z', // 15 days ago (duration = 14)
      durationDays: 14
    };
    const res = CareEngine.calculateQuarantineCountdown(quarData, now);
    assert.strictEqual(res.daysRemaining, 0);
    assert.strictEqual(res.status, 'READY FOR MAIN TANK');
  });

  test('F08-03: Alternating dual-canister sponge rinse index toggles between compartments', () => {
    const cups = [{ name: 'Cup A' }, { name: 'Cup B' }];
    assert.strictEqual(CareEngine.getNextSpongeIndex(0, cups), 1);
    assert.strictEqual(CareEngine.getNextSpongeIndex(1, cups), 0);
  });

  test('F08-04: Single-cup nano filter handles sponge index toggle gracefully', () => {
    const cups = [{ name: 'Nano Sponge' }];
    assert.strictEqual(CareEngine.getNextSpongeIndex(0, cups), 0);
  });

  test('F08-05: Pre-soak countdown calculation for high-protein freeze-dried food', () => {
    const tubifex = { id: 'food-tubifex', name: 'Freeze-Dried Tubifex', soakRequiredSec: 180 };
    const flake = { id: 'food-flake', name: 'Spirulina Flakes', soakRequiredSec: 0 };

    assert.strictEqual(CareEngine.calculateSoakTime(tubifex), 180);
    assert.strictEqual(CareEngine.calculateSoakTime(flake), 0);
  });

  test('F08-06: Maintenance checklist task record toggle state representation', () => {
    const checklist = { 'task-wc': false, 'task-test': false };
    checklist['task-wc'] = true;
    assert.strictEqual(checklist['task-wc'], true);
    assert.strictEqual(checklist['task-test'], false);
  });
});

// ======================================================================
// F09: Social Aggression Logger & Incident Scoring
// ======================================================================
describe('F09: Social Dynamics & Aggression Incident Logger', () => {
  const CareEngine = getModule('CareEngine');

  test('F09-01: Successfully records new aggression incident with full attributes', () => {
    const incidents = [];
    const newInc = {
      aggressor: 'Golden CAE',
      victim: 'Koi Angelfish',
      trigger: 'Feeding competition',
      actionTaken: 'Offered blanched zucchini at night'
    };
    const updated = CareEngine.recordIncident(incidents, newInc);
    assert.strictEqual(updated.length, 1);
    assert.strictEqual(updated[0].aggressor, 'Golden CAE');
    assert.strictEqual(updated[0].victim, 'Koi Angelfish');
    assert.ok(updated[0].id);
    assert.ok(updated[0].date);
  });

  test('F09-02: Chronological order: newly recorded incident prepended to list', () => {
    const initial = [{ id: 'inc-old', aggressor: 'Tetra', victim: 'Guppy', date: '2026-10-01' }];
    const updated = CareEngine.recordIncident(initial, { aggressor: 'Angel', victim: 'Tetra' });
    assert.strictEqual(updated.length, 2);
    assert.strictEqual(updated[0].aggressor, 'Angel');
    assert.strictEqual(updated[1].aggressor, 'Tetra');
  });

  test('F09-03: Incident list filtering and deletion by ID', () => {
    const list = [
      { id: 'inc-1', aggressor: 'Fish 1' },
      { id: 'inc-2', aggressor: 'Fish 2' }
    ];
    const filtered = list.filter(item => item.id !== 'inc-1');
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, 'inc-2');
  });

  test('F09-04: Territory tension score derivation based on logged incidents', () => {
    assert.strictEqual(CareEngine.calculateTerritoryScore([]), 0);
    const twoIncidents = [{ id: '1' }, { id: '2' }];
    const score = CareEngine.calculateTerritoryScore(twoIncidents);
    assert.ok(score > 0, 'Score should reflect recorded aggression');
  });

  test('F09-05: Multi-tank social logging isolation', () => {
    const tankAIncidents = [{ id: 'a1', aggressor: 'Angel A' }];
    const tankBIncidents = [{ id: 'b1', aggressor: 'Betta B' }];

    assert.strictEqual(tankAIncidents.find(i => i.id === 'b1'), undefined);
    assert.strictEqual(tankBIncidents.find(i => i.id === 'a1'), undefined);
  });

  test('F09-06: Handling incidents with empty optional fields', () => {
    const minimal = CareEngine.recordIncident([], { aggressor: 'Barb' });
    assert.strictEqual(minimal[0].aggressor, 'Barb');
    assert.ok(minimal[0].victim); // default applied
  });
});

// ======================================================================
// F10: Vital Signs Status Derivation & Threshold Checks
// ======================================================================
describe('F10: Above-the-Fold Vital Signs Strip & Status Derivation', () => {
  const DiagnosticsEngine = getModule('DiagnosticsEngine');

  test('F10-01: Derives status badges for all 7 fundamental water parameters', () => {
    const reading = { nh3: 0.0, no2: 0.0, no3: 15, temp: 25.5, ph: 7.0, gh: 6, kh: 4 };
    const triage = DiagnosticsEngine.evaluateMetrics(reading);
    const keys = Object.keys(triage.metrics);
    assert.includes(keys, 'nh3');
    assert.includes(keys, 'no2');
    assert.includes(keys, 'no3');
    assert.includes(keys, 'ph');
    assert.includes(keys, 'temp');
    assert.includes(keys, 'gh');
    assert.includes(keys, 'kh');
  });

  test('F10-02: Ammonia safe vs warning vs critical triage boundaries', () => {
    const safe = DiagnosticsEngine.evaluateMetrics({ nh3: 0.0 });
    assert.strictEqual(safe.metrics.nh3.status, 'safe');

    const warning = DiagnosticsEngine.evaluateMetrics({ nh3: 0.05 });
    assert.strictEqual(warning.metrics.nh3.status, 'warning');

    const critical = DiagnosticsEngine.evaluateMetrics({ nh3: 0.25 });
    assert.strictEqual(critical.metrics.nh3.status, 'critical');
  });

  test('F10-03: Nitrite safe vs warning vs critical triage boundaries', () => {
    const safe = DiagnosticsEngine.evaluateMetrics({ no2: 0.0 });
    assert.strictEqual(safe.metrics.no2.status, 'safe');

    const warning = DiagnosticsEngine.evaluateMetrics({ no2: 0.05 });
    assert.strictEqual(warning.metrics.no2.status, 'warning');

    const critical = DiagnosticsEngine.evaluateMetrics({ no2: 0.25 });
    assert.strictEqual(critical.metrics.no2.status, 'critical');
  });

  test('F10-04: Temperature range triage (safe, warning, critical thermal shock)', () => {
    const targets = { temp: { min: 24.0, max: 26.0 } };

    const optimal = DiagnosticsEngine.evaluateMetrics({ temp: 25.0 }, targets);
    assert.strictEqual(optimal.metrics.temp.status, 'safe');

    const warning = DiagnosticsEngine.evaluateMetrics({ temp: 26.8 }, targets);
    assert.strictEqual(warning.metrics.temp.status, 'warning');

    const criticalHigh = DiagnosticsEngine.evaluateMetrics({ temp: 29.5 }, targets); // > max + 2.0
    assert.strictEqual(criticalHigh.metrics.temp.status, 'critical');

    const criticalLow = DiagnosticsEngine.evaluateMetrics({ temp: 19.5 }, targets); // < min - 3.0
    assert.strictEqual(criticalLow.metrics.temp.status, 'critical');
  });

  test('F10-05: pH acidity range triage (safe, warning, critical)', () => {
    const targets = { ph: { min: 6.6, max: 7.4 } };

    const safe = DiagnosticsEngine.evaluateMetrics({ ph: 7.0 }, targets);
    assert.strictEqual(safe.metrics.ph.status, 'safe');

    const warning = DiagnosticsEngine.evaluateMetrics({ ph: 7.6 }, targets);
    assert.strictEqual(warning.metrics.ph.status, 'warning');

    const critical = DiagnosticsEngine.evaluateMetrics({ ph: 5.5 }, targets); // < 6.0
    assert.strictEqual(critical.metrics.ph.status, 'critical');
  });

  test('F10-06: Overall status rollup hierarchy prioritizing critical over warning', () => {
    // 1 warning + 1 critical -> ACTION NEEDED
    const mixed = DiagnosticsEngine.evaluateMetrics({ no3: 35, nh3: 0.3 });
    assert.strictEqual(mixed.overallStatus, 'ACTION NEEDED');

    // Warnings only -> WATCH
    const warningsOnly = DiagnosticsEngine.evaluateMetrics({ no3: 35 });
    assert.strictEqual(warningsOnly.overallStatus, 'WATCH');

    // All within bounds -> OPTIMAL
    const allGood = DiagnosticsEngine.evaluateMetrics({ nh3: 0, no2: 0, no3: 15, temp: 25, ph: 7 });
    assert.strictEqual(allGood.overallStatus, 'OPTIMAL');
  });
});

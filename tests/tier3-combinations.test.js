/**
 * Tier 3: Combinatorial & Cross-Feature Interaction Test Suite
 * 
 * Pairwise Cross-Feature Interactions:
 * Tests the emergent behavior when two or more distinct subsystems interact:
 * - Config Import -> Sweet-Spot Optimization -> Target Param Update
 * - Symptom Diagnosis -> Scaleless Safety Lock -> Medication Dosing
 * - Emergency Ammonia Spike -> Diagnostic Prescription -> Care Task & Param Log
 * - Multi-Tank Isolation across Switch -> Filter Cycles & Incident Scopes
 * - Plugin Registry -> Store Subscription -> Telemetry HAL Ingestion
 */

const { describe, test, it, beforeEach, afterEach, assert, getModule } = require('./run-tests.js');

describe('Tier 3: Pairwise Cross-Feature Interactions', () => {
  const ConfigManager = getModule('ConfigManager');
  const AquaPulseStore = getModule('AquaPulseStore');
  const EventBus = getModule('EventBus');
  const PluginRegistry = getModule('PluginRegistry');
  const FlowEngine = getModule('FlowEngine');
  const OptimizerEngine = getModule('OptimizerEngine');
  const MedicationEngine = getModule('MedicationEngine');
  const DiagnosticsEngine = getModule('DiagnosticsEngine');
  const CareEngine = getModule('CareEngine');

  test('C01: Config Import (F01) + Sweet-Spot Optimization (F05) + Target Parameter Sync (F02)', () => {
    const rawProfile = `
      {
        // Custom Community Setup
        "tank": { "id": "tank-custom-120", "name": "Planted 120L", "volumeNetL": 100 },
        "species": [
          { "id": "denison-barb", "count": 6 },
          { "id": "harlequin-rasbora", "count": 8 }
        ],
        "medicines": [{ "id": "stressHeal", "name": "Conditioner", "ratePer100L": 10 }]
      }
    `;
    // 1. Lenient import
    const profile = ConfigManager.importJSON(rawProfile);
    assert.strictEqual(profile.tank.id, 'tank-custom-120');

    // 2. Sweet spot calculation
    const sweetSpot = OptimizerEngine.calculateSweetSpot(profile.species);
    assert.strictEqual(sweetSpot.hasTempOverlap, true);
    // Denison: 18-26°C, Harlequin: 23-28°C -> Overlap: [23, 26], midpoint: 24.5°C
    assert.strictEqual(sweetSpot.tempRange[0], 23.0);
    assert.strictEqual(sweetSpot.tempRange[1], 26.0);
    assert.strictEqual(sweetSpot.recommendedTemp, 24.5);

    // 3. Sync to reactive store targets
    const store = new AquaPulseStore({
      initialState: {
        config: profile,
        targets: {
          temp: { min: sweetSpot.tempRange[0], max: sweetSpot.tempRange[1], recommended: sweetSpot.recommendedTemp }
        }
      }
    });

    assert.strictEqual(store.getState('targets.temp.recommended'), 24.5);
    assert.strictEqual(store.getState('targets.temp.min'), 23.0);
    assert.strictEqual(store.getState('targets.temp.max'), 26.0);
  });

  test('C02: Symptom Diagnosis (F06) + Scaleless Species Presence (F05) + Volumetric Dosing (F06)', () => {
    // 1. Diagnose ailment 'symp-ich'
    const symptom = MedicationEngine.SYMPTOM_DATABASE.find(s => s.id === 'symp-ich');
    assert.strictEqual(symptom.medScenarioId, 'ichMain');

    // 2. Roster with scaleless Albino Corydoras in 220L net tank
    const species = [
      { id: 'koi-angelfish', count: 2, scaleless: false },
      { id: 'albino-corydoras', count: 6, scaleless: true }
    ];

    // 3. Volumetric dosage calculation
    const doseResult = MedicationEngine.calculateDose(symptom.medScenarioId, 'generalCure', 220, species);

    // Standard for 220L: (220/100) * 10 = 22 ml
    // Scaleless lock: 50% = 11.0 ml
    assert.strictEqual(doseResult.isLocked, true);
    assert.strictEqual(doseResult.doseFactor, 0.5);
    assert.strictEqual(doseResult.rawDose, 11);
    assert.strictEqual(doseResult.formattedDose, 11);
    assert.ok(doseResult.warnings.some(w => w.includes('Sensitive/scaleless')));
  });

  test('C03: Invertebrate Species (F05) + Medication Safety Check (F06) + Copper Ban Alert (F06)', () => {
    const species = [
      { id: 'nerite-snail', name: 'Zebra Nerite Snail', count: 4 }
    ];
    const doseResult = MedicationEngine.calculateDose('ichMain', 'generalCure', 100, species);

    assert.ok(
      doseResult.warnings.some(w => w.includes('Copper') || w.includes('mollusks')),
      'Should generate copper hazard warning for Zebra Nerite Snails'
    );
  });

  test('C04: Telemetry Ingestion (F03) + Diagnostics Triage (F07) + Vital Signs Strip (F10)', () => {
    // 1. Simulated sensor telemetry packet
    const sensorPacket = {
      timestamp: Date.now(),
      tankId: 'tank-demo',
      metrics: {
        temp: 25.5,
        ph: 7.2,
        nh3: 0.35, // Dangerous ammonia spike
        no2: 0.0,
        no3: 20
      }
    };

    // 2. Evaluate through DiagnosticsEngine
    const triage = DiagnosticsEngine.evaluateMetrics(sensorPacket.metrics);
    assert.strictEqual(triage.overallStatus, 'ACTION NEEDED');
    assert.strictEqual(triage.metrics.nh3.status, 'critical');

    // 3. Verify vital signs strip badges representation
    const vitalSignsStrip = {
      overallBadge: triage.overallStatus,
      nh3Badge: triage.metrics.nh3.status,
      tempBadge: triage.metrics.temp.status
    };
    assert.strictEqual(vitalSignsStrip.overallBadge, 'ACTION NEEDED');
    assert.strictEqual(vitalSignsStrip.nh3Badge, 'critical');
    assert.strictEqual(vitalSignsStrip.tempBadge, 'safe');
  });

  test('C05: Emergency Ammonia Spike (F07) + Clinical Prescription (F07) + Care Task (F08) + Param Log (F07)', () => {
    const netVolumeL = 200;
    const reading = { nh3: 0.40, no2: 0.05, no3: 25, temp: 25.0, ph: 7.0 };

    // 1. Diagnostics triage
    const triage = DiagnosticsEngine.evaluateMetrics(reading);
    assert.strictEqual(triage.overallStatus, 'ACTION NEEDED');

    // 2. Calculate clinical prescription
    const prescription = DiagnosticsEngine.calculateEmergencyWaterChange(netVolumeL);
    assert.strictEqual(prescription.waterChangeVolumeL, 100); // 50% of 200L
    assert.strictEqual(prescription.conditionerMl, 10.0); // 100 * 0.1 ml
    assert.strictEqual(prescription.fastingDurationHours, 24);

    // 3. Update store care checklist & water parameter log
    const store = new AquaPulseStore({
      initialState: {
        care: { checklist: {} },
        telemetry: { history: [] }
      }
    });

    store.setState('care.checklist.emergency_wc', {
      title: `Emergency 50% Water Change (~${prescription.waterChangeVolumeL}L + ${prescription.conditionerMl}ml Conditioner)`,
      completed: false,
      timestamp: Date.now()
    });

    const currentLogs = store.getState('telemetry.history') || [];
    currentLogs.unshift({
      date: '2026-10-20',
      nh3: reading.nh3,
      no2: reading.no2,
      no3: reading.no3,
      temp: reading.temp,
      ph: reading.ph,
      wc: `50% Emergency (~${prescription.waterChangeVolumeL}L)`,
      notes: `Ammonia alert: 24h fast ordered`
    });
    store.setState('telemetry.history', currentLogs);

    assert.strictEqual(store.getState('care.checklist.emergency_wc.completed'), false);
    assert.strictEqual(store.getState('telemetry.history.length'), 1);
    assert.includes(store.getState('telemetry.history.0.wc'), '50% Emergency');
  });

  test('C06: Water Log Time Series (F07) + Predictive Trend Engine (F07) + Event Bus (F02)', () => {
    const eventBus = new EventBus();
    let trendAlertEmitted = null;

    eventBus.on('trend:alert', (data) => {
      trendAlertEmitted = data;
    });

    const logs = [
      { date: '2026-10-20', no3: 40, nh3: 0, temp: 25.0 },
      { date: '2026-10-17', no3: 15, nh3: 0, temp: 25.0 } // +25 ppm in 3 days
    ];

    const trend = DiagnosticsEngine.analyzeParameterTrends(logs);
    assert.strictEqual(trend.trendStatus, 'Patterns Detected');
    assert.ok(trend.insights.some(i => i.includes('Rapid Nitrate Accumulation')));

    eventBus.emit('trend:alert', { trendStatus: trend.trendStatus, insights: trend.insights });
    assert.ok(trendAlertEmitted);
    assert.strictEqual(trendAlertEmitted.trendStatus, 'Patterns Detected');
  });

  test('C07: Filter Media Config (F01) + Alternating Sponge Rinse (F08) + Tank Storage Scoping (F02)', () => {
    const store = new AquaPulseStore({
      initialState: {
        tank: { id: 'tank-community-255' },
        equipment: {
          filter: {
            cups: [{ name: 'Cup A: Coarse Foam' }, { name: 'Cup B: Bio-Media Pad' }]
          }
        }
      }
    });

    const cups = store.getState('equipment.filter.cups');
    let currentIdx = 0;

    // First toggle: cycles to Cup B (index 1)
    currentIdx = CareEngine.getNextSpongeIndex(currentIdx, cups);
    assert.strictEqual(currentIdx, 1);
    store.storage.setItem(store.getScopedKey('sponge_idx'), String(currentIdx));

    // Verify key name
    assert.strictEqual(store.getScopedKey('sponge_idx'), 'aquapulse_tank-community-255_sponge_idx');
    assert.strictEqual(store.storage.getItem('aquapulse_tank-community-255_sponge_idx'), '1');

    // Switch active tank to nano tank with 1 sponge cartridge
    store.setTankId('tank-nano-60');
    assert.strictEqual(store.getScopedKey('sponge_idx'), 'aquapulse_tank-nano-60_sponge_idx');
    assert.strictEqual(store.storage.getItem(store.getScopedKey('sponge_idx')), null);
  });

  test('C08: Flow Mode Setting (F04) + Species Inhabitant Flow Dynamics (F05)', () => {
    // Roster containing low-flow Labyrinth Fish and high-flow Denison Barbs
    const mixedRoster = [
      { id: 'denison-barb', count: 6 },
      { id: 'female-betta', count: 2 }
    ];
    const sweetSpot = OptimizerEngine.calculateSweetSpot(mixedRoster);
    assert.includes(sweetSpot.recommendedFlow, '45° Glass-Baffled Return');

    // Initialize Flow Engine with 'baffled' mode
    const dims = { width: 800, height: 384 };
    const p = FlowEngine.createParticle(false, 'baffled', dims);
    assert.ok(p.vx > -4.0, 'Baffled mode initial velocity should be gentler than straight jet');

    // Verify convective circulation
    const particles = [
      { x: 400, y: 300, vx: 0, vy: 0, life: 10 } // near substrate
    ];
    FlowEngine.updatePhysics(particles, 'baffled', dims);
    assert.ok(particles[0].vx > 0, 'Substrate particle rolls right creating gentle circular return');
  });

  test('C09: Custom Sensor Plugin (F03) + Store Reactive State Subscription (F02)', () => {
    const registry = new PluginRegistry();
    const eventBus = new EventBus();
    const store = new AquaPulseStore({ eventBus });

    let latestTelemetryReceived = null;

    const sensorPlugin = {
      id: 'dissolved-oxygen-sensor',
      name: 'Dissolved Oxygen Probe',
      category: 'sensor',
      mount: (container, context) => {
        return { connected: true };
      },
      unmount: () => true,
      update: (state) => {
        latestTelemetryReceived = state.telemetry;
      }
    };

    registry.register(sensorPlugin);
    registry.mountPlugin('dissolved-oxygen-sensor', {});

    // Subscribe plugin updates to store mutations
    store.subscribe((payload) => {
      if (payload.path.startsWith('telemetry')) {
        registry.updatePlugin('dissolved-oxygen-sensor', store.getState());
      }
    });

    // Mutate telemetry state
    store.setState('telemetry.current', { doPpm: 7.8, temp: 25.4 });

    assert.ok(latestTelemetryReceived);
    assert.strictEqual(latestTelemetryReceived.current.doPpm, 7.8);
  });

  test('C10: Quarantine Management (F08) + Social Aggression Incident (F09)', () => {
    let incidents = [];
    const aggression = {
      aggressor: 'Golden CAE',
      victim: 'Koi Angel #2',
      trigger: 'Chasing near center driftwood',
      actionTaken: 'Separated to 15L hospital container'
    };
    incidents = CareEngine.recordIncident(incidents, aggression);
    assert.strictEqual(incidents.length, 1);

    // Activate quarantine tracker for the victim
    const quarData = {
      active: true,
      fishName: 'Koi Angel #2',
      startDate: new Date().toISOString(),
      durationDays: 14,
      containerVolumeL: 15,
      notes: 'Recovering from fin nipping; slime coat shield applied'
    };

    const status = CareEngine.calculateQuarantineCountdown(quarData);
    assert.strictEqual(status.active, true);
    assert.strictEqual(status.fishName, 'Koi Angel #2');
    assert.strictEqual(status.daysRemaining, 14);
    assert.strictEqual(status.status, 'ACTIVE ISOLATION');
  });

  test('C11: Lenient JSON Import with Comments (F01) + Multi-Tank Scoped State (F02)', () => {
    const raw = `
      {
        /* Nano Betta Profile */
        "tank": {
          "id": "tank-60l-betta",
          "name": "Nano Betta Haven",
          "volumeNetL": 50,
        },
        "species": [{ "id": "betta-male", "count": 1 }],
        "medicines": [{ "id": "stressHeal", "ratePer100L": 10 }]
      }
    `;
    const cfg = ConfigManager.importJSON(raw);
    const store = new AquaPulseStore({
      initialState: { config: cfg, tank: cfg.tank }
    });

    assert.strictEqual(store.getScopedKey('params'), 'aquapulse_tank-60l-betta_params');
    assert.strictEqual(store.getScopedKey('sponge_idx'), 'aquapulse_tank-60l-betta_sponge_idx');
  });

  test('C12: Feeding Schedule Matrix (F08) + Pre-Soak Timer Countdown (F08)', () => {
    const foodItem = {
      id: 'food-bloodworms',
      name: 'Freeze-Dried Bloodworms',
      soakRequiredSec: 120,
      targetZone: 'mid'
    };

    const soakSec = CareEngine.calculateSoakTime(foodItem);
    assert.strictEqual(soakSec, 120);

    // Simulate second-by-second countdown
    let remaining = soakSec;
    for (let sec = 0; sec < 120; sec++) {
      remaining--;
    }
    assert.strictEqual(remaining, 0, 'Countdown reaches 0 when pre-soak is completed');
  });
});

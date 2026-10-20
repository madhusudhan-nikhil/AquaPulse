/**
 * Tier 4: Real-World Workload Scenarios Test Suite (AquaPulse S01 – S05)
 * 
 * End-to-end multi-step application scenarios reflecting actual user journeys:
 * - S01: New tank setup & stocking sweet-spot derivation
 * - S02: Ammonia spike emergency response & remediation
 * - S03: Disease outbreak, scaleless safety lock & 14-day quarantine tracking
 * - S04: Multi-tank switching & complete data isolation
 * - S05: Contributor custom sensor plugin dynamic registration & telemetry ingestion
 */

const { describe, test, it, beforeEach, afterEach, assert, getModule } = require('./run-tests.js');

describe('Tier 4: Comprehensive Real-World Workload Scenarios', () => {
  const ConfigManager = getModule('ConfigManager');
  const AquaPulseStore = getModule('AquaPulseStore');
  const EventBus = getModule('EventBus');
  const PluginRegistry = getModule('PluginRegistry');
  const FlowEngine = getModule('FlowEngine');
  const OptimizerEngine = getModule('OptimizerEngine');
  const MedicationEngine = getModule('MedicationEngine');
  const DiagnosticsEngine = getModule('DiagnosticsEngine');
  const CareEngine = getModule('CareEngine');

  // ======================================================================
  // S01: New Tank Setup & Stocking Workflow
  // ======================================================================
  test('S01: New Tank Setup, Stocking Derivation & Target Synchronization Workflow', () => {
    // Step 1: User initializes a 120L demo tank setup
    const initialConfig = {
      tank: {
        id: 'tank-setup-120',
        name: 'AquaPulse 120L Initial Setup',
        volumeGrossL: 120,
        volumeNetL: 100,
        waterType: 'Freshwater Community'
      },
      targets: {
        temp: { min: 24.0, max: 28.0 },
        ph: { min: 6.5, max: 7.5 }
      },
      species: [],
      medicines: [{ id: 'stressHeal', name: 'Stress Heal', ratePer100L: 10 }]
    };

    const store = new AquaPulseStore({ initialState: { config: initialConfig, tank: initialConfig.tank } });
    assert.strictEqual(store.getState('config.tank.volumeNetL'), 100);

    // Step 2: Hobbyist plans stocking roster with Denison Barbs and Albino Corydoras
    const proposedSpecies = [
      { id: 'denison-barb', count: 6 },
      { id: 'albino-corydoras', count: 6 }
    ];
    store.setState('config.species', proposedSpecies);
    assert.strictEqual(store.getState('config.species.length'), 2);

    // Step 3: Run the Inhabitants Sweet-Spot Optimizer Engine
    const sweetSpot = OptimizerEngine.calculateSweetSpot(store.getState('config.species'));
    assert.strictEqual(sweetSpot.hasTempOverlap, true);

    // Denison: 18.0–26.0°C; Cory: 21.0–26.5°C -> Overlap: [21.0, 26.0], Midpoint: 23.5°C
    assert.strictEqual(sweetSpot.tempRange[0], 21.0);
    assert.strictEqual(sweetSpot.tempRange[1], 26.0);
    assert.strictEqual(sweetSpot.recommendedTemp, 23.5);

    // Step 4: Flow Dynamics recommendation evaluation
    // Denison = High Flow, Cory = Low Flow -> Baffled return recommendation
    assert.includes(sweetSpot.recommendedFlow, '45° Glass-Baffled Return');

    // Step 5: User applies derived biological targets back to active tank targets
    store.setState('config.targets.temp', {
      min: sweetSpot.tempRange[0],
      max: sweetSpot.tempRange[1],
      recommended: sweetSpot.recommendedTemp,
      unit: '°C'
    });
    store.setState('config.targets.ph', {
      min: sweetSpot.phRange[0],
      max: sweetSpot.phRange[1]
    });
    store.setState('simulation.mode', 'baffled');

    // Step 6: Verify synchronized state
    assert.strictEqual(store.getState('config.targets.temp.recommended'), 23.5);
    assert.strictEqual(store.getState('config.targets.temp.min'), 21.0);
    assert.strictEqual(store.getState('config.targets.temp.max'), 26.0);
    assert.strictEqual(store.getState('simulation.mode'), 'baffled');
  });

  // ======================================================================
  // S02: Ammonia Spike Emergency Care Response
  // ======================================================================
  test('S02: Ammonia Spike Emergency Care Response & Remediation', () => {
    const eventBus = new EventBus();
    const store = new AquaPulseStore({
      eventBus,
      initialState: {
        tank: { id: 'tank-demo', volumeNetL: 100 },
        telemetry: { current: null, history: [], status: 'OPTIMAL' },
        care: { checklist: {} }
      }
    });

    let emergencyAlertFired = false;
    eventBus.on('state:changed', (e) => {
      if (e.path === 'telemetry.status' && e.value === 'ACTION NEEDED') {
        emergencyAlertFired = true;
      }
    });

    // Step 1: Telemetry injects acute ammonia spike: NH3 = 0.50 ppm, NO2 = 0.20 ppm
    const toxicTelemetry = {
      date: '2026-10-20',
      nh3: 0.50,
      no2: 0.20,
      no3: 35,
      temp: 25.5,
      ph: 7.2
    };

    // Step 2: Diagnostics Engine evaluates reading
    const triage = DiagnosticsEngine.evaluateMetrics(toxicTelemetry);
    assert.strictEqual(triage.overallStatus, 'ACTION NEEDED');
    assert.strictEqual(triage.metrics.nh3.status, 'critical');
    assert.strictEqual(triage.metrics.no2.status, 'critical');

    store.setState('telemetry.current', toxicTelemetry);
    store.setState('telemetry.status', triage.overallStatus);
    assert.strictEqual(emergencyAlertFired, true);

    // Step 3: Automated Clinical Prescription is generated
    const netVol = store.getState('tank.volumeNetL');
    const rx = DiagnosticsEngine.calculateEmergencyWaterChange(netVol);
    assert.strictEqual(rx.waterChangeVolumeL, 50); // 50% of 100L
    assert.strictEqual(rx.conditionerMl, 5.0); // 50 * 0.1 ml
    assert.strictEqual(rx.fastingDurationHours, 24);

    // Step 4: User creates emergency checklist task and executes remediation
    store.setState('care.checklist.task_emergency_wc', {
      title: `Perform Emergency 50% Water Change (~${rx.waterChangeVolumeL}L + ${rx.conditionerMl}ml Conditioner)`,
      completed: true,
      timestamp: Date.now()
    });

    // Step 5: User logs remediation water test: NH3 drops to 0.0 ppm
    const postRemediation = {
      date: '2026-10-21',
      nh3: 0.0,
      no2: 0.0,
      no3: 15,
      temp: 25.5,
      ph: 7.1,
      wc: `50% Emergency (~${rx.waterChangeVolumeL}L + ${rx.conditionerMl}ml Conditioner)`,
      notes: 'Water change executed; ammonia and nitrite neutralized'
    };

    const postTriage = DiagnosticsEngine.evaluateMetrics(postRemediation);
    assert.strictEqual(postTriage.overallStatus, 'OPTIMAL');

    store.setState('telemetry.current', postRemediation);
    store.setState('telemetry.status', postTriage.overallStatus);
    store.setState('telemetry.history', [postRemediation, toxicTelemetry]);

    assert.strictEqual(store.getState('telemetry.status'), 'OPTIMAL');
    assert.strictEqual(store.getState('telemetry.history.length'), 2);
  });

  // ======================================================================
  // S03: Disease Outbreak & Scaleless Safety Quarantine
  // ======================================================================
  test('S03: Disease Outbreak, Scaleless Safety Lock & 14-Day Quarantine Tracking', () => {
    const store = new AquaPulseStore({
      initialState: {
        tank: { id: 'tank-display', volumeNetL: 200 },
        species: [
          { id: 'koi-angelfish', name: 'Koi Angel #2', count: 1, scaleless: false },
          { id: 'albino-corydoras', name: 'Albino Corydoras', count: 6, scaleless: true }
        ],
        care: {
          quarantine: { active: false, fishName: '', startDate: null, durationDays: 14 }
        }
      }
    });

    // Step 1: User spots white specks on Koi Angel #2 -> selects symp-ich
    const symptom = MedicationEngine.SYMPTOM_DATABASE.find(s => s.id === 'symp-ich');
    assert.strictEqual(symptom.medScenarioId, 'ichMain');

    // Step 2: Medication calculator computes dose for display tank (200L)
    // Corydoras are present -> 50% safety lock engages
    const species = store.getState('species');
    const netVol = store.getState('tank.volumeNetL');
    const medDose = MedicationEngine.calculateDose(symptom.medScenarioId, 'generalCure', netVol, species);

    assert.strictEqual(medDose.isLocked, true);
    assert.strictEqual(medDose.doseFactor, 0.5);
    // (200 / 100) * 10 * 0.5 = 10.0 ml
    assert.strictEqual(medDose.rawDose, 10);
    assert.strictEqual(medDose.formattedDose, 10);

    // Step 3: Hobbyist isolates Koi Angel #2 to a 15L hospital container and activates 14-day tracker
    const startDate = '2026-10-06T12:00:00Z';
    const quarState = {
      active: true,
      fishName: 'Koi Angel #2',
      startDate: startDate,
      durationDays: 14,
      containerVolumeL: 15,
      notes: 'Hospital tank with airstone; treated with half-dose General Cure'
    };
    store.setState('care.quarantine', quarState);

    // Step 4: Mid-point inspection at Day 7 (2026-10-13)
    const midPointDate = new Date('2026-10-13T12:00:00Z');
    const midCheck = CareEngine.calculateQuarantineCountdown(store.getState('care.quarantine'), midPointDate);
    assert.strictEqual(midCheck.daysElapsed, 7);
    assert.strictEqual(midCheck.daysRemaining, 7);
    assert.strictEqual(midCheck.status, 'ACTIVE ISOLATION');

    // Step 5: Final inspection at Day 14 (2026-10-20)
    const completionDate = new Date('2026-10-20T12:00:00Z');
    const finalCheck = CareEngine.calculateQuarantineCountdown(store.getState('care.quarantine'), completionDate);
    assert.strictEqual(finalCheck.daysElapsed, 14);
    assert.strictEqual(finalCheck.daysRemaining, 0);
    assert.strictEqual(finalCheck.status, 'READY FOR MAIN TANK');

    // Step 6: Patient fish discharged back to display tank safely
    store.setState('care.quarantine.active', false);
    store.setState('care.quarantine.fishName', 'Discharged: Safe');
    assert.strictEqual(store.getState('care.quarantine.active'), false);
  });

  // ======================================================================
  // S04: Multi-Tank Switch & Complete Data Isolation
  // ======================================================================
  test('S04: Multi-Tank Switch & Complete Data Isolation', () => {
    const store = new AquaPulseStore({
      initialState: {
        tank: { id: 'tank-255l-community' }
      }
    });
    const storage = store.storage;

    // --- Tank 1: 255L Community Tank ---
    const tank1Id = 'tank-255l-community';
    store.setTankId(tank1Id);

    // 1. Log 3 parameter readings for Tank 1
    const tank1Logs = [
      { date: '2026-10-20', temp: 25.5, no3: 20 },
      { date: '2026-10-13', temp: 25.4, no3: 15 },
      { date: '2026-10-06', temp: 25.6, no3: 18 }
    ];
    storage.setItem(`aquapulse_${tank1Id}_params`, JSON.stringify(tank1Logs));

    // 2. Log 2 social aggression incidents for Tank 1
    const tank1Incidents = [
      { id: 'inc-1', aggressor: 'Koi Angel', victim: 'Silvertip Tetra' },
      { id: 'inc-2', aggressor: 'Golden CAE', victim: 'Koi Angel' }
    ];
    storage.setItem(`aquapulse_${tank1Id}_social`, JSON.stringify(tank1Incidents));

    // 3. Set sponge rinse index for Tank 1 (Index 1: Cup B)
    storage.setItem(`aquapulse_${tank1Id}_sponge_idx`, '1');

    // --- Switch to Tank 2: 60L Nano Betta Tank ---
    const tank2Id = 'tank-60l-betta';
    store.setTankId(tank2Id);

    // 1. Verify Tank 2 storage partitions are clean and empty
    assert.strictEqual(storage.getItem(`aquapulse_${tank2Id}_params`), null);
    assert.strictEqual(storage.getItem(`aquapulse_${tank2Id}_social`), null);
    assert.strictEqual(storage.getItem(`aquapulse_${tank2Id}_sponge_idx`), null);

    // 2. Log 1 parameter reading for Tank 2
    const tank2Logs = [{ date: '2026-10-20', temp: 26.5, no3: 5, ph: 6.8 }];
    storage.setItem(`aquapulse_${tank2Id}_params`, JSON.stringify(tank2Logs));
    storage.setItem(`aquapulse_${tank2Id}_sponge_idx`, '0');

    // --- Switch back to Tank 1 ---
    store.setTankId(tank1Id);

    // Verify Tank 1 data is completely intact without any corruption from Tank 2
    const retrievedLogs1 = JSON.parse(storage.getItem(store.getScopedKey('params')));
    assert.strictEqual(retrievedLogs1.length, 3);
    assert.strictEqual(retrievedLogs1[0].temp, 25.5);

    const retrievedIncidents1 = JSON.parse(storage.getItem(`aquapulse_${tank1Id}_social`));
    assert.strictEqual(retrievedIncidents1.length, 2);

    const retrievedSponge1 = storage.getItem(store.getScopedKey('sponge_idx'));
    assert.strictEqual(retrievedSponge1, '1');

    // --- Switch back to Tank 2 ---
    store.setTankId(tank2Id);
    const retrievedLogs2 = JSON.parse(storage.getItem(store.getScopedKey('params')));
    assert.strictEqual(retrievedLogs2.length, 1);
    assert.strictEqual(retrievedLogs2[0].no3, 5);
    assert.strictEqual(storage.getItem(`aquapulse_${tank2Id}_social`), null);
  });

  // ======================================================================
  // S05: Contributor Custom Sensor Plugin Dynamic Registration & Telemetry
  // ======================================================================
  test('S05: Contributor Custom Sensor Plugin Dynamic Registration & Telemetry Ingestion', () => {
    const registry = new PluginRegistry();
    const eventBus = new EventBus();
    const store = new AquaPulseStore({ eventBus });

    // Step 1: Contributor defines a custom telemetry plugin
    let mountCalls = 0;
    let unmountCalls = 0;
    let telemetryStream = [];

    const orpSensorPlugin = {
      id: 'orp-redox-sensor',
      name: 'ORP / Redox Potential Sensor',
      category: 'sensor',
      mount: (container, context) => {
        mountCalls++;
        container.innerHTML = `<div id="orp-display">ORP: -- mV</div>`;
        return { connected: true, deviceId: 'ORP-PROBE-01' };
      },
      unmount: () => {
        unmountCalls++;
      },
      update: (state) => {
        if (state && state.telemetry && state.telemetry.current) {
          telemetryStream.push(state.telemetry.current);
        }
      }
    };

    // Step 2: Register plugin dynamically into PluginRegistry
    assert.strictEqual(registry.register(orpSensorPlugin), true);
    assert.strictEqual(registry.getAllPlugins().length, 1);
    assert.strictEqual(registry.getPlugin('orp-redox-sensor').category, 'sensor');

    // Step 3: Mount plugin into DOM container
    const mockContainer = { innerHTML: '' };
    const instance = registry.mountPlugin('orp-redox-sensor', mockContainer, { tankId: 'tank-demo' });
    assert.strictEqual(mountCalls, 1);
    assert.strictEqual(instance.deviceId, 'ORP-PROBE-01');
    assert.includes(mockContainer.innerHTML, 'ORP: -- mV');

    // Step 4: Stream real-time telemetry packets through Telemetry bridge
    const packets = [
      { timestamp: 1000, orpMv: 320, temp: 25.4 },
      { timestamp: 2000, orpMv: 345, temp: 25.5 },
      { timestamp: 3000, orpMv: 360, temp: 25.5 }
    ];

    for (const pkt of packets) {
      store.setState('telemetry.current', pkt);
      registry.updatePlugin('orp-redox-sensor', store.getState());
    }

    assert.strictEqual(telemetryStream.length, 3);
    assert.strictEqual(telemetryStream[2].orpMv, 360);

    // Step 5: Clean unmounting and de-registration
    registry.unmountPlugin('orp-redox-sensor');
    assert.strictEqual(unmountCalls, 1);

    registry.unregister('orp-redox-sensor');
    assert.strictEqual(registry.getAllPlugins().length, 0);
  });
});

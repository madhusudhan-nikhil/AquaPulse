/**
 * AquaPulse Milestone 2 Engines Automated Verification Suite
 * 
 * Exhaustively verifies the 5 pure calculation engines:
 * 1. FlowEngine (Hydrodynamic physics, vector kinematics, velocity fields, streamlines)
 * 2. OptimizerEngine (16-species biological database, overlap math, flow dynamics, conflict detection, density scoring)
 * 3. MedicationEngine (Symptom database, 50% scaleless safety lock, copper lock, volumetric dosing)
 * 4. DiagnosticsEngine (3-tier triage, emergency prescriptions, trend anomaly analysis)
 * 5. CareEngine (14-day quarantine progress, alternating sponge rinse, feeding matrix, aggression scoring)
 * 
 * Zero DOM / browser dependencies — 100% headless execution.
 */

const assert = require('assert');
const path = require('path');

// Load Engines
const FlowEngine = require('../src/engines/flow-engine.js');
const OptimizerEngine = require('../src/engines/optimizer-engine.js');
const MedicationEngine = require('../src/engines/medication-engine.js');
const DiagnosticsEngine = require('../src/engines/diagnostics-engine.js');
const CareEngine = require('../src/engines/care-engine.js');

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
console.log('  AquaPulse Milestone 2 Calculation Engines Verification');
console.log('======================================================\n');

// ======================================================================
// Suite 1: FlowEngine
// ======================================================================
console.log('--- Suite 1: FlowEngine (Hydrodynamics & Particle Kinematics) ---');

runTest('1.01: getNozzleCoords calculates correct coordinates across standard dimensions', () => {
  const coords800 = FlowEngine.getNozzleCoords({ width: 800, height: 384 });
  assert.strictEqual(coords800.x, 800 - 155);
  assert.strictEqual(coords800.y, 384 * 0.15);

  const coords500 = FlowEngine.getNozzleCoords({ width: 500, height: 300 });
  assert.strictEqual(coords500.x, 500 - 135);
  assert.strictEqual(coords500.y, 300 * 0.15);
});

runTest('1.02: getNozzleCoords handles zero and negative dimensions without crash or NaN', () => {
  const zero = FlowEngine.getNozzleCoords({ width: 0, height: 0 });
  assert.strictEqual(zero.x, 0);
  assert.strictEqual(zero.y, 0);

  const negative = FlowEngine.getNozzleCoords({ width: -400, height: -200 });
  assert.strictEqual(negative.x, 0);
  assert.strictEqual(negative.y, 0);
});

runTest('1.03: createParticle generates realistic straight jet particle kinematics', () => {
  const p = FlowEngine.createParticle(false, 'current', { width: 800, height: 384 });
  assert.ok(p.vx <= -4.2 && p.vx >= -9.4, `Expected vx in [-9.4, -4.2], got ${p.vx}`);
  assert.strictEqual(p.life, 0);
  assert.ok(p.size >= 1.0 && p.size <= 3.8);
});

runTest('1.04: createParticle generates baffled mode initial convection kinematics', () => {
  const p = FlowEngine.createParticle(false, 'baffled', { width: 800, height: 384 });
  assert.ok(p.vx <= -1.5 && p.vx >= -4.0, `Expected vx in [-4.0, -1.5], got ${p.vx}`);
  assert.ok(p.vy >= 0.4, 'Baffled mode initial vertical velocity directed downward');
  assert.strictEqual(p.life, 0);
});

runTest('1.05: initParticles creates full pool of 85 particles with random spread', () => {
  const pool = FlowEngine.initParticles(85, 800, 384, 'current');
  assert.strictEqual(pool.length, 85);
  pool.forEach(p => {
    assert.ok(p.x >= 0 && p.x <= 800);
    assert.ok(p.y >= 0 && p.y <= 384);
    assert.ok(!Number.isNaN(p.vx));
    assert.ok(!Number.isNaN(p.vy));
  });
});

runTest('1.06: updatePhysics applies upward buoyancy in straight jet mode', () => {
  const p = { x: 500, y: 100, vx: -5.0, vy: 0.0, life: 1 };
  FlowEngine.updatePhysics([p], 'current', { width: 800, height: 384 });
  assert.ok(p.vy < 0, 'Vertical velocity should decrease by 0.018 (buoyancy upward acceleration)');
  assert.strictEqual(p.life, 2);
});

runTest('1.07: updatePhysics dampens vx and deflects downward vy at left glass pane boundary', () => {
  const width = 800;
  const height = 384;
  const p = { x: 80, y: 100, vx: -6.0, vy: -0.2, life: 10 };
  FlowEngine.updatePhysics([p], 'current', { width, height });

  // vx *= 0.6: -6.0 * 0.6 = -3.6
  assert.strictEqual(Math.abs(p.vx - (-3.6)) < 0.001, true);
  // vy += 0.75: (-0.2 - 0.018) + 0.75 = 0.532
  assert.ok(p.vy > 0, 'vy should deflect downward');
});

runTest('1.08: updatePhysics implements baffled mode circular convection rolling', () => {
  const width = 800;
  const height = 384;

  // Substrate particle (y > height * 0.62)
  const bottom = { x: 400, y: 300, vx: 0.0, vy: 0.0, life: 5 };
  FlowEngine.updatePhysics([bottom], 'baffled', { width, height });
  assert.strictEqual(bottom.vx, 0.045);
  assert.strictEqual(bottom.vy, 0.01);

  // Upper column particle (y < height * 0.62)
  const top = { x: 400, y: 50, vx: 0.0, vy: 0.0, life: 5 };
  FlowEngine.updatePhysics([top], 'baffled', { width, height });
  assert.strictEqual(top.vx, -0.02);
  assert.strictEqual(top.vy, 0.01);
});

runTest('1.09: updatePhysics resets expired and out-of-bounds particles', () => {
  const width = 800;
  const height = 384;
  const expired = { x: 400, y: 200, vx: -5, vy: 0, life: 150 };
  const particles = [expired];
  FlowEngine.updatePhysics(particles, 'current', { width, height });
  assert.strictEqual(particles[0].life, 0, 'Expired particle should reset with life = 0');
});

runTest('1.10: calculateVelocityField returns comprehensive 2D vector field', () => {
  const field = FlowEngine.calculateVelocityField(800, 384, 'current', 80);
  assert.strictEqual(field.width, 800);
  assert.strictEqual(field.height, 384);
  assert.ok(field.vectors.length > 20);
  assert.ok(field.vectors.some(v => v.speed > 0));
});

runTest('1.11: getStreamlines provides analytical curves for both flow modes', () => {
  const jetLines = FlowEngine.getStreamlines('current', 800, 384);
  assert.strictEqual(jetLines.length, 4); // 3 jet lines + 1 return eddy
  assert.strictEqual(jetLines[0].type, 'bezier');

  const baffledLoops = FlowEngine.getStreamlines('baffled', 800, 384);
  assert.strictEqual(baffledLoops.length, 2); // outer + inner ellipse
  assert.strictEqual(baffledLoops[0].type, 'ellipse');
});

// ======================================================================
// Suite 2: OptimizerEngine
// ======================================================================
console.log('\n--- Suite 2: OptimizerEngine (16 Species, Sweet-Spot Math, Conflicts) ---');

runTest('2.01: SPECIES_DATABASE contains all 16 freshwater species profiles', () => {
  const speciesList = OptimizerEngine.getAllSpecies();
  assert.strictEqual(speciesList.length, 16);

  const expectedKeys = [
    'koi-angelfish', 'blue-zebra-angel', 'denison-barb', 'boeseman-rainbow',
    'silvertip-tetra', 'neon-tetra', 'female-betta', 'betta-male',
    'dwarf-gourami', 'rice-fish', 'harlequin-rasbora', 'albino-corydoras',
    'pygmy-cory', 'golden-cae', 'sae', 'nerite-snail'
  ];

  expectedKeys.forEach(k => {
    assert.ok(OptimizerEngine.getSpecies(k), `Missing species ${k}`);
  });
});

runTest('2.02: resolveSpeciesProfile resolves by exact ID, fuzzy name, or default fallback', () => {
  const byId = OptimizerEngine.resolveSpeciesProfile({ id: 'denison-barb' });
  assert.strictEqual(byId.name, 'Denison Barb (Roseline Shark)');
  assert.strictEqual(byId.flowPreference, 'high');

  const byFuzzy = OptimizerEngine.resolveSpeciesProfile({ name: 'Zebra Snail' });
  assert.strictEqual(byFuzzy.id, 'nerite-snail');

  const byFallback = OptimizerEngine.resolveSpeciesProfile({ name: 'Alien Guppy' });
  assert.strictEqual(byFallback.tempOptimal, 25.0);
  assert.strictEqual(byFallback.phOptimal, 7.0);
});

runTest('2.03: calculateSweetSpot derives exact mathematical temperature overlap and midpoint', () => {
  const roster = [
    { id: 'denison-barb', count: 6 }, // 18.0 - 26.0°C
    { id: 'harlequin-rasbora', count: 8 } // 23.0 - 28.0°C
  ];
  const result = OptimizerEngine.calculateSweetSpot(roster);
  assert.strictEqual(result.hasTempOverlap, true);
  // max(18.0, 23.0) = 23.0, min(26.0, 28.0) = 26.0
  assert.strictEqual(result.tempRange[0], 23.0);
  assert.strictEqual(result.tempRange[1], 26.0);
  // (23.0 + 26.0) / 2 = 24.5°C
  assert.strictEqual(result.recommendedTemp, 24.5);
});

runTest('2.04: calculateSweetSpot derives safe pH, GH, and KH corridors', () => {
  const roster = [
    { id: 'koi-angelfish', count: 2 }, // pH: 6.0-7.5, GH: 3-10, KH: 2-6
    { id: 'boeseman-rainbow', count: 4 } // pH: 7.0-8.0, GH: 8-18, KH: 5-12
  ];
  const result = OptimizerEngine.calculateSweetSpot(roster);
  assert.strictEqual(result.hasPhOverlap, true);
  assert.strictEqual(result.phRange[0], 7.0);
  assert.strictEqual(result.phRange[1], 7.5);
  // GH clipped to [max(3, 8), min(15, 10)] = [8, 10]
  assert.strictEqual(result.ghRange[0], 8);
  assert.strictEqual(result.ghRange[1], 10);
});

runTest('2.05: Flow dynamics recommendation correctly distinguishes high, low, and mixed flow', () => {
  // Pure high-flow
  const high = OptimizerEngine.calculateSweetSpot([{ id: 'denison-barb', count: 6 }]);
  assert.strictEqual(high.recommendedFlow, "Direct Venturi Jet Flow Suitable");

  // Pure low-flow
  const low = OptimizerEngine.calculateSweetSpot([{ id: 'female-betta', count: 4 }]);
  assert.strictEqual(low.recommendedFlow, "Low Gentle Flow Required");

  // Mixed community
  const mixed = OptimizerEngine.calculateSweetSpot([
    { id: 'denison-barb', count: 6 },
    { id: 'female-betta', count: 2 }
  ]);
  assert.strictEqual(mixed.recommendedFlow, "45° Glass-Baffled Return Recommended");
});

runTest('2.06: Scaleless species correctly tagged and reported', () => {
  const roster = [
    { id: 'koi-angelfish', count: 2 },
    { id: 'albino-corydoras', count: 6 },
    { id: 'pygmy-cory', count: 6 }
  ];
  const result = OptimizerEngine.calculateSweetSpot(roster);
  assert.strictEqual(result.scalelessSpecies.length, 2);
  assert.ok(result.scalelessSpecies.includes('Albino Corydoras'));
  assert.ok(result.scalelessSpecies.includes('Pygmy Corydoras'));
});

runTest('2.07: Detects temperature conflicts when running near or outside biological thresholds', () => {
  const conflictRoster = [
    { name: "Arctic Minnow", tempMin: 10.0, tempMax: 18.0, phMin: 7.0, phMax: 7.5, count: 5 },
    { name: "Amazonian Discus", tempMin: 29.0, tempMax: 33.0, phMin: 6.0, phMax: 6.8, count: 2 }
  ];
  const result = OptimizerEngine.calculateSweetSpot(conflictRoster);
  assert.strictEqual(result.hasTempOverlap, false);
  assert.strictEqual(result.recommendedTemp, 25.5);
  assert.ok(result.conflicts.length > 0);
});

runTest('2.08: calculateDensityScore evaluates bioload and capacity accurately', () => {
  const lightRoster = [{ id: 'neon-tetra', count: 6 }];
  const light = OptimizerEngine.calculateDensityScore(lightRoster, 100);
  assert.strictEqual(light.status, 'LIGHT');

  const heavyRoster = [
    { id: 'koi-angelfish', count: 4 }, // 4 * 8 = 32
    { id: 'denison-barb', count: 6 },  // 6 * 6 = 36
    { id: 'boeseman-rainbow', count: 4 } // 4 * 5.5 = 22 -> total = 90
  ];
  const heavy = OptimizerEngine.calculateDensityScore(heavyRoster, 100); // 90 / 65 ≈ 138%
  assert.strictEqual(heavy.status, 'OVERSTOCKED');
});

runTest('2.09: Empty or null species roster returns null safely', () => {
  assert.strictEqual(OptimizerEngine.calculateSweetSpot([]), null);
  assert.strictEqual(OptimizerEngine.calculateSweetSpot(null), null);
});

// ======================================================================
// Suite 3: MedicationEngine
// ======================================================================
console.log('\n--- Suite 3: MedicationEngine (Symptom Catalog, Safety Locks, Volumetric Dosing) ---');

runTest('3.01: SYMPTOM_DATABASE includes all 5 required ailments', () => {
  const symptoms = MedicationEngine.SYMPTOM_DATABASE;
  assert.strictEqual(symptoms.length, 5);
  const ids = symptoms.map(s => s.id);
  assert.deepStrictEqual(ids.sort(), ['symp-bloat', 'symp-finrot', 'symp-gasping', 'symp-ich', 'symp-nipping'].sort());
});

runTest('3.02: diagnoseSymptoms returns full clinical protocol for given ailment', () => {
  const ichDiag = MedicationEngine.diagnoseSymptoms('symp-ich');
  assert.strictEqual(ichDiag.symptom.id, 'symp-ich');
  assert.strictEqual(ichDiag.scenario.id, 'ichMain');
  assert.strictEqual(ichDiag.medication.id, 'generalCure');
  assert.ok(ichDiag.recommendation.includes('Ich'));
});

runTest('3.03: Standard volumetric medication dosing calculation (100% factor)', () => {
  // 250L net tank volume, General Cure (10ml per 100L)
  const res = MedicationEngine.calculateDose('ichMain', 'generalCure', 250, [], false);
  // (250 / 100) * 10 * 1.0 = 25 ml
  assert.strictEqual(res.rawDose, 25);
  assert.strictEqual(res.formattedDose, 25);
  assert.strictEqual(res.doseFactor, 1.0);
  assert.strictEqual(res.isLocked, false);
});

runTest('3.04: 50% safety lock factor automatically engages when scaleless fish present', () => {
  const species = [{ id: 'albino-corydoras', name: 'Albino Corydoras', scaleless: true }];
  const res = MedicationEngine.calculateDose('ichMain', 'generalCure', 220, species);
  // 220L: (220 / 100) * 10 * 0.5 = 11.0 ml
  assert.strictEqual(res.isLocked, true);
  assert.strictEqual(res.doseFactor, 0.5);
  assert.strictEqual(res.rawDose, 11);
  assert.strictEqual(res.formattedDose, 11);
  assert.ok(res.warnings.some(w => w.includes('50% safety lock')));
});

runTest('3.05: Copper toxicity hazard alert triggers for snails/invertebrates', () => {
  const species = [{ id: 'nerite-snail', name: 'Zebra Nerite Snail' }];
  const res = MedicationEngine.calculateDose('ichMain', 'generalCure', 100, species);
  assert.ok(res.warnings.some(w => w.includes('Copper') || w.includes('mollusks')));
});

runTest('3.06: Salt prohibition alert triggers when scaleless catfish are present', () => {
  const species = [{ id: 'pygmy-cory', name: 'Pygmy Corydoras', scaleless: true }];
  const res = MedicationEngine.calculateDose('hospitalSalt', 'aquaSalt', 10, species);
  assert.ok(res.warnings.some(w => w.includes('DO NOT dose aquarium salt')));
});

runTest('3.07: Hospital tank isolation recommended for antibacterials', () => {
  const res = MedicationEngine.calculateDose('hospitalBact', 'bactonil', 15);
  assert.ok(res.warnings.some(w => w.includes('Hospital tank isolation recommended')));
});

runTest('3.08: Zero and negative volumes clamped safely without NaN', () => {
  const zero = MedicationEngine.calculateDose('ichMain', 'generalCure', 0);
  assert.strictEqual(zero.rawDose, 0);
  assert.strictEqual(zero.formattedDose, 0);

  const neg = MedicationEngine.calculateDose('ichMain', 'generalCure', -50);
  assert.strictEqual(neg.rawDose, 0);
  assert.strictEqual(neg.formattedDose, 0);
});

// ======================================================================
// Suite 4: DiagnosticsEngine
// ======================================================================
console.log('\n--- Suite 4: DiagnosticsEngine (3-Tier Triage, Prescriptions, Trends) ---');

runTest('4.01: Optimal classification when all parameters meet target ranges', () => {
  const reading = { nh3: 0.0, no2: 0.0, no3: 15, temp: 25.5, ph: 7.0, gh: 6, kh: 4 };
  const triage = DiagnosticsEngine.evaluateMetrics(reading);
  assert.strictEqual(triage.overallStatus, 'OPTIMAL');
  assert.strictEqual(triage.metrics.nh3.status, 'safe');
  assert.strictEqual(triage.metrics.no2.status, 'safe');
  assert.strictEqual(triage.metrics.no3.status, 'safe');
  assert.strictEqual(triage.metrics.temp.status, 'safe');
  assert.strictEqual(triage.metrics.ph.status, 'safe');
});

runTest('4.02: Warning status classification (WATCH) when nitrate or pH drifts', () => {
  const reading = { nh3: 0.0, no2: 0.0, no3: 35, temp: 25.5, ph: 7.0 };
  const triage = DiagnosticsEngine.evaluateMetrics(reading);
  assert.strictEqual(triage.overallStatus, 'WATCH');
  assert.strictEqual(triage.metrics.no3.status, 'warning');
});

runTest('4.03: Critical status classification (ACTION NEEDED) when ammonia or nitrite detected', () => {
  const reading = { nh3: 0.25, no2: 0.0, no3: 15, temp: 25.5, ph: 7.0 };
  const triage = DiagnosticsEngine.evaluateMetrics(reading);
  assert.strictEqual(triage.overallStatus, 'ACTION NEEDED');
  assert.strictEqual(triage.metrics.nh3.status, 'critical');
  assert.ok(triage.prescriptions.length > 0);
});

runTest('4.04: Ammonia boundary exact threshold testing (0.100 vs 0.101)', () => {
  const warn = DiagnosticsEngine.evaluateMetrics({ nh3: 0.100 });
  assert.strictEqual(warn.metrics.nh3.status, 'warning');

  const crit = DiagnosticsEngine.evaluateMetrics({ nh3: 0.101 });
  assert.strictEqual(crit.metrics.nh3.status, 'critical');
});

runTest('4.05: Emergency water change volume and conditioner dosage prescription formulas', () => {
  const rx = DiagnosticsEngine.calculateEmergencyWaterChange(220);
  assert.strictEqual(rx.waterChangeVolumeL, 110); // 50% of 220L
  assert.strictEqual(rx.conditionerMl, 11.0); // 110 * 0.1 ml
  assert.strictEqual(rx.fastingDurationHours, 24);
});

runTest('4.06: generatePrescription outputs full clinical remediation action plan', () => {
  const plan = DiagnosticsEngine.generatePrescription({ nh3: 0.50, no2: 0.20 }, {}, 100);
  assert.strictEqual(plan.status, 'ACTION NEEDED');
  assert.strictEqual(plan.emergencyWaterChangeL, 50);
  assert.strictEqual(plan.conditionerDoseMl, 5.0);
  assert.strictEqual(plan.fastingHours, 24);
  assert.ok(plan.actionSteps.length >= 3);
});

runTest('4.07: analyzeParameterTrends detects Rapid Nitrate Accumulation', () => {
  const logs = [
    { date: '2026-10-20', no3: 40, nh3: 0, temp: 25.0 },
    { date: '2026-10-17', no3: 15, nh3: 0, temp: 25.0 } // +25 ppm in 3 days
  ];
  const trend = DiagnosticsEngine.analyzeParameterTrends(logs);
  assert.strictEqual(trend.trendStatus, 'Patterns Detected');
  assert.ok(trend.insights.some(i => i.includes('Rapid Nitrate Accumulation')));
});

runTest('4.08: analyzeParameterTrends detects Emerging Bio-Filter Strain and Temp Swings', () => {
  const logs = [
    { date: '2026-10-20', nh3: 0.25, temp: 28.0, no3: 15 },
    { date: '2026-10-15', nh3: 0.00, temp: 25.0, no3: 15 }
  ];
  const trend = DiagnosticsEngine.analyzeParameterTrends(logs);
  assert.ok(trend.insights.some(i => i.includes('Emerging Bio-Filter Strain')));
  assert.ok(trend.insights.some(i => i.includes('Temperature Fluctuation')));
});

// ======================================================================
// Suite 5: CareEngine
// ======================================================================
console.log('\n--- Suite 5: CareEngine (Quarantine, Filter Care, Feeding, Aggression) ---');

runTest('5.01: 14-Day quarantine countdown calculates elapsed, remaining, and percentage', () => {
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
  assert.strictEqual(res.stage, 'Treatment Window');
  assert.strictEqual(res.percentage, 36); // round(5/14 * 100) = 36%
});

runTest('5.02: Quarantine status transitions to READY FOR MAIN TANK at completion', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const quarData = {
    active: true,
    fishName: 'Cleared Angel',
    startDate: '2026-10-06T12:00:00Z', // 14 days ago
    durationDays: 14
  };
  const res = CareEngine.calculateQuarantineCountdown(quarData, now);
  assert.strictEqual(res.daysElapsed, 14);
  assert.strictEqual(res.daysRemaining, 0);
  assert.strictEqual(res.status, 'READY FOR MAIN TANK');
  assert.strictEqual(res.percentage, 100);
});

runTest('5.03: Future quarantine start date clamps elapsed to 0', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const futureQuar = {
    active: true,
    fishName: 'Future Fish',
    startDate: '2026-10-25T12:00:00Z',
    durationDays: 14
  };
  const res = CareEngine.calculateQuarantineCountdown(futureQuar, now);
  assert.strictEqual(res.daysElapsed, 0);
  assert.strictEqual(res.daysRemaining, 14);
});

runTest('5.04: Alternating dual-canister sponge rinse index toggles accurately', () => {
  const cups = [{ name: 'Cup A: Coarse Foam' }, { name: 'Cup B: Bio-Media Pad' }];
  assert.strictEqual(CareEngine.getNextSpongeIndex(0, cups), 1);
  assert.strictEqual(CareEngine.getNextSpongeIndex(1, cups), 0);
});

runTest('5.05: Single-canister nano filter handles sponge index toggle gracefully', () => {
  const cups = [{ name: 'Nano Sponge' }];
  assert.strictEqual(CareEngine.getNextSpongeIndex(0, cups), 0);
});

runTest('5.06: calculateSoakTime returns exact seconds for freeze-dried food items', () => {
  assert.strictEqual(CareEngine.calculateSoakTime({ soakRequiredSec: 180 }), 180);
  assert.strictEqual(CareEngine.calculateSoakTime({ soakRequiredSec: 0 }), 0);
  assert.strictEqual(CareEngine.calculateSoakTime(null), 0);
});

runTest('5.07: getDailyFeedingPlan retrieves day-of-week regimens and identifies fasting days', () => {
  const monPlan = CareEngine.getDailyFeedingPlan(undefined, 'Mon');
  assert.strictEqual(monPlan.day, 'Mon');
  assert.strictEqual(monPlan.isFastingDay, false);

  const sunPlan = CareEngine.getDailyFeedingPlan(undefined, 'Sun');
  assert.strictEqual(sunPlan.day, 'Sun');
  assert.strictEqual(sunPlan.isFastingDay, true);
  assert.ok(sunPlan.morning.includes('FAST'));
});

runTest('5.08: recordIncident prepends incident with unique id and timestamp', () => {
  const incidents = [];
  const updated = CareEngine.recordIncident(incidents, {
    aggressor: 'Golden CAE',
    victim: 'Koi Angel',
    trigger: 'Feeding competition'
  });
  assert.strictEqual(updated.length, 1);
  assert.strictEqual(updated[0].aggressor, 'Golden CAE');
  assert.ok(updated[0].id.startsWith('inc-'));
  assert.ok(updated[0].date);
});

runTest('5.09: calculateAggressionScore computes tension score, hotspots, and recommendations', () => {
  const incidents = [
    { aggressor: 'CAE', victim: 'Angel', severity: 4 },
    { aggressor: 'CAE', victim: 'Angel', severity: 3 }
  ];
  const report = CareEngine.calculateAggressionScore(incidents);
  assert.strictEqual(report.totalIncidents, 2);
  assert.strictEqual(report.tensionScore, 30);
  assert.strictEqual(report.severityRating, 3.5);
  assert.strictEqual(report.hotspots['CAE'], 2);
  assert.strictEqual(report.pairingMatrix['CAE -> Angel'], 2);
});

// ======================================================================
// Summary
// ======================================================================
console.log('\n======================================================');
console.log(`Verification Summary: ${passCount} passed, ${failCount} failed.`);
console.log('======================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

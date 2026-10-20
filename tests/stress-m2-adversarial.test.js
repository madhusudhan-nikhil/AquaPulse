/**
 * AquaPulse Milestone 2 Adversarial Stress Test Suite
 * Executed independently by teamwork_preview_auditor_m2.
 * Challenges implicit assumptions, tests hostile input permutations, boundary values,
 * and extreme environmental stress.
 */

const assert = require('assert');
const FlowEngine = require('../src/engines/flow-engine.js');
const OptimizerEngine = require('../src/engines/optimizer-engine.js');
const MedicationEngine = require('../src/engines/medication-engine.js');
const DiagnosticsEngine = require('../src/engines/diagnostics-engine.js');
const CareEngine = require('../src/engines/care-engine.js');

let pass = 0;
let fail = 0;

function stress(title, fn) {
  try {
    fn();
    pass++;
    console.log(`  [PASS] ${title}`);
  } catch (err) {
    fail++;
    console.error(`  [FAIL] ${title}: ${err.message}`);
  }
}

console.log('================================================================');
console.log('AquaPulse Milestone 2 Adversarial Stress Testing');
console.log('================================================================\n');

// 1. FlowEngine Hostile Inputs
stress('Flow: Corrupt particle pool in updatePhysics ([null, undefined, 42, "str", {}])', () => {
  const corrupt = [null, undefined, 42, "corrupt", {}, { x: 100, y: 100, vx: -5, vy: 0, life: 10 }];
  const out = FlowEngine.updatePhysics(corrupt, 'current', { width: 800, height: 384 });
  assert.ok(Array.isArray(out));
  assert.strictEqual(out.length, 6);
  assert.ok(out[5].life === 11);
});

stress('Flow: Resolution larger than tank dimensions in calculateVelocityField', () => {
  const vf = FlowEngine.calculateVelocityField(800, 384, 'current', 2000);
  assert.ok(vf.vectors.length > 0);
  assert.strictEqual(vf.vectors[0].x, 0);
  assert.strictEqual(vf.vectors[0].y, 0);
});

stress('Flow: Massive particle array (10,000 particles) performance & non-leak check', () => {
  const t0 = Date.now();
  const pool = FlowEngine.initParticles(10000, 800, 384, 'current');
  FlowEngine.updatePhysics(pool, 'current', { width: 800, height: 384 });
  const elapsed = Date.now() - t0;
  assert.ok(elapsed < 200, `Large physics step took ${elapsed}ms, expected < 200ms`);
});

// 2. OptimizerEngine Hostile Inputs
stress('Optimizer: Sparse / malformed species list ([null, {}, { count: "bad" }])', () => {
  const roster = [null, {}, { count: "bad" }];
  let threwNullTypeError = false;
  try {
    OptimizerEngine.calculateSweetSpot(roster, { volumeNetL: -100 });
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('count')) {
      threwNullTypeError = true;
    } else {
      throw err;
    }
  }
  // Record this confirmed vulnerability for the adversarial audit report
  assert.strictEqual(threwNullTypeError, true, 'calculateDensityScore must be documented as failing on null species array elements');
});

stress('Optimizer: Fully disjoint multi-species biological gridlock', () => {
  const gridlock = [
    { name: 'Coldwater High-pH', tempMin: 12.0, tempMax: 16.0, phMin: 8.0, phMax: 8.5 },
    { name: 'Warm Soft-Water', tempMin: 28.0, tempMax: 32.0, phMin: 5.5, phMax: 6.2 }
  ];
  const res = OptimizerEngine.calculateSweetSpot(gridlock);
  assert.strictEqual(res.hasTempOverlap, false);
  assert.strictEqual(res.hasPhOverlap, false);
  assert.strictEqual(res.recommendedTemp, 25.5);
  assert.ok(res.conflicts.length >= 2);
});

stress('Optimizer: Fuzzy lookup handles uppercase, special symbols, and spacing', () => {
  const prof1 = OptimizerEngine.resolveSpeciesProfile({ name: "   kOi   Angelfish  " });
  assert.strictEqual(prof1.id, "koi-angelfish");

  const prof2 = OptimizerEngine.resolveSpeciesProfile({ name: "ALBINO CORYDORAS" });
  assert.strictEqual(prof2.id, "albino-corydoras");
  assert.strictEqual(prof2.scaleless, true);
});

// 3. MedicationEngine Hostile Inputs
stress('Medication: Unknown ailment / scenario fallback without uncaught exceptions', () => {
  const diag = MedicationEngine.diagnoseSymptoms('unknown-illness-xyz');
  assert.strictEqual(diag, null);

  const dose = MedicationEngine.calculateDose('unknownScenario', 'unknownMed', 100);
  assert.ok(dose !== null);
  assert.strictEqual(dose.unit, 'ml');
});

stress('Medication: Multiple concurrent contraindications (Scaleless + Invertebrates + Antibacterial)', () => {
  const mixedRoster = [
    { id: 'albino-corydoras', scaleless: true },
    { id: 'nerite-snail' }
  ];
  const res = MedicationEngine.calculateDose('ichMain', 'aquaSalt', 100, mixedRoster);
  // Both scaleless lock warning and salt prohibition warning should trigger
  assert.ok(res.warnings.some(w => w.includes('safety lock')));
  assert.ok(res.warnings.some(w => w.includes('DO NOT dose aquarium salt')));
});

// 4. DiagnosticsEngine Hostile Inputs
stress('Diagnostics: Mixed string-numeric and negative values in evaluateMetrics', () => {
  const weird = {
    nh3: "-0.5",
    no2: "0.25",
    no3: "150",
    temp: 35.5,
    ph: 5.2,
    gh: -5,
    kh: 0.5
  };
  const triage = DiagnosticsEngine.evaluateMetrics(weird);
  assert.strictEqual(triage.overallStatus, 'ACTION NEEDED');
  assert.ok(triage.alerts.length >= 4);
});

stress('Diagnostics: Identical and backwards log dates in analyzeParameterTrends', () => {
  // Identical timestamps (dt = 0)
  const logsIdentical = [
    { date: '2026-10-20T10:00:00Z', no3: 40, nh3: 0.1 },
    { date: '2026-10-20T10:00:00Z', no3: 20, nh3: 0.0 }
  ];
  const trend1 = DiagnosticsEngine.analyzeParameterTrends(logsIdentical);
  assert.ok(trend1.insights.length > 0);

  // Backwards timestamps
  const logsBackwards = [
    { date: '2026-10-15T10:00:00Z', no3: 40 },
    { date: '2026-10-20T10:00:00Z', no3: 20 }
  ];
  const trend2 = DiagnosticsEngine.analyzeParameterTrends(logsBackwards);
  assert.ok(trend2.insights.length > 0);
});

// 5. CareEngine Hostile Inputs
stress('Care: Malformed date strings and extreme durations in quarantine', () => {
  const quarBadDate = {
    active: true,
    startDate: 'invalid-date-string-here',
    durationDays: -5
  };
  const res = CareEngine.calculateQuarantineCountdown(quarBadDate);
  assert.ok(!Number.isNaN(res.daysElapsed));
  assert.ok(!Number.isNaN(res.percentage));
});

stress('Care: Out-of-bounds aggression severity values clamped safely to [1, 5]', () => {
  const extremeIncidents = [
    { aggressor: 'A', victim: 'B', severity: 999 },
    { aggressor: 'A', victim: 'B', severity: -50 }
  ];
  const report = CareEngine.calculateAggressionScore(extremeIncidents);
  // Severities should be clamped: 999 -> 5, -50 -> 1. Average = (5 + 1)/2 = 3.0
  assert.strictEqual(report.severityRating, 3.0);
  assert.strictEqual(report.tensionScore, 30);
});

console.log('\n================================================================');
console.log(`Adversarial Stress Summary: ${pass} passed, ${fail} failed.`);
console.log('================================================================\n');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

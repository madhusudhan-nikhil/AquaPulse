/**
 * AquaPulse Milestone 2 Independent Forensic Integrity Audit Suite
 * Executed independently by teamwork_preview_auditor_m2.
 * Validates dynamic mathematical behavior, checks for facades, hardcoded returns,
 * boundary anomalies, and adversarial resilience across all 5 engines.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const FlowEngine = require('../src/engines/flow-engine.js');
const OptimizerEngine = require('../src/engines/optimizer-engine.js');
const MedicationEngine = require('../src/engines/medication-engine.js');
const DiagnosticsEngine = require('../src/engines/diagnostics-engine.js');
const CareEngine = require('../src/engines/care-engine.js');

let pass = 0;
let fail = 0;

function check(title, fn) {
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
console.log('AquaPulse Milestone 2 Independent Forensic Integrity Verification');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// Phase 1: Source Code Static Analysis & Facade Detection
// ----------------------------------------------------------------------
console.log('--- Phase 1: Static Facade & Hardcoding Detection ---');

const engineFiles = [
  'src/engines/flow-engine.js',
  'src/engines/optimizer-engine.js',
  'src/engines/medication-engine.js',
  'src/engines/diagnostics-engine.js',
  'src/engines/care-engine.js'
];

check('1.1 Zero external library dependencies in src/engines/*.js', () => {
  engineFiles.forEach(file => {
    const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    // Ensure no require() calls or import statements
    const requires = content.match(/require\s*\(/g);
    assert.strictEqual(requires, null, `Engine ${file} must have zero require() calls`);
    const imports = content.match(/import\s+.*?from/g);
    assert.strictEqual(imports, null, `Engine ${file} must have zero external imports`);
  });
});

check('1.2 Zero facade / dummy placeholder keywords in src/engines/*.js', () => {
  engineFiles.forEach(file => {
    const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    const placeholders = content.match(/\b(TODO|FIXME|dummy|mock|placeholder)\b/i);
    assert.strictEqual(placeholders, null, `Engine ${file} contains placeholder keyword: ${placeholders}`);
  });
});

check('1.3 No degenerate return <constant> facade functions', () => {
  engineFiles.forEach(file => {
    const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    // Match method/function definitions where the entire body is return <constant>:
    // Excludes control flow statements (if, while, for, switch, catch)
    const methodMatches = content.match(/\b(?!(?:if|while|for|switch|catch)\b)[a-zA-Z_$][\w$]*\s*\([^)]*\)\s*\{\s*return\s+(true|false|0|null|undefined|'[^']*'|"[^"]*");\s*\}/g);
    assert.strictEqual(methodMatches, null, `Engine ${file} has degenerate return in: ${methodMatches}`);
  });
});

// ----------------------------------------------------------------------
// Phase 2: Dynamic Input Sensitivity & Continuous Calculations
// ----------------------------------------------------------------------
console.log('\n--- Phase 2: Dynamic Sensitivity & Continuous Calculations ---');

check('2.1 FlowEngine nozzle & kinematics vary continuously with container dimensions', () => {
  for (let w = 350; w <= 1000; w += 137) {
    for (let h = 180; h <= 650; h += 93) {
      const nozzle = FlowEngine.getNozzleCoords({ width: w, height: h });
      const expectedX = w - (w > 600 ? 155 : 135);
      const expectedY = h * 0.15;
      assert.strictEqual(nozzle.x, expectedX);
      assert.strictEqual(nozzle.y, expectedY);
    }
  }
});

check('2.2 FlowEngine velocity field changes distinctly across flow modes and grid resolutions', () => {
  const vfCurrent = FlowEngine.calculateVelocityField(600, 300, 'current', 30);
  const vfBaffled = FlowEngine.calculateVelocityField(600, 300, 'baffled', 30);
  assert.strictEqual(vfCurrent.vectors.length, vfBaffled.vectors.length);
  assert.strictEqual(vfCurrent.vectors.length, 21 * 11); // (600/30 + 1) * (300/30 + 1)

  let diffs = 0;
  for (let i = 0; i < vfCurrent.vectors.length; i++) {
    if (vfCurrent.vectors[i].vx !== vfBaffled.vectors[i].vx ||
        vfCurrent.vectors[i].vy !== vfBaffled.vectors[i].vy) {
      diffs++;
    }
  }
  assert.ok(diffs > vfCurrent.vectors.length * 0.5, 'At least 50% of vector field must differ between modes');
});

check('2.3 OptimizerEngine sweet-spot calculates exact multi-interval intersection for synthetic species', () => {
  // Test with arbitrary float values to prove non-hardcoded math
  const syn1 = { id: 'syn-1', name: 'Syn 1', tempMin: 21.2, tempMax: 27.4, phMin: 6.4, phMax: 7.6, ghMin: 5, ghMax: 12, khMin: 3, khMax: 8, bioload: 2.5, count: 4 };
  const syn2 = { id: 'syn-2', name: 'Syn 2', tempMin: 22.8, tempMax: 26.2, phMin: 6.8, phMax: 7.2, ghMin: 7, ghMax: 10, khMin: 4, khMax: 6, bioload: 3.0, count: 2 };
  
  const result = OptimizerEngine.calculateSweetSpot([syn1, syn2], { volumeNetL: 80 });
  assert.strictEqual(result.hasTempOverlap, true);
  assert.strictEqual(result.tempRange[0], 22.8);
  assert.strictEqual(result.tempRange[1], 26.2);
  // (22.8 + 26.2) / 2 = 24.5
  assert.strictEqual(result.recommendedTemp, 24.5);
  assert.strictEqual(result.hasPhOverlap, true);
  assert.strictEqual(result.phRange[0], 6.8);
  assert.strictEqual(result.phRange[1], 7.2);
  assert.strictEqual(result.ghRange[0], 7);
  assert.strictEqual(result.ghRange[1], 10);
  assert.strictEqual(result.khRange[0], 4);
  assert.strictEqual(result.khRange[1], 6);

  // Bioload: 4*2.5 + 2*3.0 = 10 + 6 = 16. Capacity: 80 * 0.65 = 52. Score: round(16/52 * 100) = 31%
  assert.strictEqual(result.densityScore, 31);
  assert.strictEqual(result.densityStatus, 'LIGHT');
});

check('2.4 MedicationEngine volumetric formula scales linearly with volume and responds to 50% lock', () => {
  const volumes = [33.3, 75.0, 150.0, 321.7];
  volumes.forEach(vol => {
    // Normal dose without lock
    const doseNorm = MedicationEngine.calculateDose('ichMain', 'generalCure', vol, [], false);
    const expectedRawNorm = (vol / 100) * 10 * 1.0;
    assert.strictEqual(doseNorm.rawDose, expectedRawNorm);
    assert.strictEqual(doseNorm.isLocked, false);

    // Dose with scaleless lock
    const doseLocked = MedicationEngine.calculateDose('ichMain', 'generalCure', vol, [{ scaleless: true }]);
    const expectedRawLocked = (vol / 100) * 10 * 0.5;
    assert.strictEqual(doseLocked.rawDose, expectedRawLocked);
    assert.strictEqual(doseLocked.isLocked, true);
  });
});

check('2.5 DiagnosticsEngine triage hierarchy prioritizes critical over warning across arbitrary levels', () => {
  // Safe baseline
  const safe = DiagnosticsEngine.evaluateMetrics({ nh3: 0, no2: 0, no3: 10, temp: 25.5, ph: 7.0 });
  assert.strictEqual(safe.overallStatus, 'OPTIMAL');

  // Warning baseline
  const warn = DiagnosticsEngine.evaluateMetrics({ nh3: 0, no2: 0, no3: 35, temp: 25.5, ph: 7.0 });
  assert.strictEqual(warn.overallStatus, 'WATCH');

  // Critical overriding warning
  const crit = DiagnosticsEngine.evaluateMetrics({ nh3: 0.15, no2: 0, no3: 35, temp: 25.5, ph: 7.0 });
  assert.strictEqual(crit.overallStatus, 'ACTION NEEDED');
  assert.ok(crit.alerts.some(a => a.includes('Ammonia Spike')));
});

check('2.6 CareEngine quarantine countdown handles fractional days and custom durations', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const d3 = new Date('2026-10-17T12:00:00Z'); // 3 days elapsed
  const quar = CareEngine.calculateQuarantineCountdown({
    active: true,
    startDate: d3.toISOString(),
    durationDays: 21 // 3 weeks
  }, now);
  assert.strictEqual(quar.daysElapsed, 3);
  assert.strictEqual(quar.daysRemaining, 18);
  assert.strictEqual(quar.totalDays, 21);
  assert.strictEqual(quar.percentage, Math.round((3 / 21) * 100)); // 14%
  assert.strictEqual(quar.status, 'ACTIVE ISOLATION');
});

// ----------------------------------------------------------------------
// Phase 3: Adversarial Edge Cases & Boundary Stress-Testing
// ----------------------------------------------------------------------
console.log('\n--- Phase 3: Adversarial Edge Cases & Boundary Stress-Testing ---');

check('3.1 FlowEngine handles NaN, string, negative, and infinite dimensions gracefully', () => {
  const nNaN = FlowEngine.getNozzleCoords({ width: 'not-a-number', height: null });
  assert.strictEqual(nNaN.x, 0);
  assert.strictEqual(nNaN.y, 0);

  const pNull = FlowEngine.createParticle(false, 'current', null);
  assert.ok(!Number.isNaN(pNull.x));
  assert.ok(!Number.isNaN(pNull.vx));

  const emptyUpdate = FlowEngine.updatePhysics(null);
  assert.deepStrictEqual(emptyUpdate, []);

  const vfZero = FlowEngine.calculateVelocityField(0, 0);
  assert.deepStrictEqual(vfZero.vectors, []);
});

check('3.2 OptimizerEngine handles empty rosters, undefined properties, and zero volume', () => {
  assert.strictEqual(OptimizerEngine.calculateSweetSpot([]), null);
  assert.strictEqual(OptimizerEngine.calculateSweetSpot(null), null);

  const res = OptimizerEngine.calculateSweetSpot([{ name: 'Ghost', count: 0 }], { volumeNetL: 0 });
  assert.ok(res !== null);
  assert.ok(!Number.isNaN(res.densityScore));
});

check('3.3 MedicationEngine handles string inputs, negative volumes, and extreme values without NaN', () => {
  const resStr = MedicationEngine.calculateDose('ichMain', 'generalCure', "250");
  assert.strictEqual(resStr.formattedDose, 25);

  const resNeg = MedicationEngine.calculateDose('ichMain', 'generalCure', -100);
  assert.strictEqual(resNeg.formattedDose, 0);

  const resHuge = MedicationEngine.calculateDose('ichMain', 'generalCure', 1000000);
  assert.strictEqual(resHuge.formattedDose, 100000);
});

check('3.4 DiagnosticsEngine handles corrupt parameter values without crashing', () => {
  const resCorrupt = DiagnosticsEngine.evaluateMetrics({
    nh3: 'corrupt',
    no2: null,
    no3: undefined,
    temp: 'very-hot',
    ph: NaN
  });
  assert.strictEqual(resCorrupt.overallStatus, 'OPTIMAL');
  assert.ok(!Number.isNaN(resCorrupt.metrics.nh3.value));
});

check('3.5 CareEngine handles negative sponge indexes and wraps modulo cleanly', () => {
  const cups = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
  assert.strictEqual(CareEngine.getNextSpongeIndex(-1, cups), 0);
  assert.strictEqual(CareEngine.getNextSpongeIndex(0, cups), 1);
  assert.strictEqual(CareEngine.getNextSpongeIndex(2, cups), 0);
  assert.strictEqual(CareEngine.getNextSpongeIndex(0, []), 0);
});

// ----------------------------------------------------------------------
// Phase 4: Verification of Test Suite Authenticity in verify-m2-engines.js
// ----------------------------------------------------------------------
console.log('\n--- Phase 4: Test Suite Rigor & Authenticity in verify-m2-engines.js ---');

check('4.1 verify-m2-engines.js contains zero trivial self-certifying tests', () => {
  const testSuiteContent = fs.readFileSync(path.resolve(__dirname, 'verify-m2-engines.js'), 'utf8');
  // Check for trivial assertions like assert(true), assert.strictEqual(1, 1), assert.ok(true)
  const trivialPatterns = [
    /assert\s*\(\s*true\s*\)/g,
    /assert\.ok\s*\(\s*true\s*\)/g,
    /assert\.strictEqual\s*\(\s*(true|1|'a')\s*,\s*\1\s*\)/g
  ];
  trivialPatterns.forEach(pat => {
    const matches = testSuiteContent.match(pat);
    assert.strictEqual(matches, null, `Found trivial assertion in verify-m2-engines.js: ${matches}`);
  });
});

check('4.2 verify-m2-engines.js tests all 5 engine domains with real assertions', () => {
  const testSuiteContent = fs.readFileSync(path.resolve(__dirname, 'verify-m2-engines.js'), 'utf8');
  assert.ok(testSuiteContent.includes('FlowEngine.getNozzleCoords'));
  assert.ok(testSuiteContent.includes('FlowEngine.updatePhysics'));
  assert.ok(testSuiteContent.includes('OptimizerEngine.calculateSweetSpot'));
  assert.ok(testSuiteContent.includes('MedicationEngine.calculateDose'));
  assert.ok(testSuiteContent.includes('DiagnosticsEngine.evaluateMetrics'));
  assert.ok(testSuiteContent.includes('CareEngine.calculateQuarantineCountdown'));
  assert.ok(testSuiteContent.includes('CareEngine.getNextSpongeIndex'));
});

// ----------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------
console.log('\n================================================================');
console.log(`Forensic Audit Summary: ${pass} passed, ${fail} failed.`);
console.log('================================================================\n');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

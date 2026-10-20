## 2026-10-20T17:03:36Z
You are teamwork_preview_worker_m2.
Your assigned working directory is: c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_worker_m2

MANDATORY FIRST STEP: Read c:\_Projects\Sample\AquaPulse\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Specifications to read:
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\orchestrator_main\PROJECT.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_codebase.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_spec_miner_survey_2\survey_spec.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_architecture.md

Your exclusive write ownership:
- c:\_Projects\Sample\AquaPulse\PROJECT.md (update root PROJECT.md milestone table: M1=DONE, M2=IN_PROGRESS)
- src/engines/flow-engine.js
- src/engines/optimizer-engine.js
- src/engines/medication-engine.js
- src/engines/diagnostics-engine.js
- src/engines/care-engine.js
- tests/verify-m2-engines.js

Task Details (Milestone 2: Pure Biological & Hydrodynamic Calculation Engines):
Implement the 5 pure calculation engines with zero DOM/browser dependencies so they are 100% headless testable:

1. src/engines/flow-engine.js:
   - Pure math simulation for straight jet ('current') and baffled convection ('baffled') hydrodynamic modes.
   - Vector kinematics: current mode (vx in [-4.2, -9.4], vertical buoyancy vy -= 0.018, left pane deflection vx *= 0.6, vy += 0.75), baffled mode (convection loop: bottom vx += 0.045, top vx -= 0.02, vy += 0.01).
   - Functions: initParticles(count, width, height), updateParticles(particles, mode, width, height, dt), calculateVelocityField(width, height, mode, resolution), getStreamlines(mode, width, height).

2. src/engines/optimizer-engine.js:
   - Complete 16-species biological database (SPECIES_DATABASE) with environmental tolerances, optimal points, flow preferences, scaleless flags, sensitivities.
   - Overlap intersection math: temp [max(Tmin), min(Tmax)], pH [max(pHmin), min(pHmax)], GH [max(3, max(GHmin)), min(15, min(GHmax))], KH [max(2, max(KHmin)), min(8, min(KHmax))].
   - Flow dynamics recommendation: analyzes low-flow vs high-flow species count; recommends '45° Glass-Baffled Return Recommended' if mixed.
   - Conflict detection: identifies incompatible species pairs.
   - Functions: calculateSweetSpot(speciesList, tankSpecs), getSpecies(id), getAllSpecies(), calculateDensityScore(speciesList, volumeNetL).

3. src/engines/medication-engine.js:
   - Complete symptom database (SYMPTOM_DATABASE: ich, finrot, bloat, nipping, gasping) and treatment scenario mapping.
   - Scaleless fish safety lock: identifies scaleless species (corydoras, tetras), applies 50% lock factor (lockFactor = 0.5) on General Cure.
   - Copper toxicity lock: identifies copper contraindications for invertebrates (nerite snails).
   - Hospital tank isolation recommendation for antibacterials.
   - Dosing calculation: Dose = (volumeNetL / 100) * ratePer100L * doseFactor.
   - Functions: diagnoseSymptoms(symptomId), calculateDose(scenarioId, medId, volumeNetL, activeSpeciesList, useLock), getMedication(medId), getAllMedications().

4. src/engines/diagnostics-engine.js:
   - 3-tier status evaluation: Safe/Optimal, Warning/Watch, Critical/Action Needed for NH3, NO2, NO3, pH, Temp, GH, KH.
   - Automated clinical prescriptions: emergency 50% water change (0.5 * volumeNetL) and conditioner dose (0.10 ml/L of emergency volume) when NH3 > 0.
   - Trend anomaly analysis: detects nitrate accumulation rate (>10 ppm in <=7 days), ammonia spikes from 0, and temperature swings >= 1.5°C.
   - Functions: evaluateMetrics(metrics, targets), generatePrescription(entry, targets, tankVolume), analyzeTrends(logs, targets).

5. src/engines/care-engine.js:
   - 14-day quarantine countdown math: elapsed days, remaining days, percentage, status ('Active Isolation', 'Treatment Window', 'Clearance Evaluation', 'Ready for Main Tank').
   - Alternating dual-canister sponge rinse tracking: alternating index (0 or 1), days since last rinse, next recommended canister.
   - Feeding schedule matrix: day-of-week meal allocation, soak timer calculation for freeze-dried food, fasting day indicators.
   - Social aggression incident scoring: severity rating (1-5), territorial hot-spot tracking, pairing tension matrix.
   - Functions: calculateQuarantineProgress(startDate, durationDays), getNextSpongeRinse(history, canisters), getDailyFeedingPlan(schedule, dayOfWeek), calculateAggressionScore(incidents).

6. Verification:
   - Write tests/verify-m2-engines.js and execute it via Node.
   - Run the full project test suite: node tests/run-tests.js.
   - Confirm 100% test pass.
7. Write handoff.md in your working directory and notify the parent orchestrator via send_message.

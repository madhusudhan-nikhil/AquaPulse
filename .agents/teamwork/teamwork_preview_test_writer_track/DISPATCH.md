## 2026-10-20T16:26:48Z
You are teamwork_preview_test_writer_track.
Your assigned working directory is: c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_test_writer_track

MANDATORY FIRST STEP: Read c:\_Projects\Sample\AquaPulse\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Specifications to read:
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\orchestrator_main\TEST_INFRA.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\orchestrator_main\PROJECT.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_spec_miner_survey_2\survey_spec.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_codebase.md

Your exclusive write ownership:
- tests/run-tests.js
- tests/tier1-features.test.js
- tests/tier2-boundaries.test.js
- tests/tier3-combinations.test.js
- tests/tier4-scenarios.test.js
- TEST_READY.md (publish at c:\_Projects\Sample\AquaPulse\TEST_READY.md when test suite is fully authored and passing)

Task Details (E2E Testing Track - Test Suite Construction):
Design and build the comprehensive, opaque-box, requirement-driven automated test suite across Tiers 1-4:
1. Build tests/run-tests.js:
   - Zero-dependency Node.js test runner.
   - Dynamically loads and runs tests from tier1, tier2, tier3, tier4.
   - Formats clear console reports with passing/failing tests, execution time, and summary statistics.
   - Exits with 0 when all tests pass, or 1 if any test fails.
2. Implement tests/tier1-features.test.js:
   - Feature coverage: >=5 tests per feature across all 10 features (>=50 tests total).
   - Test F01 (Config precedence & deep merge, lenient parsing, JSON/CSV export/import).
   - Test F02 (Reactive store mutation, state events, multi-tank scoping).
   - Test F03 (Plugin registry lifecycle, mount/unmount contract, telemetry provider interface).
   - Test F04 (Flow physics velocity vectors, straight jet vs baffled convection calculations).
   - Test F05 (Sweet-spot parameter optimizer, overlap math, 16 species tolerance intersection).
   - Test F06 (Visual symptom checker, 50% safety lock factor for scaleless species, copper bans).
   - Test F07 (Diagnostics 3-tier status evaluation Safe/Warning/Critical, emergency water change & conditioner formulas).
   - Test F08 (Care routines: 14-day quarantine countdown math, alternating sponge rinse index, feeding matrix).
   - Test F09 (Social aggression incident recording, multi-tank isolation, territory score).
   - Test F10 (Vital signs status derivation and threshold checks).
3. Implement tests/tier2-boundaries.test.js:
   - Boundary & corner cases: >=5 tests per feature (>=50 tests total).
   - Zero volumes, negative values, extreme temperatures (below freezing, above boiling), invalid pH (<0, >14), massive nitrate values, empty species lists, conflicting incompatible species (no overlap), corrupted JSON strings (curly quotes, unclosed comments, trailing commas), unknown scenario IDs.
4. Implement tests/tier3-combinations.test.js:
   - Pairwise cross-feature interactions: e.g. Config import with custom species -> sweet spot optimization -> target parameter update; Symptom diagnosis -> scaleless safety lock -> medication dose calculation; Emergency ammonia spike -> diagnostic prescription -> water change task creation -> parameter log update.
5. Implement tests/tier4-scenarios.test.js:
   - 5 comprehensive real-world application scenarios:
     * S01: New tank setup & stocking sweet-spot derivation
     * S02: Ammonia spike emergency response & remediation
     * S03: Disease outbreak, scaleless safety lock & 14-day quarantine tracking
     * S04: Multi-tank switching & complete data isolation
     * S05: Contributor custom sensor plugin dynamic registration & telemetry ingestion
6. As the core implementation modules are written in src/core and src/engines, verify the test runner executes cleanly.
7. Once the suite is ready, publish c:\_Projects\Sample\AquaPulse\TEST_READY.md matching the template in PROJECT.md/TEST_INFRA.md.
8. Write handoff.md in your working directory and notify the parent orchestrator via send_message.

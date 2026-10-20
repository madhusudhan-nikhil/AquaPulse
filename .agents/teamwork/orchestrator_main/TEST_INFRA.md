# E2E Test Infra: AquaPulse

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Tests are derived strictly from user requirements (R1–R5) and authoritative specifications, validating external behavior and outputs without depending on internal implementation details.
- **Methodology**: Systematic 4-Tier Test Design:
  1. Category-Partition Equivalence Class testing (Tier 1: Feature Coverage, >=5 per feature).
  2. Boundary Value Analysis (Tier 2: Boundary & Corner Cases, >=5 per feature).
  3. Pairwise Combinatorial Interaction testing (Tier 3: Cross-Feature Interactions).
  4. Real-World Workload Testing (Tier 4: Realistic Multi-Step Application Scenarios).
  5. White-Box Adversarial Coverage Hardening (Tier 5: Code coverage analysis and edge-case probing).

---

## Feature Inventory & Test Matrix

| # | Feature | Source | Tier 1 (>=5) | Tier 2 (>=5) | Tier 3 | Tier 4 |
|---|---------|--------|:------------:|:------------:|:------:|:------:|
| F01 | Config Layer (Precedence, Merge, Export/Import, Comments) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| F02 | Decoupled State & Multi-Tank Storage Isolation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F03 | Plugin Registry & Telemetry HAL | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F04 | Flow Physics Simulation (Jet & Baffled Modes) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F05 | Sweet-Spot Parameter Derivation Engine (16 species) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F06 | Visual Symptom Checker & 50% Medication Safety Lock | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F07 | Water Parameter Diagnostics, Status Triage & Trends | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F08 | Care Hub (Feeding Matrix, Sponge Rinse, 14-Day Quarantine) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F09 | Social Aggression Logger & Incident Scoring | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F10 | Above-the-fold Vital Signs Strip & Responsive Presentation | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |

**Total Planned Tests**:
- Tier 1: 50 tests (5 per feature × 10 features)
- Tier 2: 50 tests (5 boundary/corner cases × 10 features)
- Tier 3: 12 pairwise cross-feature combination tests
- Tier 4: 5 realistic application-level scenarios
- **Minimum Target: 117 tests**

---

## Test Architecture

### 1. Test Runner
- **Location**: `tests/run-tests.js`
- **Invocation**: `node tests/run-tests.js`
- **Semantics**: Executes all test suites sequentially, prints formatted progress per suite, and exits with code 0 on complete pass (or code 1 on failure).
- **Zero-Dependency**: Uses native Node.js assertion and execution capabilities so no third-party npm package installation is needed.

### 2. Headless Browser / DOM Verification
- **Location**: `tests/verify-e2e.js`
- **Invocation**: `node tests/verify-e2e.js`
- **Verification Scope**: Verifies clean loading of `index.html` and `AquaPulse.html`, DOM structure initialization, above-the-fold visibility of the 7-metric vital signs strip, absence of uncaught console errors, and successful tab navigation.

---

## Real-World Application Scenarios (Tier 4)

| # | Scenario | Features Exercised | Description |
|---|----------|--------------------|-------------|
| S01 | New Tank Setup & Stocking Workflow | F01, F02, F05, F07 | User loads 120L demo config, adds Denison Barbs and Corydoras, derives sweet-spot environmental bounds, updates targets, and verifies target synchronization. |
| S02 | Ammonia Spike Emergency Care Response | F02, F07, F08, F10 | Simulated telemetry injects NH3 = 0.5 ppm. Vital signs strip transitions to CRITICAL; automated clinical prescription generates 50% water change and prime dosage; user executes and logs water change. |
| S03 | Disease Outbreak & Scaleless Safety Quarantine | F02, F06, F08 | Sickness detected (Ich/Fin rot). Diagnostic system prescribes General Cure; 50% safety lock engages for Corydoras; user activates 14-day quarantine tank tracker with daily observation logs. |
| S04 | Multi-Tank Switch & Data Isolation Verification | F01, F02, F08, F09 | User switches from 255L Community tank to 60L Nano Betta tank. Verifies social incidents, sponge rinse index, and parameter history remain completely isolated without cross-contamination. |
| S05 | Contributor Plugin & Telemetry Stream | F03, F07, F10 | Dynamic registration of a third-party sensor plugin (`ORP Sensor Widget`) into the AppShell; feeds data through Telemetry HAL; verifies UI mounting, real-time updates, and clean unmounting. |

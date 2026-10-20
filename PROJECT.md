# Project: AquaPulse Modular Architectural Overhaul & Responsive Experience

## Architecture

AquaPulse is organized into a clean, 4-tier decoupled architecture designed for high testability, zero runtime build dependencies, and seamless extensibility:

1. **Tier 1: Core Foundation & Decoupled State Management**
   - `AquaPulseStore`: Centralized, predictable reactive state store using JavaScript `Proxy` for mutation interception, decoupled from DOM rendering. Provides multi-tank isolated storage keys (`aquapulse_<tankId>_*`).
   - `EventBus`: Global publish-subscribe event bus (`emit`, `on`, `off`) mediating communication between decoupled components.
   - `ConfigManager`: Implements the 3-tier configuration precedence model (`AQUAPULSE_DEFAULT_CONFIG` -> `AQUAPULSE_PRIVATE_CONFIG` -> `localStorage`), recursive deep merge with array replacement, git-ignored privacy isolation, lenient JSON parsing, and JSON/CSV export/import.
   - `PluginRegistry`: Lifecycle management (`register`, `mount`, `unmount`, `update`) for community plugins, sensors, and calculators.

2. **Tier 2: Pure Biological & Hydrodynamic Calculation Engines**
   - `FlowEngine`: Pure math and physics engine for straight jet (`current`) and baffled convection (`baffled`) hydrodynamic simulation, particle vectors, velocity fields, and boundary collisions.
   - `OptimizerEngine`: 16-species biological database, mathematical overlap calculations ($[\max(T_{\min}), \min(T_{\max})]$, pH, GH, KH), flow preference matching, and conflict diagnosis.
   - `MedicationEngine`: Symptom database, treatment scenario mappings, 50% safety lock for scaleless species (Corydoras, tetras), copper toxicity bans for invertebrates (Nerite snails), and volumetric dosage calculations.
   - `DiagnosticsEngine`: 3-tier status evaluation (Safe/Optimal, Warning/Watch, Critical/Action Needed), emergency water change / conditioner dosing math, and rate-of-change trend detection.
   - `CareEngine`: 14-day quarantine countdown math, alternating dual-canister sponge rinse tracking, and feeding schedule matrix.

3. **Tier 3: Telemetry Abstraction Layer (HAL)**
   - `ITelemetryProvider` interface defining standard telemetry packet ingestion (`timestamp`, `tankId`, `metrics`, `status`).
   - Standard providers: `ManualLogProvider`, `SimulatedTelemetryProvider`, and `IoTBridgeProvider` (WebSocket/MQTT ready).

4. **Tier 4: Presentation Shell & Dynamic UI Modules**
   - `AppShell`: Responsive layout container with mobile drawer, tab switcher, and custom in-DOM modal dialog system (eliminating blocking `window.prompt()` / `window.alert()`).
   - `VitalSignsStrip`: Above-the-fold 7-metric vital signs status strip (NH3, NO2, NO3, pH, Temp, GH, KH) with 3-tier color-coded triage (Safe, Warning, Critical) visible without scrolling.
   - `FlowCanvas`: Multi-layer HTML5 Canvas visualizer (streamlines, velocity heatmap, biological presence, caustics, bubbles) with layer controls, smooth container resize adaptation, and visibility-aware render throttling.
   - Specialized UI Modules: `ParamLoggerComponent`, `SpeciesOptimizerComponent`, `SymptomCheckerComponent`, `CareHubComponent`, and `SocialLoggerComponent`.

---

## Feature Inventory

Every feature from user requirements (R1–R5) and the 3 survey investigations is cataloged below with its assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | Config Layer & R4 Continuity | 3-tier configuration ingestion (`aquapulse.config.js`, `aquapulse.private.js`, localStorage), recursive deep merge, array replacement, git-ignored privacy isolation, lenient JSON parsing, and JSON/CSV export/import. | M1 | ORIGINAL_REQUEST §R4, survey_spec |
| F02 | Reactive Store & Event Bus | Centralized predictable state management store (Proxy-based) decoupled from DOM rendering, multi-tank scoping (`aquapulse_<tankId>_*`), and event pub/sub lifecycle. | M1 | ORIGINAL_REQUEST §R1, survey_architecture |
| F03 | Plugin System & Telemetry HAL | Dynamic plugin/widget architecture (`IPlugin` contract: `id`, `name`, `category`, `mount`, `unmount`, `update`) and Telemetry Hardware Abstraction Layer. | M1 | ORIGINAL_REQUEST §R1, survey_architecture |
| F04 | Flow Physics Engine | Pure calculation engine for straight jet (`current`) and baffled convection (`baffled`) hydrodynamic modes, particle kinematics, and vector fields. | M2 | ORIGINAL_REQUEST §R3, survey_codebase |
| F05 | Sweet-Spot Parameter Optimizer | 16-species biological database, mathematical overlap calculations ($[\max(T_{\min}), \min(T_{\max})]$, pH, GH, KH), flow preference matching, and conflict diagnosis. | M2 | ORIGINAL_REQUEST §R3, survey_spec |
| F06 | Symptom Diagnostic & Med Safety Lock | Diagnostic symptom database (5 conditions), treatment mappings, 50% safety lock for scaleless species, copper bans for invertebrates, and volumetric dosage math. | M2 | ORIGINAL_REQUEST §R3, survey_spec |
| F07 | Diagnostics & Trend Analysis Engine | 3-tier status evaluation (Safe/Optimal, Warning/Watch, Critical/Action Needed), emergency water change / conditioner dosage math, and rate-of-change anomaly detection. | M2 | ORIGINAL_REQUEST §R2, §R3, survey_spec |
| F08 | Care, Quarantine & Social Logic | 14-day quarantine countdown math, alternating dual-canister sponge rinse tracking, feeding matrix calculations, and social aggression scoring. | M2 | ORIGINAL_REQUEST §R3, survey_codebase |
| F09 | Responsive Shell & In-DOM Dialogs | Responsive layout shell (desktop, tablet, mobile), tab/drawer navigation, and custom accessible modal dialogs replacing blocking `prompt()` / `alert()`. | M3 | ORIGINAL_REQUEST §R2, survey_architecture |
| F10 | Above-the-Fold Vital Signs Strip | 7-metric vital signs status strip (NH3, NO2, NO3, pH, Temp, GH, KH) with 3-tier triage badges (Safe, Warning, Critical) visible without scrolling on standard displays. | M3 | ORIGINAL_REQUEST §R2, survey_architecture |
| F11 | Responsive Multi-Layer Flow Canvas | Multi-layer canvas visualizer (streamlines, velocity heatmap, biological presence, caustics, bubbles) with layer toggles, container auto-fit, and visibility-aware render loop. | M3 | ORIGINAL_REQUEST §R2, §R3, survey_architecture |
| F12 | Parameter Logger & SVG Trend Curves | Interactive parameter logging form, historical log table, dynamic SVG trend curves (sparklines and 7-day/30-day views), and automated clinical prescriptions. | M4 | ORIGINAL_REQUEST §R2, §R3, survey_codebase |
| F13 | Inhabitants Optimizer View | Interactive species selection, population density tally, ecological tolerance overlap chart, flow dynamics recommendation, and one-click target derivation. | M4 | ORIGINAL_REQUEST §R3, survey_codebase |
| F14 | Symptom Diagnostic & Dosing UI | Visual symptom checker interface, disease profile cards, hospital tank scenario switch, sensitive species safety lock toggle, and volumetric dose display. | M4 | ORIGINAL_REQUEST §R3, survey_spec |
| F15 | Care Hub (Feeding, Filter & Quarantine) | Interactive feeding matrix with soak timer, alternating dual-canister maintenance checklist, and quarantine 14-day countdown visual progress tracker. | M4 | ORIGINAL_REQUEST §R2, §R3, survey_architecture |
| F16 | Social Aggression Incident Logger | Multi-tank scoped incident logging table, offender/victim dropdowns, severity rating, and territorial conflict insights with custom in-DOM modal. | M4 | ORIGINAL_REQUEST §R3, survey_codebase |
| F17 | Telemetry Feeds & Custom Plugin Demo | Live telemetry simulation feed, manual log bridge, and a working demo plugin registering a custom widget via the plugin architecture. | M4 | ORIGINAL_REQUEST §R1, survey_architecture |
| F18 | Architectural Spec & Extension Guide | Full architectural blueprint, state flow diagrams, module/plugin interfaces, UI component hierarchy, and step-by-step developer extension guides (R5). | M5 | ORIGINAL_REQUEST §R5 |
| F19 | E2E Testing Suite (Tiers 1–4) | Requirement-driven automated test suite across Feature Coverage (Tier 1), Boundary Cases (Tier 2), Cross-Feature Pairs (Tier 3), and Real-World Scenarios (Tier 4). | Testing Track | ORIGINAL_REQUEST Acceptance Criteria |
| F20 | Final Integration & Tier 5 Hardening | 100% E2E test suite passing, headless browser page loading without console errors, and adversarial test coverage hardening (Tier 5). | M6 | ORIGINAL_REQUEST Acceptance Criteria |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Foundation & Decoupled State | Centralized reactive store, EventBus, ConfigManager (3-tier config, deepMerge, lenient JSON, export/import), and PluginRegistry. | none | DONE |
| M2 | Pure Calculation Engines | Pure headless engines with zero DOM dependencies: FlowEngine, OptimizerEngine (16 species), MedicationEngine (50% lock), DiagnosticsEngine (3-tier triage), and CareEngine. | M1 | DONE |
| M3 | UI Presentation Shell & Responsive Visualizer | Responsive AppShell, in-DOM dialogs, above-the-fold VitalSignsStrip (7 metrics), and responsive FlowCanvas with layer toggles and visibility throttling. | M1, M2 | PLANNED |
| M4 | Care Hub, Diagnostics, Plugins & Prototype Overhaul | ParamLogger with SVG trend curves, SpeciesOptimizer view, SymptomChecker UI, CareHub (feeding, filter, quarantine), SocialLogger, and working sample plugin. | M2, M3 | PLANNED |
| M5 | Architectural Specification & Extension Guide | Comprehensive documentation in `docs/ARCHITECTURE.md`, `docs/EXTENSION_GUIDE.md`, and updated `README.md`. | M1, M2, M3, M4 | PLANNED |
| M6 | Final Verification, 100% E2E Pass & Tier 5 Hardening | Pass 100% of E2E test suite published by E2E Testing Track, headless browser validation without console errors, and Tier 5 adversarial hardening. | M4, E2E Test Suite | PLANNED |

*In parallel: E2E Testing Track independently designs and publishes the full automated test suite (Tiers 1–4) and creates `TEST_READY.md`.*

---

## Interface Contracts

### 1. `ConfigManager` ↔ Core / Plugins
- `ConfigManager.loadConfig()`: Ingests `AQUAPULSE_DEFAULT_CONFIG`, merges `AQUAPULSE_PRIVATE_CONFIG` via deep-merge with array replacement, loads active overrides from `localStorage['aquapulse_active_config']`. Returns unified config object.
- `ConfigManager.exportJSON()`: Returns formatted JSON string with smart quotes stripped and validated keys.
- `ConfigManager.importJSON(rawText)`: Parses string using `lenientParseJSON`, validates `tank`, `species`, `medicines`, updates active config, emits `config:updated`.
- `ConfigManager.exportCSV(paramsList)`: Serializes log records into standard CSV format.

### 2. `AquaPulseStore` ↔ Engines & UI Components
- `store.getState(path)`: Returns immutable slice of state.
- `store.setState(path, value)`: Updates state slice, persists to tank-scoped storage key, emits `state:changed` event via `EventBus`.
- `store.getScopedKey(suffix)`: Returns `aquapulse_${tankId}_${suffix}` ensuring strict multi-tank isolation.

### 3. `OptimizerEngine` ↔ Presentation
- `OptimizerEngine.calculateSweetSpot(speciesList, tankSpecs)`:
  - Input: Array of species objects or IDs, tank volume, filter LPH.
  - Returns: `{ tempRange: [min, max], phRange: [min, max], ghRange: [min, max], khRange: [min, max], recommendedFlow: string, conflicts: Array<string>, densityScore: number }`.

### 4. `MedicationEngine` ↔ Presentation
- `MedicationEngine.calculateDose(scenarioId, medId, volumeNetL, activeSpeciesList, useLock)`:
  - Returns: `{ rawDose: number, unit: string, doseFactor: number, isLocked: boolean, warnings: Array<string>, instructions: string }`.

### 5. `DiagnosticsEngine` ↔ VitalSigns & Logger
- `DiagnosticsEngine.evaluateMetrics(currentValues, targets)`:
  - Input: Current metric values `{ nh3, no2, no3, ph, temp, gh, kh }` and target thresholds.
  - Returns: `{ overallStatus: 'OPTIMAL' | 'WATCH' | 'ACTION NEEDED', metrics: { [key]: { value, status: 'safe' | 'warning' | 'critical', message } }, prescriptions: Array<string> }`.

### 6. `IPlugin` Contract
- Each plugin must implement:
  ```javascript
  {
    id: string,
    name: string,
    category: 'calculator' | 'sensor' | 'widget' | 'care',
    mount: (containerElement, context) => void,
    unmount: () => void,
    update?: (state) => void
  }
  ```

---

## Code Layout

```
c:\_Projects\Sample\AquaPulse\
├── index.html                   # Modernized modular dashboard entry point
├── AquaPulse.html               # Backward-compatible entry point
├── aquapulse.config.js          # Default 120L community demo config (preserved)
├── aquapulse.private.js         # Git-ignored private 255L command config (preserved)
├── src/
│   ├── core/
│   │   ├── store.js             # Reactive store with multi-tank scoping
│   │   ├── event-bus.js         # Decoupled publish/subscribe bus
│   │   ├── config-manager.js    # 3-tier config loader, deep-merge, export/import
│   │   └── plugin-registry.js   # Plugin lifecycle manager
│   ├── engines/
│   │   ├── flow-engine.js       # Pure hydrodynamic physics & particle math
│   │   ├── optimizer-engine.js  # 16-species biological database & sweet-spot math
│   │   ├── medication-engine.js # Symptom database & 50% safety lock formulas
│   │   ├── diagnostics-engine.js# 3-tier status triage & trend analysis
│   │   └── care-engine.js       # Quarantine countdown, filter checklist, feeding matrix
│   ├── telemetry/
│   │   ├── telemetry-hal.js     # Hardware Abstraction Layer
│   │   └── providers/           # Simulated, Manual, and IoT providers
│   ├── ui/
│   │   ├── app-shell.js         # Layout shell, navigation drawer, accessible dialogs
│   │   ├── modal-manager.js     # In-DOM modal manager replacing prompt/alert
│   │   └── components/
│   │       ├── vital-signs-strip.js # Above-the-fold 7-metric status bar
│   │       ├── flow-canvas.js       # Multi-layer hydrodynamic visualizer
│   │       ├── param-logger.js      # Parameter logging & SVG trend curves
│   │       ├── species-optimizer.js # Inhabitants sweet-spot optimizer UI
│   │       ├── symptom-checker.js   # Visual symptom diagnostic & dosing UI
│   │       ├── care-hub.js          # Feeding matrix, filter checklist, quarantine
│   │       └── social-logger.js     # Social aggression incident logger
│   └── plugins/
│       └── sample-sensor-plugin.js  # Verified sample plugin demonstrating extensibility
├── tests/
│   ├── run-tests.js             # Standalone test runner (Node.js test suite)
│   ├── tier1-features.test.js   # Tier 1: Feature Coverage (>=50 tests)
│   ├── tier2-boundaries.test.js # Tier 2: Boundary & Corner Cases (>=50 tests)
│   ├── tier3-combinations.test.js # Tier 3: Pairwise Cross-Feature Tests
│   ├── tier4-scenarios.test.js  # Tier 4: Real-World Application Workloads
│   └── verify-e2e.js            # Headless browser validation script
├── docs/
│   ├── ARCHITECTURE.md          # Comprehensive architectural specification (R5)
│   └── EXTENSION_GUIDE.md       # Step-by-step contributor extension guide (R5)
└── assets/                      # Preserved icons, diagrams, styles
```

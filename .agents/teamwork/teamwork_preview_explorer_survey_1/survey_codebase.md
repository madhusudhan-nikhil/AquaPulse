# Comprehensive Codebase Survey & Architectural Analysis: AquaPulse

**Author:** `teamwork_preview_explorer_survey_1` (Explorer & Synthesis Specialist)  
**Date:** 2026-10-20  
**Target Repository:** `c:\_Projects\Sample\AquaPulse`  
**Integrity Mode:** Development / Read-Only Investigation  

---

## Executive Summary

AquaPulse is a zero-dependency, client-side aquarium command and ecosystem management dashboard. It aims to unify water chemistry tracking, interactive hydrodynamic flow simulation, livestock compatibility analysis, targeted feeding maps, medication dosage calculations with scaleless species safety locks, quarantine management, and social aggression logging.

While functionally rich and visually distinctive, the current implementation is heavily constrained by an unmodularized, monolithic architecture centered around a 2,714-line `AquaPulse.html` file. Application logic, DOM manipulation, state persistence, Canvas physics rendering, and business rules are tightly coupled across global namespaces (`window.*`), inline event handlers (`onclick`), un-scoped `localStorage` keys, and primitive browser dialogs (`prompt()`, `alert()`). 

This survey delivers an exhaustive enumeration of all files, an architectural breakdown, complete technical documentation of all six core features (with physics, formulas, and data structures), and a detailed inventory of architectural pain points, state coupling hazards, and performance bottlenecks to inform the subsequent overhaul phases.

---

## 1. Inventory of Codebase Assets, Scripts, Styles & Entry Points

The codebase consists of 8 files and 1 binary asset in the project root and assets directory:

| File Path | Size (Bytes) | Lines | Type / Role | Key Dependencies / Exports |
|:---|:---|:---|:---|:---|
| `AquaPulse.html` | 153,796 | 2,714 | Primary Application Entry Point, DOM Structure, Embedded Styles & Procedural App Logic | Tailwind CDN (`https://cdn.tailwindcss.com`), loads all local JS scripts, manages all tabs and modal views |
| `aquapulse.config.js` | 13,760 | 393 | Public Default Demo Configuration Template (120L Community Tank) | Exports `window.AQUAPULSE_DEFAULT_CONFIG` |
| `aquapulse.private.js` | 22,570 | 552 | Git-Ignored Personal Setup Override Configuration (255L Ecosystem) | Exports `window.AQUAPULSE_PRIVATE_CONFIG` (Deep-merged at boot) |
| `aquapulse.optimizer.js` | 22,896 | 554 | Inhabitants Biological Tolerance Database & Sweet-Spot Derivation Engine | Exports `window.AquaPulseOptimizer` (Contains `SPECIES_DATABASE`, analytical math, and DOM modal renderer) |
| `aquapulse.intelligence.js` | 19,829 | 422 | Aquatic Intelligence: Symptom Checker, Quarantine Tracker, Aggression Logger & Predictive Engine | Exports `window.AquaPulseIntelligence` (Contains `SYMPTOM_DATABASE`, trend analytics, modal renderers) |
| `aquapulse.flow.js` | 24,566 | 750 | Canvas 2D Hydrodynamic Flow Physics, Procedural Hardscape & Fish Strata Simulator | Exports `window.AquaPulseFlow` (Canvas animation loop, particle physics, caustics, layer toggles) |
| `assets/aquapulse-banner.jpg` | 1,056,206 | N/A | Hero Showcase Banner Image (Binary Asset, JPEG) | Referenced in `README.md` |
| `README.md` | 8,822 | 121 | Project Documentation, Phase Summary & Customization Manual | Markdown documentation |
| `.gitignore` | 72 | 3 | Version Control Exclusion Rules | Ignores `aquapulse.private.js` |

---

## 2. In-Depth Architectural Analysis

### 2.1 The Monolithic Entry Point (`AquaPulse.html`)

`AquaPulse.html` functions simultaneously as the view definition, style sheet, script loader, layout manager, and primary controller:
1. **Script Ingestion Order**:
   In `<head>` (lines 8–29):
   - `aquapulse.config.js` is loaded first, populating `window.AQUAPULSE_DEFAULT_CONFIG`.
   - `aquapulse.private.js` is loaded second, populating `window.AQUAPULSE_PRIVATE_CONFIG` if present.
   - An inline IIFE executes a recursive `deepMerge`:
     ```javascript
     function deepMerge(target, source) {
       for (const key of Object.keys(source)) {
         if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && 
             target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
           deepMerge(target[key], source[key]);
         } else {
           target[key] = source[key];
         }
       }
       return target;
     }
     window.AQUAPULSE_DEFAULT_CONFIG = deepMerge(window.AQUAPULSE_DEFAULT_CONFIG, window.AQUAPULSE_PRIVATE_CONFIG);
     ```
   - Subsequently, `aquapulse.optimizer.js`, `aquapulse.intelligence.js`, and `aquapulse.flow.js` are executed.
2. **Inline Tailwind Configuration & Styling**:
   - Lines 30–70 define custom colors (`aqua-300` to `aqua-950`) and CSS classes (`.glass-card`, `.tank-glass`, `.tab-active`).
   - The runtime Tailwind CDN script scans classes dynamically, incurring runtime compilation overhead.
3. **DOM Layout Structure**:
   - Sticky Top Header with telemetry pills and navigation tabs (`#tab-btn-tank`, `#tab-btn-feeding`, `#tab-btn-species`, `#tab-btn-care`).
   - Main container with 4 top-level sections:
     - `#tab-tank`: Tank simulator canvas container (680px), overlay hardware modules, 5 interactive feeding drop pins (Zones A, B, C, D, E), and 3 lower inspection cards.
     - `#tab-feeding`: Food cards grid (`#foods-grid-container`) and 7-day feeding schedule.
     - `#tab-species`: Species roster cards (`#species-grid`) and filter controls.
     - `#tab-care`: Unified Care Hub containing sub-views for Weekly Filter Care (`#care-section-maintenance`), Water Parameter Logs (`#care-section-params`), and Medicine Dosing Calculator (`#care-section-medicine`).
   - 3 Modal Dialogs (`#config-modal`, `#food-edit-modal`, `#species-edit-modal`).
4. **Embedded Controller Script**:
   - Lines 1075 to 2708 (1,634 lines of JavaScript) house all controller logic, state management, event dispatchers, form handlers, and string-interpolated HTML renderers.

### 2.2 Global State Architecture & Scope Leaks

The application lacks a centralized state store or dispatcher. Instead, state is scattered across several global and window-attached objects:
- `window.AQUAPULSE_DEFAULT_CONFIG` / `window.AQUAPULSE_PRIVATE_CONFIG` (configuration source).
- `let activeConfig` in `AquaPulse.html` (in-memory cached configuration).
- `window.AquaPulseOptimizer`, `window.AquaPulseIntelligence`, `window.AquaPulseFlow` (feature modules).
- Multiple global controller functions attached directly to `window`: `openConfigModal`, `switchTab`, `filterCareView`, `inspectZone`, `setFlowMode`, `toggleFlowHeatmap`, `toggleFeedingLayer`, `highlightFeedSequence`, `startSoakTimer`, `openFoodEditModal`, `openSpeciesEditModal`, `deleteSpecies`, `changeSpeciesCount`, `toggleTask`, `resetChecklist`, `toggleSpongeWeek`, `saveParamLog`, `deleteParamLog`, `exportParamsCSV`, `setMedScenario`, `updateMedCalculation`.

### 2.3 DOM Coupling & Template-Literal Rendering

- **String-Based InnerHTML Injection**: UI updates are performed by setting `.innerHTML` with massive template literals (e.g. `renderFoods`, `renderDayButtons`, `renderParamLogs`, `renderMedicineScenarios`, `renderDiagnosticBanner`).
- **Inline HTML Event Handlers**: Hundreds of DOM nodes use inline attributes like `onclick="inspectZone('driftwood')"` or `onclick="filterSpecies('watch')"`. This precludes modular bundling and breaks Content Security Policy (CSP).
- **Fragile Element Binding**: The script relies on over 45 hardcoded DOM element IDs. If an ID is modified or rendered conditionally, downstream functions throw uncaught exceptions.

### 2.4 State Persistence & Storage Multi-Tenant Isolation Deficiencies

Data persistence uses browser `localStorage`. However, storage key naming is inconsistent and introduces cross-tank contamination:

| Storage Key Pattern | Isolation Level | Danger / Risk |
|:---|:---|:---|
| `aquapulse_${cfg.tank.id}_tasks` | Isolated per `tank.id` | Properly isolated; stores weekly checklist checkbox state. |
| `aquapulse_${cfg.tank.id}_sponge_idx` | Isolated per `tank.id` | Properly isolated; stores alternating sponge rinse index. |
| `aquapulse_${cfg.tank.id}_params` | Isolated per `tank.id` | Properly isolated; stores array of water test readings. |
| `aquapulse_active_config` | **UN-SCOPED (Global)** | **Critical Hazard**: Overwritten across all tanks; prevents managing multiple distinct tanks without data wiping. |
| `aquapulse_quarantine_data` | **UN-SCOPED (Global)** | **Critical Hazard**: Hospital/quarantine patient records are shared across all tanks regardless of profile. |
| `aquapulse_social_incidents` | **UN-SCOPED (Global)** | **Critical Hazard**: Aggression and chasing logs are shared globally across tanks. |

---

## 3. Comprehensive Feature Implementation Breakdown

### 3.1 Hydrodynamic Flow Visualizer (`aquapulse.flow.js` & `AquaPulse.html`)

The flow visualizer provides a real-time, interactive 2D simulation of water movement, aeration, temperature/velocity strata, and aquatic flora/fauna.

#### Physics & Particle Dynamics Engine
- **Canvas Pipeline**: Evaluated on an HTML5 `<canvas id="flow-particles-canvas">` with High-DPI (`window.devicePixelRatio`) buffer scaling.
- **Particle Count & Life Cycle**: A fixed pool of 85 particles (`particleCount = 85`) initialized via `createParticle(randomSpread)`.
- **Flow Mode 1: Straight Venturi Jet (`current`)**:
  - Simulates high-output filter nozzle (1750 L/Hr) located at top-right:
    $$x_{\text{nozzle}} = \text{width} - 155, \quad y_{\text{nozzle}} = \text{height} \times 0.15$$
  - Particle horizontal velocity: $vx \in [-4.2, -9.4]$ (directed right-to-left).
  - Vertical spread: $vy \in [-0.7, +0.7]$.
  - Micro-bubble buoyancy: Each frame, $vy \leftarrow vy - 0.018$ (simulating buoyant upward acceleration).
  - Left pane deflection: When particle reaches left glass ($x < \text{width} \times 0.12$), horizontal momentum dampens ($vx \leftarrow vx \times 0.6$) and downward deflection occurs ($vy \leftarrow vy + 0.75$).
  - Particle dissipation: Re-spawns if $x < 12$, $y < 8$, $y > \text{height} \times 0.86$, or frame age $> 140$.
- **Flow Mode 2: 45° Glass-Baffled Convection (`baffled`)**:
  - Simulates flow deflected against tank glass, setting up circular convection cells.
  - Velocities: $vx \in [-1.5, -4.0]$.
  - Convective rolling: If $y > \text{height} \times 0.62$, roll right along substrate ($vx \leftarrow vx + 0.045$); otherwise roll left across upper column ($vx \leftarrow vx - 0.02$).
  - Downward gravity pull: $vy \leftarrow vy + 0.01$. Max lifespan: 180 frames.

#### Procedural Aquascape Rendering Pipeline
Each frame executes the following layered draw sequence:
1. `drawWaterAtmosphere()`: Vertical linear gradient (`rgba(6, 182, 212, 0.06)` to `rgba(2, 6, 23, 0.40)`) plus animated sine-wave surface ripples ($y = 6 + \sin(\text{time} + x \times 0.03) \times 1.8$).
2. `drawBackgroundPlants()`: 5 Vallisneria ribbon plants with quadratic Bezier curvature oscillating with $\sin(\text{time} + \text{idx} \times 1.2) \times \text{sway}$, plus 5 emersed trailing Pothos roots on the top-right.
3. `drawCaustics()`: 8 animated light bands utilizing `globalCompositeOperation = 'screen'` and oscillating phase offsets.
4. `drawHardscape()`:
   - Substrate gravel bed with center mound and 24 micro-pebbles.
   - Center spiderwood bogwood trunk with 3 primary branches rendered using multi-stop linear bark gradients (`#381c08` to `#9a3412`).
   - Java moss pad on right branch with animated sway in the filter jet.
   - 4 Anubias leaf clusters with midrib line art mounted at wood joints.
   - 4 river boulders with radial gradient shading and top specular reflection arcs.
5. `drawVelocityHeatmap()`:
   - In `current` mode: High-velocity Red/Amber gradient ellipse across upper column, Cyan eddy in mid-water, and Emerald radial gradient for calm slack sanctuary under filter.
   - In `baffled` mode: Concentric circular convection gradient.
6. `drawStreamlines()`: Dashed animated Bezier lines with negative line-dash phase offset.
7. `drawBubbles()`: Dual-pass circular rendering (outer cyan glow + inner specular white core offset by $-0.3 \times \text{size}$).
8. `drawFishPresence()`: Dynamic fish silhouette sprites oscillating tail fins with frequency tied to species `tailSpeed`. Flow-sensitive fish (e.g. Bettas, Gouramis) display real-time status badges ("⚠️ Seeking Calm Zone" vs "✅ Comfortable").

---

### 3.2 Inhabitants Parameter Search & Sweet-Spot Derivation Engine (`aquapulse.optimizer.js`)

#### Biological Database (`SPECIES_DATABASE`)
Houses 15 verified freshwater species profiles covering 6 distinct taxonomy categories:
- **Angelfish**: Koi Angelfish, Blue Zebra Angelfish (`temp`: 24.0–28.5°C, `pH`: 6.0–7.5, `GH`: 3–10, `KH`: 2–6, `flow`: moderate, `scaleless`: false).
- **Barbs & Rainbows**: Denison Barb (Roseline Shark) (`temp`: 18.0–26.0°C, `pH`: 6.5–7.6, `GH`: 4–12, `KH`: 3–8, `flow`: high, `scaleless`: false), Boeseman's Rainbowfish (`temp`: 24.0–28.0°C, `pH`: 7.0–8.0, `GH`: 8–18, `KH`: 5–12, `flow`: high).
- **Tetras**: Silver Tip Tetra (`temp`: 22.0–28.0°C, `pH`: 6.0–7.8), Neon Tetra (`temp`: 21.0–26.0°C, `pH`: 5.5–7.2, fragile > 26.5°C).
- **Labyrinth Fish**: Female Betta, Male Betta (`temp`: 24.5–29.0°C, `flow`: low), Dwarf Red Gourami (`temp`: 24.0–28.0°C, `flow`: low).
- **Nano & Surface**: Daisy's Blue Rice Fish (`temp`: 22.0–27.0°C, `pH`: 6.5–7.5), Harlequin Rasbora (`temp`: 23.0–28.0°C).
- **Bottom Dwellers & Algae Crew**: Albino Corydoras (`temp`: 21.0–26.5°C, `scaleless`: true), Pygmy Corydoras (`scaleless`: true), Golden Chinese Algae Eater (`temp`: 22.0–27.5°C, semi-aggressive), Siamese Algae Eater (SAE), Zebra Nerite Snail (`pH`: 7.0–8.2, copper intolerant).

#### Mathematical Overlap Algorithms
Given a roster of configured species $S = \{s_1, s_2, \dots, s_n\}$:
1. **Temperature Overlap**:
   $$T_{\text{overlap\_min}} = \max_{s \in S} (s.\text{tempMin}), \quad T_{\text{overlap\_max}} = \min_{s \in S} (s.\text{tempMax})$$
   $$\text{hasTempOverlap} = (T_{\text{overlap\_min}} \le T_{\text{overlap\_max}})$$
   If overlap exists, recommended temperature is the midpoint:
   $$T_{\text{rec}} = \text{round}\left(\frac{T_{\text{overlap\_min}} + T_{\text{overlap\_max}}}{2}, 1\right)$$
2. **pH Overlap**:
   $$\text{pH}_{\text{overlap\_min}} = \max_{s \in S} (s.\text{phMin}), \quad \text{pH}_{\text{overlap\_max}} = \min_{s \in S} (s.\text{phMax})$$
3. **General & Carbonate Hardness Bounds**:
   $$\text{GH}_{\text{safe}} = [\max(3, \max(s.\text{ghMin})), \min(15, \min(s.\text{ghMax}))]$$
   $$\text{KH}_{\text{safe}} = [\max(2, \max(s.\text{khMin})), \min(8, \min(s.\text{khMax}))]$$
4. **Flow Dynamics Balance**:
   Evaluates total headcount of low-flow versus high-flow species:
   $$\text{Count}_{\text{low}} = \sum_{s.\text{flow} = \text{'low'}} s.\text{count}, \quad \text{Count}_{\text{high}} = \sum_{s.\text{flow} = \text{'high'}} s.\text{count}$$
   If $\text{Count}_{\text{low}} > 0$ and $\text{Count}_{\text{high}} > 0$, system flags flow compromise and recommends a 45° glass baffle return.
5. **Conflict & Compromise Detection**:
   Compares $T_{\text{rec}}$ against individual species limits, flagging warnings if any species operates near its thermal edge (e.g. Denison Barb at 26°C ceiling).

---

### 3.3 Visual Symptom Checker & Medication Safety Lock (`aquapulse.intelligence.js` & `aquapulse.config.js`)

#### Symptom Knowledge Base (`SYMPTOM_DATABASE`)
Maps 5 observable clinical presentations directly to treatments:
1. **White Specks (Ich / White Spot)** (`Parasitic`): Salt-like body crystals, flashing behavior. Prescribes `ichMain` scenario (28.5°C heat, max aeration, 50% anti-parasitic dosage lock).
2. **Frayed / Tattered Fins (Fin Rot)** (`Bacterial`): Ragged milky edges, clamped fins. Prescribes `hospitalBact` (Bactonil-FW in separate hospital container).
3. **Abdominal Bloat / Dropsy** (`Digestive / Organ`): Pineconing scales, buoyancy loss. Prescribes `hospitalSalt` (24-48h fast, boiled pea, short osmotic bath, contraindicated for scaleless fish).
4. **Torn Fin Bits / Aggression Damage** (`Social`): Missing wedges, chasing. Prescribes `nipRecovery` (Stress Heal slime coat shield, school size expansion).
5. **Surface Gasping / Rapid Gill Movement** (`Water Toxicity / Low O₂`): Red gill covers, clustering at surface film. Prescribes `waterChange` (emergency 50% water change, upward filter aeration).

#### Smart Medication Dosing Formula & Safety Lock
$$\text{Dose} = \left(\frac{V_{\text{treated}}}{100}\right) \times \text{RatePer100L} \times F_{\text{lock}}$$
- **Safety Lock Logic**:
  When scenario `useLock === true`, the engine checks whether any species in the tank is marked `scaleless: true` or listed in `med.sensitiveSpecies` (e.g. Bronze/Albino Corydoras, Neon Tetras).
  If sensitive species are present, $F_{\text{lock}} = 0.5$ (50% dosage lock).
- **Volume Selection**:
  Water volume is derived from either fixed container size (e.g. 10L bucket), water change percentage ($0.35 \times V_{\text{net}}$), or the interactive slider ($5\text{L} \le V \le 300\text{L}$).

---

### 3.4 Water Parameter Logging, Diagnostics & Trend Insights (`AquaPulse.html` & `aquapulse.intelligence.js`)

#### Tracked Parameters
Every log entry stores: `date`, `nh3` (Ammonia), `no2` (Nitrite), `no3` (Nitrate), `ph`, `temp`, `gh`, `kh`, `wc` (water change done), and `notes`.

#### Real-Time Automated Diagnostic Engine (`renderDiagnosticBanner`)
Evaluates readings against configured targets:
- $\text{NH}_3 > 0.0\text{ ppm}$: Flags emergency. Automatically calculates 50% water change volume ($0.5 \times V_{\text{net}}$) and required water conditioner dose ($V_{\text{wc}} \times 0.1\text{ ml}$); prescribes 24h fast.
- $\text{NO}_2 > 0.0\text{ ppm}$: Flags bio-filter strain; warns user against rinsing multiple filter compartments simultaneously.
- $\text{NO}_3 > 30\text{ ppm}$: Flags nitrate accumulation; advises gravel siphoning and riparium plant inspection.
- $\text{Temp}$ or $\text{pH}$ Drift: Warns if readings deviate from profile ranges.

#### Predictive Pattern Engine (`AquaPulseIntelligence.analyzeParameterTrends`)
Analyzes time-series trends across consecutive test records:
- **Nitrate Accumulation Rate**:
  $$\Delta \text{NO}_3 = \text{NO}_{3,\text{latest}} - \text{NO}_{3,\text{prev}}, \quad \Delta \text{Days} = \max(1, \text{daysBetween}(\text{latest}, \text{prev}))$$
  If $\Delta \text{NO}_3 > 10\text{ ppm}$ in $\le 7$ days, system alerts to heavy bioload or decaying organic matter.
- **Emerging Bio-Filter Strain**: Flags when ammonia transitions from $0.0$ to $> 0.0\text{ ppm}$.
- **Temperature Stability Drift**: Flags when $|\text{Temp}_{\text{latest}} - \text{Temp}_{\text{prev}}| \ge 1.5^\circ\text{C}$.

---

### 3.5 Quarantine / Hospital Tank Manager (`aquapulse.intelligence.js`)

- **State Model**: Tracks `active` (boolean), `fishName`, `startDate`, `durationDays` (default 14), `containerVolumeL` (default 10L), and `notes`.
- **Countdown Calculation**:
  $$\text{DaysElapsed} = \max\left(0, \text{round}\left(\frac{\text{Date}_{\text{now}} - \text{Date}_{\text{start}}}{86,400,000}\right)\right)$$
  $$\text{DaysRemaining} = \max(0, \text{durationDays} - \text{DaysElapsed})$$
- When $\text{DaysRemaining} == 0$, badge highlights green as "Ready for Main Tank".
- **Limitations**: State is stored in a single un-scoped key `aquapulse_quarantine_data`. Entering a new patient relies on `window.prompt()`.

---

### 3.6 Social Dynamics & Aggression Logger (`aquapulse.intelligence.js`)

- **State Model**: Array of incident objects: `{ id, date, aggressor, victim, trigger, actionTaken }`.
- **UI Presentation**: Tabular view with timestamped chase logs and deletion controls.
- **Limitations**: Logging an incident requires 4 consecutive synchronous browser `prompt()` dialogs. Data is saved to an un-scoped `aquapulse_social_incidents` key.

---

## 4. Architectural Pain Points, Bottlenecks & Failure Modes

### 4.1 Monolithic Structure & DOM Coupling
- **Absence of Modularity**: All views, controllers, and styles reside in `AquaPulse.html`. Making changes to the feeding routine or water log requires navigating a 2,714-line file.
- **Inline Event Coupling**: Inline attributes (`onclick`, `oninput`, `onchange`) create rigid coupling between markup and global JavaScript symbols.
- **Fragile Direct DOM Manipulation**: Methods construct HTML strings and assign them to `.innerHTML`, destroying and recreating DOM nodes, breaking event listeners, and risking injection vulnerabilities.

### 4.2 State Management & Multi-Tank Isolation Deficiencies
- **Global Key Overwrite**: `aquapulse_active_config` is global. Loading a preset (e.g. 60L Nano) permanently overwrites personal tank data unless manually backed up via JSON export.
- **Leaked Global Records**: Quarantine tracker and social aggression logs lack tank ID prefixes, causing cross-tank data pollution.
- **Multiple Truth Sources**: At any moment, config state exists in `window.AQUAPULSE_DEFAULT_CONFIG`, `window.AQUAPULSE_PRIVATE_CONFIG`, `localStorage.aquapulse_active_config`, and the DOM form inputs, leading to sync drift.

### 4.3 Canvas Simulation Performance & Responsiveness Bottlenecks
- **Unthrottled Background Render Loop**: `requestAnimationFrame(animate)` runs indefinitely in `aquapulse.flow.js`. When the user switches to Tab 2 (Pantry), Tab 3 (Species), or Tab 4 (Care Hub), the canvas continues drawing 85 particles, caustics, and procedural wood, causing continuous CPU/GPU power consumption and battery drain on mobile devices.
- **Un-debounced Resize Handler**: The window resize listener invokes canvas dimension recalculations synchronously on every resize tick.
- **Hardcoded Viewport Assumptions**: Physics coordinates ($x = \text{width} - 155$, $y = \text{height} \times 0.15$) and hardcoded CSS heights (`h-[680px]`) cause overflow or severe visual distortion on small viewports.

### 4.4 User Experience (UX) Anti-Patterns
- **Blocking Browser Dialogs**: Interactive features (`toggleQuarantineState`, `addSocialIncidentPrompt`, `applyDerivedTargets`) invoke browser `prompt()` and `alert()`. These block UI execution, cannot be styled, and fail on headless browsers.
- **JSON Configuration Ingestion**: While `lenientParseJSON` strips comments and trailing commas, editing raw JSON in a textarea remains hostile to non-technical hobbyists.

### 4.5 Extensibility Barriers
- **No Plugin Architecture**: Adding a new sensor (e.g. pH probe, TDS meter, CO2 drop checker) requires hardcoding new inputs, modifying `AquaPulse.html`, updating `aquapulse.config.js`, adjusting `aquapulse.private.js`, and modifying diagnostics logic across multiple files.
- **No Automated Test Coverage**: The project contains 0 automated unit or integration tests. Validating calculations currently requires manual inspection.

---

## 5. Overhaul Requirements & Architectural Blueprint Recommendations

To satisfy the goals outlined in `ORIGINAL_REQUEST.md`, the overhauled prototype must address these findings:

1. **Modular Architecture**:
   - Decouple `AquaPulse.html` into standalone ES modules or clean component files:
     - State Store (centralized, reactive or pub/sub event bus, with fully scoped multi-tank storage keys).
     - Flow Canvas Component (with visibility-based pause/resume and responsive vector scaling).
     - Diagnostics & Biological Derivation Engine (pure functions with comprehensive unit tests).
     - Intelligent Symptom & Pharmacy Calculator.
     - Modern Modal & UI Presentation Components (replacing `prompt()` and `alert()` with accessible dialog primitives).
2. **Configuration & Private Layer Continuity**:
   - Maintain 100% backward compatibility with `aquapulse.config.js` and `aquapulse.private.js`.
   - Preserve non-destructive deep merging.
3. **Automated Verification Harness**:
   - Provide a headless, automated test script (e.g. Node.js or browser test runner) verifying:
     - Config parsing & deep merging.
     - Parameter sweet-spot derivation math & overlap intersection.
     - Species medication safety locking (50% lock verification).
     - Trend pattern detection algorithms.
     - Headless page load with 0 console errors.

---
*End of Survey Report. Recorded in `.agents/teamwork/teamwork_preview_explorer_survey_1/survey_codebase.md`.*

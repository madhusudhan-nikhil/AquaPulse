# AquaPulse Architectural Benchmark & UI/UX Design Blueprint (R1, R2)

**Author:** `teamwork_preview_explorer_survey_3`  
**Date:** 2026-10-20  
**Status:** Complete Architectural Specification & Benchmark Report  
**Target:** AquaPulse Modular Overhaul (Requirements R1, R2, R3, R4, R5)

---

## 1. Executive Summary

AquaPulse is a command dashboard for freshwater and planted community aquariums. The existing implementation successfully features flow physics simulation, an inhabitant sweet-spot parameter derivation engine, a visual symptom checker, a medication safety lock, social aggression logging, and water parameter tracking.

However, the existing codebase concentrates its entire user interface, DOM event bindings, business logic, and storage interactions inside a single **2,714-line monolithic file (`AquaPulse.html`)**. Global state is mutated ad-hoc across window properties, algorithmic calculation engines (`aquapulse.optimizer.js` and `aquapulse.intelligence.js`) are tightly coupled to specific DOM element IDs, and the user interface lacks above-the-fold glanceability for vital water quality indicators on mobile and desktop viewports.

This document establishes the **benchmark, modular architecture, and responsive UI/UX blueprint** to transform AquaPulse into a modern, decoupled, extensible, and thoroughly testable system:
1. **Industry Benchmarks:** Comprehensive evaluation of commercial (Neptune Apex, GHL ProfiLux, Hydros), DIY/open-source (reef-pi, AquaPi, Mycodo), and smart-home (Home Assistant Lovelace) telemetry systems.
2. **Decoupled Architecture:** A clean 4-tier separation between **Centralized Predictable State Management**, **Pure Biological & Physical Calculation Engines**, a **Hardware/Telemetry Abstraction Layer (HAL)**, and a **Dynamic Plugin Presentation System**.
3. **Responsive UI/UX Layout:** Immediate above-the-fold status indicator badges (Safe, Warning, Critical) visible without scrolling, an interactive multi-layer hydrodynamic canvas, responsive parameter trend curves, an interactive feeding calendar matrix, alternating filter maintenance trackers, and a quarantine countdown manager.
4. **Testability Patterns:** Headless algorithmic test runners, unit testing protocols for pure mathematical engines, and automated headless browser E2E verification pipelines.
5. **Configuration & Data Continuity:** 100% backward compatibility for existing `aquapulse.config.js` and git-ignored `aquapulse.private.js` files, alongside lossless LocalStorage schema versioning.

---

## 2. Industry Benchmarks: Aquarium, Terrarium & Environmental IoT Systems

To design a best-in-class architecture, we benchmarked the leading commercial and enthusiast aquatic/environmental monitoring platforms:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    AQUATIC & IoT BENCHMARK MATRIX                                │
├─────────────────────┬─────────────────┬──────────────────────┬─────────────────┬──────────────────┤
│ System / Platform   │ Telemetry Model │ UI / UX Architecture │ Extensibility   │ Key Weakness     │
├─────────────────────┼─────────────────┼──────────────────────┼─────────────────┼──────────────────┤
│ Neptune Apex        │ Proprietary Bus │ Apex Fusion (Cloud   │ Proprietary 1-  │ High cost, vendor│
│ (Apex Fusion)       │ (Aquabus Probes)│ & Local Web tiles)   │ Link & modules  │ lock-in, dated UI│
├─────────────────────┼─────────────────┼──────────────────────┼─────────────────┼──────────────────┤
│ GHL ProfiLux 4      │ Industrial PAB  │ GHL Connect &        │ Doser & probe   │ High complexity, │
│ & GHL Connect       │ CAN-bus probes  │ myGHL Cloud          │ expansion cards │ steep UI curve   │
├─────────────────────┼─────────────────┼──────────────────────┼─────────────────┼──────────────────┤
│ Hydros Control      │ Distributed Bus │ Mobile-first visual  │ Wireless WiFi & │ Cloud-centric,   │
│ (CoralVue)          │ (Command Bus)   │ tile dashboard       │ Sense port hubs │ limited custom JS│
├─────────────────────┼─────────────────┼──────────────────────┼─────────────────┼──────────────────┤
│ reef-pi & AquaPi    │ I2C, GPIO, PWM, │ Vanilla / React /    │ Native driver   │ Requires DIY HW, │
│ (Open-Source DIY)   │ 1-Wire, ADC     │ ESPHome Lovelace     │ plugin hooks    │ minimal UX polish│
├─────────────────────┼─────────────────┼──────────────────────┼─────────────────┼──────────────────┤
│ Home Assistant      │ MQTT, REST,     │ Lovelace UI, Mushroom│ Thousands of    │ Generic platform,│
│ (Aquarium Lovelace) │ ESPHome         │ Cards, ApexCharts    │ community cards │ requires setup   │
├─────────────────────┼─────────────────┼──────────────────────┼─────────────────┼──────────────────┤
│ Mycodo & Herpstat   │ Environmental   │ Flask / Matplotlib   │ Python input &  │ Terrarium focus, │
│ (Vivarium / Terr.)  │ PID Regulators  │ Web Dashboard        │ output daemons  │ dense graphs     │
└─────────────────────┴─────────────────┴──────────────────────┴─────────────────┴──────────────────┘
```

### Detailed Benchmarking Takeaways

#### A. Neptune Systems Apex & Apex Fusion
* **Strengths:** Established the industry standard for 24-hour graphing of critical probes (Temperature, pH, ORP, Salinity), automated feed timers with pump ramp-down, and rule-based safety overrides.
* **Weaknesses:** Apex Fusion utilizes deeply nested modal configuration trees; alerts are often buried in notification logs rather than showing clear, color-coded status badges on the main display.

#### B. Hydros Control (CoralVue)
* **Strengths:** Employs a distributed controller architecture where every device is a peer. The UI is strictly mobile-first with clear visual status indicators: normal (green), alert (yellow), error/critical (red). Each equipment card has explicit mode pills (Auto, On, Off, Feed).
* **Takeaway for AquaPulse:** High glanceability and explicit multi-state indicators must be front-and-center. Critical equipment states (Filter L/Hr, Heater status, Photoperiod) must be instantly discernible.

#### C. Home Assistant (Aquarium Custom Dashboards / Mushroom Cards)
* **Strengths:** Enthusiasts overwhelmingly prefer Home Assistant over native apps because of **Mushroom Cards** and **ApexCharts-js**. Key architectural patterns include:
  1. **"The Vital Signs Strip"**: An above-the-fold horizontal banner displaying vital parameters with dynamic threshold styling (e.g., Temperature turns emerald between 25.0–26.0°C, amber at 26.5°C, red with flashing pulse at 28.0°C).
  2. **Micro-Graphs (Sparklines)**: 24-hour and 7-day parameter trend lines directly below numeric readouts, illustrating rate-of-change ($\Delta / \Delta t$) rather than just isolated values.
  3. **Conditional Action Cards**: Remediation banners that appear *only* when a parameter breaches safety boundaries, displaying exact remedial actions (e.g., "Ammonia detected: Perform 50% water change [~110L] + dose 11ml conditioner").

#### D. reef-pi & Open Hardware Abstraction
* **Strengths:** Clear separation between hardware drivers (analog-to-digital converters, Dallas 1-wire temperature probes, PWM light dimmers) and higher-level telemetry consumers.
* **Takeaway for AquaPulse:** AquaPulse must support simulated feeds (for standalone zero-setup demo mode), manual test kit logging (API liquid kits, Hanna checkers), and a generic IoT bridge (MQTT/HTTP telemetry feeds from ESP32/Home Assistant).

---

## 3. Modular Architecture Blueprint

To eliminate the monolithic coupling in `AquaPulse.html`, the system is re-architected into four cleanly decoupled layers:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AQUAPULSE OVERHAULED ARCHITECTURE                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                  LAYER 4: UI PRESENTATION & PLUGINS                         │  │
│  │                                                                                             │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │  │
│  │  │  VitalSignsCard  │  │  TankCanvasView  │  │  FeedingPlanner  │  │  CareHubView        │  │  │
│  │  │  (Above-the-Fold)│  │  (Layers, Flow)  │  │  (Matrix, Timer) │  │  (Params, Meds, Rx) │  │  │
│  │  └─────────┬────────┘  └─────────┬────────┘  └─────────┬────────┘  └──────────┬──────────┘  │  │
│  │            │                     │                     │                      │             │  │
│  │            └─────────────────────┼─────────────────────┴──────────────────────┘             │  │
│  │                                  ▼                                                          │  │
│  │                   AppShell & Dynamic Plugin Registry (mount / unmount)                      │  │
│  └──────────────────────────────────┬──────────────────────────────────────────────────────────┘  │
│                                     │                                                             │
│                                     ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                      LAYER 1: CENTRALIZED PREDICTABLE STATE MANAGEMENT                      │  │
│  │                                                                                             │  │
│  │  ┌─────────────────────────┐     ┌───────────────────────┐     ┌─────────────────────────┐  │  │
│  │  │      ReactiveStore      │◄────┤       EventBus        ├────►│   PersistenceAdapter    │  │  │
│  │  │  (Proxy / Action Reducer│     │ (Decoupled Pub/Sub)   │     │ (Per-Tank LocalStorage) │  │  │
│  │  └─────────────────────────┘     └───────────────────────┘     └─────────────────────────┘  │  │
│  └──────────────────────────────────┬──────────────────────────────────────────────────────────┘  │
│                                     │                                                             │
│            ┌────────────────────────┴────────────────────────┐                                    │
│            ▼                                                 ▼                                    │
│  ┌───────────────────────────────────┐     ┌───────────────────────────────────────────────────┐  │
│  │  LAYER 2: PURE CALCULATION ENGINES│     │  LAYER 3: HARDWARE & TELEMETRY ABSTRACTION (HAL)  │  │
│  │                                   │     │                                                   │  │
│  │  • SweetSpotOptimizerEngine       │     │  • TelemetryPacket Specification                  │  │
│  │  • HydrodynamicFlowEngine         │     │  • ITelemetryProvider Interface                   │  │
│  │  • MedicationSafetyEngine         │     │  • SimulatedTelemetryProvider (Demo Mode)         │  │
│  │  • QuarantineTrackerEngine        │     │  • ManualLogTelemetryProvider (Test Kits)         │  │
│  │  • PredictiveTrendEngine          │     │  • IoTBridgeProvider (MQTT / WebSockets)          │  │
│  └───────────────────────────────────┘     └───────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Layer 1: Centralized Predictable State Management

#### The Problem in the Existing Codebase
In `AquaPulse.html`, state is fragmented:
* `window.AQUAPULSE_DEFAULT_CONFIG` is mutated directly.
* Parameter logs are stored in `localStorage.getItem('aquapulse_' + tankId + '_params')`.
* Quarantine state is stored in `aquapulse_quarantine_data` without tank ID namespaces.
* Filter media rinse state is stored in `aquapulse_filter_sponge_last_rinse`.
* Checklist completion is stored in `aquapulse_checklist_completed`.
* Modals and tabs manipulate DOM styles directly without state synchronization.

#### The Solution: Reactive Store + EventBus
1. **`AquaPulseStore`**: A centralized, observable store that wraps application state in a JavaScript `Proxy`. Any state change notifies subscribers and triggers targeted DOM element re-renders without full-page redraws.
2. **`EventBus`**: A lightweight Pub/Sub mediator allowing modules to emit and subscribe to lifecycle events without direct references to each other.
3. **`PersistenceAdapter`**: Encapsulates all browser storage. Automatically isolates all keys by `tank.id` (e.g. `aquapulse:tank-255l:params`, `aquapulse:tank-255l:quarantine`, `aquapulse:tank-255l:maintenance`).

#### State Schema Specification
```typescript
interface AquaPulseState {
  config: AquaPulseConfig;             // Ingested demo + private overrides
  activeTankId: string;                // Current selected tank identifier
  activeTab: string;                   // 'dashboard' | 'canvas' | 'feeding' | 'species' | 'care'
  telemetry: {
    current: TelemetryReading;         // Latest water parameters and equipment telemetry
    history: TelemetryReading[];       // Historical water parameter logs
    status: OverallHealthStatus;       // 'optimal' | 'warning' | 'critical'
    diagnostics: DiagnosticAlert[];    // Calculated alerts and action protocols
  };
  simulation: {
    mode: 'current' | 'baffled';       // Flow simulation mode
    activeLayers: {
      hardscape: boolean;
      streamlines: boolean;
      heatmap: boolean;
      fish: boolean;
      bubbles: boolean;
      caustics: boolean;
      feedingZones: boolean;
    };
    activeFeedingSequence: string;     // 'all' | 'morning' | 'evening' | 'night' | 'treat'
    selectedZoneId: string | null;     // Selected aquascape zone for inspection
  };
  care: {
    filterRinseState: FilterRinseState;
    checklist: Record<string, boolean>;
    quarantine: QuarantineState;
    socialIncidents: SocialIncident[];
    activeMedicationProtocol: MedicationCalculation | null;
  };
}
```

#### Event Bus Catalog
* `config:loaded` — Ingestion of configuration completed.
* `config:updated` — User modified tank settings via visual editor or JSON console.
* `telemetry:reading_logged` — New water test log recorded.
* `telemetry:alert_state_changed` — Threshold alert status shifted (e.g. Optimal → Critical).
* `flow:mode_changed` — Switch between Straight Jet and 45° Baffled Convection.
* `flow:layer_toggled` — Toggle of heatmaps, streamlines, or fish presence.
* `care:task_toggled` — Weekly checklist item completed or reset.
* `care:filter_rinsed` — Alternating filter cup rinsed.
* `quarantine:updated` — Quarantine patient status or countdown updated.

---

### Layer 2: Pure Biological & Physical Calculation Engines

All mathematical and biological logic is extracted from UI event handlers into pure, headless functions. These functions take explicit arguments, return calculated data structures, perform zero DOM interactions, and can be executed identically in browser runtimes, Node.js, or automated test runners.

#### 1. `SweetSpotOptimizerEngine` (`src/engines/optimizer.engine.js`)
* **Purpose:** Takes the active species roster and returns the mathematical tolerance intersection, optimal point targets, flow compatibility analysis, and biological compromise alerts.
* **Mathematical Formulae:**
  $$\text{Safe Temperature Range} = [\max_{i}(T_{\min, i}),\, \min_{i}(T_{\max, i})]$$
  $$\text{Safe pH Range} = [\max_{i}(\text{pH}_{\min, i}),\, \min_{i}(\text{pH}_{\max, i})]$$
  $$\text{Safe GH Range} = [\max_{i}(\text{GH}_{\min, i}),\, \min_{i}(\text{GH}_{\max, i})]$$
  $$\text{Optimal Temperature} = \frac{\max(T_{\min}) + \min(T_{\max})}{2}$$
* **Compromise Scoring:** Detects if any inhabitant operates within 0.5°C or 0.2 pH units of its biological threshold, flagging potential long-term metabolic strain.
* **Flow Derivation:** Analyzes the ratio of high-flow rheophilic fish (e.g. Denison Barbs, Rainbowfish) to low-flow labyrinth fish (e.g. Bettas, Gouramis) and outputs the recommended nozzle baffle configuration.

#### 2. `HydrodynamicFlowEngine` (`src/engines/flow.engine.js`)
* **Purpose:** Calculates particle vectors, fluid velocity decay, and slack-water pockets based on filter flow rating ($L/\text{hr}$), tank dimensions ($L \times W \times H$), and outflow configuration.
* **Physics Model:**
  * Straight Venturi Jet Mode: High horizontal velocity decay vector along upper stratum with an exponential decay curve:
    $$v(x) = v_0 \cdot e^{-k \cdot x / L_{\text{tank}}}$$
  * Baffled Convection Mode: 45° deflection off front glass creating a circular toroidal recirculation convection loop with lower peak velocity and expanded calm surface slack zones.
  * Inhabitant Depth Strata Mapping: Determines localized flow stress per species based on vertical position ($y_{\text{strata}}$) and swim preferences.

#### 3. `MedicationSafetyEngine` (`src/engines/medication.engine.js`)
* **Purpose:** Calculates safe dosage quantities scaled precisely to net water volume, applying automatic safety clamps for scaleless, copper-sensitive, or labyrinth species.
* **Safety Rules:**
  * Scaleless fish clamp: Automatically caps anti-parasitic formalin/malachite green formulations at 50% ($0.5\times$) when Corydoras, Loaches, or sensitive catfish are detected.
  * Invertebrate copper lock: Strictly locks out medications containing ionic copper or chelated copper if snails (Nerite) or ornamental shrimp are present in config.
  * Hospital tank isolation: Pre-calculates osmotic salt therapy dosages specifically for isolated containers (never display tank).

#### 4. `QuarantineTrackerEngine` (`src/engines/quarantine.engine.js`)
* **Purpose:** Tracks isolation duration, elapsed days, and discharge countdowns for quarantine/hospital setups.
* **Output:** Percentage elapsed, remaining days countdown, and daily medication administration prompts.

#### 5. `PredictiveTrendEngine` (`src/engines/trend.engine.js`)
* **Purpose:** Evaluates historical water parameter time-series to detect bioload accumulation trends before acute toxic spikes occur.
* **Algorithms:**
  * Nitrate accumulation slope: $\frac{d[\text{NO}_3^-]}{dt}$ over consecutive tests. Flags bio-filter saturation when slope exceeds $10\,\text{ppm}/\text{week}$.
  * pH drift stability index: Standard deviation $\sigma(\text{pH})$ over the last 5 tests. Flags KH depletion buffer risk when $\Delta\text{pH} > 0.4$.

---

### Layer 3: Hardware & Telemetry Abstraction Layer (HAL)

To make AquaPulse future-proof for real-world environmental monitors, IoT sensors, and smart aquarium controllers, we introduce the **Telemetry Abstraction Layer**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      TELEMETRY ABSTRACTION LAYER (HAL) ARCHITECTURE                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│                                  ITelemetryProvider                                    │
│                 + connect(): Promise<boolean>                                          │
│                 + disconnect(): Promise<void>                                          │
│                 + getLatestReading(): TelemetryPacket                                  │
│                 + onReading(callback): () => void                                      │
│                                           ▲                                            │
│                 ┌─────────────────────────┼──────────────────────────┐                 │
│                 │                         │                          │                 │
│      ┌──────────┴───────────┐  ┌──────────┴───────────┐  ┌───────────┴───────────┐     │
│      │  SimulatedProvider   │  │   ManualLogProvider  │  │   IoTBridgeProvider   │     │
│      │  (Realistic Demo     │  │  (Water Test Kit API │  │  (MQTT / WebSockets / │     │
│      │   Sine Swings & Flw) │  │   Titration Forms)   │  │   Home Assistant REST)│     │
│      └──────────────────────┘  └──────────────────────┘  └───────────────────────┘     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Unified Telemetry Packet Schema
```json
{
  "timestamp": "2026-10-20T16:30:00Z",
  "tankId": "tank-255l-community",
  "parameters": {
    "temp": { "value": 25.8, "unit": "°C", "target": { "min": 25.5, "max": 26.0 } },
    "ph": { "value": 7.1, "unit": "pH", "target": { "min": 6.6, "max": 7.4 } },
    "nh3": { "value": 0.0, "unit": "ppm", "max": 0.0 },
    "no2": { "value": 0.0, "unit": "ppm", "max": 0.0 },
    "no3": { "value": 15, "unit": "ppm", "target": { "min": 5, "max": 25 }, "warning": 30, "critical": 50 },
    "gh": { "value": 7, "unit": "dGH", "target": { "min": 4, "max": 12 } },
    "kh": { "value": 4, "unit": "dKH", "target": { "min": 3, "max": 8 } }
  },
  "equipment": {
    "filter": { "online": true, "flowRateLph": 1750, "turnoverActual": 7.9 },
    "heater": { "online": true, "wattage": 200, "state": "idle" },
    "lighting": { "state": "on", "hoursActiveToday": 4.5, "maxPhotoperiod": 6.5 }
  },
  "quality": {
    "status": "optimal",
    "alertLevel": 0,
    "activeAlerts": []
  }
}
```

---

### Layer 4: UI Presentation Shell & Dynamic Plugin Registration

#### The Plugin Contract (`IPlugin`)
Rather than hardcoding tabs and widgets into a single 2,700-line HTML file, AquaPulse uses a micro-component plugin registry. Adding a new calculator, sensor visualizer, or care tool requires only registering a new standalone module.

```javascript
/**
 * AquaPulse Plugin Interface Contract
 */
export interface IAquaPulsePlugin {
  id: string;                      // Unique identifier, e.g. 'plugin-vital-signs'
  name: string;                    // Human-readable title
  icon: string;                    // Emoji or SVG icon identifier
  category: 'core' | 'view' | 'widget' | 'tool';
  order: number;                   // Display position in layout
  
  /**
   * Called when the plugin is mounted into a DOM container
   */
  mount(context: {
    container: HTMLElement;
    store: AquaPulseStore;
    eventBus: EventBus;
    engines: CalculationEngines;
    hal: TelemetryHAL;
  }): Promise<void> | void;

  /**
   * Called when state or telemetry changes to update the view efficiently
   */
  update(context: {
    container: HTMLElement;
    store: AquaPulseStore;
    changedProperty?: string;
  }): void;

  /**
   * Called when the plugin is unmounted to prevent memory leaks
   */
  unmount(context: {
    container: HTMLElement;
  }): Promise<void> | void;
}
```

#### Dynamic Plugin Registration Example
```javascript
// Third-party or core plugin registration
import { AppShell } from './core/AppShell.js';
import { VitalSignsBannerPlugin } from './plugins/vital-signs/index.js';
import { FlowCanvasPlugin } from './plugins/flow-canvas/index.js';
import { FeedingPlannerPlugin } from './plugins/feeding-planner/index.js';
import { InhabitantsOptimizerPlugin } from './plugins/optimizer/index.js';

const app = new AppShell();

// Register plugins dynamically
app.registerPlugin(new VitalSignsBannerPlugin());
app.registerPlugin(new FlowCanvasPlugin());
app.registerPlugin(new FeedingPlannerPlugin());
app.registerPlugin(new InhabitantsOptimizerPlugin());

// Bootstraps application and mounts active plugins into layout slots
app.boot();
```

---

## 4. Best-in-Class Responsive Aquarium UI/UX Layout (R2)

### A. Above-The-Fold Immediate Status Indicator Badges ("Vital Signs Strip")

#### Design Rationale
In the existing `AquaPulse.html`, users must navigate to **Tab 4 (Care Hub) -> Water Logs**, and scroll past the manual entry form to see whether their water chemistry is safe. In high-bioload community tanks, detecting ammonia ($NH_3$) or nitrite ($NO_2^-$) quickly is critical to prevent fish mortality.

The redesigned UI introduces an **Above-The-Fold Vital Signs Strip** permanently anchored beneath the tank header, visible on all viewport sizes without scrolling.

#### 3-Tier Color-Coded Triage System
* **🟢 Safe / Optimal (Emerald):** Reading is comfortably within configured biological limits.
  * Badge styling: `bg-emerald-500/15 border-emerald-500/40 text-emerald-300`
* **🟡 Warning / Watch (Amber):** Reading is elevated or approaching biological tolerance bounds (e.g. Nitrate $30$–$49\,\text{ppm}$, pH drifting $0.2$ outside target).
  * Badge styling: `bg-amber-500/15 border-amber-500/40 text-amber-300`
* **🔴 Critical / Action Needed (Rose):** Toxic threshold reached ($NH_3 > 0.0\,\text{ppm}$, $NO_2^- > 0.0\,\text{ppm}$, $NO_3^- \ge 50\,\text{ppm}$, or temperature shock hazard).
  * Badge styling: `bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse`

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               ABOVE-THE-FOLD VITAL SIGNS STRIP (DESKTOP)                          │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬─────────┤
│ AMMONIA (NH3)│ NITRITE (NO2)│ NITRATE (NO3)│      pH      │     TEMP     │   GH BUFFER  │KH BUFFER│
│   0.00 ppm   │   0.00 ppm   │   15.0 ppm   │     7.10     │    25.8 °C   │     7 dGH    │  4 dKH  │
│  [🟢 OPTIMAL] │  [🟢 OPTIMAL] │  [🟢 OPTIMAL] │  [🟢 OPTIMAL] │  [🟢 OPTIMAL] │  [🟢 OPTIMAL] │[🟢 SAFE]│
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴─────────┘
```

#### Click-to-Remediate Action
Clicking any badge that displays a **Warning** or **Critical** status immediately opens the **Automated Prescription Modal** with pre-calculated dosages:
* *Example (Ammonia Warning):* Displays emergency water change volume ($50\% = 110\,\text{L}$ for a 220L net tank) and the exact water conditioner dechlorinator dosage ($11.0\,\text{ml}$) to detoxify free ammonia.

---

### B. Interactive Hydrodynamic Flow Canvas

#### Architecture & Multi-Layer Toggle System
The flow visualizer canvas is overhauled into a responsive, hardware-accelerated canvas that automatically detects device pixel ratio (`window.devicePixelRatio`) to ensure crisp rendering on 4K desktop screens and Retina mobile devices.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                          INTERACTIVE HYDRODYNAMIC FLOW CANVAS STACK                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                   │
│  [ Layer 6: Targeted Feeding Pins ]  ── Interactive HTML overlay pins (Drop Zones A, B, C, D, E)  │
│  [ Layer 5: Aeration & Caustics   ]  ── Real-time venturi micro-bubbles & overhead light shimmer   │
│  [ Layer 4: Live Fish Silhouettes ]  ── Dynamic animated swimming depth strata (Top/Mid/Bottom)   │
│  [ Layer 3: Velocity Heatmap      ]  ── Color-coded streamlines (Red = Jet, Cyan = Drift, Emerald)│
│  [ Layer 2: Hydrodynamic Vectors  ]  ── Particle physics trail (Straight Jet vs Baffled Convection│
│  [ Layer 1: Procedural Hardscape  ]  ── Spiderwood, Epiphytes (Anubias/Moss), Basalt Rock, Substr.│
│                                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Layer Controls & Accessibility
* **🍽️ Feeding Map:** Toggles interactive drop zones with step-by-step timed feeding routines (Morning Distraction Flow, Evening Schooling Track, Lights-Out Bottom Feast).
* **🌡️ Velocity Heatmap:** Reveals flow velocity distribution:
  * High velocity jet stream ($> 30\,\text{cm/s}$, Red/Amber): Filter nozzle exhaust.
  * Moderate schooling track ($10$–$25\,\text{cm/s}$, Cyan/Teal): Active open swimming channel.
  * Calm sanctuary slack pocket ($< 8\,\text{cm/s}$, Emerald): Substrate and center-hardscape shelter.
* **🐟 Fish Presence:** Real-time animated swimming silhouettes matching the active tank configuration species roster at correct depth strata.
* **🫧 Aeration Bubbles:** Particle buoyancy simulation illustrating surface gas exchange and oxygenation.

---

### C. Responsive Parameter Trend Curves & Routine Care Modules

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           ROUTINE CARE & PARAMETER INSIGHT PANELS                                 │
├──────────────────────────────────────┬────────────────────────────────────────────────────────────┤
│ PARAMETER TREND CURVES (7D / 30D)    │ FILTER MAINTENANCE ROTATION TRACKER                        │
│                                      │                                                            │
│ NO3: 12 ─── 14 ─── 18 ─── 15 ppm     │ ⚙️ Dual-Canister 1750 L/Hr Internal Filter                 │
│ Temp: 25.6° ── 25.8° ── 25.7°C       │ ┌─────────────────────────┐   ┌──────────────────────────┐ │
│                                      │ │ Cup A: Coarse Foam      │   │ Cup B: Bio-Ceramic Rings │ │
│ [ 📈 7-Day Sparkline with Target     │ │ [✅ Rinsed 3 days ago]   │   │ [🔒 ACTIVE - DO NOT RINSE]│
│   Boundaries & Tolerance Corridor ]  │ └─────────────────────────┘   └──────────────────────────┘ │
│                                      │ ⚠️ Rule: Never rinse both cups in the same week!           │
├──────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ FEEDING CALENDAR MATRIX (3-DAY)      │ QUARANTINE & HOSPITAL COUNTDOWN                            │
│                                      │                                                            │
│ • Mon: Staple Flakes (AM) + Pellets  │ 🏥 Patient: Blue Zebra Angelfish (Fin Tear)               │
│ • Tue: Flakes + Freeze-Dried Bloodwm │ 📅 Day 6 of 14 Days [██████████░░░░░░░░░░] 43%             │
│ • Wed: Light Pinch + FAST ALL ADULTS │ 💊 Protocol: Daily Water Conditioner + Slime Coat Rx       │
└──────────────────────────────────────┴────────────────────────────────────────────────────────────┘
```

1. **Parameter Trend Curves:**
   * Pure SVG sparklines and historical graphs illustrating 7-day and 30-day trajectories for Nitrate ($NO_3^-$), pH, and Temperature.
   * Colored upper and lower target corridors visually demonstrate whether water chemistry is stable or trending toward warning boundaries.
2. **Filter Maintenance Checklist & Media Rotation:**
   * Prevents nitrifying biological collapse by enforcing the alternating media rinse rule: *Cup A (Mechanical Foam)* and *Cup B (Bio-Ceramic Rings)* are tracked on alternating cycles.
   * Visual lock indicator alerts the user if both media types were scheduled for cleaning simultaneously.
3. **Feeding Calendar Matrix:**
   * Dynamic matrix tracking Staple Days, Protein Treat Days, and Weekly Fast Days.
   * Integrated pre-soak countdown timers (e.g. 120-second soak timer for freeze-dried bloodworms to prevent digestive swim-bladder bloat).
4. **Quarantine & Hospital Tank Manager:**
   * Tracks patient fish name, ailment classification, container volume, elapsed days, and discharge countdown with interactive progress meters.

---

### D. Responsive Viewport Specifications

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   RESPONSIVE LAYOUT SPECIFICATIONS                                │
├────────────────────────────┬─────────────────────────────┬────────────────────────────────────────┤
│ Breakpoint                 │ Layout Pattern              │ Key UX Adjustments                     │
├────────────────────────────┼─────────────────────────────┼────────────────────────────────────────┤
│ Mobile (< 640px)           │ Single-column vertical stack│ • Sticky Top Vital Signs horizontal bar│
│                            │ Bottom navigation bar       │ • Canvas height scales to 380px        │
│                            │ Collapsible cards           │ • Touch-friendly 44px tap targets      │
├────────────────────────────┼─────────────────────────────┼────────────────────────────────────────┤
│ Tablet (640px – 1024px)    │ 2-column responsive grid    │ • 7-metric vital signs in 2 rows       │
│                            │ Header tab bar              │ • Canvas height 520px                  │
│                            │ Side-by-side feed & care    │ • Multi-zone feeding pins adaptive font│
├────────────────────────────┼─────────────────────────────┼────────────────────────────────────────┤
│ Desktop (> 1024px)         │ Full 3-column command center│ • Full-width 7-metric Vital Signs strip│
│                            │ Canvas + Diagnostics + Ops  │ • Canvas height 640px–680px            │
│                            │ Simultaneous live views     │ • Real-time telemetry inspector cards  │
└────────────────────────────┴─────────────────────────────┴────────────────────────────────────────┘
```

---

## 5. Comprehensive Testability & Verification Blueprint

To guarantee long-term stability and satisfy objective acceptance criteria, AquaPulse employs a 3-tier testing strategy.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               AQUAPULSE VERIFICATION & TEST MATRIX                                │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Tier 1: Pure Algorithmic Unit Tests (Headless Node.js Test Runner `node --test`)            │  │
│  │ • Sweet-spot range intersection math (overlapping, disjoint, and empty rosters)             │  │
│  │ • Medication dosing math and scaleless fish 50% safety clamp verification                   │  │
│  │ • Hydrodynamic velocity decay calculations and Reynolds flow regime checks                  │  │
│  │ • Predictive nitrate slope analysis and pH stability variance formulas                     │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                              ▲                                                    │
│                                              │                                                    │
│  ┌───────────────────────────────────────────┴─────────────────────────────────────────────────┐  │
│  │ Tier 2: State & Configuration Integration Tests                                             │  │
│  │ • Validation of `aquapulse.config.js` and `aquapulse.private.js` deep-merging               │  │
│  │ • Lenient JSON pre-parsing (trailing commas, comments, unquoted keys)                       │  │
│  │ • LocalStorage isolation by `tank.id` (preventing cross-tank data contamination)            │  │
│  │ • Store reactive event propagation through EventBus                                         │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                              ▲                                                    │
│                                              │                                                    │
│  ┌───────────────────────────────────────────┴─────────────────────────────────────────────────┐  │
│  │ Tier 3: End-to-End Headless Browser Verification                                            │  │
│  │ • Headless Chromium verification script (0 uncaught exceptions / console errors)            │  │
│  │ • Tab switching, modal inspection, and parameter logging DOM workflows                     │  │
│  │ • Viewport screenshot verification (Mobile 375×667, Tablet 768×1024, Desktop 1440×900)      │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Algorithmic Test Cases Specification

1. **SweetSpotOptimizerEngine Tests:**
   * *Case 1 (Harmonic Overlap):* Feeding Denison Barb ($18$–$26^\circ\text{C}$), Neon Tetra ($21$–$26^\circ\text{C}$), and Corydoras ($22$–$27^\circ\text{C}$) yields optimal temperature range $[22.0, 26.0]^\circ\text{C}$ and point target $24.0^\circ\text{C}$.
   * *Case 2 (Thermal Conflict):* Feeding coldwater species ($16$–$22^\circ\text{C}$) with warm discus ($28$–$31^\circ\text{C}$) yields `hasOverlap: false` and generates explicit biological compromise alerts.
   * *Case 3 (Flow Dynamics Recommendation):* Tank containing both Betta (low flow) and Denison Barb (high flow) correctly derives `mode: 'baffled'` with 45° glass deflection advice.

2. **MedicationSafetyEngine Tests:**
   * *Case 1 (Scaleless Safety Clamp):* Tank containing "Bronze Corydoras" with Anti-Parasitic treatment correctly cuts dosage from $10\,\text{ml}/100\,\text{L}$ to $5\,\text{ml}/100\,\text{L}$ ($50\%$ clamp).
   * *Case 2 (Net Volume Scaling):* For a tank with $220\,\text{L}$ net volume, routine water conditioner on $35\%$ water change ($77\,\text{L}$) outputs exactly $7.7\,\text{ml}$ dose.

3. **Lenient JSON Config Parser Tests:**
   * Parser successfully parses JSON strings containing JavaScript trailing commas, single-line `//` comments, and unquoted object keys, returning a valid JavaScript configuration object without throwing syntax exceptions.

---

## 6. Backward Compatibility & Migration Strategy (R4)

To satisfy Requirement R4, the redesigned system maintains 100% backward compatibility with all existing user setups:

1. **Zero Migration Required for Configurations:**
   * Existing `aquapulse.config.js` (`window.AQUAPULSE_DEFAULT_CONFIG`) and `aquapulse.private.js` (`window.AQUAPULSE_PRIVATE_CONFIG`) load seamlessly without requiring property renames or structure alterations.
2. **Lossless LocalStorage Ingestion:**
   * The new `PersistenceAdapter` checks for legacy keys (`aquapulse_<tankId>_params`, `aquapulse_quarantine_data`, `aquapulse_social_incidents`) and migrates them transparently into the namespaced structure.
3. **Zero-Dependency Runtime Execution:**
   * The application remains executable by opening `AquaPulse.html` or `index.html` directly in any modern web browser or through a static web server. No Node.js build pipelines or external bundlers are required for everyday tank operation.

---

## 7. Concrete Implementation Roadmap

Based on this benchmark and blueprint, the overhauled implementation (Requirements R3, R4, R5) will be structured into modular files:

```text
c:\_Projects\Sample\AquaPulse/
├── index.html                       # Clean, modern, responsive app shell
├── aquapulse.config.js              # Standard demo configuration (unchanged contract)
├── aquapulse.private.js             # User private overrides (git-ignored, unchanged contract)
├── src/
│   ├── core/
│   │   ├── Store.js                 # Centralized reactive proxy store
│   │   ├── EventBus.js              # Decoupled pub/sub event bus
│   │   ├── Persistence.js           # Namespaced LocalStorage adapter & CSV exporter
│   │   └── AppShell.js              # Plugin lifecycle orchestrator & DOM mounter
│   ├── engines/
│   │   ├── optimizer.engine.js      # Headless sweet-spot & biological overlap math
│   │   ├── flow.engine.js           # Headless flow vectors, particle physics & strata
│   │   ├── medication.engine.js     # Headless dosage calculation & scaleless safety clamps
│   │   ├── quarantine.engine.js     # Headless isolation countdown & progress calculations
│   │   └── trend.engine.js          # Headless predictive parameter trend analyzer
│   ├── hal/
│   │   ├── TelemetryPacket.js       # Unified telemetry schema & validators
│   │   ├── ITelemetryProvider.js    # Provider interface contract
│   │   ├── SimulatedProvider.js     # Realistic demo telemetry simulator
│   │   └── ManualLogProvider.js     # Water test kit manual entry bridge
│   ├── plugins/
│   │   ├── vital-signs/             # Above-the-fold immediate status indicator badges
│   │   ├── flow-canvas/             # Interactive multi-layer flow & aquascape canvas
│   │   ├── feeding-planner/         # Feeding matrix, soak timers & drop zone guidance
│   │   ├── species-roster/          # Inhabitants directory & sweet-spot trigger
│   │   ├── care-hub/                # Filter maintenance, checklists & water test logs
│   │   ├── medicine-calculator/     # Safe dosage calculator & symptom checker modal
│   │   └── social-quarantine/       # Aggression radar & hospital tank tracker
│   └── utils/
│       └── json-cleaner.js          # Lenient JSON parser with line/column diagnostic
└── tests/
    ├── unit/
    │   ├── optimizer.test.js        # Mathematical overlap & compromise unit tests
    │   ├── medication.test.js       # Scaleless safety clamp & dosage unit tests
    │   └── flow.test.js             # Flow vector calculation unit tests
    └── e2e/
        └── verify-dashboard.js      # Headless verification script for DOM & console errors
```

---

## 8. Conclusion

This architecture resolves the single-file bottleneck of AquaPulse while elevating the user experience to match modern professional environmental IoT systems. By decoupling state, biological calculations, telemetry sources, and presentation plugins, AquaPulse becomes resilient, extensible for third-party contributors, and verifiable across automated test suites.

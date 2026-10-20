# AquaPulse Contributor & Developer Extension Guide

This guide details the redesigned AquaPulse 4-tier modular architecture and provides step-by-step tutorials for extending the system with custom sensors, biological species, calculators, and UI widgets.

---

## 🏛️ System Architecture Overview

AquaPulse is decoupled into 4 standalone tiers with zero runtime build dependencies:

```text
┌─────────────────────────────────────────────────────────────┐
│ Tier 4: Presentation Shell & Dynamic UI Modules             │
│ (AppShell, VitalSignsStrip, FlowCanvas, CareHub, Modals)    │
└──────────────────────────┬──────────────────────────────────┘
                           │ Dispatches UI events & subscribes
┌──────────────────────────▼──────────────────────────────────┐
│ Tier 3: Telemetry Hardware Abstraction Layer (HAL)          │
│ (ITelemetryProvider: Simulated, Manual, IoT WebSockets)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ Normalized data streams
┌──────────────────────────▼──────────────────────────────────┐
│ Tier 2: Pure Domain Calculation Engines (Zero DOM)          │
│ (FlowEngine, OptimizerEngine, MedicationEngine, CareEngine) │
└──────────────────────────┬──────────────────────────────────┘
                           │ Pure algorithms & biological matrices
┌──────────────────────────▼──────────────────────────────────┐
│ Tier 1: Core Foundation & Reactive State Management         │
│ (AquaPulseStore, EventBus, ConfigManager, PluginRegistry)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 1. Creating a Custom Plugin / Widget

All extensions adhere to the `IPlugin` contract managed by `src/core/plugin-registry.js`.

### Plugin Interface Contract:
```typescript
interface IPlugin {
  id: string;               // Unique string identifier
  name: string;             // Human-readable display name
  version?: string;         // Semantic version
  category: 'telemetry' | 'calculator' | 'widget' | 'diagnostic';
  mount(container: HTMLElement, store: AquaPulseStore, eventBus: EventBus): void;
  unmount(): void;
  update?(telemetryPacket: Object): void;
}
```

### Tutorial: Adding a Custom CO₂ Drop Checker Widget

Create a new file `src/plugins/co2-checker-plugin.js`:

```javascript
export const CO2CheckerPlugin = {
  id: 'co2-drop-checker',
  name: 'CO₂ Saturation Monitor',
  version: '1.0.0',
  category: 'widget',

  mount(container, store, eventBus) {
    this.container = container;
    this.container.innerHTML = `
      <div class="glass-card p-4 rounded-2xl border border-emerald-500/30">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-300">🌿 CO₂ Saturation</span>
          <span id="co2-badge" class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">OPTIMAL (~30 ppm)</span>
        </div>
        <p class="text-[11px] text-slate-400 mt-1">Calculated via pH and KH buffer equilibrium.</p>
      </div>
    `;

    // Subscribe to state updates
    this.unsubscribe = store.subscribe((newState) => {
      this.recalculate(newState);
    });
  },

  recalculate(state) {
    const ph = state.telemetry?.current?.ph || 7.0;
    const kh = state.telemetry?.current?.kh || 4.0;
    // Frank Pelegri CO2 formula: 3 * KH * 10^(7.0 - pH)
    const ppm = Math.round(3 * kh * Math.pow(10, 7.0 - ph));
    
    const badge = this.container.querySelector('#co2-badge');
    if (badge) {
      if (ppm < 15) {
        badge.className = 'px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 font-bold';
        badge.textContent = `LOW (${ppm} ppm)`;
      } else if (ppm > 35) {
        badge.className = 'px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold';
        badge.textContent = `HIGH (${ppm} ppm)`;
      } else {
        badge.className = 'px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold';
        badge.textContent = `OPTIMAL (${ppm} ppm)`;
      }
    }
  },

  unmount() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.container) this.container.innerHTML = '';
  }
};
```

Register it in `AquaPulse.html`:
```javascript
import { CO2CheckerPlugin } from './src/plugins/co2-checker-plugin.js';
pluginRegistry.register(CO2CheckerPlugin);
```

---

## 🐟 2. Adding a New Species to the Biological Optimizer

Open [`src/engines/optimizer-engine.js`](./src/engines/optimizer-engine.js) and add your species profile to `SPECIES_DATABASE`:

```javascript
"cardinal-tetra": {
  name: "Cardinal Tetra",
  scientific: "Paracheirodon axelrodi",
  tempMin: 23.5, tempMax: 29.0, tempOptimal: 26.0,
  phMin: 4.6, phMax: 7.2, phOptimal: 6.0,
  ghMin: 1, ghMax: 6,
  khMin: 1, khMax: 4,
  flowPreference: "low",
  scaleless: false,
  sensitivities: ["Requires acidic soft water", "Sensitive to sudden pH jumps"]
}
```

The mathematical intersection engine automatically factors this species into:
- Safe temperature overlap $[\max(T_{\min}), \min(T_{\max})]$
- pH buffer corridors
- Hydrodynamic current recommendation (direct venturi vs. baffled convection)
- Bioload density calculation

---

## 📡 3. Connecting Real IoT Sensors via Telemetry HAL

The Telemetry Hardware Abstraction Layer (`src/telemetry/telemetry-hal.js`) normalizes incoming sensor data.

To connect an ESP32, Raspberry Pi, or Home Assistant MQTT / WebSocket feed:

```javascript
import { TelemetryHAL } from './src/telemetry/telemetry-hal.js';

const telemetry = new TelemetryHAL({ store, eventBus, tankId: 'my-tank' });

// Ingest WebSocket / MQTT packets:
const ws = new WebSocket('ws://esp32-aquarium.local/telemetry');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  telemetry.ingest({
    timestamp: new Date().toISOString(),
    metrics: {
      temp: data.temperature_c,
      ph: data.water_ph,
      tds: data.tds_ppm
    }
  });
};
```

The `VitalSignsStrip` and `ParamLogger` will automatically react and re-render without requiring page reloads or DOM querying.

---

## 🧪 4. Running Verification Tests

Run the test runner at any time:
```bash
node tests/run-tests.js
```

Run engine and core specific unit checks:
```bash
node tests/verify-m1-core.js
node tests/verify-m2-engines.js
```

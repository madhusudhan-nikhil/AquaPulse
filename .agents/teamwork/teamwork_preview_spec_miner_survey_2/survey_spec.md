# AquaPulse Comprehensive System Specification & Domain Model Survey

> **Document Version**: 2.0.0-PROBE  
> **Target System**: AquaPulse Aquarium Ecosystem Command & Management System  
> **Investigation Scope**: Configuration Schema, Water Chemistry Mathematics, Biological Knowledge Base, Configuration Layer Continuity (R4), and Hardware Telemetry Integration.  
> **Source Files Inspected**: `aquapulse.config.js`, `aquapulse.private.js`, `aquapulse.optimizer.js`, `aquapulse.intelligence.js`, `aquapulse.flow.js`, `AquaPulse.html`, `README.md`, `.gitignore`.

---

## 1. Executive Summary

AquaPulse is a modular, zero-dependency browser-based aquarium telemetry and ecosystem management dashboard. This specification mines and formalizes all domain models, biological databases, mathematical formulas, parameter safety thresholds, and configuration lifecycle rules embedded in the existing codebase.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Configuration | Dual Config Runtime Deep Merge | Merges `AQUAPULSE_PRIVATE_CONFIG` on top of `AQUAPULSE_DEFAULT_CONFIG` at runtime, preserving private tank customizations without git tracking | `window.AQUAPULSE_DEFAULT_CONFIG`, `window.AQUAPULSE_PRIVATE_CONFIG` | Merged configuration object in `window.AQUAPULSE_DEFAULT_CONFIG` | No-op if private config is undefined | `AquaPulse.html:10-26` |
| 2 | Configuration | Multi-Tank LocalStorage Scoping | Isolates parameter logs, sponge rotation state, and checklist tasks by tank identifier | `tank.id` (e.g. `tank-255l-community`, `tank-demo-community`) | Isolated storage keys: `aquapulse_<id>_params`, `aquapulse_<id>_tasks`, `aquapulse_<id>_sponge_idx` | Falls back to key prefix `aquapulse_default_...` if `tank.id` missing | `AquaPulse.html:2350, 2408` |
| 3 | Configuration | Dual-Mode Profile Manager Modal | Provides dual-tab configuration editing via visual syntax-safe HTML form and raw JSON monospace editor | Form input fields or JSON text | Active config saved to `aquapulse_active_config` and re-rendered in UI | Blocks tab switch with alert if raw JSON contains syntax errors | `AquaPulse.html:1110-1230` |
| 4 | Configuration | Lenient JSON Parser & Auto-Sanitizer | Parses user-provided JSON with automated stripping of comments, trailing commas, and smart quotes | Raw text string with comments, trailing commas, or curly quotes | Clean parsed JavaScript object | Catches `SyntaxError`, extracts position, line, and column for user feedback | `AquaPulse.html:1233-1250, 1288-1308` |
| 5 | Configuration | Profile Export & Import | Exports active profile as formatted `.json` file and imports external profiles with format validation | File input (`.json`) or export button click | Triggered file download `${tank.id}_profile.json` or imported configuration applied to UI | Alert prompt if imported JSON is invalid or lacks required sections (`tank`, `species`, `medicines`) | `AquaPulse.html:1385-1415` |
| 6 | Configuration | Sample Preset Switcher | Allows instant toggling between pre-packaged tank templates (255L Community vs. 60L Nano Betta) | Preset key (`'255l'` or `'60l'`) | Populates editor and active profile with preset template configuration | No-op if unrecognized preset key | `AquaPulse.html:1417-1446` |
| 7 | Chemistry | Water Health Diagnostics Engine | Evaluates water test measurements against safe, warning, and critical thresholds for 7 parameters | Log entry (`nh3`, `no2`, `no3`, `ph`, `temp`, `gh`, `kh`) | Health status badge (`OPTIMAL`, `WATCH`, `ACTION NEEDED`) & diagnostic banner with action directives | Fallbacks to defaults if reading properties are null or empty | `AquaPulse.html:2496-2598` |
| 8 | Chemistry | Predictive Pattern Trend Engine | Analyzes rate of change between the two most recent water tests to detect biological filter strain, rapid nitrate accumulation, or temperature swings | Parameter log history array (`logs[0]`, `logs[1]`), config targets | Status (`Ecosystem Stable` vs `Patterns Detected`) and bulleted predictive insights | Returns status `"Insufficient Data"` if fewer than 2 logs exist | `aquapulse.intelligence.js:104-142` |
| 9 | Chemistry | CSV Water Log Export | Serializes stored parameter test history into standard CSV format for external analysis | Stored parameter logs | Triggered download of `${tank.id}_water_log.csv` | No-op if no logs are present | `AquaPulse.html:2674-2699` |
| 10 | Biology | Inhabitants Tolerance Overlap Analyzer | Computes mathematical intersection of temperature, pH, GH, and KH tolerance windows across all configured tank species | `species` array from active config | Minimum/maximum bounds, recommended sweet spots, and flow dynamics recommendations | Fallback to safe tropical profile if species is unrecognized | `aquapulse.optimizer.js:203-366` |
| 11 | Biology | Inhabitants Sweet-Spot Optimizer Modal | Interactive modal displaying golden overlap cards, flow recommendation, species tolerance table, biological conflict warnings, and "Apply Derived Targets" button | Inhabitants analysis object, active config | UI modal presentation with target application hook | Displays message if no inhabitants are found | `aquapulse.optimizer.js:370-543` |
| 12 | Biology | Visual Symptom Diagnostic Checker | Categorized interactive catalog of fish ailments (Ich, Fin Rot, Bloat, Fin Nipping, Surface Gasping) with linked prescription protocols | User symptom selection click | Recommended action protocol and automated link to Medicine Calculator tab | Gracefully ignores invalid symptom ID | `aquapulse.intelligence.js:14-59, 146-229` |
| 13 | Care & Medicine | Scaled Medicine Dosage Calculator | Calculates precise liquid (ml) or powder (g) medication dosages scaled to tank or hospital volume with 50% safety lock for sensitive species | Volume slider (L), medication scenario ID, sensitive species flags | Formatted dosage output, warning banners, and step-by-step administration protocol | Defaults to first scenario if scenario ID missing; caps dosage formatting | `AquaPulse.html:2056-2185` |
| 14 | Care & Medicine | Quarantine Tank Isolation Tracker | Tracks hospital/quarantine bucket status, patient fish name, elapsed days, and remaining countdown to discharge | LocalStorage `aquapulse_quarantine_data` | Days elapsed, days remaining, isolation badge, discharge/log patient action | Initializes default safe standby object if storage empty | `aquapulse.intelligence.js:62-80, 271-378` |
| 15 | Care & Medicine | Social Aggression & Nipping Logger | Records chasing and fin-nipping incidents (aggressor, victim, trigger, and remediation action) | Incident data (date, aggressor, victim, trigger, actionTaken) | Interactive log table with timestamped records and delete controls | Seeds sample incident if storage empty | `aquapulse.intelligence.js:82-102, 317-404` |
| 16 | Care & Hardware | Alternating Filter Sponge Rotation | Tracks alternating weekly maintenance cycles across multi-cup/canister filter media to prevent bio-filter collapse | LocalStorage `aquapulse_<id>_sponge_idx`, equipment cups array | Active cup highlight, rinse instructions ("Rinse only Cup A in old tank water") | Modulo wrap-around prevents index out-of-bounds | `AquaPulse.html:2384-2403` |
| 17 | Care & Hardware | Weekly Maintenance Checklist | Interactive checklist of weekly tank care tasks (water testing, water change, media rinse, intake inspection, LED ramp down) | Checkbox toggle events | Checked status persisted in `localStorage` with line-through styling | Reset button clears all tasks back to unchecked | `AquaPulse.html:2349-2382` |
| 18 | Feeding & Pantry | 5-Zone Targeted Feeding Layer | Visual interactive drop pins on the aquascape canvas representing distinct depth strata feeding zones with sequenced highlight flows | Selected feeding sequence (`all`, `morning`, `evening`, `night`, `treat`) | Canvas pin highlight rings, dimmed non-target pins, and actionable protocol card | Safe defaults if pins are not present in DOM | `AquaPulse.html:1676-1846` |
| 19 | Feeding & Pantry | Pre-Soak Countdown Timer | Interactive timer for high-protein freeze-dried foods (Tubifex, Bloodworms) to prevent digestive bloat | Food item `soakRequiredSec` (e.g. 180s) | Live second-by-second countdown display, "Ready to Feed!" notification, and reset toggle | Clears interval cleanly on reset or completion | `AquaPulse.html:1849-1873, 2004-2027` |
| 20 | Feeding & Pantry | Pantry & Food Item Editor | Visual modal to create, update, or delete pantry food items with dosage tips and target zones | Food attributes (name, badge, timing, zone, primary fish, tip, soakRequiredSec, desc) | Config updated in memory & LocalStorage, food cards re-rendered | Prompts for required food name; confirms before deletion | `AquaPulse.html:1905-1996` |
| 21 | Feeding & Pantry | Dynamic Feeding Schedule Planner | Day-by-day feeding schedule viewer (Mon–Sun) detailing morning, evening, and lights-out bottom check regimens | Selected day index | Morning, evening, and night feeding instructions rendered in detail cards | Defaults to day index 0 if index out of bounds | `AquaPulse.html:2029-2053` |
| 22 | Hydrodynamics | Procedural Hardscape & Flow Simulator | HTML5 Canvas simulation rendering spiderwood hardscape, live Anubias, Java Moss, river rock sanctuary, gravel bed, Pothos roots, and animated flow | Canvas dimensions, animation frame clock, flow mode (`current` vs `baffled`) | Real-time particle streamlines, micro-bubbles, caustic lighting rays, and swimming fish | Graceful exit if canvas context is missing or dimensions $\le 0$ | `aquapulse.flow.js:14-253` |
| 23 | Hydrodynamics | Velocity Heatmap Layer | Toggleable canvas overlay visualizing flow speed distribution across water column (Jet Red/Amber, Eddy Cyan, Slack Pocket Emerald) | User toggle button click | Rendered radial and linear color gradients on canvas | Toggles state cleanly without restarting physics loop | `aquapulse.flow.js:237-239, 546-582` |
| 24 | Hydrodynamics | Dynamic Swimming Fish Silhouette & Tail Wag | Animates species silhouettes at assigned depth strata with hovering wobble and oscillating tail fin wags | Config species array, flow preference | Swimming silhouettes, tail wagging, status pills ("⚠️ Seeking Calm Zone" vs "✅ Comfortable") | Safe fallbacks to default fish roster if config species empty | `aquapulse.flow.js:35-81, 640-708` |
| 25 | Species Directory | Interactive Species Roster Manager | Catalog of all species with stratum badges, count modifiers (+/-), watchlist flags, and edit/delete modals | User count button clicks, filter buttons, modal submissions | Live updated counts, telemetry badges, and species cards | Deletion confirmed via prompt; reducing count to 0 triggers deletion prompt | `AquaPulse.html:2188-2346` |

---

## 3. Edge Cases Discovered

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Lenient JSON Parser | Trailing commas in objects or arrays (e.g. `{"tank": 120,}`) | Successfully parsed: regex `s.replace(/,(\s*[}\]])/g, '$1')` strips trailing comma before `JSON.parse`. |
| 2 | Lenient JSON Parser | Single-line (`// ...`) and multi-line (`/* ... */`) comments | Successfully stripped: regex replaces comments outside quotation marks with empty strings before parsing. |
| 3 | Lenient JSON Parser | Unicode smart/curly quotes (e.g. `“name”: “Tank”`) | Converted to standard ASCII `"` and `'` characters prior to JSON parsing. |
| 4 | Lenient JSON Parser | Malformed JSON syntax (unclosed braces, invalid tokens) | Throws `SyntaxError`. The error message is inspected via `/position\s+(\d+)/i` to calculate exact 1-indexed line and column numbers, rendering a helpful error box with the offending code snippet. |
| 5 | Config Validation | JSON profile missing `"tank"`, `"species"`, or `"medicines"` | Rejects save with explicit error: `'Aquarium profile must contain "tank", "species", and "medicines" sections.'` |
| 6 | Config Deep Merge | Private config overrides array property (e.g. `species` or `checklistTasks`) | Arrays are **not** deep-merged; the private array completely replaces the default array. Only non-array objects are recursively merged. |
| 7 | Config Storage Isolation | Switching `tank.id` from `tank-demo-community` to `tank-255l-community` | Task checklists and parameter logs switch storage partitions (`aquapulse_tank-demo-community_tasks` vs `aquapulse_tank-255l-community_tasks`), ensuring zero data cross-contamination. |
| 8 | Parameter Diagnostics | Ammonia $> 0.0$ ppm | Instantly flags severity as `"critical"`, alerts user to perform an emergency 50% water change, computes exact conditioner volume (`(0.5 * netVol) * 0.1 ml`), and orders a 24h tank fast. |
| 9 | Parameter Diagnostics | Temperature deviation $> 2.0$°C above max or $< 3.0$°C below min | Triggers critical `"ACTION NEEDED"` status rather than just warning `"WATCH"` status. |
| 10 | Predictive Pattern Engine | Fewer than 2 logged readings in history | Returns status `"Insufficient Data"` with guidance: `"Log at least 2 water test readings to enable pattern detection..."`. |
| 11 | Predictive Pattern Engine | Nitrate increases by $> 10$ ppm in $\le 7$ days | Triggers alert: `"Rapid Nitrate Accumulation: Nitrate rose by +X ppm in Y days. Heavy bioload detected..."`. |
| 12 | Predictive Pattern Engine | Ammonia changes from $0.0$ in previous test to $> 0.0$ in latest test | Triggers alert: `"Emerging Bio-Filter Strain: Ammonia spiked from 0.0 to X ppm..."`. |
| 13 | Inhabitants Optimizer | Incompatible species with disjoint temperature windows ($\max(T_{\min}) > \min(T_{\max})$) | Detects no overlap (`hasOverlap = false`), defaults recommended temperature to 25.5°C (range 25.0–26.0°C), and generates individual warning bullets for every species pushed outside its biological limit. |
| 14 | Inhabitants Optimizer | Unknown species ID and name | Falls back to generic safe tropical profile: Temp 23.0–27.0°C (Opt: 25.0°C), pH 6.5–7.5 (Opt: 7.0), GH 4–12, KH 2–6, moderate flow, scaleless false. |
| 15 | Inhabitants Optimizer | High-flow species (e.g. Denison Barbs) housed with calm-water species (e.g. Bettas/Gouramis) | Triggers flow recommendation: `"45° Glass-Baffled Return Recommended"` to preserve dissolved oxygen while protecting calm surface pockets. |
| 16 | Medicine Calculator | Scaleless fish present during anti-parasitic treatment (`ichMain`) | Safety lock applies: `doseFactor = 0.5`. Dosage is halved automatically to prevent chemical burns on Corydoras and sensitive Tetras. |
| 17 | Medicine Calculator | Aquarium Salt selected | UI renders high-contrast warning badge: `"🚫 NEVER Add to Planted Display Tank"`; documentation stipulates strictly hospital container use due to plant death and Corydoras salt intolerance. |
| 18 | Species Count Modifier | Decrementing species count when count equals 1 | Prompts user confirmation to delete the species from the tank roster; if confirmed, removes species entirely. |
| 19 | Canvas Flow Physics | Particle travels past left glass edge ($x < 12\% \text{ width}$) | Linear jet deflects downward (`vx *= 0.6; vy += 0.75`), simulating realistic fluid glass deflection. |
| 20 | Canvas Flow Physics | Flow mode toggled to `baffled` | Physics changes from unidirectional linear vector to circular convective loop; fish target coordinates shift to calm pockets, and labyrinth fish label updates from `"⚠️ Seeking Calm Zone"` to `"✅ Comfortable"`. |

---

## 4. Comprehensive Configuration Schema Specification

AquaPulse configurations adhere to a strictly defined JSON/JavaScript object schema. Below is the complete field-by-field specification extracted from `aquapulse.config.js` and `aquapulse.private.js`.

### 4.1 Schema Definition

```typescript
interface AquaPulseConfig {
  tank: TankSpecification;
  targets: WaterTargets;
  equipment: EquipmentSpecification;
  zones: Record<string, AquascapeZone>;
  flowModes: Record<string, FlowMode>;
  species: SpeciesItem[];
  foods: FoodItem[];
  feedingSchedule: FeedingDaySchedule[];
  medicines: MedicineItem[];
  medScenarios: MedicineScenario[];
  checklistTasks: MaintenanceTask[];
}

interface TankSpecification {
  id: string;                  // Unique identifier used for LocalStorage key partitioning
  name: string;                // Human-readable aquarium display name
  badge: string;               // Version or profile badge (e.g. "Demo v1.0", "v2.1 + Parameter Engine")
  dimensions: {
    length: number;            // Front length
    width: number;             // Depth (front-to-back)
    height: number;            // Height (bottom-to-top)
    unit: "ft" | "m" | "in" | "cm";
  };
  volumeGrossL: number;        // Gross external tank capacity in liters
  volumeNetL: number;          // Net water capacity accounting for hardscape and substrate displacement
  waterType: string;           // E.g. "Freshwater Community", "Freshwater Planted Community"
  substrate: string;           // Substrate material description
  substrateTip: string;        // Maintenance instruction for vacuuming substrate
}

interface WaterTargets {
  temp: { min: number; max: number; unit: "°C" | "°F" };
  ph: { min: number; max: number };
  ammoniaMax: number;          // Safe ceiling (typically 0.0 ppm)
  nitriteMax: number;          // Safe ceiling (typically 0.0 ppm)
  nitrateTarget: { min: number; max: number; unit: "ppm" };
  nitrateWarning: number;      // Threshold triggering warning status (typically 30 ppm)
  nitrateCritical: number;     // Threshold triggering critical status (typically 50 ppm)
  ghTarget: { min: number; max: number; unit: "dGH" };
  khTarget: { min: number; max: number; unit: "dKH" };
}

interface EquipmentSpecification {
  filter: {
    name: string;
    flowRateLph: number;       // Filter throughput in Liters per Hour
    turnoverTarget: string;    // Target turnover string (e.g. "~8×/hr")
    cups: FilterCup[];         // Filter compartments for alternating maintenance
    rinseInstructions: string;
  };
  heater: {
    name: string;
    wattage: number;           // Power in Watts
    placement: string;         // Optimum hydrodynamic placement advice
  };
  lighting: {
    name: string;
    maxPhotoperiodHours: number; // Maximum recommended daily photoperiod
    nightRampDownMinutes: number;// Ramp-down window to prevent startle reflex
    warning: string;
  };
  plants: PlantItem[];
}

interface FilterCup {
  id: string;                  // "A", "B", etc.
  name: string;                // Display name
  media: string;               // Filter media type (mechanical, biological, chemical)
}

interface PlantItem {
  name: string;
  type: "Epiphyte" | "Emersed Riparium" | "Stem" | "Surface" | string;
  function?: string;           // Ecological role (e.g. "Nitrate sponge")
  placement?: string;          // Hardscape anchoring location
}

interface AquascapeZone {
  id: string;
  name: string;
  category: "hardware" | "plant" | "feeding-zone" | "hardscape" | "shelter";
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    width?: string;
    height?: string;
  };
  title: string;
  body: string;
  tip: string;
  badgeText?: string;
}

interface FlowMode {
  id: string;
  label: string;
  jetLabel: string;
  shelterTitle: string;
  shelterDesc: string;
  shelterBadgeClass: string;
}

interface SpeciesItem {
  id: string;                  // Slug matching SPECIES_DATABASE key
  name: string;
  count: number;
  zone: "top" | "mid" | "bottom";
  watch: boolean;              // High-watch behavioral or sensitivity flag
  temp: string;                // Human-readable range string (e.g. "25–28°C")
  food: string;                // Preferred food items
  note: string;                // Care, behavior, and sensitivity notes
}

interface FoodItem {
  id: string;
  name: string;
  badge: string;               // E.g. "Daily Staple", "Color & Growth Stick", "High-Protein Treat"
  badgeClass: string;          // Tailwind badge classes
  borderClass: string;         // Tailwind border accent class
  timing: string;              // Frequency string
  desc: string;
  targetZone: string;          // Aquascape delivery zone
  primaryFish: string;         // Target species
  tip: string;
  soakRequiredSec: number;     // Mandatory pre-soak duration in seconds (0 = none)
}

interface FeedingDaySchedule {
  day: string;                 // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
  type: string;                // Session theme (e.g. "Staple + Veggie Night", "Tubifex Treat Day")
  morning: string;
  evening: string;
  night: string;
}

interface MedicineItem {
  id: string;
  name: string;
  bottleSize: string;
  purpose: string;
  badge: string;
  badgeClass: string;
  borderClass: string;
  ratePer100L: number;         // Standard dosage rate per 100 net liters
  unit: "ml" | "g";
  safeMainTank: boolean;       // Safe for display tank bio-filter
  safePlants: boolean;         // Safe for live flora
  safeScaleless: boolean;      // Safe for scaleless fish at standard dose
  sensitiveSpecies?: string[]; // Specific species requiring caution
  lockFactor?: number;         // Dose multiplier when sensitive species present (typically 0.5)
  desc: string;
}

interface MedicineScenario {
  id: string;
  name: string;
  defaultVolumeRatio?: number; // Fraction of net tank volume (e.g. 0.35 = 35% WC)
  fixedVolume?: number;        // Fixed container volume in Liters (e.g. 10L, 15L)
  fullWidth?: boolean;
  medKey: string;              // Foreign key referencing MedicineItem.id
  secondaryMedKey?: string;   // Optional secondary medication (e.g. water conditioner in hospital)
  useLock?: boolean;           // Whether to enforce sensitive species lockFactor
  headline: string;
  badge: string;
  badgeClass: string;
  detail?: string;
  bulletPoints?: string[];     // Bulleted protocol instructions
}

interface MaintenanceTask {
  id: string;
  title: string;
  detail: string;
}
```

### 4.2 Hardware Telemetry Hooks & Defaults Comparison

| Parameter / Field | Default Demo Setup (`aquapulse.config.js`) | Private Personal Setup (`aquapulse.private.js`) | Nano Preset (`60l`) |
|---|---|---|---|
| **Tank ID** | `tank-demo-community` | `tank-255l-community` | `tank-60l-betta` |
| **Tank Name** | AquaPulse Demo Tank | AquaPulse 255L Ecosystem Command | AquaPulse 60L Nano Haven |
| **Gross Volume** | 120 Liters | 255 Liters | 60 Liters |
| **Net Volume** | 100 Liters | 220 Liters | 50 Liters |
| **Dimensions** | 2 × 1.5 × 1.5 ft | 3 × 2 × 1.5 ft | 2 × 1 × 1 ft |
| **Water Type** | Freshwater Community | Freshwater Planted Community | Freshwater Nano Planted |
| **Substrate** | Fine Natural Gravel | Medium-Coarse Black Gravel Substrate | Fine Black Sand |
| **Target Temp** | 24.5°C – 26.5°C | 25.5°C – 26.0°C | 25.0°C – 26.5°C |
| **Target pH** | 6.5 – 7.5 | 6.6 – 7.4 | 6.5 – 7.2 |
| **Target NH₃ / NO₂⁻** | Max 0.0 ppm / Max 0.0 ppm | Max 0.0 ppm / Max 0.0 ppm | Max 0.0 ppm / Max 0.0 ppm |
| **Target NO₃⁻ (ppm)** | 5 – 25 (Warn: 30, Crit: 50) | 5 – 25 (Warn: 30, Crit: 50) | 5 – 25 (Warn: 30, Crit: 50) |
| **Target GH / KH** | 4–12 dGH / 3–8 dKH | 4–12 dGH / 3–8 dKH | 4–10 dGH / 2–6 dKH |
| **Filter Model** | Hang-on-Back Filter | Internal Dual-Cup Filter | Nano Internal Filter |
| **Filter Flow Rate** | 500 L/Hr (~5×/hr turnover) | 1750 L/Hr (~8×/hr turnover) | 350 L/Hr (~7×/hr turnover) |
| **Filter Media Cups** | 2 (A: Mechanical, B: Biological) | 2 (A: Coarse Sponge, B: Bio-Media + Fine Pad) | 1 (Sponge Cartridge) |
| **Heater Wattage** | 100W (1.00 W/Net L) | 200W (0.91 W/Net L) | 50W (1.00 W/Net L) |
| **Lighting Photoperiod** | 8.0 Hours/Day | 6.5 Hours/Day | 6.0 Hours/Day |
| **Total Fish Count** | 22 Fish (4 species) | 70 Fish (12 species) | 17 Fish (4 species) |

---

## 5. Water Chemistry Parameters, Mathematical Formulas & Safety Thresholds

### 5.1 Chemistry Parameter Matrix

AquaPulse continuously audits 7 fundamental water chemistry parameters:

| Parameter | Unit | Safe / Optimal | Warning Range | Critical / Action Needed | Primary Ecological Risk |
|---|---|---|---|---|---|
| **Ammonia ($\text{NH}_3$)** | ppm | $\le 0.0$ ppm | $0.0 < \text{NH}_3 \le 0.1$ ppm | $> 0.1$ ppm | Gill necrosis, osmotic shock, acute neurological mortality |
| **Nitrite ($\text{NO}_2^-$)** | ppm | $\le 0.0$ ppm | $0.0 < \text{NO}_2^- \le 0.1$ ppm | $> 0.1$ ppm | Methemoglobinemia ("brown blood disease"), suffocation |
| **Nitrate ($\text{NO}_3^-$)** | ppm | $5 - 25$ ppm | $30 < \text{NO}_3^- < 50$ ppm | $\ge 50$ ppm | Chronic immune suppression, stunting, explosive nuisance algae |
| **Acidity ($\text{pH}$)** | pH scale | $[\text{pH}_{\min}, \text{pH}_{\max}]$ (e.g. 6.6–7.4) | $\text{pH} < \text{pH}_{\min}$ or $\text{pH} > \text{pH}_{\max}$ | $< 6.0$ or $> 8.2$ | Acidosis, alkalosis, epidermal burning, ammonia toxicity shift |
| **Temperature ($T$)** | °C | $[T_{\min}, T_{\max}]$ (e.g. 25.5–26.0) | $T < T_{\min}$ or $T > T_{\max}$ | $T > T_{\max} + 2.0$ or $T < T_{\min} - 3.0$ | Thermal shock, hypoxia at high $T$, metabolic collapse at low $T$ |
| **General Hardness ($\text{GH}$)** | dGH | $4 - 12$ dGH | $< 3$ or $> 15$ dGH | $< 2$ or $> 18$ dGH | Osmoregulatory failure, calcium/magnesium deficiency, molt death |
| **Carbonate Hardness ($\text{KH}$)** | dKH | $3 - 8$ dKH | $< 2$ or $> 10$ dKH | $< 1$ dKH | Total loss of buffering capacity, catastrophic pH crash |

### 5.2 Diagnostic Logic & Automated Prescription Formulas

#### A. Entry Status Classification Algorithm (`evaluateEntryStatus`)
Given a test reading $R = \{\text{nh3}, \text{no2}, \text{no3}, \text{ph}, \text{temp}, \text{gh}, \text{kh}\}$ and target bounds $T$:

$$\text{Status}(R) = \begin{cases} 
\text{"ACTION NEEDED" (Critical)}, & \text{if } R.\text{nh3} > 0.1 \lor R.\text{no2} > 0.1 \lor R.\text{no3} \ge T.\text{nitrateCritical} \\
& \lor R.\text{temp} > (T.\text{temp.max} + 2.0) \lor R.\text{temp} < (T.\text{temp.min} - 3.0) \\
\text{"WATCH" (Warning)}, & \text{else if } R.\text{no3} > T.\text{nitrateWarning} \lor R.\text{ph} < T.\text{ph.min} \lor R.\text{ph} > T.\text{ph.max} \\
& \lor R.\text{temp} > T.\text{temp.max} \lor R.\text{temp} < T.\text{temp.min} \\
\text{"OPTIMAL" (Safe)}, & \text{otherwise.}
\end{cases}$$

#### B. Emergency Water Change & Conditioner Prescription
When $\text{NH}_3 > 0.0$ ppm:
- Emergency Water Change Volume:
  $$V_{\text{emergency}} = \text{round}(V_{\text{net}} \times 0.50) \quad [\text{Liters}]$$
- Detoxifying Conditioner Dose (Stress Heal):
  $$D_{\text{conditioner}} = \left(V_{\text{emergency}} \times 0.10\right) \quad [\text{ml}]$$
- Regimen: Fast entire tank for 24 hours; re-test in 24 hours.

#### C. Routine Water Change & Conditioner Prescription
- Scheduled Water Change Volume:
  $$V_{\text{routine}} = \text{round}(V_{\text{net}} \times 0.35) \quad [\text{Liters}]$$
- Conditioner Maintenance Dose:
  $$D_{\text{routine}} = \left(V_{\text{routine}} \times 0.10\right) \quad [\text{ml}]$$

#### D. Predictive Pattern Trend Engine Formulas
Given consecutive readings $R_{\text{latest}}$ and $R_{\text{previous}}$ logged at dates $t_0, t_1$:
- Days between tests:
  $$\Delta t = \max\left(1, \text{round}\left(\frac{t_0 - t_1}{86{,}400{,}000}\right)\right)$$
- Nitrate accumulation rate:
  $$\Delta \text{NO}_3 = R_{\text{latest}}.\text{no3} - R_{\text{previous}}.\text{no3}$$
  - If $\Delta \text{NO}_3 > 10$ and $\Delta t \le 7$: Flag `"Rapid Nitrate Accumulation"`. High bioload; recommend substrate vacuuming and plant root cleaning.
  - If $\Delta \text{NO}_3 \le 0$ and $R_{\text{latest}}.\text{no3} \le 25$: Flag `"Nitrate Export Stable"`. Biological balance achieved.
- Emerging bio-filter strain:
  - If $R_{\text{latest}}.\text{nh3} > 0$ and $R_{\text{previous}}.\text{nh3} == 0$: Flag `"Emerging Bio-Filter Strain"`. Recommend 24h fasting and check filter media maintenance history.
- Temperature thermal stability:
  $$\Delta T = |R_{\text{latest}}.\text{temp} - R_{\text{previous}}.\text{temp}|$$
  - If $\Delta T \ge 1.5$°C: Flag `"Temperature Fluctuation"`. Recommend inspecting heater thermostat.

#### E. Medication Dosage Calculation Formula
For volume $V$ (Liters), medication rate $R_{100}$ (per 100L), and lock factor $F_{\text{lock}}$:
$$\text{Dose} = \frac{V}{100} \times R_{100} \times F_{\text{lock}}$$
Where:
$$F_{\text{lock}} = \begin{cases} 
0.5, & \text{if scenario enforces lock and scaleless/sensitive species are present} \\
1.0, & \text{otherwise.}
\end{cases}$$
Formatting rule:
$$\text{FormattedDose} = \begin{cases}
\text{Dose}.\text{toFixed}(1), & \text{if Dose} < 10 \\
\text{round}(\text{Dose}), & \text{if Dose} \ge 10
\end{cases}$$

#### F. Inhabitants Sweet-Spot Parameter Derivation Formulas
Given a set of $N$ inhabitants with profiles $P_1, P_2, \dots, P_N$:
- Temperature intersection:
  $$T_{\min, \text{overlap}} = \max_{i=1}^N (P_i.T_{\min}), \quad T_{\max, \text{overlap}} = \min_{i=1}^N (P_i.T_{\max})$$
  $$\text{HasTempOverlap} = T_{\min, \text{overlap}} \le T_{\max, \text{overlap}}$$
  $$T_{\text{recommended}} = \begin{cases}
  \text{round}_1\left(\frac{T_{\min, \text{overlap}} + T_{\max, \text{overlap}}}{2}\right), & \text{if HasTempOverlap} \\
  25.5, & \text{otherwise}
  \end{cases}$$
- pH intersection:
  $$\text{pH}_{\min, \text{overlap}} = \max_{i=1}^N (P_i.\text{pH}_{\min}), \quad \text{pH}_{\max, \text{overlap}} = \min_{i=1}^N (P_i.\text{pH}_{\max})$$
  $$\text{HasPhOverlap} = \text{pH}_{\min, \text{overlap}} \le \text{pH}_{\max, \text{overlap}}$$
  $$\text{Target pH Range} = \begin{cases}
  [\text{pH}_{\min, \text{overlap}}, \text{pH}_{\max, \text{overlap}}], & \text{if HasPhOverlap} \\
  [6.6, 7.4], & \text{otherwise}
  \end{cases}$$
- General Hardness (GH) bounds:
  $$\text{GH}_{\text{range}} = \left[\max\left(3, \max_{i=1}^N (P_i.\text{GH}_{\min})\right), \min\left(15, \min_{i=1}^N (P_i.\text{GH}_{\max}) > 0 ? \min_{i=1}^N (P_i.\text{GH}_{\max}) : 12\right)\right]$$
- Carbonate Hardness (KH) bounds:
  $$\text{KH}_{\text{range}} = \left[\max\left(2, \max_{i=1}^N (P_i.\text{KH}_{\min})\right), \min\left(8, \min_{i=1}^N (P_i.\text{KH}_{\max}) > 0 ? \min_{i=1}^N (P_i.\text{KH}_{\max}) : 6\right)\right]$$
- Flow dynamics evaluation:
  $$N_{\text{low}} = \sum_{i: P_i.\text{flow} = \text{'low'}} C_i, \quad N_{\text{high}} = \sum_{i: P_i.\text{flow} = \text{'high'}} C_i$$
  $$\text{FlowRecommendation} = \begin{cases}
  \text{"Direct Venturi Jet Flow Suitable"}, & \text{if } N_{\text{low}} = 0 \land N_{\text{high}} > 0 \\
  \text{"Low Gentle Flow Required"}, & \text{if } N_{\text{high}} = 0 \land N_{\text{low}} > 0 \\
  \text{"45° Glass-Baffled Return Recommended"}, & \text{otherwise (mixed community)}
  \end{cases}$$

---

## 6. Biological Knowledge Base & Species Profiles

The biological database (`SPECIES_DATABASE` in `aquapulse.optimizer.js`) specifies complete ecological profiles for 16 species across all water column strata:

### 6.1 Species Ecological Directory

| Species Key | Common Name | Scientific Name | Temp Min–Max (Opt) | pH Min–Max (Opt) | GH Min–Max | KH Min–Max | Flow | Scaleless | Key Sensitivities & Behavioral Notes |
|---|---|---|---|---|---|---|---|---|---|
| `koi-angelfish` | Koi Angelfish | *Pterophyllum scalare* | 24.0–28.5°C (26.0°C) | 6.0–7.5 (6.8) | 3–10 dGH | 2–6 dKH | Moderate | No | Aggressive when mature; nips long fins; target for algae eater slime sucking; preys on small tetras/rice fish. |
| `blue-zebra-angel` | Blue Zebra Angelfish | *Pterophyllum scalare* | 24.0–28.5°C (26.0°C) | 6.0–7.5 (6.8) | 3–10 dGH | 2–6 dKH | Moderate | No | Territorial pairing at adult size; demands shaded overhangs and territory breaks. |
| `denison-barb` | Denison Barb (Roseline Shark) | *Sahyadria denisonii* | 18.0–26.0°C (23.5°C) | 6.5–7.6 (7.0) | 4–12 dGH | 3–8 dKH | High | No | Demands high dissolved oxygen; severe thermal stress $>26.0$°C; high jump risk when room lights extinguish suddenly. |
| `boeseman-rainbow` | Boeseman's Rainbowfish | *Melanotaenia boesemani* | 24.0–28.0°C (25.5°C) | 7.0–8.0 (7.4) | 8–18 dGH | 5–12 dKH | High | No | Prefers moderate-to-hard alkaline water; loves high-velocity filter jet swim track. |
| `silvertip-tetra` | Silver Tip Tetra | *Hasemania nana* | 22.0–28.0°C (25.0°C) | 6.0–7.8 (6.8) | 4–15 dGH | 3–8 dKH | Moderate | No | Energetic schooler; becomes notorious fin-nipper if school size $<8$ fish or underfed in center current. |
| `neon-tetra` | Neon Tetra | *Paracheirodon innesi* | 21.0–26.0°C (24.0°C) | 5.5–7.2 (6.5) | 2–8 dGH | 1–4 dKH | Low | No | Fragile $>26.5$°C; highly sensitive to Malachite Green, copper, and formalin; requires 50% General Cure lock. |
| `female-betta` | Female Betta | *Betta splendens* | 24.5–29.0°C (26.0°C) | 6.5–7.6 (7.0) | 3–10 dGH | 2–6 dKH | Low | No | Labyrinth organ requires calm water film; lateral flow causes chronic stress; prone to bloat if Tubifex is unsoaked. |
| `betta-male` | Male Betta | *Betta splendens* | 24.5–29.0°C (26.0°C) | 6.5–7.5 (7.0) | 3–10 dGH | 2–6 dKH | Low | No | Strictly solitary showpiece; zero lateral current preferred; cannot tolerate fin-nipping schoolers or boisterous barbs. |
| `dwarf-gourami` | Dwarf Red Gourami | *Trichogaster lalius* | 24.0–28.0°C (25.5°C) | 6.0–7.5 (6.8) | 4–10 dGH | 2–6 dKH | Low | No | Surface labyrinth dweller; pushed into hiding in bottom-right slack pocket by horizontal jet streams; requires blanched peas. |
| `rice-fish` | Daisy's Blue Rice Fish | *Oryzias woworae* | 22.0–27.0°C (24.5°C) | 6.5–7.5 (7.0) | 5–12 dGH | 3–7 dKH | Low | No | Peaceful nano surface dweller; easily outcompeted for food by aggressive Angels; relies on calm canopy and floating Pothos roots. |
| `harlequin-rasbora` | Harlequin Rasbora | *Trigonostigma heteromorpha* | 23.0–28.0°C (25.0°C) | 6.0–7.5 (6.6) | 3–10 dGH | 2–6 dKH | Moderate | No | Peaceful tight schooler; thrives in planted soft water with moderate current. |
| `albino-corydoras` | Albino Corydoras | *Corydoras aeneus* | 21.0–26.5°C (24.0°C) | 6.0–7.5 (6.8) | 4–12 dGH | 2–6 dKH | Low | **Yes (Scaleless)** | Scaleless armored catfish; zero tolerance for aquarium salt; sensitive to full-strength meds (50% lock); barbels erode on sharp substrate. |
| `pygmy-cory` | Pygmy Corydoras | *Corydoras pygmaeus* | 22.0–26.0°C (24.0°C) | 6.2–7.4 (6.8) | 3–10 dGH | 2–5 dKH | Low | **Yes (Scaleless)** | Miniature scaleless catfish; extreme sensitivity to chemical fluctuations and copper; requires low current. |
| `golden-cae` | Golden Chinese Algae Eater | *Gyrinocheilus aymonieri* | 22.0–27.5°C (25.0°C) | 6.5–7.8 (7.0) | 5–15 dGH | 3–8 dKH | High | No | **HIGH WATCH**: Semi-aggressive as adult; will latch onto broad-bodied fish (Angelfish) to feed on slime coats if night veggies/wafers are omitted. |
| `sae` | Siamese Algae Eater (SAE) | *Crossocheilus oblongus* | 23.0–27.0°C (25.0°C) | 6.5–7.5 (6.9) | 5–12 dGH | 3–7 dKH | Moderate | No | Peaceful true algae grazer; cleans Anubias and moss pads without harming delicate plants. |
| `nerite-snail` | Zebra Nerite Snail | *Neritina natalensis* | 22.0–27.5°C (25.0°C) | 7.0–8.2 (7.5) | 6–15 dGH | 4–10 dKH | Moderate | No (Invertebrate) | **Strict copper intolerance**; acidic pH ($<6.8$) dissolves calcium carbonate shell; excellent diatom/algae grazer. |

### 6.2 Medication Safety Rules & Species Locks

1. **Copper & Invertebrate Safety Lock**:
   - Copper compounds (copper sulfate, chelated copper) are fatal to invertebrates (`nerite-snail`, freshwater shrimp). Never dose copper in any tank containing mollusks or crustaceans.
2. **Scaleless Catfish Salt Prohibition**:
   - Scaleless fish (`albino-corydoras`, `pygmy-cory`) lack protective epidermal scales. Osmotic salt therapy draws moisture rapidly through skin, inducing severe dehydration, gill burns, and organ shutdown.
   - **Rule**: Aquarium salt (`aquaSalt`) is strictly barred from display tanks containing Corydoras or live plants.
3. **Formalin / Malachite Green / General Cure 50% Lock**:
   - Full-strength anti-parasitic cocktails burn the delicate skin and gills of scaleless catfish and small tetras (`neon-tetra`).
   - **Rule**: `medScenarios.ichMain` enforces `useLock: true` with `lockFactor: 0.5`, auto-calculating a 50% dosage ($5.0\text{ ml} / 100\text{L}$ instead of $10.0\text{ ml} / 100\text{L}$) when sensitive species are present.
4. **Antibacterial Nitrification Shield**:
   - Broad-spectrum antibacterials (`bactonil`) kill beneficial nitrifying bio-filter bacteria (`Nitrosomonas` and `Nitrobacter`), crashing the nitrogen cycle and triggering lethal ammonia spikes.
   - **Rule**: Antibacterial regimens are locked to external hospital buckets (e.g. 15L container with airstone for Days 1–5).

---

## 7. Configuration Layer Requirements (R4)

Requirement R4 dictates robust configuration continuity, git-ignored personal isolation, and seamless data interchange.

### 7.1 Deep Merge Architecture

The configuration ingestion sequence follows a 3-tier precedence model:

```text
[Tier 1: Code Default]          window.AQUAPULSE_DEFAULT_CONFIG (aquapulse.config.js)
        ↓
[Tier 2: Personal Override]     window.AQUAPULSE_PRIVATE_CONFIG (aquapulse.private.js)
        ↓  (Runtime deepMerge in AquaPulse.html:10-26)
[Tier 3: Browser Session]       localStorage['aquapulse_active_config']
        ↓  (Parsed & returned by getActiveConfig())
[Active Application State]      Applied to UI, Canvas, Diagnostics & Calculators
```

#### Merge Implementation Details:
- Recursive deep-merge iterates over keys in `AQUAPULSE_PRIVATE_CONFIG`.
- Objects (e.g. `tank`, `targets`, `equipment`, `zones`, `flowModes`) are recursively merged key-by-key, preserving default child keys not explicitly overwritten.
- Arrays (e.g. `species`, `foods`, `feedingSchedule`, `medicines`, `medScenarios`, `checklistTasks`) are **completely replaced** by the source array. This ensures that personal tank inhabitants or foods do not accidentally merge into conflicting hybrid lists.
- If `AQUAPULSE_PRIVATE_CONFIG` is not present (e.g. in a pristine clone), Tier 1 defaults load cleanly without runtime warnings.

### 7.2 Personal Data Isolation & Git Discipline

- `.gitignore` explicitly includes `aquapulse.private.js`.
- Personal hardware telemetry, tank volumes, species counts, and feeding notes are isolated in `aquapulse.private.js`, guaranteeing that sensitive user setup data is never accidentally committed to public version control.
- Sample configs provide a clean starting point (`cp aquapulse.config.js aquapulse.private.js`).

### 7.3 Multi-Tank Storage Partitioning

All user-generated transaction data is keyed by `tank.id`:
- Maintenance Checklists: `aquapulse_${tank.id}_tasks`
- Parameter Test History: `aquapulse_${tank.id}_params`
- Alternating Sponge Cycle: `aquapulse_${tank.id}_sponge_idx`
- Active Runtime Configuration: `aquapulse_active_config`

Switching profiles immediately updates the key scope, preventing cross-tank contamination of biological history or task completion states.

### 7.4 Profile Export & Import Mechanics

- **JSON Profile Export**:
  - Gathers current active configuration from `getActiveConfig()`.
  - Serializes to formatted JSON (`JSON.stringify(cfg, null, 2)`).
  - Encapsulates in a `Blob` of MIME type `application/json`.
  - Triggers direct browser download as `${cfg.tank.id || 'aquapulse'}_profile.json`.
- **JSON Profile Import**:
  - File picker reads `.json` via `FileReader.readAsText(file)`.
  - Passes raw string through `lenientParseJSON()` to resolve syntax variations.
  - Validates presence of top-level keys (`tank`, `species`, `medicines`).
  - Persists to `localStorage['aquapulse_active_config']` and triggers full UI/canvas re-render.
- **CSV Data Export**:
  - Extracts parameter logs from `getParamLogs()`.
  - Generates CSV string with escaped quote delimiters.
  - Downloads `${cfg.tank.id || 'aquapulse'}_water_log.csv`.

---

## 8. Hardware Telemetry & Hydrodynamic Flow Visualizer

The interactive canvas visualizer (`aquapulse.flow.js`) integrates physical hardware telemetry with procedural rendering:

### 8.1 Hardware Specifications
- **Dual-Canister Powerhead Filter**: 1750 L/Hr rated flow rate mounted vertically in back-right corner, driving upper-column right-to-left venturi jet stream.
- **Submersible Heater**: 200W heating element mounted adjacent to filter intake to ensure rapid thermal dispersion via circulating convection currents.
- **Overhead Slim LED Light Bar**: Center-mounted full-spectrum fixture with 6.5-hour photoperiod limit and 15-minute evening ramp-down window.

### 8.2 Canvas Hardscape & Hydrodynamic Architecture
1. **Procedural Hardscape**:
   - Center Spiderwood Trunk with 4 branching arms reaching across water strata.
   - 4 Live Anubias epiphytes anchored to joint nodes.
   - 1 Live Java Moss pad swaying directly in the high-velocity nozzle stream.
   - 4 Foreground River Rock boulders providing bottom shelter and current deflection.
   - Substrate gravel bed with randomized micro-pebbles and background Vallisneria ribbon plants.
   - Emersed Pothos (Money Plant) vines trailing roots 2–3 inches into the water column behind the filter.
2. **Physics Particle Engine**:
   - 85 active fluid particles with randomized size ($0.9 - 3.1\text{ px}$), buoyancy, and lifespan.
   - Mode 1 (`current`): Linear high-velocity jet shooting left, micro-bubble upward buoyancy vector (`vy -= 0.018`), left pane glass deflection (`vx *= 0.6; vy += 0.75`), and gentle bottom return eddy toward the intake.
   - Mode 2 (`baffled`): 45° glass-baffled return with smooth convective roll along substrate and upper water film.
3. **Dynamic Caustic Lighting & Atmosphere**:
   - 8 animated caustic light cones with screen blend mode projecting down to the hardscape.
   - Animated water surface ripple wave at top border ($y = 6\text{ px}$).
4. **Live Fish Swimming Strata**:
   - Species dynamically positioned at biological strata (`top`, `mid`, `bottom`).
   - Animated tail wag oscillation ($\sin(\text{time} \times \text{speed})$) and hovering wobble.
   - Contextual health alerts for labyrinth fish: `"⚠️ Seeking Calm Zone"` in straight jet mode versus `"✅ Comfortable"` in baffled mode.

---

## 9. Conclusion

This specification provides the authoritative baseline for all domain logic, configurations, calculations, and visual components within the AquaPulse system. All overhauled modules and prototype components must satisfy the models, schemas, and mathematical constraints documented herein.

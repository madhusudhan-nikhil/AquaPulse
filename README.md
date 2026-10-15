# AquaPulse — Modular Aquarium Management Dashboard Template

AquaPulse is a lightweight, zero-dependency aquarium command dashboard for freshwater and planted community tanks. Built with clean vanilla JavaScript and Tailwind CSS, it provides real-time water chemistry tracking, interactive aquascape flow simulation, intelligent medicine dosing, species risk auditing, and automated biological parameter derivation.

---

## 🌟 Key Architecture & Completed Phases

### Phase 1: Modular Configuration & Template Decoupling
* **Zero Hardcoded Data:** All aquarium parameters (tank size, equipment, species, foods, and meds) are abstracted into [`aquapulse.config.js`](./aquapulse.config.js).
* **Dual-Mode Template & Profile Manager (⚙️):**
  * **Tab 1: 📝 Visual Quick-Form Editor:** 100% syntax-safe form fields to customize tank name, dimensions, gross/net liters, filter flow (L/Hr), heater wattage (W), light schedule, and water targets (Temp, pH) with zero chance of JSON errors.
  * **Tab 2: { } Advanced Raw JSON Editor:** Monospace configuration console with auto-beautification (**"✨ Format & Clean JSON"**), **"🔍 Test Syntax"** validation indicator, and lenient pre-parsing that automatically corrects trailing commas, single/multi-line comments, and unquoted keys.
  * **Accurate Line & Column Error Diagnosis:** Pinpoints the exact line number, column, and offending snippet with auto-fix guidance if invalid JSON is entered.
  * **Export & Import JSON:** Back up profiles or share setups across tanks with one click.
  * **Sample Presets:** Instantly switch between presets (*120L Community Demo* vs. *60L Nano Betta*).
* **Multi-Tank LocalStorage Isolation:** Checklists and water test logs are isolated by `tank.id` (`aquapulse_<id>_params`), preventing cross-tank data pollution.

### Phase 2: Inhabitants Parameter Search & Sweet-Spot Optimizer (`aquapulse.optimizer.js`)
* **Dedicated Optimization Engine:** Located in [`aquapulse.optimizer.js`](./aquapulse.optimizer.js).
* **One-Click Automated Derivation:** Analyzes all configured species against an internal biological database.
* **Mathematical Tolerance Intersection:**
  * Safe Temperature Overlap: $[\max(T_{\min}), \min(T_{\max})]$.
  * Safe pH Overlap: $[\max(\text{pH}_{\min}), \min(\text{pH}_{\max})]$.
  * General Hardness (GH) and Carbonate Hardness (KH) buffers.
* **Flow & Aeration Dynamics:** Balances high-flow lovers (Denison Barbs, Rainbows) with calm-surface labyrinth breathers (Bettas, Gouramis) taking advantage of low-velocity slack pockets.
* **Biological Compromise Detection:** Warns if any inhabitant is pushed to its thermal or chemical limit, and applies the golden sweet spot with one click.

### Phase 3: Aquatic Intelligence Extension (`aquapulse.intelligence.js` — inspired by `fish-skill`)
* **Visual Symptom Diagnostic Checker (🩺):**
  * Interactive ailment selector for physical and behavioral signs (Ich, Fin Rot, Dropsy/Bloat, Fin Nipping, Surface Gasping).
  * Auto-selects the treatment protocol and locks medications at safe dosages for sensitive/scaleless fish (e.g. 50% General Cure lock for Corydoras and Tetras).
* **Social Dynamics & Aggression Logger (🛡️):**
  * Logs chasing and fin-nipping incidents (aggressor, victim, trigger, and remediation).
  * Helps identify bully hierarchy before physical injury occurs.
* **Quarantine Tank Manager (🏥):**
  * Tracks isolated patient fish in hospital buckets (volume, days elapsed, and release countdown).
* **GH & KH Chemistry & Predictive Pattern Engine (🔮):**
  * Full support for General Hardness (dGH) and Carbonate Hardness (dKH) alongside NH₃, NO₂⁻, NO₃⁻, pH, and Temp.
  * Analyzes rate of nitrate accumulation, flags emerging bio-filter strain, and predicts temperature shock risks from test history.

### Phase 4: Dynamic Flow Simulation & Interactive Tank Visualizer (`aquapulse.flow.js`)
* **Procedural Aquascape Hardscape Engine:**
  * **Center-Island Spiderwood:** Organic branching bogwood with natural bark gradients, textures, and shading.
  * **Live Epiphytes:** 4 lush Anubias leaf clusters mounted at branch joints plus a vibrant Java Moss pad swaying directly in the filter jet.
  * **River Rock Sanctuary:** Basalt/river boulders clustered around the center base providing current-break shelter.
  * **Substrate & Plant Flora:** Textured dark gravel bed with scattered micro-pebbles, swaying background Vallisneria ribbon plants, and emersed Pothos roots trailing from the top rim.
* **Overhauled Hardware Module:**
  * Wide dual-canister filter unit with pulsating powerhead status, 1750 L/Hr telemetry badge, Cup A coarse sponge, Cup B bio-ceramic rings, and glowing 200W heater element.
* **Real-Time Physics Canvas:**
  * Animated venturi micro-bubbles and flowing streamlines emanating from the 1750 L/Hr filter nozzle in high-velocity straight jet flow or circular convection loops.
* **Toggleable Visual Layers:**
  * **🍽️ Targeted Feeding Map:** Direct in-canvas interactive pins for 5 drop zones (Zone A Calm Canopy, Zone B Moss Jet Stream, Zone C Mid-Front Glass, Zone D Bottom Bed, Zone E Driftwood Undercut) with morning distraction, evening, night, and treat sequence highlights.
  * **🌡️ Velocity Heatmap:** Color-coded velocity zones (High Jet Stream: Red/Amber, Moderate Schooling Track: Cyan/Teal, Calm Slack Pocket: Emerald).
  * **🐠 Live Fish Presence:** Real-time animated swimming silhouettes with oscillating tail fins for Angelfish, Bettas, Gouramis, Tetras, and Corydoras positioned at their respective depth strata.
  * **🫧 Aeration Bubbles & Caustic Shimmer:** Animated light rays from the overhead slim LED bar dancing on the center driftwood.

---

## 📁 File Structure

```text
AquaPulse/
├── AquaPulse.html             # Dynamic UI, interactive tank map, form controls & tabs
├── aquapulse.config.js        # Default demo configuration (120L community template)
├── aquapulse.private.js       # 🔒 Your personal tank config (git-ignored, optional)
├── aquapulse.flow.js          # Live canvas flow simulator, bubbles, heatmap & fish presence
├── aquapulse.optimizer.js     # Standalone inhabitants search & parameter sweet-spot optimizer
├── aquapulse.intelligence.js  # Visual symptom checker, quarantine manager & predictive engine
├── .gitignore                 # Ignores private config file
└── README.md                  # Architecture documentation & customization manual
```

---

## 🔧 Customizing for Your Tank

AquaPulse ships with a generic 120L demo tank. To configure it for your own aquarium:

1. **Copy the template:**
   ```bash
   cp aquapulse.config.js aquapulse.private.js
   ```
2. **Edit `aquapulse.private.js`:**
   - Change `AQUAPULSE_DEFAULT_CONFIG` to `AQUAPULSE_PRIVATE_CONFIG`
   - Update tank dimensions, species, foods, medicines, and schedules to match your setup
3. **Open `AquaPulse.html`** — your private config automatically overrides the demo defaults
4. **Your private config is git-ignored** and will never be committed to the repository

Alternatively, use the built-in **⚙️ Template Profile** editor in the app to customize everything visually.

---

## 🚀 How to Run & Use

1. **Zero Setup Required:**
   - Double-click [`AquaPulse.html`](./AquaPulse.html) in any browser (Chrome, Edge, Firefox, Safari).
   - No servers, Node.js, bundlers, or build steps are required.

2. **Deriving Optimal Parameters for Your Fish:**
   - Go to **Tab 3 (Fish Species)** or open the **⚙️ Template Profile** modal.
   - Click **"🔍 Derive Best Parameters"**.
   - Review the mathematical overlap table, flow compromise analysis, and click **"Apply Derived Targets to Tank Profile"**.

3. **Diagnosing Fish Ailments & Medicine Dosing:**
   - In **Tab 4 (Care Hub -> Medicine Calculator)**, click **"🩺 Visual Symptom Diagnostic Checker"**.
   - Pick the visual symptoms observed on your fish.
   - Click **"Apply to Medicine Dosing Calculator (Tab 4)"** to calculate safe dosage amounts scaled to your tank volume.

4. **Tracking Social Dynamics & Quarantine:**
   - In **Tab 3 (Fish Species)**, click **"🛡️ Social & Quarantine"**.
   - Log aggressive chases or manage quarantine release countdowns for new arrivals.

5. **Filter Care & Water Quality Logs:**
   - In **Tab 4 (Care Hub: Filter Care, Water Logs & Medicine)**, complete weekly filter checklists, track alternating sponge rinses, and log test kit readings (NH₃, NO₂⁻, NO₃⁻, pH, Temp, GH, KH).
   - Instant prescriptions advise emergency water change volumes, conditioner doses, and predictive bioload patterns.

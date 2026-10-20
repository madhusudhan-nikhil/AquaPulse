## 2026-10-20T17:23:59Z
You are teamwork_preview_worker_m3_m4.
Your assigned working directory is: c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_worker_m3_m4

MANDATORY FIRST STEP: Read c:\_Projects\Sample\AquaPulse\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Specifications to read:
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\orchestrator_main\PROJECT.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\orchestrator_main\TEST_INFRA.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_codebase.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_architecture.md

Your exclusive write ownership:
- src/ui/app-shell.js
- src/ui/modal-manager.js
- src/ui/components/vital-signs-strip.js
- src/ui/components/flow-canvas.js
- src/ui/components/param-logger.js
- src/ui/components/species-optimizer.js
- src/ui/components/symptom-checker.js
- src/ui/components/care-hub.js
- src/ui/components/social-logger.js
- src/telemetry/telemetry-hal.js
- src/plugins/sample-sensor-plugin.js
- src/engines/optimizer-engine.js (apply minor fix: if (!sp) continue; on line 582 when calculating density score)
- index.html (modernized modular prototype entry point)
- AquaPulse.html (backward-compatible overhauled prototype entry point)
- c:\_Projects\Sample\AquaPulse\PROJECT.md (update milestone status table: M1=DONE, M2=DONE, M3=DONE, M4=DONE)
- tests/verify-m3-m4-ui.js

Task Details (Milestones 3 & 4: UI Presentation Shell, Responsive Visualizer, Care Hub, Diagnostics, Plugins & Prototype Overhaul):
Implement the complete responsive UI presentation layer and overhauled prototype:

1. src/ui/modal-manager.js:
   - Accessible in-DOM dialog manager replacing blocking window.prompt() and window.alert().
   - Methods: alert(title, message), confirm(title, message), prompt(title, message, defaultValue), custom(title, contentElement).
   - Trap focus, escape key handling, backdrop click dismiss.

2. src/ui/components/vital-signs-strip.js:
   - Above-the-fold 7-metric vital signs status strip (NH3, NO2, NO3, pH, Temp, GH, KH).
   - 3-tier color-coded triage badges (Safe/Optimal green, Warning/Watch amber, Critical/Action red) visible without scrolling on standard displays (<640px, 768px, 1024px+).
   - Click-to-remediate action links (e.g. clicking critical ammonia navigates to Care Hub emergency water change).

3. src/ui/components/flow-canvas.js:
   - Interactive HTML5 Canvas visualizer connecting to FlowEngine.
   - Smooth container auto-fit and resize adaptation.
   - Accessible controls to toggle layers: streamlines, velocity heatmap, biological presence (swimming fish with tail waggle), caustics, bubbles.
   - Visibility-aware animation loop: automatically pauses requestAnimationFrame when tab is hidden or element is off-screen!

4. src/ui/components/param-logger.js:
   - Interactive water parameter logging form, history table, dynamic SVG trend curves (sparklines and 7-day/30-day views), and automated clinical prescriptions.

5. src/ui/components/species-optimizer.js:
   - Inhabitants sweet-spot optimizer view: species selection, population density tally, overlap chart, flow dynamics recommendation, one-click target derivation.

6. src/ui/components/symptom-checker.js:
   - Visual symptom diagnostic checker with disease profile cards, hospital tank switch, 50% sensitive species safety lock toggle, and volumetric dose display.

7. src/ui/components/care-hub.js:
   - Feeding schedule matrix with soak timer, alternating dual-canister filter checklist, and 14-day quarantine progress tracker.

8. src/ui/components/social-logger.js:
   - Social aggression incident logger with multi-tank scoped persistence, offender/victim dropdowns, severity rating, and in-DOM modal.

9. src/telemetry/telemetry-hal.js:
   - Telemetry Hardware Abstraction Layer with SimulatedProvider, ManualLogProvider, and IoTBridgeProvider.

10. src/plugins/sample-sensor-plugin.js:
    - Working third-party plugin implementing IPlugin ({ id, name, category, mount, unmount, update }) registering an ORP / Redox potential sensor card with live telemetry feed.

11. src/ui/app-shell.js, index.html, and AquaPulse.html:
    - AppShell orchestrating layout, navigation tabs ('tank', 'optimizer', 'symptoms', 'care', 'social', 'plugins'), responsive mobile drawer, and header with tank selector.
    - index.html: Pure modular ES module entry point loading via standard module imports.
    - AquaPulse.html: Overhauled prototype entry point retaining complete backward compatibility with existing aquapulse.config.js and aquapulse.private.js without manual migration.
    - Both run cleanly in modern browsers with zero console errors!

12. Verification:
    - Write tests/verify-m3-m4-ui.js testing component initialization, mock DOM rendering, vital signs triage, modal handling, and plugin registration.
    - Run node tests/verify-m3-m4-ui.js.
    - Run node tests/run-tests.js (all 129 tests must continue to pass).
    - Update c:\_Projects\Sample\AquaPulse\PROJECT.md marking M1, M2, M3, M4 as DONE.
    - Write handoff.md in your working directory and notify the parent orchestrator via send_message.

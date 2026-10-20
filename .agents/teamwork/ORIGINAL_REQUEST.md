# Original User Request

## 2026-10-20T16:15:16Z

Conduct a comprehensive analysis, architectural benchmark, and complete overhaul plan for AquaPulse, delivering both an in-depth architectural and UI/UX blueprint and a functional overhauled prototype that maximizes long-term feature extendability and provides an intuitive, best-in-class user experience.

Working directory: c:\_Projects\Sample\AquaPulse
Integrity mode: development

## Requirements

### R1. Architectural Benchmarking & Modular Decoupling
Analyze and benchmark leading modern aquarium, terrarium, and environmental IoT monitoring dashboards. Design and establish a clean, modular architecture that separates state management, business/biological logic, UI presentation components, and hardware/telemetry integrations, enabling new features, sensors, and calculators to be added as isolated modules without modifying core application code.

### R2. Best-in-Class Aquarium UI/UX Representation
Research and establish optimal user experience patterns for aquatic management across desktop and mobile form factors. Create an intuitive visual hierarchy that presents critical water health alerts at a glance, offers interactive and legible aquascape/flow simulations, visualizes water chemistry history through clear trend curves, and simplifies routine care tasks (feeding calendars, medication protocols, and filter maintenance rotations).

### R3. Functional Prototype Implementation
Deliver a fully working overhauled prototype implementing the new modular architecture and researched UI/UX patterns. The prototype must support all existing AquaPulse capabilities (flow physics simulation, inhabitants sweet-spot optimizer, visual symptom checker, social aggression logger, medication calculator, and parameter logging) while supporting seamless extension.

### R4. Configuration & Private Layer Continuity
Ensure complete continuity with existing user setups. The new architecture must cleanly ingest both standard demo configurations (aquapulse.config.js) and private user overrides (aquapulse.private.js), preserving git-ignored isolation of personal tank data and offering effortless export/import.

### R5. Comprehensive Architectural Specification & Extension Guide
Document the redesigned system architecture, detailing state flow, module/plugin interfaces, UI component hierarchy, and step-by-step instructions for community contributors to add new custom widgets, biological profiles, and telemetry integrations.

## Acceptance Criteria

### Architecture & Extensibility
- [ ] Codebase is modularized into discrete, single-responsibility components/modules rather than a single monolithic HTML file.
- [ ] A documented plugin or module pattern exists where adding a new calculator, sensor card, or widget requires only creating a new standalone module and registering it.
- [ ] State management is centralized, predictable, and decoupled from DOM rendering.

### UI / UX Quality
- [ ] Water parameter health status (NH3, NO2, NO3, pH, Temp, GH, KH) displays immediate status indicators (Safe, Warning, Critical) visible without scrolling on standard displays.
- [ ] Flow and aquascape visualization is responsive, smoothly adapts to container dimensions, and provides accessible controls for toggling layers (heatmaps, streamlines, biological presence).
- [ ] Care routines (feeding matrix, filter maintenance checklist, water testing) provide clear interactive feedback and task completion state tracking.
- [ ] UI is fully responsive with a clean visual presentation tested on desktop and mobile viewports.

### Functional Completeness & Compatibility
- [ ] All features from the original dashboard run without runtime console errors:
  - Hydrodynamic flow visualizer (straight jet and baffled convection modes)
  - Inhabitants sweet-spot parameter derivation engine
  - Visual symptom checker and species medication safety lock
  - Water parameter logging and trend insights
  - Quarantine / hospital tank countdown tracker
  - Social aggression logger
- [ ] Existing aquapulse.config.js and aquapulse.private.js load without manual migration or loss of configuration properties.

### Objective Verification
- [ ] Automated test suite or verification script runs cleanly with 0 failures, validating config parsing, parameter derivation algorithms, and component initialization.
- [ ] End-to-end verification confirms headless page loading and interactive feature switching without uncaught exceptions.

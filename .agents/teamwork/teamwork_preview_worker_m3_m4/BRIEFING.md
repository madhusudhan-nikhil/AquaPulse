# BRIEFING — 2026-10-20T17:24:00Z

## Mission
Implement Milestones 3 & 4 for AquaPulse: complete responsive UI presentation layer, interactive visualizer, care hub, diagnostics, telemetry HAL, sample sensor plugin, and overhauled backward-compatible prototype entry points.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_worker_m3_m4
- Original parent: 97273ce2-4052-45d2-b7f6-1144766bc739
- Milestone: M3 & M4 (UI Presentation Shell, Responsive Visualizer, Care Hub, Diagnostics, Plugins & Overhaul)

## 🔒 Key Constraints
- Integrity Mandate: Genuine implementation, no hardcoded test values, no facades, no shortcuts.
- Exclusive write ownership:
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
  - src/engines/optimizer-engine.js (line 582 fix)
  - index.html
  - AquaPulse.html
  - c:\_Projects\Sample\AquaPulse\PROJECT.md
  - tests/verify-m3-m4-ui.js
- All 129 existing tests must continue to pass in `node tests/run-tests.js`.
- Responsive design (<640px, 768px, 1024px+).
- Clean browser execution with zero console errors.

## Current Parent
- Conversation ID: 97273ce2-4052-45d2-b7f6-1144766bc739
- Updated: not yet

## Task Summary
- **What to build**: Full responsive modular UI components, ModalManager, VitalSignsStrip, FlowCanvas, ParamLogger, SpeciesOptimizer, SymptomChecker, CareHub, SocialLogger, TelemetryHAL, SampleSensorPlugin, AppShell, index.html, AquaPulse.html backward compatibility, tests.
- **Success criteria**: All UI components functioning and cleanly integrated, telemetry HAL with 3 providers, working sample plugin, 100% test pass for existing tests + new verify-m3-m4-ui.js, zero console errors, responsive layouts.
- **Interface contracts**: PROJECT.md, TEST_INFRA.md, survey_codebase.md, survey_architecture.md
- **Code layout**: src/ui/, src/ui/components/, src/telemetry/, src/plugins/, index.html, AquaPulse.html, tests/

## Key Decisions Made
- [TBD]

## Artifact Index
- [TBD]

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: Initial setup

## Quality Status
- **Build/test result**: Not yet executed
- **Lint status**: Clean
- **Tests added/modified**: tests/verify-m3-m4-ui.js (TBD)

## Loaded Skills
- None

# BRIEFING — 2026-10-20T16:24:00Z

## Mission
Extract comprehensive specifications, domain models, configuration schemas, mathematical formulas, biological database rules, and configuration layer requirements (R4) from AquaPulse.

## 🔒 My Identity
- Archetype: specification_miner
- Roles: specification mining, domain modeling, configuration auditing, biological rules extraction
- Working directory: c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_spec_miner_survey_2
- Original parent: 97273ce2-4052-45d2-b7f6-1144766bc739
- Milestone: Discovery & Specification Survey

## 🔒 Key Constraints
- Read-only: Do NOT implement anything. Probe authoritative specification sources.
- Never place source code, tests, or data files in `.agents/teamwork/`.
- Discover and document all features and edge cases using required table formats.
- Complete coverage of:
  1. All configuration files (aquapulse.config.js, aquapulse.private.js, sample/templates/defaults).
  2. Mathematical formulas, parameter ranges, and safety thresholds (Safe, Warning, Critical) for NH3, NO2, NO3, pH, Temp, GH, KH.
  3. Biological database: species, compatibility, ranges, medication safety restrictions (copper vs invertebrates, scaleless sensitivities).
  4. Configuration layer requirements (R4): merging, git-ignored isolation, export/import.
- Output to `c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_spec_miner_survey_2\survey_spec.md` and generate `handoff.md`.

## Current Parent
- Conversation ID: 97273ce2-4052-45d2-b7f6-1144766bc739
- Updated: 2026-10-20T16:24:00Z

## Task Summary
- **What to build**: Comprehensive domain specification document `survey_spec.md` covering configurations, water chemistry parameters and formulas, biological profiles and rules, and configuration merge/import/export mechanisms.
- **Success criteria**: Exhaustive extraction of all schemas, parameters, formulas, biological rules, and config lifecycle mechanics with zero omissions. Completed: 25 features and 20 edge cases documented.
- **Interface contracts**: `ORIGINAL_REQUEST.md`, `aquapulse.config.js`, `aquapulse.private.js`, `aquapulse.optimizer.js`, `aquapulse.intelligence.js`, `aquapulse.flow.js`, `AquaPulse.html`.
- **Code layout**: Read-only extraction. Final document written to `.agents/teamwork/teamwork_preview_spec_miner_survey_2/survey_spec.md`.

## Key Decisions Made
- Fully documented 16 species biological profiles, exact mathematical formulas for parameter overlaps, emergency water change calculations, and 50% medication safety locks.
- Analyzed 3-tier config hierarchy (default demo -> git-ignored private override -> active browser LocalStorage).

## Artifact Index
- `c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_spec_miner_survey_2\survey_spec.md` — Complete extracted specification document.
- `c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_spec_miner_survey_2\handoff.md` — Standard 5-component handoff report.
- `c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_spec_miner_survey_2\progress.md` — Liveness and progress tracker.
- `c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_spec_miner_survey_2\DISPATCH.md` — Dispatch prompt assignment.

## Loaded Skills
- None required.

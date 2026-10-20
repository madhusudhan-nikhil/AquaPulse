# Dispatch History

## 2026-10-20T16:26:48Z

You are teamwork_preview_worker_m1.
Your assigned working directory is: c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_worker_m1

MANDATORY FIRST STEP: Read c:\_Projects\Sample\AquaPulse\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Specifications to read:
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\orchestrator_main\PROJECT.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\orchestrator_main\TEST_INFRA.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_codebase.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_spec_miner_survey_2\survey_spec.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_architecture.md

Your exclusive write ownership:
- c:\_Projects\Sample\AquaPulse\PROJECT.md (copy/ensure master project spec is at project root from orchestrator_main/PROJECT.md)
- c:\_Projects\Sample\AquaPulse\TEST_INFRA.md (copy/ensure test infra is at project root from orchestrator_main/TEST_INFRA.md)
- src/core/store.js
- src/core/event-bus.js
- src/core/config-manager.js
- src/core/plugin-registry.js

Task Details (Milestone 1: Core Foundation & Decoupled State Architecture):
1. Copy PROJECT.md and TEST_INFRA.md to project root c:\_Projects\Sample\AquaPulse\ so they are available globally.
2. Implement src/core/event-bus.js:
   - Pure decoupled pub/sub bus with on(event, callback), off(event, callback), emit(event, data), once(event, callback), clear().
   - Support wildcard or namespaced events (e.g. 'state:*', 'config:updated').
3. Implement src/core/store.js:
   - Centralized, predictable reactive store using JS Proxy.
   - Decoupled from DOM.
   - Methods: getState(path), setState(path, value), getScopedKey(suffix) -> 'aquapulse_' + tankId + '_' + suffix, subscribe(listener).
   - In-memory state with localStorage sync when available (safe fallback for headless Node.js testing).
4. Implement src/core/config-manager.js:
   - 3-tier configuration precedence: AQUAPULSE_DEFAULT_CONFIG -> AQUAPULSE_PRIVATE_CONFIG -> localStorage['aquapulse_active_config'].
   - Recursive deepMerge(target, source) where nested objects merge recursively, and arrays are replaced in full.
   - lenientParseJSON(rawStr) stripping Unicode smart quotes (curly quotes), single-line comments (//), multi-line comments (/* */), and trailing commas before JSON.parse.
   - exportJSON(config) and importJSON(rawStr) validating required fields (tank, species, medicines).
   - exportCSV(logs) serializing logs into CSV format with header 'Date, Ammonia_ppm, Nitrite_ppm, Nitrate_ppm, pH, Temp_C, GH_dGH, KH_dKH, Water_Change, Notes'.
   - Multi-tank data scoping helpers.
5. Implement src/core/plugin-registry.js:
   - Plugin lifecycle manager with register(plugin), unregister(pluginId), getPlugin(pluginId), getPluginsByCategory(category), getAllPlugins(), mountPlugin(pluginId, container, context), unmountPlugin(pluginId).
   - Validates plugin contract: { id, name, category, mount, unmount, update }.
6. Dual-environment support: All modules must export standard ES modules (or UMD/CJS compatible) so they run in modern browsers natively AND can be imported/tested directly in Node.js.
7. Verification: Run a Node verification script to test all 4 core modules (deep-merge, lenient JSON parsing, store scoping, event bus emission, plugin registration). Include execution commands and results in your report.
8. Write handoff.md in your working directory and notify the parent orchestrator via send_message.

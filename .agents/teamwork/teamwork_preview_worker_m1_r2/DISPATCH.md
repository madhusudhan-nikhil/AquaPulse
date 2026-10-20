## 2026-10-20T16:47:48Z
You are teamwork_preview_worker_m1_r2.
Your assigned working directory is: c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_worker_m1_r2

MANDATORY FIRST STEP: Read c:\_Projects\Sample\AquaPulse\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Review/Challenge Reports to read:
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_challenger_m1_1\handoff.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_challenger_m1_2\handoff.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_reviewer_m1_1\handoff.md
- c:\_Projects\Sample\AquaPulse\.agents\teamwork\teamwork_preview_reviewer_m1_2\handoff.md

Your exclusive write ownership:
- src/core/event-bus.js
- src/core/store.js
- src/core/config-manager.js
- src/core/plugin-registry.js

Remediation Task Details (Milestone 1 Iteration 2):
1. In src/core/event-bus.js:
   - In off(event, callback): when set.delete(callback) is false, iterate over set and check if fn._originalCallback === callback; if found, delete fn from set so listeners registered via once() can be unsubscribed before emit.
2. In src/core/store.js:
   - Prototype pollution prevention: Define DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']).
     * In setByPath(target, path, value): if any part of the path is in DANGEROUS_KEYS, throw an Error('Security Exception: restricted property access blocked').
     * In _deepMergeInPlace(target, source): do not traverse or copy keys in DANGEROUS_KEYS.
   - Multi-tank storage key isolation:
     * In get tankId(): prioritize activeTankId over config.tank.id:
       getByPath(this._rawState, 'activeTankId') || getByPath(this._rawState, 'config.tank.id') || getByPath(this._rawState, 'tank.id') || 'tank-demo-community'
     * In getScopedKey(suffix): return `aquapulse_${this.tankId}_${suffix || 'default'}`.
     * In _onStateMutated(path, value): if path === 'activeTankId', also update this._rawState.config.tank.id = value (if config.tank exists).
   - In getState(path): when path === '', return undefined (treating empty string as an explicit invalid path rather than root).
3. In src/core/config-manager.js:
   - In lenientParseJSON(rawStr):
     * Do NOT run blind global quote replacement before tokenizing! Mask or parse string literals first, or only replace curly quotes when acting as outer delimiters, so internal text quotes like "The Book of “Aquascaping” Secrets" or 'It’s a planted tank' are NOT corrupted.
     * When converting single-quoted strings to double-quoted strings, unescape any internal \' to ' and escape unescaped " to \".
     * Support multiple consecutive trailing commas: /,\s*(?=[,}\]])/g.
     * Support nested/block comments outside strings without syntax errors.
     * Normalize non-breaking spaces (\u00A0) outside strings to standard spaces.
   - In importJSON(rawStr):
     * Validate section types strictly:
       if (!parsed.tank || typeof parsed.tank !== 'object' || Array.isArray(parsed.tank)) throw ...
       if (!Array.isArray(parsed.species)) throw ...
       if (!parsed.medicines || typeof parsed.medicines !== 'object' || Array.isArray(parsed.medicines)) throw ...
   - In exportCSV(logs):
     * Guard against non-array input: if (!Array.isArray(logs) || !logs.length) return header;
     * Guard against null/undefined row elements: const row = l || {};
     * Include \r in quote check: if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) return `"${str.replace(/"/g, '""')}"`;
     * Sanitize formula injection prefixes: if (/^[=+\-@]/.test(str)) return `"'${str.replace(/"/g, '""')}"`;
4. In src/core/plugin-registry.js:
   - In register(plugin): call this.validateContract(plugin) to strictly enforce string types on id, name, category, and function type on update if provided.
   - In unmountPlugin(pluginId): delete from this.mountedInstances BEFORE calling plugin.unmount(mountInfo.context) to prevent infinite re-entrant unmount loops. Return false if plugin.unmount throws.
   - In mountPlugin(pluginId, container, context): maintain this._mountingIds = new Set(). If this._mountingIds.has(pluginId) throw new Error(`Circular mount detected for plugin "${pluginId}"`); add to set before mount, delete in finally block.
5. Verification:
   Run all verification suites and confirm 100% pass:
   - node tests/verify-m1-core.js (all 29 passed)
   - node tests/stress-m1-adversarial.test.js (all 17 passed)
   - node tests/test-adversarial-m1.js (all 34 passed)
   - node tests/run-tests.js (all 129 passed)
6. Write handoff.md in your working directory and notify the orchestrator via send_message with test results.

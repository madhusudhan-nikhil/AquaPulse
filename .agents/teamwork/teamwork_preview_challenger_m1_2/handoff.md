# Milestone 1 Adversarial Challenge Handoff Report

**Agent**: teamwork_preview_challenger_m1_2  
**Role**: Empirical Challenger (critic, specialist)  
**Target Scope**: Milestone 1 Core Modules (`src/core/config-manager.js`, `src/core/plugin-registry.js`)  
**Verdict**: **REQUEST_CHANGES**  
**Overall Risk Assessment**: **HIGH / CRITICAL**

---

## 1. Observation

Direct empirical observations from executing `node tests/test-adversarial-m1.js`:

```
======================================================================
Summary: 34 tests executed. 16 passed, 18 failed.
======================================================================
```

### Observation 1: Blind Regex String Corruption in `lenientParseJSON`
- **File**: `src/core/config-manager.js`, Lines 104–105:
  ```javascript
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036\u00AB\u00BB]/g, '"');
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
  ```
- **Execution & Verbatim Output**:
  * Input: `{"title": "The Book of “Aquascaping” Secrets"}`
  * Result: `JSON Parse Error at line 1, column 25: Expected ',' or '}' after property value in JSON at position 24 (line 1 column 25)`
  * Input: `{"french": "Le mot « Poisson »"}`
  * Result: `JSON Parse Error at line 1, column 22: Expected ',' or '}' after property value in JSON at position 21 (line 1 column 22)`
  * Input: `{'note': 'It’s a planted tank'}`
  * Result: `JSON Parse Error at line 1, column 14: Expected ',' or '}' after property value in JSON at position 13 (line 1 column 14)`
- **Mechanism**: The global regex replacement executes across the entire raw document before any tokenization or string literal masking occurs. Consequently, typographic quotes inside legitimate string literals are unescaped into standard quotes (`"The Book of "Aquascaping" Secrets"`), terminating the string prematurely and corrupting valid JSON.

### Observation 2: Invalid JSON Escape Generation from Single-Quoted Strings in `lenientParseJSON`
- **File**: `src/core/config-manager.js`, Lines 125–133:
  ```javascript
  s = s.replace(
    /("(?:[^"\\]|\\.)*")|'((?:[^'\\]|\\.)*)'/g,
    (match, doubleQuoted, singleQuotedContent) => {
      if (doubleQuoted) return doubleQuoted;
      const escapedContent = singleQuotedContent.replace(/"/g, '\\"');
      return `"${escapedContent}"`;
    }
  );
  ```
- **Execution & Verbatim Output**:
  * Input: `{'note': 'It\'s a planted tank'}`
  * Result: `JSON Parse Error at line 1, column 14: Bad escaped character in JSON at position 13 (line 1 column 14)`
- **Mechanism**: Single quotes in JavaScript allow `\'`. However, standard JSON (RFC 8259) prohibits `\'`. Step 4 preserves `\'` inside the string literal, producing `"It\'s a planted tank"`, which V8 `JSON.parse` immediately rejects.

### Observation 3: Syntax Error on Nested Comments and Consecutive Commas
- **File**: `src/core/config-manager.js`, Lines 110–121:
  ```javascript
  s = s.replace(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\/\*[\s\S]*?\*\/|\/\/[^\r\n]*)/g,
    ...
  );
  s = s.replace(/,(\s*[}\]])/g, '$1');
  ```
- **Execution & Verbatim Output**:
  * Input: `{\n  /* outer /* inner */ comment */\n  "key": 100\n}`
  * Result: `JSON Parse Error at line 2, column 4: Expected property name or '}' in JSON at position 5 (line 2 column 4)`
  * Input: `{"list": [1, 2, 3,, ]}`
  * Result: `JSON Parse Error at line 1, column 1: Unexpected token ']', ..."[1, 2, 3, ]}" is not valid JSON`
  * Input: `{"list": [1, 2, /* comment */ , ]}`
  * Result: `JSON Parse Error at line 1, column 1: Unexpected token ']', "{"list": [1, 2,   ]}" is not valid JSON`
  * Input: `{\u00A0"tank":\u00A0"Community"\u00A0}`
  * Result: `JSON Parse Error at line 1, column 2: Expected property name or '}' in JSON at position 1 (line 1 column 2)`

### Observation 4: Inadequate Section Type Validation in `importJSON`
- **File**: `src/core/config-manager.js`, Lines 188–190:
  ```javascript
  if (!parsed.tank || !parsed.species || !parsed.medicines) {
    throw new Error('Aquarium profile must contain "tank", "species", and "medicines" sections.');
  }
  ```
- **Execution & Verbatim Output**:
  * Input: `JSON.stringify({ tank: "not an object", species: 12345, medicines: true })`
  * Result: Succeeded without error, returning `{ tank: 'string', species: 12345, medicines: true }`.
  * Downstream: When passed to `saveActiveConfig()` and loaded into engines, causes unhandled TypeError: `Cannot read properties of string (reading 'dimensions')` or `species.forEach is not a function`.

### Observation 5: Crashes and Missing Escapes in `exportCSV`
- **File**: `src/core/config-manager.js`, Lines 201–213:
  ```javascript
  static exportCSV(logs) {
    const header = 'Date, Ammonia_ppm, ...';
    if (!logs || !logs.length) {
      return header;
    }
    const escape = (val) => {
      const str = val == null ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = logs.map(l => { ... l.date ... });
  ```
- **Execution & Verbatim Output**:
  * `exportCSV("not an array")`: Throws `TypeError: logs.map is not a function`.
  * `exportCSV([null])`: Throws `TypeError: Cannot read properties of null (reading 'date')`.
  * `exportCSV([{ date: '2026-10-20', notes: 'A\rB' }])`: Standalone `\r` is NOT quoted because `str.includes('\n')` is false, corrupting CSV row delimitation.
  * Formula Injection: Input `notes: "=CMD|' /C calc'!A0"` is output unescaped as raw formula, triggering spreadsheet execution (CWE-1236).

### Observation 6: Unhandled Stack Overflow on Circular Mount in `PluginRegistry`
- **File**: `src/core/plugin-registry.js`, Lines 142–161:
  ```javascript
  mountPlugin(pluginId, container, context = {}) {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) throw new Error(`Plugin "${pluginId}" not found`);
    if (this.mountedInstances.has(pluginId)) this.unmountPlugin(pluginId);
    const instance = plugin.mount(container, context);
    this.mountedInstances.set(pluginId, { container, context, instance });
    ...
  }
  ```
- **Execution & Verbatim Output**:
  * Interdependent plugins where `pluginA.mount()` calls `registry.mountPlugin('pluginB')` and `pluginB.mount()` calls `registry.mountPlugin('pluginA')`:
  * Result: `RangeError: Maximum call stack size exceeded` (Process crash / stack exhaustion).

### Observation 7: Re-entrant Unmount Infinite Loop (2,716 Invocations)
- **File**: `src/core/plugin-registry.js`, Lines 82–97 & 168–188:
  ```javascript
  unregister(pluginId) {
    if (this.mountedInstances.has(pluginId)) {
      this.unmountPlugin(pluginId);
    }
    const removed = this.plugins.delete(pluginId);
  }
  unmountPlugin(pluginId) {
    const mountInfo = this.mountedInstances.get(pluginId);
    if (!mountInfo) return false;
    try {
      plugin.unmount(mountInfo.context);
    } catch (err) {}
    this.mountedInstances.delete(pluginId);
  }
  ```
- **Execution & Verbatim Output**:
  * When a plugin's `unmount()` method invokes `registry.unregister(this.id)` to clean itself up:
  * `this.mountedInstances.delete(pluginId)` has NOT run yet when `plugin.unmount()` executes.
  * Nested `unregister()` observes `this.mountedInstances.has(pluginId) === true`, triggering another `unmountPlugin()`.
  * Result: 2,716 recursive unmount calls until recursion limit terminates execution:
    `[PluginRegistry] Error unmounting plugin "reentrant-p": RangeError: Maximum call stack size exceeded`

### Observation 8: Incomplete Contract Enforcement in `register()`
- **File**: `src/core/plugin-registry.js`, Lines 24–47 vs 54–66:
  * `validateContract()` is defined with comprehensive type checks (ensures `id`, `name`, `category` are strings, and `update` is a function if provided).
  * However, `register()` NEVER calls `validateContract()`. It only performs shallow truthy checks:
    ```javascript
    if (!plugin.id || !plugin.name || !plugin.category) throw ...
    if (typeof plugin.mount !== 'function' || typeof plugin.unmount !== 'function') throw ...
    ```
  * Result: Plugins with `id: 123`, `name: true`, `category: {}`, and `update: "invalid"` are accepted without rejection.
  * In addition, `unmountPlugin` returns `true` even when `plugin.unmount()` threw an error.

---

## 2. Logic Chain

1. **Premise**: AquaPulse relies on `ConfigManager.lenientParseJSON` to ingest user configurations containing lenient formatting (smart quotes, comments, trailing commas).
2. **Step 1 (Parser Failure)**: Because smart quote and apostrophe replacements are performed globally before string literal tokens are identified, valid internal text containing apostrophes or quotes (`"Author’s Guide"`, `"He said “Hi”"`, `'It\'s great'`) is transformed into invalid JSON syntax. This breaks legitimate user profiles and notes.
3. **Step 2 (Data Validation Failure)**: `ConfigManager.importJSON` performs only truthiness checks on section keys (`!parsed.tank`). A corrupted JSON file with `{ tank: "text", species: 42, medicines: true }` passes validation, is saved to active config, and subsequently crashes core presentation and calculation engines with unhandled TypeErrors.
4. **Step 3 (CSV Export Failure)**: `exportCSV` assumes inputs are non-null arrays of non-null objects. Any string input, missing array guard, or null row item triggers unhandled TypeErrors (`logs.map is not a function`, `Cannot read properties of null`), while standalone carriage returns and spreadsheet formulas are unescaped/unsanitized.
5. **Step 4 (Registry Lifecycle Failure)**: `PluginRegistry` fails to guard against re-entrant calls during teardown. If a plugin teardown calls `unregister()`, the registry enters a recursive loop executing `unmount()` over 2,700 times until call stack overflow occurs.
6. **Step 5 (Circular Mount Failure)**: `mountPlugin()` does not track in-flight mounts. Mutually dependent plugins trigger unhandled `RangeError: Maximum call stack size exceeded`.
7. **Conclusion**: Milestone 1 core foundation modules exhibit critical edge-case fragility, potential process crashes under cyclic or re-entrant invocations, and string-corrupting parser behavior. A verdict of `REQUEST_CHANGES` is required before these modules can serve as the reliable backbone for Milestones 2–4.

---

## 3. Caveats

- **No Caveats**: All 18 failure modes were reproduced and executed directly on the local Node.js environment against the actual files `src/core/config-manager.js` and `src/core/plugin-registry.js`.
- Prototype pollution was verified: `deepMerge` does not pollute `Object.prototype`, but overrides `res.constructor`.
- Deeply nested JSON structures up to depth 200 are parsed without stack overflow.

---

## 4. Conclusion & Actionable Recommendations

**Verdict**: **REQUEST_CHANGES**

### Required Mitigations for Worker:
1. **`src/core/config-manager.js` - `lenientParseJSON`**:
   - Tokenize or mask string literals *before* stripping comments or converting curly quotes, or only convert curly quotes used as outer delimiters.
   - In step 4, replace unescaped double quotes inside single-quoted strings, AND replace `\'` with `'`.
   - Support multiple consecutive trailing commas by looping or using `/,\s*(?=[,}\]])/g`.
   - Strip nested comments cleanly using a multi-pass or balanced comment stripper.
   - Normalize non-breaking whitespace (`\u00A0`) outside strings.
2. **`src/core/config-manager.js` - `importJSON` & `exportJSON`**:
   - Validate section types: `typeof parsed.tank === 'object' && parsed.tank !== null`, `Array.isArray(parsed.species)`, `typeof parsed.medicines === 'object' && parsed.medicines !== null`.
3. **`src/core/config-manager.js` - `exportCSV`**:
   - Guard against non-array input: `if (!Array.isArray(logs) || !logs.length) return header;`
   - Guard against null/undefined rows: `const row = l || {};`
   - Include `\r` in quote escape check: `str.includes('\r')`.
   - Sanitize formula injection prefixes: prepend `'` if cell starts with `=`, `+`, `-`, or `@`.
4. **`src/core/plugin-registry.js`**:
   - Have `register(plugin)` invoke `this.validateContract(plugin)` to enforce string types on `id`, `name`, `category` and function type on `update`.
   - Prevent re-entrant unmount loops: delete from `this.mountedInstances` *before* invoking `plugin.unmount(mountInfo.context)`.
   - Prevent circular mount stack overflow: maintain a `Set` of currently mounting plugin IDs (`this.mountingIds`); throw a descriptive error if cycle detected.
   - Return `false` in `unmountPlugin` if `plugin.unmount` throws an error.

---

## 5. Verification Method

To independently reproduce all 18 failure modes, run:

```powershell
node tests/test-adversarial-m1.js
```

**Expected Verification Output**:
- Test count: 34 tests
- Failures: 18 failures reproducing the exact errors documented above.
- Invalidation condition: If `node tests/test-adversarial-m1.js` reports 0 failures after worker fixes, changes are validated.

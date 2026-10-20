/**
 * AquaPulse Configuration Manager
 * Handles 3-tier configuration precedence, recursive deep-merging with array replacement,
 * lenient JSON parsing (with comment, trailing comma, and smart-quote stripping),
 * format validation, CSV serialization, and multi-tank scoped storage keys.
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

function resolveStorage(customStorage) {
  if (customStorage && typeof customStorage.getItem === 'function') {
    return customStorage;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage;
    } catch (_) {}
  } else if (typeof localStorage !== 'undefined' && localStorage) {
    try {
      return localStorage;
    } catch (_) {}
  }
  return null;
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item));
  const res = {};
  for (const key of Object.keys(obj)) {
    res[key] = deepClone(obj[key]);
  }
  return res;
}

export class ConfigManager {
  /**
   * @param {Object} [options]
   * @param {EventBus} [options.eventBus]
   * @param {Storage} [options.storage]
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus || null;
    this.storage = resolveStorage(options.storage);
    this.activeConfig = null;
  }

  /**
   * Recursive deep-merge with array replacement
   * Objects are merged recursively; arrays in source completely replace arrays in target.
   * Primitives in source replace primitives in target.
   *
   * @param {Object} target - Target object
   * @param {Object} source - Source override object
   * @returns {Object} Merged cloned object
   */
  static deepMerge(target, source) {
    if (!source || typeof source !== 'object') {
      return deepClone(target);
    }
    if (!target || typeof target !== 'object') {
      return deepClone(source);
    }

    const result = Array.isArray(target) ? [...target] : Object.assign({}, target);

    for (const key of Object.keys(source)) {
      const srcVal = source[key];
      const tgtVal = result[key];

      if (
        srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) &&
        tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal)
      ) {
        result[key] = ConfigManager.deepMerge(tgtVal, srcVal);
      } else if (Array.isArray(srcVal)) {
        // Complete array replacement
        result[key] = srcVal.map(item => deepClone(item));
      } else {
        result[key] = deepClone(srcVal);
      }
    }

    return result;
  }

  /**
   * Lenient JSON parser with auto-sanitization:
   * - Strips Unicode smart/curly quotes (converting to standard ASCII quotes)
   * - Strips single-line (// ...) and multi-line (/* ... *\/) comments outside quoted strings
   * - Strips trailing commas in objects and arrays
   * - Provides 1-indexed line and column error reporting upon SyntaxError
   *
   * @param {string} rawStr - Raw JSON text or relaxed JSON text
   * @returns {Object|Array|null} Parsed JavaScript value
   */
  static lenientParseJSON(rawStr) {
    if (typeof rawStr !== 'string') return null;
    let s = rawStr.trim();
    if (!s) return null;
    if (s.charCodeAt(0) === 0xFEFF) {
      s = s.slice(1).trim();
    }
    if (!s) return null;

    const CURLY_DOUBLE_QUOTES = new Set(['\u201C', '\u201D', '\u201E', '\u201F', '\u2033', '\u2036', '\u00AB', '\u00BB']);
    const CURLY_SINGLE_QUOTES = new Set(['\u2018', '\u2019', '\u201A', '\u201B', '\u2032', '\u2035']);

    const len = s.length;
    let i = 0;
    const tokens = [];
    let codeBuffer = '';

    function flushCode() {
      if (codeBuffer) {
        tokens.push({ type: 'code', val: codeBuffer });
        codeBuffer = '';
      }
    }

    while (i < len) {
      const ch = s[i];

      // Remove comments outside string literals (supporting nested comments!)
      if (ch === '/' && i + 1 < len) {
        const next = s[i + 1];
        if (next === '/') {
          i += 2;
          while (i < len && s[i] !== '\n' && s[i] !== '\r') {
            i++;
          }
          continue;
        } else if (next === '*') {
          i += 2;
          let depth = 1;
          while (i < len && depth > 0) {
            if (s[i] === '/' && s[i + 1] === '*') {
              depth++;
              i += 2;
            } else if (s[i] === '*' && s[i + 1] === '/') {
              depth--;
              i += 2;
            } else {
              if (s[i] === '\n') {
                codeBuffer += '\n';
              }
              i++;
            }
          }
          continue;
        }
      }

      // Double-quoted strings or curly double quote delimited strings
      if (ch === '"' || CURLY_DOUBLE_QUOTES.has(ch)) {
        flushCode();
        const openCh = ch;
        const startPos = i;
        i++;
        let strContent = '';
        let closed = false;
        while (i < len) {
          const cur = s[i];
          if (cur === '\\') {
            strContent += cur;
            if (i + 1 < len) {
              strContent += s[i + 1];
              i += 2;
            } else {
              i++;
            }
            continue;
          }
          if (cur === '"' || (openCh !== '"' && CURLY_DOUBLE_QUOTES.has(cur))) {
            closed = true;
            i++;
            break;
          }
          strContent += cur;
          i++;
        }
        if (!closed) {
          codeBuffer += s.slice(startPos);
          break;
        }
        tokens.push({ type: 'string', val: `"${strContent}"` });
        continue;
      }

      // Single-quoted strings or curly single quote delimited strings
      if (ch === "'" || CURLY_SINGLE_QUOTES.has(ch)) {
        flushCode();
        const openCh = ch;
        const startPos = i;
        i++;
        let strContent = '';
        let closed = false;
        while (i < len) {
          const cur = s[i];
          if (cur === '\\') {
            if (i + 1 < len) {
              const nextChar = s[i + 1];
              if (nextChar === "'") {
                strContent += "'";
                i += 2;
                continue;
              } else if (nextChar === '"') {
                strContent += '\\"';
                i += 2;
                continue;
              } else {
                strContent += '\\' + nextChar;
                i += 2;
                continue;
              }
            }
          }
          if (cur === "'" || (openCh !== "'" && CURLY_SINGLE_QUOTES.has(cur))) {
            closed = true;
            i++;
            break;
          }
          if (cur === '\u2019') {
            strContent += "'";
            i++;
            continue;
          }
          if (cur === '"') {
            strContent += '\\"';
            i++;
            continue;
          }
          strContent += cur;
          i++;
        }
        if (!closed) {
          codeBuffer += s.slice(startPos);
          break;
        }
        tokens.push({ type: 'string', val: `"${strContent}"` });
        continue;
      }

      // Normalize non-breaking space outside string literals
      if (ch === '\u00A0') {
        codeBuffer += ' ';
        i++;
        continue;
      }

      codeBuffer += ch;
      i++;
    }

    flushCode();

    // Strip trailing commas from code tokens
    for (const token of tokens) {
      if (token.type === 'code') {
        let code = token.val;
        let prev;
        do {
          prev = code;
          code = code.replace(/,\s*(?=[,}\]])/g, '');
        } while (code !== prev);
        token.val = code;
      }
    }

    const clean = tokens.map(t => t.val).join('');

    try {
      return JSON.parse(clean);
    } catch (err) {
      if (err instanceof SyntaxError) {
        let line = 1;
        let col = 1;
        const posMatch = err.message.match(/position\s+(\d+)/i);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          const lines = clean.substring(0, pos).split('\n');
          line = lines.length;
          col = lines[lines.length - 1].length + 1;
        }
        const diagnosticErr = new Error(`JSON Parse Error at line ${line}, column ${col}: ${err.message}`);
        diagnosticErr.line = line;
        diagnosticErr.column = col;
        diagnosticErr.originalError = err;
        throw diagnosticErr;
      }
      throw err;
    }
  }

  /**
   * Export configuration object to formatted JSON string
   * Validates required sections: tank, species, medicines
   *
   * @param {Object} config - Configuration object
   * @returns {string} Formatted JSON string
   */
  static exportJSON(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('Invalid configuration object');
    }
    if (
      !config.tank || typeof config.tank !== 'object' || Array.isArray(config.tank) ||
      !Array.isArray(config.species) ||
      !config.medicines || typeof config.medicines !== 'object'
    ) {
      throw new Error('Aquarium profile must contain "tank", "species", and "medicines" sections.');
    }
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration string using lenient parsing and contract validation
   *
   * @param {string} rawStr - Raw configuration string
   * @returns {Object} Validated configuration object
   */
  static importJSON(rawStr) {
    const parsed = ConfigManager.lenientParseJSON(rawStr);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid JSON configuration: root must be an object');
    }
    if (
      !parsed.tank || typeof parsed.tank !== 'object' || Array.isArray(parsed.tank) ||
      !Array.isArray(parsed.species) ||
      !parsed.medicines || typeof parsed.medicines !== 'object'
    ) {
      throw new Error('Aquarium profile must contain "tank", "species", and "medicines" sections.');
    }
    return parsed;
  }

  /**
   * Export water parameter logs to CSV format
   * Header: 'Date, Ammonia_ppm, Nitrite_ppm, Nitrate_ppm, pH, Temp_C, GH_dGH, KH_dKH, Water_Change, Notes'
   *
   * @param {Array<Object>} logs - Array of parameter log objects
   * @returns {string} CSV text string
   */
  static exportCSV(logs) {
    const header = 'Date, Ammonia_ppm, Nitrite_ppm, Nitrate_ppm, pH, Temp_C, GH_dGH, KH_dKH, Water_Change, Notes';
    if (!Array.isArray(logs) || !logs.length) {
      return header;
    }

    const escape = (val) => {
      const str = val == null ? '' : String(val);
      if (/^[=+\-@]/.test(str)) {
        return `"'${str.replace(/"/g, '""')}"`;
      }
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = logs.map(l => {
      const row = l || {};
      return [
        escape(row.date || ''),
        escape(row.nh3 ?? row.ammonia ?? 0),
        escape(row.no2 ?? row.nitrite ?? 0),
        escape(row.no3 ?? row.nitrate ?? 0),
        escape(row.ph ?? 7.0),
        escape(row.temp ?? 25.0),
        escape(row.gh ?? 6),
        escape(row.kh ?? 4),
        escape(row.wc || row.waterChange || 'None'),
        escape(row.notes || '')
      ].join(', ');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Helper to construct tank-isolated storage key
   * @param {string} tankId
   * @param {string} suffix
   * @returns {string} 'aquapulse_<tankId>_<suffix>'
   */
  static getScopedStorageKey(tankId, suffix) {
    const id = tankId || 'default';
    const s = suffix || 'data';
    return `aquapulse_${id}_${s}`;
  }

  /**
   * Ingest configuration following 3-tier precedence:
   * Tier 1: AQUAPULSE_DEFAULT_CONFIG
   * Tier 2: AQUAPULSE_PRIVATE_CONFIG (merged via deepMerge)
   * Tier 3: localStorage['aquapulse_active_config'] (active overrides)
   *
   * @param {Object} [defaultCfg] - Optional explicit default config
   * @param {Object} [privateCfg] - Optional explicit private config
   * @returns {Object} Unified active configuration
   */
  loadConfig(defaultCfg = null, privateCfg = null) {
    // 1. Resolve Tier 1 (Default Demo Config)
    let config = defaultCfg;
    if (!config && typeof globalThis !== 'undefined' && globalThis.AQUAPULSE_DEFAULT_CONFIG) {
      config = globalThis.AQUAPULSE_DEFAULT_CONFIG;
    }
    config = config ? deepClone(config) : {};

    // 2. Resolve Tier 2 (Personal Private Config)
    let personal = privateCfg;
    if (!personal && typeof globalThis !== 'undefined' && globalThis.AQUAPULSE_PRIVATE_CONFIG) {
      personal = globalThis.AQUAPULSE_PRIVATE_CONFIG;
    }
    if (personal) {
      config = ConfigManager.deepMerge(config, personal);
    }

    // 3. Resolve Tier 3 (Session overrides in localStorage)
    if (this.storage) {
      try {
        const storedRaw = this.storage.getItem('aquapulse_active_config');
        if (storedRaw) {
          const sessionConfig = ConfigManager.lenientParseJSON(storedRaw);
          if (sessionConfig && typeof sessionConfig === 'object') {
            config = ConfigManager.deepMerge(config, sessionConfig);
          }
        }
      } catch (err) {
        console.warn('[ConfigManager] Could not read active config from storage:', err);
      }
    }

    this.activeConfig = config;

    if (this.eventBus) {
      this.eventBus.emit('config:loaded', { config: this.activeConfig });
    }

    return this.activeConfig;
  }

  /**
   * Get active config, loading defaults if not yet loaded
   * @returns {Object}
   */
  getActiveConfig() {
    if (!this.activeConfig) {
      return this.loadConfig();
    }
    return deepClone(this.activeConfig);
  }

  /**
   * Save active config to session storage and emit config:updated
   * @param {Object} config
   */
  saveActiveConfig(config) {
    if (!config || !config.tank || !config.species || !config.medicines) {
      throw new Error('Aquarium profile must contain "tank", "species", and "medicines" sections.');
    }
    this.activeConfig = deepClone(config);

    if (this.storage) {
      try {
        this.storage.setItem('aquapulse_active_config', JSON.stringify(this.activeConfig));
      } catch (err) {
        console.warn('[ConfigManager] Could not persist active config:', err);
      }
    }

    if (this.eventBus) {
      this.eventBus.emit('config:updated', { config: this.activeConfig });
    }

    return this.activeConfig;
  }

  /**
   * Import JSON text into active config
   * @param {string} rawStr
   * @returns {Object}
   */
  importJSON(rawStr) {
    const parsed = ConfigManager.importJSON(rawStr);
    return this.saveActiveConfig(parsed);
  }

  /**
   * Export active configuration
   * @returns {string}
   */
  exportJSON() {
    const cfg = this.getActiveConfig();
    return ConfigManager.exportJSON(cfg);
  }

  /**
   * Export logs to CSV
   * @param {Array} logs
   * @returns {string}
   */
  exportCSV(logs) {
    return ConfigManager.exportCSV(logs);
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.AquaPulseConfigManager = ConfigManager;
  if (!globalThis.ConfigManager) {
    globalThis.ConfigManager = ConfigManager;
  }
}

export default ConfigManager;

/**
 * AquaPulse Telemetry Hardware Abstraction Layer (HAL)
 * Provides unified interface for streaming water quality, environmental sensors,
 * and equipment telemetry from simulated feeds, manual test kits, or IoT bridges.
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

// Universal import for DiagnosticsEngine
let DiagnosticsEngine;
if (typeof require !== 'undefined') {
  try {
    DiagnosticsEngine = require('../engines/diagnostics-engine.js');
    if (DiagnosticsEngine.DiagnosticsEngine) DiagnosticsEngine = DiagnosticsEngine.DiagnosticsEngine;
  } catch (_) {}
}
if (!DiagnosticsEngine && typeof globalThis !== 'undefined' && globalThis.DiagnosticsEngine) {
  DiagnosticsEngine = globalThis.DiagnosticsEngine;
}

/**
 * Base interface for all telemetry providers
 */
export class ITelemetryProvider {
  constructor(name = 'base-provider') {
    this.name = name;
    this._listeners = new Set();
    this._connected = false;
    this._latestReading = null;
  }

  async connect() {
    this._connected = true;
    return true;
  }

  async disconnect() {
    this._connected = false;
  }

  isConnected() {
    return this._connected;
  }

  getLatestReading() {
    return this._latestReading;
  }

  /**
   * Subscribe to new telemetry packets
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  onReading(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Telemetry reading listener must be a function');
    }
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /**
   * Broadcast a telemetry packet to all subscribers
   * @protected
   */
  _emitReading(packet) {
    this._latestReading = packet;
    for (const listener of this._listeners) {
      try {
        listener(packet);
      } catch (err) {
        console.error(`[${this.name}] Listener error:`, err);
      }
    }
  }
}

/**
 * Simulated Telemetry Provider for realistic offline / demo mode
 */
export class SimulatedProvider extends ITelemetryProvider {
  /**
   * @param {Object} [options]
   * @param {string} [options.tankId='tank-demo']
   * @param {Object} [options.baseTargets]
   */
  constructor(options = {}) {
    super('SimulatedTelemetryProvider');
    this.tankId = options.tankId || 'tank-demo';
    this.baseTargets = {
      temp: 25.5,
      ph: 7.1,
      nh3: 0.0,
      no2: 0.0,
      no3: 15.0,
      gh: 7.0,
      kh: 4.0,
      orpMv: 340,
      flowRateLph: 1750,
      ...options.baseTargets
    };
    this._step = 0;
    this._timer = null;
    this._forcedSpikes = {};
  }

  async connect() {
    await super.connect();
    // Generate initial packet
    this.generateTick();
    return true;
  }

  async disconnect() {
    this.stopStreaming();
    await super.disconnect();
  }

  /**
   * Inject a temporary metric spike for testing emergency alerts
   * @param {string} param
   * @param {number} value
   */
  simulateSpike(param, value) {
    this._forcedSpikes[param] = value;
    this.generateTick();
  }

  /**
   * Clear any forced parameter spike
   * @param {string} param
   */
  clearSpike(param) {
    if (param) {
      delete this._forcedSpikes[param];
    } else {
      this._forcedSpikes = {};
    }
    this.generateTick();
  }

  /**
   * Produce one telemetry reading with realistic sinusoidal drifts
   * @returns {Object} Standardized TelemetryPacket
   */
  generateTick() {
    this._step += 0.1;
    const t = this._step;

    // Realistic biological fluctuations
    const tempDrift = Math.sin(t * 0.3) * 0.35 + (Math.sin(t * 1.5) * 0.05);
    const phDrift = Math.cos(t * 0.2) * 0.12;
    const orpDrift = Math.sin(t * 0.4) * 15;
    const no3Drift = Math.sin(t * 0.1) * 2.0;

    const metrics = {
      temp: Number((this.baseTargets.temp + tempDrift).toFixed(1)),
      ph: Number((this.baseTargets.ph + phDrift).toFixed(2)),
      nh3: this._forcedSpikes.nh3 !== undefined ? this._forcedSpikes.nh3 : 0.0,
      no2: this._forcedSpikes.no2 !== undefined ? this._forcedSpikes.no2 : 0.0,
      no3: this._forcedSpikes.no3 !== undefined ? this._forcedSpikes.no3 : Number((this.baseTargets.no3 + no3Drift).toFixed(1)),
      gh: Number(this.baseTargets.gh.toFixed(1)),
      kh: Number(this.baseTargets.kh.toFixed(1)),
      orpMv: Math.round(this.baseTargets.orpMv + orpDrift),
      flowRateLph: Math.round(this.baseTargets.flowRateLph + Math.sin(t * 0.8) * 25)
    };

    // Apply any other forced spikes
    for (const [k, v] of Object.entries(this._forcedSpikes)) {
      if (k !== 'nh3' && k !== 'no2' && k !== 'no3') {
        metrics[k] = v;
      }
    }

    // Determine status
    let status = 'OPTIMAL';
    if (metrics.nh3 > 0.05 || metrics.no2 > 0.05 || metrics.temp > 29 || metrics.temp < 21) {
      status = 'CRITICAL';
    } else if (metrics.nh3 > 0.0 || metrics.no2 > 0.0 || metrics.no3 > 30 || metrics.ph < 6.4 || metrics.ph > 7.8) {
      status = 'WATCH';
    }

    const packet = {
      timestamp: Date.now(),
      tankId: this.tankId,
      metrics,
      equipment: {
        filter: { online: true, flowRateLph: metrics.flowRateLph, turnoverRatio: 7.9 },
        heater: { online: true, state: metrics.temp < 25.5 ? 'heating' : 'idle', wattage: 200 },
        lighting: { online: true, state: 'on', intensityPct: 85 }
      },
      status
    };

    this._emitReading(packet);
    return packet;
  }

  /**
   * Start recurring streaming interval
   * @param {number} [intervalMs=3000]
   */
  startStreaming(intervalMs = 3000) {
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => {
      if (this.isConnected()) {
        this.generateTick();
      }
    }, intervalMs);
  }

  /**
   * Stop streaming interval
   */
  stopStreaming() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

/**
 * Manual Log Telemetry Provider for manual water test kit entries
 */
export class ManualLogProvider extends ITelemetryProvider {
  constructor(options = {}) {
    super('ManualLogProvider');
    this.tankId = options.tankId || 'tank-demo';
  }

  /**
   * Ingest a manual log test entry and normalize to a TelemetryPacket
   * @param {Object} entry
   * @returns {Object} TelemetryPacket
   */
  logReading(entry = {}) {
    const metrics = {
      temp: Number(entry.temp) || 25.0,
      ph: Number(entry.ph) || 7.0,
      nh3: Number(entry.nh3) || 0.0,
      no2: Number(entry.no2) || 0.0,
      no3: Number(entry.no3) || 15.0,
      gh: Number(entry.gh) || 7.0,
      kh: Number(entry.kh) || 4.0,
      orpMv: entry.orpMv !== undefined ? Number(entry.orpMv) : 330,
      flowRateLph: entry.flowRateLph !== undefined ? Number(entry.flowRateLph) : 1750
    };

    let status = 'OPTIMAL';
    if (metrics.nh3 > 0.05 || metrics.no2 > 0.05 || metrics.temp > 29 || metrics.temp < 21) {
      status = 'CRITICAL';
    } else if (metrics.nh3 > 0.0 || metrics.no2 > 0.0 || metrics.no3 > 30 || metrics.ph < 6.4 || metrics.ph > 7.8) {
      status = 'WATCH';
    }

    const packet = {
      timestamp: entry.date ? new Date(entry.date).getTime() : Date.now(),
      tankId: entry.tankId || this.tankId,
      metrics,
      equipment: {
        filter: { online: true, flowRateLph: metrics.flowRateLph },
        heater: { online: true, state: 'idle' },
        lighting: { online: true, state: 'on' }
      },
      status,
      source: 'manual',
      notes: entry.notes || ''
    };

    this._emitReading(packet);
    return packet;
  }
}

/**
 * IoT Bridge Telemetry Provider for MQTT/REST/WebSocket streams
 */
export class IoTBridgeProvider extends ITelemetryProvider {
  constructor(options = {}) {
    super('IoTBridgeProvider');
    this.tankId = options.tankId || 'tank-demo';
    this.endpoint = options.endpoint || 'ws://localhost:8080/aquapulse/telemetry';
  }

  /**
   * Ingest arbitrary external telemetry payload and normalize
   * @param {Object|string} rawPayload
   * @returns {Object} TelemetryPacket
   */
  ingestPayload(rawPayload) {
    let data = rawPayload;
    if (typeof rawPayload === 'string') {
      try {
        data = JSON.parse(rawPayload);
      } catch (err) {
        throw new Error(`Invalid IoT JSON payload: ${err.message}`);
      }
    }

    if (!data || typeof data !== 'object') {
      throw new Error('IoT payload must be an object');
    }

    const rawMetrics = data.metrics || data.parameters || data;
    const metrics = {
      temp: Number(rawMetrics.temp ?? rawMetrics.temperature ?? 25.0),
      ph: Number(rawMetrics.ph ?? 7.0),
      nh3: Number(rawMetrics.nh3 ?? rawMetrics.ammonia ?? 0.0),
      no2: Number(rawMetrics.no2 ?? rawMetrics.nitrite ?? 0.0),
      no3: Number(rawMetrics.no3 ?? rawMetrics.nitrate ?? 15.0),
      gh: Number(rawMetrics.gh ?? 7.0),
      kh: Number(rawMetrics.kh ?? 4.0),
      orpMv: Number(rawMetrics.orpMv ?? rawMetrics.orp ?? rawMetrics.redox ?? 330),
      flowRateLph: Number(rawMetrics.flowRateLph ?? rawMetrics.flow ?? 1750)
    };

    const status = data.status || (metrics.nh3 > 0.05 ? 'CRITICAL' : (metrics.no3 > 30 ? 'WATCH' : 'OPTIMAL'));

    const packet = {
      timestamp: data.timestamp || Date.now(),
      tankId: data.tankId || this.tankId,
      metrics,
      equipment: data.equipment || {
        filter: { online: true, flowRateLph: metrics.flowRateLph },
        heater: { online: true },
        lighting: { online: true }
      },
      status,
      source: 'iot-bridge'
    };

    this._emitReading(packet);
    return packet;
  }
}

/**
 * Telemetry Hardware Abstraction Layer Coordinator
 * Mediates between providers, Store, and EventBus.
 */
export class TelemetryHAL {
  /**
   * @param {Object} [options]
   * @param {AquaPulseStore} [options.store]
   * @param {EventBus} [options.eventBus]
   * @param {string} [options.tankId='tank-demo']
   */
  constructor(options = {}) {
    this.store = options.store || null;
    this.eventBus = options.eventBus || null;
    this.tankId = options.tankId || 'tank-demo';

    this._providers = new Map();
    this._activeProviderName = null;
    this._packetListeners = new Set();
    this._unsubActiveProvider = null;

    // Register built-in providers
    this.registerProvider('simulated', new SimulatedProvider({ tankId: this.tankId }));
    this.registerProvider('manual', new ManualLogProvider({ tankId: this.tankId }));
    this.registerProvider('iot', new IoTBridgeProvider({ tankId: this.tankId }));

    // Default to simulated provider
    this.setActiveProvider('simulated');
  }

  /**
   * Register a telemetry provider
   * @param {string} name
   * @param {ITelemetryProvider} provider
   */
  registerProvider(name, provider) {
    if (!name || typeof name !== 'string') {
      throw new Error('Provider name is required');
    }
    if (!provider || typeof provider.onReading !== 'function') {
      throw new Error('Provider must implement ITelemetryProvider');
    }
    this._providers.set(name, provider);
  }

  /**
   * Set and activate a telemetry provider
   * @param {string} name
   * @returns {Promise<boolean>}
   */
  async setActiveProvider(name) {
    if (!this._providers.has(name)) {
      throw new Error(`Unknown telemetry provider: ${name}`);
    }

    if (this._unsubActiveProvider) {
      this._unsubActiveProvider();
      this._unsubActiveProvider = null;
    }

    const currentProvider = this.getActiveProvider();
    if (currentProvider && currentProvider.isConnected()) {
      await currentProvider.disconnect();
    }

    this._activeProviderName = name;
    const newProvider = this._providers.get(name);
    await newProvider.connect();

    this._unsubActiveProvider = newProvider.onReading((packet) => {
      this._handleIncomingPacket(packet);
    });

    return true;
  }

  /**
   * Get the active provider instance
   * @returns {ITelemetryProvider|null}
   */
  getActiveProvider() {
    return this._activeProviderName ? this._providers.get(this._activeProviderName) : null;
  }

  /**
   * Get provider by name
   * @param {string} name
   * @returns {ITelemetryProvider|undefined}
   */
  getProvider(name) {
    return this._providers.get(name);
  }

  /**
   * Subscribe to coordinated telemetry stream
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  onPacket(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Packet listener must be a function');
    }
    this._packetListeners.add(callback);
    return () => this._packetListeners.delete(callback);
  }

  /**
   * Internal packet processor
   * @private
   */
  _handleIncomingPacket(packet) {
    // 1. Sync to store if attached
    if (this.store) {
      this.store.setState('telemetry.current', packet.metrics);
      this.store.setState('telemetry.status', packet.status);

      // Evaluate diagnostics if targets are available
      const targets = this.store.getState('targets');
      if (DiagnosticsEngine && typeof DiagnosticsEngine.evaluateMetrics === 'function' && targets) {
        const triage = DiagnosticsEngine.evaluateMetrics(packet.metrics, targets);
        this.store.setState('telemetry.triage', triage);
        if (triage.overallStatus) {
          this.store.setState('telemetry.status', triage.overallStatus);
        }
      }
    }

    // 2. Emit to EventBus if attached
    if (this.eventBus) {
      this.eventBus.emit('telemetry:packet', packet);
      this.eventBus.emit('telemetry:current', packet.metrics);
      this.eventBus.emit('telemetry:status', packet.status);
    }

    // 3. Notify local packet listeners
    for (const listener of this._packetListeners) {
      try {
        listener(packet);
      } catch (err) {
        console.error('[TelemetryHAL] Listener error:', err);
      }
    }
  }

  /**
   * Ingest a reading through manual provider directly
   * @param {Object} reading
   * @returns {Object} TelemetryPacket
   */
  logManualReading(reading) {
    const manualProvider = this.getProvider('manual');
    if (!manualProvider) throw new Error('Manual provider not registered');
    return manualProvider.logReading(reading);
  }

  /**
   * Ingest an external IoT reading through IoT bridge
   * @param {Object} payload
   * @returns {Object} TelemetryPacket
   */
  ingestIoTPayload(payload) {
    const iotProvider = this.getProvider('iot');
    if (!iotProvider) throw new Error('IoT provider not registered');
    return iotProvider.ingestPayload(payload);
  }

  /**
   * Set tankId across all registered providers
   * @param {string} tankId
   */
  setTankId(tankId) {
    this.tankId = tankId;
    for (const provider of this._providers.values()) {
      if (provider && 'tankId' in provider) {
        provider.tankId = tankId;
      }
    }
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.TelemetryHAL = TelemetryHAL;
  globalThis.ITelemetryProvider = ITelemetryProvider;
  globalThis.SimulatedProvider = SimulatedProvider;
  globalThis.ManualLogProvider = ManualLogProvider;
  globalThis.IoTBridgeProvider = IoTBridgeProvider;
}
if (typeof window !== 'undefined') {
  window.TelemetryHAL = TelemetryHAL;
  window.ITelemetryProvider = ITelemetryProvider;
  window.SimulatedProvider = SimulatedProvider;
  window.ManualLogProvider = ManualLogProvider;
  window.IoTBridgeProvider = IoTBridgeProvider;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TelemetryHAL,
    ITelemetryProvider,
    SimulatedProvider,
    ManualLogProvider,
    IoTBridgeProvider
  };
  module.exports.default = TelemetryHAL;
}

export default TelemetryHAL;

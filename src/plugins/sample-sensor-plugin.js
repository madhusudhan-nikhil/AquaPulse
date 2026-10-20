/**
 * AquaPulse Sample Contributor Plugin: ORP / Redox Potential Sensor
 * Demonstrates the IPlugin extension contract for custom IoT sensors and dashboard widgets.
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

export const SampleSensorPlugin = {
  id: 'orp-redox-sensor',
  name: 'ORP / Redox Potential Sensor',
  category: 'sensor',
  version: '1.0.0',
  description: 'Continuous Oxidation-Reduction Potential (ORP) monitor assessing water oxidizing capacity and organic load.',

  _container: null,
  _context: null,
  _lastMv: 340,

  /**
   * Mount plugin into target container
   * @param {HTMLElement|Object} container - DOM node or mock container
   * @param {Object} context - { tankId, store, eventBus }
   * @returns {Object} Connection metadata
   */
  mount(container, context = {}) {
    this._container = container;
    this._context = context;
    this._lastMv = 340;

    this.render();

    return {
      connected: true,
      deviceId: 'ORP-PROBE-01',
      model: 'AquaPulse-Redox-Pro',
      firmware: 'v2.4.1'
    };
  },

  /**
   * Unmount plugin and clean up DOM
   */
  unmount() {
    if (this._container) {
      if (typeof this._container.innerHTML === 'string') {
        this._container.innerHTML = '';
      }
    }
    this._container = null;
    this._context = null;
  },

  /**
   * React to state/telemetry updates
   * @param {Object} state - AquaPulse state or telemetry snapshot
   */
  update(state) {
    if (!state) return;

    let mv = null;
    if (state.telemetry && state.telemetry.current && state.telemetry.current.orpMv !== undefined) {
      mv = state.telemetry.current.orpMv;
    } else if (state.current && state.current.orpMv !== undefined) {
      mv = state.current.orpMv;
    } else if (state.orpMv !== undefined) {
      mv = state.orpMv;
    }

    if (mv !== null && !isNaN(mv)) {
      this._lastMv = Number(mv);
      this.render();
    }
  },

  /**
   * Render widget HTML
   */
  render() {
    if (!this._container) return;

    const mv = this._lastMv;
    let badgeClass = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
    let statusLabel = 'HEALTHY PURITY';
    let meterWidthPct = Math.min(100, Math.max(10, Math.round(((mv - 150) / 350) * 100)));
    let meterColor = 'from-emerald-500 to-cyan-400';

    if (mv < 250) {
      badgeClass = 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse';
      statusLabel = 'LOW - ORGANIC ACCUMULATION';
      meterColor = 'from-rose-600 to-amber-500';
    } else if (mv < 300) {
      badgeClass = 'bg-amber-500/15 border-amber-500/40 text-amber-300';
      statusLabel = 'MODERATE OXIDATION';
      meterColor = 'from-amber-500 to-emerald-400';
    } else if (mv > 420) {
      badgeClass = 'bg-amber-500/20 border-amber-500/50 text-amber-300';
      statusLabel = 'HIGH - OVER-OXYGENATED';
      meterColor = 'from-cyan-400 to-purple-500';
    }

    const html = `
      <div id="orp-display" class="orp-sensor-card glass-card p-4 rounded-xl border border-cyan-500/30 bg-slate-900/80 shadow-lg">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚡</span>
            <div>
              <h4 class="text-sm font-semibold text-slate-100">Redox / ORP Potential</h4>
              <p class="text-xs text-slate-400">Probe ORP-PROBE-01 • Active</p>
            </div>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}">
            ${statusLabel}
          </span>
        </div>

        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-3xl font-extrabold text-cyan-300 tracking-tight">${mv}</span>
          <span class="text-sm text-slate-400 font-medium">mV</span>
          <span class="text-xs text-slate-400 ml-auto">Target: 300 - 380 mV</span>
        </div>

        <!-- Meter Bar -->
        <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-2">
          <div class="bg-gradient-to-r ${meterColor} h-2.5 rounded-full transition-all duration-500" style="width: ${meterWidthPct}%"></div>
        </div>

        <div class="flex justify-between text-[11px] text-slate-400">
          <span>150 mV (Low)</span>
          <span>340 mV (Ideal)</span>
          <span>500 mV (Max)</span>
        </div>
      </div>
    `;

    this._container.innerHTML = html;
  }
};

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.SampleSensorPlugin = SampleSensorPlugin;
}
if (typeof window !== 'undefined') {
  window.SampleSensorPlugin = SampleSensorPlugin;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SampleSensorPlugin;
  module.exports.SampleSensorPlugin = SampleSensorPlugin;
  module.exports.default = SampleSensorPlugin;
}

export default SampleSensorPlugin;

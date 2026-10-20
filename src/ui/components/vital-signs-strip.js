/**
 * AquaPulse Above-the-Fold Vital Signs Strip Component
 * Displays 7 fundamental water parameters (NH3, NO2, NO3, pH, Temp, GH, KH)
 * with 3-tier color-coded triage badges (Safe/Optimal green, Warning/Watch amber, Critical/Action red).
 * Visible without scrolling on mobile (<640px), tablet (768px), and desktop (1024px+).
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

function resolveDiagnosticsEngine(custom) {
  if (custom) return custom;
  if (typeof globalThis !== 'undefined') {
    if (globalThis.DiagnosticsEngine) return globalThis.DiagnosticsEngine;
    if (globalThis.window && globalThis.window.DiagnosticsEngine) return globalThis.window.DiagnosticsEngine;
  }
  return null;
}

export class VitalSignsStrip {
  /**
   * @param {Object} [options]
   * @param {AquaPulseStore} [options.store]
   * @param {EventBus} [options.eventBus]
   * @param {ModalManager} [options.modalManager]
   * @param {Function} [options.onNavigate] - Callback for tab navigation e.g. onNavigate('care')
   * @param {DiagnosticsEngine} [options.diagnosticsEngine]
   */
  constructor(options = {}) {
    this.diagnosticsEngine = resolveDiagnosticsEngine(options.diagnosticsEngine);
    this.store = options.store || null;
    this.eventBus = options.eventBus || null;
    this.modalManager = options.modalManager || null;
    this.onNavigate = options.onNavigate || null;

    this.container = null;
    this._unsubStore = null;
    this._unsubEvent = null;

    this.currentValues = {
      nh3: 0.0,
      no2: 0.0,
      no3: 15.0,
      ph: 7.1,
      temp: 25.5,
      gh: 7.0,
      kh: 4.0
    };

    this.targets = null;
    this.triage = null;
  }

  /**
   * Mount into DOM container
   * @param {HTMLElement|Object} container
   */
  mount(container) {
    this.container = container;

    // Load initial values from store if available
    if (this.store) {
      const storedTelemetry = this.store.getState('telemetry.current');
      if (storedTelemetry) {
        this.currentValues = { ...this.currentValues, ...storedTelemetry };
      }
      this.targets = this.store.getState('targets');

      this._unsubStore = this.store.subscribe('telemetry.current', (val) => {
        if (val) {
          this.update(val);
        }
      });
    }

    if (this.eventBus) {
      this._unsubEvent = this.eventBus.on('telemetry:packet', (packet) => {
        if (packet && packet.metrics) {
          this.update(packet.metrics);
        }
      });
    }

    this.render();
  }

  /**
   * Unmount component and remove listeners
   */
  unmount() {
    if (this._unsubStore) {
      this._unsubStore();
      this._unsubStore = null;
    }
    if (this._unsubEvent) {
      this._unsubEvent();
      this._unsubEvent = null;
    }
    if (this.container && typeof this.container.innerHTML === 'string') {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  /**
   * Update metric values and re-render
   * @param {Object} newMetrics
   */
  update(newMetrics = {}) {
    this.currentValues = { ...this.currentValues, ...newMetrics };
    if (this.store) {
      this.targets = this.store.getState('targets');
    }
    this.render();
  }

  /**
   * Evaluate triage status using DiagnosticsEngine
   * @returns {Object}
   */
  evaluateTriage() {
    const engine = this.diagnosticsEngine || resolveDiagnosticsEngine();
    if (engine && typeof engine.evaluateMetrics === 'function') {
      this.triage = engine.evaluateMetrics(this.currentValues, this.targets || {});
    } else {
      // Safe fallback
      const nh3Status = this.currentValues.nh3 > 0.05 ? 'critical' : (this.currentValues.nh3 > 0 ? 'warning' : 'safe');
      const no2Status = this.currentValues.no2 > 0.05 ? 'critical' : (this.currentValues.no2 > 0 ? 'warning' : 'safe');
      const no3Status = this.currentValues.no3 >= 50 ? 'critical' : (this.currentValues.no3 > 30 ? 'warning' : 'safe');
      let overallStatus = 'OPTIMAL';
      if (nh3Status === 'critical' || no2Status === 'critical' || no3Status === 'critical') {
        overallStatus = 'ACTION NEEDED';
      } else if (nh3Status === 'warning' || no2Status === 'warning' || no3Status === 'warning') {
        overallStatus = 'WATCH';
      }
      this.triage = {
        overallStatus,
        metrics: {
          nh3: { value: this.currentValues.nh3, status: nh3Status },
          no2: { value: this.currentValues.no2, status: no2Status },
          no3: { value: this.currentValues.no3, status: no3Status },
          ph: { value: this.currentValues.ph, status: 'safe' },
          temp: { value: this.currentValues.temp, status: 'safe' },
          gh: { value: this.currentValues.gh, status: 'safe' },
          kh: { value: this.currentValues.kh, status: 'safe' }
        },
        prescriptions: []
      };
    }
    return this.triage;
  }

  /**
   * Render the 7-metric strip
   */
  render() {
    if (!this.container) return;

    const triage = this.evaluateTriage();
    const metricsData = triage.metrics || {};

    const definitions = [
      { key: 'nh3', label: 'Ammonia', formula: 'NH₃', unit: 'ppm', defaultSafe: '< 0.02' },
      { key: 'no2', label: 'Nitrite', formula: 'NO₂⁻', unit: 'ppm', defaultSafe: '< 0.05' },
      { key: 'no3', label: 'Nitrate', formula: 'NO₃⁻', unit: 'ppm', defaultSafe: '< 25' },
      { key: 'ph', label: 'pH Acidity', formula: 'pH', unit: '', defaultSafe: '6.6 - 7.4' },
      { key: 'temp', label: 'Temperature', formula: 'Temp', unit: '°C', defaultSafe: '24.5 - 26.5' },
      { key: 'gh', label: 'General Hard', formula: 'GH', unit: 'dGH', defaultSafe: '4 - 12' },
      { key: 'kh', label: 'Buffer Hard', formula: 'KH', unit: 'dKH', defaultSafe: '3 - 8' }
    ];

    const cardsHtml = definitions.map(def => {
      const m = metricsData[def.key] || { value: this.currentValues[def.key], status: 'safe' };
      const val = typeof m.value === 'number' ? (def.key === 'ph' ? m.value.toFixed(2) : (def.key === 'temp' || def.key === 'nh3' || def.key === 'no2' ? m.value.toFixed(def.key === 'temp' ? 1 : 2) : m.value)) : m.value;
      const status = m.status || 'safe';

      let statusBadge = '';
      let borderGlow = 'border-slate-800 hover:border-cyan-500/50';
      let valueColor = 'text-cyan-200';
      let remediateBtn = '';

      if (status === 'critical') {
        statusBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse">🔴 ACTION</span>`;
        borderGlow = 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/30';
        valueColor = 'text-rose-300';
        remediateBtn = `<button type="button" data-remediate="${def.key}" class="vital-remediate-btn mt-1 text-[11px] font-semibold text-rose-400 hover:text-rose-200 underline decoration-rose-500 underline-offset-2 flex items-center justify-center gap-0.5">⚠️ Remediate</button>`;
      } else if (status === 'warning') {
        statusBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">🟡 WATCH</span>`;
        borderGlow = 'border-amber-500/50 bg-amber-950/10 shadow-md shadow-amber-950/30';
        valueColor = 'text-amber-300';
        remediateBtn = `<button type="button" data-remediate="${def.key}" class="vital-remediate-btn mt-1 text-[11px] font-medium text-amber-400 hover:text-amber-200 underline decoration-amber-500 underline-offset-2 flex items-center justify-center gap-0.5">👁️ Inspect</button>`;
      } else {
        statusBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">🟢 OPTIMAL</span>`;
        borderGlow = 'border-slate-800/80 bg-slate-900/60';
        valueColor = 'text-slate-100';
      }

      return `
        <div class="vital-metric-card flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border ${borderGlow} transition-all duration-200 group" data-metric="${def.key}">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">${def.formula}</span>
            ${statusBadge}
          </div>
          <div class="flex items-baseline gap-1 my-0.5">
            <span class="text-xl sm:text-2xl font-bold tracking-tight ${valueColor}">${val}</span>
            <span class="text-[11px] text-slate-400">${def.unit}</span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-400">
            <span class="truncate">${def.label}</span>
          </div>
          ${remediateBtn}
        </div>
      `;
    }).join('');

    const html = `
      <section class="vital-signs-strip w-full bg-slate-900/90 border-b border-cyan-950/60 p-2 sm:p-3 backdrop-blur-md">
        <div class="max-w-7xl mx-auto">
          <div class="flex items-center justify-between mb-1.5 px-1">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2 h-2 rounded-full ${triage.overallStatus === 'ACTION NEEDED' ? 'bg-rose-500 animate-ping' : (triage.overallStatus === 'WATCH' ? 'bg-amber-400' : 'bg-emerald-400')}"></span>
              <h2 class="text-xs font-semibold uppercase tracking-widest text-slate-300">Live Vital Signs & Water Triage</h2>
            </div>
            <div class="text-[11px] text-slate-400">
              Overall: <span class="font-bold ${triage.overallStatus === 'ACTION NEEDED' ? 'text-rose-400' : (triage.overallStatus === 'WATCH' ? 'text-amber-400' : 'text-emerald-400')}">${triage.overallStatus}</span>
            </div>
          </div>
          <!-- Responsive Grid: 2 cols on mobile, 4 on tablet, 7 on desktop -->
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            ${cardsHtml}
          </div>
        </div>
      </section>
    `;

    this.container.innerHTML = html;

    // Attach click-to-remediate event listeners
    const buttons = this.container.querySelectorAll('.vital-remediate-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const metricKey = btn.getAttribute('data-remediate');
        this._handleRemediateClick(metricKey);
      });
    });
  }

  /**
   * Handle user clicking a triage alert / remediate button
   * @private
   */
  _handleRemediateClick(metricKey) {
    const metricData = (this.triage && this.triage.metrics && this.triage.metrics[metricKey]) || {};
    const val = metricData.value !== undefined ? metricData.value : this.currentValues[metricKey];

    // If modal manager is present, show automated clinical remediation prescription
    if (this.modalManager) {
      let title = `Clinical Alert: Elevated ${metricKey.toUpperCase()}`;
      let bodyHtml = `
        <div class="space-y-4">
          <div class="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm">
            <strong>Current Reading:</strong> ${val} (${metricData.message || 'Exceeds biological safety limits'})
          </div>
          <div class="text-sm text-slate-300">
            <h5 class="font-semibold text-cyan-300 mb-2">Automated Remediation Protocol:</h5>
            <ul class="list-disc list-inside space-y-1 text-slate-300">
      `;

      if (metricKey === 'nh3') {
        const netL = (this.store && this.store.getState('tank.volumeNetL')) || 220;
        const wcVol = Math.round(netL * 0.5);
        const condDose = (wcVol * 0.1).toFixed(1);
        bodyHtml += `
          <li><strong>Emergency 50% Water Change:</strong> Siphon ~${wcVol}L of water immediately.</li>
          <li><strong>Conditioner Dosage:</strong> Dose ${condDose} ml dechlorinator to detoxify free ammonia.</li>
          <li><strong>Fasting:</strong> Suspend feeding for 24-48 hours to halt ammonia excretion.</li>
          <li><strong>Aeration:</strong> Maximize surface turbulence to support nitrifying bacteria.</li>
        `;
      } else if (metricKey === 'no2') {
        bodyHtml += `
          <li><strong>Immediate 35-50% Water Change:</strong> Dilute toxic nitrite ions.</li>
          <li><strong>Bio-Filter Preservation:</strong> DO NOT rinse filter sponge media during a nitrite spike.</li>
          <li><strong>Salt Shield (Optional):</strong> 1g/L aquarium salt if scaleless fish are isolated.</li>
        `;
      } else if (metricKey === 'no3') {
        bodyHtml += `
          <li><strong>Gravel Vac / Water Change:</strong> Perform 30% water change to reduce nitrate.</li>
          <li><strong>Plant Nutrition:</strong> Verify riparium / fast-growing plants are consuming nitrate.</li>
        `;
      } else {
        bodyHtml += `
          <li>Inspect heater thermostat and aeration equipment.</li>
          <li>Compare reading against tank biological sweet-spot in the Optimizer view.</li>
        `;
      }

      bodyHtml += `
            </ul>
          </div>
          <div class="flex justify-between items-center pt-2">
            <button type="button" id="modal-go-care-btn" class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors">
              Go to Care Hub Water Change
            </button>
          </div>
        </div>
      `;

      this.modalManager.custom(title, bodyHtml).then(() => {});

      setTimeout(() => {
        const goBtn = document.getElementById('modal-go-care-btn');
        if (goBtn) {
          goBtn.addEventListener('click', () => {
            this.modalManager.close();
            if (typeof this.onNavigate === 'function') {
              this.onNavigate('care');
            }
          });
        }
      }, 50);
    } else if (typeof this.onNavigate === 'function') {
      this.onNavigate('care');
    }
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.VitalSignsStrip = VitalSignsStrip;
}
if (typeof window !== 'undefined') {
  window.VitalSignsStrip = VitalSignsStrip;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VitalSignsStrip };
  module.exports.default = VitalSignsStrip;
}

export default VitalSignsStrip;

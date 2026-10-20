/**
 * AquaPulse Water Parameter Logger Component
 * Interactive water parameter logging form, history table, dynamic SVG trend curves
 * (sparklines and 7-day/30-day views with target boundary corridors),
 * and automated clinical prescriptions banner.
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

let DiagnosticsEngine;
let ConfigManager;
if (typeof require !== 'undefined') {
  try {
    DiagnosticsEngine = require('../../engines/diagnostics-engine.js');
    if (DiagnosticsEngine.DiagnosticsEngine) DiagnosticsEngine = DiagnosticsEngine.DiagnosticsEngine;
    ConfigManager = require('../../core/config-manager.js');
    if (ConfigManager.ConfigManager) ConfigManager = ConfigManager.ConfigManager;
  } catch (_) {}
}
if (!DiagnosticsEngine && typeof globalThis !== 'undefined' && globalThis.DiagnosticsEngine) {
  DiagnosticsEngine = globalThis.DiagnosticsEngine;
}
if (!ConfigManager && typeof globalThis !== 'undefined' && globalThis.ConfigManager) {
  ConfigManager = globalThis.ConfigManager;
}

export class ParamLogger {
  /**
   * @param {Object} [options]
   * @param {AquaPulseStore} [options.store]
   * @param {EventBus} [options.eventBus]
   * @param {ModalManager} [options.modalManager]
   */
  constructor(options = {}) {
    this.store = options.store || null;
    this.eventBus = options.eventBus || null;
    this.modalManager = options.modalManager || null;

    this.container = null;
    this.logs = [];
    this.chartPeriod = '7d'; // '7d' | '30d'
    this.chartParam = 'no3'; // 'no3' | 'ph' | 'temp' | 'nh3'

    this._unsubStore = null;
  }

  /**
   * Mount into DOM container
   * @param {HTMLElement|Object} container
   */
  mount(container) {
    this.container = container;
    this._loadLogsFromStore();

    if (this.store) {
      this._unsubStore = this.store.subscribe('telemetry.history', (hist) => {
        if (Array.isArray(hist)) {
          this.logs = [...hist];
          this.render();
        }
      });
    }

    this.render();
  }

  /**
   * Unmount component
   */
  unmount() {
    if (this._unsubStore) {
      this._unsubStore();
      this._unsubStore = null;
    }
    if (this.container && typeof this.container.innerHTML === 'string') {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  /**
   * Load historical logs from store or tank-scoped key
   * @private
   */
  _loadLogsFromStore() {
    if (this.store) {
      const history = this.store.getState('telemetry.history');
      if (Array.isArray(history) && history.length > 0) {
        this.logs = [...history];
        return;
      }
    }

    // Default sample logs if history is empty
    this.logs = [
      { date: '2026-10-14', nh3: 0.0, no2: 0.0, no3: 12.0, ph: 7.1, temp: 25.6, gh: 7, kh: 4, wc: '35% Regular', notes: 'Routine weekly maintenance' },
      { date: '2026-10-16', nh3: 0.0, no2: 0.0, no3: 14.5, ph: 7.1, temp: 25.7, gh: 7, kh: 4, wc: 'None', notes: 'Mid-week spot test' },
      { date: '2026-10-18', nh3: 0.0, no2: 0.0, no3: 17.0, ph: 7.0, temp: 25.8, gh: 7, kh: 4, wc: 'None', notes: 'Stable water chemistry' },
      { date: '2026-10-20', nh3: 0.0, no2: 0.0, no3: 15.0, ph: 7.1, temp: 25.6, gh: 7, kh: 4, wc: '25% Scheduled', notes: 'Current test' }
    ];

    if (this.store) {
      this.store.setState('telemetry.history', this.logs);
    }
  }

  /**
   * Add a new log entry
   * @param {Object} entry
   */
  addLog(entry) {
    const record = {
      date: entry.date || new Date().toISOString().split('T')[0],
      nh3: Number(entry.nh3) || 0.0,
      no2: Number(entry.no2) || 0.0,
      no3: Number(entry.no3) || 0.0,
      ph: Number(entry.ph) || 7.0,
      temp: Number(entry.temp) || 25.0,
      gh: Number(entry.gh) || 7.0,
      kh: Number(entry.kh) || 4.0,
      wc: entry.wc || 'None',
      notes: entry.notes || ''
    };

    // Prepend to maintain chronological latest-first or append
    this.logs.unshift(record);

    if (this.store) {
      this.store.setState('telemetry.history', this.logs);
      this.store.setState('telemetry.current', record);
    }
    if (this.eventBus) {
      this.eventBus.emit('telemetry:reading_logged', record);
    }

    this.render();
  }

  /**
   * Delete a log entry by index
   * @param {number} index
   */
  deleteLog(index) {
    if (index >= 0 && index < this.logs.length) {
      this.logs.splice(index, 1);
      if (this.store) {
        this.store.setState('telemetry.history', this.logs);
      }
      this.render();
    }
  }

  /**
   * Export parameter logs as CSV
   */
  exportCSV() {
    let csv = '';
    if (ConfigManager && typeof ConfigManager.exportCSV === 'function') {
      csv = ConfigManager.exportCSV(this.logs);
    } else {
      const headers = ['Date', 'NH3 (ppm)', 'NO2 (ppm)', 'NO3 (ppm)', 'pH', 'Temp (°C)', 'GH (dGH)', 'KH (dKH)', 'Water Change', 'Notes'];
      csv = headers.join(',') + '\n' + this.logs.map(l =>
        [l.date, l.nh3, l.no2, l.no3, l.ph, l.temp, l.gh, l.kh, `"${l.wc || ''}"`, `"${l.notes || ''}"`].join(',')
      ).join('\n');
    }

    if (typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `aquapulse_water_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return csv;
  }

  /**
   * Generate SVG sparkline curve
   * @param {string} paramKey
   * @param {number} [width=200]
   * @param {number} [height=50]
   * @returns {string} SVG markup
   */
  generateSparkline(paramKey, width = 200, height = 50) {
    if (!this.logs || this.logs.length === 0) {
      return `<svg width="${width}" height="${height}" class="text-slate-600"><line x1="0" y1="${height/2}" x2="${width}" y2="${height/2}" stroke="currentColor" stroke-dasharray="2,2"/></svg>`;
    }

    // Historical records in ascending chronological order for timeline
    const points = [...this.logs].reverse().map(l => Number(l[paramKey]) || 0);
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = (max - min) || 1;

    const pad = 6;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;

    const coords = points.map((val, idx) => {
      const x = pad + (idx / Math.max(1, points.length - 1)) * innerW;
      const y = height - pad - ((val - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathData = coords.length === 1
      ? `M ${pad},${(height/2).toFixed(1)} L ${width - pad},${(height/2).toFixed(1)}`
      : `M ${coords.join(' L ')}`;

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="overflow-visible">
        <path d="${pathData}" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${coords.map(c => `<circle cx="${c.split(',')[0]}" cy="${c.split(',')[1]}" r="3" fill="#22d3ee" stroke="#0f172a" stroke-width="1.5"/>`).join('')}
      </svg>
    `;
  }

  /**
   * Generate full interactive SVG trend chart with target corridors
   * @param {string} paramKey
   * @param {number} [width=600]
   * @param {number} [height=180]
   * @returns {string} SVG markup
   */
  generateTrendChart(paramKey = 'no3', width = 600, height = 180) {
    const logsAsc = [...this.logs].reverse();
    if (logsAsc.length === 0) {
      return `<div class="p-6 text-center text-slate-400 text-sm">No historical log data available</div>`;
    }

    const values = logsAsc.map(l => Number(l[paramKey]) || 0);
    const dates = logsAsc.map(l => l.date ? l.date.substring(5) : '');

    // Target boundaries
    let targetMin = 0;
    let targetMax = 25;
    let warningThreshold = 35;
    let unit = 'ppm';

    if (paramKey === 'temp') {
      targetMin = 24.5;
      targetMax = 26.5;
      warningThreshold = 28.0;
      unit = '°C';
    } else if (paramKey === 'ph') {
      targetMin = 6.6;
      targetMax = 7.4;
      warningThreshold = 7.8;
      unit = '';
    } else if (paramKey === 'nh3' || paramKey === 'no2') {
      targetMin = 0.0;
      targetMax = 0.02;
      warningThreshold = 0.10;
      unit = 'ppm';
    }

    const minBound = Math.min(targetMin * 0.9, ...values);
    const maxBound = Math.max(warningThreshold * 1.1, ...values);
    const range = (maxBound - minBound) || 1;

    const padLeft = 45;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const getY = (val) => padTop + plotH - ((val - minBound) / range) * plotH;
    const getX = (idx) => padLeft + (idx / Math.max(1, values.length - 1)) * plotW;

    const safeYMin = Math.max(padTop, getY(targetMax));
    const safeYMax = Math.min(padTop + plotH, getY(targetMin));
    const safeHeight = Math.max(2, safeYMax - safeYMin);

    const pathCoords = values.map((val, i) => `${getX(i).toFixed(1)},${getY(val).toFixed(1)}`);
    const pathD = `M ${pathCoords.join(' L ')}`;

    return `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" class="overflow-visible font-sans select-none">
        <!-- Target Safe Corridor Band -->
        <rect x="${padLeft}" y="${safeYMin}" width="${plotW}" height="${safeHeight}" fill="rgba(16, 185, 129, 0.08)" rx="4" />
        <line x1="${padLeft}" y1="${safeYMin}" x2="${padLeft + plotW}" y2="${safeYMin}" stroke="#10b981" stroke-width="1" stroke-dasharray="4,4" stroke-opacity="0.4" />
        <line x1="${padLeft}" y1="${safeYMax}" x2="${padLeft + plotW}" y2="${safeYMax}" stroke="#10b981" stroke-width="1" stroke-dasharray="4,4" stroke-opacity="0.4" />

        <!-- Grid Lines & Y Axis Labels -->
        <line x1="${padLeft}" y1="${padTop + plotH}" x2="${padLeft + plotW}" y2="${padTop + plotH}" stroke="#334155" stroke-width="1"/>
        <text x="${padLeft - 8}" y="${padTop + 4}" fill="#94a3b8" font-size="10" text-anchor="end">${maxBound.toFixed(1)} ${unit}</text>
        <text x="${padLeft - 8}" y="${safeYMin + 3}" fill="#34d399" font-size="9" text-anchor="end">Safe Max</text>
        <text x="${padLeft - 8}" y="${padTop + plotH}" fill="#94a3b8" font-size="10" text-anchor="end">${minBound.toFixed(1)}</text>

        <!-- Trend Line -->
        <path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Data Nodes & X Axis Labels -->
        ${values.map((v, i) => {
          const cx = getX(i).toFixed(1);
          const cy = getY(v).toFixed(1);
          const isWarning = v > targetMax || v < targetMin;
          const nodeColor = isWarning ? '#fbbf24' : '#38bdf8';
          return `
            <g class="chart-node">
              <circle cx="${cx}" cy="${cy}" r="4" fill="${nodeColor}" stroke="#0f172a" stroke-width="2"/>
              <text x="${cx}" y="${cy - 8}" fill="${nodeColor}" font-size="10" font-weight="bold" text-anchor="middle">${v}</text>
              <text x="${cx}" y="${padTop + plotH + 18}" fill="#64748b" font-size="9" text-anchor="middle">${dates[i]}</text>
            </g>
          `;
        }).join('')}
      </svg>
    `;
  }

  /**
   * Render diagnostic prescription banner
   * @private
   */
  _renderPrescriptionBanner() {
    if (!this.logs || this.logs.length === 0) return '';

    const latest = this.logs[0];
    const prev = this.logs.length > 1 ? this.logs[1] : null;

    let alertItems = [];
    let prescriptionItems = [];
    let isEmergency = false;

    // Check emergency toxic ammonia / nitrite
    if (Number(latest.nh3) > 0.0 || Number(latest.no2) > 0.0) {
      isEmergency = true;
      const netL = (this.store && this.store.getState('tank.volumeNetL')) || 220;
      const wcVol = Math.round(netL * 0.50);
      const condMl = (wcVol * 0.10).toFixed(1);
      alertItems.push(`Acute toxic compound detected (NH3: ${latest.nh3} ppm, NO2: ${latest.no2} ppm)`);
      prescriptionItems.push(`Emergency 50% Water Change: Siphon and replace ~${wcVol}L of treated water.`);
      prescriptionItems.push(`Conditioner Detoxification: Dose ${condMl} ml dechlorinating conditioner.`);
      prescriptionItems.push(`Biological Strain Protocol: Suspend feeding for 24 hours.`);
    }

    // Check trend analysis if consecutive logs exist
    if (DiagnosticsEngine && typeof DiagnosticsEngine.analyzeParameterTrends === 'function' && prev) {
      const trend = DiagnosticsEngine.analyzeParameterTrends(latest, prev);
      if (trend.alerts && trend.alerts.length > 0) {
        for (const al of trend.alerts) {
          if (!alertItems.includes(al)) alertItems.push(al);
        }
      }
    }

    if (alertItems.length === 0 && !isEmergency) {
      return `
        <div class="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
          <span class="text-lg">🌿</span>
          <div>
            <span class="font-bold">Water Chemistry Balanced:</span>
            <span>All monitored parameters and metabolic trends are currently inside safe biological corridors.</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="p-4 rounded-xl ${isEmergency ? 'bg-rose-950/30 border-rose-500/50 text-rose-200' : 'bg-amber-950/30 border-amber-500/40 text-amber-200'} border shadow-lg space-y-2">
        <div class="flex items-center gap-2">
          <span class="text-xl">${isEmergency ? '🚨' : '⚠️'}</span>
          <h4 class="font-bold text-sm tracking-wide">${isEmergency ? 'CLINICAL REMEDIATION ACTION REQUIRED' : 'TREND DIAGNOSTIC ADVISORY'}</h4>
        </div>
        <ul class="list-disc list-inside text-xs space-y-1">
          ${alertItems.map(a => `<li>${a}</li>`).join('')}
        </ul>
        ${prescriptionItems.length > 0 ? `
          <div class="pt-2 border-t border-slate-700/60 text-xs">
            <span class="font-semibold text-cyan-300 block mb-1">Prescribed Clinical Steps:</span>
            <ul class="list-disc list-inside space-y-1 text-slate-200">
              ${prescriptionItems.map(p => `<li>${p}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Main render function
   */
  render() {
    if (!this.container) return;

    const rowsHtml = this.logs.map((log, idx) => `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 text-xs text-slate-300 transition-colors">
        <td class="py-2.5 px-3 font-mono text-cyan-300">${log.date}</td>
        <td class="py-2.5 px-3 font-semibold ${Number(log.nh3) > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}">${log.nh3}</td>
        <td class="py-2.5 px-3 font-semibold ${Number(log.no2) > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}">${log.no2}</td>
        <td class="py-2.5 px-3 ${Number(log.no3) > 30 ? 'text-amber-300 font-bold' : 'text-slate-300'}">${log.no3}</td>
        <td class="py-2.5 px-3">${log.ph}</td>
        <td class="py-2.5 px-3">${log.temp}°C</td>
        <td class="py-2.5 px-3">${log.gh} / ${log.kh}</td>
        <td class="py-2.5 px-3">${log.wc || '-'}</td>
        <td class="py-2.5 px-3 text-slate-400 max-w-[150px] truncate" title="${log.notes || ''}">${log.notes || '-'}</td>
        <td class="py-2.5 px-3 text-right">
          <button type="button" data-delete-idx="${idx}" class="delete-log-btn text-slate-500 hover:text-rose-400 p-1 rounded transition-colors" title="Delete entry">
            ✕
          </button>
        </td>
      </tr>
    `).join('');

    const html = `
      <div class="param-logger-module space-y-6">
        <!-- Diagnostic Prescription Banner -->
        ${this._renderPrescriptionBanner()}

        <!-- SVG Trend Analytics Section -->
        <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>📈</span> Water Chemistry Trend Trajectories
              </h3>
              <p class="text-xs text-slate-400">Biological tolerance corridors & rate-of-change curve analysis</p>
            </div>
            <!-- Parameter Selector & Time Range -->
            <div class="flex items-center gap-2">
              <select id="trend-param-select" class="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-cyan-300 font-semibold focus:outline-none">
                <option value="no3" ${this.chartParam === 'no3' ? 'selected' : ''}>Nitrate (NO3)</option>
                <option value="ph" ${this.chartParam === 'ph' ? 'selected' : ''}>pH Acidity</option>
                <option value="temp" ${this.chartParam === 'temp' ? 'selected' : ''}>Temperature</option>
                <option value="nh3" ${this.chartParam === 'nh3' ? 'selected' : ''}>Ammonia (NH3)</option>
              </select>
              <button type="button" id="export-csv-btn" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                <span>⬇️</span> Export CSV
              </button>
            </div>
          </div>

          <!-- Dynamic SVG Chart Canvas -->
          <div class="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
            ${this.generateTrendChart(this.chartParam, 650, 180)}
          </div>
        </div>

        <!-- Logging Form & History Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Manual Entry Form -->
          <div class="lg:col-span-1 glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <h4 class="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
              <span>🧪</span> Log Test Kit Reading
            </h4>
            <form id="param-log-form" class="space-y-3 text-xs">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-slate-400 mb-1">Test Date</label>
                  <input type="date" id="log-date" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div>
                  <label class="block text-slate-400 mb-1">Water Change</label>
                  <input type="text" id="log-wc" placeholder="e.g. 30% Regular" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200">
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-slate-400 mb-1">NH₃ (ppm)</label>
                  <input type="number" step="0.01" id="log-nh3" placeholder="0.00" class="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
                </div>
                <div>
                  <label class="block text-slate-400 mb-1">NO₂⁻ (ppm)</label>
                  <input type="number" step="0.01" id="log-no2" placeholder="0.00" class="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
                </div>
                <div>
                  <label class="block text-slate-400 mb-1">NO₃⁻ (ppm)</label>
                  <input type="number" step="0.5" id="log-no3" placeholder="15.0" class="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-slate-400 mb-1">pH</label>
                  <input type="number" step="0.05" id="log-ph" placeholder="7.10" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
                </div>
                <div>
                  <label class="block text-slate-400 mb-1">Temp (°C)</label>
                  <input type="number" step="0.1" id="log-temp" placeholder="25.5" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-slate-400 mb-1">GH (dGH)</label>
                  <input type="number" step="0.5" id="log-gh" placeholder="7.0" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200">
                </div>
                <div>
                  <label class="block text-slate-400 mb-1">KH (dKH)</label>
                  <input type="number" step="0.5" id="log-kh" placeholder="4.0" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200">
                </div>
              </div>

              <div>
                <label class="block text-slate-400 mb-1">Notes / Observations</label>
                <textarea id="log-notes" rows="2" placeholder="Visual clarity, fish appetite, or maintenance remarks..." class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200 resize-none"></textarea>
              </div>

              <button type="submit" class="w-full py-2 bg-cyan-600 hover:bg-cyan-500 font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <span>💾</span> Record Water Test Log
              </button>
            </form>
          </div>

          <!-- Historical Log Table -->
          <div class="lg:col-span-2 glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>📜</span> Chronological Test Archive (${this.logs.length} records)
                </h4>
              </div>
              <div class="overflow-x-auto max-h-[340px] overflow-y-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/60 sticky top-0">
                      <th class="py-2 px-3">Date</th>
                      <th class="py-2 px-3">NH₃</th>
                      <th class="py-2 px-3">NO₂⁻</th>
                      <th class="py-2 px-3">NO₃⁻</th>
                      <th class="py-2 px-3">pH</th>
                      <th class="py-2 px-3">Temp</th>
                      <th class="py-2 px-3">GH/KH</th>
                      <th class="py-2 px-3">WC</th>
                      <th class="py-2 px-3">Notes</th>
                      <th class="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this._attachEventListeners();
  }

  /**
   * Attach form submit, selector, and delete buttons listeners
   * @private
   */
  _attachEventListeners() {
    if (!this.container) return;

    // Form submission
    const form = this.container.querySelector('#param-log-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = this.container.querySelector('#log-date')?.value;
        const wc = this.container.querySelector('#log-wc')?.value;
        const nh3 = this.container.querySelector('#log-nh3')?.value;
        const no2 = this.container.querySelector('#log-no2')?.value;
        const no3 = this.container.querySelector('#log-no3')?.value;
        const ph = this.container.querySelector('#log-ph')?.value;
        const temp = this.container.querySelector('#log-temp')?.value;
        const gh = this.container.querySelector('#log-gh')?.value;
        const kh = this.container.querySelector('#log-kh')?.value;
        const notes = this.container.querySelector('#log-notes')?.value;

        this.addLog({ date, wc, nh3, no2, no3, ph, temp, gh, kh, notes });
      });
    }

    // Param selector
    const paramSelect = this.container.querySelector('#trend-param-select');
    if (paramSelect) {
      paramSelect.addEventListener('change', (e) => {
        this.chartParam = e.target.value;
        this.render();
      });
    }

    // Export CSV
    const exportBtn = this.container.querySelector('#export-csv-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportCSV();
      });
    }

    // Delete buttons
    const delBtns = this.container.querySelectorAll('.delete-log-btn');
    delBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-delete-idx'));
        if (!isNaN(idx)) {
          this.deleteLog(idx);
        }
      });
    });
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.ParamLogger = ParamLogger;
}
if (typeof window !== 'undefined') {
  window.ParamLogger = ParamLogger;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ParamLogger };
  module.exports.default = ParamLogger;
}

export default ParamLogger;

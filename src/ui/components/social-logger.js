/**
 * AquaPulse Social Aggression Incident Logger Component
 * Multi-tank scoped persistence, offender/victim selection, severity rating,
 * territorial tension score meter, and accessible in-DOM modal (replacing blocking window.prompt).
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

let CareEngine;
if (typeof require !== 'undefined') {
  try {
    CareEngine = require('../../engines/care-engine.js');
    if (CareEngine.CareEngine) CareEngine = CareEngine.CareEngine;
  } catch (_) {}
}
if (!CareEngine && typeof globalThis !== 'undefined' && globalThis.CareEngine) {
  CareEngine = globalThis.CareEngine;
}

export class SocialLogger {
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
    this.incidents = [];
    this._unsubStore = null;
  }

  /**
   * Mount component
   * @param {HTMLElement|Object} container
   */
  mount(container) {
    this.container = container;
    this._loadIncidents();

    if (this.store) {
      this._unsubStore = this.store.subscribe('care.socialIncidents', (list) => {
        if (Array.isArray(list)) {
          this.incidents = [...list];
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
   * Load incidents from store or defaults
   * @private
   */
  _loadIncidents() {
    if (this.store) {
      const stored = this.store.getState('care.socialIncidents');
      if (Array.isArray(stored) && stored.length > 0) {
        this.incidents = [...stored];
        return;
      }
    }

    // Default incidents
    this.incidents = [
      {
        id: 'inc-001',
        date: '2026-10-18',
        aggressor: 'Koi Angelfish (Male)',
        victim: 'Silver Tip Tetra',
        trigger: 'Food competition at surface',
        actionTaken: 'Shifted micro-pellets to Zone D',
        severity: 2
      },
      {
        id: 'inc-002',
        date: '2026-10-19',
        aggressor: 'Denison Barb',
        victim: 'Female Betta',
        trigger: 'Territorial drift into center wood',
        actionTaken: 'Observed; added tall background stem plants',
        severity: 1
      }
    ];

    if (this.store) {
      this.store.setState('care.socialIncidents', this.incidents);
    }
  }

  /**
   * Record a new social aggression incident
   * @param {Object} incident
   */
  recordIncident(incident) {
    if (CareEngine && typeof CareEngine.recordIncident === 'function') {
      this.incidents = CareEngine.recordIncident(this.incidents, incident);
    } else {
      const item = {
        id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: incident.date || new Date().toISOString().split('T')[0],
        aggressor: incident.aggressor || 'Unknown',
        victim: incident.victim || 'Community',
        trigger: incident.trigger || 'Territory',
        actionTaken: incident.actionTaken || 'Observed',
        severity: Math.min(5, Math.max(1, Number(incident.severity) || 2))
      };
      this.incidents = [item, ...this.incidents];
    }

    if (this.store) {
      this.store.setState('care.socialIncidents', this.incidents);
    }
    if (this.eventBus) {
      this.eventBus.emit('social:incident_logged', this.incidents[0]);
    }

    this.render();
  }

  /**
   * Delete an incident by ID
   * @param {string} id
   */
  deleteIncident(id) {
    this.incidents = this.incidents.filter(i => i.id !== id);
    if (this.store) {
      this.store.setState('care.socialIncidents', this.incidents);
    }
    this.render();
  }

  /**
   * Open accessible in-DOM modal to log an incident
   */
  openAddIncidentDialog() {
    if (!this.modalManager) return;

    const species = (this.store && this.store.getState('species')) || [
      { name: 'Koi Angelfish' },
      { name: 'Denison Barb' },
      { name: 'Silver Tip Tetra' },
      { name: 'Albino Corydoras' },
      { name: 'Female Betta' }
    ];

    const speciesOptions = species.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    const html = `
      <form id="incident-form" class="space-y-3 text-xs">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-slate-400 mb-1">Aggressor / Offender</label>
            <select id="inc-aggressor" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
              ${speciesOptions}
              <option value="Other / Unidentified">Other / Unidentified</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Victim / Target</label>
            <select id="inc-victim" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
              <option value="General School / Community">General School / Community</option>
              ${speciesOptions}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-slate-400 mb-1">Severity Rating (1 to 3)</label>
            <select id="inc-severity" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200">
              <option value="1">1 - Mild Posturing / Brief Chase</option>
              <option value="2" selected>2 - Persistent Chasing / Nipping Threat</option>
              <option value="3">3 - Severe Aggression / Torn Fins</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Incident Date</label>
            <input type="date" id="inc-date" value="${new Date().toISOString().split('T')[0]}" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
          </div>
        </div>

        <div>
          <label class="block text-slate-400 mb-1">Trigger / Conflict Zone</label>
          <input type="text" id="inc-trigger" placeholder="e.g. Surface food drop, spiderwood cave territory" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
        </div>

        <div>
          <label class="block text-slate-400 mb-1">Remedial Action Taken</label>
          <input type="text" id="inc-action" placeholder="e.g. Fed in two separate zones, added plant visual barrier" class="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200">
        </div>

        <div class="flex justify-end gap-2 pt-3">
          <button type="button" id="modal-cancel-inc" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold">Cancel</button>
          <button type="submit" class="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold">Record Incident</button>
        </div>
      </form>
    `;

    this.modalManager.custom('⚔️ Record Social Aggression Incident', html).then(() => {});

    setTimeout(() => {
      const cancelBtn = document.getElementById('modal-cancel-inc');
      if (cancelBtn) cancelBtn.addEventListener('click', () => this.modalManager.close());

      const form = document.getElementById('incident-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const aggressor = document.getElementById('inc-aggressor')?.value || 'Unknown';
          const victim = document.getElementById('inc-victim')?.value || 'Community';
          const severity = Number(document.getElementById('inc-severity')?.value) || 2;
          const date = document.getElementById('inc-date')?.value || new Date().toISOString().split('T')[0];
          const trigger = document.getElementById('inc-trigger')?.value || 'Territory dispute';
          const actionTaken = document.getElementById('inc-action')?.value || 'Observed';

          this.recordIncident({ aggressor, victim, severity, date, trigger, actionTaken });
          this.modalManager.close();
        });
      }
    }, 50);
  }

  /**
   * Render component
   */
  render() {
    if (!this.container) return;

    let analysis = {
      tensionScore: 0,
      severityRating: 1,
      totalIncidents: this.incidents.length,
      hotspots: {},
      pairingMatrix: {},
      recommendation: 'Peaceful community dynamic.'
    };

    if (CareEngine && typeof CareEngine.calculateAggressionScore === 'function') {
      analysis = CareEngine.calculateAggressionScore(this.incidents);
    } else {
      analysis.tensionScore = Math.min(100, this.incidents.length * 15);
    }

    let tensionColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (analysis.tensionScore >= 60) {
      tensionColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    } else if (analysis.tensionScore >= 30) {
      tensionColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }

    const incidentRowsHtml = this.incidents.map(inc => {
      let badge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">L2: Nipping</span>';
      if (inc.severity === 1) badge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">L1: Chase</span>';
      else if (inc.severity >= 3) badge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">L3: Battle</span>';

      return `
        <tr class="border-b border-slate-800 text-xs hover:bg-slate-800/40 transition-colors">
          <td class="py-2.5 px-3 font-mono text-cyan-300">${inc.date}</td>
          <td class="py-2.5 px-3 font-bold text-slate-100">${inc.aggressor}</td>
          <td class="py-2.5 px-3 text-slate-300">${inc.victim}</td>
          <td class="py-2.5 px-3">${badge}</td>
          <td class="py-2.5 px-3 text-slate-400 max-w-[140px] truncate" title="${inc.trigger}">${inc.trigger}</td>
          <td class="py-2.5 px-3 text-slate-400 max-w-[140px] truncate" title="${inc.actionTaken}">${inc.actionTaken}</td>
          <td class="py-2.5 px-3 text-right">
            <button type="button" data-del-inc="${inc.id}" class="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors" title="Delete incident">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <div class="social-logger-module space-y-6">
        <!-- Header & Tension Score Overview -->
        <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>⚔️</span> Social Aggression & Territorial Dynamics Logger
              </h3>
              <p class="text-xs text-slate-400">Chronological incident tracking, hierarchy analysis & aggression score</p>
            </div>
            <button type="button" id="add-incident-btn" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/40 flex items-center gap-1.5 transition-all">
              <span>+</span> Log New Incident
            </button>
          </div>

          <!-- Tension Score Meter -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400">Territory Tension Score</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${tensionColor}">
                  ${analysis.tensionScore >= 60 ? 'HIGH STRESS' : (analysis.tensionScore >= 30 ? 'ELEVATED' : 'PEACEFUL')}
                </span>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="text-3xl font-extrabold text-cyan-300 font-mono">${analysis.tensionScore}</span>
                <span class="text-xs text-slate-500">/ 100 max</span>
              </div>
              <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all duration-500 ${analysis.tensionScore >= 60 ? 'bg-rose-500' : (analysis.tensionScore >= 30 ? 'bg-amber-400' : 'bg-emerald-400')}" style="width: ${Math.min(100, analysis.tensionScore)}%"></div>
              </div>
            </div>

            <div class="md:col-span-2 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div>
                <span class="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block mb-1">Ecosystem Dynamics Recommendation</span>
                <p class="text-xs text-slate-300 leading-relaxed">${analysis.recommendation}</p>
              </div>
              <div class="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 mt-2">
                <span>Total Recorded: <strong>${this.incidents.length}</strong></span>
                <span>Active Aggressors: <strong>${Object.keys(analysis.hotspots || {}).length}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Incident Ledger Table -->
        <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
          <h4 class="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
            <span>📜</span> Incident Chronological Ledger (${this.incidents.length} records)
          </h4>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/60">
                  <th class="py-2 px-3">Date</th>
                  <th class="py-2 px-3">Aggressor</th>
                  <th class="py-2 px-3">Victim</th>
                  <th class="py-2 px-3">Severity</th>
                  <th class="py-2 px-3">Trigger / Context</th>
                  <th class="py-2 px-3">Action Taken</th>
                  <th class="py-2 px-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody>
                ${incidentRowsHtml || `<tr><td colspan="7" class="py-6 text-center text-xs text-slate-500">No aggression incidents logged yet. Tank dynamics harmonious!</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this._attachEventListeners();
  }

  /**
   * Attach listeners
   * @private
   */
  _attachEventListeners() {
    if (!this.container) return;

    // Add incident button
    const addBtn = this.container.querySelector('#add-incident-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openAddIncidentDialog());
    }

    // Delete buttons
    const delBtns = this.container.querySelectorAll('[data-del-inc]');
    delBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-inc');
        if (id) this.deleteIncident(id);
      });
    });
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.SocialLogger = SocialLogger;
}
if (typeof window !== 'undefined') {
  window.SocialLogger = SocialLogger;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SocialLogger };
  module.exports.default = SocialLogger;
}

export default SocialLogger;

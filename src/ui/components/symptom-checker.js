/**
 * AquaPulse Visual Symptom Checker & Clinical Pharmacy Component
 * Interactive disease profile cards, hospital tank switch, 50% sensitive species
 * safety lock toggle, copper lockout alerts, and volumetric dosage calculator.
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

let MedicationEngine;
if (typeof require !== 'undefined') {
  try {
    MedicationEngine = require('../../engines/medication-engine.js');
    if (MedicationEngine.MedicationEngine) MedicationEngine = MedicationEngine.MedicationEngine;
  } catch (_) {}
}
if (!MedicationEngine && typeof globalThis !== 'undefined' && globalThis.MedicationEngine) {
  MedicationEngine = globalThis.MedicationEngine;
}

export class SymptomChecker {
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
    this.selectedSymptomId = 'symp-ich';
    this.isHospitalMode = false;
    this.volumeNetL = 220;
    this.manualLockOverride = null; // null = auto-detect, boolean = explicit
  }

  /**
   * Mount into DOM container
   * @param {HTMLElement|Object} container
   */
  mount(container) {
    this.container = container;
    if (this.store) {
      this.volumeNetL = this.store.getState('tank.volumeNetL') || 220;
    }
    this.render();
  }

  /**
   * Unmount component
   */
  unmount() {
    if (this.container && typeof this.container.innerHTML === 'string') {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  /**
   * Select a symptom condition
   * @param {string} symptomId
   */
  selectSymptom(symptomId) {
    this.selectedSymptomId = symptomId;
    this.render();
  }

  /**
   * Toggle hospital tank mode
   * @param {boolean} isHospital
   */
  setHospitalMode(isHospital) {
    this.isHospitalMode = isHospital;
    this.render();
  }

  /**
   * Set custom volume for calculation
   * @param {number} vol
   */
  setVolume(vol) {
    this.volumeNetL = Math.max(1, Number(vol) || 10);
    this.render();
  }

  /**
   * Toggle 50% safety lock
   * @param {boolean} locked
   */
  setSafetyLock(locked) {
    this.manualLockOverride = locked;
    this.render();
  }

  /**
   * Compute dosage using MedicationEngine
   * @returns {Object}
   */
  calculateDosage() {
    if (!MedicationEngine) return null;

    const symptoms = MedicationEngine.SYMPTOM_DATABASE || [];
    const symp = symptoms.find(s => s.id === this.selectedSymptomId) || symptoms[0];
    const scenarioId = symp?.medScenarioId || 'ichMain';

    const scenarios = MedicationEngine.SCENARIOS || {};
    const scenario = scenarios[scenarioId] || {};
    const medId = scenario.medKey || 'generalCure';

    const species = (this.store && this.store.getState('species')) || [];

    // Treated volume determination
    let treatedVol = this.volumeNetL;
    if (this.isHospitalMode) {
      treatedVol = scenario.fixedVolume || 15; // standard hospital container
    } else if (scenario.defaultVolumeRatio) {
      treatedVol = Math.round(this.volumeNetL * scenario.defaultVolumeRatio);
    }

    const calc = MedicationEngine.calculateDose(
      scenarioId,
      medId,
      treatedVol,
      species,
      this.manualLockOverride !== null ? this.manualLockOverride : undefined
    );

    return {
      symp,
      scenario,
      calc,
      treatedVol
    };
  }

  /**
   * Render component
   */
  render() {
    if (!this.container) return;

    const symptoms = (MedicationEngine && MedicationEngine.SYMPTOM_DATABASE) || [];
    const diagnosis = this.calculateDosage();

    // Condition card buttons
    const symptomCardsHtml = symptoms.map(s => {
      const isSelected = s.id === this.selectedSymptomId;
      let icon = '🦠';
      if (s.category === 'Bacterial') icon = '🩹';
      else if (s.category === 'Digestive / Organ') icon = '🐡';
      else if (s.category === 'Social') icon = '⚔️';
      else if (s.category.includes('Toxicity')) icon = '🫧';

      return `
        <button type="button" data-symp-id="${s.id}" class="symp-select-btn text-left p-3.5 rounded-xl border transition-all ${isSelected ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/30' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'}">
          <div class="flex items-center gap-2.5 mb-1.5">
            <span class="text-xl">${icon}</span>
            <span class="text-xs font-bold text-slate-100">${s.name}</span>
          </div>
          <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-400 mb-1.5 inline-block">
            ${s.category}
          </span>
          <p class="text-[11px] text-slate-400 line-clamp-2">${s.description}</p>
        </button>
      `;
    }).join('');

    const calc = diagnosis ? diagnosis.calc : null;
    const isLocked = calc ? calc.isLocked : false;
    const warnings = (calc && calc.warnings) || [];

    const html = `
      <div class="symptom-checker-module space-y-6">
        <!-- Header -->
        <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>🩺</span> Visual Symptom Diagnostic & Scaleless Safety Pharmacy
            </h3>
            <p class="text-xs text-slate-400">Clinical ailment triage, sensitive species safety clamps, and volumetric pharmacology</p>
          </div>
          <!-- Hospital Tank Switcher -->
          <div class="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button type="button" id="hospital-main-btn" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${!this.isHospitalMode ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}">
              Display Tank (${this.volumeNetL}L)
            </button>
            <button type="button" id="hospital-iso-btn" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${this.isHospitalMode ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}">
              🏥 Hospital Tank (15L)
            </button>
          </div>
        </div>

        <!-- 5 Visual Condition Cards -->
        <div>
          <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Observable Clinical Presentations</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            ${symptomCardsHtml}
          </div>
        </div>

        <!-- Prescription & Dosing Calculation Card -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left: Clinical Protocol & Instructions -->
          <div class="lg:col-span-2 glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div class="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span class="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Prescribed Clinical Protocol</span>
                <h4 class="text-base font-bold text-slate-100">${diagnosis?.scenario?.name || 'Protocol'}</h4>
              </div>
              <span class="px-2.5 py-1 rounded-full text-xs font-bold border ${isLocked ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}">
                ${isLocked ? '🔒 50% Safety Lock Active' : '🔓 Standard Dose'}
              </span>
            </div>

            <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300">
              <p class="font-semibold text-cyan-300">${diagnosis?.symp?.protocol || ''}</p>
              <p class="text-slate-400 leading-relaxed">${diagnosis?.scenario?.instructions || ''}</p>
            </div>

            <!-- Warnings / Safety Lock Alerts -->
            ${warnings.length > 0 ? `
              <div class="p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                <span class="font-bold flex items-center gap-1.5">
                  <span>⚠️</span> Pharmacology Safety Alerts:
                </span>
                <ul class="list-disc list-inside space-y-1 text-[11px] text-amber-200/90">
                  ${warnings.map(w => `<li>${w}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <!-- 50% Lock Manual Toggle -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs">
              <span class="text-slate-300">Scaleless Species 50% Dosage Lock</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="toggle-safety-lock" class="sr-only peer" ${isLocked ? 'checked' : ''}>
                <div class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>
          </div>

          <!-- Right: Volumetric Dosage Box -->
          <div class="lg:col-span-1 glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Volumetric Dispense Dose</span>
              <div class="flex items-baseline gap-2 mb-2">
                <span class="text-4xl font-extrabold text-cyan-300 font-mono">${calc ? calc.dose : 0}</span>
                <span class="text-lg font-bold text-slate-300">${calc ? calc.unit : 'ml'}</span>
              </div>
              <p class="text-xs text-slate-400">
                Formula: (${diagnosis?.treatedVol || 0}L / 100L) × ${calc?.baseRate || 0}${calc?.unit} × factor ${calc?.lockFactor || 1.0}
              </p>
            </div>

            <!-- Volume Slider / Adjuster -->
            <div class="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div class="flex justify-between text-slate-400">
                <span>Net Treated Volume:</span>
                <span class="font-bold text-slate-200">${diagnosis?.treatedVol || 0} Liters</span>
              </div>
              ${!this.isHospitalMode ? `
                <input type="range" id="volume-slider" min="10" max="500" step="5" value="${this.volumeNetL}" class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500">
                <div class="flex justify-between text-[10px] text-slate-500">
                  <span>10L</span>
                  <span>220L</span>
                  <span>500L</span>
                </div>
              ` : `
                <p class="text-[11px] text-purple-300">Using standard isolated hospital tub dosage</p>
              `}
            </div>

            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              <strong class="text-slate-300 block mb-0.5">Dispense Instructions:</strong>
              Shake bottle thoroughly. Dilute prescribed dose in 500ml tank water before pouring gradually near filter outflow.
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this._attachEventListeners();
  }

  /**
   * Attach interactive listeners
   * @private
   */
  _attachEventListeners() {
    if (!this.container) return;

    // Symptom buttons
    const btns = this.container.querySelectorAll('.symp-select-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-symp-id');
        this.selectSymptom(id);
      });
    });

    // Hospital mode buttons
    const mainBtn = this.container.querySelector('#hospital-main-btn');
    const isoBtn = this.container.querySelector('#hospital-iso-btn');
    if (mainBtn) mainBtn.addEventListener('click', () => this.setHospitalMode(false));
    if (isoBtn) isoBtn.addEventListener('click', () => this.setHospitalMode(true));

    // Safety lock toggle
    const lockToggle = this.container.querySelector('#toggle-safety-lock');
    if (lockToggle) {
      lockToggle.addEventListener('change', (e) => {
        this.setSafetyLock(e.target.checked);
      });
    }

    // Volume slider
    const slider = this.container.querySelector('#volume-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        this.setVolume(Number(e.target.value));
      });
    }
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.SymptomChecker = SymptomChecker;
}
if (typeof window !== 'undefined') {
  window.SymptomChecker = SymptomChecker;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SymptomChecker };
  module.exports.default = SymptomChecker;
}

export default SymptomChecker;

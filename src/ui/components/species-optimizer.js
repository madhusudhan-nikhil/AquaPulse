/**
 * AquaPulse Inhabitants Sweet-Spot Optimizer Component
 * Dynamic species selection, population density tally, biological overlap chart,
 * flow dynamics recommendation, and one-click target derivation.
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

function resolveOptimizerEngine(custom) {
  if (custom) return custom;
  if (typeof globalThis !== 'undefined') {
    if (globalThis.OptimizerEngine) return globalThis.OptimizerEngine;
    if (globalThis.window && globalThis.window.OptimizerEngine) return globalThis.window.OptimizerEngine;
  }
  return null;
}

export class SpeciesOptimizer {
  /**
   * @param {Object} [options]
   * @param {AquaPulseStore} [options.store]
   * @param {EventBus} [options.eventBus]
   * @param {ModalManager} [options.modalManager]
   * @param {OptimizerEngine} [options.optimizerEngine]
   */
  constructor(options = {}) {
    this.optimizerEngine = resolveOptimizerEngine(options.optimizerEngine);
    this.store = options.store || null;
    this.eventBus = options.eventBus || null;
    this.modalManager = options.modalManager || null;

    this.container = null;
    this.speciesList = [];
    this._unsubStore = null;
  }

  /**
   * Mount component
   * @param {HTMLElement|Object} container
   */
  mount(container) {
    this.container = container;
    this._loadSpeciesFromStore();

    if (this.store) {
      this._unsubStore = this.store.subscribe('species', (species) => {
        if (Array.isArray(species)) {
          this.speciesList = [...species];
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
   * Load initial species from store
   * @private
   */
  _loadSpeciesFromStore() {
    if (this.store) {
      const stored = this.store.getState('species');
      if (Array.isArray(stored) && stored.length > 0) {
        this.speciesList = [...stored];
        return;
      }
    }

    // Default community roster
    this.speciesList = [
      { id: 'denison-barb', name: 'Denison Barb', count: 6 },
      { id: 'silver-tip-tetra', name: 'Silver Tip Tetra', count: 12 },
      { id: 'albino-corydoras', name: 'Albino Corydoras', count: 6 },
      { id: 'female-betta', name: 'Female Betta', count: 1 },
      { id: 'zebra-nerite-snail', name: 'Zebra Nerite Snail', count: 4 }
    ];

    if (this.store) {
      this.store.setState('species', this.speciesList);
    }
  }

  /**
   * Add or increase count of species
   * @param {string} speciesId
   * @param {number} [count=1]
   */
  addSpecies(speciesId, count = 1) {
    const existing = this.speciesList.find(s => s.id === speciesId);
    if (existing) {
      existing.count = Math.max(1, (Number(existing.count) || 1) + count);
    } else {
      const engine = this.optimizerEngine || resolveOptimizerEngine();
      const db = (engine && engine.SPECIES_DATABASE) || {};
      const prof = db[speciesId] || { name: speciesId, id: speciesId };
      this.speciesList.push({
        id: speciesId,
        name: prof.name || speciesId,
        count: Math.max(1, count)
      });
    }

    this._syncStore();
    this.render();
  }

  /**
   * Remove species or decrease count
   * @param {string} speciesId
   * @param {boolean} [removeAll=false]
   */
  removeSpecies(speciesId, removeAll = false) {
    const idx = this.speciesList.findIndex(s => s.id === speciesId);
    if (idx === -1) return;

    if (removeAll || this.speciesList[idx].count <= 1) {
      this.speciesList.splice(idx, 1);
    } else {
      this.speciesList[idx].count -= 1;
    }

    this._syncStore();
    this.render();
  }

  /**
   * Synchronize species list to store
   * @private
   */
  _syncStore() {
    if (this.store) {
      this.store.setState('species', this.speciesList);
    }
    if (this.eventBus) {
      this.eventBus.emit('species:updated', this.speciesList);
    }
  }

  /**
   * Apply derived sweet-spot targets directly to store targets
   */
  applySweetSpotTargets() {
    const engine = this.optimizerEngine || resolveOptimizerEngine();
    if (!engine || typeof engine.calculateSweetSpot !== 'function') return;

    const netL = (this.store && this.store.getState('tank.volumeNetL')) || 220;
    const flowLph = (this.store && this.store.getState('tank.filterFlowLph')) || 1750;
    const sweetSpot = engine.calculateSweetSpot(this.speciesList, { volumeNetL: netL, filterFlowLph: flowLph });

    if (!sweetSpot) return;

    const newTargets = {
      temp: {
        min: sweetSpot.tempRange[0],
        max: sweetSpot.tempRange[1],
        target: sweetSpot.recommendedTemp
      },
      ph: {
        min: sweetSpot.phRange[0],
        max: sweetSpot.phRange[1],
        target: sweetSpot.recommendedPh
      },
      gh: {
        min: sweetSpot.ghRange[0],
        max: sweetSpot.ghRange[1]
      },
      kh: {
        min: sweetSpot.khRange[0],
        max: sweetSpot.khRange[1]
      }
    };

    if (this.store) {
      this.store.setState('targets', newTargets);
    }
    if (this.eventBus) {
      this.eventBus.emit('targets:derived', newTargets);
    }

    if (this.modalManager) {
      this.modalManager.alert(
        'Sweet-Spot Applied Successfully',
        `Tank targets have been synchronized to optimal biological bounds:
• Temperature: ${sweetSpot.recommendedTemp}°C (Window: ${sweetSpot.tempRange[0]} - ${sweetSpot.tempRange[1]}°C)
• pH Acidity: ${sweetSpot.recommendedPh} (Window: ${sweetSpot.phRange[0]} - ${sweetSpot.phRange[1]})
• Hardness Corridors: GH ${sweetSpot.ghRange[0]}-${sweetSpot.ghRange[1]} dGH, KH ${sweetSpot.khRange[0]}-${sweetSpot.khRange[1]} dKH`
      );
    }

    this.render();
  }

  /**
   * Render component
   */
  render() {
    if (!this.container) return;

    const netL = (this.store && this.store.getState('tank.volumeNetL')) || 220;
    const flowLph = (this.store && this.store.getState('tank.filterFlowLph')) || 1750;

    const engine = this.optimizerEngine || resolveOptimizerEngine();
    let sweetSpot = null;
    let density = { score: 0, status: 'LIGHT', totalFish: 0, totalBioLoad: 0 };
    const db = (engine && engine.SPECIES_DATABASE) || {};

    if (engine) {
      if (typeof engine.calculateSweetSpot === 'function') {
        sweetSpot = engine.calculateSweetSpot(this.speciesList, { volumeNetL: netL, filterFlowLph: flowLph });
      }
      if (typeof engine.calculateDensityScore === 'function') {
        density = engine.calculateDensityScore(this.speciesList, netL);
      }
    }

    // Density badge styling
    let densityColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (density.status === 'HEAVY') densityColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    else if (density.status === 'OVERSTOCKED') densityColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';

    // Species cards
    const speciesCardsHtml = this.speciesList.map(s => {
      const prof = (engine && engine.resolveSpeciesProfile(s)) || db[s.id] || { name: s.name, scaleless: false };
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${prof.category === 'Cichlid' ? '🐠' : (prof.category === 'Barb' ? '🐟' : (prof.scaleless ? '🐡' : '✨'))}</span>
            <div>
              <h5 class="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                ${prof.name || s.name}
                ${prof.scaleless ? `<span class="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30" title="Scaleless skin requires 50% medication dosage">Scaleless</span>` : ''}
              </h5>
              <p class="text-[11px] text-slate-400">
                ${prof.tempMin || 24}-${prof.tempMax || 28}°C • pH ${prof.phMin || 6.5}-${prof.phMax || 7.5} • ${prof.flowPreference || 'moderate'} flow
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button type="button" data-dec="${s.id}" class="px-2 py-0.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded">-</button>
              <span class="px-2.5 text-xs font-bold text-cyan-300 font-mono">${s.count}</span>
              <button type="button" data-inc="${s.id}" class="px-2 py-0.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded">+</button>
            </div>
            <button type="button" data-del="${s.id}" class="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors" title="Remove species">✕</button>
          </div>
        </div>
      `;
    }).join('');

    // Database options for add dropdown
    const availableOptions = Object.keys(db).map(k => `
      <option value="${k}">${db[k].name} (${db[k].category || 'Freshwater'})</option>
    `).join('');

    const html = `
      <div class="species-optimizer-module space-y-6">
        <!-- Header & Biological Sweet-Spot Summary Banner -->
        <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>🧬</span> Inhabitants Sweet-Spot Biological Derivation
              </h3>
              <p class="text-xs text-slate-400">Mathematical intersection of thermal, chemical, and hydro-convection envelopes</p>
            </div>
            <button type="button" id="apply-sweet-spot-btn" class="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/50 flex items-center gap-1.5 transition-all">
              <span>⚡</span> Apply Sweet-Spot to Tank Targets
            </button>
          </div>

          <!-- 4 Sweet-Spot Derivative Metrics -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Optimal Temperature</span>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-black text-cyan-300">${sweetSpot ? sweetSpot.recommendedTemp : 25.5}</span>
                <span class="text-xs text-slate-400">°C</span>
              </div>
              <span class="text-[10px] text-slate-500 block mt-1">Window: ${sweetSpot ? sweetSpot.tempRange.join(' - ') : '24.0 - 26.0'}°C</span>
            </div>

            <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Optimal pH Acidity</span>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-black text-cyan-300">${sweetSpot ? sweetSpot.recommendedPh : 7.1}</span>
                <span class="text-xs text-slate-400">pH</span>
              </div>
              <span class="text-[10px] text-slate-500 block mt-1">Window: ${sweetSpot ? sweetSpot.phRange.join(' - ') : '6.5 - 7.5'}</span>
            </div>

            <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Hardness Corridors</span>
              <div class="flex items-baseline gap-1">
                <span class="text-lg font-bold text-slate-200">GH ${sweetSpot ? sweetSpot.ghRange.join('-') : '4-12'}</span>
                <span class="text-xs text-slate-400">/ KH ${sweetSpot ? sweetSpot.khRange.join('-') : '3-8'}</span>
              </div>
              <span class="text-[10px] text-slate-500 block mt-1">Osmotic & buffer stability</span>
            </div>

            <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Flow Recommendation</span>
              <span class="text-sm font-bold text-amber-300 block truncate">${sweetSpot ? sweetSpot.recommendedFlow : 'Baffled Convection (45°)'}</span>
              <span class="text-[10px] text-slate-500 block mt-1">Accommodates mixed strata</span>
            </div>
          </div>
        </div>

        <!-- Bioload & Inhabitants Roster Section -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left: Inhabitants Roster & Adder -->
          <div class="lg:col-span-2 space-y-4">
            <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>🐠</span> Active Livestock Inhabitants (${this.speciesList.reduce((acc, s) => acc + (Number(s.count) || 1), 0)} fish)
                </h4>
                <!-- Add Species Selector -->
                <div class="flex items-center gap-2">
                  <select id="add-species-select" class="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none">
                    ${availableOptions}
                  </select>
                  <button type="button" id="add-species-btn" class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 font-bold text-white rounded-lg text-xs transition-colors flex items-center gap-1">
                    <span>+</span> Add
                  </button>
                </div>
              </div>

              <!-- Roster Cards -->
              <div class="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                ${speciesCardsHtml || '<div class="text-slate-500 text-xs py-4 text-center">No species in active roster</div>'}
              </div>
            </div>
          </div>

          <!-- Right: Population Density & Capacity Diagnostics -->
          <div class="lg:col-span-1 space-y-4">
            <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <h4 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>⚖️</span> Ecological Density & Bioload
              </h4>

              <!-- Density Score Meter -->
              <div class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Carrying Capacity</span>
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-bold border ${densityColor}">${density.status}</span>
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-extrabold text-cyan-300">${density.score}%</span>
                  <span class="text-xs text-slate-400">of standard biological capacity</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div class="h-2.5 rounded-full transition-all duration-500 ${density.score > 100 ? 'bg-rose-500' : (density.score > 80 ? 'bg-amber-400' : 'bg-emerald-400')}" style="width: ${Math.min(100, density.score)}%"></div>
                </div>
                <div class="flex justify-between text-[10px] text-slate-500 pt-1">
                  <span>Total Fish: ${density.totalFish}</span>
                  <span>Bioload Units: ${density.totalBioLoad}</span>
                </div>
              </div>

              <!-- Compatibility Insights & Conflict Warnings -->
              ${(sweetSpot && sweetSpot.conflicts && sweetSpot.conflicts.length > 0) ? `
                <div class="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <span class="font-bold block mb-1">⚠️ Biological Compromise Warnings:</span>
                  <ul class="list-disc list-inside space-y-1 text-[11px]">
                    ${sweetSpot.conflicts.map(c => `<li>${c}</li>`).join('')}
                  </ul>
                </div>
              ` : `
                <div class="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <span>✅</span>
                  <span>100% biological compatibility across thermal, pH, and flow envelopes!</span>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this._attachEventListeners();
  }

  /**
   * Attach button listeners
   * @private
   */
  _attachEventListeners() {
    if (!this.container) return;

    // Apply sweet-spot button
    const applyBtn = this.container.querySelector('#apply-sweet-spot-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applySweetSpotTargets();
      });
    }

    // Add species button
    const addBtn = this.container.querySelector('#add-species-btn');
    const select = this.container.querySelector('#add-species-select');
    if (addBtn && select) {
      addBtn.addEventListener('click', () => {
        const id = select.value;
        if (id) {
          this.addSpecies(id, 1);
        }
      });
    }

    // Increment buttons
    const incBtns = this.container.querySelectorAll('[data-inc]');
    incBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-inc');
        this.addSpecies(id, 1);
      });
    });

    // Decrement buttons
    const decBtns = this.container.querySelectorAll('[data-dec]');
    decBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-dec');
        this.removeSpecies(id, false);
      });
    });

    // Delete buttons
    const delBtns = this.container.querySelectorAll('[data-del]');
    delBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del');
        this.removeSpecies(id, true);
      });
    });
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.SpeciesOptimizer = SpeciesOptimizer;
}
if (typeof window !== 'undefined') {
  window.SpeciesOptimizer = SpeciesOptimizer;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpeciesOptimizer };
  module.exports.default = SpeciesOptimizer;
}

export default SpeciesOptimizer;

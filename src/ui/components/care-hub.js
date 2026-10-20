/**
 * AquaPulse Care Hub Component
 * Feeding schedule matrix with pre-soak countdown timer, alternating dual-canister
 * filter checklist (with biological collapse safety guard), and 14-day quarantine progress tracker.
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

export class CareHub {
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
    this.soakTimer = null;
    this.soakSecondsRemaining = 0;
    this.soakFoodName = '';

    this.spongeIndex = 0;
    this.quarantineData = {
      active: true,
      fishName: 'Denison Barb (Quarantine)',
      startDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
      durationDays: 14,
      containerVolumeL: 15,
      notes: 'Fin observation after shipping'
    };

    this.checklist = {
      'task-glass': false,
      'task-prefilter': true,
      'task-sponge': false,
      'task-waterchange': true,
      'task-conditioner': true,
      'task-ferts': false
    };

    this._unsubStore = null;
  }

  /**
   * Mount into DOM container
   * @param {HTMLElement|Object} container
   */
  mount(container) {
    this.container = container;
    this._loadState();
    this.render();
  }

  /**
   * Unmount component and clear timers
   */
  unmount() {
    this.stopSoakTimer();
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
   * Load care hub state from store
   * @private
   */
  _loadState() {
    if (this.store) {
      const storedIdx = this.store.getState('care.spongeIndex');
      if (storedIdx !== undefined) this.spongeIndex = Number(storedIdx) || 0;

      const storedQuar = this.store.getState('care.quarantine');
      if (storedQuar) this.quarantineData = { ...this.quarantineData, ...storedQuar };

      const storedTasks = this.store.getState('care.checklist');
      if (storedTasks) this.checklist = { ...this.checklist, ...storedTasks };
    }
  }

  /**
   * Start a pre-soak countdown timer
   * @param {string} foodName
   * @param {number} seconds
   */
  startSoakTimer(foodName, seconds = 120) {
    this.stopSoakTimer();
    this.soakFoodName = foodName || 'Freeze-Dried Treats';
    this.soakSecondsRemaining = seconds;

    this.render();

    this.soakTimer = setInterval(() => {
      this.soakSecondsRemaining--;
      if (this.soakSecondsRemaining <= 0) {
        this.stopSoakTimer();
        if (this.modalManager) {
          this.modalManager.alert('Pre-Soak Complete! 🍽️', `${this.soakFoodName} is fully rehydrated and ready to feed. Swelling prevented!`);
        }
      }
      this._updateTimerDisplay();
    }, 1000);
  }

  /**
   * Stop/reset soak timer
   */
  stopSoakTimer() {
    if (this.soakTimer) {
      clearInterval(this.soakTimer);
      this.soakTimer = null;
    }
    this.soakSecondsRemaining = 0;
    this._updateTimerDisplay();
  }

  /**
   * Update timer DOM elements without re-rendering entire hub
   * @private
   */
  _updateTimerDisplay() {
    if (!this.container) return;
    const timerEl = this.container.querySelector('#soak-timer-display');
    if (timerEl) {
      const mins = Math.floor(this.soakSecondsRemaining / 60);
      const secs = this.soakSecondsRemaining % 60;
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }

  /**
   * Toggle alternating sponge rinse cup
   */
  toggleSpongeCup() {
    if (CareEngine && typeof CareEngine.toggleSpongeWeek === 'function') {
      const res = CareEngine.toggleSpongeWeek(this.spongeIndex, [
        { name: 'Cup A: Coarse Mechanical Foam', type: 'foam' },
        { name: 'Cup B: Bio-Ceramic Substrate Rings', type: 'bio' }
      ]);
      this.spongeIndex = res.nextIndex;
    } else {
      this.spongeIndex = (this.spongeIndex + 1) % 2;
    }

    if (this.store) {
      this.store.setState('care.spongeIndex', this.spongeIndex);
    }
    if (this.eventBus) {
      this.eventBus.emit('care:filter_rinsed', { spongeIndex: this.spongeIndex });
    }

    this.render();
  }

  /**
   * Toggle checklist task
   * @param {string} taskId
   */
  toggleTask(taskId) {
    if (this.checklist[taskId] !== undefined) {
      this.checklist[taskId] = !this.checklist[taskId];
      if (this.store) {
        this.store.setState('care.checklist', this.checklist);
      }
      if (this.eventBus) {
        this.eventBus.emit('care:task_toggled', { taskId, completed: this.checklist[taskId] });
      }
      this.render();
    }
  }

  /**
   * Update quarantine patient via modal dialog
   */
  openQuarantineDialog() {
    if (!this.modalManager) return;

    const html = `
      <form id="quar-edit-form" class="space-y-3 text-xs">
        <div>
          <label class="block text-slate-400 mb-1">Patient Fish Name</label>
          <input type="text" id="quar-fish-name" value="${this.quarantineData.fishName}" class="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-slate-400 mb-1">Start Date</label>
            <input type="date" id="quar-start-date" value="${this.quarantineData.startDate}" class="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Duration (Days)</label>
            <input type="number" id="quar-duration" min="1" max="90" value="${this.quarantineData.durationDays}" class="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200" required>
          </div>
        </div>
        <div>
          <label class="block text-slate-400 mb-1">Observations / Medication Notes</label>
          <textarea id="quar-notes" rows="2" class="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200 resize-none">${this.quarantineData.notes || ''}</textarea>
        </div>
        <div class="flex items-center gap-2 pt-1">
          <input type="checkbox" id="quar-active-chk" ${this.quarantineData.active ? 'checked' : ''} class="rounded border-slate-700 text-cyan-500">
          <label for="quar-active-chk" class="text-slate-300">Active Isolation Protocol</label>
        </div>
        <div class="flex justify-end gap-2 pt-3">
          <button type="button" id="quar-cancel-btn" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold">Cancel</button>
          <button type="submit" class="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold">Save Patient</button>
        </div>
      </form>
    `;

    this.modalManager.custom('🏥 Update Quarantine Patient', html).then(() => {});

    setTimeout(() => {
      const cancel = document.getElementById('quar-cancel-btn');
      if (cancel) cancel.addEventListener('click', () => this.modalManager.close());

      const form = document.getElementById('quar-edit-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.quarantineData.fishName = document.getElementById('quar-fish-name')?.value || 'Patient';
          this.quarantineData.startDate = document.getElementById('quar-start-date')?.value || new Date().toISOString().split('T')[0];
          this.quarantineData.durationDays = Number(document.getElementById('quar-duration')?.value) || 14;
          this.quarantineData.notes = document.getElementById('quar-notes')?.value || '';
          this.quarantineData.active = document.getElementById('quar-active-chk')?.checked ?? true;

          if (this.store) {
            this.store.setState('care.quarantine', this.quarantineData);
          }
          this.modalManager.close();
          this.render();
        });
      }
    }, 50);
  }

  /**
   * Render component
   */
  render() {
    if (!this.container) return;

    // Quarantine countdown computation
    let quar = {
      active: this.quarantineData.active,
      fishName: this.quarantineData.fishName,
      daysElapsed: 4,
      daysRemaining: 10,
      totalDays: 14,
      percentage: 29,
      status: 'ACTIVE ISOLATION'
    };

    if (CareEngine && typeof CareEngine.calculateQuarantineCountdown === 'function') {
      quar = CareEngine.calculateQuarantineCountdown(this.quarantineData);
    }

    const feedingSchedule = (CareEngine && CareEngine.DEFAULT_FEEDING_SCHEDULE) || [
      { day: "Mon", type: "Staple Flakes", morning: "Spirulina flakes (light pinch)", evening: "Micro-granules lane", night: "Zucchini round" },
      { day: "Tue", type: "Protein Treat Day", morning: "Tubifex (pre-soaked 3m)", evening: "Vibra bites", night: "Algae wafer half" },
      { day: "Wed", type: "Color Staple", morning: "Color crisps", evening: "Garlic pellets", night: "Fast" },
      { day: "Thu", type: "Frozen / Live Treat", morning: "Artemia", evening: "Micro-pellets", night: "Bottom tablet" },
      { day: "Fri", type: "High-Fiber Digestive", morning: "Shelled peas", evening: "Spirulina pinch", night: "Fast" },
      { day: "Sat", type: "Community Feast", morning: "Variety flake", evening: "Tubifex treat", night: "Veggie wafer" },
      { day: "Sun", type: "FASTING DAY (Adults)", morning: "FAST - No food", evening: "FAST - Bottom check", night: "FAST - Zero waste" }
    ];

    const currentDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

    const scheduleRows = feedingSchedule.map(s => {
      const isToday = s.day === currentDayName;
      const isFasting = s.day === 'Sun';

      return `
        <tr class="border-b border-slate-800 text-xs ${isToday ? 'bg-cyan-950/30 font-semibold' : 'hover:bg-slate-800/40'} transition-colors">
          <td class="py-2.5 px-3">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono ${isToday ? 'bg-cyan-500 text-slate-950 font-bold' : (isFasting ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300')}">
              ${s.day} ${isToday ? '★' : ''}
            </span>
          </td>
          <td class="py-2.5 px-3 font-semibold ${isFasting ? 'text-rose-300' : 'text-slate-200'}">${s.type}</td>
          <td class="py-2.5 px-3 text-slate-400">${s.morning}</td>
          <td class="py-2.5 px-3 text-slate-400">${s.evening}</td>
          <td class="py-2.5 px-3 text-slate-400">${s.night}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <div class="care-hub-module space-y-6">
        <!-- Top Row: Quarantine Tracker & Alternating Filter Care -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 14-Day Quarantine Countdown Card -->
          <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🏥</span>
                <div>
                  <h4 class="text-sm font-bold text-slate-100">14-Day Quarantine Isolation Hub</h4>
                  <p class="text-xs text-slate-400">Pathogen isolation, acclimation & clinical countdown</p>
                </div>
              </div>
              <button type="button" id="edit-quar-btn" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors">
                ✏️ Edit Patient
              </button>
            </div>

            <!-- Patient Box -->
            <div class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>🐟</span> ${quar.fishName}
                </span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${quar.status === 'READY FOR MAIN TANK' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'}">
                  ${quar.status}
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="space-y-1">
                <div class="flex justify-between text-[11px] text-slate-400">
                  <span>Day ${quar.daysElapsed} of ${quar.totalDays} Days</span>
                  <span class="font-bold text-cyan-300">${quar.percentage}% Elapsed</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div class="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500" style="width: ${quar.percentage}%"></div>
                </div>
                <div class="flex justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Start: ${this.quarantineData.startDate}</span>
                  <span>${quar.daysRemaining} Days Remaining</span>
                </div>
              </div>

              <p class="text-[11px] text-slate-400 italic">"${this.quarantineData.notes || 'Observing general vitality'}"</p>
            </div>
          </div>

          <!-- Alternating Dual-Canister Filter Maintenance -->
          <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">⚙️</span>
                <div>
                  <h4 class="text-sm font-bold text-slate-100">Alternating Filter Sponge Rinse</h4>
                  <p class="text-xs text-slate-400">Bio-filter preservation: Never rinse both cups in the same week!</p>
                </div>
              </div>
              <button type="button" id="toggle-sponge-btn" class="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow transition-colors flex items-center gap-1">
                <span>🔄</span> Toggle Rinse
              </button>
            </div>

            <!-- Two Filter Compartments -->
            <div class="grid grid-cols-2 gap-3">
              <!-- Cup A -->
              <div class="p-3.5 rounded-xl border transition-all ${this.spongeIndex === 0 ? 'bg-cyan-950/30 border-cyan-500/60 shadow-md shadow-cyan-950/40' : 'bg-slate-950/60 border-slate-800 opacity-60'}">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-slate-200">Cup A: Coarse Foam</span>
                  <span class="text-lg">${this.spongeIndex === 0 ? '🧼' : '🔒'}</span>
                </div>
                <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold block w-fit mb-1 ${this.spongeIndex === 0 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'}">
                  ${this.spongeIndex === 0 ? 'Rinse This Week' : 'Do Not Rinse'}
                </span>
                <p class="text-[11px] text-slate-400">Mechanical debris extraction cup</p>
              </div>

              <!-- Cup B -->
              <div class="p-3.5 rounded-xl border transition-all ${this.spongeIndex === 1 ? 'bg-cyan-950/30 border-cyan-500/60 shadow-md shadow-cyan-950/40' : 'bg-slate-950/60 border-slate-800 opacity-60'}">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-slate-200">Cup B: Bio-Ceramics</span>
                  <span class="text-lg">${this.spongeIndex === 1 ? '🧼' : '🔒'}</span>
                </div>
                <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold block w-fit mb-1 ${this.spongeIndex === 1 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'}">
                  ${this.spongeIndex === 1 ? 'Rinse This Week' : 'Do Not Rinse'}
                </span>
                <p class="text-[11px] text-slate-400">Nitrifying biological colony rings</p>
              </div>
            </div>

            <div class="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2">
              <span>⚠️</span>
              <span>Rinsing both media compartments concurrently risks beneficial bacteria wipeout.</span>
            </div>
          </div>
        </div>

        <!-- Feeding Matrix & Pre-Soak Timer -->
        <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>🍽️</span> 7-Day Targeted Feeding Regimen Matrix
              </h4>
              <p class="text-xs text-slate-400">Prevents fatty liver disease & swim bladder bloat through scheduled fasting</p>
            </div>
            <!-- Pre-Soak Quick Timer Widget -->
            <div class="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pre-Soak Timer</span>
                <span id="soak-timer-display" class="text-lg font-mono font-bold text-cyan-300">02:00</span>
              </div>
              <div class="flex items-center gap-1.5">
                <button type="button" id="start-soak-btn" class="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold transition-colors">
                  ▶ Start (120s)
                </button>
                <button type="button" id="reset-soak-btn" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors">
                  Reset
                </button>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/60">
                  <th class="py-2 px-3">Day</th>
                  <th class="py-2 px-3">Menu Focus</th>
                  <th class="py-2 px-3">Morning Feed</th>
                  <th class="py-2 px-3">Evening Feed</th>
                  <th class="py-2 px-3">Night Bottom Crew</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Weekly Routine Maintenance Checklist -->
        <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <h4 class="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>📋</span> Routine Weekly Maintenance Tasks
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 select-none">
              <input type="checkbox" data-task="task-glass" class="task-chk rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.checklist['task-glass'] ? 'checked' : ''}>
              <span class="${this.checklist['task-glass'] ? 'line-through text-slate-500' : 'text-slate-300'}">Scrape algae off front glass</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 select-none">
              <input type="checkbox" data-task="task-prefilter" class="task-chk rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.checklist['task-prefilter'] ? 'checked' : ''}>
              <span class="${this.checklist['task-prefilter'] ? 'line-through text-slate-500' : 'text-slate-300'}">Rinse intake pre-filter coarse mesh</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 select-none">
              <input type="checkbox" data-task="task-waterchange" class="task-chk rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.checklist['task-waterchange'] ? 'checked' : ''}>
              <span class="${this.checklist['task-waterchange'] ? 'line-through text-slate-500' : 'text-slate-300'}">Perform 35% weekly water siphon</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 select-none">
              <input type="checkbox" data-task="task-conditioner" class="task-chk rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.checklist['task-conditioner'] ? 'checked' : ''}>
              <span class="${this.checklist['task-conditioner'] ? 'line-through text-slate-500' : 'text-slate-300'}">Dose dechlorinator conditioner</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 select-none">
              <input type="checkbox" data-task="task-sponge" class="task-chk rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.checklist['task-sponge'] ? 'checked' : ''}>
              <span class="${this.checklist['task-sponge'] ? 'line-through text-slate-500' : 'text-slate-300'}">Rinse scheduled filter sponge cup</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 select-none">
              <input type="checkbox" data-task="task-ferts" class="task-chk rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.checklist['task-ferts'] ? 'checked' : ''}>
              <span class="${this.checklist['task-ferts'] ? 'line-through text-slate-500' : 'text-slate-300'}">Add micro/macro liquid fertilizer</span>
            </label>
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

    // Filter sponge toggle
    const spongeBtn = this.container.querySelector('#toggle-sponge-btn');
    if (spongeBtn) {
      spongeBtn.addEventListener('click', () => this.toggleSpongeCup());
    }

    // Edit quarantine patient
    const editQuarBtn = this.container.querySelector('#edit-quar-btn');
    if (editQuarBtn) {
      editQuarBtn.addEventListener('click', () => this.openQuarantineDialog());
    }

    // Pre-soak timer buttons
    const startSoak = this.container.querySelector('#start-soak-btn');
    const resetSoak = this.container.querySelector('#reset-soak-btn');
    if (startSoak) {
      startSoak.addEventListener('click', () => this.startSoakTimer('Freeze-Dried Bloodworms', 120));
    }
    if (resetSoak) {
      resetSoak.addEventListener('click', () => this.stopSoakTimer());
    }

    // Task checkboxes
    const taskChks = this.container.querySelectorAll('.task-chk');
    taskChks.forEach(chk => {
      chk.addEventListener('change', () => {
        const taskId = chk.getAttribute('data-task');
        this.toggleTask(taskId);
      });
    });
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.CareHub = CareHub;
}
if (typeof window !== 'undefined') {
  window.CareHub = CareHub;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CareHub };
  module.exports.default = CareHub;
}

export default CareHub;

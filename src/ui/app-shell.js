/**
 * AquaPulse Application Shell
 * Orchestrates layout, responsive navigation tabs, mobile drawer, tank switcher,
 * modal dialogs, and coordinates the decoupled presentation modules.
 * Dual-environment: Native browser ES module & Node.js compatible.
 */

import { ModalManager } from './modal-manager.js';
import { VitalSignsStrip } from './components/vital-signs-strip.js';
import { FlowCanvas } from './components/flow-canvas.js';
import { ParamLogger } from './components/param-logger.js';
import { SpeciesOptimizer } from './components/species-optimizer.js';
import { SymptomChecker } from './components/symptom-checker.js';
import { CareHub } from './components/care-hub.js';
import { SocialLogger } from './components/social-logger.js';
import { TelemetryHAL } from '../telemetry/telemetry-hal.js';
import { SampleSensorPlugin } from '../plugins/sample-sensor-plugin.js';

export class AppShell {
  /**
   * @param {Object} [options]
   * @param {AquaPulseStore} [options.store]
   * @param {EventBus} [options.eventBus]
   * @param {ConfigManager} [options.configManager]
   * @param {PluginRegistry} [options.pluginRegistry]
   * @param {TelemetryHAL} [options.telemetryHal]
   */
  constructor(options = {}) {
    this.store = options.store || null;
    this.eventBus = options.eventBus || null;
    this.configManager = options.configManager || null;
    this.pluginRegistry = options.pluginRegistry || null;
    this.telemetryHal = options.telemetryHal || null;

    this.container = null;
    this.activeTab = 'tank'; // 'tank' | 'optimizer' | 'symptoms' | 'care' | 'params' | 'social' | 'plugins'
    this.activeTankId = 'tank-255l';
    this.isDrawerOpen = false;

    this.modalManager = new ModalManager();

    // Components
    this.vitalSigns = null;
    this.flowCanvas = null;
    this.paramLogger = null;
    this.speciesOptimizer = null;
    this.symptomChecker = null;
    this.careHub = null;
    this.socialLogger = null;

    this._unsubStore = null;
  }

  /**
   * Mount shell into DOM container
   * @param {HTMLElement|Object} container
   */
  mount(container) {
    this.container = container;

    // Load active tank ID if in store
    if (this.store) {
      const tank = this.store.getState('tank');
      if (tank && tank.id) {
        this.activeTankId = tank.id;
      }
    }

    // Initialize telemetry HAL if not passed
    if (!this.telemetryHal && typeof TelemetryHAL === 'function') {
      this.telemetryHal = new TelemetryHAL({
        store: this.store,
        eventBus: this.eventBus,
        tankId: this.activeTankId
      });
    }

    // Register sample plugin if registry available
    if (this.pluginRegistry && SampleSensorPlugin) {
      try {
        if (!this.pluginRegistry.getPlugin(SampleSensorPlugin.id)) {
          this.pluginRegistry.register(SampleSensorPlugin);
        }
      } catch (_) {}
    }

    this._buildShellDOM();
    this._initSubComponents();
    this._attachShellListeners();
    this.switchTab(this.activeTab);
  }

  /**
   * Unmount shell and clean up child components
   */
  unmount() {
    if (this.vitalSigns) this.vitalSigns.unmount();
    if (this.flowCanvas) this.flowCanvas.unmount();
    if (this.paramLogger) this.paramLogger.unmount();
    if (this.speciesOptimizer) this.speciesOptimizer.unmount();
    if (this.symptomChecker) this.symptomChecker.unmount();
    if (this.careHub) this.careHub.unmount();
    if (this.socialLogger) this.socialLogger.unmount();

    if (this.container && typeof this.container.innerHTML === 'string') {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  /**
   * Render top shell container structure
   * @private
   */
  _buildShellDOM() {
    if (!this.container) return;

    const tankName = (this.store && this.store.getState('tank.name')) || '255L Command Ecosystem';

    this.container.innerHTML = `
      <div class="aquapulse-app-layout min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950">
        <!-- Main Header -->
        <header class="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-md border-b border-cyan-950 px-4 py-3">
          <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <!-- Brand & Tank Selector -->
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-xl shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-400/40">
                  🌊
                </div>
                <div>
                  <h1 class="text-base font-extrabold tracking-tight bg-gradient-to-r from-cyan-300 via-teal-200 to-blue-300 bg-clip-text text-transparent">
                    AquaPulse
                  </h1>
                  <span class="text-[10px] text-cyan-400/80 font-mono tracking-widest uppercase block -mt-0.5">Command Architecture</span>
                </div>
              </div>

              <!-- Tank Switcher Dropdown -->
              <div class="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
                <span class="text-xs text-slate-400 mr-2">Tank:</span>
                <select id="tank-switcher" class="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer">
                  <option value="tank-255l" ${this.activeTankId === 'tank-255l' ? 'selected' : ''}>255L Planted Command Tank</option>
                  <option value="tank-120l" ${this.activeTankId === 'tank-120l' ? 'selected' : ''}>120L Community Demo</option>
                  <option value="tank-60l" ${this.activeTankId === 'tank-60l' ? 'selected' : ''}>60L Nano Betta Sanctuary</option>
                </select>
              </div>
            </div>

            <!-- Header Quick Actions -->
            <div class="flex items-center gap-2 sm:gap-3">
              <!-- Live Telemetry Pill -->
              <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span class="hidden md:inline font-mono">Telemetry: Live</span>
              </div>

              <!-- Configuration Modal Trigger -->
              <button type="button" id="open-config-btn" class="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors" title="Configuration & JSON Console">
                ⚙️
              </button>

              <!-- Mobile Hamburger Button -->
              <button type="button" id="mobile-menu-btn" class="md:hidden p-2 text-slate-300 hover:text-white bg-slate-800 rounded-xl border border-slate-700">
                ☰
              </button>
            </div>
          </div>

          <!-- Desktop Navigation Tabs -->
          <div class="hidden md:flex max-w-7xl mx-auto items-center gap-1 mt-2.5 border-t border-slate-800/60 pt-2 text-xs">
            <button type="button" data-tab="tank" class="nav-tab-btn px-3.5 py-1.5 rounded-lg font-semibold transition-all">
              🌊 Tank & Flow
            </button>
            <button type="button" data-tab="optimizer" class="nav-tab-btn px-3.5 py-1.5 rounded-lg font-semibold transition-all">
              🧬 Inhabitants Sweet-Spot
            </button>
            <button type="button" data-tab="symptoms" class="nav-tab-btn px-3.5 py-1.5 rounded-lg font-semibold transition-all">
              🩺 Diagnostic & Pharmacy
            </button>
            <button type="button" data-tab="care" class="nav-tab-btn px-3.5 py-1.5 rounded-lg font-semibold transition-all">
              🏥 Care Hub & Feeding
            </button>
            <button type="button" data-tab="params" class="nav-tab-btn px-3.5 py-1.5 rounded-lg font-semibold transition-all">
              📈 Parameter Logs & Trends
            </button>
            <button type="button" data-tab="social" class="nav-tab-btn px-3.5 py-1.5 rounded-lg font-semibold transition-all">
              ⚔️ Social Dynamics
            </button>
            <button type="button" data-tab="plugins" class="nav-tab-btn px-3.5 py-1.5 rounded-lg font-semibold transition-all">
              🧩 Plugins & Sensors
            </button>
          </div>
        </header>

        <!-- Mobile Drawer Overlay -->
        <div id="mobile-drawer" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm hidden">
          <div class="w-64 max-w-[80vw] h-full bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between">
            <div class="space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                <span class="font-bold text-cyan-300 text-sm">Navigation Menu</span>
                <button type="button" id="close-drawer-btn" class="text-slate-400 p-1">✕</button>
              </div>
              <nav class="flex flex-col gap-1.5 text-xs font-semibold">
                <button type="button" data-tab="tank" class="mobile-tab-btn text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">🌊 Tank & Flow</button>
                <button type="button" data-tab="optimizer" class="mobile-tab-btn text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">🧬 Sweet-Spot Optimizer</button>
                <button type="button" data-tab="symptoms" class="mobile-tab-btn text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">🩺 Diagnostic Pharmacy</button>
                <button type="button" data-tab="care" class="mobile-tab-btn text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">🏥 Care Hub & Feeding</button>
                <button type="button" data-tab="params" class="mobile-tab-btn text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">📈 Parameter Logs</button>
                <button type="button" data-tab="social" class="mobile-tab-btn text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">⚔️ Social Dynamics</button>
                <button type="button" data-tab="plugins" class="mobile-tab-btn text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800">🧩 Plugins & Sensors</button>
              </nav>
            </div>
            <div class="pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              AquaPulse Overhaul • 2026
            </div>
          </div>
        </div>

        <!-- Above-the-Fold Vital Signs Strip Slot -->
        <div id="vital-signs-mount-slot"></div>

        <!-- Main Tab Content Container -->
        <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          <div id="tab-content-slot" class="w-full"></div>
        </main>

        <!-- Footer -->
        <footer class="w-full bg-slate-900/60 border-t border-slate-800/80 px-4 py-4 text-center text-xs text-slate-500">
          <p>AquaPulse Aquatic Management Engine • Architecture Overhaul v2.0</p>
        </footer>
      </div>
    `;
  }

  /**
   * Instantiate child UI components
   * @private
   */
  _initSubComponents() {
    const vitalSlot = this.container.querySelector('#vital-signs-mount-slot');
    if (vitalSlot) {
      this.vitalSigns = new VitalSignsStrip({
        store: this.store,
        eventBus: this.eventBus,
        modalManager: this.modalManager,
        onNavigate: (tabId) => this.switchTab(tabId)
      });
      this.vitalSigns.mount(vitalSlot);
    }
  }

  /**
   * Switch active navigation tab
   * @param {string} tabId
   */
  switchTab(tabId) {
    this.activeTab = tabId;
    if (this.isDrawerOpen) this._closeDrawer();

    // Update active tab buttons styling
    if (this.container) {
      const desktopTabs = this.container.querySelectorAll('.nav-tab-btn');
      desktopTabs.forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === tabId;
        btn.className = `nav-tab-btn px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
          isActive
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`;
      });

      const mobileTabs = this.container.querySelectorAll('.mobile-tab-btn');
      mobileTabs.forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === tabId;
        btn.className = `mobile-tab-btn text-left px-3 py-2 rounded-lg font-semibold ${
          isActive ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`;
      });
    }

    const contentSlot = this.container?.querySelector('#tab-content-slot');
    if (!contentSlot) return;

    contentSlot.innerHTML = '';

    // Mount active view
    switch (tabId) {
      case 'tank': {
        const wrapper = document.createElement('div');
        wrapper.className = 'space-y-6';
        contentSlot.appendChild(wrapper);

        this.flowCanvas = new FlowCanvas({
          store: this.store,
          eventBus: this.eventBus
        });
        this.flowCanvas.mount(wrapper);
        break;
      }
      case 'optimizer': {
        const wrapper = document.createElement('div');
        contentSlot.appendChild(wrapper);
        this.speciesOptimizer = new SpeciesOptimizer({
          store: this.store,
          eventBus: this.eventBus,
          modalManager: this.modalManager
        });
        this.speciesOptimizer.mount(wrapper);
        break;
      }
      case 'symptoms': {
        const wrapper = document.createElement('div');
        contentSlot.appendChild(wrapper);
        this.symptomChecker = new SymptomChecker({
          store: this.store,
          eventBus: this.eventBus,
          modalManager: this.modalManager
        });
        this.symptomChecker.mount(wrapper);
        break;
      }
      case 'care': {
        const wrapper = document.createElement('div');
        contentSlot.appendChild(wrapper);
        this.careHub = new CareHub({
          store: this.store,
          eventBus: this.eventBus,
          modalManager: this.modalManager
        });
        this.careHub.mount(wrapper);
        break;
      }
      case 'params': {
        const wrapper = document.createElement('div');
        contentSlot.appendChild(wrapper);
        this.paramLogger = new ParamLogger({
          store: this.store,
          eventBus: this.eventBus,
          modalManager: this.modalManager
        });
        this.paramLogger.mount(wrapper);
        break;
      }
      case 'social': {
        const wrapper = document.createElement('div');
        contentSlot.appendChild(wrapper);
        this.socialLogger = new SocialLogger({
          store: this.store,
          eventBus: this.eventBus,
          modalManager: this.modalManager
        });
        this.socialLogger.mount(wrapper);
        break;
      }
      case 'plugins': {
        this._renderPluginsView(contentSlot);
        break;
      }
      default:
        contentSlot.innerHTML = `<div class="p-6 text-center text-slate-400">View not found</div>`;
    }
  }

  /**
   * Render plugins catalog view
   * @private
   */
  _renderPluginsView(slot) {
    const plugins = (this.pluginRegistry && this.pluginRegistry.getAllPlugins()) || [SampleSensorPlugin];

    slot.innerHTML = `
      <div class="space-y-6">
        <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>🧩</span> AquaPulse Plugin & Hardware Registry
            </h3>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
              ${plugins.length} Registered
            </span>
          </div>
          <p class="text-xs text-slate-400">
            Modular extension system adhering to the IPlugin contract (id, name, category, mount, unmount, update).
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div id="plugin-mount-target" class="space-y-4"></div>

          <div class="glass-card p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
            <h4 class="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>🛠️</span> Contributor Extension Quickstart
            </h4>
            <p class="text-xs text-slate-400 leading-relaxed">
              To create a custom widget, telemetry bridge, or dosing calculator:
            </p>
            <pre class="p-3 bg-slate-950 rounded-xl text-[11px] text-cyan-300 font-mono overflow-x-auto border border-slate-800">
export const MyCustomPlugin = {
  id: 'my-custom-sensor',
  name: 'CO2 Drop Checker',
  category: 'sensor',
  mount: (container, context) => {
    container.innerHTML = '&lt;div&gt;CO2: Optimal&lt;/div&gt;';
  },
  unmount: () => {},
  update: (state) => {}
};
registry.register(MyCustomPlugin);
            </pre>
          </div>
        </div>
      </div>
    `;

    // Mount sample sensor plugin into slot
    const target = slot.querySelector('#plugin-mount-target');
    if (target && this.pluginRegistry && typeof this.pluginRegistry.mountPlugin === 'function') {
      try {
        this.pluginRegistry.mountPlugin(SampleSensorPlugin.id, target, { tankId: this.activeTankId });
      } catch (_) {}
    } else if (target && SampleSensorPlugin) {
      SampleSensorPlugin.mount(target, { tankId: this.activeTankId });
    }
  }

  /**
   * Switch active tank
   * @param {string} tankId
   */
  switchTank(tankId) {
    this.activeTankId = tankId;
    if (this.telemetryHal) {
      this.telemetryHal.setTankId(tankId);
    }
    if (this.eventBus) {
      this.eventBus.emit('tank:switched', { tankId });
    }
    this.switchTab(this.activeTab);
  }

  /**
   * Open configuration & JSON console dialog
   */
  openConfigModal() {
    let jsonText = '';
    if (this.configManager) {
      jsonText = this.configManager.exportJSON();
    } else {
      jsonText = JSON.stringify({
        tank: { id: this.activeTankId, name: '255L Command Ecosystem', volumeNetL: 220 },
        targets: { temp: { min: 24.5, max: 26.5 }, ph: { min: 6.6, max: 7.4 } }
      }, null, 2);
    }

    const html = `
      <div class="space-y-3 text-xs">
        <p class="text-slate-400">
          Inspect or edit your tank configuration. Supports comments, trailing commas, and smart quotes.
        </p>
        <textarea id="config-json-editor" rows="12" class="w-full font-mono text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-cyan-300 focus:outline-none focus:border-cyan-400">${jsonText}</textarea>
        <div class="flex items-center justify-between pt-2">
          <button type="button" id="copy-config-btn" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold">
            📋 Copy JSON
          </button>
          <div class="flex gap-2">
            <button type="button" id="close-cfg-btn" class="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg">Cancel</button>
            <button type="button" id="save-cfg-btn" class="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold">Apply & Save</button>
          </div>
        </div>
      </div>
    `;

    this.modalManager.custom('⚙️ AquaPulse Configuration Console', html).then(() => {});

    setTimeout(() => {
      const closeBtn = document.getElementById('close-cfg-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => this.modalManager.close());

      const copyBtn = document.getElementById('copy-config-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          const editor = document.getElementById('config-json-editor');
          if (editor) {
            navigator.clipboard?.writeText(editor.value);
            copyBtn.textContent = 'Copied! ✓';
            setTimeout(() => { copyBtn.textContent = '📋 Copy JSON'; }, 1500);
          }
        });
      }

      const saveBtn = document.getElementById('save-cfg-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const editor = document.getElementById('config-json-editor');
          if (editor && this.configManager) {
            try {
              this.configManager.importJSON(editor.value);
              this.modalManager.close();
              this.modalManager.alert('Success', 'Configuration updated and applied!');
            } catch (err) {
              alert(`Import Error: ${err.message}`);
            }
          } else {
            this.modalManager.close();
          }
        });
      }
    }, 50);
  }

  /**
   * Attach listeners to shell controls
   * @private
   */
  _attachShellListeners() {
    if (!this.container) return;

    // Tank switcher
    const switcher = this.container.querySelector('#tank-switcher');
    if (switcher) {
      switcher.addEventListener('change', (e) => {
        this.switchTank(e.target.value);
      });
    }

    // Config button
    const cfgBtn = this.container.querySelector('#open-config-btn');
    if (cfgBtn) {
      cfgBtn.addEventListener('click', () => this.openConfigModal());
    }

    // Mobile menu toggle
    const menuBtn = this.container.querySelector('#mobile-menu-btn');
    const drawer = this.container.querySelector('#mobile-drawer');
    const closeDrawerBtn = this.container.querySelector('#close-drawer-btn');

    if (menuBtn && drawer) {
      menuBtn.addEventListener('click', () => {
        this.isDrawerOpen = true;
        drawer.classList.remove('hidden');
      });
    }
    if (closeDrawerBtn && drawer) {
      closeDrawerBtn.addEventListener('click', () => this._closeDrawer());
    }
    if (drawer) {
      drawer.addEventListener('click', (e) => {
        if (e.target === drawer) this._closeDrawer();
      });
    }

    // Desktop nav tabs
    const desktopTabs = this.container.querySelectorAll('.nav-tab-btn');
    desktopTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });

    // Mobile nav tabs
    const mobileTabs = this.container.querySelectorAll('.mobile-tab-btn');
    mobileTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });
  }

  _closeDrawer() {
    this.isDrawerOpen = false;
    const drawer = this.container?.querySelector('#mobile-drawer');
    if (drawer) drawer.classList.add('hidden');
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.AppShell = AppShell;
}
if (typeof window !== 'undefined') {
  window.AppShell = AppShell;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AppShell };
  module.exports.default = AppShell;
}

export default AppShell;

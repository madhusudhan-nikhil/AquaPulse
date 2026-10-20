/**
 * AquaPulse Interactive Flow Canvas Component (10x Edition)
 *
 * Major Overhaul Features:
 * 1. Realistic Hardware Rendering:
 *    - Dual-compartment canister/internal filter with visible mechanical sponge & bio-ceramic media.
 *    - Powerhead motor with pulsing telemetry status LED and venturi bubble nozzle.
 *    - Submersible heater with glowing nichrome coils and thermal convection shimmer waves.
 *    - Overhead full-spectrum LED bar with realistic light beam cones and photoperiod telemetry.
 * 2. Three Lighting Spectrum Modes (Daylight 6500K, Sunset 3000K, Moonlight 460nm).
 * 3. Living Fish Locomotion & Flow Reaction AI:
 *    - Organic morphology (Angelfish, Tetras with iridescent stripes, Denison Barbs, Corydoras with barbels, Bettas).
 *    - Articulated multi-segment tail waggle physics and schooling cohesion.
 *    - Rheotaxis: high-flow lovers swim against current; low-flow fish retreat to shelter pockets.
 * 4. Rich Aquascape & Hydrodynamic Physics:
 *    - Branching Spiderwood with Anubias clusters and swayed moss pads.
 *    - Swaying background Vallisneria and emersed trailing Pothos riparium roots.
 *    - Dynamic caustic prisms dancing on wood and textured substrate pebbles.
 *    - Interactive click HUD for equipment, fish species, and feeding drop zones.
 */

// Universal import for FlowEngine
let FlowEngine;
if (typeof require !== 'undefined') {
  try {
    FlowEngine = require('../../engines/flow-engine.js');
    if (FlowEngine.FlowEngine) FlowEngine = FlowEngine.FlowEngine;
  } catch (_) {}
}
if (!FlowEngine && typeof globalThis !== 'undefined' && globalThis.FlowEngine) {
  FlowEngine = globalThis.FlowEngine;
}

export class FlowCanvas {
  /**
   * @param {Object} [options]
   * @param {AquaPulseStore} [options.store]
   * @param {EventBus} [options.eventBus]
   * @param {string} [options.mode='current']
   * @param {string} [options.lighting='daylight']
   * @param {Object} [options.layers]
   */
  constructor(options = {}) {
    this.store = options.store || null;
    this.eventBus = options.eventBus || null;

    this.mode = options.mode || 'current'; // 'current' | 'baffled'
    this.lighting = options.lighting || 'daylight'; // 'daylight' | 'sunset' | 'moonlight'

    this.layers = {
      equipment: true,
      hardscape: true,
      streamlines: true,
      heatmap: false,
      fish: true,
      bubbles: true,
      caustics: true,
      feedingZones: false,
      ...(options.layers || {})
    };

    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.width = 800;
    this.height = 384;

    this.particles = [];
    this.caustics = [];
    this.fishList = [];
    this.foodParticles = [];
    this.selectedEntity = null; // Equipment or Fish inspector state

    this._animId = null;
    this._isPaused = false;
    this._isVisible = true;
    this._resizeObserver = null;
    this._intersectionObserver = null;
    this._boundVisibilityChange = this._handleVisibilityChange.bind(this);
    this._boundResize = this._handleResize.bind(this);
    this._boundClick = this._handleCanvasClick.bind(this);
  }

  mount(container) {
    this.container = container;

    if (typeof document !== 'undefined' && container && typeof container.appendChild === 'function') {
      this._buildDOM();
      this._initObservers();
    }

    this._initPhysics();

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', this._boundVisibilityChange);
      window.addEventListener('resize', this._boundResize);
    }

    this.resume();
  }

  unmount() {
    this.pause();

    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this._boundVisibilityChange);
      window.removeEventListener('resize', this._boundResize);
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      this._intersectionObserver = null;
    }

    if (this.canvas) {
      this.canvas.removeEventListener('click', this._boundClick);
    }

    if (this.container && typeof this.container.innerHTML === 'string') {
      this.container.innerHTML = '';
    }

    this.container = null;
    this.canvas = null;
    this.ctx = null;
  }

  _buildDOM() {
    this.container.innerHTML = `
      <div class="flow-canvas-wrapper relative w-full flex flex-col rounded-2xl overflow-hidden bg-slate-950 border border-cyan-900/40 shadow-2xl">
        <!-- Top Pro Control Toolbar -->
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 text-xs select-none">
          
          <!-- Flow Mode Switcher -->
          <div class="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button type="button" data-mode="current" class="flow-mode-btn px-3 py-1 rounded-lg font-semibold transition-all ${this.mode === 'current' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}">
              ⚡ Venturi Jet (1750 L/h)
            </button>
            <button type="button" data-mode="baffled" class="flow-mode-btn px-3 py-1 rounded-lg font-semibold transition-all ${this.mode === 'baffled' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}">
              🔄 45° Baffled Convection
            </button>
          </div>

          <!-- Lighting Spectrum Selector -->
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button type="button" data-light="daylight" class="light-mode-btn px-2.5 py-1 rounded-lg font-semibold transition-all ${this.lighting === 'daylight' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}" title="6500K Crisp Full-Spectrum Daylight">
              ☀️ Day
            </button>
            <button type="button" data-light="sunset" class="light-mode-btn px-2.5 py-1 rounded-lg font-semibold transition-all ${this.lighting === 'sunset' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}" title="3000K Warm Dusk Ramp-Down">
              🌅 Sunset
            </button>
            <button type="button" data-light="moonlight" class="light-mode-btn px-2.5 py-1 rounded-lg font-semibold transition-all ${this.lighting === 'moonlight' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}" title="460nm Actinic Night Glow">
              🌙 Night
            </button>
          </div>

          <!-- Layer Toggles -->
          <div class="flex items-center gap-2 overflow-x-auto py-0.5">
            <label class="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-300">
              <input type="checkbox" data-layer="equipment" class="layer-toggle rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.layers.equipment ? 'checked' : ''}>
              <span>⚙️ Hardware</span>
            </label>
            <label class="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-300">
              <input type="checkbox" data-layer="fish" class="layer-toggle rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.layers.fish ? 'checked' : ''}>
              <span>🐠 Living Fish</span>
            </label>
            <label class="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-300">
              <input type="checkbox" data-layer="streamlines" class="layer-toggle rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.layers.streamlines ? 'checked' : ''}>
              <span>🌊 Streamlines</span>
            </label>
            <label class="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-300">
              <input type="checkbox" data-layer="heatmap" class="layer-toggle rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.layers.heatmap ? 'checked' : ''}>
              <span>🌡️ Heatmap</span>
            </label>
            <label class="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-300">
              <input type="checkbox" data-layer="feedingZones" class="layer-toggle rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.layers.feedingZones ? 'checked' : ''}>
              <span>🍽️ Drop Zones</span>
            </label>
          </div>
        </div>

        <!-- Canvas Viewport -->
        <div class="canvas-viewport relative w-full h-[360px] sm:h-[440px] md:h-[520px] bg-gradient-to-b from-slate-950 via-cyan-950/20 to-slate-950 overflow-hidden">
          <canvas id="flow-particles-canvas" class="w-full h-full block cursor-pointer"></canvas>

          <!-- Interactive Inspector Modal / HUD Overlay -->
          <div id="canvas-hud-overlay" class="absolute top-4 left-4 z-30 hidden max-w-sm p-3.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-cyan-400/40 shadow-2xl text-xs space-y-2 animate-fade-in">
            <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span id="hud-title" class="font-bold text-cyan-300 flex items-center gap-1.5"></span>
              <button type="button" id="hud-close-btn" class="text-slate-400 hover:text-white font-bold px-1">✕</button>
            </div>
            <div id="hud-body" class="text-slate-300 text-[11px] leading-relaxed"></div>
          </div>

          <!-- Bottom Telemetry HUD Bar -->
          <div class="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 text-[11px] text-slate-200">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span id="flow-status-text">${this.mode === 'current' ? 'High-Velocity Venturi Jet Active (1750 L/h)' : 'Baffled Convection Gyre: Calm Upper Film'}</span>
            </div>
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[10px] text-slate-400">
              <span>💡 Click on any equipment, fish, or zone to inspect details</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#flow-particles-canvas');
    if (this.canvas && typeof this.canvas.getContext === 'function') {
      this.ctx = this.canvas.getContext('2d');
      this.canvas.addEventListener('click', this._boundClick);
    }

    const hudClose = this.container.querySelector('#hud-close-btn');
    if (hudClose) {
      hudClose.addEventListener('click', () => {
        this._hideHUD();
      });
    }

    this._attachControlListeners();
    this._handleResize();
  }

  _attachControlListeners() {
    if (!this.container) return;

    // Mode buttons
    const modeBtns = this.container.querySelectorAll('.flow-mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const selectedMode = btn.getAttribute('data-mode');
        this.setFlowMode(selectedMode);
      });
    });

    // Lighting buttons
    const lightBtns = this.container.querySelectorAll('.light-mode-btn');
    lightBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const selectedLight = btn.getAttribute('data-light');
        this.setLighting(selectedLight);
      });
    });

    // Layer checkboxes
    const checkboxes = this.container.querySelectorAll('.layer-toggle');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const layer = cb.getAttribute('data-layer');
        this.toggleLayer(layer, cb.checked);
      });
    });
  }

  _initObservers() {
    if (typeof ResizeObserver !== 'undefined' && this.container) {
      this._resizeObserver = new ResizeObserver(() => {
        this._handleResize();
      });
      this._resizeObserver.observe(this.container);
    }

    if (typeof IntersectionObserver !== 'undefined' && this.canvas) {
      this._intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          this._isVisible = entry.isIntersecting;
          if (this._isVisible) {
            this.resume();
          } else {
            this.pause();
          }
        }
      }, { threshold: 0.05 });
      this._intersectionObserver.observe(this.canvas);
    }
  }

  _handleVisibilityChange() {
    if (typeof document !== 'undefined') {
      if (document.hidden || document.visibilityState === 'hidden') {
        this.pause();
      } else if (this._isVisible) {
        this.resume();
      }
    }
  }

  _handleResize() {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || this.canvas.parentElement?.offsetWidth || 800;
    const h = rect.height || this.canvas.parentElement?.offsetHeight || 384;

    this.width = Math.max(200, Math.round(w));
    this.height = Math.max(150, Math.round(h));

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);

    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  _initPhysics() {
    if (FlowEngine && typeof FlowEngine.initParticles === 'function') {
      this.particles = FlowEngine.initParticles(120, this.width, this.height, this.mode);
    } else {
      this.particles = [];
      for (let i = 0; i < 100; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height * 0.7 + 20,
          vx: -(Math.random() * 4 + 2),
          vy: (Math.random() - 0.5) * 1.0,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.3,
          life: Math.floor(Math.random() * 100)
        });
      }
    }

    // Initialize caustics bands
    this.caustics = [];
    for (let i = 0; i < 10; i++) {
      this.caustics.push({
        x: (i / 10) * this.width,
        width: 30 + Math.random() * 40,
        speed: 0.006 + Math.random() * 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Inhabitant fish roster with morphology and flow preferences
    this.fishList = [
      { id: 'angel-koi', name: 'Koi Angelfish', species: 'cichlid', count: 4, baseX: 0.40, baseY: 0.42, color: '#f59e0b', secondaryColor: '#ffffff', tailSpeed: 2.2, size: 22, flowPreference: 'moderate', zone: 'mid' },
      { id: 'angel-zebra', name: 'Blue Zebra Angelfish', species: 'cichlid', count: 8, baseX: 0.56, baseY: 0.45, color: '#64748b', secondaryColor: '#38bdf8', tailSpeed: 2.0, size: 20, flowPreference: 'moderate', zone: 'mid' },
      { id: 'denison-barb', name: 'Denison Barb', species: 'barb', count: 8, baseX: 0.65, baseY: 0.22, color: '#e11d48', secondaryColor: '#facc15', tailSpeed: 6.0, size: 18, flowPreference: 'high', zone: 'mid' },
      { id: 'rainbow', name: "Boeseman's Rainbow", species: 'rainbow', count: 8, baseX: 0.60, baseY: 0.34, color: '#0284c7', secondaryColor: '#f59e0b', tailSpeed: 4.5, size: 17, flowPreference: 'high', zone: 'mid' },
      { id: 'neon-tetra', name: 'Neon Tetra', species: 'tetra', count: 15, isSchooler: true, baseX: 0.28, baseY: 0.38, color: '#06b6d4', secondaryColor: '#ef4444', tailSpeed: 4.8, size: 12, flowPreference: 'moderate', zone: 'mid' },
      { id: 'silvertip', name: 'Silver Tip Tetra', species: 'tetra', count: 11, isSchooler: true, baseX: 0.35, baseY: 0.48, color: '#f59e0b', secondaryColor: '#f8fafc', tailSpeed: 4.5, size: 13, flowPreference: 'moderate', zone: 'mid' },
      { id: 'betta-female', name: 'Female Betta', species: 'betta', count: 3, baseX: 0.22, baseY: 0.26, baffledX: 0.18, baffledY: 0.22, color: '#ec4899', secondaryColor: '#a855f7', tailSpeed: 1.6, size: 14, flowPreference: 'low', zone: 'top' },
      { id: 'dwarf-gourami', name: 'Dwarf Red Gourami', species: 'gourami', count: 1, baseX: 0.85, baseY: 0.82, baffledX: 0.25, baffledY: 0.25, color: '#f43f5e', secondaryColor: '#38bdf8', tailSpeed: 1.4, size: 16, flowPreference: 'low', zone: 'top' },
      { id: 'corydoras', name: 'Albino Corydoras', species: 'cory', count: 6, baseX: 0.25, baseY: 0.90, color: '#fde047', secondaryColor: '#fbcfe8', tailSpeed: 2.2, size: 13, flowPreference: 'low', zone: 'bottom' }
    ];
  }

  setFlowMode(mode) {
    if (mode !== 'current' && mode !== 'baffled') return;
    this.mode = mode;

    if (this.store) {
      this.store.setState('simulation.mode', mode);
    }
    if (this.eventBus) {
      this.eventBus.emit('flow:mode_changed', { mode });
    }

    if (this.container) {
      const modeBtns = this.container.querySelectorAll('.flow-mode-btn');
      modeBtns.forEach(btn => {
        const isCurrent = btn.getAttribute('data-mode') === mode;
        btn.className = `flow-mode-btn px-3 py-1 rounded-lg font-semibold transition-all ${isCurrent ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`;
      });

      const statusText = this.container.querySelector('#flow-status-text');
      if (statusText) {
        statusText.textContent = mode === 'current'
          ? 'High-Velocity Venturi Jet Active (1750 L/h)'
          : 'Baffled Convection Gyre: Calm Upper Film';
      }
    }
  }

  setLighting(light) {
    if (!FlowEngine.LIGHTING_MODES[light]) return;
    this.lighting = light;

    if (this.container) {
      const lightBtns = this.container.querySelectorAll('.light-mode-btn');
      lightBtns.forEach(btn => {
        const isSelected = btn.getAttribute('data-light') === light;
        const colorClass = light === 'daylight' ? 'bg-amber-400 text-slate-950' : light === 'sunset' ? 'bg-amber-500 text-slate-950' : 'bg-indigo-500 text-white';
        btn.className = `light-mode-btn px-2.5 py-1 rounded-lg font-semibold transition-all ${isSelected ? colorClass + ' shadow' : 'text-slate-400 hover:text-slate-200'}`;
      });
    }
  }

  toggleLayer(layer, isEnabled) {
    if (this.layers[layer] !== undefined) {
      this.layers[layer] = isEnabled !== undefined ? isEnabled : !this.layers[layer];
      if (this.eventBus) {
        this.eventBus.emit('flow:layer_toggled', { layer, enabled: this.layers[layer] });
      }
    }
  }

  tick() {
    if (this._isPaused || !this._isVisible) return;

    this._updatePhysics();
    this.draw();

    if (typeof requestAnimationFrame !== 'undefined') {
      this._animId = requestAnimationFrame(() => this.tick());
    }
  }

  resume() {
    this._isPaused = false;
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (typeof requestAnimationFrame !== 'undefined') {
      this.tick();
    }
  }

  pause() {
    this._isPaused = true;
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  _updatePhysics() {
    // 1. Fluid particles
    if (FlowEngine && typeof FlowEngine.updatePhysics === 'function') {
      FlowEngine.updatePhysics(this.particles, this.mode, { width: this.width, height: this.height });
    }

    // 2. Living fish AI kinematics
    if (FlowEngine && typeof FlowEngine.updateFishAI === 'function') {
      FlowEngine.updateFishAI(this.fishList, this.mode, this.width, this.height);
    }

    // 3. Floating/sinking food particles
    for (let i = this.foodParticles.length - 1; i >= 0; i--) {
      const f = this.foodParticles[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += f.gravity;
      f.life++;

      // Drift in current
      if (this.mode === 'current' && f.y < this.height * 0.4) {
        f.vx -= 0.08;
      }

      if (f.y >= this.height * 0.90 || f.life > 300) {
        this.foodParticles.splice(i, 1);
      }
    }
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const lightScheme = FlowEngine.LIGHTING_MODES[this.lighting] || FlowEngine.LIGHTING_MODES.daylight;

    // 1. Water atmosphere gradient & surface ripples
    this._drawWaterAtmosphere(ctx, w, h, lightScheme);

    // 2. Caustics light network
    if (this.layers.caustics) {
      this._drawCaustics(ctx, w, h, lightScheme);
    }

    // 3. Procedural Aquascape (Substrate, Spiderwood, Moss, Anubias, River Stones, Plants)
    if (this.layers.hardscape) {
      this._drawAquascape(ctx, w, h, lightScheme);
    }

    // 4. Realistic Equipment Layer (Dual Canister Filter, Heater with convection, Overhead LED)
    if (this.layers.equipment) {
      this._drawEquipment(ctx, w, h, lightScheme);
    }

    // 5. Velocity Heatmap overlay
    if (this.layers.heatmap) {
      this._drawVelocityHeatmap(ctx, w, h);
    }

    // 6. Fluid streamlines
    if (this.layers.streamlines) {
      this._drawStreamlines(ctx, w, h);
    }

    // 7. Micro aeration bubbles
    if (this.layers.bubbles) {
      this._drawBubbles(ctx);
    }

    // 8. Living fish with articulated tail waggle and species morphology
    if (this.layers.fish) {
      this._drawFishPresence(ctx, w, h);
    }

    // 9. Interactive feeding drop zones (if enabled)
    if (this.layers.feedingZones) {
      this._drawFeedingDropZones(ctx, w, h);
    }

    // 10. Food particles drifting
    this._drawFoodParticles(ctx);
  }

  _drawWaterAtmosphere(ctx, w, h, light) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, light.ambientTop);
    grad.addColorStop(0.5, light.ambientMid);
    grad.addColorStop(1, light.ambientBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Dynamic water surface meniscus with ripples
    ctx.save();
    ctx.strokeStyle = light.shimmerColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const time = Date.now() * 0.002;
    for (let x = 0; x <= w; x += 15) {
      const y = 8 + Math.sin(time + x * 0.025) * 2.2;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawCaustics(ctx, w, h, light) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const time = Date.now() * 0.001;

    for (const c of this.caustics) {
      c.phase += c.speed;
      const curX = (c.x + Math.sin(c.phase) * 40) % (w + 60);
      const grad = ctx.createLinearGradient(curX, 0, curX + c.width * 0.6, h * 0.75);
      grad.addColorStop(0, light.lightRayColor);
      grad.addColorStop(0.5, 'rgba(103, 232, 249, 0.03)');
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(curX, 0);
      ctx.lineTo(curX + c.width, 0);
      ctx.lineTo(curX + c.width * 1.6 + Math.sin(time + curX * 0.01) * 22, h * 0.80);
      ctx.lineTo(curX - c.width * 0.4, h * 0.80);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawAquascape(ctx, w, h, light) {
    ctx.save();

    // 1. Background swaying Vallisneria ribbon plants
    const time = Date.now() * 0.0015;
    const plantColor = this.lighting === 'moonlight' ? 'rgba(30, 64, 175, 0.35)' : 'rgba(16, 185, 129, 0.30)';
    ctx.strokeStyle = plantColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    for (let p = 0; p < 6; p++) {
      const bx = (w * 0.08) + (p * 28);
      const by = h * 0.90;
      const ph = h * (0.45 + (p % 3) * 0.12);
      const sway = Math.sin(time + p) * 16;

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sway * 0.5, by - ph * 0.5, bx + sway, by - ph);
      ctx.stroke();
    }

    // 2. Emersed trailing Pothos riparium roots entering from top rim
    const rootX = w * 0.72;
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
    ctx.lineWidth = 1.6;
    for (let r = 0; r < 5; r++) {
      const rx = rootX + (r * 9);
      const rSway = Math.sin(time * 0.8 + r) * 6;
      ctx.beginPath();
      ctx.moveTo(rx, 8);
      ctx.bezierCurveTo(rx + rSway * 0.5, 40, rx - rSway * 0.5, 80, rx + rSway, h * 0.30);
      ctx.stroke();
    }

    // 3. Multi-layer textured gravel substrate
    const subY = h * 0.90;
    const subGrad = ctx.createLinearGradient(0, subY - 10, 0, h);
    subGrad.addColorStop(0, '#1e293b');
    subGrad.addColorStop(0.3, '#0f172a');
    subGrad.addColorStop(1, '#020617');
    ctx.fillStyle = subGrad;

    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, subY);
    ctx.bezierCurveTo(w * 0.30, subY - 8, w * 0.60, subY + 6, w, subY - 4);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Gravel pebbles
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    for (let i = 0; i < 28; i++) {
      const px = (i / 28) * w + ((i * 31) % 18);
      const py = subY + ((i * 17) % 24);
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Central Spiderwood Island
    const trunkX = w * 0.46;
    const trunkY = subY;

    // Wood gradient
    const woodGrad = ctx.createLinearGradient(trunkX, trunkY, trunkX + 30, h * 0.35);
    woodGrad.addColorStop(0, '#381c08');
    woodGrad.addColorStop(0.5, '#5c2d12');
    woodGrad.addColorStop(1, '#7c3a0e');

    ctx.strokeStyle = woodGrad;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Main Trunk
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(trunkX, trunkY);
    ctx.bezierCurveTo(trunkX - 15, h * 0.72, trunkX + 20, h * 0.58, trunkX, h * 0.46);
    ctx.stroke();

    // Left Branch (Zone A shelter)
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(trunkX - 5, h * 0.62);
    ctx.bezierCurveTo(trunkX - 45, h * 0.56, w * 0.34, h * 0.50, w * 0.28, h * 0.44);
    ctx.stroke();

    // Right Horizontal Branch (Holding moss into current)
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(trunkX + 6, h * 0.58);
    ctx.bezierCurveTo(trunkX + 50, h * 0.54, w * 0.60, h * 0.48, w * 0.66, h * 0.52);
    ctx.stroke();

    // Java Moss Clump swaying in stream
    const mossX = w * 0.62;
    const mossY = h * 0.50;
    const mossSway = Math.sin(time * 3) * 2;
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(mossX, mossY, 22, 13, mossSway * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Moss highlights
    ctx.fillStyle = '#22c55e';
    for (let m = 0; m < 6; m++) {
      ctx.beginPath();
      ctx.arc(mossX - 10 + (m * 4) + mossSway, mossY - 4 + ((m * 5) % 8), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Anubias Epiphytes mounted on wood joints
    const leafClusters = [
      { x: trunkX - 10, y: h * 0.58, angle: -0.4 },
      { x: trunkX + 10, y: h * 0.48, angle: 0.3 },
      { x: w * 0.32, y: h * 0.46, angle: -0.5 }
    ];

    leafClusters.forEach(c => {
      this._drawAnubiasCluster(ctx, c.x, c.y, c.angle);
    });

    // 5. Basalt River Boulder Sanctuary
    this._drawRiverRock(ctx, w * 0.38, subY, 32, 16, '#1e293b', '#475569');
    this._drawRiverRock(ctx, w * 0.54, subY + 2, 36, 18, '#0f172a', '#334155');
    this._drawRiverRock(ctx, w * 0.46, subY + 4, 24, 12, '#334155', '#64748b');

    ctx.restore();
  }

  _drawAnubiasCluster(ctx, cx, cy, baseAngle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(baseAngle);

    const leaves = [-0.4, -0.1, 0.25, 0.5];
    leaves.forEach(ang => {
      ctx.save();
      ctx.rotate(ang);
      const leafGrad = ctx.createLinearGradient(0, 0, 18, -6);
      leafGrad.addColorStop(0, '#064e3b');
      leafGrad.addColorStop(0.6, '#047857');
      leafGrad.addColorStop(1, '#10b981');
      ctx.fillStyle = leafGrad;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(8, -8, 22, -3);
      ctx.quadraticCurveTo(26, 0, 22, 3);
      ctx.quadraticCurveTo(8, 8, 0, 0);
      ctx.fill();

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  }

  _drawRiverRock(ctx, rx, ry, rw, rh, cDark, cLight) {
    ctx.save();
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(rx, ry + rh * 0.4, rw * 1.05, rh * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock body
    const rGrad = ctx.createRadialGradient(rx - rw * 0.2, ry - rh * 0.3, rh * 0.2, rx, ry, rw);
    rGrad.addColorStop(0, cLight);
    rGrad.addColorStop(0.7, cDark);
    rGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = rGrad;

    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(rx - rw * 0.1, ry - rh * 0.3, rw * 0.6, rh * 0.3, -0.1, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Realistic Hardware Rendering:
   * - Dual-Canister internal filter unit with visible media cups
   * - Powerhead motor with pulsing telemetry LED & outflow venturi nozzle
   * - Submersible titanium heater with nichrome glow & thermal shimmer
   * - Overhead full-spectrum LED light bar
   */
  _drawEquipment(ctx, w, h, light) {
    ctx.save();
    const bounds = FlowEngine.getEquipmentBounds(w, h);

    // 1. Overhead LED Light Fixture Bar
    const led = bounds.led;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(led.x, led.y, led.w, led.h, 3) : ctx.rect(led.x, led.y, led.w, led.h);
    ctx.fill();
    ctx.stroke();

    // Emitted LED light array dots
    const ledColor = this.lighting === 'daylight' ? '#38bdf8' : this.lighting === 'sunset' ? '#f59e0b' : '#6366f1';
    ctx.fillStyle = ledColor;
    for (let lx = led.x + 15; lx < led.x + led.w - 15; lx += 22) {
      ctx.beginPath();
      ctx.arc(lx, led.y + led.h - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Submersible Heater
    const heater = bounds.heater;
    // Glass cylinder
    const heatGrad = ctx.createLinearGradient(heater.x, heater.y, heater.x + heater.w, heater.y);
    heatGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
    heatGrad.addColorStop(0.5, 'rgba(51, 65, 85, 0.50)');
    heatGrad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
    ctx.fillStyle = heatGrad;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(heater.x, heater.y, heater.w, heater.h, 6) : ctx.rect(heater.x, heater.y, heater.w, heater.h);
    ctx.fill();
    ctx.stroke();

    // Glowing Nichrome heating coil filament
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const coilYStart = heater.y + 20;
    const coilYEnd = heater.y + heater.h - 15;
    for (let cy = coilYStart; cy < coilYEnd; cy += 6) {
      ctx.moveTo(heater.x + 3, cy);
      ctx.lineTo(heater.x + heater.w - 3, cy + 3);
    }
    ctx.stroke();

    // Thermal convection shimmer rising above heater
    const time = Date.now() * 0.003;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let ty = heater.y - 5; ty > 15; ty -= 5) {
      const tx = heater.x + heater.w * 0.5 + Math.sin(time + ty * 0.08) * 3;
      if (ty === heater.y - 5) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.stroke();

    // 3. Wide Dual-Canister Internal Filter Unit
    const filter = bounds.filter;
    // Motorhead (top block)
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(filter.x, filter.y, filter.w, 42, [8, 8, 2, 2]) : ctx.rect(filter.x, filter.y, filter.w, 42);
    ctx.fill();
    ctx.stroke();

    // Motor telemetry status LED (pulsing cyan)
    const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
    ctx.fillStyle = `rgba(6, 182, 212, ${pulse})`;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(filter.x + filter.w - 14, filter.y + 14, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Powerhead impeller label
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('1750 L/h', filter.x + 8, filter.y + 18);
    ctx.font = '8px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('DUAL CUP', filter.x + 8, filter.y + 30);

    // Outflow Nozzle shooting left
    const nozzleX = filter.x;
    const nozzleY = filter.y + 22;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(nozzleX, nozzleY - 7);
    ctx.lineTo(nozzleX - 16, nozzleY - 10);
    ctx.lineTo(nozzleX - 16, nozzleY + 10);
    ctx.lineTo(nozzleX, nozzleY + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Clear transparent Canister Body with dual media cups
    const bodyY = filter.y + 44;
    const bodyH = filter.h - 44;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.70)';
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(filter.x + 2, bodyY, filter.w - 4, bodyH, [2, 2, 6, 6]) : ctx.rect(filter.x + 2, bodyY, filter.w - 4, bodyH);
    ctx.fill();
    ctx.stroke();

    // Media Cup A: Mechanical Coarse Sponge (Dark porous block)
    const cupAH = bodyH * 0.46;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(filter.x + 6, bodyY + 4, filter.w - 12, cupAH, 4) : ctx.rect(filter.x + 6, bodyY + 4, filter.w - 12, cupAH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('CUP A: SPONGE', filter.x + 9, bodyY + 16);

    // Media Cup B: Biological Ceramic Bio-Rings
    const cupBY = bodyY + cupAH + 8;
    const cupBH = bodyH - cupAH - 12;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(filter.x + 6, cupBY, filter.w - 12, cupBH, 4) : ctx.rect(filter.x + 6, cupBY, filter.w - 12, cupBH);
    ctx.fill();
    ctx.stroke();

    // Ceramic rings texture dots
    ctx.fillStyle = 'rgba(248, 250, 252, 0.75)';
    for (let r = 0; r < 8; r++) {
      const rx = filter.x + 12 + ((r * 11) % (filter.w - 24));
      const ry = cupBY + 10 + (Math.floor(r / 3) * 12);
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#34d399';
    ctx.fillText('CUP B: CERAMIC', filter.x + 9, cupBY + cupBH - 6);

    ctx.restore();
  }

  _drawVelocityHeatmap(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.28;

    if (this.mode === 'current') {
      // High-velocity jet stream (Red/Orange)
      const jetGrad = ctx.createRadialGradient(w - 150, h * 0.15, 10, w * 0.35, h * 0.20, w * 0.5);
      jetGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
      jetGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.65)');
      jetGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = jetGrad;
      ctx.fillRect(0, 0, w, h);

      // Slack calm pocket under filter (Emerald sanctuary)
      const slackGrad = ctx.createRadialGradient(w - 75, h * 0.78, 5, w - 75, h * 0.78, 130);
      slackGrad.addColorStop(0, 'rgba(16, 185, 129, 0.85)');
      slackGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = slackGrad;
      ctx.beginPath();
      ctx.arc(w - 75, h * 0.78, 130, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Baffled convection gyre
      const convGrad = ctx.createRadialGradient(w * 0.5, h * 0.46, 25, w * 0.5, h * 0.46, w * 0.42);
      convGrad.addColorStop(0, 'transparent');
      convGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.65)');
      convGrad.addColorStop(1, 'rgba(16, 185, 129, 0.45)');
      ctx.fillStyle = convGrad;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  _drawStreamlines(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = this.mode === 'current' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(45, 212, 191, 0.35)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = -Date.now() * 0.024;

    const lines = FlowEngine.getStreamlines(this.mode, w, h);
    for (const l of lines) {
      ctx.beginPath();
      if (l.type === 'bezier') {
        ctx.moveTo(l.start.x, l.start.y);
        ctx.bezierCurveTo(l.cp1.x, l.cp1.y, l.cp2.x, l.cp2.y, l.end.x, l.end.y);
      } else if (l.type === 'ellipse') {
        ctx.ellipse(l.cx, l.cy, l.rx, l.ry, 0, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawBubbles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(165, 243, 252, ${p.alpha || 0.65})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size || 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight dot
      ctx.fillStyle = `rgba(255, 255, 255, ${(p.alpha || 0.65) * 0.9})`;
      ctx.beginPath();
      ctx.arc(p.x - (p.size || 1.6) * 0.3, p.y - (p.size || 1.6) * 0.3, (p.size || 1.6) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Living fish locomotion & morphological silhouette rendering:
   * Angelfish, Neon Tetras (with glowing lateral stripe), Denison Barbs, Corydoras, Bettas
   */
  _drawFishPresence(ctx, w, h) {
    ctx.save();

    for (const f of this.fishList) {
      const px = f.x * w;
      const py = (f.y + (f.hoverOffset || 0)) * h;

      // Facing orientation: rheotaxis (orient into flow when in current mode)
      const isFacingLeft = this.mode === 'current' || f.x > 0.45;

      ctx.save();
      ctx.translate(px, py);
      if (!isFacingLeft) ctx.scale(-1, 1);

      // Tail oscillation waggle
      const tailAngle = f.currentTailAngle || 0;

      // Render species-specific anatomical morphology
      this._renderSpeciesMorphology(ctx, f, tailAngle);

      ctx.restore(); // reset local translation

      // Name & count badge
      this._renderFishBadge(ctx, f, px, py);
    }

    ctx.restore();
  }

  _renderSpeciesMorphology(ctx, f, tailAngle) {
    const s = f.size || 16;

    if (f.species === 'cichlid') {
      // Angelfish: Majestic vertical diamond body, high dorsal fin, thread pelvic fins
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, 0);
      ctx.lineTo(0, -s * 0.9); // Tall dorsal peak
      ctx.lineTo(s * 0.6, 0);   // Nose
      ctx.lineTo(0, s * 0.9);  // Deep belly
      ctx.closePath();
      ctx.fill();

      // Long thread-like pelvic fins
      ctx.strokeStyle = f.secondaryColor || '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.8);
      ctx.lineTo(-s * 0.2, s * 1.5);
      ctx.stroke();

      // Tail
      ctx.save();
      ctx.translate(-s * 0.5, 0);
      ctx.rotate(tailAngle);
      ctx.fillStyle = `${f.color}80`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.6, -s * 0.5);
      ctx.lineTo(-s * 0.4, 0);
      ctx.lineTo(-s * 0.6, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else if (f.species === 'tetra') {
      // Neon Tetra: Torpedo shape with glowing iridescent blue-green stripe & red belly
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.65, s * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing iridescent electric blue lateral line
      ctx.strokeStyle = '#22d3ee';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 4;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -1);
      ctx.lineTo(s * 0.4, -1);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Vivid red posterior tail section
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.5, 0);
      ctx.lineTo(-s * 0.5, s * 0.25);
      ctx.lineTo(0, s * 0.25);
      ctx.closePath();
      ctx.fill();

      // Articulated tail fin
      ctx.save();
      ctx.translate(-s * 0.55, 0);
      ctx.rotate(tailAngle);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.6)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.45, -s * 0.3);
      ctx.lineTo(-s * 0.3, 0);
      ctx.lineTo(-s * 0.45, s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else if (f.species === 'cory') {
      // Corydoras: Downward-angled head, flat belly, whisker barbels
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.7, s * 0.4, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Whiskers (barbels) at mouth
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s * 0.5, 2);
      ctx.lineTo(s * 0.75, 5);
      ctx.stroke();

      // Oscillating caudal tail
      ctx.save();
      ctx.translate(-s * 0.6, 0);
      ctx.rotate(tailAngle);
      ctx.fillStyle = `${f.color}90`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.5, -s * 0.35);
      ctx.lineTo(-s * 0.3, 0);
      ctx.lineTo(-s * 0.5, s * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else {
      // Default sleek community fish (Barbs, Bettas, Rainbows)
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.75, s * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(s * 0.4, -1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Oscillating caudal tail
      ctx.save();
      ctx.translate(-s * 0.65, 0);
      ctx.rotate(tailAngle);
      ctx.fillStyle = `${f.color}80`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.55, -s * 0.4);
      ctx.lineTo(-s * 0.35, 0);
      ctx.lineTo(-s * 0.55, s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _renderFishBadge(ctx, f, px, py) {
    const text = `${f.name} (x${f.count})`;
    ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + 14;
    const boxH = 17;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(px - boxW / 2, py - boxH / 2, boxW, boxH, 6) : ctx.rect(px - boxW / 2, py - boxH / 2, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, px, py);

    // Comfort indicator badge
    if (f.flowPreference === 'low') {
      const isStressed = this.mode === 'current';
      ctx.font = '8px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = isStressed ? '#f43f5e' : '#34d399';
      ctx.fillText(isStressed ? '⚠️ Sheltering under filter' : '✅ Roaming Canopy', px, py + 14);
    } else if (f.flowPreference === 'high') {
      ctx.font = '8px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('⚡ Cruising Jet Stream', px, py + 14);
    }
  }

  _drawFeedingDropZones(ctx, w, h) {
    ctx.save();
    const zones = [
      { id: 'zone-a', name: '🎯 Zone A: Surface Canopy', x: w * 0.22, y: h * 0.18, color: '#06b6d4' },
      { id: 'zone-b', name: '🎯 Zone B: Moss Jet Stream', x: w * 0.62, y: h * 0.32, color: '#e11d48' },
      { id: 'zone-c', name: '🎯 Zone C: Mid-Front Glass', x: w * 0.44, y: h * 0.55, color: '#38bdf8' },
      { id: 'zone-d', name: '🐾 Zone D: Bottom Gravel Bed', x: w * 0.25, y: h * 0.86, color: '#f59e0b' },
      { id: 'zone-e', name: '🌙 Zone E: Driftwood Undercut', x: w * 0.48, y: h * 0.78, color: '#10b981' }
    ];

    zones.forEach(z => {
      ctx.fillStyle = `${z.color}30`;
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(z.x, z.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = z.color;
      ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(z.name.split(':')[0], z.x, z.y + 3);
    });
    ctx.restore();
  }

  _drawFoodParticles(ctx) {
    ctx.save();
    for (const f of this.foodParticles) {
      ctx.fillStyle = f.color || '#f59e0b';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size || 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Drops animated food particles into the tank at coordinates
   * @param {number} x
   * @param {number} y
   */
  dropFood(x, y) {
    for (let i = 0; i < 8; i++) {
      this.foodParticles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0.4 + Math.random() * 0.6,
        gravity: 0.02,
        size: 1.8 + Math.random() * 1.5,
        color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
        life: 0
      });
    }
  }

  _handleCanvasClick(event) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Check equipment click
    const bounds = FlowEngine.getEquipmentBounds(this.width, this.height);
    if (this._isPointInRect(clickX, clickY, bounds.filter)) {
      this._showHUD('⚙️ 1750 L/h Dual Canister Filter', `
        <div class="space-y-1.5">
          <p><strong class="text-cyan-300">Turnover:</strong> 1750 L/Hr (~8x hourly tank volume)</p>
          <p><strong class="text-cyan-300">Cup A:</strong> Mechanical Coarse Foam (traps suspended detritus)</p>
          <p><strong class="text-emerald-300">Cup B:</strong> Sintered Ceramic Bio-Rings (active biological nitrification)</p>
          <p class="text-amber-300">💡 Alternating Rinse: Never rinse both cups in the same week.</p>
        </div>
      `);
      return;
    }

    if (this._isPointInRect(clickX, clickY, bounds.heater)) {
      this._showHUD('🔥 200W Submersible Heater', `
        <div class="space-y-1.5">
          <p><strong class="text-cyan-300">Target Range:</strong> 25.5°C – 26.0°C</p>
          <p><strong class="text-cyan-300">Wattage:</strong> 200 Watts (Quartz Submersible)</p>
          <p><strong class="text-cyan-300">Placement:</strong> Directly beside filter intake for uniform heat dispersion.</p>
        </div>
      `);
      return;
    }

    if (this._isPointInRect(clickX, clickY, bounds.led)) {
      this._showHUD('💡 Overhead Slim Full-Spectrum LED', `
        <div class="space-y-1.5">
          <p><strong class="text-cyan-300">Photoperiod:</strong> 6.5 Hours / Day Max</p>
          <p><strong class="text-cyan-300">Spectrum:</strong> Full 6500K daylight with 460nm actinic diodes.</p>
          <p class="text-amber-300">💡 Auto Ramp: Turns off 15m prior to room lights to prevent fish jumping.</p>
        </div>
      `);
      return;
    }

    // Check fish click
    for (const f of this.fishList) {
      const fx = f.x * this.width;
      const fy = f.y * this.height;
      if (Math.hypot(clickX - fx, clickY - fy) < 25) {
        this._showHUD(`🐠 ${f.name} (x${f.count})`, `
          <div class="space-y-1.5">
            <p><strong class="text-cyan-300">Swimming Strata:</strong> ${f.zone?.toUpperCase()} column</p>
            <p><strong class="text-cyan-300">Flow Preference:</strong> <span class="capitalize font-semibold text-amber-300">${f.flowPreference} flow</span></p>
            <p><strong class="text-cyan-300">Locomotion:</strong> ${f.species === 'tetra' ? 'Synchronized schooling cluster' : f.species === 'cory' ? 'Gravel substrate benthic forager' : 'Mid-water glide'}</p>
            <p class="text-slate-300">${f.isSheltering ? '⚠️ Currently sheltering from high-velocity venturi stream.' : '✅ Actively swimming comfortably.'}</p>
          </div>
        `);
        return;
      }
    }

    // If clicked empty water, drop a pinch of food!
    this.dropFood(clickX, clickY);
    this._hideHUD();
  }

  _isPointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  _showHUD(title, html) {
    if (!this.container) return;
    const hud = this.container.querySelector('#canvas-hud-overlay');
    const hudTitle = this.container.querySelector('#hud-title');
    const hudBody = this.container.querySelector('#hud-body');
    if (hud && hudTitle && hudBody) {
      hudTitle.innerHTML = title;
      hudBody.innerHTML = html;
      hud.classList.remove('hidden');
    }
  }

  _hideHUD() {
    if (!this.container) return;
    const hud = this.container.querySelector('#canvas-hud-overlay');
    if (hud) hud.classList.add('hidden');
  }
}

// Global attachment for browser scripts
if (typeof globalThis !== 'undefined') {
  globalThis.FlowCanvas = FlowCanvas;
}
if (typeof window !== 'undefined') {
  window.FlowCanvas = FlowCanvas;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FlowCanvas };
  module.exports.default = FlowCanvas;
}

export default FlowCanvas;

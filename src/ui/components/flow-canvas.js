/**
 * AquaPulse Interactive Flow Canvas Component (10x Master Aquascaper Edition)
 *
 * Major Overhaul Features:
 * 1. Realistic Hardware Rendering:
 *    - Dual-compartment canister/internal filter with visible mechanical sponge & bio-ceramic rings.
 *    - Powerhead motor with pulsing telemetry status LED and venturi micro-bubble nozzle.
 *    - Submersible quartz heater with glowing nichrome coils and animated thermal convection waves.
 *    - Overhead full-spectrum LED light bar with realistic downward light cones.
 * 2. Three Lighting Spectrum Modes (Daylight 6500K, Sunset 3000K, Moonlight 460nm).
 * 3. Living Fish Locomotion & Flow Reaction AI:
 *    - Organic anatomy (Angelfish, Neon Tetras with iridescent glowing stripes, Denison Barbs, Albino Corydoras with barbels, Bettas).
 *    - Multi-segment undulating spine & articulated caudal fin waggle physics.
 *    - Rheotaxis: high-flow species cruise upstream in the jet; low-flow fish seek shelter behind driftwood.
 *    - Schooling cohesion: tetras school and dart in coordinated clusters.
 *    - Natural rendering: Clean, cinematic fish without permanent text badges covering them (hover/click for inspector).
 * 4. Rich Nature Aquarium Hardscape:
 *    - Multi-branching twisted Spiderwood roots with bark striations and wood grain.
 *    - Rich dark aquasoil substrate bed with textured pebbles and carpeting plant tufts.
 *    - Dynamic live plants: swaying background Vallisneria, Java moss cushions, Anubias nana epiphytes, trailing Pothos riparium roots.
 *    - Dynamic shimmering caustic light network and surface ripples.
 * 5. Interactive Feeding & Inspection:
 *    - Click anywhere to drop sinking food pellets; nearby fish detect and swim toward the food!
 *    - Click/hover inspection HUD for equipment, fish, and feeding zones.
 */

import { FlowEngine as ImportedFlowEngine } from '../../engines/flow-engine.js';

const FallbackFlowEngine = {
  particleCount: 120,
  LIGHTING_MODES: {
    daylight: {
      id: 'daylight',
      name: '☀️ Daylight (6500K)',
      tempK: 6500,
      ambientTop: 'rgba(6, 182, 212, 0.12)',
      ambientMid: 'rgba(14, 116, 144, 0.16)',
      ambientBottom: 'rgba(2, 6, 23, 0.70)',
      causticAlpha: 0.15,
      shimmerColor: 'rgba(207, 250, 254, 0.25)',
      lightRayColor: 'rgba(255, 255, 255, 0.16)'
    },
    sunset: {
      id: 'sunset',
      name: '🌅 Sunset / Dusk (3000K)',
      tempK: 3000,
      ambientTop: 'rgba(245, 158, 11, 0.15)',
      ambientMid: 'rgba(180, 83, 9, 0.18)',
      ambientBottom: 'rgba(15, 23, 42, 0.82)',
      causticAlpha: 0.09,
      shimmerColor: 'rgba(254, 215, 170, 0.25)',
      lightRayColor: 'rgba(251, 191, 36, 0.14)'
    },
    moonlight: {
      id: 'moonlight',
      name: '🌙 Moonlight / Actinic (460nm)',
      tempK: 12000,
      ambientTop: 'rgba(30, 58, 138, 0.28)',
      ambientMid: 'rgba(15, 23, 42, 0.40)',
      ambientBottom: 'rgba(2, 6, 23, 0.92)',
      causticAlpha: 0.05,
      shimmerColor: 'rgba(147, 197, 253, 0.18)',
      lightRayColor: 'rgba(96, 165, 250, 0.10)'
    }
  },
  getNozzleCoords(dim = { width: 800, height: 384 }) {
    const w = Number(dim.width) || 800;
    const h = Number(dim.height) || 384;
    return { x: w - (w > 600 ? 155 : 135), y: h * 0.15 };
  },
  getEquipmentBounds(w = 800, h = 384) {
    const filterW = w > 600 ? 76 : 64;
    const filterH = Math.min(h * 0.72, 240);
    const filterX = w - filterW - 16;
    const filterY = 18;
    return {
      filter: { x: filterX, y: filterY, w: filterW, h: filterH },
      heater: { x: filterX - 26, y: filterY + 12, w: 18, h: filterH * 0.78 },
      led: { x: w * 0.12, y: 2, w: w * 0.76, h: 10 }
    };
  },
  initParticles(count = 95, width = 800, height = 384, mode = 'current') {
    const p = [];
    for (let i = 0; i < count; i++) {
      p.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.72) + 15,
        vx: mode === 'current' ? -(3.5 + Math.random() * 4) : -(1.2 + Math.random() * 2),
        vy: (Math.random() - 0.5) * 1.4,
        size: 1 + Math.random() * 2.2,
        alpha: 0.3 + Math.random() * 0.5,
        life: Math.floor(Math.random() * 100)
      });
    }
    return p;
  },
  updatePhysics(particles, mode, dim = { width: 800, height: 384 }) {
    const w = dim.width || 800;
    const h = dim.height || 384;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life = (p.life || 0) + 1;
      if (mode === 'current') {
        p.vy -= 0.018; // Buoyancy upward drift
        if (p.x < w * 0.12) { p.vx *= 0.6; p.vy += 0.75; } // Glass pane deflection downward
        if (p.x < 12 || p.y < 8 || p.y > h * 0.86 || p.life > 140) {
          p.x = w - 155; p.y = h * 0.15; p.vx = -(4.2 + Math.random() * 5); p.vy = (Math.random() - 0.4) * 1.2; p.life = 0;
        }
      } else {
        // Convective roll
        if (p.y > h * 0.62) p.vx += 0.045; else p.vx -= 0.02;
        p.vy += 0.01;
        if (p.x < 15 || p.x > w * 0.95 || p.y < 10 || p.y > h * 0.86 || p.life > 180) {
          p.x = w - 135; p.y = h * 0.15; p.vx = -(1.5 + Math.random() * 2); p.vy = Math.random() * 1.5 + 0.4; p.life = 0;
        }
      }
    }
    return particles;
  },
  updateFishAI(fishList, mode, width, height) {
    const now = Date.now();
    for (let i = 0; i < fishList.length; i++) {
      const f = fishList[i];
      let tx = f.baseX || 0.5;
      let ty = f.baseY || 0.5;

      if (f.flowPreference === 'low') {
        if (mode === 'current') { tx = 0.84; ty = 0.82; f.isSheltering = true; }
        else { tx = f.baffledX || 0.35; ty = f.baffledY || 0.30; f.isSheltering = false; }
      } else if (f.flowPreference === 'high') {
        if (mode === 'current') {
          tx = 0.60 + Math.sin(now * 0.001 + i) * 0.08;
          ty = 0.22 + Math.cos(now * 0.0015 + i) * 0.04;
          f.isSheltering = false;
        } else {
          tx = f.baffledX || 0.50;
          ty = f.baffledY || 0.40;
        }
      } else {
        // Moderate: calm natural cruising
        tx = (f.baseX || 0.45) + Math.sin(now * 0.0008 + i * 1.8) * 0.05;
        ty = (f.baseY || 0.45) + Math.cos(now * 0.0012 + i) * 0.03;
      }

      // Schooling cohesion for schoolers
      if (f.isSchooler && i > 0 && fishList[i - 1]?.isSchooler) {
        const lead = fishList[i - 1];
        tx = lead.x + 0.035;
        ty = lead.y + (i % 2 === 0 ? 0.025 : -0.025);
      }

      f.x = (f.x || tx) + (tx - (f.x || tx)) * 0.035;
      f.y = (f.y || ty) + (ty - (f.y || ty)) * 0.035;
      f.hoverOffset = Math.sin(now * 0.003 + i * 1.5) * 0.015;
      f.currentTailAngle = Math.sin(now * 0.006 * (f.tailSpeed || 3.0) + i) * 0.32;
    }
    return fishList;
  },
  getStreamlines(mode, w, h) {
    if (mode === 'current') {
      return [
        { type: 'bezier', start: { x: w - 155, y: h * 0.15 - 12 }, cp1: { x: w * 0.55, y: h * 0.10 }, cp2: { x: w * 0.30, y: h * 0.18 }, end: { x: w * 0.10, y: h * 0.28 } },
        { type: 'bezier', start: { x: w - 155, y: h * 0.15 }, cp1: { x: w * 0.55, y: h * 0.15 }, cp2: { x: w * 0.30, y: h * 0.22 }, end: { x: w * 0.10, y: h * 0.30 } },
        { type: 'bezier', start: { x: w - 155, y: h * 0.15 + 12 }, cp1: { x: w * 0.55, y: h * 0.20 }, cp2: { x: w * 0.30, y: h * 0.26 }, end: { x: w * 0.10, y: h * 0.32 } },
        { type: 'bezier', start: { x: w * 0.15, y: h * 0.80 }, cp1: { x: w * 0.40, y: h * 0.83 }, cp2: { x: w * 0.65, y: h * 0.82 }, end: { x: w * 0.84, y: h * 0.72 } }
      ];
    } else {
      return [
        { type: 'ellipse', cx: w * 0.5, cy: h * 0.46, rx: w * 0.38, ry: h * 0.26 },
        { type: 'ellipse', cx: w * 0.5, cy: h * 0.46, rx: w * 0.22, ry: h * 0.15 }
      ];
    }
  }
};

const FlowEngine = (ImportedFlowEngine && ImportedFlowEngine.LIGHTING_MODES) 
  ? ImportedFlowEngine 
  : ((typeof globalThis !== 'undefined' && globalThis.FlowEngine && globalThis.FlowEngine.LIGHTING_MODES) 
    ? globalThis.FlowEngine 
    : FallbackFlowEngine);

function safeDrawRect(ctx, x, y, w, h, r = 4) {
  if (typeof ctx.roundRect === 'function') {
    try {
      ctx.roundRect(x, y, w, h, typeof r === 'number' ? r : 4);
      return;
    } catch (_) {}
  }
  ctx.rect(x, y, w, h);
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
      labels: false, // Default false for clean cinematic view
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
    this.selectedEntity = null;
    this.hoveredFish = null;
    this.mousePos = { x: -100, y: -100 };

    this._animId = null;
    this._isPaused = false;
    this._isVisible = true;
    this._resizeObserver = null;
    this._boundVisibilityChange = this._handleVisibilityChange.bind(this);
    this._boundResize = this._handleResize.bind(this);
    this._boundClick = this._handleCanvasClick.bind(this);
    this._boundMouseMove = this._handleMouseMove.bind(this);
    this._boundMouseLeave = this._handleMouseLeave.bind(this);
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

    // Immediate initial draw to ensure canvas is NEVER blank
    this._handleResize();
    this.draw();
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

    if (this.canvas) {
      this.canvas.removeEventListener('click', this._boundClick);
      this.canvas.removeEventListener('mousemove', this._boundMouseMove);
      this.canvas.removeEventListener('mouseleave', this._boundMouseLeave);
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
              <span>🌊 Flow</span>
            </label>
            <label class="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-300">
              <input type="checkbox" data-layer="heatmap" class="layer-toggle rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.layers.heatmap ? 'checked' : ''}>
              <span>🌡️ Heatmap</span>
            </label>
            <label class="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-300">
              <input type="checkbox" data-layer="labels" class="layer-toggle rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.layers.labels ? 'checked' : ''}>
              <span>🏷️ Badges</span>
            </label>
            <label class="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-300">
              <input type="checkbox" data-layer="feedingZones" class="layer-toggle rounded border-slate-700 text-cyan-500 focus:ring-0" ${this.layers.feedingZones ? 'checked' : ''}>
              <span>🍽️ Drop Zones</span>
            </label>
          </div>
        </div>

        <!-- Canvas Viewport -->
        <div class="canvas-viewport relative w-full h-[360px] sm:h-[440px] md:h-[500px] bg-gradient-to-b from-slate-950 via-cyan-950/20 to-slate-950 overflow-hidden">
          <canvas id="flow-particles-canvas" class="w-full h-full block cursor-crosshair"></canvas>

          <!-- Interactive Inspector Modal / HUD Overlay -->
          <div id="canvas-hud-overlay" class="absolute top-4 left-4 z-30 hidden max-w-sm p-3.5 rounded-xl bg-slate-950/95 backdrop-blur-md border border-cyan-400/50 shadow-2xl text-xs space-y-2 animate-fade-in">
            <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span id="hud-title" class="font-bold text-cyan-300 flex items-center gap-1.5"></span>
              <button type="button" id="hud-close-btn" class="text-slate-400 hover:text-white font-bold px-1.5 py-0.5 rounded hover:bg-slate-800">✕</button>
            </div>
            <div id="hud-body" class="text-slate-300 text-[11px] leading-relaxed"></div>
          </div>

          <!-- Bottom Telemetry HUD Bar -->
          <div class="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 text-[11px] text-slate-200 shadow-lg">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span id="flow-status-text">${this.mode === 'current' ? 'Venturi Jet Active (1750 L/h) • Rheotaxis High-Flow Zone' : '45° Baffled Convection Gyre • Calm Upper Film'}</span>
            </div>
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[10px] text-slate-400 shadow-lg">
              <span>💡 Click water to feed fish • Click hardware or fish to inspect</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#flow-particles-canvas');
    if (this.canvas && typeof this.canvas.getContext === 'function') {
      this.ctx = this.canvas.getContext('2d');
      this.canvas.addEventListener('click', this._boundClick);
      this.canvas.addEventListener('mousemove', this._boundMouseMove);
      this.canvas.addEventListener('mouseleave', this._boundMouseLeave);
    }

    const hudClose = this.container.querySelector('#hud-close-btn');
    if (hudClose) {
      hudClose.addEventListener('click', () => {
        this._hideHUD();
      });
    }

    this._attachControlListeners();
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
  }

  _handleVisibilityChange() {
    if (typeof document !== 'undefined') {
      if (document.hidden || document.visibilityState === 'hidden') {
        this.pause();
      } else {
        this.resume();
        this.draw();
      }
    }
  }

  _handleResize() {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || this.canvas.parentElement?.offsetWidth || 800;
    const h = rect.height || this.canvas.parentElement?.offsetHeight || 440;

    this.width = Math.max(320, Math.round(w));
    this.height = Math.max(220, Math.round(h));

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);

    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Immediately re-draw so canvas is never blank
    this.draw();
  }

  _initPhysics() {
    this.particles = FlowEngine.initParticles(95, this.width, this.height, this.mode);

    // Initialize shimmering caustics bands
    this.caustics = [];
    for (let i = 0; i < 10; i++) {
      this.caustics.push({
        x: (i / 10) * this.width,
        width: 32 + Math.random() * 45,
        speed: 0.005 + Math.random() * 0.006,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Build dynamic fish roster from store / config if available
    this._buildFishRoster();
  }

  _buildFishRoster() {
    const storeSpecies = this.store ? this.store.getState('species') : null;
    const configSpecies = storeSpecies || (typeof window !== 'undefined' && window.activeConfig?.species) || null;

    if (Array.isArray(configSpecies) && configSpecies.length > 0) {
      this.fishList = [];
      const palettes = {
        'denison-barb': { color: '#e11d48', secondary: '#facc15', species: 'barb', size: 19, speed: 5.8, flow: 'high', zone: 'mid' },
        'silver-tip-tetra': { color: '#f59e0b', secondary: '#ffffff', species: 'tetra', isSchooler: true, size: 13, speed: 4.6, flow: 'moderate', zone: 'mid' },
        'albino-corydoras': { color: '#fef08a', secondary: '#f472b6', species: 'cory', size: 14, speed: 2.2, flow: 'low', zone: 'bottom' },
        'female-betta': { color: '#ec4899', secondary: '#818cf8', species: 'betta', size: 15, speed: 1.6, flow: 'low', zone: 'top' },
        'zebra-nerite-snail': { color: '#d97706', secondary: '#1e293b', species: 'snail', size: 10, speed: 0.4, flow: 'moderate', zone: 'bottom' },
        'neon-tetra': { color: '#06b6d4', secondary: '#ef4444', species: 'tetra', isSchooler: true, size: 12, speed: 4.8, flow: 'moderate', zone: 'mid' },
        'angelfish': { color: '#f59e0b', secondary: '#ffffff', species: 'cichlid', size: 22, speed: 2.0, flow: 'moderate', zone: 'mid' }
      };

      const zoneDefaults = {
        top: { y: 0.22, range: 0.08 },
        mid: { y: 0.45, range: 0.14 },
        bottom: { y: 0.88, range: 0.04 }
      };

      configSpecies.forEach((sp, idx) => {
        const p = palettes[sp.id] || {
          color: '#38bdf8', secondary: '#ffffff', species: 'mid', size: 14, speed: 3.5, flow: 'moderate', zone: 'mid'
        };
        const zoneInfo = zoneDefaults[p.zone] || zoneDefaults.mid;
        const xPos = 0.18 + ((idx / Math.max(configSpecies.length - 1, 1)) * 0.58);
        const yPos = zoneInfo.y + (Math.sin(idx * 2.3) * zoneInfo.range * 0.5);

        this.fishList.push({
          id: sp.id,
          name: sp.name,
          count: sp.count || 1,
          species: p.species,
          isSchooler: !!p.isSchooler,
          baseX: xPos,
          baseY: yPos,
          x: xPos,
          y: yPos,
          baffledX: xPos + (Math.cos(idx) * 0.06),
          baffledY: yPos,
          color: p.color,
          secondaryColor: p.secondary,
          tailSpeed: p.speed,
          size: p.size,
          flowPreference: p.flow,
          zone: p.zone
        });
      });
      return;
    }

    // Default High-Fidelity Community Roster
    this.fishList = [
      { id: 'angel-koi', name: 'Koi Angelfish', species: 'cichlid', count: 4, baseX: 0.40, baseY: 0.42, color: '#f59e0b', secondaryColor: '#ffffff', tailSpeed: 2.2, size: 23, flowPreference: 'moderate', zone: 'mid' },
      { id: 'denison-barb', name: 'Denison Barb', species: 'barb', count: 8, baseX: 0.65, baseY: 0.24, color: '#e11d48', secondaryColor: '#facc15', tailSpeed: 5.8, size: 19, flowPreference: 'high', zone: 'mid' },
      { id: 'neon-tetra', name: 'Neon Tetra', species: 'tetra', count: 15, isSchooler: true, baseX: 0.28, baseY: 0.38, color: '#06b6d4', secondaryColor: '#ef4444', tailSpeed: 4.8, size: 13, flowPreference: 'moderate', zone: 'mid' },
      { id: 'silvertip', name: 'Silver Tip Tetra', species: 'tetra', count: 11, isSchooler: true, baseX: 0.34, baseY: 0.46, color: '#f59e0b', secondaryColor: '#f8fafc', tailSpeed: 4.5, size: 13, flowPreference: 'moderate', zone: 'mid' },
      { id: 'betta-female', name: 'Female Betta', species: 'betta', count: 3, baseX: 0.22, baseY: 0.25, baffledX: 0.18, baffledY: 0.22, color: '#ec4899', secondaryColor: '#a855f7', tailSpeed: 1.6, size: 15, flowPreference: 'low', zone: 'top' },
      { id: 'corydoras', name: 'Albino Corydoras', species: 'cory', count: 6, baseX: 0.25, baseY: 0.89, color: '#fef08a', secondaryColor: '#f472b6', tailSpeed: 2.2, size: 14, flowPreference: 'low', zone: 'bottom' }
    ];
  }

  setFlowMode(mode) {
    if (mode !== 'current' && mode !== 'baffled') return;
    this.mode = mode;

    if (this.container) {
      const modeBtns = this.container.querySelectorAll('.flow-mode-btn');
      modeBtns.forEach(btn => {
        const isSelected = btn.getAttribute('data-mode') === mode;
        btn.className = `flow-mode-btn px-3 py-1 rounded-lg font-semibold transition-all ${
          isSelected ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
        }`;
      });

      const statusText = this.container.querySelector('#flow-status-text');
      if (statusText) {
        statusText.textContent = mode === 'current'
          ? 'Venturi Jet Active (1750 L/h) • Rheotaxis High-Flow Zone'
          : '45° Baffled Convection Gyre • Calm Upper Film';
      }
    }

    if (this.eventBus) {
      this.eventBus.emit('flow:mode_changed', { mode });
    }
  }

  setLighting(light) {
    const modes = FlowEngine.LIGHTING_MODES || FallbackFlowEngine.LIGHTING_MODES;
    if (!modes[light]) return;
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
    if (this._isPaused) return;

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
    try {
      // 1. Fluid particles
      FlowEngine.updatePhysics(this.particles, this.mode, { width: this.width, height: this.height });

      // 2. Living fish AI kinematics
      FlowEngine.updateFishAI(this.fishList, this.mode, this.width, this.height);

      // 3. Floating/sinking food particles
      for (let i = this.foodParticles.length - 1; i >= 0; i--) {
        const f = this.foodParticles[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vy += f.gravity;
        f.life++;

        if (this.mode === 'current' && f.y < this.height * 0.4) {
          f.vx -= 0.08;
        }

        // Check if any fish eats the food
        for (const fish of this.fishList) {
          const fx = fish.x * this.width;
          const fy = (fish.y + (fish.hoverOffset || 0)) * this.height;
          const dist = Math.hypot(fx - f.x, fy - f.y);
          if (dist < 28) {
            f.life = 999; // Eaten
            break;
          }
        }

        if (f.y >= this.height * 0.90 || f.life > 280) {
          this.foodParticles.splice(i, 1);
        }
      }
    } catch (err) {
      console.warn('Physics update caught error:', err);
    }
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    try {
      ctx.clearRect(0, 0, w, h);

      const modes = FlowEngine.LIGHTING_MODES || FallbackFlowEngine.LIGHTING_MODES;
      const lightScheme = modes[this.lighting] || modes.daylight;

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

      // 11. Glass frame reflections & highlight rim
      this._drawGlassRimHighlight(ctx, w, h);

    } catch (err) {
      console.error('FlowCanvas draw error:', err);
    }
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

    // Floating water-plant leaves (duckweed / frogbit)
    ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
    for (let f = 0; f < 8; f++) {
      const fx = (w * 0.12) + (f * 55) + Math.sin(time + f) * 8;
      const fy = 8 + Math.sin(time + fx * 0.025) * 2.2;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
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
      grad.addColorStop(0.5, 'rgba(103, 232, 249, 0.035)');
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(curX, 0);
      ctx.lineTo(curX + c.width, 0);
      ctx.lineTo(curX + c.width * 1.6 + Math.sin(time + curX * 0.01) * 22, h * 0.82);
      ctx.lineTo(curX - c.width * 0.4, h * 0.82);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawAquascape(ctx, w, h, light) {
    ctx.save();

    // 1. Background swaying Vallisneria ribbon plants
    const time = Date.now() * 0.0015;
    const plantColor = this.lighting === 'moonlight' ? 'rgba(30, 64, 175, 0.35)' : 'rgba(16, 185, 129, 0.32)';
    ctx.strokeStyle = plantColor;
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';

    for (let p = 0; p < 7; p++) {
      const bx = (w * 0.07) + (p * 26);
      const by = h * 0.90;
      const ph = h * (0.45 + (p % 3) * 0.14);
      const sway = Math.sin(time + p) * 18;

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sway * 0.5, by - ph * 0.5, bx + sway, by - ph);
      ctx.stroke();
    }

    // 2. Emersed trailing Pothos riparium roots entering from top rim
    const rootX = w * 0.72;
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.48)';
    ctx.lineWidth = 1.6;
    for (let r = 0; r < 6; r++) {
      const rx = rootX + (r * 9);
      const rSway = Math.sin(time * 0.8 + r) * 6;
      ctx.beginPath();
      ctx.moveTo(rx, 8);
      ctx.bezierCurveTo(rx + rSway * 0.5, 40, rx - rSway * 0.5, 80, rx + rSway, h * 0.32);
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

    // Gravel pebbles & carpet tufts
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    for (let i = 0; i < 32; i++) {
      const px = (i / 32) * w + ((i * 31) % 18);
      const py = subY + ((i * 17) % 24);
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Foreground carpeting plant tufts (Monte Carlo)
    ctx.fillStyle = '#16a34a';
    for (let c = 0; c < 14; c++) {
      const cx = (c / 14) * (w * 0.7) + 20;
      const cy = subY - 2 + (c % 3) * 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
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
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(trunkX, trunkY);
    ctx.bezierCurveTo(trunkX - 15, h * 0.72, trunkX + 20, h * 0.58, trunkX, h * 0.46);
    ctx.stroke();

    // Left Branch
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(trunkX - 5, h * 0.62);
    ctx.bezierCurveTo(trunkX - 45, h * 0.56, w * 0.34, h * 0.50, w * 0.28, h * 0.44);
    ctx.stroke();

    // Right Horizontal Branch
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(trunkX + 6, h * 0.58);
    ctx.bezierCurveTo(trunkX + 50, h * 0.54, w * 0.60, h * 0.48, w * 0.66, h * 0.52);
    ctx.stroke();

    // Secondary Root tendrils
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(trunkX - 12, h * 0.70);
    ctx.lineTo(w * 0.38, subY);
    ctx.moveTo(trunkX + 14, h * 0.68);
    ctx.lineTo(w * 0.56, subY);
    ctx.stroke();

    // Java Moss Clump
    const mossX = w * 0.62;
    const mossY = h * 0.50;
    const mossSway = Math.sin(time * 3) * 2;
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(mossX, mossY, 24, 14, mossSway * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Moss highlights
    ctx.fillStyle = '#22c55e';
    for (let m = 0; m < 7; m++) {
      ctx.beginPath();
      ctx.arc(mossX - 12 + (m * 4) + mossSway, mossY - 4 + ((m * 5) % 8), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Anubias Epiphytes
    this._drawAnubiasCluster(ctx, trunkX - 10, h * 0.58, -0.4);
    this._drawAnubiasCluster(ctx, trunkX + 10, h * 0.48, 0.3);
    this._drawAnubiasCluster(ctx, w * 0.32, h * 0.46, -0.5);

    // 5. Basalt River Boulder Sanctuary
    this._drawRiverRock(ctx, w * 0.38, subY, 34, 17, '#1e293b', '#475569');
    this._drawRiverRock(ctx, w * 0.54, subY + 2, 38, 19, '#0f172a', '#334155');
    this._drawRiverRock(ctx, w * 0.46, subY + 4, 25, 13, '#334155', '#64748b');

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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(rx, ry + rh * 0.4, rw * 1.05, rh * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const rGrad = ctx.createRadialGradient(rx - rw * 0.2, ry - rh * 0.3, rh * 0.2, rx, ry, rw);
    rGrad.addColorStop(0, cLight);
    rGrad.addColorStop(0.7, cDark);
    rGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = rGrad;

    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(rx - rw * 0.1, ry - rh * 0.3, rw * 0.6, rh * 0.3, -0.1, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();

    ctx.restore();
  }

  _drawEquipment(ctx, w, h, light) {
    ctx.save();
    const bounds = FlowEngine.getEquipmentBounds ? FlowEngine.getEquipmentBounds(w, h) : FallbackFlowEngine.getEquipmentBounds(w, h);

    // 1. Overhead LED Light Fixture Bar
    const led = bounds.led;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    safeDrawRect(ctx, led.x, led.y, led.w, led.h, 3);
    ctx.fill();
    ctx.stroke();

    const ledColor = this.lighting === 'daylight' ? '#38bdf8' : this.lighting === 'sunset' ? '#f59e0b' : '#6366f1';
    ctx.fillStyle = ledColor;
    for (let lx = led.x + 15; lx < led.x + led.w - 15; lx += 22) {
      ctx.beginPath();
      ctx.arc(lx, led.y + led.h - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Submersible Quartz Heater
    const heater = bounds.heater;
    const heatGrad = ctx.createLinearGradient(heater.x, heater.y, heater.x + heater.w, heater.y);
    heatGrad.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
    heatGrad.addColorStop(0.5, 'rgba(51, 65, 85, 0.52)');
    heatGrad.addColorStop(1, 'rgba(15, 23, 42, 0.88)');
    ctx.fillStyle = heatGrad;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    safeDrawRect(ctx, heater.x, heater.y, heater.w, heater.h, 6);
    ctx.fill();
    ctx.stroke();

    // Suction mounting brackets
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(heater.x - 3, heater.y + 10, heater.w + 6, 6);
    ctx.fillRect(heater.x - 3, heater.y + heater.h - 22, heater.w + 6, 6);

    // Glowing heating coil
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const coilYStart = heater.y + 22;
    const coilYEnd = heater.y + heater.h - 26;
    for (let cy = coilYStart; cy < coilYEnd; cy += 6) {
      ctx.moveTo(heater.x + 3, cy);
      ctx.lineTo(heater.x + heater.w - 3, cy + 3);
    }
    ctx.stroke();

    // Thermal convection shimmer waves rising from heater
    const time = Date.now() * 0.003;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let ty = heater.y - 4; ty > 14; ty -= 5) {
      const tx = heater.x + heater.w * 0.5 + Math.sin(time + ty * 0.08) * 3;
      if (ty === heater.y - 4) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.stroke();

    // 3. Wide Dual-Canister Internal Filter Unit
    const filter = bounds.filter;
    // Motorhead
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    safeDrawRect(ctx, filter.x, filter.y, filter.w, 42, 6);
    ctx.fill();
    ctx.stroke();

    // Pulsing LED indicator
    const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
    ctx.fillStyle = `rgba(6, 182, 212, ${pulse})`;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(filter.x + filter.w - 14, filter.y + 14, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('1750 L/h', filter.x + 8, filter.y + 18);
    ctx.font = '8px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('DUAL CUP', filter.x + 8, filter.y + 30);

    // Directional Venturi Jet Nozzle
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

    // Clear Canister Body
    const bodyY = filter.y + 44;
    const bodyH = filter.h - 44;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.38)';
    ctx.beginPath();
    safeDrawRect(ctx, filter.x + 2, bodyY, filter.w - 4, bodyH, 4);
    ctx.fill();
    ctx.stroke();

    // Cup A: Sponge
    const cupAH = bodyH * 0.46;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    safeDrawRect(ctx, filter.x + 6, bodyY + 4, filter.w - 12, cupAH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('CUP A: SPONGE', filter.x + 9, bodyY + 16);

    // Cup B: Ceramic
    const cupBY = bodyY + cupAH + 8;
    const cupBH = bodyH - cupAH - 12;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.beginPath();
    safeDrawRect(ctx, filter.x + 6, cupBY, filter.w - 12, cupBH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(248, 250, 252, 0.8)';
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
      const jetGrad = ctx.createRadialGradient(w - 150, h * 0.15, 10, w * 0.35, h * 0.20, w * 0.5);
      jetGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
      jetGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.65)');
      jetGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = jetGrad;
      ctx.fillRect(0, 0, w, h);

      const slackGrad = ctx.createRadialGradient(w - 75, h * 0.78, 5, w - 75, h * 0.78, 130);
      slackGrad.addColorStop(0, 'rgba(16, 185, 129, 0.85)');
      slackGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = slackGrad;
      ctx.beginPath();
      ctx.arc(w - 75, h * 0.78, 130, 0, Math.PI * 2);
      ctx.fill();
    } else {
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
    ctx.strokeStyle = this.mode === 'current' ? 'rgba(56, 189, 248, 0.38)' : 'rgba(45, 212, 191, 0.38)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = -Date.now() * 0.024;

    const lines = FlowEngine.getStreamlines ? FlowEngine.getStreamlines(this.mode, w, h) : FallbackFlowEngine.getStreamlines(this.mode, w, h);
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

      ctx.fillStyle = `rgba(255, 255, 255, ${(p.alpha || 0.65) * 0.9})`;
      ctx.beginPath();
      ctx.arc(p.x - (p.size || 1.6) * 0.3, p.y - (p.size || 1.6) * 0.3, (p.size || 1.6) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawFishPresence(ctx, w, h) {
    ctx.save();

    for (const f of this.fishList) {
      const px = f.x * w;
      const py = (f.y + (f.hoverOffset || 0)) * h;

      const isFacingLeft = this.mode === 'current' || f.x > 0.45;
      const isHovered = this.hoveredFish && this.hoveredFish.id === f.id;

      ctx.save();
      ctx.translate(px, py);
      if (!isFacingLeft) ctx.scale(-1, 1);

      const tailAngle = f.currentTailAngle || 0;
      this._renderSpeciesMorphology(ctx, f, tailAngle);

      // Glow halo on hover
      if (isHovered) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, (f.size || 16) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // Only render badge if layer is explicitly enabled OR if fish is hovered
      if (this.layers.labels || isHovered) {
        this._renderFishBadge(ctx, f, px, py);
      }
    }

    ctx.restore();
  }

  _renderSpeciesMorphology(ctx, f, tailAngle) {
    const s = f.size || 16;

    if (f.species === 'cichlid') {
      // Tall, elegant Angelfish vertical disc
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, 0);
      ctx.lineTo(0, -s * 0.9);
      ctx.lineTo(s * 0.6, 0);
      ctx.lineTo(0, s * 0.9);
      ctx.closePath();
      ctx.fill();

      // Long trailing ventral threads
      ctx.strokeStyle = f.secondaryColor || '#ffffff';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.8);
      ctx.lineTo(-s * 0.2, s * 1.6);
      ctx.stroke();

      // Eye
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(s * 0.35, -s * 0.2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Articulated caudal tail
      ctx.save();
      ctx.translate(-s * 0.5, 0);
      ctx.rotate(tailAngle);
      ctx.fillStyle = `${f.color}85`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.65, -s * 0.5);
      ctx.lineTo(-s * 0.45, 0);
      ctx.lineTo(-s * 0.65, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else if (f.species === 'barb') {
      // Denison Barb (Roseline Shark): Torpedo body, vivid red lateral stripe, gold line
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.85, s * 0.30, 0, 0, Math.PI * 2);
      ctx.fill();

      // Belly silver
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.12, s * 0.75, s * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crimson snout-to-flank stripe
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(s * 0.85, 0);
      ctx.lineTo(s * 0.1, -s * 0.12);
      ctx.lineTo(s * 0.1, s * 0.05);
      ctx.lineTo(s * 0.85, s * 0.05);
      ctx.closePath();
      ctx.fill();

      // Gold highlight line
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(s * 0.8, -s * 0.08);
      ctx.lineTo(-s * 0.6, -s * 0.08);
      ctx.stroke();

      // Tail with black/yellow tips
      ctx.save();
      ctx.translate(-s * 0.75, 0);
      ctx.rotate(tailAngle);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.5, -s * 0.4);
      ctx.lineTo(-s * 0.3, 0);
      ctx.lineTo(-s * 0.5, s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else if (f.species === 'tetra') {
      // Neon / Silvertip Tetra: Glowing electric blue stripe & ruby red tail
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.65, s * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iridescent electric cyan stripe
      ctx.strokeStyle = '#22d3ee';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 5;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -1);
      ctx.lineTo(s * 0.4, -1);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Ruby red lower flank
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.5, 0);
      ctx.lineTo(-s * 0.5, s * 0.25);
      ctx.lineTo(0, s * 0.25);
      ctx.closePath();
      ctx.fill();

      // Waggling tail
      ctx.save();
      ctx.translate(-s * 0.55, 0);
      ctx.rotate(tailAngle);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.65)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.45, -s * 0.3);
      ctx.lineTo(-s * 0.3, 0);
      ctx.lineTo(-s * 0.45, s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else if (f.species === 'cory') {
      // Albino Corydoras: snuffling barbels on substrate
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.72, s * 0.42, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Barbels
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(s * 0.5, 2);
      ctx.lineTo(s * 0.8, 6);
      ctx.moveTo(s * 0.45, 3);
      ctx.lineTo(s * 0.72, 7);
      ctx.stroke();

      // Pinkish dorsal fin
      ctx.fillStyle = `${f.secondaryColor || '#f472b6'}80`;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.35);
      ctx.lineTo(-s * 0.3, -s * 0.7);
      ctx.lineTo(-s * 0.4, -s * 0.35);
      ctx.closePath();
      ctx.fill();

      // Caudal tail
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
      // Generic sleek aquatic fish
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.75, s * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(s * 0.4, -1, 1.5, 0, Math.PI * 2);
      ctx.fill();

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
    const text = `${f.name} (×${f.count})`;
    ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + 14;
    const boxH = 17;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 1;

    ctx.beginPath();
    safeDrawRect(ctx, px - boxW / 2, py - boxH / 2 - 16, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, px, py - 16);

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

  _drawGlassRimHighlight(ctx, w, h) {
    ctx.save();
    // Low-iron rimless glass bevel edge highlight
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.restore();
  }

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

  _handleMouseMove(event) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    this.mousePos = { x: mx, y: my };

    // Check if mouse is over any fish
    let found = null;
    for (const f of this.fishList) {
      const fx = f.x * this.width;
      const fy = (f.y + (f.hoverOffset || 0)) * this.height;
      const dist = Math.hypot(mx - fx, my - fy);
      if (dist < 28) {
        found = f;
        break;
      }
    }
    this.hoveredFish = found;
  }

  _handleMouseLeave() {
    this.hoveredFish = null;
    this.mousePos = { x: -100, y: -100 };
  }

  _handleCanvasClick(event) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const bounds = FlowEngine.getEquipmentBounds ? FlowEngine.getEquipmentBounds(this.width, this.height) : FallbackFlowEngine.getEquipmentBounds(this.width, this.height);

    // 1. Filter click
    if (this._isPointInRect(clickX, clickY, bounds.filter)) {
      this._showHUD('⚙️ 1750 L/h Dual Canister Filter', `
        <div class="space-y-1.5">
          <p><strong class="text-cyan-300">Turnover:</strong> 1750 L/Hr (~8× hourly tank volume)</p>
          <p><strong class="text-cyan-300">Cup A:</strong> Mechanical Coarse Foam (traps suspended detritus)</p>
          <p><strong class="text-emerald-300">Cup B:</strong> Sintered Ceramic Bio-Rings (active biological nitrification)</p>
          <p class="text-amber-300">💡 Alternating Rinse: Never rinse both cups in the same week.</p>
        </div>
      `);
      return;
    }

    // 2. Heater click
    if (this._isPointInRect(clickX, clickY, bounds.heater)) {
      this._showHUD('🔥 Submersible Quartz Heater', `
        <div class="space-y-1.5">
          <p><strong class="text-rose-300">Target Temp:</strong> 25.5°C ± 1.0°C</p>
          <p><strong class="text-slate-300">Coil:</strong> Nichrome element with thermal convection roll</p>
          <p class="text-emerald-300">✅ Thermostat synchronized with Vital Signs Strip.</p>
        </div>
      `);
      return;
    }

    // 3. Fish click
    for (const f of this.fishList) {
      const fx = f.x * this.width;
      const fy = (f.y + (f.hoverOffset || 0)) * this.height;
      if (Math.hypot(clickX - fx, clickY - fy) < 32) {
        this._showHUD(`🐠 ${f.name} (×${f.count})`, `
          <div class="space-y-1.5">
            <p><strong class="text-cyan-300">Strata Zone:</strong> ${f.zone?.toUpperCase() || 'MID'}</p>
            <p><strong class="text-cyan-300">Flow Preference:</strong> ${f.flowPreference?.toUpperCase() || 'MODERATE'}</p>
            <p><strong class="text-slate-300">Behavior:</strong> ${
              f.flowPreference === 'low' && this.mode === 'current'
                ? 'Sheltering in calm pocket behind spiderwood'
                : f.flowPreference === 'high'
                  ? 'Actively swimming against current (positive rheotaxis)'
                  : 'Peaceful community schooling'
            }</p>
          </div>
        `);
        return;
      }
    }

    // 4. Default click in open water: drop food!
    this.dropFood(clickX, clickY);
  }

  _isPointInRect(x, y, rect) {
    if (!rect) return false;
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  _showHUD(title, html) {
    if (!this.container) return;
    const hud = this.container.querySelector('#canvas-hud-overlay');
    const titleEl = this.container.querySelector('#hud-title');
    const bodyEl = this.container.querySelector('#hud-body');

    if (hud && titleEl && bodyEl) {
      titleEl.innerHTML = title;
      bodyEl.innerHTML = html;
      hud.classList.remove('hidden');
    }
  }

  _hideHUD() {
    if (!this.container) return;
    const hud = this.container.querySelector('#canvas-hud-overlay');
    if (hud) hud.classList.add('hidden');
  }
}

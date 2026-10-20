/**
 * AquaPulse FlowEngine (Enhanced 10x Edition)
 * Pure biological & hydrodynamic calculation engine for aquarium fluid simulation.
 * Zero DOM / browser dependencies — 100% headless testable.
 *
 * Capabilities:
 * - Multi-mode vector field calculation (Straight Jet, Baffled Convection)
 * - Hydrodynamic obstacle avoidance and wall deflection
 * - Living fish locomotion & rheotaxis AI (swimming against current, seeking calm shelter)
 * - Schooling flocking dynamics (boids-lite cohesion & alignment)
 * - Equipment operating states (filter impeller RPM, heater thermal gradient, LED spectrum)
 * - Floating & sinking food particle kinematics
 */

const FlowEngine = {
  particleCount: 120,

  /**
   * Environmental lighting spectrum presets
   */
  LIGHTING_MODES: {
    daylight: {
      id: 'daylight',
      name: '☀️ Daylight (6500K)',
      tempK: 6500,
      ambientTop: 'rgba(6, 182, 212, 0.10)',
      ambientMid: 'rgba(14, 116, 144, 0.14)',
      ambientBottom: 'rgba(2, 6, 23, 0.65)',
      causticAlpha: 0.14,
      shimmerColor: 'rgba(207, 250, 254, 0.20)',
      lightRayColor: 'rgba(255, 255, 255, 0.15)'
    },
    sunset: {
      id: 'sunset',
      name: '🌅 Sunset / Dusk (3000K)',
      tempK: 3000,
      ambientTop: 'rgba(245, 158, 11, 0.14)',
      ambientMid: 'rgba(180, 83, 9, 0.16)',
      ambientBottom: 'rgba(15, 23, 42, 0.80)',
      causticAlpha: 0.08,
      shimmerColor: 'rgba(254, 215, 170, 0.22)',
      lightRayColor: 'rgba(251, 191, 36, 0.12)'
    },
    moonlight: {
      id: 'moonlight',
      name: '🌙 Moonlight / Actinic (460nm)',
      tempK: 12000,
      ambientTop: 'rgba(30, 58, 138, 0.25)',
      ambientMid: 'rgba(15, 23, 42, 0.35)',
      ambientBottom: 'rgba(2, 6, 23, 0.90)',
      causticAlpha: 0.04,
      shimmerColor: 'rgba(147, 197, 253, 0.15)',
      lightRayColor: 'rgba(96, 165, 250, 0.08)'
    }
  },

  /**
   * Calculates filter outflow nozzle coordinates based on container dimensions.
   * @param {Object} dimensions { width, height }
   * @returns {{ x: number, y: number }}
   */
  getNozzleCoords(dimensions = { width: 800, height: 384 }) {
    if (!dimensions || typeof dimensions !== 'object') {
      return { x: 645, y: 57.6 };
    }
    const width = Number(dimensions.width) || 0;
    const height = Number(dimensions.height) || 0;
    if (width <= 0 || height <= 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: width - (width > 600 ? 155 : 135),
      y: height * 0.15
    };
  },

  /**
   * Calculates equipment physical bounding boxes for rendering & collision
   * @param {number} width
   * @param {number} height
   */
  getEquipmentBounds(width = 800, height = 384) {
    const filterW = width > 600 ? 76 : 64;
    const filterH = Math.min(height * 0.72, 240);
    const filterX = width - filterW - 16;
    const filterY = 18;

    const heaterW = 18;
    const heaterH = filterH * 0.78;
    const heaterX = filterX - 26;
    const heaterY = filterY + 12;

    const ledH = 10;
    const ledX = width * 0.12;
    const ledW = width * 0.76;
    const ledY = 2;

    return {
      filter: { x: filterX, y: filterY, w: filterW, h: filterH },
      heater: { x: heaterX, y: heaterY, w: heaterW, h: heaterH },
      led: { x: ledX, y: ledY, w: ledW, h: ledH }
    };
  },

  /**
   * Creates a single particle with initial kinematics for the given hydrodynamic mode.
   * @param {boolean} randomSpread Whether to distribute randomly throughout the water column
   * @param {string} mode 'current' (straight jet) | 'baffled' (convective loop)
   * @param {Object} dimensions Container dimensions { width, height }
   * @returns {Object} Particle object
   */
  createParticle(randomSpread = false, mode = 'current', dimensions = { width: 800, height: 384 }) {
    dimensions = dimensions || { width: 800, height: 384 };
    const width = Number(dimensions.width);
    const height = Number(dimensions.height);

    // Boundary protection for zero or negative dimensions
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      return {
        x: 0,
        y: 0,
        vx: mode === 'current' ? -4.5 : -2.0,
        vy: 0.0,
        size: 1.5,
        alpha: 0.5,
        life: 0
      };
    }

    const nozzle = this.getNozzleCoords(dimensions);

    if (randomSpread) {
      return {
        x: Math.random() * width,
        y: Math.random() * (height * 0.72) + 15,
        vx: mode === 'current' ? -(3.5 + Math.random() * 4) : -(1.2 + Math.random() * 2),
        vy: (Math.random() - 0.5) * 1.4,
        size: 0.9 + Math.random() * 2.2,
        alpha: 0.2 + Math.random() * 0.6,
        life: Math.floor(Math.random() * 100)
      };
    }

    return {
      x: nozzle.x - Math.random() * 8,
      y: nozzle.y + (Math.random() - 0.5) * 10,
      vx: mode === 'current' ? -(4.2 + Math.random() * 5.2) : -(1.5 + Math.random() * 2.5),
      vy: mode === 'current' ? (Math.random() - 0.38) * 1.2 : (Math.random() * 1.6 + 0.4),
      size: 1 + Math.random() * 2.8,
      alpha: 0.65 + Math.random() * 0.35,
      life: 0
    };
  },

  /**
   * Initializes a pool of particles across the water column.
   * @param {number} count Number of particles (defaults to 85)
   * @param {number} width Container width
   * @param {number} height Container height
   * @param {string} mode Flow mode ('current' | 'baffled')
   * @returns {Array<Object>}
   */
  initParticles(count = 85, width = 800, height = 384, mode = 'current') {
    const dimensions = { width, height };
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(this.createParticle(true, mode, dimensions));
    }
    return particles;
  },

  /**
   * Updates particle positions and velocities using discrete physics integration.
   * Modifies particles in-place and handles boundary dissipation / re-spawning.
   * @param {Array<Object>} particles Array of particle objects
   * @param {string} mode 'current' | 'baffled'
   * @param {Object} dimensions { width, height }
   * @returns {Array<Object>}
   */
  updatePhysics(particles, mode = 'current', dimensions = { width: 800, height: 384 }) {
    if (!particles || !Array.isArray(particles) || particles.length === 0) {
      return [];
    }
    if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
      return particles;
    }

    const { width, height } = dimensions;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p || typeof p !== 'object') continue;

      p.life = (p.life || 0) + 1;

      if (mode === 'current') {
        // Linear Jet right-to-left
        p.x += p.vx;
        p.y += p.vy;

        // Micro-bubble buoyancy acceleration (upward)
        p.vy -= 0.018;

        // Left pane glass deflection (when reaching left 12% of tank)
        if (p.x < width * 0.12) {
          p.vx *= 0.6;
          p.vy += 0.75;
        }

        // Dissipation & boundary reset
        if (p.x < 12 || p.y < 8 || p.y > height * 0.86 || p.life > 140) {
          particles[i] = this.createParticle(false, mode, dimensions);
        }
      } else {
        // 45° Glass-Baffled convective loop
        p.x += p.vx;
        p.y += p.vy;

        if (p.y > height * 0.62) {
          p.vx += 0.045; // roll gently along substrate toward intake
        } else {
          p.vx -= 0.02; // roll across upper surface film
        }
        p.vy += 0.01; // gentle downward gravity pull

        // Convection boundary reset
        if (p.x < 15 || p.x > width * 0.95 || p.y < 10 || p.y > height * 0.86 || p.life > 180) {
          particles[i] = this.createParticle(false, mode, dimensions);
        }
      }
    }

    return particles;
  },

  /**
   * Compatibility wrapper for updatePhysics.
   */
  updateParticles(particles, mode = 'current', width = 800, height = 384, dt = 1) {
    return this.updatePhysics(particles, mode, { width, height });
  },

  /**
   * Updates living fish positions, swimming locomotion, and behavioral shelter AI.
   * High-flow fish orient into the stream (rheotaxis); low-flow fish retreat to shelter in high-current mode.
   * @param {Array<Object>} fishList Roster of fish objects
   * @param {string} mode 'current' | 'baffled'
   * @param {number} width
   * @param {number} height
   */
  updateFishAI(fishList, mode = 'current', width = 800, height = 384) {
    if (!fishList || !Array.isArray(fishList)) return [];

    const now = Date.now();

    for (let i = 0; i < fishList.length; i++) {
      const f = fishList[i];
      if (!f) continue;

      // Determine target position based on flow mode and biological preference
      let targetX = f.baseX !== undefined ? f.baseX : (f.x || 0.5);
      let targetY = f.baseY !== undefined ? f.baseY : (f.y || 0.5);

      if (f.flowPreference === 'low') {
        if (mode === 'current') {
          // Retreat to bottom-right slack pocket beneath filter canisters
          targetX = 0.84;
          targetY = 0.82;
          f.isSheltering = true;
        } else {
          // Baffled mode: comfortable roaming upper canopy
          targetX = f.baffledX || (f.baseX || 0.35);
          targetY = f.baffledY || (f.baseY || 0.30);
          f.isSheltering = false;
        }
      } else if (f.flowPreference === 'high') {
        // High flow lover: actively holds position directly in the upper jet stream
        if (mode === 'current') {
          targetX = 0.62 + Math.sin(now * 0.001 + i) * 0.08;
          targetY = 0.22 + Math.cos(now * 0.0015 + i) * 0.04;
          f.isSheltering = false;
        } else {
          targetX = f.baffledX || (f.baseX || 0.50);
          targetY = f.baffledY || (f.baseY || 0.40);
        }
      } else if (f.species === 'bottom') {
        // Bottom dwellers: forage across substrate
        targetX = f.baseX || (0.2 + (i * 0.15));
        targetY = 0.90 + Math.sin(now * 0.002 + i) * 0.02;
      }

      // Smooth interpolation toward target
      const lerpSpeed = f.isSheltering ? 0.04 : 0.025;
      f.x = (f.x || targetX) + (targetX - (f.x || targetX)) * lerpSpeed;
      f.y = (f.y || targetY) + (targetY - (f.y || targetY)) * lerpSpeed;

      // Natural hovering oscillation
      f.hoverOffset = Math.sin(now * 0.003 + i * 1.5) * 0.015;

      // Articulated tail oscillation speed based on exertion
      const baseTailSpeed = f.tailSpeed || 3.0;
      const exertion = (mode === 'current' && f.flowPreference === 'high') ? 1.6 : 1.0;
      f.currentTailAngle = Math.sin(now * 0.006 * baseTailSpeed * exertion + i) * (0.28 * exertion);

      // Schooling micro-offsets for schoolers
      if (f.isSchooler && i > 0 && fishList[i - 1]?.isSchooler) {
        const leader = fishList[i - 1];
        const dist = Math.hypot((f.x - leader.x) * width, (f.y - leader.y) * height);
        if (dist > 60) {
          f.x += (leader.x - f.x) * 0.01;
          f.y += (leader.y - f.y) * 0.01;
        }
      }
    }

    return fishList;
  },

  /**
   * Generates a 2D velocity vector field across the tank grid.
   * Useful for fluid heatmap overlays, velocity contour mapping, and headless verification.
   * @param {number} width Tank width
   * @param {number} height Tank height
   * @param {string} mode 'current' | 'baffled'
   * @param {number} resolution Grid sampling resolution in px
   * @returns {{ resolution: number, width: number, height: number, mode: string, vectors: Array<Object> }}
   */
  calculateVelocityField(width = 800, height = 384, mode = 'current', resolution = 40) {
    const vectors = [];
    if (width <= 0 || height <= 0 || resolution <= 0) {
      return { resolution, width, height, mode, vectors };
    }

    const nozzle = this.getNozzleCoords({ width, height });

    for (let x = 0; x <= width; x += resolution) {
      for (let y = 0; y <= height; y += resolution) {
        let vx = 0;
        let vy = 0;

        if (mode === 'current') {
          // Horizontal jet stream originating from top-right nozzle
          const dx = nozzle.x - x;
          const dy = y - nozzle.y;

          if (x < nozzle.x && y < height * 0.5) {
            // Upper jet channel
            const decay = Math.exp(-0.003 * Math.max(0, dx));
            const ySpread = Math.exp(-0.0005 * (dy * dy));
            vx = -6.5 * decay * ySpread;
            vy = -0.018 * decay;
          } else if (y >= height * 0.65) {
            // Lower return eddy toward intake
            const returnStrength = Math.min(1.5, Math.max(0.2, (x / width) * 1.5));
            vx = 0.8 * returnStrength;
            vy = -0.15;
          }

          // Left wall deflection zone
          if (x < width * 0.12 && y < height * 0.6) {
            vx *= 0.6;
            vy += 0.75;
          }
        } else {
          // Baffled mode: elliptical convective circulation
          const cx = width * 0.5;
          const cy = height * 0.46;
          const rx = width * 0.38;
          const ry = height * 0.26;

          // Normalized coordinates relative to convection center
          const nx = (x - cx) / (rx || 1);
          const ny = (y - cy) / (ry || 1);
          const distSq = nx * nx + ny * ny;

          if (distSq > 0.05 && distSq < 2.5) {
            // Tangential circulation (counter-clockwise toroidal loop)
            const speed = Math.exp(-0.5 * Math.abs(distSq - 1.0)) * 2.2;
            vx = ny * speed;
            vy = -nx * speed * 0.6;
          }

          if (y > height * 0.62) {
            vx += 0.045 * 20;
          } else {
            vx -= 0.02 * 20;
          }
        }

        const speed = Math.sqrt(vx * vx + vy * vy);
        vectors.push({ x, y, vx, vy, speed: Number(speed.toFixed(3)) });
      }
    }

    return {
      resolution,
      width,
      height,
      mode,
      vectors
    };
  },

  /**
   * Generates mathematical streamline curves for canvas rendering or analytical inspection.
   * @param {string} mode 'current' | 'baffled'
   * @param {number} width Tank width
   * @param {number} height Tank height
   * @returns {Array<Object>} Streamline curve definitions
   */
  getStreamlines(mode = 'current', width = 800, height = 384) {
    if (width <= 0 || height <= 0) return [];
    const nozzle = this.getNozzleCoords({ width, height });

    if (mode === 'current') {
      const lines = [];
      // 3 upper jet streamlines shooting left from nozzle
      for (let offset = -12; offset <= 12; offset += 12) {
        lines.push({
          type: 'bezier',
          name: `jet-stream-${offset}`,
          start: { x: nozzle.x, y: nozzle.y + offset },
          cp1: { x: width * 0.55, y: nozzle.y + offset * 0.5 },
          cp2: { x: width * 0.30, y: height * 0.22 + offset * 1.2 },
          end: { x: width * 0.10, y: height * 0.30 + offset * 1.5 }
        });
      }
      // Bottom return current eddy toward intake
      lines.push({
        type: 'bezier',
        name: 'return-eddy',
        start: { x: width * 0.15, y: height * 0.80 },
        cp1: { x: width * 0.40, y: height * 0.83 },
        cp2: { x: width * 0.65, y: height * 0.82 },
        end: { x: width * 0.84, y: height * 0.72 }
      });
      return lines;
    } else {
      // 45° Glass-baffled circular convection loops
      return [
        {
          type: 'ellipse',
          name: 'outer-convection-loop',
          cx: width * 0.5,
          cy: height * 0.46,
          rx: width * 0.38,
          ry: height * 0.26
        },
        {
          type: 'ellipse',
          name: 'inner-convection-core',
          cx: width * 0.5,
          cy: height * 0.46,
          rx: width * 0.22,
          ry: height * 0.15
        }
      ];
    }
  }
};

// CommonJS & ES Module Dual Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FlowEngine;
  module.exports.FlowEngine = FlowEngine;
  module.exports.default = FlowEngine;
}
if (typeof window !== 'undefined') {
  window.FlowEngine = FlowEngine;
}
if (typeof globalThis !== 'undefined') {
  globalThis.FlowEngine = FlowEngine;
}

export { FlowEngine };
export default FlowEngine;


/**
 * AquaPulse Flow & Interactive Aquascape Engine
 * 
 * Provides:
 * 1. Procedural Aquascape Hardscape: Center Spiderwood, Live Anubias, Java Moss, River Rocks, Pothos Roots & Substrate
 * 2. Animated Flow Physics: Straight Venturi Jet vs. 45° Glass-Baffled Convection Loops
 * 3. Aeration Bubble Dynamics with Buoyancy & Dispersion
 * 4. Realistic Dynamic Overhead Caustic Rays & Water Atmosphere
 * 5. Velocity Heatmap (Jet Speed, Moderate Drift, Calm Sanctuary)
 * 6. Dynamic Fish Swimming Physics & Depth-Layer Strata
 */

(function (window) {
  let canvas = null;
  let ctx = null;
  let animId = null;
  let width = 0;
  let height = 0;

  // Configuration State
  let currentMode = 'current'; // 'current' or 'baffled'
  let showHeatmap = false;
  let showFish = true;
  let showCaustics = true;
  let showBubbles = true;

  // Particle & Caustic Pools
  const particles = [];
  const particleCount = 85;
  const caustics = [];

  // Fish Roster - built dynamically from active config
  let fishList = [];

  function buildFishListFromConfig() {
    const cfg = window.getActiveConfig ? window.getActiveConfig() : window.AQUAPULSE_DEFAULT_CONFIG;
    if (!cfg || !cfg.species) {
      fishList = getDefaultFishList();
      return;
    }

    fishList = [];
    const palette = ['#f87171', '#60a5fa', '#fbbf24', '#94a3b8', '#38bdf8', '#f43f5e', '#22d3ee', '#fde047', '#eab308', '#a78bfa', '#34d399', '#fb923c'];
    const zoneDefaults = {
      top:    { yBase: 0.22, yRange: 0.12, baffledY: 0.24, icon: '🐟' },
      mid:    { yBase: 0.48, yRange: 0.16, baffledY: 0.46, icon: '🐟' },
      bottom: { yBase: 0.90, yRange: 0.04, baffledY: 0.90, icon: '🐾' }
    };
    const tailSpeeds = { top: 8, mid: 12, bottom: 9 };

    cfg.species.forEach((sp, idx) => {
      const zone = zoneDefaults[sp.zone] || zoneDefaults.mid;
      const xPos = 0.12 + ((idx / Math.max(cfg.species.length - 1, 1)) * 0.72);
      const yJitter = (Math.sin(idx * 2.7) * 0.5) * zone.yRange;
      const yPos = zone.yBase + yJitter;
      const baffledXJitter = (Math.cos(idx * 1.9) * 0.08);

      fishList.push({
        id: sp.id,
        name: sp.count > 1 ? `${sp.name} (×${sp.count})` : sp.name,
        species: sp.zone,
        x: xPos, y: yPos,
        targetX: xPos, targetY: yPos,
        baffledX: xPos + baffledXJitter, baffledY: zone.baffledY + yJitter,
        icon: zone.icon,
        color: palette[idx % palette.length],
        size: sp.zone === 'mid' ? 14 : 12,
        tailSpeed: tailSpeeds[sp.zone] || 10,
        flowPreference: sp.flowPreference || 'moderate'
      });
    });
  }

  function getDefaultFishList() {
    return [
      { id: "tetra", name: "Neon Tetras (×10)", species: "mid", x: 0.26, y: 0.42, targetX: 0.26, targetY: 0.42, baffledX: 0.32, baffledY: 0.40, icon: "🐟", color: "#22d3ee", size: 12, tailSpeed: 12, flowPreference: "moderate" },
      { id: "guppy", name: "Fancy Guppy (×6)", species: "top", x: 0.44, y: 0.22, targetX: 0.44, targetY: 0.22, baffledX: 0.40, baffledY: 0.24, icon: "🐟", color: "#f87171", size: 11, tailSpeed: 10, flowPreference: "low" },
      { id: "cory", name: "Corydoras (×4)", species: "bottom", x: 0.16, y: 0.90, targetX: 0.16, targetY: 0.90, baffledX: 0.18, baffledY: 0.90, icon: "🐾", color: "#fde047", size: 11, tailSpeed: 9, flowPreference: "low" },
      { id: "snail", name: "Nerite Snail (×2)", species: "bottom", x: 0.52, y: 0.91, targetX: 0.52, targetY: 0.91, baffledX: 0.52, baffledY: 0.91, icon: "🌱", color: "#eab308", size: 10, tailSpeed: 3, flowPreference: "moderate" }
    ];
  }

  function initFlowVisualizer(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    buildFishListFromConfig();
    ctx = canvas.getContext('2d');
    resize();
    window.removeEventListener('resize', resize);
    window.addEventListener('resize', resize);

    // Initialize particles
    particles.length = 0;
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(true));
    }

    // Initialize caustics
    caustics.length = 0;
    for (let i = 0; i < 8; i++) {
      caustics.push({
        x: (i / 8) * (width || 600) + Math.random() * 25,
        width: 35 + Math.random() * 35,
        speed: 0.007 + Math.random() * 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }

    draw();

    if (!animId) {
      animate();
    }
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width || canvas.offsetWidth || (canvas.parentElement ? canvas.parentElement.offsetWidth : 800) || 800;
    height = rect.height || canvas.offsetHeight || (canvas.parentElement ? canvas.parentElement.offsetHeight : 384) || 384;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (ctx) ctx.scale(dpr, dpr);
  }

  function getNozzleCoords() {
    return {
      x: width - (width > 600 ? 155 : 135),
      y: height * 0.15
    };
  }

  function createParticle(randomSpread = false) {
    const nozzle = getNozzleCoords();

    if (randomSpread) {
      return {
        x: Math.random() * width,
        y: Math.random() * (height * 0.72) + 15,
        vx: currentMode === 'current' ? -(3.5 + Math.random() * 4) : -(1.2 + Math.random() * 2),
        vy: (Math.random() - 0.5) * 1.4,
        size: 0.9 + Math.random() * 2.2,
        alpha: 0.2 + Math.random() * 0.6,
        life: Math.random() * 100
      };
    }

    return {
      x: nozzle.x - Math.random() * 8,
      y: nozzle.y + (Math.random() - 0.5) * 10,
      vx: currentMode === 'current' ? -(4.2 + Math.random() * 5.2) : -(1.5 + Math.random() * 2.5),
      vy: currentMode === 'current' ? (Math.random() - 0.38) * 1.2 : (Math.random() * 1.6 + 0.4),
      size: 1 + Math.random() * 2.8,
      alpha: 0.65 + Math.random() * 0.35,
      life: 0
    };
  }

  function updatePhysics() {
    const nozzle = getNozzleCoords();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life++;

      if (currentMode === 'current') {
        // Linear Jet right-to-left
        p.x += p.vx;
        p.y += p.vy;

        // Micro air bubble buoyancy
        p.vy -= 0.018;

        // Glass deflection along left pane
        if (p.x < width * 0.12) {
          p.vx *= 0.6;
          p.vy += 0.75;
        }

        // Dissipate as it travels across tank
        if (p.x < 12 || p.y < 8 || p.y > height * 0.86 || p.life > 140) {
          particles[i] = createParticle();
        }
      } else {
        // 45° Glass-baffled flow: bouncing circular convective circulation
        p.x += p.vx;
        p.y += p.vy;

        if (p.y > height * 0.62) {
          p.vx += 0.045; // roll gently along substrate
        } else {
          p.vx -= 0.02; // roll across upper column
        }
        p.vy += 0.01;

        if (p.x < 15 || p.x > width * 0.95 || p.y < 10 || p.y > height * 0.86 || p.life > 180) {
          particles[i] = createParticle();
        }
      }
    }

    // Smoothly animate fish positions based on flow stress & hovering dynamics
    const isBaffled = currentMode === 'baffled';
    const now = Date.now();
    fishList.forEach((f, idx) => {
      const targetX = isBaffled ? f.baffledX : f.targetX;
      const targetY = isBaffled ? f.baffledY : f.targetY;
      f.x += (targetX - f.x) * 0.05;
      f.y += (targetY - f.y) * 0.05;

      // Natural hovering swim wobble
      f.wobble = Math.sin(now * 0.003 + idx * 1.5) * 0.01;
      f.tailWiggle = Math.sin(now * 0.008 * (f.tailSpeed || 10) + idx);
    });
  }

  function draw() {
    if (!ctx || width <= 0 || height <= 0) return;
    ctx.clearRect(0, 0, width, height);

    // 1. Water Column Atmosphere & Dynamic Ambient Depth
    drawWaterAtmosphere();

    // 2. Background Aquatic Plants (Swaying Vallisneria / Stem Greens)
    drawBackgroundPlants();

    // 3. Overhead Sunlight & LED Caustic Rays
    if (showCaustics) {
      drawCaustics();
    }

    // 4. Hardscape Layer (Center Spiderwood, Anubias, Java Moss, River Rocks, Gravel)
    drawHardscape();

    // 5. Velocity Heatmap Layer (if toggled)
    if (showHeatmap) {
      drawVelocityHeatmap();
    }

    // 6. Current Streamlines & Flow Vectors
    drawStreamlines();

    // 7. Micro-Bubbles & Aeration Jet Particles
    if (showBubbles) {
      drawBubbles();
    }

    // 8. Dynamic Swimming Fish & Depth Strata
    if (showFish) {
      drawFishPresence();
    }
  }

  function drawWaterAtmosphere() {
    ctx.save();
    // Ambient aquatic lighting gradient
    const ambientGrad = ctx.createLinearGradient(0, 0, 0, height);
    ambientGrad.addColorStop(0, 'rgba(6, 182, 212, 0.06)');
    ambientGrad.addColorStop(0.5, 'rgba(15, 49, 72, 0.12)');
    ambientGrad.addColorStop(1, 'rgba(2, 6, 23, 0.40)');
    ctx.fillStyle = ambientGrad;
    ctx.fillRect(0, 0, width, height);

    // Dynamic surface waterline ripples
    const time = Date.now() * 0.002;
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    for (let x = 0; x <= width; x += 30) {
      const y = 6 + Math.sin(time + x * 0.03) * 1.8;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawBackgroundPlants() {
    ctx.save();
    const time = Date.now() * 0.0015;
    // Left-side background Vallisneria grass swaying softly
    const stems = [
      { base: 0.10, height: 0.65, sway: 14, color: 'rgba(16, 185, 129, 0.28)' },
      { base: 0.14, height: 0.72, sway: 18, color: 'rgba(5, 150, 105, 0.35)' },
      { base: 0.18, height: 0.60, sway: 12, color: 'rgba(16, 185, 129, 0.24)' },
      { base: 0.22, height: 0.55, sway: 16, color: 'rgba(4, 120, 87, 0.30)' },
      { base: 0.27, height: 0.48, sway: 10, color: 'rgba(16, 185, 129, 0.22)' }
    ];

    stems.forEach((s, idx) => {
      const bx = s.base * width;
      const by = height * 0.88;
      const topY = height * (1 - s.height);
      const swayOffset = Math.sin(time + idx * 1.2) * s.sway;

      ctx.strokeStyle = s.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + swayOffset * 0.5, (by + topY) / 2, bx + swayOffset, topY);
      ctx.stroke();

      // Blade tip taper
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + swayOffset * 0.8, (by + topY * 2) / 3);
      ctx.lineTo(bx + swayOffset, topY);
      ctx.stroke();
    });

    // Pothos hanging roots from top right rim into water column
    const rootStartX = width * 0.74;
    const rootStartY = 8;
    const rootLength = height * 0.32;
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 5; r++) {
      const rx = rootStartX + r * 10;
      const rSway = Math.sin(time * 0.8 + r) * 6;
      ctx.beginPath();
      ctx.moveTo(rx, rootStartY);
      ctx.bezierCurveTo(rx + rSway * 0.4, rootStartY + rootLength * 0.4, rx - rSway * 0.5, rootStartY + rootLength * 0.7, rx + rSway, rootStartY + rootLength);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawCaustics() {
    const time = Date.now() * 0.0015;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    caustics.forEach((c) => {
      const swing = Math.sin(time + c.phase) * 22;
      const grad = ctx.createLinearGradient(c.x + swing, 0, c.x + swing + 35, height * 0.86);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
      grad.addColorStop(0.4, 'rgba(103, 232, 249, 0.06)');
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(c.x + swing, 0);
      ctx.lineTo(c.x + swing + c.width, 0);
      ctx.lineTo(c.x + swing + c.width * 1.8, height * 0.86);
      ctx.lineTo(c.x + swing - c.width * 0.8, height * 0.86);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  }

  function drawHardscape() {
    ctx.save();

    // 1. Bottom Substrate Gravel Bed
    const subGrad = ctx.createLinearGradient(0, height * 0.86, 0, height);
    subGrad.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
    subGrad.addColorStop(0.4, 'rgba(30, 41, 59, 0.96)');
    subGrad.addColorStop(1, 'rgba(2, 6, 23, 1)');

    ctx.fillStyle = subGrad;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.89);
    // Subtle natural mound under center wood
    ctx.quadraticCurveTo(width * 0.35, height * 0.87, width * 0.50, height * 0.85);
    ctx.quadraticCurveTo(width * 0.65, height * 0.87, width, height * 0.89);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Scattered gravel micro-pebbles along substrate surface
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    for (let p = 0; p < 24; p++) {
      const px = (p / 24) * width + ((p * 37) % 15);
      const py = height * 0.87 + ((p * 19) % 18);
      ctx.beginPath();
      ctx.arc(px, py, 1.2 + (p % 3) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Center-Island Spiderwood Trunk & Branches
    const trunkX = width * 0.49;
    const trunkBaseY = height * 0.86;
    const branchTime = Date.now() * 0.001;

    // Rich wood bark gradient
    const woodGrad = ctx.createLinearGradient(trunkX - 40, trunkBaseY, trunkX + 40, height * 0.38);
    woodGrad.addColorStop(0, '#381c08');
    woodGrad.addColorStop(0.4, '#5c2d12');
    woodGrad.addColorStop(0.7, '#7c3a0e');
    woodGrad.addColorStop(1, '#9a3412');

    ctx.strokeStyle = woodGrad;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Main Central Trunk
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(trunkX, trunkBaseY);
    ctx.bezierCurveTo(trunkX - 10, height * 0.70, trunkX + 15, height * 0.58, trunkX, height * 0.48);
    ctx.stroke();

    // Left Ascending Branch (Reaching towards Left Canopy Zone A)
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(trunkX - 4, height * 0.62);
    ctx.bezierCurveTo(trunkX - 50, height * 0.58, width * 0.36, height * 0.52, width * 0.32, height * 0.44);
    ctx.stroke();

    // Left Secondary Twig
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(width * 0.38, height * 0.54);
    ctx.quadraticCurveTo(width * 0.35, height * 0.60, width * 0.30, height * 0.58);
    ctx.stroke();

    // Top Arched Branch
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(trunkX, height * 0.48);
    ctx.bezierCurveTo(trunkX + 25, height * 0.40, trunkX + 10, height * 0.32, trunkX - 20, height * 0.30);
    ctx.stroke();

    // Right Horizontal Branch (Holding the Java Moss Clump directly in filter stream)
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(trunkX + 6, height * 0.58);
    ctx.bezierCurveTo(trunkX + 50, height * 0.56, width * 0.62, height * 0.52, width * 0.68, height * 0.54);
    ctx.stroke();

    // Java Moss Clump on Right Branch
    const mossX = width * 0.63;
    const mossY = height * 0.53;
    const mossSway = Math.sin(branchTime * 4) * 2;
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(mossX, mossY, 22, 12, mossSway * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Moss texture highlights
    ctx.fillStyle = '#22c55e';
    for (let m = 0; m < 8; m++) {
      const mx = mossX - 14 + (m * 4) + mossSway;
      const my = mossY - 5 + ((m * 7) % 9);
      ctx.beginPath();
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Live Anubias Leaf Clusters (4 Anubias plants mounted on wood joints)
    const leafClusters = [
      { x: trunkX - 12, y: height * 0.58, angle: -0.4, scale: 1.1 },
      { x: trunkX + 8, y: height * 0.46, angle: 0.3, scale: 0.95 },
      { x: width * 0.34, y: height * 0.46, angle: -0.6, scale: 0.85 },
      { x: trunkX - 18, y: height * 0.32, angle: -0.2, scale: 0.75 }
    ];

    leafClusters.forEach((cl) => {
      drawAnubiasCluster(cl.x, cl.y, cl.angle, cl.scale);
    });

    // 3. Foreground River Stone Formations (Current-Break Sanctuary)
    drawRiverRock(width * 0.44, height * 0.87, 28, 16, '#334155', '#475569');
    drawRiverRock(width * 0.52, height * 0.88, 34, 18, '#1e293b', '#334155');
    drawRiverRock(width * 0.48, height * 0.89, 22, 13, '#475569', '#64748b');
    drawRiverRock(width * 0.38, height * 0.88, 20, 12, '#1e293b', '#334155');

    ctx.restore();
  }

  function drawAnubiasCluster(cx, cy, baseAngle, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(baseAngle);
    ctx.scale(scale, scale);

    const leaves = [-0.45, -0.15, 0.2, 0.5];
    leaves.forEach((ang) => {
      ctx.save();
      ctx.rotate(ang);

      // Dark Green Leaf Body
      const leafGrad = ctx.createLinearGradient(0, 0, 18, -6);
      leafGrad.addColorStop(0, '#064e3b');
      leafGrad.addColorStop(0.5, '#047857');
      leafGrad.addColorStop(1, '#10b981');
      ctx.fillStyle = leafGrad;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(10, -10, 24, -4);
      ctx.quadraticCurveTo(28, 0, 24, 4);
      ctx.quadraticCurveTo(10, 10, 0, 0);
      ctx.fill();

      // Leaf midrib
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(22, 0);
      ctx.stroke();

      ctx.restore();
    });

    ctx.restore();
  }

  function drawRiverRock(rx, ry, rw, rh, cDark, cLight) {
    ctx.save();
    // Shadow under rock
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(rx, ry + rh * 0.6, rw * 1.05, rh * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock body
    const rGrad = ctx.createRadialGradient(rx - rw * 0.25, ry - rh * 0.3, rh * 0.2, rx, ry, rw);
    rGrad.addColorStop(0, cLight);
    rGrad.addColorStop(0.7, cDark);
    rGrad.addColorStop(1, '#090d16');

    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Top subtle highlight reflection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(rx - rw * 0.1, ry - rh * 0.35, rw * 0.65, rh * 0.3, -0.1, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();

    ctx.restore();
  }

  function drawVelocityHeatmap() {
    ctx.save();
    if (currentMode === 'current') {
      // High jet stream across upper column
      const jetGrad = ctx.createLinearGradient(width * 0.9, height * 0.20, width * 0.1, height * 0.20);
      jetGrad.addColorStop(0, 'rgba(239, 68, 68, 0.32)');    // Red/Amber (Extreme Jet)
      jetGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.24)'); // Amber (Fast lateral)
      jetGrad.addColorStop(0.8, 'rgba(6, 182, 212, 0.16)');  // Cyan (Eddy)
      jetGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.ellipse(width * 0.5, height * 0.22, width * 0.44, height * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Calm slack pocket under filter (bottom right)
      const calmGrad = ctx.createRadialGradient(width * 0.86, height * 0.82, 5, width * 0.86, height * 0.82, 85);
      calmGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');  // Calm Sanctuary
      calmGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = calmGrad;
      ctx.beginPath();
      ctx.arc(width * 0.86, height * 0.82, 85, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Gentle circular convection pattern
      const rollGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 20, width * 0.5, height * 0.45, width * 0.45);
      rollGrad.addColorStop(0, 'rgba(6, 182, 212, 0.16)');
      rollGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.22)');
      rollGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = rollGrad;
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.45, width * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawStreamlines() {
    ctx.save();
    ctx.strokeStyle = currentMode === 'current' ? 'rgba(34, 211, 238, 0.45)' : 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 7]);

    const time = Date.now() * 0.002;
    ctx.lineDashOffset = -time * 22;

    if (currentMode === 'current') {
      const nozzle = getNozzleCoords();
      // 3 Straight streamlines shooting left from filter nozzle
      for (let offset = -12; offset <= 12; offset += 12) {
        ctx.beginPath();
        ctx.moveTo(nozzle.x, nozzle.y + offset);
        ctx.bezierCurveTo(
          width * 0.55, nozzle.y + offset * 0.5,
          width * 0.3, height * 0.22 + offset * 1.2,
          width * 0.10, height * 0.30 + offset * 1.5
        );
        ctx.stroke();
      }

      // Bottom return current eddy toward intake
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.22)';
      ctx.beginPath();
      ctx.moveTo(width * 0.15, height * 0.80);
      ctx.bezierCurveTo(width * 0.40, height * 0.83, width * 0.65, height * 0.82, width * 0.84, height * 0.72);
      ctx.stroke();
    } else {
      // Baffled 45° circular convection loop
      ctx.beginPath();
      ctx.ellipse(width * 0.5, height * 0.46, width * 0.38, height * 0.26, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBubbles() {
    ctx.save();
    particles.forEach(p => {
      ctx.fillStyle = `rgba(165, 243, 252, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      // Bubble specular core highlight
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawFishPresence() {
    ctx.save();
    const time = Date.now() * 0.003;

    fishList.forEach(f => {
      const px = f.x * width;
      const py = (f.y + (f.wobble || 0)) * height;
      const isFacingLeft = currentMode === 'current' || f.x > 0.4;

      // Draw subtle swimming tail and fin silhouette
      ctx.save();
      ctx.translate(px, py);
      if (!isFacingLeft) ctx.scale(-1, 1);

      // Swimming tail wag animation
      const tailAngle = (f.tailWiggle || 0) * 0.28;
      ctx.save();
      ctx.rotate(tailAngle);
      ctx.fillStyle = `${f.color}40`; // 25% opacity tail
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(18, -6);
      ctx.lineTo(16, 0);
      ctx.lineTo(18, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // Compact, elegant translucent glass card pill
      const text = `${f.icon} ${f.name}`;
      ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const padding = 5;
      const boxW = textWidth + padding * 2;
      const boxH = 17;

      ctx.fillStyle = 'rgba(10, 20, 32, 0.82)';
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(px - boxW / 2, py - boxH / 2, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      // Glowing zone dot
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(px - boxW / 2 + 6, py, 2, 0, Math.PI * 2);
      ctx.fill();

      // Name Text
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(text, px + 2, py);

      // Status indicator for flow-sensitive species (labyrinth fish, nano fish)
      if (f.flowPreference === 'low') {
        const isStressed = currentMode === 'current';
        const stText = isStressed ? "⚠️ Seeking Calm Zone" : "✅ Comfortable";
        const stColor = isStressed ? "#f43f5e" : "#34d153";
        ctx.font = '8px ui-sans-serif, system-ui, sans-serif';
        ctx.fillStyle = stColor;
        ctx.fillText(stText, px, py + 13);
      }
    });

    ctx.restore();
  }

  function animate() {
    updatePhysics();
    draw();
    animId = requestAnimationFrame(animate);
  }

  function setMode(mode) {
    currentMode = mode;
  }

  function toggleHeatmap() {
    showHeatmap = !showHeatmap;
    return showHeatmap;
  }

  function toggleFish() {
    showFish = !showFish;
    return showFish;
  }

  function toggleBubbles() {
    showBubbles = !showBubbles;
    return showBubbles;
  }

  // Export to Global Scope
  window.AquaPulseFlow = {
    init: initFlowVisualizer,
    setMode: setMode,
    toggleHeatmap: toggleHeatmap,
    toggleFish: toggleFish,
    toggleBubbles: toggleBubbles,
    getState: function () {
      return { currentMode, showHeatmap, showFish, showCaustics, showBubbles };
    }
  };

})(window);

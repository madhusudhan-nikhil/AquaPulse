/**
 * AquaPulse Flow & Interactive Aquascape Engine (10x Edition)
 * Provides high-fidelity 2D Canvas aquarium simulation with realistic equipment,
 * nature aquascape, living fish AI, lighting spectrums, and fluid dynamics.
 */

(function (window) {
  let canvas = null;
  let ctx = null;
  let animId = null;
  let width = 800;
  let height = 440;

  let currentMode = 'current'; // 'current' or 'baffled'
  let currentLighting = 'daylight'; // 'daylight', 'sunset', 'moonlight'
  let showHeatmap = false;
  let showFish = true;
  let showCaustics = true;
  let showBubbles = true;
  let showEquipment = true;
  let showLabels = false;

  const particles = [];
  const particleCount = 95;
  const caustics = [];
  const foodParticles = [];
  let fishList = [];

  const LIGHTING_MODES = {
    daylight: {
      ambientTop: 'rgba(6, 182, 212, 0.12)',
      ambientMid: 'rgba(14, 116, 144, 0.16)',
      ambientBottom: 'rgba(2, 6, 23, 0.70)',
      shimmerColor: 'rgba(207, 250, 254, 0.25)',
      lightRayColor: 'rgba(255, 255, 255, 0.16)',
      ledColor: '#38bdf8'
    },
    sunset: {
      ambientTop: 'rgba(245, 158, 11, 0.15)',
      ambientMid: 'rgba(180, 83, 9, 0.18)',
      ambientBottom: 'rgba(15, 23, 42, 0.82)',
      shimmerColor: 'rgba(254, 215, 170, 0.25)',
      lightRayColor: 'rgba(251, 191, 36, 0.14)',
      ledColor: '#f59e0b'
    },
    moonlight: {
      ambientTop: 'rgba(30, 58, 138, 0.28)',
      ambientMid: 'rgba(15, 23, 42, 0.40)',
      ambientBottom: 'rgba(2, 6, 23, 0.92)',
      shimmerColor: 'rgba(147, 197, 253, 0.18)',
      lightRayColor: 'rgba(96, 165, 250, 0.10)',
      ledColor: '#6366f1'
    }
  };

  function safeDrawRect(ctx, x, y, w, h, r = 4) {
    if (typeof ctx.roundRect === 'function') {
      try {
        ctx.roundRect(x, y, w, h, typeof r === 'number' ? r : 4);
        return;
      } catch (_) {}
    }
    ctx.rect(x, y, w, h);
  }

  function buildFishList() {
    const cfg = window.getActiveConfig ? window.getActiveConfig() : window.AQUAPULSE_DEFAULT_CONFIG;
    if (cfg && Array.isArray(cfg.species) && cfg.species.length > 0) {
      fishList = [];
      const palettes = {
        'denison-barb': { color: '#e11d48', secondary: '#facc15', species: 'barb', size: 19, speed: 5.8, flow: 'high', zone: 'mid' },
        'silver-tip-tetra': { color: '#f59e0b', secondary: '#ffffff', species: 'tetra', isSchooler: true, size: 13, speed: 4.6, flow: 'moderate', zone: 'mid' },
        'albino-corydoras': { color: '#fef08a', secondary: '#f472b6', species: 'cory', size: 14, speed: 2.2, flow: 'low', zone: 'bottom' },
        'female-betta': { color: '#ec4899', secondary: '#818cf8', species: 'betta', size: 15, speed: 1.6, flow: 'low', zone: 'top' },
        'neon-tetra': { color: '#06b6d4', secondary: '#ef4444', species: 'tetra', isSchooler: true, size: 12, speed: 4.8, flow: 'moderate', zone: 'mid' },
        'angelfish': { color: '#f59e0b', secondary: '#ffffff', species: 'cichlid', size: 22, speed: 2.0, flow: 'moderate', zone: 'mid' }
      };

      const zoneDefaults = {
        top: { y: 0.22, range: 0.08 },
        mid: { y: 0.45, range: 0.14 },
        bottom: { y: 0.88, range: 0.04 }
      };

      cfg.species.forEach((sp, idx) => {
        const p = palettes[sp.id] || { color: '#38bdf8', secondary: '#ffffff', species: 'mid', size: 14, speed: 3.5, flow: 'moderate', zone: 'mid' };
        const zoneInfo = zoneDefaults[p.zone] || zoneDefaults.mid;
        const xPos = 0.18 + ((idx / Math.max(cfg.species.length - 1, 1)) * 0.58);
        const yPos = zoneInfo.y + (Math.sin(idx * 2.3) * zoneInfo.range * 0.5);

        fishList.push({
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

    // Default Roster
    fishList = [
      { id: 'angel-koi', name: 'Koi Angelfish', species: 'cichlid', count: 4, baseX: 0.40, baseY: 0.42, color: '#f59e0b', secondaryColor: '#ffffff', tailSpeed: 2.2, size: 23, flowPreference: 'moderate', zone: 'mid' },
      { id: 'denison-barb', name: 'Denison Barb', species: 'barb', count: 8, baseX: 0.65, baseY: 0.24, color: '#e11d48', secondaryColor: '#facc15', tailSpeed: 5.8, size: 19, flowPreference: 'high', zone: 'mid' },
      { id: 'neon-tetra', name: 'Neon Tetra', species: 'tetra', count: 15, isSchooler: true, baseX: 0.28, baseY: 0.38, color: '#06b6d4', secondaryColor: '#ef4444', tailSpeed: 4.8, size: 13, flowPreference: 'moderate', zone: 'mid' },
      { id: 'silvertip', name: 'Silver Tip Tetra', species: 'tetra', count: 11, isSchooler: true, baseX: 0.34, baseY: 0.46, color: '#f59e0b', secondaryColor: '#f8fafc', tailSpeed: 4.5, size: 13, flowPreference: 'moderate', zone: 'mid' },
      { id: 'betta-female', name: 'Female Betta', species: 'betta', count: 3, baseX: 0.22, baseY: 0.25, baffledX: 0.18, baffledY: 0.22, color: '#ec4899', secondaryColor: '#a855f7', tailSpeed: 1.6, size: 15, flowPreference: 'low', zone: 'top' },
      { id: 'corydoras', name: 'Albino Corydoras', species: 'cory', count: 6, baseX: 0.25, baseY: 0.89, color: '#fef08a', secondaryColor: '#f472b6', tailSpeed: 2.2, size: 14, flowPreference: 'low', zone: 'bottom' }
    ];
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(320, Math.round(rect.width || canvas.parentElement?.offsetWidth || 800));
    height = Math.max(220, Math.round(rect.height || canvas.parentElement?.offsetHeight || 440));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.72) + 15,
        vx: currentMode === 'current' ? -(3.5 + Math.random() * 4) : -(1.2 + Math.random() * 2),
        vy: (Math.random() - 0.5) * 1.4,
        size: 1 + Math.random() * 2.2,
        alpha: 0.3 + Math.random() * 0.5,
        life: Math.floor(Math.random() * 100)
      });
    }

    caustics.length = 0;
    for (let i = 0; i < 10; i++) {
      caustics.push({
        x: (i / 10) * width,
        width: 32 + Math.random() * 45,
        speed: 0.005 + Math.random() * 0.006,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function updatePhysics() {
    const w = width;
    const h = height;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life = (p.life || 0) + 1;

      if (currentMode === 'current') {
        p.vy -= 0.018;
        if (p.x < w * 0.12) { p.vx *= 0.6; p.vy += 0.75; }
        if (p.x < 12 || p.y < 8 || p.y > h * 0.86 || p.life > 140) {
          p.x = w - 155; p.y = h * 0.15; p.vx = -(4.2 + Math.random() * 5); p.vy = (Math.random() - 0.4) * 1.2; p.life = 0;
        }
      } else {
        if (p.y > h * 0.62) p.vx += 0.045; else p.vx -= 0.02;
        p.vy += 0.01;
        if (p.x < 15 || p.x > w * 0.95 || p.y < 10 || p.y > h * 0.86 || p.life > 180) {
          p.x = w - 135; p.y = h * 0.15; p.vx = -(1.5 + Math.random() * 2); p.vy = Math.random() * 1.5 + 0.4; p.life = 0;
        }
      }
    }

    // Fish AI
    const now = Date.now();
    for (let i = 0; i < fishList.length; i++) {
      const f = fishList[i];
      let tx = f.baseX || 0.5;
      let ty = f.baseY || 0.5;

      if (f.flowPreference === 'low') {
        if (currentMode === 'current') { tx = 0.84; ty = 0.82; f.isSheltering = true; }
        else { tx = f.baffledX || 0.35; ty = f.baffledY || 0.30; f.isSheltering = false; }
      } else if (f.flowPreference === 'high') {
        if (currentMode === 'current') {
          tx = 0.60 + Math.sin(now * 0.001 + i) * 0.08;
          ty = 0.22 + Math.cos(now * 0.0015 + i) * 0.04;
          f.isSheltering = false;
        } else {
          tx = f.baffledX || 0.50;
          ty = f.baffledY || 0.40;
        }
      } else {
        tx = (f.baseX || 0.45) + Math.sin(now * 0.0008 + i * 1.8) * 0.05;
        ty = (f.baseY || 0.45) + Math.cos(now * 0.0012 + i) * 0.03;
      }

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

    // Food particles
    for (let i = foodParticles.length - 1; i >= 0; i--) {
      const f = foodParticles[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += f.gravity;
      f.life++;
      if (f.y >= h * 0.90 || f.life > 280) {
        foodParticles.splice(i, 1);
      }
    }
  }

  function draw() {
    if (!ctx) return;
    const w = width;
    const h = height;
    ctx.clearRect(0, 0, w, h);

    const light = LIGHTING_MODES[currentLighting] || LIGHTING_MODES.daylight;

    // 1. Water atmosphere
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, light.ambientTop);
    grad.addColorStop(0.5, light.ambientMid);
    grad.addColorStop(1, light.ambientBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Dynamic water surface meniscus
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

    // 2. Caustics
    if (showCaustics) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const c of caustics) {
        c.phase += c.speed;
        const curX = (c.x + Math.sin(c.phase) * 40) % (w + 60);
        const cGrad = ctx.createLinearGradient(curX, 0, curX + c.width * 0.6, h * 0.75);
        cGrad.addColorStop(0, light.lightRayColor);
        cGrad.addColorStop(0.5, 'rgba(103, 232, 249, 0.035)');
        cGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = cGrad;
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

    // 3. Nature Aquascape
    ctx.save();
    // Background Vallisneria
    const plantColor = currentLighting === 'moonlight' ? 'rgba(30, 64, 175, 0.35)' : 'rgba(16, 185, 129, 0.32)';
    ctx.strokeStyle = plantColor;
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    for (let p = 0; p < 7; p++) {
      const bx = (w * 0.07) + (p * 26);
      const by = h * 0.90;
      const ph = h * (0.45 + (p % 3) * 0.14);
      const sway = Math.sin(time * 0.75 + p) * 18;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sway * 0.5, by - ph * 0.5, bx + sway, by - ph);
      ctx.stroke();
    }

    // Substrate
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

    // Central Spiderwood
    const trunkX = w * 0.46;
    const woodGrad = ctx.createLinearGradient(trunkX, subY, trunkX + 30, h * 0.35);
    woodGrad.addColorStop(0, '#381c08');
    woodGrad.addColorStop(0.5, '#5c2d12');
    woodGrad.addColorStop(1, '#7c3a0e');
    ctx.strokeStyle = woodGrad;
    ctx.lineCap = 'round';
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(trunkX, subY);
    ctx.bezierCurveTo(trunkX - 15, h * 0.72, trunkX + 20, h * 0.58, trunkX, h * 0.46);
    ctx.stroke();

    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(trunkX - 5, h * 0.62);
    ctx.bezierCurveTo(trunkX - 45, h * 0.56, w * 0.34, h * 0.50, w * 0.28, h * 0.44);
    ctx.stroke();

    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(trunkX + 6, h * 0.58);
    ctx.bezierCurveTo(trunkX + 50, h * 0.54, w * 0.60, h * 0.48, w * 0.66, h * 0.52);
    ctx.stroke();

    // Moss
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(w * 0.62, h * 0.50, 24, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Equipment
    if (showEquipment) {
      ctx.save();
      const filterW = w > 600 ? 76 : 64;
      const filterH = Math.min(h * 0.72, 240);
      const filterX = w - filterW - 16;
      const filterY = 18;

      // Overhead LED bar
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      safeDrawRect(ctx, w * 0.12, 2, w * 0.76, 10, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = light.ledColor;
      for (let lx = w * 0.12 + 15; lx < w * 0.88 - 15; lx += 22) {
        ctx.beginPath();
        ctx.arc(lx, 8, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Heater
      const heaterX = filterX - 26;
      const heaterY = filterY + 12;
      const heaterW = 18;
      const heaterH = filterH * 0.78;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      safeDrawRect(ctx, heaterX, heaterY, heaterW, heaterH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let cy = heaterY + 22; cy < heaterY + heaterH - 26; cy += 6) {
        ctx.moveTo(heaterX + 3, cy);
        ctx.lineTo(heaterX + heaterW - 3, cy + 3);
      }
      ctx.stroke();

      // Filter Motorhead
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      safeDrawRect(ctx, filterX, filterY, filterW, 42, 6);
      ctx.fill();
      ctx.stroke();

      // Pulsing status LED
      const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
      ctx.fillStyle = `rgba(6, 182, 212, ${pulse})`;
      ctx.beginPath();
      ctx.arc(filterX + filterW - 14, filterY + 14, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('1750 L/h', filterX + 8, filterY + 18);

      // Clear Body & Cups
      const bodyY = filterY + 44;
      const bodyH = filterH - 44;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.38)';
      ctx.beginPath();
      safeDrawRect(ctx, filterX + 2, bodyY, filterW - 4, bodyH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // 5. Bubbles
    if (showBubbles) {
      ctx.save();
      for (const p of particles) {
        ctx.fillStyle = `rgba(165, 243, 252, ${p.alpha || 0.65})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. Living Fish
    if (showFish) {
      ctx.save();
      for (const f of fishList) {
        const px = f.x * w;
        const py = (f.y + (f.hoverOffset || 0)) * h;
        const isFacingLeft = currentMode === 'current' || f.x > 0.45;
        const s = f.size || 16;
        const tailAngle = f.currentTailAngle || 0;

        ctx.save();
        ctx.translate(px, py);
        if (!isFacingLeft) ctx.scale(-1, 1);

        if (f.species === 'cichlid') {
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.moveTo(-s * 0.5, 0);
          ctx.lineTo(0, -s * 0.9);
          ctx.lineTo(s * 0.6, 0);
          ctx.lineTo(0, s * 0.9);
          ctx.closePath();
          ctx.fill();
        } else if (f.species === 'tetra') {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 0.65, s * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-s * 0.4, -1);
          ctx.lineTo(s * 0.4, -1);
          ctx.stroke();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-s * 0.5, 0);
          ctx.lineTo(-s * 0.5, s * 0.25);
          ctx.lineTo(0, s * 0.25);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 0.75, s * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Tail
        ctx.save();
        ctx.translate(-s * 0.55, 0);
        ctx.rotate(tailAngle);
        ctx.fillStyle = `${f.color}85`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-s * 0.45, -s * 0.3);
        ctx.lineTo(-s * 0.3, 0);
        ctx.lineTo(-s * 0.45, s * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();

        if (showLabels) {
          ctx.font = '9px ui-sans-serif, system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(f.name, px - 20, py - 14);
        }
      }
      ctx.restore();
    }
  }

  function animate() {
    updatePhysics();
    draw();
    animId = requestAnimationFrame(animate);
  }

  function initFlowVisualizer(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    buildFishList();
    ctx = canvas.getContext('2d');
    resize();
    initParticles();
    window.removeEventListener('resize', resize);
    window.addEventListener('resize', resize);

    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(animate);
  }

  function setMode(mode) {
    if (mode === 'current' || mode === 'baffled') currentMode = mode;
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

  window.AquaPulseFlow = {
    init: initFlowVisualizer,
    setMode: setMode,
    setLighting: function(l) { currentLighting = l; },
    toggleHeatmap: toggleHeatmap,
    toggleFish: toggleFish,
    toggleBubbles: toggleBubbles,
    getState: function () {
      return { currentMode, showHeatmap, showFish, showCaustics, showBubbles };
    }
  };

})(window);

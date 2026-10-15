/**
 * AquaPulse Inhabitants Parameter Search & Sweet-Spot Optimizer
 * 
 * Standalone Engine to analyze all tank inhabitants (fish, invertebrates, plants),
 * search their biological tolerances, compute the mathematical overlap zone,
 * and calculate the optimal environmental parameters (Temp, pH, GH, KH, Flow).
 */

(function (window) {
  // ==================== COMPREHENSIVE SPECIES ECOLOGICAL DATABASE ====================
  const SPECIES_DATABASE = {
    // Angelfish
    "koi-angelfish": {
      name: "Koi Angelfish",
      scientific: "Pterophyllum scalare",
      tempMin: 24.0, tempMax: 28.5, tempOptimal: 26.0,
      phMin: 6.0, phMax: 7.5, phOptimal: 6.8,
      ghMin: 3, ghMax: 10,
      khMin: 2, khMax: 6,
      flowPreference: "moderate",
      scaleless: false,
      sensitivities: ["Aggressive when mature", "Nips long fins"]
    },
    "blue-zebra-angel": {
      name: "Blue Zebra Angelfish",
      scientific: "Pterophyllum scalare",
      tempMin: 24.0, tempMax: 28.5, tempOptimal: 26.0,
      phMin: 6.0, phMax: 7.5, phOptimal: 6.8,
      ghMin: 3, ghMax: 10,
      khMin: 2, khMax: 6,
      flowPreference: "moderate",
      scaleless: false,
      sensitivities: ["Territorial pairing at adult size"]
    },

    // Barbs & Rainbows
    "denison-barb": {
      name: "Denison Barb (Roseline Shark)",
      scientific: "Sahyadria denisonii",
      tempMin: 18.0, tempMax: 26.0, tempOptimal: 23.5,
      phMin: 6.5, phMax: 7.6, phOptimal: 7.0,
      ghMin: 4, ghMax: 12,
      khMin: 3, khMax: 8,
      flowPreference: "high",
      scaleless: false,
      sensitivities: ["Demands high dissolved oxygen", "Stresses above 26.0°C", "Jump risk"]
    },
    "boeseman-rainbow": {
      name: "Boeseman's Rainbowfish",
      scientific: "Melanotaenia boesemani",
      tempMin: 24.0, tempMax: 28.0, tempOptimal: 25.5,
      phMin: 7.0, phMax: 8.0, phOptimal: 7.4,
      ghMin: 8, ghMax: 18,
      khMin: 5, khMax: 12,
      flowPreference: "high",
      scaleless: false,
      sensitivities: ["Prefers moderate-hard alkaline water with open swim track"]
    },

    // Tetras
    "silvertip-tetra": {
      name: "Silver Tip Tetra",
      scientific: "Hasemania nana",
      tempMin: 22.0, tempMax: 28.0, tempOptimal: 25.0,
      phMin: 6.0, phMax: 7.8, phOptimal: 6.8,
      ghMin: 4, ghMax: 15,
      khMin: 3, khMax: 8,
      flowPreference: "moderate",
      scaleless: false,
      sensitivities: ["Can become fin-nippers if school is <8 fish"]
    },
    "neon-tetra": {
      name: "Neon Tetra",
      scientific: "Paracheirodon innesi",
      tempMin: 21.0, tempMax: 26.0, tempOptimal: 24.0,
      phMin: 5.5, phMax: 7.2, phOptimal: 6.5,
      ghMin: 2, ghMax: 8,
      khMin: 1, khMax: 4,
      flowPreference: "low",
      scaleless: false,
      sensitivities: ["Sensitive to Malachite Green & high formalin", "Fragile above 26.5°C"]
    },

    // Labyrinth Fish
    "female-betta": {
      name: "Female Betta",
      scientific: "Betta splendens",
      tempMin: 24.5, tempMax: 29.0, tempOptimal: 26.0,
      phMin: 6.5, phMax: 7.6, phOptimal: 7.0,
      ghMin: 3, ghMax: 10,
      khMin: 2, khMax: 6,
      flowPreference: "low",
      scaleless: false,
      sensitivities: ["Labyrinth organ requires calm water surface", "Heavy current causes stress"]
    },
    "betta-male": {
      name: "Male Betta",
      scientific: "Betta splendens",
      tempMin: 24.5, tempMax: 29.0, tempOptimal: 26.0,
      phMin: 6.5, phMax: 7.5, phOptimal: 7.0,
      ghMin: 3, ghMax: 10,
      khMin: 2, khMax: 6,
      flowPreference: "low",
      scaleless: false,
      sensitivities: ["Zero lateral current preferred", "Cannot tolerate aggressive schoolers"]
    },
    "dwarf-gourami": {
      name: "Dwarf Red Gourami",
      scientific: "Trichogaster lalius",
      tempMin: 24.0, tempMax: 28.0, tempOptimal: 25.5,
      phMin: 6.0, phMax: 7.5, phOptimal: 6.8,
      ghMin: 4, ghMax: 10,
      khMin: 2, khMax: 6,
      flowPreference: "low",
      scaleless: false,
      sensitivities: ["Labyrinth surface dweller", "Pushed into hiding by horizontal jet streams"]
    },

    // Nano & Surface
    "rice-fish": {
      name: "Daisy's Blue Rice Fish",
      scientific: "Oryzias woworae",
      tempMin: 22.0, tempMax: 27.0, tempOptimal: 24.5,
      phMin: 6.5, phMax: 7.5, phOptimal: 7.0,
      ghMin: 5, ghMax: 12,
      khMin: 3, khMax: 7,
      flowPreference: "low",
      scaleless: false,
      sensitivities: ["Peaceful surface nano fish", "Can be outcompeted for food by angels"]
    },
    "harlequin-rasbora": {
      name: "Harlequin Rasbora",
      scientific: "Trigonostigma heteromorpha",
      tempMin: 23.0, tempMax: 28.0, tempOptimal: 25.0,
      phMin: 6.0, phMax: 7.5, phOptimal: 6.6,
      ghMin: 3, ghMax: 10,
      khMin: 2, khMax: 6,
      flowPreference: "moderate",
      scaleless: false,
      sensitivities: ["Peaceful schooler; thrives in planted soft water"]
    },

    // Bottom Dwellers & Algae Crew
    "albino-corydoras": {
      name: "Albino Corydoras",
      scientific: "Corydoras aeneus",
      tempMin: 21.0, tempMax: 26.5, tempOptimal: 24.0,
      phMin: 6.0, phMax: 7.5, phOptimal: 6.8,
      ghMin: 4, ghMax: 12,
      khMin: 2, khMax: 6,
      flowPreference: "low",
      scaleless: true,
      sensitivities: ["Scaleless: intolerant of salt and full-strength parasitic meds", "Sensitive barbels on sharp gravel"]
    },
    "pygmy-cory": {
      name: "Pygmy Corydoras",
      scientific: "Corydoras pygmaeus",
      tempMin: 22.0, tempMax: 26.0, tempOptimal: 24.0,
      phMin: 6.2, phMax: 7.4, phOptimal: 6.8,
      ghMin: 3, ghMax: 10,
      khMin: 2, khMax: 5,
      flowPreference: "low",
      scaleless: true,
      sensitivities: ["Tiny scaleless catfish; high sensitivity to chemicals"]
    },
    "golden-cae": {
      name: "Golden Chinese Algae Eater",
      scientific: "Gyrinocheilus aymonieri",
      tempMin: 22.0, tempMax: 27.5, tempOptimal: 25.0,
      phMin: 6.5, phMax: 7.8, phOptimal: 7.0,
      ghMin: 5, ghMax: 15,
      khMin: 3, khMax: 8,
      flowPreference: "high",
      scaleless: false,
      sensitivities: ["Adults become semi-aggressive", "Slime-coat sucker if unfed"]
    },
    "sae": {
      name: "Siamese Algae Eater (SAE)",
      scientific: "Crossocheilus oblongus",
      tempMin: 23.0, tempMax: 27.0, tempOptimal: 25.0,
      phMin: 6.5, phMax: 7.5, phOptimal: 6.9,
      ghMin: 5, ghMax: 12,
      khMin: 3, khMax: 7,
      flowPreference: "moderate",
      scaleless: false,
      sensitivities: ["Active grazer; needs plant coverage"]
    },
    "nerite-snail": {
      name: "Zebra Nerite Snail",
      scientific: "Neritina natalensis",
      tempMin: 22.0, tempMax: 27.5, tempOptimal: 25.0,
      phMin: 7.0, phMax: 8.2, phOptimal: 7.5,
      ghMin: 6, ghMax: 15,
      khMin: 4, khMax: 10,
      flowPreference: "moderate",
      scaleless: false,
      sensitivities: ["Acidic pH (<6.8) dissolves shell", "Strictly intolerant of copper"]
    }
  };

  // ==================== OPTIMIZER CALCULATION ENGINE ====================
  const AquaPulseOptimizer = {
    /**
     * Resolves a fish item from config to its biological profile
     */
    resolveSpeciesProfile: function (speciesItem) {
      if (!speciesItem) return null;
      // Direct ID match
      if (speciesItem.id && SPECIES_DATABASE[speciesItem.id]) {
        return SPECIES_DATABASE[speciesItem.id];
      }
      // Name fuzzy matching
      const cleanName = (speciesItem.name || '').toLowerCase();
      for (const key in SPECIES_DATABASE) {
        const item = SPECIES_DATABASE[key];
        if (cleanName.includes(item.name.toLowerCase()) || 
            item.name.toLowerCase().includes(cleanName) ||
            cleanName.includes(key.replace(/-/g, ' '))) {
          return item;
        }
      }
      // Fallback default safe tropical profile if unknown
      return {
        name: speciesItem.name || "Tropical Fish",
        scientific: speciesItem.name || "Unknown",
        tempMin: 23.0, tempMax: 27.0, tempOptimal: 25.0,
        phMin: 6.5, phMax: 7.5, phOptimal: 7.0,
        ghMin: 4, ghMax: 12,
        khMin: 2, khMax: 6,
        flowPreference: "moderate",
        scaleless: false,
        sensitivities: ["General community care"]
      };
    },

    /**
     * Analyzes all inhabitants and derives the mathematical sweet spot & compromises
     */
    analyzeInhabitants: function (speciesList) {
      if (!speciesList || !speciesList.length) {
        return null;
      }

      const profiles = [];
      let maxTempMin = -Infinity;
      let minTempMax = Infinity;
      let maxPhMin = -Infinity;
      let minPhMax = Infinity;
      let maxGhMin = -Infinity;
      let minGhMax = Infinity;
      let maxKhMin = -Infinity;
      let minKhMax = Infinity;

      let lowFlowCount = 0;
      let highFlowCount = 0;
      const scalelessSpecies = [];
      const sensitivitiesFound = [];

      speciesList.forEach(sp => {
        const prof = AquaPulseOptimizer.resolveSpeciesProfile(sp);
        profiles.push({
          configItem: sp,
          profile: prof
        });

        // Intersections
        if (prof.tempMin > maxTempMin) maxTempMin = prof.tempMin;
        if (prof.tempMax < minTempMax) minTempMax = prof.tempMax;

        if (prof.phMin > maxPhMin) maxPhMin = prof.phMin;
        if (prof.phMax < minPhMax) minPhMax = prof.phMax;

        if (prof.ghMin > maxGhMin) maxGhMin = prof.ghMin;
        if (prof.ghMax < minGhMax) minGhMax = prof.ghMax;

        if (prof.khMin > maxKhMin) maxKhMin = prof.khMin;
        if (prof.khMax < minKhMax) minKhMax = prof.khMax;

        // Flow preferences
        if (prof.flowPreference === 'low') lowFlowCount += (sp.count || 1);
        if (prof.flowPreference === 'high') highFlowCount += (sp.count || 1);

        // Scaleless & sensitivities
        if (prof.scaleless) scalelessSpecies.push(prof.name);
        if (prof.sensitivities && prof.sensitivities.length) {
          prof.sensitivities.forEach(s => sensitivitiesFound.push({ species: prof.name, note: s }));
        }
      });

      // Analyze Overlap vs Conflict
      const hasTempOverlap = maxTempMin <= minTempMax;
      const hasPhOverlap = maxPhMin <= minPhMax;

      // Recommended Point Targets
      let recommendedTemp = 25.5;
      let recommendedTempRange = { min: 25.0, max: 26.0 };
      if (hasTempOverlap) {
        recommendedTemp = Number(((maxTempMin + minTempMax) / 2).toFixed(1));
        recommendedTempRange = { min: maxTempMin, max: minTempMax };
      } else {
        // Temperature Conflict Compromise
        recommendedTemp = 25.5;
        recommendedTempRange = { min: 25.0, max: 26.0 };
      }

      let recommendedPhRange = { min: 6.6, max: 7.4 };
      if (hasPhOverlap) {
        recommendedPhRange = { min: maxPhMin, max: minPhMax };
      }

      // Flow Dynamics Analysis
      let flowRecommendation = {
        mode: "baffled",
        title: "45° Glass-Baffled Return Recommended",
        explanation: `Your tank houses both high-flow lovers (${highFlowCount} fish, e.g. Denison Barbs / Rainbows) and calm-water labyrinth breathers (${lowFlowCount} fish, e.g. Bettas / Gouramis). Baffling the jet preserves dissolved oxygen while protecting surface sanctuary.`
      };

      if (lowFlowCount === 0 && highFlowCount > 0) {
        flowRecommendation = {
          mode: "current",
          title: "Direct Venturi Jet Flow Suitable",
          explanation: "All species appreciate active currents and high oxygenation."
        };
      } else if (highFlowCount === 0 && lowFlowCount > 0) {
        flowRecommendation = {
          mode: "baffled",
          title: "Low Gentle Flow Required",
          explanation: "Dominant labyrinth or nano dwellers require calm conditions."
        };
      }

      // Specific Biological Conflicts & Insights
      const conflicts = [];
      profiles.forEach(p => {
        const item = p.profile;
        if (item.tempMax < recommendedTemp) {
          conflicts.push(`⚠️ <strong>${item.name}</strong> prefers cooler water (max ${item.tempMax}°C), running warm at ${recommendedTemp}°C.`);
        }
        if (item.tempMin > recommendedTemp) {
          conflicts.push(`⚠️ <strong>${item.name}</strong> prefers warmer water (min ${item.tempMin}°C), running cool at ${recommendedTemp}°C.`);
        }
      });

      return {
        profiles: profiles,
        tempOverlap: {
          hasOverlap: hasTempOverlap,
          min: maxTempMin,
          max: minTempMax,
          recommended: recommendedTemp,
          recommendedRange: recommendedTempRange
        },
        phOverlap: {
          hasOverlap: hasPhOverlap,
          min: maxPhMin,
          max: minPhMax,
          recommendedRange: recommendedPhRange
        },
        ghRange: { min: Math.max(3, maxGhMin), max: Math.min(15, minGhMax > 0 ? minGhMax : 12) },
        khRange: { min: Math.max(2, maxKhMin), max: Math.min(8, minKhMax > 0 ? minKhMax : 6) },
        flowRecommendation: flowRecommendation,
        scalelessSpecies: scalelessSpecies,
        conflicts: conflicts,
        sensitivities: sensitivitiesFound
      };
    }
  };

  // ==================== INTERACTIVE UI MODAL & RENDERER ====================
  function openInhabitantsOptimizerModal() {
    let modal = document.getElementById('optimizer-modal');
    if (!modal) {
      modal = createOptimizerModalElement();
      document.body.appendChild(modal);
    }

    const cfg = window.getActiveConfig ? window.getActiveConfig() : window.AQUAPULSE_DEFAULT_CONFIG;
    const analysis = AquaPulseOptimizer.analyzeInhabitants(cfg.species);
    renderOptimizerModalContent(analysis, cfg);
    modal.classList.remove('hidden');
  }

  function closeInhabitantsOptimizerModal() {
    const modal = document.getElementById('optimizer-modal');
    if (modal) modal.classList.add('hidden');
  }

  function createOptimizerModalElement() {
    const modal = document.createElement('div');
    modal.id = 'optimizer-modal';
    modal.className = 'fixed inset-0 bg-black/85 backdrop-blur-md z-50 hidden flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="glass-card bg-slate-950/95 border border-cyan-400/50 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <span class="text-cyan-400">🔍</span>
              <span>Inhabitants Parameter Search &amp; Sweet-Spot Optimizer</span>
            </h3>
            <p class="text-xs text-slate-300">Mathematical environmental intersection derived across all tank inhabitants.</p>
          </div>
          <button onclick="AquaPulseOptimizer.closeModal()" class="text-slate-400 hover:text-white font-bold text-lg">✕</button>
        </div>

        <div id="optimizer-modal-body" class="p-6 space-y-5 overflow-y-auto flex-1 text-xs leading-relaxed"></div>

        <div class="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button onclick="AquaPulseOptimizer.closeModal()" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">
            Close
          </button>
          <button id="apply-optimizer-targets-btn" class="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wide shadow-lg transition">
            Apply Derived Targets to Tank Profile
          </button>
        </div>
      </div>
    `;
    return modal;
  }

  function renderOptimizerModalContent(analysis, cfg) {
    const body = document.getElementById('optimizer-modal-body');
    if (!analysis) {
      body.innerHTML = `<div class="p-4 text-center text-slate-400">No inhabitants found in current configuration.</div>`;
      return;
    }

    const t = analysis.tempOverlap;
    const ph = analysis.phOverlap;

    body.innerHTML = `
      <!-- Golden Overlap Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/40">
          <div class="text-[10px] uppercase font-bold text-slate-400">Optimal Target Temp</div>
          <div class="text-xl font-black text-cyan-300 mt-0.5">${t.recommended}°C</div>
          <div class="text-[11px] text-slate-300 mt-1">Safe: ${t.recommendedRange.min}°C – ${t.recommendedRange.max}°C</div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/40">
          <div class="text-[10px] uppercase font-bold text-slate-400">Optimal pH Range</div>
          <div class="text-xl font-black text-emerald-300 mt-0.5">${ph.recommendedRange.min.toFixed(1)} – ${ph.recommendedRange.max.toFixed(1)}</div>
          <div class="text-[11px] text-slate-300 mt-1">Buffered equilibrium</div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-900 border border-sky-500/40">
          <div class="text-[10px] uppercase font-bold text-slate-400">General Hardness (GH)</div>
          <div class="text-xl font-black text-sky-300 mt-0.5">${analysis.ghRange.min} – ${analysis.ghRange.max} dGH</div>
          <div class="text-[11px] text-slate-300 mt-1">Osmotic balance</div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-900 border border-amber-500/40">
          <div class="text-[10px] uppercase font-bold text-slate-400">Carbonate Hardness (KH)</div>
          <div class="text-xl font-black text-amber-300 mt-0.5">${analysis.khRange.min} – ${analysis.khRange.max} dKH</div>
          <div class="text-[11px] text-slate-300 mt-1">pH crash shield</div>
        </div>
      </div>

      <!-- Flow & Physical Dynamics Recommendation -->
      <div class="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-1.5">
        <div class="flex items-center gap-2">
          <span class="text-cyan-400 text-sm">🌊</span>
          <span class="font-bold text-white text-xs">${analysis.flowRecommendation.title}</span>
        </div>
        <p class="text-xs text-slate-300">${analysis.flowRecommendation.explanation}</p>
      </div>

      <!-- Species Tolerance Overlap Table -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-white">Inhabitants Tolerance Ranges &amp; Biological Sensitivity</span>
          <span class="text-slate-400 text-[11px]">${analysis.profiles.length} Species Analyzed</span>
        </div>
        <div class="overflow-x-auto rounded-xl border border-slate-800">
          <table class="w-full text-left text-[11px] border-collapse bg-slate-900/60">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                <th class="py-2 px-3">Species</th>
                <th class="py-2 px-3">Count</th>
                <th class="py-2 px-3">Temp Range</th>
                <th class="py-2 px-3">pH Range</th>
                <th class="py-2 px-3">Flow Preference</th>
                <th class="py-2 px-3">Safety Flags</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${analysis.profiles.map(p => `
                <tr class="hover:bg-slate-800/40 transition">
                  <td class="py-2 px-3 font-semibold text-white">
                    ${p.profile.name}
                    <span class="block text-[10px] text-slate-400 italic">${p.profile.scientific}</span>
                  </td>
                  <td class="py-2 px-3 font-mono font-bold text-cyan-300">×${p.configItem.count || 1}</td>
                  <td class="py-2 px-3 text-slate-200">${p.profile.tempMin}°C – ${p.profile.tempMax}°C</td>
                  <td class="py-2 px-3 text-slate-200">${p.profile.phMin} – ${p.profile.phMax}</td>
                  <td class="py-2 px-3 uppercase text-[10px] font-semibold text-amber-300">${p.profile.flowPreference}</td>
                  <td class="py-2 px-3">
                    ${p.profile.scaleless ? '<span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold">Scaleless (No Salt)</span>' : ''}
                    ${p.profile.sensitivities ? `<span class="block text-[10px] text-slate-400 mt-0.5">${p.profile.sensitivities[0] || ''}</span>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Conflicts & Compromises Radar -->
      ${analysis.conflicts.length > 0 ? `
        <div class="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1">
          <div class="font-bold text-amber-300 flex items-center gap-1.5">
            <span>⚡</span>
            <span>Biological Compromise Notes:</span>
          </div>
          <ul class="list-disc pl-4 space-y-1 text-slate-200 text-xs">
            ${analysis.conflicts.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      ` : `
        <div class="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-2">
          <span>✅</span>
          <span>100% Harmonic Overlap: All ${analysis.profiles.length} species comfortably share the derived temperature and pH parameters.</span>
        </div>
      `}
    `;

    // Bind Apply Button
    const applyBtn = document.getElementById('apply-optimizer-targets-btn');
    applyBtn.onclick = function () {
      applyDerivedTargets(analysis);
    };
  }

  function applyDerivedTargets(analysis) {
    if (!analysis || !window.getActiveConfig || !window.saveActiveConfig) return;
    const cfg = window.getActiveConfig();

    cfg.targets.temp.min = analysis.tempOverlap.recommendedRange.min;
    cfg.targets.temp.max = analysis.tempOverlap.recommendedRange.max;
    cfg.targets.ph.min = analysis.phOverlap.recommendedRange.min;
    cfg.targets.ph.max = analysis.phOverlap.recommendedRange.max;

    window.saveActiveConfig(cfg);
    closeInhabitantsOptimizerModal();
    alert(`✅ Targets successfully updated!\n\n• Target Temp: ${cfg.targets.temp.min}°C – ${cfg.targets.temp.max}°C\n• Target pH: ${cfg.targets.ph.min} – ${cfg.targets.ph.max}\n\nDashboard telemetry & diagnostics have been recalculated.`);
  }

  // Export to Global Scope
  window.AquaPulseOptimizer = {
    SPECIES_DATABASE: SPECIES_DATABASE,
    resolveSpeciesProfile: AquaPulseOptimizer.resolveSpeciesProfile,
    analyzeInhabitants: AquaPulseOptimizer.analyzeInhabitants,
    openModal: openInhabitantsOptimizerModal,
    closeModal: closeInhabitantsOptimizerModal
  };

})(window);

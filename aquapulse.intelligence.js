/**
 * AquaPulse Ecosystem Intelligence Engine (fish.skill extension)
 * 
 * Provides deep aquatic intelligence:
 * 1. Visual Health & Symptom Checker (Auto-prescription & Safety Lock)
 * 2. Quarantine Tank Tracker (Days counter, hospital bucket logs)
 * 3. Social Dynamics & Aggression Radar (Nipping logs, schooling cohesion)
 * 4. Predictive Water Pattern Analyzer (Correlates feeding/water changes with parameter shifts)
 */

(function (window) {
  // ==================== 1. SYMPTOM-TO-DISEASE KNOWLEDGE BASE ====================
  const SYMPTOM_DATABASE = [
    {
      id: "symp-ich",
      name: "White Specks (Ich / White Spot)",
      category: "Parasitic",
      visual: "Grainy salt-like crystals on fins, tail, and body scales.",
      behavior: "Flashing or rubbing against rocks and driftwood.",
      medScenarioId: "ichMain",
      recommendedAction: "Raise heater to 28.5°C, maximize aeration and surface agitation, and dose anti-parasitic medication at 50% strength if scaleless or sensitive species are present."
    },
    {
      id: "symp-finrot",
      name: "Frayed / Tattered Fins (Fin Rot)",
      category: "Bacterial",
      visual: "Ragged fin margins with milky white or red edges.",
      behavior: "Clamped fins, listless hovering near bottom.",
      medScenarioId: "hospitalBact",
      recommendedAction: "Move affected fish to a hospital container. Dose antibacterial treatment per manufacturer instructions for 5 days. Keep display tank bio-filter safe."
    },
    {
      id: "symp-bloat",
      name: "Abdominal Bloat / Dropsy",
      category: "Digestive / Organ",
      visual: "Swollen belly or protruding scales (pineconing).",
      behavior: "Loss of buoyancy control, floating upside down or sinking.",
      medScenarioId: "hospitalSalt",
      recommendedAction: "Immediate 24-48h FAST. Feed 1 peeled boiled green pea on Day 2. If severe, perform a 10-minute salt bath in a separate container (NEVER on scaleless catfish)."
    },
    {
      id: "symp-nipping",
      name: "Torn Fin Bits / Aggression Damage",
      category: "Social",
      visual: "Clean bites or missing wedges on slow-swimming or long-finned fish.",
      behavior: "Chasing witnessed between active schoolers and slow surface swimmers.",
      medScenarioId: "nipRecovery",
      recommendedAction: "Dose water conditioner to stimulate slime coat regeneration. Increase the aggressor species' school count to diffuse fin-nipping hierarchy."
    },
    {
      id: "symp-gasping",
      name: "Surface Gasping / Rapid Gill Movement",
      category: "Water Toxicity / Low O₂",
      visual: "Inflamed red gill covers, wide gaping mouths.",
      behavior: "Fish clustering directly at the surface water film.",
      medScenarioId: "waterChange",
      recommendedAction: "Check Ammonia/Nitrite immediately. Angle filter outlet upward for surface turbulence and perform an emergency 50% water change with water conditioner."
    }
  ];

  // ==================== 2. QUARANTINE MANAGER ====================
  function getQuarantineData() {
    const raw = localStorage.getItem('aquapulse_quarantine_data');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return {
      active: false,
      fishName: "None in quarantine",
      startDate: new Date().toISOString().split('T')[0],
      durationDays: 14,
      containerVolumeL: 10,
      notes: "Display tank safe. No isolated fish currently."
    };
  }

  function saveQuarantineData(data) {
    localStorage.setItem('aquapulse_quarantine_data', JSON.stringify(data));
  }

  // ==================== 3. SOCIAL AGGRESSION LOGGER ====================
  function getSocialIncidents() {
    const raw = localStorage.getItem('aquapulse_social_incidents');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return [
      {
        id: "inc-1",
        date: new Date().toISOString().split('T')[0],
        aggressor: "Active Schoolers",
        victim: "Slow Surface Swimmer",
        trigger: "Feeding competition near filter outflow",
        actionTaken: "Distraction feeding on opposite side of tank"
      }
    ];
  }

  function saveSocialIncidents(list) {
    localStorage.setItem('aquapulse_social_incidents', JSON.stringify(list));
  }

  // ==================== 4. PREDICTIVE PATTERN ENGINE ====================
  function analyzeParameterTrends(logs, config) {
    if (!logs || logs.length < 2) {
      return {
        trendStatus: "Insufficient Data",
        insights: ["Log at least 2 water test readings to enable pattern detection and nitrogen cycle stability tracking."]
      };
    }

    const latest = logs[0];
    const previous = logs[1];
    const insights = [];

    // Nitrate accumulation rate
    const daysBetween = Math.max(1, Math.round((new Date(latest.date) - new Date(previous.date)) / (1000 * 60 * 60 * 24)));
    const nitrateDiff = latest.no3 - previous.no3;

    if (nitrateDiff > 10 && daysBetween <= 7) {
      insights.push(`⚠️ <strong>Rapid Nitrate Accumulation:</strong> Nitrate rose by +${nitrateDiff} ppm in ${daysBetween} days. Heavy bioload detected; ensure plant roots are clean and vacuum gravel during your next routine water change.`);
    } else if (nitrateDiff <= 0 && latest.no3 <= 25) {
      insights.push(`🌿 <strong>Nitrate Export Stable:</strong> Nitrate is steady or dropping (${latest.no3} ppm). Live plant biological absorption is keeping up with fish bioload.`);
    }

    // Ammonia trace pattern
    if (latest.nh3 > 0 && previous.nh3 === 0) {
      insights.push(`🚨 <strong>Emerging Bio-Filter Strain:</strong> Ammonia spiked from 0.0 to ${latest.nh3} ppm. Did you recently rinse all filter media at once or add new fish? Fast the tank for 24h.`);
    }

    // Temperature drift
    const tempDiff = Math.abs(latest.temp - previous.temp);
    if (tempDiff >= 1.5) {
      insights.push(`🌡️ <strong>Temperature Fluctuation (${latest.temp}°C vs ${previous.temp}°C):</strong> A ${tempDiff.toFixed(1)}°C swing was recorded. Ensure heater thermostat is stable to avoid immune stress.`);
    }

    return {
      trendStatus: insights.length > 0 ? "Patterns Detected" : "Ecosystem Stable",
      insights: insights.length > 0 ? insights : ["Nitrogen cycle and water stability are performing within expected equilibrium tolerances."]
    };
  }

  // ==================== 5. MODAL UI RENDERERS ====================

  // Symptom Checker Modal
  function openSymptomCheckerModal() {
    let modal = document.getElementById('symptom-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'symptom-modal';
      modal.className = 'fixed inset-0 bg-black/85 backdrop-blur-md z-50 hidden flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="glass-card bg-slate-950/95 border border-cyan-400/50 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span>🩺</span>
                <span>Visual Fish Health &amp; Symptom Diagnostic Checker</span>
              </h3>
              <p class="text-xs text-slate-300">Identify fish ailments visually and auto-calculate treatment protocols with species safety locks.</p>
            </div>
            <button onclick="AquaPulseIntelligence.closeSymptomModal()" class="text-slate-400 hover:text-white font-bold text-lg">✕</button>
          </div>

          <div class="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="symptoms-list-container">
              ${SYMPTOM_DATABASE.map(s => `
                <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-400 transition cursor-pointer flex flex-col justify-between" onclick="AquaPulseIntelligence.selectSymptom('${s.id}')">
                  <div>
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="font-bold text-white text-sm">${s.name}</span>
                      <span class="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold">${s.category}</span>
                    </div>
                    <p class="text-slate-300 mt-1"><strong>Signs:</strong> ${s.visual}</p>
                    <p class="text-slate-400 mt-1"><strong>Behavior:</strong> ${s.behavior}</p>
                  </div>
                  <button class="mt-3 w-full py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 font-bold transition text-center">
                    Select &amp; Apply Treatment
                  </button>
                </div>
              `).join('')}
            </div>

            <div id="selected-symptom-detail" class="hidden p-4 rounded-xl bg-slate-900/90 border border-emerald-500/50 space-y-2"></div>
          </div>

          <div class="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
            <button onclick="AquaPulseIntelligence.closeSymptomModal()" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">
              Close
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
  }

  function closeSymptomCheckerModal() {
    const modal = document.getElementById('symptom-modal');
    if (modal) modal.classList.add('hidden');
  }

  function selectSymptom(id) {
    const item = SYMPTOM_DATABASE.find(s => s.id === id);
    if (!item) return;

    const detail = document.getElementById('selected-symptom-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-emerald-300 text-sm">✅ Prescription Protocol for: ${item.name}</span>
        <span class="text-xs text-slate-400">${item.category}</span>
      </div>
      <p class="text-slate-200 mt-1 leading-relaxed">${item.recommendedAction}</p>
      <div class="pt-2 flex items-center gap-3">
        <button onclick="AquaPulseIntelligence.applySymptomTreatment('${item.medScenarioId}')" class="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wide transition shadow">
          Apply to Medicine Dosing Calculator (Tab 4)
        </button>
      </div>
    `;
  }

  function applySymptomTreatment(scenarioId) {
    closeSymptomCheckerModal();
    if (window.switchTab) window.switchTab('care', 'medicine');
    if (window.setMedScenario) window.setMedScenario(scenarioId);
  }

  // Social & Quarantine Management Modal
  function openSocialModal() {
    let modal = document.getElementById('social-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'social-modal';
      modal.className = 'fixed inset-0 bg-black/85 backdrop-blur-md z-50 hidden flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="glass-card bg-slate-950/95 border border-cyan-400/50 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span>🛡️</span>
                <span>Social Dynamics, Aggression &amp; Quarantine Manager</span>
              </h3>
              <p class="text-xs text-slate-300">Track territory dominance, fin-nipping incidents, and quarantine tank isolation.</p>
            </div>
            <button onclick="AquaPulseIntelligence.closeSocialModal()" class="text-slate-400 hover:text-white font-bold text-lg">✕</button>
          </div>

          <div class="p-6 space-y-6 overflow-y-auto flex-1 text-xs" id="social-modal-body"></div>

          <div class="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
            <button onclick="AquaPulseIntelligence.closeSocialModal()" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">
              Close
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    renderSocialModalContent();
    modal.classList.remove('hidden');
  }

  function closeSocialModal() {
    const modal = document.getElementById('social-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderSocialModalContent() {
    const body = document.getElementById('social-modal-body');
    const quar = getQuarantineData();
    const incidents = getSocialIncidents();

    // Calculate days in quarantine
    const daysElapsed = Math.max(0, Math.round((new Date() - new Date(quar.startDate)) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, quar.durationDays - daysElapsed);

    body.innerHTML = `
      <!-- Quarantine Tracker Card -->
      <div class="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-3">
        <div class="flex items-center justify-between">
          <span class="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
            <span>🏥</span>
            <span>Hospital &amp; Quarantine Tank Status (${quar.containerVolumeL}L)</span>
          </span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${quar.active ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}">
            ${quar.active ? 'ACTIVE ISOLATION' : 'STANDBY READY'}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Patient Fish:</span>
            <strong class="text-white text-xs">${quar.fishName}</strong>
          </div>
          <div class="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Days Elapsed / Total:</span>
            <strong class="text-cyan-300 text-xs">${daysElapsed} / ${quar.durationDays} Days</strong>
          </div>
          <div class="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Release Countdown:</span>
            <strong class="${daysRemaining === 0 ? 'text-emerald-400' : 'text-amber-300'} text-xs">
              ${daysRemaining === 0 ? 'Ready for Main Tank' : daysRemaining + ' Days Left'}
            </strong>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <span class="text-slate-300 italic text-[11px]">${quar.notes}</span>
          <button onclick="AquaPulseIntelligence.toggleQuarantineState()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 font-semibold transition">
            ${quar.active ? 'Clear Quarantine (Discharge Patient)' : 'Log New Patient Fish'}
          </button>
        </div>
      </div>

      <!-- Social Aggression & Fin-Nipping Log -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-bold text-sm text-white">Social Hierarchy &amp; Fin-Nipping Log</h4>
            <p class="text-slate-400 text-[11px]">Track interactions to prevent chronic bullying or territorial stress.</p>
          </div>
          <button onclick="AquaPulseIntelligence.addSocialIncidentPrompt()" class="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold transition">
            + Log Incident
          </button>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-800">
          <table class="w-full text-left text-xs border-collapse bg-slate-900/60">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                <th class="py-2.5 px-3">Date</th>
                <th class="py-2.5 px-3">Aggressor</th>
                <th class="py-2.5 px-3">Victim</th>
                <th class="py-2.5 px-3">Trigger / Context</th>
                <th class="py-2.5 px-3">Remedy Action</th>
                <th class="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${incidents.map(inc => `
                <tr class="hover:bg-slate-800/40 transition">
                  <td class="py-2 px-3 font-mono text-white whitespace-nowrap">${inc.date}</td>
                  <td class="py-2 px-3 font-bold text-rose-300">${inc.aggressor}</td>
                  <td class="py-2 px-3 text-slate-200">${inc.victim}</td>
                  <td class="py-2 px-3 text-slate-300">${inc.trigger}</td>
                  <td class="py-2 px-3 text-emerald-300">${inc.actionTaken}</td>
                  <td class="py-2 px-3 text-right">
                    <button onclick="AquaPulseIntelligence.deleteSocialIncident('${inc.id}')" class="text-slate-500 hover:text-rose-400 font-bold px-1.5 py-0.5">✕</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function toggleQuarantineState() {
    const quar = getQuarantineData();
    if (quar.active) {
      quar.active = false;
      quar.fishName = "None in quarantine";
      quar.notes = "Patient successfully discharged back to display tank.";
    } else {
      const name = prompt("Enter patient fish name & ailment:", "Fish Name (Condition)");
      if (!name) return;
      quar.active = true;
      quar.fishName = name;
      quar.startDate = new Date().toISOString().split('T')[0];
      quar.durationDays = 14;
      quar.notes = "Dosing antibacterial treatment daily with light airstone aeration.";
    }
    saveQuarantineData(quar);
    renderSocialModalContent();
  }

  function addSocialIncidentPrompt() {
    const aggressor = prompt("Who was the aggressor?", "Species Name");
    if (!aggressor) return;
    const victim = prompt("Who was the victim?", "Affected Fish");
    const trigger = prompt("Trigger or context:", "Feeding time, territory, etc.");
    const actionTaken = prompt("Remedy applied:", "Added cover, separated, distraction fed");

    const list = getSocialIncidents();
    list.unshift({
      id: "inc-" + Date.now(),
      date: new Date().toISOString().split('T')[0],
      aggressor: aggressor,
      victim: victim || "Community",
      trigger: trigger || "Territorial chase",
      actionTaken: actionTaken || "Observed, safe cover available"
    });
    saveSocialIncidents(list);
    renderSocialModalContent();
  }

  function deleteSocialIncident(id) {
    const list = getSocialIncidents().filter(i => i.id !== id);
    saveSocialIncidents(list);
    renderSocialModalContent();
  }

  // Export to Global Scope
  window.AquaPulseIntelligence = {
    SYMPTOM_DATABASE: SYMPTOM_DATABASE,
    openSymptomModal: openSymptomCheckerModal,
    closeSymptomModal: closeSymptomCheckerModal,
    selectSymptom: selectSymptom,
    applySymptomTreatment: applySymptomTreatment,
    openSocialModal: openSocialModal,
    closeSocialModal: closeSocialModal,
    toggleQuarantineState: toggleQuarantineState,
    addSocialIncidentPrompt: addSocialIncidentPrompt,
    deleteSocialIncident: deleteSocialIncident,
    analyzeParameterTrends: analyzeParameterTrends
  };

})(window);

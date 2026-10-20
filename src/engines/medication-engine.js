/**
 * AquaPulse MedicationEngine
 * Symptom diagnostic catalog, volumetric dosing calculation, scaleless fish safety clamps,
 * invertebrate copper locks, and hospital tank treatment scenario protocols.
 * Zero DOM / browser dependencies — 100% headless testable.
 */

const SYMPTOM_DATABASE = [
  {
    id: "symp-ich",
    name: "White Specks (Ich / White Spot)",
    category: "Parasitic",
    medScenarioId: "ichMain",
    description: "Salt-like white crystals across fins and body, flashing against substrate, rapid breathing, and clamped fins.",
    protocol: "Raise temperature gradually to 28.5°C over 12 hours. Increase aeration. Dose General Cure anti-parasitic treatment with 50% lock for sensitive species."
  },
  {
    id: "symp-finrot",
    name: "Frayed / Tattered Fins (Fin Rot)",
    category: "Bacterial",
    medScenarioId: "hospitalBact",
    description: "Milky, ragged, or disintegrating fin edges with possible red inflammation along fin bases.",
    protocol: "Isolate in a separate hospital container (15L). Treat with Bactonil-FW antibacterial regimen for 5-7 days with daily water changes."
  },
  {
    id: "symp-bloat",
    name: "Abdominal Bloat / Dropsy",
    category: "Digestive / Organ",
    medScenarioId: "hospitalSalt",
    description: "Abdominal swelling, protruding/pineconing scales, loss of buoyancy equilibrium, and lethargy.",
    protocol: "Fast fish for 24-48 hours. Offer blanched deshelled pea. Administer short 15-minute osmotic salt bath in hospital container (never display tank if scaleless fish present)."
  },
  {
    id: "symp-nipping",
    name: "Torn Fin Bits / Aggression Damage",
    category: "Social",
    medScenarioId: "nipRecovery",
    description: "Missing fin wedges, nip marks, chasing behavior, and subordinate fish hiding near surface or behind filter.",
    protocol: "Dose Stress Heal slime coat shield to accelerate tissue regeneration. Expand school size of nippers to >= 8 or isolate aggressive individual."
  },
  {
    id: "symp-gasping",
    name: "Surface Gasping / Rapid Gill Movement",
    category: "Water Toxicity / Low O₂",
    medScenarioId: "waterChange",
    description: "Clustering at water surface film, rapid opercular movement, lethargy, red or inflamed gill tissue.",
    protocol: "Perform emergency 50% water change immediately with 10ml/100L detoxifying conditioner. Angle filter outflow upward to break surface film."
  }
];

const MEDICINES = {
  'generalCure': {
    id: 'generalCure',
    name: 'General Cure / Anti-Parasite',
    bottleSize: '100ml / 250ml',
    purpose: 'Anti-parasitic treatment for Ich, Velvet, and gill flukes',
    ratePer100L: 10,
    unit: 'ml',
    lockFactor: 0.5,
    safeScaleless: false,
    safePlants: true,
    safeMainTank: true,
    sensitiveSpecies: ['albino-corydoras', 'pygmy-cory', 'neon-tetra'],
    desc: 'Metronidazole and Praziquantel formulation. Requires 50% safety lock for scaleless Corydoras and sensitive Tetras.'
  },
  'stressHeal': {
    id: 'stressHeal',
    name: 'Stress Heal Conditioner',
    bottleSize: '250ml / 500ml',
    purpose: 'Water dechlorinator, heavy metal binder & aloe slime coat shield',
    ratePer100L: 10,
    unit: 'ml',
    lockFactor: 1.0,
    safeScaleless: true,
    safePlants: true,
    safeMainTank: true,
    sensitiveSpecies: [],
    desc: 'Binds toxic chlorine, chloramines, and heavy metals while accelerating fin regeneration.'
  },
  'bactonil': {
    id: 'bactonil',
    name: 'Bactonil-FW Antibacterial',
    bottleSize: '100ml',
    purpose: 'Broad-spectrum antibacterial for fin rot and ulcers',
    ratePer100L: 5,
    unit: 'ml',
    lockFactor: 1.0,
    safeScaleless: false,
    safePlants: false,
    safeMainTank: false,
    sensitiveSpecies: ['albino-corydoras', 'pygmy-cory'],
    desc: 'Strong antibacterial. Destroys nitrifying bio-filter bacteria; strictly for hospital tank isolation.'
  },
  'aquaSalt': {
    id: 'aquaSalt',
    name: 'Pure Aquarium Salt',
    bottleSize: '500g / 1kg',
    purpose: 'Osmotic regulator, gill function enhancer & bloat bath',
    ratePer100L: 100,
    unit: 'g',
    lockFactor: 0.5,
    safeScaleless: false,
    safePlants: false,
    safeMainTank: false,
    sensitiveSpecies: ['albino-corydoras', 'pygmy-cory', 'nerite-snail'],
    desc: 'Evaporated sea salt for short osmotic baths. Strictly prohibited in planted tanks or with scaleless catfish.'
  }
};

const SCENARIOS = {
  'ichMain': {
    id: 'ichMain',
    name: 'Ich Anti-Parasitic Treatment',
    medKey: 'generalCure',
    useLock: true,
    defaultVolumeRatio: 1.0,
    headline: 'Display Tank Ich Protocol (Elevated Temp + 50% Scaleless Lock)',
    instructions: 'Raise heater to 28.5°C over 12 hours. Increase filter aeration. Dose every 48 hours for 3 treatments with 25% water changes between doses.'
  },
  'hospitalBact': {
    id: 'hospitalBact',
    name: 'Fin Rot Antibacterial Regimen',
    medKey: 'bactonil',
    useLock: false,
    fixedVolume: 15,
    headline: 'Hospital Tank Isolation Regimen (Preserve Main Bio-Filter)',
    instructions: 'Isolate affected fish in 15L container with dedicated airstone. Dose daily after 50% water change for 5 consecutive days.'
  },
  'hospitalSalt': {
    id: 'hospitalSalt',
    name: 'Bloat & Dropsy Osmotic Bath',
    medKey: 'aquaSalt',
    useLock: false,
    fixedVolume: 10,
    headline: '15-Minute Osmotic Salt Dip (Separate Container Only)',
    instructions: 'Dissolve salt thoroughly in 10L bucket of aerated tank water. Bathe fish for 15 minutes, observing closely for loss of equilibrium.'
  },
  'nipRecovery': {
    id: 'nipRecovery',
    name: 'Fin Damage Slime Shield',
    medKey: 'stressHeal',
    useLock: false,
    defaultVolumeRatio: 0.35,
    headline: 'Post-Aggression Recovery & Slime Coat Regeneration',
    instructions: 'Dose Stress Heal at 35% water change volume to protect torn fin tissue from secondary bacterial infection.'
  },
  'waterChange': {
    id: 'waterChange',
    name: 'Emergency Toxicity Flush',
    medKey: 'stressHeal',
    useLock: false,
    defaultVolumeRatio: 0.50,
    headline: 'Emergency 50% Water Flush for Ammonia / Nitrite Spikes',
    instructions: 'Drain 50% of water volume immediately. Refill with temperature-matched water dosed with Stress Heal conditioner at 10ml/100L.'
  }
};

const MedicationEngine = {
  SYMPTOM_DATABASE,
  MEDICINES,
  SCENARIOS,

  /**
   * Looks up a symptom by ID and returns its clinical profile and treatment scenario.
   * @param {string} symptomId
   * @returns {Object|null}
   */
  diagnoseSymptoms(symptomId) {
    const symptom = SYMPTOM_DATABASE.find(s => s.id === symptomId);
    if (!symptom) return null;

    const scenario = SCENARIOS[symptom.medScenarioId] || SCENARIOS['ichMain'];
    const medication = MEDICINES[scenario.medKey] || MEDICINES['stressHeal'];

    return {
      symptom,
      scenario,
      medication,
      recommendation: `${symptom.name}: Prescribed ${scenario.name} using ${medication.name}. ${scenario.instructions}`
    };
  },

  /**
   * Calculates volumetric dosage with automated safety lock clamps for sensitive species.
   * @param {string} scenarioId Scenario key ('ichMain', 'hospitalBact', etc.)
   * @param {string} medId Medication key ('generalCure', 'stressHeal', etc.)
   * @param {number} volumeNetL Net water volume in Liters
   * @param {Array<Object>} activeSpeciesList Active species roster
   * @param {boolean} useLockOverride Explicit boolean override for safety lock
   * @returns {Object} Dosage calculation report
   */
  calculateDose(scenarioId, medId, volumeNetL = 100, activeSpeciesList = [], useLockOverride) {
    let vol = Number(volumeNetL);
    if (isNaN(vol) || vol < 0) vol = 0;

    const scenario = SCENARIOS[scenarioId] || SCENARIOS['ichMain'];
    const actualMedId = medId || scenario.medKey;
    const med = MEDICINES[actualMedId] || MEDICINES['stressHeal'];

    // Detect scaleless and sensitive species
    const hasScaleless = (activeSpeciesList || []).some(sp => {
      if (!sp) return false;
      if (sp.scaleless === true) return true;
      const id = (sp.id || sp.name || '').toLowerCase();
      return id.includes('cory') || id.includes('corydoras') || id.includes('loach');
    });

    // Detect invertebrates (mollusks / crustaceans)
    const hasInvertebrates = (activeSpeciesList || []).some(sp => {
      if (!sp) return false;
      const id = (sp.id || sp.name || '').toLowerCase();
      return id.includes('snail') || id.includes('shrimp') || id.includes('nerite') || id.includes('invertebrate');
    });

    const shouldLock = useLockOverride !== undefined
      ? Boolean(useLockOverride)
      : Boolean(scenario.useLock && hasScaleless);

    const doseFactor = shouldLock ? (med.lockFactor || 0.5) : 1.0;
    const rawDose = (vol / 100) * med.ratePer100L * doseFactor;
    const formattedDose = rawDose < 10 ? Number(rawDose.toFixed(1)) : Math.round(rawDose);

    const warnings = [];
    if (shouldLock) {
      warnings.push("Sensitive/scaleless species detected: 50% safety lock engaged.");
    }
    if (hasInvertebrates && (actualMedId === 'generalCure' || actualMedId.toLowerCase().includes('copper'))) {
      warnings.push("Copper/Chemical Hazard: Verify medication contains 0 copper in presence of mollusks/crustaceans.");
    }
    if (hasScaleless && actualMedId === 'aquaSalt') {
      warnings.push("DO NOT dose aquarium salt in tanks with scaleless Corydoras.");
    }
    if (!med.safeMainTank) {
      warnings.push("Hospital tank isolation recommended for antibacterials to preserve beneficial nitrifying bacteria in display bio-filter.");
    }
    if (!med.safePlants) {
      warnings.push("Herbicide risk: This medication may melt delicate live plants. Treat in separate hospital container.");
    }

    return {
      scenarioId: scenario.id,
      medId: med.id,
      rawDose,
      formattedDose,
      unit: med.unit,
      doseFactor,
      isLocked: shouldLock,
      warnings,
      instructions: scenario.instructions
    };
  },

  /**
   * Retrieves a medication by ID.
   * @param {string} medId
   * @returns {Object|null}
   */
  getMedication(medId) {
    return MEDICINES[medId] || null;
  },

  /**
   * Returns all available medications.
   * @returns {Array<Object>}
   */
  getAllMedications() {
    return Object.values(MEDICINES);
  }
};

// CommonJS & ES Module Dual Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MedicationEngine;
  module.exports.MedicationEngine = MedicationEngine;
  module.exports.default = MedicationEngine;
}
if (typeof window !== 'undefined') {
  window.MedicationEngine = MedicationEngine;
}

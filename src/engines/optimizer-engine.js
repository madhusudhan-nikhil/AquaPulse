/**
 * AquaPulse OptimizerEngine
 * Biological knowledge base, tolerance overlap mathematics, flow compatibility,
 * and conflict detection engine for freshwater aquarium inhabitants.
 * Zero DOM / browser dependencies — 100% headless testable.
 */

const SPECIES_DATABASE = {
  "koi-angelfish": {
    id: "koi-angelfish",
    name: "Koi Angelfish",
    scientificName: "Pterophyllum scalare",
    category: "Cichlid",
    tempMin: 24.0,
    tempMax: 28.5,
    tempOptimal: 26.0,
    phMin: 6.0,
    phMax: 7.5,
    phOptimal: 6.8,
    ghMin: 3,
    ghMax: 10,
    khMin: 2,
    khMax: 6,
    flowPreference: "moderate",
    scaleless: false,
    bioload: 8.0,
    sensitivities: ["High nitrate > 30 ppm", "Aggressive tankmates", "Slime coat latching by CAE"],
    notes: "Graceful mid-water cichlid. Can become territorial when pairing; prey on nano fish."
  },
  "blue-zebra-angel": {
    id: "blue-zebra-angel",
    name: "Blue Zebra Angelfish",
    scientificName: "Pterophyllum scalare",
    category: "Cichlid",
    tempMin: 24.0,
    tempMax: 28.5,
    tempOptimal: 26.0,
    phMin: 6.0,
    phMax: 7.5,
    phOptimal: 6.8,
    ghMin: 3,
    ghMax: 10,
    khMin: 2,
    khMax: 6,
    flowPreference: "moderate",
    scaleless: false,
    bioload: 8.0,
    sensitivities: ["Sudden temperature swings", "Copper medications"],
    notes: "Territorial pairing at maturity; demands vertical structure and territory breaks."
  },
  "denison-barb": {
    id: "denison-barb",
    name: "Denison Barb (Roseline Shark)",
    scientificName: "Sahyadria denisonii",
    category: "Barb",
    tempMin: 18.0,
    tempMax: 26.0,
    tempOptimal: 23.5,
    phMin: 6.5,
    phMax: 7.6,
    phOptimal: 7.0,
    ghMin: 4,
    ghMax: 12,
    khMin: 3,
    khMax: 8,
    flowPreference: "high",
    scaleless: false,
    bioload: 6.0,
    sensitivities: ["Thermal stress > 26°C", "Low dissolved oxygen", "Sudden light extinction (jump risk)"],
    notes: "High-energy rheophilic torpedo barbs requiring strong current and high oxygenation."
  },
  "boeseman-rainbow": {
    id: "boeseman-rainbow",
    name: "Boeseman's Rainbowfish",
    scientificName: "Melanotaenia boesemani",
    category: "Rainbowfish",
    tempMin: 24.0,
    tempMax: 28.0,
    tempOptimal: 25.5,
    phMin: 7.0,
    phMax: 8.0,
    phOptimal: 7.4,
    ghMin: 8,
    ghMax: 18,
    khMin: 5,
    khMax: 12,
    flowPreference: "high",
    scaleless: false,
    bioload: 5.5,
    sensitivities: ["Acidic soft water (pH < 6.8)", "Stagnant low-flow water"],
    notes: "Thrives in moderate-to-hard alkaline water with open horizontal swimming channels."
  },
  "silvertip-tetra": {
    id: "silvertip-tetra",
    name: "Silver Tip Tetra",
    scientificName: "Hasemania nana",
    category: "Characin",
    tempMin: 22.0,
    tempMax: 28.0,
    tempOptimal: 25.0,
    phMin: 6.0,
    phMax: 7.8,
    phOptimal: 6.8,
    ghMin: 4,
    ghMax: 15,
    khMin: 3,
    khMax: 8,
    flowPreference: "moderate",
    scaleless: false,
    bioload: 1.5,
    sensitivities: ["Small group sizes (< 8 fish trigger fin-nipping)", "Poor aeration"],
    notes: "Active schooling fish. Must be kept in groups of at least 8 to curb nipping behavior."
  },
  "neon-tetra": {
    id: "neon-tetra",
    name: "Neon Tetra",
    scientificName: "Paracheirodon innesi",
    category: "Characin",
    tempMin: 21.0,
    tempMax: 26.0,
    tempOptimal: 24.0,
    phMin: 5.5,
    phMax: 7.2,
    phOptimal: 6.5,
    ghMin: 2,
    ghMax: 8,
    khMin: 1,
    khMax: 4,
    flowPreference: "low",
    scaleless: false,
    bioload: 1.0,
    sensitivities: ["High temperatures > 26.5°C", "Copper and malachite green medications"],
    notes: "Classic peaceful nano schooler; highly sensitive to full-strength parasitic treatments."
  },
  "female-betta": {
    id: "female-betta",
    name: "Female Betta",
    scientificName: "Betta splendens",
    category: "Labyrinth",
    tempMin: 24.5,
    tempMax: 29.0,
    tempOptimal: 26.0,
    phMin: 6.5,
    phMax: 7.6,
    phOptimal: 7.0,
    ghMin: 3,
    ghMax: 10,
    khMin: 2,
    khMax: 6,
    flowPreference: "low",
    scaleless: false,
    bioload: 2.5,
    sensitivities: ["Strong horizontal current", "Unsoaked freeze-dried foods (swim bladder bloat)"],
    notes: "Labyrinth surface breather requiring calm water film and access to atmospheric air."
  },
  "betta-male": {
    id: "betta-male",
    name: "Male Betta",
    scientificName: "Betta splendens",
    category: "Labyrinth",
    tempMin: 24.5,
    tempMax: 29.0,
    tempOptimal: 26.0,
    phMin: 6.5,
    phMax: 7.5,
    phOptimal: 7.0,
    ghMin: 3,
    ghMax: 10,
    khMin: 2,
    khMax: 6,
    flowPreference: "low",
    scaleless: false,
    bioload: 2.5,
    sensitivities: ["Other Bettas / territorial rivals", "High flow velocity", "Fin nippers"],
    notes: "Solitary centerpiece fish; cannot tolerate fast jet streams or aggressive schoolers."
  },
  "dwarf-gourami": {
    id: "dwarf-gourami",
    name: "Dwarf Red Gourami",
    scientificName: "Trichogaster lalius",
    category: "Labyrinth",
    tempMin: 24.0,
    tempMax: 28.0,
    tempOptimal: 25.5,
    phMin: 6.0,
    phMax: 7.5,
    phOptimal: 6.8,
    ghMin: 4,
    ghMax: 10,
    khMin: 2,
    khMax: 6,
    flowPreference: "low",
    scaleless: false,
    bioload: 3.0,
    sensitivities: ["Turbulent water flow", "High ammonia/nitrite", "Unsoaked food bloat"],
    notes: "Delicate surface labyrinth dweller; retreats to calm slack pockets under heavy current."
  },
  "rice-fish": {
    id: "rice-fish",
    name: "Daisy's Blue Rice Fish",
    scientificName: "Oryzias woworae",
    category: "Nano",
    tempMin: 22.0,
    tempMax: 27.0,
    tempOptimal: 24.5,
    phMin: 6.5,
    phMax: 7.5,
    phOptimal: 7.0,
    ghMin: 5,
    ghMax: 12,
    khMin: 3,
    khMax: 7,
    flowPreference: "low",
    scaleless: false,
    bioload: 1.0,
    sensitivities: ["Large predatory tankmates", "Heavy water current"],
    notes: "Peaceful surface nano fish; easily outcompeted for food by aggressive Angels."
  },
  "harlequin-rasbora": {
    id: "harlequin-rasbora",
    name: "Harlequin Rasbora",
    scientificName: "Trigonostigma heteromorpha",
    category: "Cyprinid",
    tempMin: 23.0,
    tempMax: 28.0,
    tempOptimal: 25.0,
    phMin: 6.0,
    phMax: 7.5,
    phOptimal: 6.6,
    ghMin: 3,
    ghMax: 10,
    khMin: 2,
    khMax: 6,
    flowPreference: "moderate",
    scaleless: false,
    bioload: 1.2,
    sensitivities: ["Hard alkaline water > pH 7.8", "Solitary keeping"],
    notes: "Tightly schooling mid-water fish that enhances community shoaling dynamics."
  },
  "albino-corydoras": {
    id: "albino-corydoras",
    name: "Albino Corydoras",
    scientificName: "Corydoras aeneus",
    category: "Catfish",
    tempMin: 21.0,
    tempMax: 26.5,
    tempOptimal: 24.0,
    phMin: 6.0,
    phMax: 7.5,
    phOptimal: 6.8,
    ghMin: 4,
    ghMax: 12,
    khMin: 2,
    khMax: 6,
    flowPreference: "low",
    scaleless: true,
    bioload: 2.0,
    sensitivities: ["Aquarium salt (lethal)", "Full-strength medications (requires 50% lock)", "Sharp substrate (barbel erosion)"],
    notes: "Armored bottom scavenger lacking true bony scales; highly sensitive to osmotic salts and copper."
  },
  "pygmy-cory": {
    id: "pygmy-cory",
    name: "Pygmy Corydoras",
    scientificName: "Corydoras pygmaeus",
    category: "Catfish",
    tempMin: 22.0,
    tempMax: 26.0,
    tempOptimal: 24.0,
    phMin: 6.2,
    phMax: 7.4,
    phOptimal: 6.8,
    ghMin: 3,
    ghMax: 10,
    khMin: 2,
    khMax: 5,
    flowPreference: "low",
    scaleless: true,
    bioload: 0.8,
    sensitivities: ["Salts and formalin", "High current velocity", "Aggressive bottom feeders"],
    notes: "Miniature scaleless catfish that hovers in mid-water and browses substrate."
  },
  "golden-cae": {
    id: "golden-cae",
    name: "Golden Chinese Algae Eater",
    scientificName: "Gyrinocheilus aymonieri",
    category: "Algae Crew",
    tempMin: 22.0,
    tempMax: 27.5,
    tempOptimal: 25.0,
    phMin: 6.5,
    phMax: 7.8,
    phOptimal: 7.0,
    ghMin: 5,
    ghMax: 15,
    khMin: 3,
    khMax: 8,
    flowPreference: "high",
    scaleless: false,
    bioload: 5.0,
    sensitivities: ["Protein deficiency (causes slime coat predation)", "Lack of hiding caves"],
    notes: "Semi-aggressive as adult; will latch onto broad-bodied fish if night vegetable wafers are omitted."
  },
  "sae": {
    id: "sae",
    name: "Siamese Algae Eater (SAE)",
    scientificName: "Crossocheilus oblongus",
    category: "Algae Crew",
    tempMin: 23.0,
    tempMax: 27.0,
    tempOptimal: 25.0,
    phMin: 6.5,
    phMax: 7.5,
    phOptimal: 6.9,
    ghMin: 5,
    ghMax: 12,
    khMin: 3,
    khMax: 7,
    flowPreference: "moderate",
    scaleless: false,
    bioload: 3.5,
    sensitivities: ["Low oxygen levels", "Lack of natural biofilm / algae"],
    notes: "Peaceful true algae grazer that actively consumes brush and black beard algae."
  },
  "nerite-snail": {
    id: "nerite-snail",
    name: "Zebra Nerite Snail",
    scientificName: "Neritina natalensis",
    category: "Invertebrate",
    tempMin: 22.0,
    tempMax: 27.5,
    tempOptimal: 25.0,
    phMin: 7.0,
    phMax: 8.2,
    phOptimal: 7.5,
    ghMin: 6,
    ghMax: 15,
    khMin: 4,
    khMax: 10,
    flowPreference: "moderate",
    scaleless: false,
    bioload: 0.5,
    sensitivities: ["Strict copper intolerance (lethal)", "Acidic water < pH 6.8 (shell erosion)"],
    notes: "Excellent diatom and glass algae cleaner; cannot survive in copper-treated water or acidic soft water."
  }
};

const OptimizerEngine = {
  SPECIES_DATABASE,

  /**
   * Resolves a species item into a full ecological profile.
   * Matches by ID, common name substrings, or returns safe tropical defaults.
   * @param {Object} speciesItem
   * @returns {Object} Full species profile
   */
  resolveSpeciesProfile(speciesItem) {
    if (!speciesItem || typeof speciesItem !== 'object') return null;

    // Direct ID match
    if (speciesItem.id && SPECIES_DATABASE[speciesItem.id]) {
      const match = SPECIES_DATABASE[speciesItem.id];
      return Object.assign({}, match, speciesItem);
    }

    // Name substring fuzzy lookup
    const cleanName = (speciesItem.name || '').toLowerCase().trim();
    if (cleanName) {
      for (const key in SPECIES_DATABASE) {
        const item = SPECIES_DATABASE[key];
        const itemName = item.name.toLowerCase();
        const keyWords = key.split('-');
        if (cleanName.includes(itemName) ||
            itemName.includes(cleanName) ||
            cleanName.includes(key.replace(/-/g, ' '))) {
          return Object.assign({}, item, speciesItem);
        }
        // Word set inclusion check (e.g. 'zebra snail' in 'zebra nerite snail')
        const inputWords = cleanName.split(/\s+/).filter(Boolean);
        if (inputWords.length > 1 && inputWords.every(w => itemName.includes(w) || keyWords.includes(w))) {
          return Object.assign({}, item, speciesItem);
        }
      }
    }

    // Safe tropical community default fallback
    return {
      id: speciesItem.id || 'custom-tropical',
      name: speciesItem.name || "Tropical Fish",
      scientificName: speciesItem.scientificName || "Pisces",
      category: "Tropical Community",
      tempMin: speciesItem.tempMin !== undefined ? Number(speciesItem.tempMin) : 23.0,
      tempMax: speciesItem.tempMax !== undefined ? Number(speciesItem.tempMax) : 27.0,
      tempOptimal: speciesItem.tempOptimal !== undefined ? Number(speciesItem.tempOptimal) : 25.0,
      phMin: speciesItem.phMin !== undefined ? Number(speciesItem.phMin) : 6.5,
      phMax: speciesItem.phMax !== undefined ? Number(speciesItem.phMax) : 7.5,
      phOptimal: speciesItem.phOptimal !== undefined ? Number(speciesItem.phOptimal) : 7.0,
      ghMin: speciesItem.ghMin !== undefined ? Number(speciesItem.ghMin) : 4,
      ghMax: speciesItem.ghMax !== undefined ? Number(speciesItem.ghMax) : 12,
      khMin: speciesItem.khMin !== undefined ? Number(speciesItem.khMin) : 2,
      khMax: speciesItem.khMax !== undefined ? Number(speciesItem.khMax) : 6,
      flowPreference: speciesItem.flowPreference || "moderate",
      scaleless: Boolean(speciesItem.scaleless),
      bioload: speciesItem.bioload !== undefined ? Number(speciesItem.bioload) : 2.0,
      sensitivities: speciesItem.sensitivities || [],
      notes: speciesItem.notes || "Standard tropical community parameters."
    };
  },

  /**
   * Retrieves a species profile by unique identifier.
   * @param {string} id Species ID slug
   * @returns {Object|null}
   */
  getSpecies(id) {
    return SPECIES_DATABASE[id] || null;
  },

  /**
   * Returns all 16 registered species profiles.
   * @returns {Array<Object>}
   */
  getAllSpecies() {
    return Object.values(SPECIES_DATABASE);
  },

  /**
   * Calculates the mathematical sweet-spot intersection across all configured species.
   * Computes safe temperature, pH, GH, and KH corridors, flow recommendations,
   * scaleless species flags, and ecological conflict warnings.
   * @param {Array<Object>} speciesList Configured species list
   * @param {Object} tankSpecs Optional tank specification
   * @returns {Object|null}
   */
  calculateSweetSpot(speciesList, tankSpecs = {}) {
    if (!speciesList || !Array.isArray(speciesList) || speciesList.length === 0) {
      return null;
    }

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
    const conflicts = [];
    const resolvedProfiles = [];

    let hasAngelfish = false;
    let hasSmallFish = false;
    let hasGoldenCae = false;
    let hasSilvertip = false;
    let hasBetta = false;
    let hasNerite = false;

    for (const sp of speciesList) {
      const prof = this.resolveSpeciesProfile(sp);
      if (!prof) continue;
      resolvedProfiles.push({ item: sp, profile: prof });

      const count = Number(sp.count) || 1;

      if (prof.tempMin > maxTempMin) maxTempMin = prof.tempMin;
      if (prof.tempMax < minTempMax) minTempMax = prof.tempMax;
      if (prof.phMin > maxPhMin) maxPhMin = prof.phMin;
      if (prof.phMax < minPhMax) minPhMax = prof.phMax;
      if (prof.ghMin > maxGhMin) maxGhMin = prof.ghMin;
      if (prof.ghMax < minGhMax) minGhMax = prof.ghMax;
      if (prof.khMin > maxKhMin) maxKhMin = prof.khMin;
      if (prof.khMax < minKhMax) minKhMax = prof.khMax;

      if (prof.flowPreference === 'low') lowFlowCount += count;
      if (prof.flowPreference === 'high') highFlowCount += count;
      if (prof.scaleless && !scalelessSpecies.includes(prof.name)) {
        scalelessSpecies.push(prof.name);
      }

      const id = (prof.id || sp.id || '').toLowerCase();
      if (id.includes('angel')) hasAngelfish = true;
      if (id.includes('neon') || id.includes('rice-fish')) hasSmallFish = true;
      if (id.includes('golden-cae')) hasGoldenCae = true;
      if (id.includes('silvertip')) hasSilvertip = true;
      if (id.includes('betta') || id.includes('gourami')) hasBetta = true;
      if (id.includes('nerite') || id.includes('snail')) hasNerite = true;
    }

    const hasTempOverlap = maxTempMin <= minTempMax;
    const hasPhOverlap = maxPhMin <= minPhMax;

    const recommendedTemp = hasTempOverlap
      ? Number(((maxTempMin + minTempMax) / 2).toFixed(1))
      : 25.5;

    const tempRange = hasTempOverlap ? [maxTempMin, minTempMax] : [25.0, 26.0];
    const phRange = hasPhOverlap ? [maxPhMin, minPhMax] : [6.6, 7.4];
    const ghRange = [Math.max(3, maxGhMin), Math.min(15, minGhMax > 0 ? minGhMax : 12)];
    const khRange = [Math.max(2, maxKhMin), Math.min(8, minKhMax > 0 ? minKhMax : 6)];

    let recommendedFlow = "45° Glass-Baffled Return Recommended";
    if (lowFlowCount === 0 && highFlowCount > 0) {
      recommendedFlow = "Direct Venturi Jet Flow Suitable";
    } else if (highFlowCount === 0 && lowFlowCount > 0) {
      recommendedFlow = "Low Gentle Flow Required";
    }

    // Evaluate individual thermal strains
    for (const { profile: prof } of resolvedProfiles) {
      if (prof.tempMax < recommendedTemp) {
        conflicts.push(`${prof.name} prefers cooler water (max ${prof.tempMax}°C), running warm at ${recommendedTemp}°C.`);
      }
      if (prof.tempMin > recommendedTemp) {
        conflicts.push(`${prof.name} prefers warmer water (min ${prof.tempMin}°C), running cool at ${recommendedTemp}°C.`);
      }
    }

    // Evaluate behavioral & inter-species compatibility
    if (hasGoldenCae && hasAngelfish) {
      conflicts.push("Behavioral Alert: Golden Chinese Algae Eater may latch onto broad-bodied Angelfish to feed on mucus if starved of evening vegetable wafers.");
    }
    if (hasAngelfish && hasSmallFish) {
      conflicts.push("Predatory Risk: Mature Angelfish will opportunistically prey on small slender fish (Neon Tetras, Rice Fish).");
    }
    if (hasSilvertip && hasBetta) {
      conflicts.push("Fin Nipping Risk: Silver Tip Tetras can become aggressive nippers against slow-moving long-finned fish (Bettas, Gouramis). Maintain school size >= 8.");
    }
    if (scalelessSpecies.length > 0) {
      conflicts.push("Medical Contraindication: Scaleless fish present (" + scalelessSpecies.join(', ') + "). Never dose pure aquarium salt in display tank.");
    }
    if (hasNerite) {
      conflicts.push("Invertebrate Copper Hazard: Zebra Nerite Snails have strict zero tolerance for copper medications.");
    }

    const volumeNetL = Number(tankSpecs.volumeNetL) || 100;
    const densityResult = this.calculateDensityScore(speciesList, volumeNetL);

    return {
      hasTempOverlap,
      hasPhOverlap,
      recommendedTemp,
      tempRange,
      phRange,
      ghRange,
      khRange,
      recommendedFlow,
      scalelessSpecies,
      conflicts,
      densityScore: densityResult.score,
      densityStatus: densityResult.status,
      lowFlowCount,
      highFlowCount,
      totalFish: densityResult.totalFish
    };
  },

  /**
   * Compatibility alias for calculateSweetSpot.
   */
  analyzeInhabitants(speciesList, tankSpecs = {}) {
    return this.calculateSweetSpot(speciesList, tankSpecs);
  },

  /**
   * Calculates tank bioload and population density score.
   * @param {Array<Object>} speciesList
   * @param {number} volumeNetL
   * @returns {{ score: number, status: 'LIGHT'|'BALANCED'|'HEAVY'|'OVERSTOCKED', totalFish: number, totalBioLoad: number }}
   */
  calculateDensityScore(speciesList, volumeNetL = 100) {
    if (!speciesList || !Array.isArray(speciesList) || speciesList.length === 0) {
      return { score: 0, status: 'LIGHT', totalFish: 0, totalBioLoad: 0 };
    }

    let totalFish = 0;
    let totalBioLoad = 0;

    for (const sp of speciesList) {
      const prof = this.resolveSpeciesProfile(sp);
      const count = Number(sp.count) || 1;
      const bioloadUnit = prof ? (prof.bioload || 2.0) : 2.0;
      totalFish += count;
      totalBioLoad += count * bioloadUnit;
    }

    // Standard biological capacity: 1 bioload unit per ~1.5L of net volume
    const capacity = Math.max(10, (Number(volumeNetL) || 100) * 0.65);
    const score = Math.round((totalBioLoad / capacity) * 100);

    let status = 'BALANCED';
    if (score <= 50) status = 'LIGHT';
    else if (score <= 85) status = 'BALANCED';
    else if (score <= 115) status = 'HEAVY';
    else status = 'OVERSTOCKED';

    return {
      score,
      status,
      totalFish,
      totalBioLoad: Number(totalBioLoad.toFixed(1))
    };
  }
};

// CommonJS & ES Module Dual Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OptimizerEngine;
  module.exports.OptimizerEngine = OptimizerEngine;
  module.exports.default = OptimizerEngine;
}
if (typeof window !== 'undefined') {
  window.OptimizerEngine = OptimizerEngine;
}

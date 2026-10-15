/**
 * AquaPulse Ecosystem Configuration Template (Public Demo)
 * 
 * This is the public template configuration shipped with the open-source repo.
 * It contains generic demo data for a freshwater community aquarium.
 * 
 * To customize for your personal tank:
 * - Create `aquapulse.private.js` (copy this file or define window.AQUAPULSE_PRIVATE_CONFIG)
 * - Your private settings will automatically deep-merge over these defaults at runtime.
 * - `aquapulse.private.js` is git-ignored and never committed to version control.
 * 
 * You can edit this file to configure any aquarium setup:
 * - Tank Dimensions & Volumes
 * - Target Parameters & Diagnostics Thresholds
 * - Equipment (Filters, Heaters, Lights, CO2)
 * - Interactive Layout Zones & Aquascape Elements
 * - Livestock / Species Roster & Compatibility Watchpoints
 * - Pantry / Fish Foods & Feeding Matrix
 * - Pharmacy / Medicines & Safety Lock Rules
 * - Weekly Maintenance Tasks & Filter Rotation
 */

window.AQUAPULSE_DEFAULT_CONFIG = {
  tank: {
    id: "tank-demo-community",
    name: "AquaPulse Demo Tank",
    badge: "Demo v1.0",
    dimensions: {
      length: 2,
      width: 1.5,
      height: 1.5,
      unit: "ft"
    },
    volumeGrossL: 120,
    volumeNetL: 100,
    waterType: "Freshwater Community",
    substrate: "Fine Natural Gravel",
    substrateTip: "Vacuum weekly during water changes"
  },

  targets: {
    temp: { min: 24.5, max: 26.5, unit: "°C" },
    ph: { min: 6.5, max: 7.5 },
    ammoniaMax: 0.0,
    nitriteMax: 0.0,
    nitrateTarget: { min: 5, max: 25, unit: "ppm" },
    nitrateWarning: 30,
    nitrateCritical: 50,
    ghTarget: { min: 4, max: 12, unit: "dGH" },
    khTarget: { min: 3, max: 8, unit: "dKH" }
  },

  equipment: {
    filter: {
      name: "Hang-on-Back Filter",
      flowRateLph: 500,
      turnoverTarget: "~5×/hr",
      cups: [
        { id: "A", name: "Mechanical Sponge", media: "Coarse Foam Sponge" },
        { id: "B", name: "Biological Chamber", media: "Ceramic Bio-Rings" }
      ],
      rinseInstructions: "Rinse only one media type at a time in old tank water."
    },
    heater: {
      name: "Submersible Heater",
      wattage: 100,
      placement: "Near filter intake for even heat distribution"
    },
    lighting: {
      name: "LED Light Bar",
      maxPhotoperiodHours: 8,
      nightRampDownMinutes: 15,
      warning: "Reduce photoperiod if algae growth appears"
    },
    plants: [
      { name: "Java Fern", type: "Epiphyte", function: "Attach to driftwood; do not bury rhizome" },
      { name: "Anubias", type: "Epiphyte", placement: "Tied to hardscape" },
      { name: "Floating Plants", type: "Surface", placement: "Provide shade and nitrate export" }
    ]
  },

  // Interactive Tank Layout & Zones
  zones: {
    led: {
      id: "led",
      name: "💡 LED Light Bar",
      category: "hardware",
      badgeText: "LED Light Bar (8h/day)",
      position: { top: "-4px", left: "14%", right: "16%", height: "12px" },
      title: "💡 Overhead LED Light Bar",
      body: "Provides full-spectrum light for plants and fish coloration.",
      tip: "Keep photoperiod at 6-8 hours to prevent algae. Reduce if green growth appears."
    },
    pothos: {
      id: "floating",
      name: "🌿 Surface Floating Plants",
      category: "plant",
      badgeText: "🌿 Surface Plants (Nitrate Export)",
      position: { top: "4px", right: "80px" },
      title: "🌿 Surface Floating Plants",
      body: "Floating plants like Duckweed or Water Lettuce absorb nitrates directly from the water column.",
      tip: "Thin out weekly to prevent blocking light to submerged plants."
    },
    filter: {
      id: "filter",
      name: "⚙️ 500 L/Hr HOB Filter + 100W Heater",
      category: "hardware",
      position: { top: "40px", right: "20px", width: "80px", height: "208px" },
      title: "⚙️ Hang-on-Back Filter & 100W Heater",
      body: "Mounted on the back panel. Provides mechanical and biological filtration with gentle surface agitation.",
      tip: "Rinse only one filter media type per maintenance session in old tank water."
    },
    leftCanopy: {
      id: "leftCanopy",
      name: "🎯 Zone A: Calm Surface Area",
      category: "feeding-zone",
      position: { top: "32px", left: "16px" },
      title: "🎯 Zone A: Calm Surface Feeding Zone",
      body: "Low-flow area ideal for surface feeders and floating food.",
      tip: "Sprinkle flakes here for surface and mid-water species."
    },
    driftwood: {
      id: "driftwood",
      name: "🪵 Center Hardscape",
      category: "hardscape",
      position: { bottom: "48px", left: "25%", right: "25%", height: "176px" },
      title: "🪵 Center Driftwood & Plants",
      body: "Central decoration providing territory breaks and shelter.",
      tip: "Drop sinking food near the base for bottom dwellers."
    },
    foregroundRock: {
      id: "foregroundRock",
      name: "🪨 Front Rock Cluster",
      category: "hardscape",
      position: { bottom: "16px", left: "42%", width: "144px", height: "64px" },
      title: "🪨 Front Viewing Rock Cluster",
      body: "Low hardscape providing shelter and current breaks.",
      tip: "Good spot for pressing food tablets against the glass."
    },
    bottomLeft: {
      id: "bottomLeft",
      name: "🐾 Bottom Foraging Zone",
      category: "feeding-zone",
      position: { bottom: "12px", left: "12px" },
      title: "🐾 Bottom Substrate Foraging Zone",
      body: "Open substrate area where bottom dwellers search for food.",
      tip: "Drop sinking pellets here for catfish and bottom feeders."
    },
    bottomRight: {
      id: "bottomRight",
      name: "⚠️ Low-Current Shelter",
      category: "shelter",
      position: { bottom: "12px", right: "12px" },
      title: "⚠️ Low-Current Shelter Zone",
      body: "Calm area with reduced flow, used by shy or slow-moving species.",
      tip: "Shy species may retreat here; ensure food reaches this zone."
    }
  },

  // Flow Simulator Settings (Standard Filter Outflow)
  flowModes: {
    current: {
      id: "current",
      label: "Standard Filter Outflow",
      jetLabel: "⚡ Filter Outflow Sweeping Upper Tank →",
      shelterTitle: "⚠️ Low-Current Shelter",
      shelterDesc: "Shy species sheltering in low-flow zone",
      shelterBadgeClass: "cursor-pointer absolute bottom-20 right-4 md:right-6 bg-rose-950/90 hover:bg-rose-900 border border-rose-400/60 px-3 py-1.5 rounded-xl text-xs hover:scale-105 transition z-20 backdrop-blur-sm flex items-center gap-2"
    }
  },

  // Species Roster
  species: [
    {
      id: "neon-tetra",
      name: "Neon Tetra",
      count: 10,
      zone: "mid",
      watch: false,
      temp: "22–26°C",
      food: "Tropical flakes & micro pellets",
      note: "Peaceful schooler; keep in groups of 8+."
    },
    {
      id: "fancy-guppy",
      name: "Fancy Guppy",
      count: 6,
      zone: "top",
      watch: false,
      temp: "23–28°C",
      food: "Tropical flakes & small granules",
      note: "Active livebearer; separate fry if breeding is unwanted."
    },
    {
      id: "albino-corydoras",
      name: "Bronze Corydoras",
      count: 4,
      zone: "bottom",
      watch: true,
      temp: "22–27°C",
      food: "Sinking pellets & wafers",
      note: "Scaleless catfish; never use salt or full-strength medications."
    },
    {
      id: "nerite-snail",
      name: "Zebra Nerite Snail",
      count: 2,
      zone: "bottom",
      watch: false,
      temp: "22–27°C",
      food: "Natural algae & biofilm",
      note: "Efficient algae cleaner; needs pH above 6.8 for shell health."
    }
  ],

  // Pantry / Foods Inventory
  foods: [
    {
      id: "tropical-flakes",
      name: "Tropical Flakes",
      badge: "Daily Staple",
      badgeClass: "bg-amber-500/20 text-amber-300",
      borderClass: "border-l-amber-400",
      timing: "Daily (AM & PM)",
      desc: "Balanced floating flakes for community fish.",
      targetZone: "Surface and mid-water column.",
      primaryFish: "Guppies, Tetras, and mid-water community fish.",
      tip: "Feed only what fish consume in 2 minutes.",
      soakRequiredSec: 0
    },
    {
      id: "sinking-pellets",
      name: "Sinking Pellets & Wafers",
      badge: "Bottom Feeder Food",
      badgeClass: "bg-emerald-500/20 text-emerald-300",
      borderClass: "border-l-emerald-400",
      timing: "Daily (PM)",
      desc: "Dense sinking pellets for catfish and bottom dwellers.",
      targetZone: "Bottom substrate near shelter areas.",
      primaryFish: "Corydoras, Plecos, and bottom-dwelling species.",
      tip: "Drop at lights-out so bottom feeders eat undisturbed.",
      soakRequiredSec: 0
    },
    {
      id: "freeze-dried-treats",
      name: "Freeze-Dried Bloodworms",
      badge: "Protein Treat",
      badgeClass: "bg-rose-500/20 text-rose-300",
      borderClass: "border-l-rose-500",
      timing: "2x per week",
      desc: "High-protein treat to supplement staple diet.",
      targetZone: "Mid-water column or pressed on glass.",
      primaryFish: "All community fish enjoy this as a treat.",
      tip: "Pre-soak for 2 minutes to prevent digestive bloat.",
      soakRequiredSec: 120
    }
  ],

  // 3-Day Simplified Feeding Schedule
  feedingSchedule: [
    {
      day: "Mon",
      type: "Staple Day",
      morning: "Tropical flakes on the water surface.",
      evening: "Sinking pellets dropped near bottom shelter.",
      night: "No additional feeding needed."
    },
    {
      day: "Tue",
      type: "Treat Day",
      morning: "Tropical flakes for surface and mid-water fish.",
      evening: "Pre-soaked freeze-dried bloodworms for the community.",
      night: "Observe bottom feeders to ensure pellets were consumed."
    },
    {
      day: "Wed",
      type: "Light / Fast Day",
      morning: "Small pinch of tropical flakes for smallest fish only.",
      evening: "FAST all larger fish to clear digestive tracts.",
      night: "Drop one sinking wafer for bottom crew at lights-out."
    }
  ],

  // Medicines & Safety Calculator
  medicines: [
    {
      id: "waterConditioner",
      name: "Water Conditioner",
      bottleSize: "250 ml",
      purpose: "Dechlorinator & Slime Coat Protector",
      badge: "Main Tank Safe",
      badgeClass: "bg-emerald-500/20 text-emerald-300",
      borderClass: "border-l-emerald-400",
      ratePer100L: 5.0,
      unit: "ml",
      safeMainTank: true,
      safePlants: true,
      safeScaleless: true,
      desc: "Neutralizes chlorine and chloramines, binds heavy metals, and supports slime coat. Dose on every water change."
    },
    {
      id: "antiParasitic",
      name: "Anti-Parasitic Treatment",
      bottleSize: "100 ml",
      purpose: "Anti-White Spot (Ich) & External Parasites",
      badge: "50% Lock for Scaleless Fish",
      badgeClass: "bg-sky-500/20 text-sky-300",
      borderClass: "border-l-sky-400",
      ratePer100L: 10.0,
      unit: "ml",
      safeMainTank: true,
      safePlants: true,
      safeScaleless: false,
      sensitiveSpecies: ["Bronze Corydoras"],
      lockFactor: 0.5,
      desc: "Treats white spot (Ich) and external parasites. Use at 50% dose when scaleless species are present."
    },
    {
      id: "aquariumSalt",
      name: "Aquarium Salt",
      bottleSize: "500g",
      purpose: "Osmotic Therapy & Gill Support",
      badge: "Hospital Use ONLY",
      badgeClass: "bg-rose-500/20 text-rose-300",
      borderClass: "border-l-rose-500",
      ratePer100L: 150.0,
      unit: "g",
      safeMainTank: false,
      safePlants: false,
      safeScaleless: false,
      desc: "For external salt baths only. Never add to planted tank or use with scaleless species."
    }
  ],

  // Medicine Scenarios
  medScenarios: [
    {
      id: "waterChange",
      name: "1. Routine Water Change",
      defaultVolumeRatio: 0.30,
      medKey: "waterConditioner",
      headline: "Prescription: Routine Water Conditioning",
      badge: "100% Main Tank Safe",
      badgeClass: "bg-emerald-500/20 text-emerald-300",
      detail: "Neutralizes chlorine in replacement water and restores slime coat protection."
    },
    {
      id: "ichMain",
      name: "2. White Spot (Ich) Treatment",
      defaultVolumeRatio: 1.0,
      medKey: "antiParasitic",
      useLock: true,
      headline: "Prescription: Anti-Parasitic Main Tank Protocol",
      badge: "🔒 50% Safety Lock Active",
      badgeClass: "bg-amber-500/20 text-amber-300",
      bulletPoints: [
        "Protects scaleless catfish from chemical burns.",
        "Raise temperature to 28°C and maximize aeration during treatment."
      ]
    },
    {
      id: "hospitalSalt",
      name: "3. Salt Bath (Hospital Container)",
      fixedVolume: 10,
      fullWidth: true,
      medKey: "aquariumSalt",
      headline: "Prescription: Osmotic Recovery Bath",
      badge: "🚫 NEVER in Planted Tank",
      badgeClass: "bg-rose-500/20 text-rose-300",
      detail: "Pre-dissolve salt in hospital container for gill distress or bloat recovery. Never use on scaleless species."
    }
  ],

  // Weekly Maintenance Tasks Checklist
  checklistTasks: [
    {
      id: "t1",
      title: "Log Weekly Water Parameters (NH₃, NO₂⁻, NO₃⁻, pH, Temp)",
      detail: "Test water before your water change to determine if a larger change is needed."
    },
    {
      id: "t2",
      title: "Weekly Water Change (~30%) + Gravel Vacuum",
      detail: "Siphon debris from the substrate to prevent organic waste buildup."
    },
    {
      id: "t3",
      title: "Rinse Filter Media (One Type Only)",
      detail: "Squeeze or rinse only one filter media type in old tank water. Never replace all media at once."
    }
  ]
};

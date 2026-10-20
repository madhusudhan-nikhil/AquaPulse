/**
 * AquaPulse CareEngine
 * 14-day quarantine countdown tracking, alternating dual-canister filter media rotation,
 * feeding schedule matrix with pre-soak timers, and social aggression scoring.
 * Zero DOM / browser dependencies — 100% headless testable.
 */

const DEFAULT_FEEDING_SCHEDULE = [
  { day: "Mon", type: "Staple + Veggie Night", morning: "Spirulina flakes (light pinch)", evening: "Micro-granules across schooling lane", night: "Blanched zucchini round for CAE & Corydoras" },
  { day: "Tue", type: "Protein Treat Day", morning: "Freeze-dried Tubifex (pre-soaked 3 min)", evening: "Vibra bites for Angelfish", night: "Algae wafer half" },
  { day: "Wed", type: "Color Enhancing Staple", morning: "Color crisps", evening: "Garlic-enriched pellets", night: "Lights out - no feed" },
  { day: "Thu", type: "Frozen / Live Treat", morning: "Daphnia / Artemia", evening: "Micro-pellets", night: "Bottom tablet under spiderwood" },
  { day: "Fri", type: "High-Fiber Digestive Day", morning: "Blanched shelled peas", evening: "Spirulina flake light pinch", night: "Lights out - no feed" },
  { day: "Sat", type: "Community Feast & Sponge Day", morning: "Variety flake + micro-pellets", evening: "Tubifex treat in Zone B", night: "Veggie wafer" },
  { day: "Sun", type: "FASTING DAY (Adults)", morning: "FAST - No food (clears digestive tracts)", evening: "FAST - Check bottom activity", night: "FAST - Zero waste day" }
];

const CareEngine = {
  DEFAULT_FEEDING_SCHEDULE,

  /**
   * Calculates quarantine / hospital countdown progress and clinical status.
   * @param {Object} quarData { active, fishName, startDate, durationDays }
   * @param {Date|string} currentDate Current date reference for calculation
   * @returns {Object} Quarantine progress assessment
   */
  calculateQuarantineCountdown(quarData, currentDate = new Date()) {
    if (!quarData || typeof quarData !== 'object') {
      return {
        active: false,
        fishName: 'None',
        daysElapsed: 0,
        daysRemaining: 14,
        totalDays: 14,
        percentage: 0,
        status: 'STANDBY READY',
        stage: 'Standby'
      };
    }

    const start = new Date(quarData.startDate || currentDate).getTime();
    const now = new Date(currentDate).getTime();
    const total = Number(quarData.durationDays) || 14;

    // Handle future start dates
    let elapsed = 0;
    if (now >= start) {
      elapsed = Math.max(0, Math.round((now - start) / (1000 * 60 * 60 * 24)));
    }

    const remaining = Math.max(0, total - elapsed);
    const percentage = total > 0
      ? Math.min(100, Math.round((Math.min(elapsed, total) / total) * 100))
      : 100;

    let status = 'STANDBY READY';
    let stage = 'Standby';

    if (quarData.active) {
      if (remaining === 0) {
        status = 'READY FOR MAIN TANK';
        stage = 'Ready for Main Tank';
      } else {
        status = 'ACTIVE ISOLATION';
        if (elapsed <= 3) {
          stage = 'Active Isolation';
        } else if (elapsed <= 10) {
          stage = 'Treatment Window';
        } else {
          stage = 'Clearance Evaluation';
        }
      }
    }

    return {
      active: Boolean(quarData.active),
      fishName: quarData.fishName || 'None',
      daysElapsed: elapsed,
      daysRemaining: remaining,
      totalDays: total,
      percentage,
      status,
      stage
    };
  },

  /**
   * Compatibility alias for calculateQuarantineCountdown.
   */
  calculateQuarantineProgress(startDate, durationDays = 14, currentDate = new Date()) {
    return this.calculateQuarantineCountdown({
      active: true,
      startDate,
      durationDays
    }, currentDate);
  },

  /**
   * Calculates the next filter cup index for alternating sponge media maintenance.
   * Prevents nitrifying biological collapse by alternating between media compartments.
   * @param {number} currentIndex Current cup index
   * @param {Array<Object>} cups Filter cups array (e.g. [{ name: 'Cup A' }, { name: 'Cup B' }])
   * @returns {number} Next cup index
   */
  getNextSpongeIndex(currentIndex = 0, cups = [{ name: 'Cup A' }, { name: 'Cup B' }]) {
    if (!cups || !Array.isArray(cups) || cups.length === 0) {
      return 0;
    }
    const len = cups.length;
    let idx = Number(currentIndex) || 0;
    let next = (idx + 1) % len;
    if (next < 0) next = (next + len) % len;
    return next;
  },

  /**
   * Detailed sponge rinse analysis based on maintenance history.
   * @param {Array<Object>} history Maintenance history records
   * @param {Array<Object>} canisters Configured filter canisters / cups
   * @returns {Object}
   */
  getNextSpongeRinse(history = [], canisters = [{ id: 'cup-a', name: 'Cup A: Coarse Foam' }, { id: 'cup-b', name: 'Cup B: Bio-Media Pad' }]) {
    if (!canisters || !canisters.length) {
      return { nextIndex: 0, nextCanister: null, daysSinceLastRinse: 0, recommendation: 'No filter media configured.' };
    }

    let lastIndex = 0;
    let daysSinceLast = 7;

    if (history && history.length > 0) {
      const last = history[0];
      if (last.cupIndex !== undefined) {
        lastIndex = Number(last.cupIndex);
      }
      if (last.date) {
        const diff = Math.abs(Date.now() - new Date(last.date).getTime());
        daysSinceLast = Math.round(diff / (1000 * 60 * 60 * 24));
      }
    }

    const nextIndex = this.getNextSpongeIndex(lastIndex, canisters);
    const nextCanister = canisters[nextIndex] || canisters[0];

    return {
      lastIndex,
      nextIndex,
      nextCanister,
      daysSinceLastRinse: daysSinceLast,
      recommendation: `Rinse ONLY ${nextCanister.name || 'Next Cup'} in siphoned tank water. DO NOT rinse both cups simultaneously.`
    };
  },

  /**
   * Calculates the mandatory pre-soak countdown in seconds for freeze-dried food.
   * Prevents digestive swim-bladder bloat.
   * @param {Object} foodItem Food item object with soakRequiredSec
   * @returns {number} Pre-soak duration in seconds
   */
  calculateSoakTime(foodItem) {
    if (!foodItem || typeof foodItem !== 'object' || !foodItem.soakRequiredSec) {
      return 0;
    }
    const sec = Number(foodItem.soakRequiredSec);
    return isNaN(sec) || sec < 0 ? 0 : sec;
  },

  /**
   * Returns daily feeding plan for a given day of the week.
   * @param {Array<Object>} schedule 7-day schedule array
   * @param {number|string} dayOfWeek Index 0-6 (Mon-Sun) or day string ('Mon', 'Tue', etc.)
   * @returns {Object}
   */
  getDailyFeedingPlan(schedule = DEFAULT_FEEDING_SCHEDULE, dayOfWeek = 0) {
    const list = Array.isArray(schedule) && schedule.length ? schedule : DEFAULT_FEEDING_SCHEDULE;
    let dayIdx = 0;

    if (typeof dayOfWeek === 'number') {
      dayIdx = ((dayOfWeek % list.length) + list.length) % list.length;
    } else if (typeof dayOfWeek === 'string') {
      const clean = dayOfWeek.trim().slice(0, 3).toLowerCase();
      const match = list.findIndex(d => (d.day || '').toLowerCase().startsWith(clean));
      if (match !== -1) dayIdx = match;
    }

    const plan = list[dayIdx] || list[0];
    const isFastingDay = Boolean(
      (plan.type && plan.type.toLowerCase().includes('fast')) ||
      (plan.morning && plan.morning.toLowerCase().includes('fast'))
    );

    return {
      dayIndex: dayIdx,
      day: plan.day,
      type: plan.type,
      morning: plan.morning,
      evening: plan.evening,
      night: plan.night,
      isFastingDay,
      notes: isFastingDay
        ? "Adult fish fast day. Allows digestive tracts to clear; reduces organic load."
        : "Follow 5-zone targeted feeding drop pattern."
    };
  },

  /**
   * Records a new social aggression incident into the chronological ledger.
   * Prepends the incident and ensures unique ID and timestamp.
   * @param {Array<Object>} incidents Existing incidents array
   * @param {Object} incident Incident payload
   * @returns {Array<Object>} Updated incidents array
   */
  recordIncident(incidents = [], incident = {}) {
    const list = Array.isArray(incidents) ? incidents : [];
    const item = {
      id: incident.id || `inc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      date: incident.date || new Date().toISOString().split('T')[0],
      aggressor: incident.aggressor || 'Unknown',
      victim: incident.victim || 'Community',
      trigger: incident.trigger || 'Territory',
      actionTaken: incident.actionTaken || 'Observed',
      severity: Math.min(5, Math.max(1, Number(incident.severity) || 2))
    };
    return [item, ...list];
  },

  /**
   * Calculates territory conflict tension score from incident history (0 to 100).
   * @param {Array<Object>} incidents
   * @returns {number} Tension score
   */
  calculateTerritoryScore(incidents = []) {
    if (!incidents || !Array.isArray(incidents) || incidents.length === 0) {
      return 0;
    }
    return Math.min(100, incidents.length * 15);
  },

  /**
   * Comprehensive social aggression analysis: severity rating, hotspots, and pairing tension.
   * @param {Array<Object>} incidents
   * @returns {Object} Aggression metrics report
   */
  calculateAggressionScore(incidents = []) {
    if (!incidents || !Array.isArray(incidents) || incidents.length === 0) {
      return {
        tensionScore: 0,
        severityRating: 1,
        totalIncidents: 0,
        hotspots: {},
        pairingMatrix: {},
        recommendation: "Social dynamic peaceful. No aggression hotspots detected."
      };
    }

    const tensionScore = this.calculateTerritoryScore(incidents);
    const hotspots = {};
    const pairingMatrix = {};
    let totalSeverity = 0;

    for (const inc of incidents) {
      const agg = inc.aggressor || 'Unknown';
      const vic = inc.victim || 'Community';
      const sev = Math.min(5, Math.max(1, Number(inc.severity) || 2));

      totalSeverity += sev;
      hotspots[agg] = (hotspots[agg] || 0) + 1;

      const pairKey = `${agg} -> ${vic}`;
      pairingMatrix[pairKey] = (pairingMatrix[pairKey] || 0) + 1;
    }

    const avgSeverity = Number((totalSeverity / incidents.length).toFixed(1));

    let recommendation = "Monitor behavior during feeding times.";
    if (tensionScore >= 60) {
      recommendation = "High territorial conflict detected: Add visual barriers (driftwood, tall Vallisneria) or separate aggressive individuals.";
    } else if (tensionScore >= 30) {
      recommendation = "Moderate territory chasing: Ensure distributed feeding across multiple drop zones to prevent feeding competition.";
    }

    return {
      tensionScore,
      severityRating: avgSeverity,
      totalIncidents: incidents.length,
      hotspots,
      pairingMatrix,
      recommendation
    };
  }
};

// CommonJS & ES Module Dual Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CareEngine;
  module.exports.CareEngine = CareEngine;
  module.exports.default = CareEngine;
}
if (typeof window !== 'undefined') {
  window.CareEngine = CareEngine;
}

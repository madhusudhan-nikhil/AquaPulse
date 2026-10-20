/**
 * AquaPulse DiagnosticsEngine
 * 3-Tier water health status evaluation (Safe/Optimal, Warning/Watch, Critical/Action Needed),
 * clinical remediation prescriptions, and rate-of-change trend anomaly analysis.
 * Zero DOM / browser dependencies — 100% headless testable.
 */

const DEFAULT_TARGETS = {
  temp: { min: 24.5, max: 26.5 },
  ph: { min: 6.5, max: 7.5 },
  ammoniaMax: 0.0,
  nitriteMax: 0.0,
  nitrateTarget: { min: 5, max: 25 },
  nitrateWarning: 30,
  nitrateCritical: 50,
  ghTarget: { min: 4, max: 12 },
  khTarget: { min: 3, max: 8 }
};

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') target = {};
  const result = Array.isArray(target) ? [...target] : Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
        result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

const DiagnosticsEngine = {
  DEFAULT_TARGETS,

  /**
   * Evaluates current water measurements against target ranges and returns 3-tier triage.
   * @param {Object} currentValues Metric readings { nh3, no2, no3, ph, temp, gh, kh }
   * @param {Object} targetOverrides Custom target thresholds
   * @returns {{ overallStatus: 'OPTIMAL'|'WATCH'|'ACTION NEEDED', metrics: Object, alerts: Array<string>, prescriptions: Array<string> }}
   */
  evaluateMetrics(currentValues = {}, targetOverrides = {}) {
    const t = deepMerge(DEFAULT_TARGETS, targetOverrides);

    const metrics = {};
    const alerts = [];
    let criticalCount = 0;
    let warningCount = 0;

    // Ammonia (NH3)
    const nh3 = currentValues.nh3 !== undefined ? Number(currentValues.nh3) : 0.0;
    if (isNaN(nh3)) {
      metrics.nh3 = { value: 0, status: 'safe', message: 'Ammonia reading nominal' };
    } else if (nh3 > 0.100) {
      metrics.nh3 = { value: nh3, status: 'critical', message: 'Lethal ammonia spike detected' };
      criticalCount++;
      alerts.push(`Ammonia Spike (${nh3} ppm)`);
    } else if (nh3 > t.ammoniaMax) {
      metrics.nh3 = { value: nh3, status: 'warning', message: 'Trace ammonia detected' };
      warningCount++;
      alerts.push(`Ammonia Warning (${nh3} ppm)`);
    } else {
      metrics.nh3 = { value: nh3, status: 'safe', message: 'Ammonia undetectable' };
    }

    // Nitrite (NO2)
    const no2 = currentValues.no2 !== undefined ? Number(currentValues.no2) : 0.0;
    if (isNaN(no2)) {
      metrics.no2 = { value: 0, status: 'safe', message: 'Nitrite reading nominal' };
    } else if (no2 > 0.100) {
      metrics.no2 = { value: no2, status: 'critical', message: 'Lethal nitrite detected' };
      criticalCount++;
      alerts.push(`Nitrite Spike (${no2} ppm)`);
    } else if (no2 > t.nitriteMax) {
      metrics.no2 = { value: no2, status: 'warning', message: 'Trace nitrite detected' };
      warningCount++;
      alerts.push(`Nitrite Warning (${no2} ppm)`);
    } else {
      metrics.no2 = { value: no2, status: 'safe', message: 'Nitrite undetectable' };
    }

    // Nitrate (NO3)
    const no3 = currentValues.no3 !== undefined ? Number(currentValues.no3) : 15.0;
    if (isNaN(no3)) {
      metrics.no3 = { value: 15, status: 'safe', message: 'Nitrate nominal' };
    } else if (no3 >= t.nitrateCritical) {
      metrics.no3 = { value: no3, status: 'critical', message: 'Dangerous nitrate accumulation' };
      criticalCount++;
      alerts.push(`Nitrate Critical (${no3} ppm)`);
    } else if (no3 > t.nitrateWarning) {
      metrics.no3 = { value: no3, status: 'warning', message: 'Elevated nitrate' };
      warningCount++;
      alerts.push(`Nitrate Warning (${no3} ppm)`);
    } else {
      metrics.no3 = { value: no3, status: 'safe', message: 'Nitrate within target bounds' };
    }

    // Temperature
    const temp = currentValues.temp !== undefined ? Number(currentValues.temp) : 25.5;
    if (isNaN(temp)) {
      metrics.temp = { value: 25.5, status: 'safe', message: 'Temperature nominal' };
    } else if (temp > t.temp.max + 2.0 || temp < t.temp.min - 3.0) {
      metrics.temp = { value: temp, status: 'critical', message: 'Extreme thermal shock hazard' };
      criticalCount++;
      alerts.push(`Temperature Critical (${temp}°C)`);
    } else if (temp > t.temp.max || temp < t.temp.min) {
      metrics.temp = { value: temp, status: 'warning', message: 'Temperature outside target bounds' };
      warningCount++;
      alerts.push(`Temperature Warning (${temp}°C)`);
    } else {
      metrics.temp = { value: temp, status: 'safe', message: 'Temperature optimal' };
    }

    // pH Acidity
    const ph = currentValues.ph !== undefined ? Number(currentValues.ph) : 7.0;
    if (isNaN(ph)) {
      metrics.ph = { value: 7.0, status: 'safe', message: 'pH nominal' };
    } else if (ph < 6.0 || ph > 8.2) {
      metrics.ph = { value: ph, status: 'critical', message: 'Severe pH distress' };
      criticalCount++;
      alerts.push(`pH Critical (${ph})`);
    } else if (ph < t.ph.min || ph > t.ph.max) {
      metrics.ph = { value: ph, status: 'warning', message: 'pH outside target bounds' };
      warningCount++;
      alerts.push(`pH Warning (${ph})`);
    } else {
      metrics.ph = { value: ph, status: 'safe', message: 'pH optimal' };
    }

    // General Hardness (GH)
    const gh = currentValues.gh !== undefined ? Number(currentValues.gh) : 7.0;
    if (isNaN(gh) || (gh >= (t.ghTarget?.min || 4) && gh <= (t.ghTarget?.max || 12))) {
      metrics.gh = { value: isNaN(gh) ? 7 : gh, status: 'safe', message: 'Hardness nominal' };
    } else if (gh < 2 || gh > 18) {
      metrics.gh = { value: gh, status: 'critical', message: 'Severe hardness imbalance' };
      criticalCount++;
      alerts.push(`GH Critical (${gh} dGH)`);
    } else {
      metrics.gh = { value: gh, status: 'warning', message: 'GH outside target range' };
      warningCount++;
      alerts.push(`GH Warning (${gh} dGH)`);
    }

    // Carbonate Hardness (KH)
    const kh = currentValues.kh !== undefined ? Number(currentValues.kh) : 4.0;
    if (isNaN(kh) || (kh >= (t.khTarget?.min || 3) && kh <= (t.khTarget?.max || 8))) {
      metrics.kh = { value: isNaN(kh) ? 4 : kh, status: 'safe', message: 'Buffering nominal' };
    } else if (kh < 1) {
      metrics.kh = { value: kh, status: 'critical', message: 'Loss of carbonate buffer (pH crash hazard)' };
      criticalCount++;
      alerts.push(`KH Critical (${kh} dKH)`);
    } else {
      metrics.kh = { value: kh, status: 'warning', message: 'KH outside target bounds' };
      warningCount++;
      alerts.push(`KH Warning (${kh} dKH)`);
    }

    // Overall status determination
    let overallStatus = 'OPTIMAL';
    if (criticalCount > 0) {
      overallStatus = 'ACTION NEEDED';
    } else if (warningCount > 0) {
      overallStatus = 'WATCH';
    }

    // Automated clinical prescriptions
    const prescriptions = [];
    if (nh3 > 0.0 || no2 > 0.0) {
      prescriptions.push('Perform an immediate 50% water change with detoxifying conditioner and fast tank for 24h.');
    } else if (no3 > t.nitrateWarning) {
      prescriptions.push('Perform a 35%-45% scheduled water change and siphon substrate.');
    }

    return {
      overallStatus,
      metrics,
      alerts,
      prescriptions
    };
  },

  /**
   * Calculates emergency water change volume, conditioner dose, and fasting protocol.
   * @param {number} netVolumeL
   * @returns {{ waterChangeVolumeL: number, conditionerMl: number, fastingDurationHours: number }}
   */
  calculateEmergencyWaterChange(netVolumeL = 100) {
    const vol = Math.max(0, Number(netVolumeL) || 0);
    const waterChangeVolumeL = Math.round(vol * 0.50);
    const conditionerMl = Number((waterChangeVolumeL * 0.10).toFixed(1));
    return {
      waterChangeVolumeL,
      conditionerMl,
      fastingDurationHours: 24
    };
  },

  /**
   * Generates a comprehensive clinical remediation prescription.
   * @param {Object} entry Metric test reading
   * @param {Object} targets Water targets
   * @param {number} tankVolume Net tank volume in Liters
   * @returns {Object} Actionable clinical prescription
   */
  generatePrescription(entry = {}, targets = {}, tankVolume = 100) {
    const triage = this.evaluateMetrics(entry, targets);
    const emergencyPlan = this.calculateEmergencyWaterChange(tankVolume);

    const steps = [];
    if (triage.overallStatus === 'ACTION NEEDED') {
      steps.push(`1. Siphon and discard ${emergencyPlan.waterChangeVolumeL}L of water (50% net volume).`);
      steps.push(`2. Refill with dechlorinated water treated with ${emergencyPlan.conditionerMl}ml Stress Heal.`);
      steps.push(`3. Halt all feeding for ${emergencyPlan.fastingDurationHours} hours to reduce organic waste.`);
      steps.push('4. Re-test ammonia and nitrite in 24 hours.');
    } else if (triage.overallStatus === 'WATCH') {
      steps.push(`1. Conduct a routine 35% water change (~${Math.round(tankVolume * 0.35)}L).`);
      steps.push('2. Siphon detritus from dead zones and inspect riparium root zone.');
      steps.push('3. Monitor parameters over the next 48 hours.');
    } else {
      steps.push('Parameters are within optimal biological equilibrium. Maintain regular feeding and weekly sponge rotation.');
    }

    return {
      status: triage.overallStatus,
      summary: triage.prescriptions.join(' ') || 'Ecosystem stable.',
      emergencyWaterChangeL: emergencyPlan.waterChangeVolumeL,
      conditionerDoseMl: emergencyPlan.conditionerMl,
      fastingHours: triage.overallStatus === 'ACTION NEEDED' ? 24 : 0,
      actionSteps: steps,
      alerts: triage.alerts
    };
  },

  /**
   * Analyzes historical water parameter time-series to detect rate-of-change anomalies.
   * Detects rapid nitrate accumulation, emerging bio-filter strain, and temperature swings.
   * @param {Array<Object>} logs Historical parameter logs (newest first)
   * @param {Object} config Optional configuration
   * @returns {{ trendStatus: string, insights: Array<string> }}
   */
  analyzeParameterTrends(logs, config = {}) {
    if (!logs || !Array.isArray(logs) || logs.length < 2) {
      return {
        trendStatus: "Insufficient Data",
        insights: ["Log at least 2 water test readings to enable pattern detection and nitrogen cycle stability tracking."]
      };
    }

    const latest = logs[0] || {};
    const previous = logs[1] || {};
    const insights = [];

    const t0 = new Date(latest.date || Date.now()).getTime();
    const t1 = new Date(previous.date || Date.now()).getTime();
    // Clamp daysBetween to >= 1 to prevent division by zero or negative days
    const daysBetween = Math.max(1, Math.round(Math.abs(t0 - t1) / (1000 * 60 * 60 * 24)));

    const latestNo3 = Number(latest.no3 ?? 0);
    const prevNo3 = Number(previous.no3 ?? 0);
    const nitrateDiff = latestNo3 - prevNo3;

    if (nitrateDiff > 10 && daysBetween <= 7) {
      insights.push(`Rapid Nitrate Accumulation: Nitrate rose by +${nitrateDiff} ppm in ${daysBetween} days. Heavy bioload detected.`);
    } else if (nitrateDiff <= 0 && latestNo3 <= 25) {
      insights.push(`Nitrate Export Stable: Nitrate is steady or dropping (${latestNo3} ppm).`);
    }

    const latestNh3 = Number(latest.nh3 ?? 0);
    const prevNh3 = Number(previous.nh3 ?? 0);
    if (latestNh3 > 0 && prevNh3 === 0) {
      insights.push(`Emerging Bio-Filter Strain: Ammonia spiked from 0.0 to ${latestNh3} ppm.`);
    }

    const latestTemp = Number(latest.temp ?? 25);
    const prevTemp = Number(previous.temp ?? 25);
    const tempDiff = Math.abs(latestTemp - prevTemp);
    if (tempDiff >= 1.5) {
      insights.push(`Temperature Fluctuation: A ${tempDiff.toFixed(1)}°C swing was recorded.`);
    }

    return {
      trendStatus: insights.length > 0 ? "Patterns Detected" : "Ecosystem Stable",
      insights: insights.length > 0 ? insights : ["Nitrogen cycle and water stability are performing within expected equilibrium tolerances."]
    };
  },

  /**
   * Compatibility alias for analyzeParameterTrends.
   */
  analyzeTrends(logs, targets = {}) {
    return this.analyzeParameterTrends(logs, targets);
  }
};

// CommonJS & ES Module Dual Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiagnosticsEngine;
  module.exports.DiagnosticsEngine = DiagnosticsEngine;
  module.exports.default = DiagnosticsEngine;
}
if (typeof window !== 'undefined') {
  window.DiagnosticsEngine = DiagnosticsEngine;
}

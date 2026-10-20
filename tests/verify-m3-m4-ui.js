/**
 * AquaPulse Milestone 3 & 4 Automated Verification Suite
 * 
 * Comprehensive, zero-external-dependency test harness verifying:
 * 1. ModalManager (accessible in-DOM dialogs, focus trapping, Escape dismiss)
 * 2. VitalSignsStrip (7 metrics, 3-tier triage badges, click-to-remediate)
 * 3. FlowCanvas (multi-layer toggle, flow modes, visibility pausing, resize)
 * 4. ParamLogger (logging form, history table, dynamic SVG trend curves, prescriptions, CSV)
 * 5. SpeciesOptimizer (sweet-spot math, bioload density, target derivation)
 * 6. SymptomChecker (disease cards, 50% safety lock, hospital switch, volumetric dosing)
 * 7. CareHub (feeding matrix, soak timer, alternating filter sponge, 14-day quarantine)
 * 8. SocialLogger (aggression incidents, tension scoring, multi-tank scoping)
 * 9. TelemetryHAL (SimulatedProvider, ManualLogProvider, IoTBridgeProvider, packet routing)
 * 10. SampleSensorPlugin (IPlugin contract, live telemetry meter, mount/unmount)
 * 11. AppShell (responsive layout, tab navigation, mobile drawer, tank switcher)
 * 
 * Execution:
 *   node tests/verify-m3-m4-ui.js
 */

const assert = require('assert');
const path = require('path');

// ======================================================================
// Lightweight Mock DOM Environment for Headless Node.js Verification
// ======================================================================

class MockClassList {
  constructor(el) {
    this.el = el;
    this._classes = new Set();
  }
  add(...names) {
    for (const n of names) if (n) this._classes.add(n);
    this.el.className = Array.from(this._classes).join(' ');
  }
  remove(...names) {
    for (const n of names) this._classes.delete(n);
    this.el.className = Array.from(this._classes).join(' ');
  }
  contains(name) {
    return this._classes.has(name);
  }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this._className = '';
    this.id = '';
    this.textContent = '';
    this._innerHTML = '';
    this.value = '';
    this.checked = false;
    this.type = 'text';
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.eventListeners = new Map();
    this.classList = new MockClassList(this);
    this.style = {};
  }

  get className() {
    return this._className;
  }
  set className(val) {
    this._className = String(val || '');
    this.classList._classes.clear();
    for (const c of this._className.split(/\s+/)) {
      if (c) this.classList._classes.add(c);
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(val) {
    this._innerHTML = String(val || '');
    // When innerHTML contains simple elements or text, update textContent
    this.textContent = this._innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  setAttribute(name, val) {
    this.attributes.set(name, String(val));
    if (name === 'id') this.id = String(val);
    if (name === 'class') this.className = String(val);
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    if (!child) return child;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      child.parentNode = null;
      this.children.splice(idx, 1);
    }
    return child;
  }

  addEventListener(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }
  removeEventListener(event, listener) {
    if (!this.eventListeners.has(event)) return;
    const list = this.eventListeners.get(event).filter(l => l !== listener);
    this.eventListeners.set(event, list);
  }
  dispatchEvent(event) {
    const list = this.eventListeners.get(event.type) || [];
    for (const l of list) {
      l.call(this, event);
    }
  }
  click() {
    this.dispatchEvent({ type: 'click', target: this, preventDefault: () => {} });
  }
  focus() {}

  getBoundingClientRect() {
    return { width: 800, height: 400, top: 0, left: 0, right: 800, bottom: 400 };
  }

  getContext(type) {
    if (type === '2d') {
      return {
        clearRect: () => {},
        fillRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        ellipse: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        closePath: () => {},
        fill: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        scale: () => {},
        rotate: () => {},
        translate: () => {},
        setTransform: () => {},
        measureText: (txt) => ({ width: (txt || '').length * 6 }),
        fillText: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        setLineDash: () => {},
        roundRect: () => {}
      };
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];

    const matches = (el) => {
      if (!selector) return false;
      if (selector.startsWith('#')) {
        return el.id === selector.substring(1);
      }
      if (selector.startsWith('.')) {
        return el.classList && el.classList.contains(selector.substring(1));
      }
      if (selector.startsWith('[') && selector.endsWith(']')) {
        const attrExpr = selector.substring(1, selector.length - 1);
        if (attrExpr.includes('=')) {
          const [k, v] = attrExpr.split('=');
          const cleanV = v.replace(/['"]/g, '');
          return el.getAttribute(k) === cleanV;
        }
        return el.hasAttribute(attrExpr);
      }
      return el.tagName.toLowerCase() === selector.toLowerCase();
    };

    const traverse = (node) => {
      for (const child of node.children) {
        if (matches(child)) results.push(child);
        traverse(child);
      }
    };

    traverse(this);
    return results;
  }
}

// Global Document Mock
const mockDocument = {
  activeElement: null,
  body: new MockElement('body'),
  createElement(tag) {
    return new MockElement(tag);
  },
  getElementById(id) {
    return this.body.querySelector(`#${id}`);
  },
  querySelector(sel) {
    return this.body.querySelector(sel);
  },
  querySelectorAll(sel) {
    return this.body.querySelectorAll(sel);
  }
};

global.document = mockDocument;
global.window = {
  devicePixelRatio: 2,
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id)
};
global.navigator = {
  clipboard: {
    writeText: () => Promise.resolve()
  }
};
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
global.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ======================================================================
// Load Milestone 1, 2, 3, 4 Modules
// ======================================================================

const { EventBus } = require('../src/core/event-bus.js');
const { AquaPulseStore } = require('../src/core/store.js');
const { ConfigManager } = require('../src/core/config-manager.js');
const { PluginRegistry } = require('../src/core/plugin-registry.js');
const FlowEngine = require('../src/engines/flow-engine.js');
const OptimizerEngine = require('../src/engines/optimizer-engine.js');
const MedicationEngine = require('../src/engines/medication-engine.js');
const DiagnosticsEngine = require('../src/engines/diagnostics-engine.js');
const CareEngine = require('../src/engines/care-engine.js');

const { ModalManager } = require('../src/ui/modal-manager.js');
const { VitalSignsStrip } = require('../src/ui/components/vital-signs-strip.js');
const { FlowCanvas } = require('../src/ui/components/flow-canvas.js');
const { ParamLogger } = require('../src/ui/components/param-logger.js');
const { SpeciesOptimizer } = require('../src/ui/components/species-optimizer.js');
const { SymptomChecker } = require('../src/ui/components/symptom-checker.js');
const { CareHub } = require('../src/ui/components/care-hub.js');
const { SocialLogger } = require('../src/ui/components/social-logger.js');
const { TelemetryHAL, SimulatedProvider, ManualLogProvider, IoTBridgeProvider } = require('../src/telemetry/telemetry-hal.js');
const { SampleSensorPlugin } = require('../src/plugins/sample-sensor-plugin.js');
const { AppShell } = require('../src/ui/app-shell.js');

// Test Harness Counters
let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failCount++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.name}: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 3).join('\n'));
    }
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    passCount++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failCount++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.name}: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 3).join('\n'));
    }
  }
}

console.log('\n======================================================');
console.log('  AquaPulse Milestone 3 & 4 Automated UI & Plugin Verification');
console.log('======================================================\n');

async function main() {

  // ======================================================================
  // Suite 1: ModalManager (Accessible In-DOM Dialogs)
  // ======================================================================
  console.log('--- Suite 1: ModalManager ---');

  runTest('1.01: ModalManager initializes and checks open state', () => {
    const mm = new ModalManager();
    assert.strictEqual(mm.isOpen(), false);
  });

  await runAsyncTest('1.02: alert() opens dialog and resolves on OK click', async () => {
    const mm = new ModalManager({ container: mockDocument.body });
    let resolved = false;
    const p = mm.alert('Notice', 'Test alert message').then(() => { resolved = true; });

    assert.strictEqual(mm.isOpen(), true);
    const okBtn = mockDocument.body.querySelector('.btn-modal-primary');
    assert.ok(okBtn, 'OK button should be rendered');
    assert.strictEqual(okBtn.textContent, 'OK');

    okBtn.click();
    await p;
    assert.strictEqual(resolved, true);
    assert.strictEqual(mm.isOpen(), false);
  });

  await runAsyncTest('1.03: confirm() returns true on confirm and false on cancel', async () => {
    const mm = new ModalManager({ container: mockDocument.body });

    // Confirm click
    const p1 = mm.confirm('Confirm', 'Proceed with water change?');
    const confirmBtn = mockDocument.body.querySelector('.btn-modal-primary');
    confirmBtn.click();
    const res1 = await p1;
    assert.strictEqual(res1, true);

    // Cancel click
    const p2 = mm.confirm('Confirm', 'Delete log record?');
    const cancelBtn = mockDocument.body.querySelector('.btn-modal-secondary');
    cancelBtn.click();
    const res2 = await p2;
    assert.strictEqual(res2, false);
  });

  await runAsyncTest('1.04: prompt() returns input string and resolves null on cancel', async () => {
    const mm = new ModalManager({ container: mockDocument.body });

    // Submit with text
    const p1 = mm.prompt('Species Name', 'Enter species:', 'Harlequin Rasbora');
    const submitBtn = mockDocument.body.querySelector('.btn-modal-primary');
    submitBtn.click();
    const val1 = await p1;
    assert.strictEqual(val1, 'Harlequin Rasbora');

    // Cancel
    const p2 = mm.prompt('Species Name', 'Enter species:');
    const cancelBtn = mockDocument.body.querySelector('.btn-modal-secondary');
    cancelBtn.click();
    const val2 = await p2;
    assert.strictEqual(val2, null);
  });

  await runAsyncTest('1.05: custom() renders custom element and closes cleanly', async () => {
    const mm = new ModalManager({ container: mockDocument.body });
    const customDiv = mockDocument.createElement('div');
    customDiv.className = 'my-custom-content';
    customDiv.textContent = 'Custom Diagnostic Analysis';

    mm.custom('Custom Tool', customDiv);
    assert.strictEqual(mm.isOpen(), true);
    assert.ok(mockDocument.body.querySelector('.my-custom-content'));

    mm.close();
    assert.strictEqual(mm.isOpen(), false);
  });

  // ======================================================================
  // Suite 2: VitalSignsStrip (7 Metrics & 3-Tier Triage)
  // ======================================================================
  console.log('\n--- Suite 2: VitalSignsStrip ---');

  runTest('2.01: Mounts 7 vital signs metrics and renders status strip', () => {
    const eventBus = new EventBus();
    const store = new AquaPulseStore({
      targets: {
        temp: { min: 24.5, max: 26.5 },
        ph: { min: 6.6, max: 7.4 }
      },
      telemetry: {
        current: { nh3: 0.0, no2: 0.0, no3: 15.0, ph: 7.1, temp: 25.5, gh: 7.0, kh: 4.0 },
        status: 'OPTIMAL'
      }
    }, eventBus);

    const container = mockDocument.createElement('div');
    const strip = new VitalSignsStrip({ store, eventBus });
    strip.mount(container);

    assert.ok(container.innerHTML.includes('NH₃'));
    assert.ok(container.innerHTML.includes('NO₂⁻'));
    assert.ok(container.innerHTML.includes('NO₃⁻'));
    assert.ok(container.innerHTML.includes('pH'));
    assert.ok(container.innerHTML.includes('Temp'));
    assert.ok(container.innerHTML.includes('GH'));
    assert.ok(container.innerHTML.includes('KH'));
    assert.ok(container.innerHTML.includes('OPTIMAL'));
    strip.unmount();
  });

  runTest('2.02: 3-tier triage transitions to ACTION NEEDED on ammonia spike', () => {
    const store = new AquaPulseStore({
      targets: { ammoniaMax: 0.02 },
      telemetry: {
        current: { nh3: 0.0, no2: 0.0, no3: 15.0, ph: 7.1, temp: 25.5, gh: 7.0, kh: 4.0 }
      }
    });

    const container = mockDocument.createElement('div');
    const strip = new VitalSignsStrip({ store });
    strip.mount(container);

    // Initial safe state
    const triage1 = strip.evaluateTriage();
    assert.strictEqual(triage1.overallStatus, 'OPTIMAL');

    // Inject ammonia spike: 0.50 ppm
    strip.update({ nh3: 0.50 });
    const triage2 = strip.evaluateTriage();
    assert.strictEqual(triage2.overallStatus, 'ACTION NEEDED');
    assert.strictEqual(triage2.metrics.nh3.status, 'critical');
    assert.ok(container.innerHTML.includes('ACTION'));
    strip.unmount();
  });

  runTest('2.03: Click-to-remediate action triggers prescription modal', () => {
    const mm = new ModalManager({ container: mockDocument.body });
    let openedDialog = false;
    mm.custom = (title, body) => {
      openedDialog = true;
      assert.ok(title.includes('Alert'));
      return Promise.resolve();
    };

    const container = mockDocument.createElement('div');
    const strip = new VitalSignsStrip({ modalManager: mm });
    strip.mount(container);
    strip.update({ nh3: 0.50 });

    strip._handleRemediateClick('nh3');
    assert.strictEqual(openedDialog, true);
    strip.unmount();
  });

  // ======================================================================
  // Suite 3: FlowCanvas (Physics, Modes & Visibility Loop)
  // ======================================================================
  console.log('\n--- Suite 3: FlowCanvas ---');

  runTest('3.01: Mounts canvas and initializes 85 particles and caustics', () => {
    const container = mockDocument.createElement('div');
    const flow = new FlowCanvas();
    flow.mount(container);

    assert.strictEqual(flow.particles.length, 85);
    assert.strictEqual(flow.caustics.length, 8);
    assert.strictEqual(flow.mode, 'current');
    flow.unmount();
  });

  runTest('3.02: Switches flow mode between Straight Jet and Baffled Convection', () => {
    const eventBus = new EventBus();
    let modeEvent = null;
    eventBus.on('flow:mode_changed', (e) => { modeEvent = e.mode; });

    const container = mockDocument.createElement('div');
    const flow = new FlowCanvas({ eventBus });
    flow.mount(container);

    flow.setFlowMode('baffled');
    assert.strictEqual(flow.mode, 'baffled');
    assert.strictEqual(modeEvent, 'baffled');

    flow.setFlowMode('current');
    assert.strictEqual(flow.mode, 'current');
    assert.strictEqual(modeEvent, 'current');
    flow.unmount();
  });

  runTest('3.03: Toggles visual layers (heatmap, streamlines, fish, bubbles, caustics)', () => {
    const flow = new FlowCanvas();
    assert.strictEqual(flow.layers.heatmap, false);
    flow.toggleLayer('heatmap', true);
    assert.strictEqual(flow.layers.heatmap, true);

    flow.toggleLayer('fish', false);
    assert.strictEqual(flow.layers.fish, false);
  });

  runTest('3.04: Visibility-aware animation loop pauses and resumes', () => {
    const flow = new FlowCanvas();
    flow.mount(mockDocument.createElement('div'));

    assert.strictEqual(flow._isPaused, false);
    flow.pause();
    assert.strictEqual(flow._isPaused, true);
    flow.resume();
    assert.strictEqual(flow._isPaused, false);
    flow.unmount();
  });

  // ======================================================================
  // Suite 4: ParamLogger (Logging Form, SVG Trend Curves, Prescriptions)
  // ======================================================================
  console.log('\n--- Suite 4: ParamLogger ---');

  runTest('4.01: Mounts with default history records', () => {
    const container = mockDocument.createElement('div');
    const logger = new ParamLogger();
    logger.mount(container);

    assert.ok(logger.logs.length >= 4);
    assert.ok(container.innerHTML.includes('Chronological Test Archive'));
    logger.unmount();
  });

  runTest('4.02: addLog() prepends new record and synchronizes to store', () => {
    const store = new AquaPulseStore({ telemetry: { history: [] } });
    const logger = new ParamLogger({ store });
    logger.mount(mockDocument.createElement('div'));

    logger.addLog({
      date: '2026-10-21',
      nh3: 0.05,
      no2: 0.01,
      no3: 20.0,
      ph: 7.2,
      temp: 25.8,
      wc: 'None',
      notes: 'Test entry'
    });

    assert.strictEqual(logger.logs[0].date, '2026-10-21');
    assert.strictEqual(logger.logs[0].nh3, 0.05);
    assert.strictEqual(store.getState('telemetry.history.0.notes'), 'Test entry');
    logger.unmount();
  });

  runTest('4.03: Generates dynamic SVG sparklines and full trend chart', () => {
    const logger = new ParamLogger();
    logger.mount(mockDocument.createElement('div'));

    const sparkline = logger.generateSparkline('no3', 200, 50);
    assert.ok(sparkline.includes('<svg'));
    assert.ok(sparkline.includes('stroke="#06b6d4"'));

    const trendChart = logger.generateTrendChart('no3', 600, 180);
    assert.ok(trendChart.includes('<svg'));
    assert.ok(trendChart.includes('Safe Max'));
    logger.unmount();
  });

  runTest('4.04: Prescription banner flags toxic ammonia and generates 50% water change', () => {
    const logger = new ParamLogger();
    logger.mount(mockDocument.createElement('div'));

    // Inject ammonia spike in latest log
    logger.logs.unshift({
      date: '2026-10-22',
      nh3: 0.50,
      no2: 0.20,
      no3: 35.0,
      ph: 6.9,
      temp: 25.5
    });
    logger.render();

    assert.ok(logger.container.innerHTML.includes('CLINICAL REMEDIATION ACTION REQUIRED'));
    assert.ok(logger.container.innerHTML.includes('Emergency 50% Water Change'));
    logger.unmount();
  });

  runTest('4.05: exportCSV() outputs formatted CSV string with headers', () => {
    const logger = new ParamLogger();
    logger.mount(mockDocument.createElement('div'));
    const csv = logger.exportCSV();

    assert.ok(csv.startsWith('Date,NH3 (ppm),NO2 (ppm),NO3 (ppm)'));
    assert.ok(csv.includes('2026-10-14'));
    logger.unmount();
  });

  // ======================================================================
  // Suite 5: SpeciesOptimizer (Sweet-Spot Math & Density Tally)
  // ======================================================================
  console.log('\n--- Suite 5: SpeciesOptimizer ---');

  runTest('5.01: Derives mathematical sweet-spot bounds for active roster', () => {
    const store = new AquaPulseStore({
      tank: { volumeNetL: 220, filterFlowLph: 1750 },
      species: [
        { id: 'denison-barb', count: 6 },
        { id: 'silver-tip-tetra', count: 12 },
        { id: 'albino-corydoras', count: 6 }
      ]
    });

    const opt = new SpeciesOptimizer({ store });
    opt.mount(mockDocument.createElement('div'));

    assert.ok(opt.container.innerHTML.includes('Optimal Temperature'));
    assert.ok(opt.container.innerHTML.includes('Optimal pH Acidity'));
    assert.ok(opt.container.innerHTML.includes('Ecological Density & Bioload'));
    opt.unmount();
  });

  runTest('5.02: Adds and removes species with headcount adjustments', () => {
    const opt = new SpeciesOptimizer();
    opt.mount(mockDocument.createElement('div'));

    const initialLen = opt.speciesList.length;
    opt.addSpecies('neon-tetra', 10);
    assert.strictEqual(opt.speciesList.length, initialLen + 1);

    opt.removeSpecies('neon-tetra', true);
    assert.strictEqual(opt.speciesList.length, initialLen);
    opt.unmount();
  });

  runTest('5.03: applySweetSpotTargets() writes optimal bounds to store targets', () => {
    const eventBus = new EventBus();
    const store = new AquaPulseStore({
      tank: { volumeNetL: 220, filterFlowLph: 1750 },
      species: [
        { id: 'denison-barb', count: 6 },
        { id: 'silver-tip-tetra', count: 12 }
      ],
      targets: {}
    }, eventBus);

    let derivedEvent = null;
    eventBus.on('targets:derived', (t) => { derivedEvent = t; });

    const opt = new SpeciesOptimizer({ store, eventBus });
    opt.mount(mockDocument.createElement('div'));

    opt.applySweetSpotTargets();
    const targets = store.getState('targets');
    assert.ok(targets.temp);
    assert.strictEqual(targets.temp.target, 24.8); // midpoint [22.0, 26.0]
    assert.ok(derivedEvent);
    opt.unmount();
  });

  // ======================================================================
  // Suite 6: SymptomChecker (Disease Profiles & Scaleless Safety Lock)
  // ======================================================================
  console.log('\n--- Suite 6: SymptomChecker ---');

  runTest('6.01: Mounts 5 observable clinical presentations', () => {
    const checker = new SymptomChecker();
    checker.mount(mockDocument.createElement('div'));

    assert.ok(checker.container.innerHTML.includes('White Specks'));
    assert.ok(checker.container.innerHTML.includes('Frayed / Tattered Fins'));
    assert.ok(checker.container.innerHTML.includes('Abdominal Bloat'));
    assert.ok(checker.container.innerHTML.includes('Torn Fin Bits'));
    assert.ok(checker.container.innerHTML.includes('Surface Gasping'));
    checker.unmount();
  });

  runTest('6.02: Automatically engages 50% safety lock when Corydoras are present', () => {
    const store = new AquaPulseStore({
      tank: { volumeNetL: 200 },
      species: [{ id: 'albino-corydoras', count: 6 }] // scaleless: true
    });

    const checker = new SymptomChecker({ store });
    checker.mount(mockDocument.createElement('div'));
    checker.selectSymptom('symp-ich'); // General Cure uses lock

    const diag = checker.calculateDosage();
    assert.strictEqual(diag.calc.isLocked, true);
    assert.strictEqual(diag.calc.lockFactor, 0.5);
    // (200 / 100) * 10 * 0.5 = 10.0 ml
    assert.strictEqual(diag.calc.dose, 10.0);
    assert.ok(checker.container.innerHTML.includes('50% Safety Lock Active'));
    checker.unmount();
  });

  runTest('6.03: Hospital tank mode switches calculation to isolated 15L container', () => {
    const checker = new SymptomChecker();
    checker.mount(mockDocument.createElement('div'));

    checker.setHospitalMode(true);
    assert.strictEqual(checker.isHospitalMode, true);
    const diag = checker.calculateDosage();
    assert.strictEqual(diag.treatedVol, 15);
    checker.unmount();
  });

  // ======================================================================
  // Suite 7: CareHub (Feeding Matrix, Soak Timer, Filter Rinse, Quarantine)
  // ======================================================================
  console.log('\n--- Suite 7: CareHub ---');

  runTest('7.01: Mounts feeding matrix with day-of-week regimens and fasting Sunday', () => {
    const hub = new CareHub();
    hub.mount(mockDocument.createElement('div'));

    assert.ok(hub.container.innerHTML.includes('FASTING DAY (Adults)'));
    assert.ok(hub.container.innerHTML.includes('Protein Treat Day'));
    assert.ok(hub.container.innerHTML.includes('Alternating Filter Sponge Rinse'));
    assert.ok(hub.container.innerHTML.includes('14-Day Quarantine Isolation Hub'));
    hub.unmount();
  });

  runTest('7.02: Alternating filter sponge toggles between Cup A and Cup B', () => {
    const store = new AquaPulseStore({ care: { spongeIndex: 0 } });
    const hub = new CareHub({ store });
    hub.mount(mockDocument.createElement('div'));

    assert.strictEqual(hub.spongeIndex, 0);
    hub.toggleSpongeCup();
    assert.strictEqual(hub.spongeIndex, 1);
    assert.strictEqual(store.getState('care.spongeIndex'), 1);

    hub.toggleSpongeCup();
    assert.strictEqual(hub.spongeIndex, 0);
    hub.unmount();
  });

  runTest('7.03: 14-Day quarantine progress calculation accurately tracks countdown', () => {
    const hub = new CareHub();
    hub.quarantineData = {
      active: true,
      fishName: 'Koi Angel Quarantine',
      startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      durationDays: 14
    };
    hub.mount(mockDocument.createElement('div'));

    assert.ok(hub.container.innerHTML.includes('Day 7 of 14 Days'));
    assert.ok(hub.container.innerHTML.includes('50% Elapsed'));
    assert.ok(hub.container.innerHTML.includes('7 Days Remaining'));
    hub.unmount();
  });

  runTest('7.04: Pre-soak timer starts and stops cleanly', () => {
    const hub = new CareHub();
    hub.mount(mockDocument.createElement('div'));

    hub.startSoakTimer('Freeze-Dried Tubifex', 180);
    assert.strictEqual(hub.soakSecondsRemaining, 180);
    assert.ok(hub.soakTimer !== null);

    hub.stopSoakTimer();
    assert.strictEqual(hub.soakSecondsRemaining, 0);
    assert.strictEqual(hub.soakTimer, null);
    hub.unmount();
  });

  // ======================================================================
  // Suite 8: SocialLogger (Aggression Ledger & Tension Scoring)
  // ======================================================================
  console.log('\n--- Suite 8: SocialLogger ---');

  runTest('8.01: Records new aggression incident and calculates tension score', () => {
    const store = new AquaPulseStore({ care: { socialIncidents: [] } });
    const logger = new SocialLogger({ store });
    logger.mount(mockDocument.createElement('div'));

    logger.recordIncident({
      aggressor: 'Denison Barb (Lead)',
      victim: 'Pygmy Corydoras',
      severity: 3,
      trigger: 'Bottom feeding zone intrusion',
      actionTaken: 'Separated feed drop pins'
    });

    assert.strictEqual(logger.incidents.length, 1);
    assert.strictEqual(logger.incidents[0].severity, 3);
    assert.ok(logger.container.innerHTML.includes('Bottom feeding zone intrusion'));
    assert.ok(logger.container.innerHTML.includes('L3: Battle'));
    logger.unmount();
  });

  runTest('8.02: Deletes incident and updates ledger', () => {
    const logger = new SocialLogger();
    logger.mount(mockDocument.createElement('div'));

    const initialLen = logger.incidents.length;
    const targetId = logger.incidents[0].id;
    logger.deleteIncident(targetId);

    assert.strictEqual(logger.incidents.length, initialLen - 1);
    assert.ok(!logger.incidents.some(i => i.id === targetId));
    logger.unmount();
  });

  // ======================================================================
  // Suite 9: TelemetryHAL & Providers
  // ======================================================================
  console.log('\n--- Suite 9: TelemetryHAL ---');

  runTest('9.01: SimulatedProvider generates standard packets and spike injection', () => {
    const sim = new SimulatedProvider({ tankId: 'tank-test' });
    const pkt1 = sim.generateTick();

    assert.strictEqual(pkt1.tankId, 'tank-test');
    assert.ok(pkt1.metrics.temp >= 24 && pkt1.metrics.temp <= 27);
    assert.strictEqual(pkt1.metrics.nh3, 0.0);
    assert.strictEqual(pkt1.status, 'OPTIMAL');

    // Inject temporary spike
    sim.simulateSpike('nh3', 0.65);
    const pkt2 = sim.generateTick();
    assert.strictEqual(pkt2.metrics.nh3, 0.65);
    assert.strictEqual(pkt2.status, 'CRITICAL');

    sim.clearSpike('nh3');
    const pkt3 = sim.generateTick();
    assert.strictEqual(pkt3.metrics.nh3, 0.0);
  });

  runTest('9.02: ManualLogProvider normalizes test kit entries', () => {
    const manual = new ManualLogProvider({ tankId: 'tank-manual' });
    const pkt = manual.logReading({
      temp: '25.4',
      ph: '7.15',
      nh3: '0.00',
      no2: '0.00',
      no3: '18.0',
      notes: 'API Liquid Test'
    });

    assert.strictEqual(pkt.tankId, 'tank-manual');
    assert.strictEqual(pkt.metrics.temp, 25.4);
    assert.strictEqual(pkt.metrics.ph, 7.15);
    assert.strictEqual(pkt.notes, 'API Liquid Test');
  });

  runTest('9.03: IoTBridgeProvider parses raw JSON from external systems', () => {
    const iot = new IoTBridgeProvider({ tankId: 'tank-iot' });
    const raw = JSON.stringify({
      parameters: {
        temperature: 25.9,
        ph: 6.95,
        ammonia: 0.0,
        nitrate: 12.0,
        orp: 355
      }
    });

    const pkt = iot.ingestPayload(raw);
    assert.strictEqual(pkt.metrics.temp, 25.9);
    assert.strictEqual(pkt.metrics.ph, 6.95);
    assert.strictEqual(pkt.metrics.orpMv, 355);
  });

  runTest('9.04: TelemetryHAL coordinates providers and routes to Store and EventBus', async () => {
    const eventBus = new EventBus();
    const store = new AquaPulseStore({ telemetry: { current: null, status: 'OPTIMAL' } }, eventBus);

    let packetReceived = null;
    eventBus.on('telemetry:packet', (p) => { packetReceived = p; });

    const hal = new TelemetryHAL({ store, eventBus, tankId: 'tank-hal' });
    await hal.setActiveProvider('simulated');

    assert.ok(packetReceived);
    assert.strictEqual(store.getState('telemetry.status'), 'OPTIMAL');
    assert.strictEqual(hal.getActiveProvider().name, 'SimulatedTelemetryProvider');
  });

  // ======================================================================
  // Suite 10: SampleSensorPlugin (IPlugin Extension)
  // ======================================================================
  console.log('\n--- Suite 10: SampleSensorPlugin ---');

  runTest('10.01: Validates IPlugin contract: id, name, category, mount, unmount, update', () => {
    assert.strictEqual(SampleSensorPlugin.id, 'orp-redox-sensor');
    assert.strictEqual(SampleSensorPlugin.category, 'sensor');
    assert.strictEqual(typeof SampleSensorPlugin.mount, 'function');
    assert.strictEqual(typeof SampleSensorPlugin.unmount, 'function');
    assert.strictEqual(typeof SampleSensorPlugin.update, 'function');
  });

  runTest('10.02: Mounts into DOM container and updates on live telemetry changes', () => {
    const container = mockDocument.createElement('div');
    const meta = SampleSensorPlugin.mount(container, { tankId: 'tank-demo' });

    assert.strictEqual(meta.connected, true);
    assert.strictEqual(meta.deviceId, 'ORP-PROBE-01');
    assert.ok(container.innerHTML.includes('Redox / ORP Potential'));
    assert.ok(container.innerHTML.includes('340')); // default

    // Telemetry update to 410 mV
    SampleSensorPlugin.update({
      telemetry: {
        current: { orpMv: 410 }
      }
    });

    assert.ok(container.innerHTML.includes('410'));
    SampleSensorPlugin.unmount();
    assert.strictEqual(container.innerHTML, '');
  });

  // ======================================================================
  // Suite 11: AppShell (Layout, Navigation & Tank Switcher)
  // ======================================================================
  console.log('\n--- Suite 11: AppShell ---');

  runTest('11.01: Mounts shell, header, vital signs strip, and default tank view', () => {
    const eventBus = new EventBus();
    const store = new AquaPulseStore({
      tank: { id: 'tank-255l', name: '255L Command Ecosystem', volumeNetL: 220 },
      targets: { temp: { min: 24.5, max: 26.5 }, ph: { min: 6.6, max: 7.4 } },
      telemetry: { current: { nh3: 0.0, no2: 0.0, no3: 15.0, ph: 7.1, temp: 25.5, gh: 7.0, kh: 4.0 }, status: 'OPTIMAL' },
      species: [{ id: 'denison-barb', count: 6 }]
    }, eventBus);

    const container = mockDocument.createElement('div');
    const shell = new AppShell({ store, eventBus });
    shell.mount(container);

    assert.ok(container.innerHTML.includes('AquaPulse'));
    assert.ok(container.innerHTML.includes('Command Architecture'));
    assert.ok(container.innerHTML.includes('Live Vital Signs'));
    assert.strictEqual(shell.activeTab, 'tank');
    assert.ok(shell.flowCanvas !== null);
    shell.unmount();
  });

  runTest('11.02: Tab switching mounts respective components cleanly without errors', () => {
    const store = new AquaPulseStore({
      tank: { id: 'tank-255l', volumeNetL: 220 },
      species: [{ id: 'denison-barb', count: 6 }],
      telemetry: { current: { nh3: 0.0, no2: 0.0, no3: 15.0, ph: 7.1, temp: 25.5, gh: 7, kh: 4 }, status: 'OPTIMAL' }
    });

    const shell = new AppShell({ store });
    shell.mount(mockDocument.createElement('div'));

    shell.switchTab('optimizer');
    assert.strictEqual(shell.activeTab, 'optimizer');
    assert.ok(shell.speciesOptimizer !== null);

    shell.switchTab('symptoms');
    assert.strictEqual(shell.activeTab, 'symptoms');
    assert.ok(shell.symptomChecker !== null);

    shell.switchTab('care');
    assert.strictEqual(shell.activeTab, 'care');
    assert.ok(shell.careHub !== null);

    shell.switchTab('params');
    assert.strictEqual(shell.activeTab, 'params');
    assert.ok(shell.paramLogger !== null);

    shell.switchTab('social');
    assert.strictEqual(shell.activeTab, 'social');
    assert.ok(shell.socialLogger !== null);

    shell.switchTab('plugins');
    assert.strictEqual(shell.activeTab, 'plugins');

    shell.unmount();
  });

  runTest('11.03: switchTank() changes active tank ID across HAL and components', () => {
    const eventBus = new EventBus();
    const store = new AquaPulseStore({ tank: { id: 'tank-255l' } }, eventBus);
    let switchedEvent = null;
    eventBus.on('tank:switched', (e) => { switchedEvent = e.tankId; });

    const shell = new AppShell({ store, eventBus });
    shell.mount(mockDocument.createElement('div'));

    shell.switchTank('tank-120l');
    assert.strictEqual(shell.activeTankId, 'tank-120l');
    assert.strictEqual(switchedEvent, 'tank-120l');
    assert.strictEqual(shell.telemetryHal.tankId, 'tank-120l');
    shell.unmount();
  });

  console.log('\n======================================================');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

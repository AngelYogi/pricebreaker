/**
 * Breaker — EV Running Cost Calculator
 * Frontend JavaScript
 * Vehicle: Dongfeng Nami Vigo (Nepal)
 */

const API_BASE = "http://localhost:5001/api";

// ─────────────────────────────────────────
// State
// ─────────────────────────────────────────
const state = {
  variant:     "E2",
  driveMode:   "city",
  distanceKm:  50,
  rateType:    "rate_10",
  customRate:  12,
  chargeFrom:  20,
  chargeTo:    80,
  specs:       null,
};

// ─────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  variantCards:      document.querySelectorAll(".variant-card"),
  driveBtns:         document.querySelectorAll(".drive-btn"),
  rateCards:         document.querySelectorAll(".rate-card"),
  distanceInput:     $("distanceInput"),
  distanceSlider:    $("distanceSlider"),
  customRateBox:     $("customRateBox"),
  customRateSlider:  $("customRateSlider"),
  customRateValue:   $("customRateValue"),
  chargeFrom:        $("chargeFrom"),
  chargeTo:          $("chargeTo"),
  batteryBarFill:    $("batteryBarFill"),
  batteryBarLabel:   $("batteryBarLabel"),
  calculateBtn:      $("calculateBtn"),
  errorMsg:          $("errorMsg"),
  emptyState:        $("emptyState"),
  loadingState:      $("loadingState"),
  resultsContent:    $("resultsContent"),
  resultVehicle:     $("resultVehicle"),
  resultMeta:        $("resultMeta"),
  tripCost:          $("tripCost"),
  costPerKm:         $("costPerKm"),
  chargeCost:        $("chargeCost"),
  chargeRange:       $("chargeRange"),
  monthlyCost:       $("monthlyCost"),
  energyUsed:        $("energyUsed"),
  estRange:          $("estRange"),
  fullChargeCost:    $("fullChargeCost"),
  comparisonBody:    $("comparisonBody"),
  insightCards:      $("insightCards"),
  specsGrid:         $("specsGrid"),
};

// ─────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────
function formatNPR(val) {
  if (val >= 100000) return `Rs ${(val / 100000).toFixed(2)} L`;
  if (val >= 1000)   return `Rs ${val.toLocaleString("en-NP", { maximumFractionDigits: 0 })}`;
  return `Rs ${val.toFixed(2)}`;
}

function formatKWh(val) {
  return `${val.toFixed(2)} kWh`;
}

function updateBatteryBar() {
  const from = parseInt(els.chargeFrom.value) || 0;
  const to   = parseInt(els.chargeTo.value)   || 100;
  els.batteryBarFill.style.left  = `${from}%`;
  els.batteryBarFill.style.width = `${Math.max(0, to - from)}%`;
  els.batteryBarLabel.textContent = `${from}% → ${to}%`;
}

function showError(msg) {
  els.errorMsg.textContent = msg;
  els.errorMsg.style.display = "block";
}

function hideError() {
  els.errorMsg.style.display = "none";
}

function setResultsView(view) {
  els.emptyState.style.display    = view === "empty"   ? "flex"  : "none";
  els.loadingState.style.display  = view === "loading" ? "flex"  : "none";
  els.resultsContent.style.display = view === "results" ? "block" : "none";
}

// ─────────────────────────────────────────
// Event Wiring
// ─────────────────────────────────────────

// Variant selection
els.variantCards.forEach(card => {
  card.addEventListener("click", () => {
    els.variantCards.forEach(c => c.classList.remove("active"));
    card.classList.add("active");
    state.variant = card.dataset.variant;
    updateDriveModeLabels();
  });
});

// Drive mode selection
els.driveBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    els.driveBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.driveMode = btn.dataset.mode;
  });
});

// Distance input ↔ slider sync
els.distanceInput.addEventListener("input", () => {
  const val = parseFloat(els.distanceInput.value) || 1;
  els.distanceSlider.value = Math.min(val, 500);
  state.distanceKm = val;
});
els.distanceSlider.addEventListener("input", () => {
  els.distanceInput.value = els.distanceSlider.value;
  state.distanceKm = parseFloat(els.distanceSlider.value);
});

// Rate selection
els.rateCards.forEach(card => {
  const radio = card.querySelector("input[type=radio]");
  radio.addEventListener("change", () => {
    state.rateType = radio.value;
    els.customRateBox.style.display = state.rateType === "custom" ? "block" : "none";
  });
});

// Custom rate slider
els.customRateSlider.addEventListener("input", () => {
  state.customRate = parseFloat(els.customRateSlider.value);
  els.customRateValue.textContent = state.customRate;
});

// Charge % inputs
els.chargeFrom.addEventListener("input", () => {
  state.chargeFrom = parseInt(els.chargeFrom.value) || 0;
  updateBatteryBar();
});
els.chargeTo.addEventListener("input", () => {
  state.chargeTo = parseInt(els.chargeTo.value) || 100;
  updateBatteryBar();
});

// Calculate button
els.calculateBtn.addEventListener("click", runCalculation);

// ─────────────────────────────────────────
// Drive Mode Efficiency Labels Update
// ─────────────────────────────────────────
const efficiencyMap = {
  E2: {
    city:    "~11.5 kWh/100km",
    mixed:   "~14.0 kWh/100km",
    highway: "~17.0 kWh/100km",
  },
  "E2+": {
    city:    "~12.0 kWh/100km",
    mixed:   "~15.0 kWh/100km",
    highway: "~17.5 kWh/100km",
  },
};

function updateDriveModeLabels() {
  els.driveBtns.forEach(btn => {
    const eff = efficiencyMap[state.variant]?.[btn.dataset.mode];
    const effEl = btn.querySelector(".drive-btn__eff");
    if (eff && effEl) effEl.textContent = eff;
  });
}

// ─────────────────────────────────────────
// API: Load Specs
// ─────────────────────────────────────────
async function loadSpecs() {
  try {
    const res  = await fetch(`${API_BASE}/specs`);
    const data = await res.json();
    if (data.success) {
      state.specs = data.vehicles;
      renderSpecsGrid(data.vehicles);
    }
  } catch (e) {
    console.warn("Could not load specs from API. Using static data.", e);
    renderStaticSpecs();
  }
}

function renderSpecsGrid(vehicles) {
  const variantClasses = { E2: "e2", "E2+": "e2p" };
  els.specsGrid.innerHTML = Object.entries(vehicles).map(([key, v]) => `
    <div class="spec-card spec-card--${variantClasses[key] || "e2"}">
      <div class="spec-card__variant">${key}</div>
      <div class="spec-card__name">${v.name}</div>
      <div class="spec-row"><span class="spec-row__key">Battery</span><span class="spec-row__val">${v.battery_kwh} kWh (LFP)</span></div>
      <div class="spec-row"><span class="spec-row__key">Motor Power</span><span class="spec-row__val">${v.motor_kw} kW PMSM</span></div>
      <div class="spec-row"><span class="spec-row__key">CLTC Range</span><span class="spec-row__val">${v.range_cltc_km} km</span></div>
      <div class="spec-row"><span class="spec-row__key">WLTP Range</span><span class="spec-row__val">~${v.range_wltp_km} km</span></div>
      <div class="spec-row"><span class="spec-row__key">City Efficiency</span><span class="spec-row__val">${v.efficiency_city_kwh_per_100km} kWh/100km</span></div>
      <div class="spec-row"><span class="spec-row__key">Mixed Efficiency</span><span class="spec-row__val">${v.efficiency_mixed_kwh_per_100km} kWh/100km</span></div>
      <div class="spec-row"><span class="spec-row__key">Highway Efficiency</span><span class="spec-row__val">${v.efficiency_highway_kwh_per_100km} kWh/100km</span></div>
      <div class="spec-row"><span class="spec-row__key">AC Charge Time</span><span class="spec-row__val">~${v.charging_time_ac_hours} hrs</span></div>
      <div class="spec-row"><span class="spec-row__key">DC Fast Charge</span><span class="spec-row__val">~${v.charging_time_dc_minutes} min</span></div>
      <div class="spec-row"><span class="spec-row__key">Price (Nepal)</span><span class="spec-row__val">NPR ${(v.price_npr / 100000).toFixed(2)} L</span></div>
    </div>
  `).join("");
}

function renderStaticSpecs() {
  els.specsGrid.innerHTML = `
    <div class="spec-card spec-card--e2">
      <div class="spec-card__variant">E2</div>
      <div class="spec-card__name">Nami Vigo E2</div>
      <div class="spec-row"><span class="spec-row__key">Battery</span><span class="spec-row__val">44.94 kWh (LFP)</span></div>
      <div class="spec-row"><span class="spec-row__key">Motor Power</span><span class="spec-row__val">99 kW PMSM</span></div>
      <div class="spec-row"><span class="spec-row__key">CLTC Range</span><span class="spec-row__val">401 km</span></div>
      <div class="spec-row"><span class="spec-row__key">Price (Nepal)</span><span class="spec-row__val">NPR 40.99 L</span></div>
    </div>
    <div class="spec-card spec-card--e2p">
      <div class="spec-card__variant">E2+</div>
      <div class="spec-card__name">Nami Vigo E2+</div>
      <div class="spec-row"><span class="spec-row__key">Battery</span><span class="spec-row__val">51.87 kWh (LFP)</span></div>
      <div class="spec-row"><span class="spec-row__key">Motor Power</span><span class="spec-row__val">99 kW PMSM</span></div>
      <div class="spec-row"><span class="spec-row__key">CLTC Range</span><span class="spec-row__val">471 km</span></div>
      <div class="spec-row"><span class="spec-row__key">Price (Nepal)</span><span class="spec-row__val">NPR 43.99 L</span></div>
    </div>
  `;
}

// ─────────────────────────────────────────
// API: Calculate
// ─────────────────────────────────────────
async function runCalculation() {
  hideError();

  // Validate
  const dist = parseFloat(els.distanceInput.value);
  if (!dist || dist <= 0) { showError("Please enter a valid distance greater than 0 km."); return; }

  const from = parseInt(els.chargeFrom.value);
  const to   = parseInt(els.chargeTo.value);
  if (isNaN(from) || isNaN(to) || from >= to) {
    showError("'Charge To' must be greater than 'Charge From'.");
    return;
  }

  setResultsView("loading");

  const body = {
    variant:      state.variant,
    drive_mode:   state.driveMode,
    distance_km:  dist,
    rate_type:    state.rateType,
    custom_rate:  state.customRate,
    charge_from:  from,
    charge_to:    to,
  };

  try {
    const res  = await fetch(`${API_BASE}/calculate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await res.json();

    if (!data.success) {
      setResultsView("empty");
      showError(data.error || "Calculation failed.");
      return;
    }

    renderResults(data);
    setResultsView("results");

  } catch (err) {
    setResultsView("empty");
    showError("Cannot reach backend. Make sure the Python server is running on port 5001.");
  }
}

// ─────────────────────────────────────────
// Render Results
// ─────────────────────────────────────────
function renderResults(data) {
  const r = data.results;

  // Header
  const rateLabel = data.rate_per_kwh === 10 ? "Rs 10/kWh"
                  : data.rate_per_kwh === 15 ? "Rs 15/kWh"
                  : `Rs ${data.rate_per_kwh}/kWh (Custom)`;

  els.resultVehicle.textContent = data.vehicle_name;
  els.resultMeta.textContent =
    `${capitalize(data.drive_mode)} · ${data.distance_km} km · ${rateLabel}`;

  // Primary cards
  els.tripCost.textContent    = formatNPR(r.cost_for_distance_npr);
  els.costPerKm.textContent   = `Rs ${r.cost_per_km_npr.toFixed(2)} / km`;
  els.chargeCost.textContent  = formatNPR(r.cost_to_charge_npr);
  els.chargeRange.textContent = `${els.chargeFrom.value}% → ${els.chargeTo.value}%`;
  els.monthlyCost.textContent = formatNPR(data.monthly_cost_npr);

  // Stats
  els.energyUsed.textContent   = formatKWh(r.energy_for_distance_kwh);
  els.estRange.textContent     = `${data.estimated_range_km} km`;
  els.fullChargeCost.textContent = formatNPR(r.full_charge_cost_npr);

  // Comparison table
  const activeRate = data.rate_per_kwh;
  const rows = [
    { label: "Rs 10 / kWh", rate: 10, ...data.comparison.rate_10 },
    { label: "Rs 15 / kWh", rate: 15, ...data.comparison.rate_15 },
  ];
  if (![10, 15].includes(activeRate)) {
    rows.push({ label: `Rs ${activeRate} / kWh (Custom)`, rate: activeRate, ...r });
  }

  els.comparisonBody.innerHTML = rows.map(row => `
    <tr class="${row.rate === activeRate ? "active-rate" : ""}">
      <td>${row.label} ${row.rate === activeRate ? "✓" : ""}</td>
      <td>${formatNPR(row.cost_for_distance_npr)}</td>
      <td>Rs ${row.cost_per_km_npr.toFixed(2)}</td>
      <td>${formatNPR(row.full_charge_cost_npr)}</td>
    </tr>
  `).join("");

  // Insight cards
  const effVal = data.efficiency_kwh_per_100km;
  const batKwh = data.battery_kwh;
  const kmPerRs = 1 / r.cost_per_km_npr;
  const pctUsed = ((r.energy_for_distance_kwh / batKwh) * 100).toFixed(1);

  els.insightCards.innerHTML = `
    <div class="insight-card">
      <div class="insight-card__label">Efficiency (This Mode)</div>
      <div class="insight-card__value">${effVal} kWh/100km</div>
    </div>
    <div class="insight-card">
      <div class="insight-card__label">Range Per Rs 100</div>
      <div class="insight-card__value">${(kmPerRs * 100).toFixed(1)} km</div>
    </div>
    <div class="insight-card">
      <div class="insight-card__label">Battery Used</div>
      <div class="insight-card__value">${pctUsed}% of ${batKwh} kWh</div>
    </div>
    <div class="insight-card">
      <div class="insight-card__label">Energy for Trip</div>
      <div class="insight-card__value">${r.energy_for_distance_kwh} kWh</div>
    </div>
  `;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─────────────────────────────────────────
// Initialize
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateBatteryBar();
  updateDriveModeLabels();
  loadSpecs();
});


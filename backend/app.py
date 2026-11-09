"""
Breaker - EV Running Cost Calculator
Backend: Python Flask API
Vehicle: Dongfeng Nami Vigo (Nepal)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────
# Nami Vigo Vehicle Specifications (Nepal)
# ─────────────────────────────────────────
NAMI_VIGO_SPECS = {
    "E2": {
        "name": "Nami Vigo E2",
        "battery_kwh": 44.94,          # usable battery capacity kWh
        "range_cltc_km": 401,          # CLTC rated range
        "range_wltp_km": 320,          # approx WLTP range
        "motor_kw": 99,
        "efficiency_city_kwh_per_100km": 11.5,   # ~11-12 kWh/100km city
        "efficiency_mixed_kwh_per_100km": 14.0,  # ~14-15 kWh/100km mixed
        "efficiency_highway_kwh_per_100km": 17.0, # ~16-17 kWh/100km highway
        "price_npr": 4099000,
        "charging_time_ac_hours": 8,
        "charging_time_dc_minutes": 45,
    },
    "E2+": {
        "name": "Nami Vigo E2+",
        "battery_kwh": 51.87,
        "range_cltc_km": 471,
        "range_wltp_km": 350,
        "motor_kw": 99,
        "efficiency_city_kwh_per_100km": 12.0,
        "efficiency_mixed_kwh_per_100km": 15.0,
        "efficiency_highway_kwh_per_100km": 17.5,
        "price_npr": 4399000,
        "charging_time_ac_hours": 9,
        "charging_time_dc_minutes": 55,
    },
}

ELECTRICITY_RATES = {
    "rate_10": 10.0,    # Rs 10 per kWh
    "rate_15": 15.0,    # Rs 15 per kWh
}


def calculate_cost(battery_kwh, efficiency_kwh_per_100km, rate_per_kwh,
                   distance_km, charge_percent_from, charge_percent_to):
    """
    Calculate EV running cost given parameters.
    Returns detailed breakdown dict.
    """
    # Energy needed to travel distance_km
    energy_for_distance = (efficiency_kwh_per_100km / 100.0) * distance_km

    # Cost to travel distance
    cost_for_distance = energy_for_distance * rate_per_kwh
    cost_per_km = cost_for_distance / distance_km if distance_km > 0 else 0

    # Energy to charge from X% to Y%
    charge_delta = max(0, charge_percent_to - charge_percent_from) / 100.0
    energy_to_charge = battery_kwh * charge_delta
    cost_to_charge = energy_to_charge * rate_per_kwh

    # Full charge cost (0 → 100%)
    full_charge_cost = battery_kwh * rate_per_kwh

    return {
        "energy_for_distance_kwh": round(energy_for_distance, 3),
        "cost_for_distance_npr": round(cost_for_distance, 2),
        "cost_per_km_npr": round(cost_per_km, 2),
        "energy_to_charge_kwh": round(energy_to_charge, 3),
        "cost_to_charge_npr": round(cost_to_charge, 2),
        "full_charge_cost_npr": round(full_charge_cost, 2),
        "rate_per_kwh": rate_per_kwh,
    }


@app.route("/api/specs", methods=["GET"])
def get_specs():
    """Return Nami Vigo vehicle specifications."""
    return jsonify({
        "success": True,
        "vehicles": NAMI_VIGO_SPECS,
        "electricity_rates": ELECTRICITY_RATES,
    })


@app.route("/api/calculate", methods=["POST"])
def calculate():
    """
    Calculate running cost.
    Body JSON:
      variant          : "E2" | "E2+"
      drive_mode       : "city" | "mixed" | "highway"
      distance_km      : float
      rate_type        : "rate_10" | "rate_15" | "custom"
      custom_rate      : float (required if rate_type == "custom"), range 9–20
      charge_from      : int (0–100 %)
      charge_to        : int (0–100 %)
    """
    data = request.get_json(force=True)

    # ── Validation ──────────────────────────────────────────
    variant = data.get("variant", "E2")
    if variant not in NAMI_VIGO_SPECS:
        return jsonify({"success": False, "error": "Invalid variant. Choose E2 or E2+"}), 400

    drive_mode = data.get("drive_mode", "mixed")
    mode_map = {
        "city": "efficiency_city_kwh_per_100km",
        "mixed": "efficiency_mixed_kwh_per_100km",
        "highway": "efficiency_highway_kwh_per_100km",
    }
    if drive_mode not in mode_map:
        return jsonify({"success": False, "error": "Invalid drive_mode."}), 400

    try:
        distance_km = float(data.get("distance_km", 0))
        if distance_km <= 0:
            return jsonify({"success": False, "error": "distance_km must be > 0"}), 400
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid distance_km"}), 400

    rate_type = data.get("rate_type", "rate_10")
    if rate_type == "rate_10":
        rate = 10.0
    elif rate_type == "rate_15":
        rate = 15.0
    elif rate_type == "custom":
        try:
            rate = float(data.get("custom_rate", 0))
            if not (9 <= rate <= 20):
                return jsonify({"success": False,
                                "error": "Custom rate must be between 9 and 20 Rs/kWh"}), 400
        except (TypeError, ValueError):
            return jsonify({"success": False, "error": "Invalid custom_rate"}), 400
    else:
        return jsonify({"success": False, "error": "Invalid rate_type"}), 400

    try:
        charge_from = int(data.get("charge_from", 0))
        charge_to = int(data.get("charge_to", 100))
        if not (0 <= charge_from <= 100) or not (0 <= charge_to <= 100):
            return jsonify({"success": False, "error": "Charge % must be 0–100"}), 400
        if charge_from >= charge_to:
            return jsonify({"success": False,
                            "error": "charge_to must be greater than charge_from"}), 400
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid charge values"}), 400

    # ── Compute ──────────────────────────────────────────────
    vehicle = NAMI_VIGO_SPECS[variant]
    efficiency = vehicle[mode_map[drive_mode]]

    result = calculate_cost(
        battery_kwh=vehicle["battery_kwh"],
        efficiency_kwh_per_100km=efficiency,
        rate_per_kwh=rate,
        distance_km=distance_km,
        charge_percent_from=charge_from,
        charge_percent_to=charge_to,
    )

    # Estimated range at this rate and drive mode
    estimated_range = (vehicle["battery_kwh"] / efficiency) * 100

    # Monthly cost estimation (assume user travels distance_km per day)
    monthly_cost = result["cost_for_distance_npr"] * 30

    return jsonify({
        "success": True,
        "variant": variant,
        "vehicle_name": vehicle["name"],
        "drive_mode": drive_mode,
        "efficiency_kwh_per_100km": efficiency,
        "battery_kwh": vehicle["battery_kwh"],
        "estimated_range_km": round(estimated_range, 1),
        "distance_km": distance_km,
        "rate_per_kwh": rate,
        "results": result,
        "monthly_cost_npr": round(monthly_cost, 2),
        "comparison": {
            "rate_10": calculate_cost(vehicle["battery_kwh"], efficiency, 10.0,
                                      distance_km, charge_from, charge_to),
            "rate_15": calculate_cost(vehicle["battery_kwh"], efficiency, 15.0,
                                      distance_km, charge_from, charge_to),
        },
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "app": "Breaker EV Calculator"})


if __name__ == "__main__":
    app.run(debug=True, port=5001)


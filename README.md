# ⚡ Breaker — EV Running Cost Calculator

> Calculate real running costs for the **Dongfeng Nami Vigo** electric vehicle based on Nepal's electricity pricing.

---

## 🚗 Vehicle: Dongfeng Nami Vigo

| Spec | E2 | E2+ |
|---|---|---|
| Battery | 44.94 kWh (LFP) | 51.87 kWh (LFP) |
| Motor | 99 kW PMSM | 99 kW PMSM |
| Range (CLTC) | 401 km | 471 km |
| Range (WLTP) | ~320 km | ~350 km |
| Price (Nepal) | NPR 40,99,000 | NPR 43,99,000 |

---

## 💡 Features

- **3 Electricity Rate Options**
  - Rs 10 / kWh (Standard NEA residential)
  - Rs 15 / kWh (Commercial / fast-charging)
  - Custom: 9–20 Rs / kWh (slider input)
- **3 Drive Modes** — City · Mixed · Highway
- **Real-time cost breakdown** — trip cost, per-km cost, monthly estimate
- **Charge session calculator** — set your start/end % and see the exact charge cost
- **Rate comparison table** — see all 3 rates side by side for every result
- **Full vehicle specs panel** for both E2 and E2+ variants

---

## 🏗️ Project Structure

```
Breaker/
├── backend/
│   ├── app.py            # Flask REST API
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── start.sh              # One-command launcher
└── README.md
```

---

## 🚀 Quick Start

```bash
cd /Users/angelyogi/Documents/Breaker
chmod +x start.sh
./start.sh
```

Then open: **http://localhost:8080**

---

## 🔌 Manual Setup

### Backend (Python Flask)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
# API running at http://localhost:5000
```

### Frontend (Static files)
```bash
cd frontend
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## 📡 API Endpoints

### `GET /api/specs`
Returns full Nami Vigo vehicle specifications.

### `POST /api/calculate`
```json
{
  "variant":      "E2",       // "E2" | "E2+"
  "drive_mode":   "city",     // "city" | "mixed" | "highway"
  "distance_km":  50,
  "rate_type":    "rate_10",  // "rate_10" | "rate_15" | "custom"
  "custom_rate":  12,         // 9–20 (only when rate_type = "custom")
  "charge_from":  20,         // 0–99
  "charge_to":    80          // 1–100
}
```

### `GET /api/health`
Health check.

---

## ⚡ Cost Formula

```
energy_used (kWh) = (efficiency kWh/100km / 100) × distance_km
trip_cost (Rs)    = energy_used × rate_per_kWh
cost_per_km (Rs)  = trip_cost / distance_km
charge_cost (Rs)  = battery_kWh × (charge_to% - charge_from%) × rate_per_kWh
```

---

*Data sourced from [dongfengnepal.com](https://dongfengnepal.com) · [nepaldrives.com](https://nepaldrives.com) · [ev-nepal.com](https://ev-nepal.com)*


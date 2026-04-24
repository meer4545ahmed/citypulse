"""
FastAPI ML service for CityPulse.
Exposes:
  GET  /health
  GET  /summary
  POST /forecast
  POST /forecast/batch
  POST /anomaly
  POST /city-score
  POST /clean
"""
from __future__ import annotations
import json
import os
import sys
from pathlib import Path
from typing import Any
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).parent))
from data_generator import (
    generate_history, ZONES, METRICS, SEVERITY_WEIGHT, severity_from_value
)
from clean import clean_reading

ARTIFACT_DIR = Path(__file__).parent / "artifacts"

app = FastAPI(title="CityPulse ML Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATE: dict[str, Any] = {
    "forecast": None,
    "anomaly": None,
    "city_score": None,
    "summary": None,
    "history": None,
}


def _ensure_artifacts():
    needed = ["forecast.joblib", "anomaly.joblib", "city_score.joblib", "training_summary.json"]
    if not all((ARTIFACT_DIR / n).exists() for n in needed):
        from train import main as train_main
        print("[boot] training models (first run)…")
        train_main()


@app.on_event("startup")
def _boot():
    _ensure_artifacts()
    STATE["forecast"] = joblib.load(ARTIFACT_DIR / "forecast.joblib")
    STATE["anomaly"] = joblib.load(ARTIFACT_DIR / "anomaly.joblib")
    STATE["city_score"] = joblib.load(ARTIFACT_DIR / "city_score.joblib")
    STATE["summary"] = json.loads((ARTIFACT_DIR / "training_summary.json").read_text())
    STATE["history"] = generate_history(days=14, seed=7)
    print("[boot] models loaded.")


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "citypulse-ml",
        "models_loaded": all(STATE.get(k) is not None for k in ("forecast", "anomaly", "city_score")),
        "n_forecasters": len(STATE["forecast"]["models"]) if STATE["forecast"] else 0,
        "trained_at": (STATE["summary"] or {}).get("trained_at"),
    }


@app.get("/summary")
def summary():
    return STATE["summary"]


class ForecastRequest(BaseModel):
    zone_id: str
    metric_type: str
    horizon_hours: int = Field(6, ge=1, le=48)


def _zone_metric_history(zone: str, metric: str) -> pd.DataFrame:
    df: pd.DataFrame = STATE["history"]
    sub = df[(df.zone_id == zone) & (df.metric_type == metric)].sort_values("ts").copy()
    return sub


def _forecast_one(zone: str, metric: str, horizon: int) -> list[dict]:
    bundle = STATE["forecast"]
    key = f"{zone}__{metric}"
    if key not in bundle["models"]:
        raise HTTPException(404, f"no forecaster for {key}")
    mdl = bundle["models"][key]
    feats = bundle["features"]
    sub = _zone_metric_history(zone, metric)
    if len(sub) < 30:
        raise HTTPException(400, "insufficient history")
    series = sub["value"].tolist()
    last_ts: pd.Timestamp = sub["ts"].iloc[-1]
    last_temp = float(sub["temp_c"].iloc[-1])
    last_hum = float(sub["humidity"].iloc[-1])
    last_wind = float(sub["wind_ms"].iloc[-1])
    out = []
    for i in range(horizon):
        ts = last_ts + timedelta(hours=i + 1)
        h = ts.hour
        dow = ts.weekday()
        is_weekend = int(dow >= 5)
        lag1, lag2, lag3 = series[-1], series[-2], series[-3]
        lag24 = series[-24] if len(series) >= 24 else series[-1]
        roll6 = float(np.mean(series[-6:]))
        x = np.array([[lag1, lag2, lag3, lag24, roll6, h, dow, is_weekend,
                       last_temp, last_hum, last_wind]])
        yhat = float(mdl.predict(x)[0])
        sev = severity_from_value(metric, yhat)
        out.append({
            "ts": ts.isoformat() + "Z",
            "value": round(yhat, 2),
            "severity": sev,
            "hour": h,
        })
        series.append(yhat)
    return out


@app.post("/forecast")
def forecast(req: ForecastRequest):
    if req.zone_id not in ZONES:
        raise HTTPException(400, f"unknown zone {req.zone_id}")
    if req.metric_type not in METRICS:
        raise HTTPException(400, f"unknown metric {req.metric_type}")
    points = _forecast_one(req.zone_id, req.metric_type, req.horizon_hours)
    return {
        "zone_id": req.zone_id,
        "metric_type": req.metric_type,
        "horizon_hours": req.horizon_hours,
        "model": "GradientBoostingRegressor",
        "points": points,
    }


class BatchReq(BaseModel):
    zones: list[str] | None = None
    metrics: list[str] | None = None
    horizon_hours: int = 6


@app.post("/forecast/batch")
def forecast_batch(req: BatchReq):
    zones = req.zones or ZONES
    metrics = req.metrics or METRICS
    out = []
    for z in zones:
        for m in metrics:
            key = f"{z}__{m}"
            if key not in STATE["forecast"]["models"]:
                continue
            try:
                pts = _forecast_one(z, m, req.horizon_hours)
                out.append({"zone_id": z, "metric_type": m, "points": pts})
            except HTTPException:
                continue
    return {"horizon_hours": req.horizon_hours, "model": "GradientBoostingRegressor", "results": out}


class AnomalyRow(BaseModel):
    zone_id: str
    metric_type: str
    value: float
    hour: int | None = None
    dow: int | None = None
    temp_c: float | None = None
    humidity: float | None = None
    wind_ms: float | None = None


class AnomalyReq(BaseModel):
    rows: list[AnomalyRow]


@app.post("/anomaly")
def anomaly(req: AnomalyReq):
    bundle = STATE["anomaly"]
    feats = bundle["features"]
    now = datetime.utcnow()
    out = []
    for row in req.rows:
        det = bundle["detectors"].get(row.metric_type)
        if det is None:
            out.append({"zone_id": row.zone_id, "metric_type": row.metric_type,
                        "is_anomaly": False, "score": None, "reason": "no_model"})
            continue
        x = np.array([[
            row.value,
            row.hour if row.hour is not None else now.hour,
            row.dow if row.dow is not None else now.weekday(),
            row.temp_c if row.temp_c is not None else 26.0,
            row.humidity if row.humidity is not None else 60.0,
            row.wind_ms if row.wind_ms is not None else 3.0,
        ]])
        score = float(det.score_samples(x)[0])
        is_anom = bool(det.predict(x)[0] == -1)
        out.append({
            "zone_id": row.zone_id,
            "metric_type": row.metric_type,
            "is_anomaly": is_anom,
            "score": round(score, 4),
            "model": "IsolationForest",
        })
    return {"results": out}


class CityScoreRow(BaseModel):
    zone_id: str
    metric_type: str
    severity: str


class CityScoreReq(BaseModel):
    metrics: list[CityScoreRow]


@app.post("/city-score")
def city_score(req: CityScoreReq):
    bundle = STATE["city_score"]
    order: list[str] = bundle["feature_order"]
    mdl = bundle["model"]
    vec = {name: 30.0 for name in order}
    for r in req.metrics:
        key = f"{r.zone_id}_{r.metric_type}"
        if key in vec:
            vec[key] = float(SEVERITY_WEIGHT.get(r.severity, 30))
    x = np.array([[vec[n] for n in order]])
    pred = float(mdl.predict(x)[0])
    pred = max(0.0, min(100.0, pred))
    rule_score = max(0.0, min(100.0, 100.0 - float(np.mean(list(vec.values())))))
    return {
        "model": "RandomForestRegressor",
        "city_score_ml": round(pred, 1),
        "city_score_rule": round(rule_score, 1),
        "delta": round(pred - rule_score, 2),
        "n_inputs": len(req.metrics),
    }


class CleanRow(BaseModel):
    metric_type: str
    raw_value: Any
    unit: str | None = None
    history: list[float] | None = None


class CleanReq(BaseModel):
    rows: list[CleanRow]


@app.post("/clean")
def clean(req: CleanReq):
    out = []
    for r in req.rows:
        c = clean_reading(r.metric_type, r.raw_value, r.unit, r.history or [])
        out.append({"metric_type": r.metric_type, **c})
    return {"results": out}


# ---------- Scenario simulator ----------
class ScenarioShock(BaseModel):
    temp_delta: float = 0.0
    humidity_delta: float = 0.0
    wind_delta: float = 0.0
    hour_offset: int = 0


class ScenarioReq(BaseModel):
    shock: ScenarioShock = ScenarioShock()
    horizon_hours: int = 6
    metrics: list[str] | None = None
    zones: list[str] | None = None


def _forecast_one_with_shock(zone: str, metric: str, horizon: int, shock: ScenarioShock) -> list[dict]:
    """Forecast applying weather shocks to features."""
    bundle = STATE["forecast"]
    key = f"{zone}__{metric}"
    if key not in bundle["models"]:
        return []
    mdl = bundle["models"][key]
    sub = _zone_metric_history(zone, metric)
    if len(sub) < 30:
        return []
    series = sub["value"].tolist()
    last_ts: pd.Timestamp = sub["ts"].iloc[-1]
    base_temp = float(sub["temp_c"].iloc[-1]) + float(shock.temp_delta)
    base_hum = max(0.0, min(100.0, float(sub["humidity"].iloc[-1]) + float(shock.humidity_delta)))
    base_wind = max(0.1, float(sub["wind_ms"].iloc[-1]) + float(shock.wind_delta))
    out = []
    for i in range(horizon):
        ts = last_ts + timedelta(hours=i + 1 + int(shock.hour_offset))
        h = ts.hour
        dow = ts.weekday()
        is_weekend = int(dow >= 5)
        lag1, lag2, lag3 = series[-1], series[-2], series[-3]
        lag24 = series[-24] if len(series) >= 24 else series[-1]
        roll6 = float(np.mean(series[-6:]))
        x = np.array([[lag1, lag2, lag3, lag24, roll6, h, dow, is_weekend,
                       base_temp, base_hum, base_wind]])
        yhat = float(mdl.predict(x)[0])
        sev = severity_from_value(metric, yhat)
        out.append({
            "ts": ts.isoformat() + "Z",
            "value": round(yhat, 2),
            "severity": sev,
            "hour": h,
        })
        series.append(yhat)
    return out


@app.post("/scenario")
def scenario(req: ScenarioReq):
    zones = req.zones or ZONES
    metrics = req.metrics or METRICS
    base_results = []
    shocked_results = []
    base_shock = ScenarioShock()
    for z in zones:
        for m in metrics:
            base_pts = _forecast_one_with_shock(z, m, req.horizon_hours, base_shock)
            shock_pts = _forecast_one_with_shock(z, m, req.horizon_hours, req.shock)
            if not base_pts or not shock_pts:
                continue
            base_avg = float(np.mean([p["value"] for p in base_pts]))
            shock_avg = float(np.mean([p["value"] for p in shock_pts]))
            base_results.append({"zone_id": z, "metric_type": m, "value": round(base_avg, 2),
                                 "severity": severity_from_value(m, base_avg)})
            shocked_results.append({"zone_id": z, "metric_type": m, "value": round(shock_avg, 2),
                                    "severity": severity_from_value(m, shock_avg),
                                    "delta": round(shock_avg - base_avg, 2),
                                    "delta_pct": round((shock_avg - base_avg) / max(1e-6, base_avg) * 100, 1)})

    def _score(rows):
        if not rows:
            return 100.0
        weights = [SEVERITY_WEIGHT.get(r["severity"], 30) for r in rows]
        return round(max(0.0, min(100.0, 100.0 - float(np.mean(weights)))), 1)

    return {
        "horizon_hours": req.horizon_hours,
        "shock": req.shock.model_dump(),
        "baseline": {"city_score": _score(base_results), "metrics": base_results},
        "shocked": {"city_score": _score(shocked_results), "metrics": shocked_results},
        "score_delta": round(_score(shocked_results) - _score(base_results), 1),
        "model": "GradientBoostingRegressor + scenario shock",
    }


# ---------- Heatmap (forecasted grid over Bengaluru) ----------
ZONE_LATLON = {
    "north":   (13.0827, 77.5946),
    "south":   (12.9141, 77.6020),
    "east":    (12.9784, 77.6408),
    "west":    (12.9716, 77.5634),
    "central": (12.9716, 77.5946),
}


class HeatmapReq(BaseModel):
    metric_type: str
    t_hours: int = Field(0, ge=0, le=48)  # 0 = now
    bbox: list[float] | None = None  # [lat_min, lng_min, lat_max, lng_max]
    grid: int = Field(24, ge=8, le=64)


@app.post("/heatmap")
def heatmap(req: HeatmapReq):
    if req.metric_type not in METRICS:
        raise HTTPException(400, f"unknown metric {req.metric_type}")
    bbox = req.bbox or [12.85, 77.45, 13.15, 77.75]
    lat_min, lng_min, lat_max, lng_max = bbox

    # Get current or forecasted values per zone
    zone_values = {}
    for z in ZONES:
        if req.t_hours == 0:
            sub = _zone_metric_history(z, req.metric_type)
            zone_values[z] = float(sub["value"].iloc[-1]) if len(sub) else 0.0
        else:
            pts = _forecast_one(z, req.metric_type, req.t_hours)
            zone_values[z] = float(pts[-1]["value"]) if pts else 0.0

    # Build grid with inverse-distance weighting from zone centroids
    grid = req.grid
    lats = np.linspace(lat_min, lat_max, grid)
    lngs = np.linspace(lng_min, lng_max, grid)
    points = []
    centers = [(z, ZONE_LATLON[z][0], ZONE_LATLON[z][1], zone_values[z]) for z in ZONES]
    for la in lats:
        for ln in lngs:
            num = 0.0
            den = 0.0
            for _, zlat, zlng, val in centers:
                d2 = (la - zlat) ** 2 + (ln - zlng) ** 2 + 1e-6
                w = 1.0 / d2
                num += w * val
                den += w
            v = num / den
            points.append({"lat": round(float(la), 5), "lng": round(float(ln), 5), "value": round(float(v), 2)})

    # min/max for client-side normalization
    vals = [p["value"] for p in points]
    return {
        "metric_type": req.metric_type,
        "t_hours": req.t_hours,
        "bbox": bbox,
        "grid": grid,
        "min": round(float(min(vals)), 2),
        "max": round(float(max(vals)), 2),
        "zone_values": {z: round(v, 2) for z, v in zone_values.items()},
        "points": points,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
